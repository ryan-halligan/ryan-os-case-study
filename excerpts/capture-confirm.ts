import { NextResponse } from "next/server";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { supabaseServer } from "@/lib/supabase";
import { anthropic, embed, CLASSIFY_MODEL } from "@/lib/ai";
import { topOfTierScore } from "@/lib/tasks";
import { isRealCalendarDate } from "@/lib/validate";
import { runEstimationAndInsert, etTimeLabel } from "@/lib/nutrition/pipeline";
import { estimateMealFromText } from "@/lib/nutrition/estimate";
import { classificationSchema, classifySystemPrompt, type Classification } from "@/lib/capture/classifier";
import { toEtDateString } from "@/lib/freshness";

export const runtime = "nodejs";

type RawCapture = {
  id: number;
  raw_text: string;
  routed_to: string | null;
  routed_id: number | null;
  created_at: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.capture_id !== "number" ||
    (body.action !== "confirm" && body.action !== "discard")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const captureId = body.capture_id as number;
  const action = body.action as "confirm" | "discard";

  const db = supabaseServer();

  const { data: existing, error: fetchError } = await db
    .from("raw_captures")
    .select("id, raw_text, routed_to, routed_id, created_at")
    .eq("id", captureId)
    .maybeSingle<RawCapture>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Capture not found" }, { status: 404 });
  }

  if (action === "discard") {
    await db
      .from("raw_captures")
      .update({
        classification: { discarded: true, discarded_at: new Date().toISOString() },
        routed_to: null,
      })
      .eq("id", captureId);

    return NextResponse.json({ ok: true, discarded: true });
  }

  // action === "confirm" — idempotency guard: already routed, don't re-route.
  if (existing.routed_to) {
    return NextResponse.json({
      ok: true,
      routed_to: existing.routed_to,
      routed_id: existing.routed_id,
    });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 422 });
  }

  // Anchor every day-boundary this route writes to *capture* time, not confirm/processing
  // time — confirm can happen well after capture (the user edits before sending), so a memo
  // spoken at 11:55pm ET must never land on the next calendar day just because it was
  // confirmed after midnight.
  const captureDay = toEtDateString(existing.created_at);

  let parsed: Classification | null;
  try {
    const response = await anthropic().messages.parse({
      model: CLASSIFY_MODEL,
      max_tokens: 1024,
      system: classifySystemPrompt(captureDay),
      messages: [{ role: "user", content: text }],
      output_config: { format: zodOutputFormat(classificationSchema) },
    });
    parsed = response.parsed_output;
  } catch (err) {
    await db
      .from("raw_captures")
      .update({
        classification: {
          error: "classification_failed",
          detail: err instanceof Error ? err.message : String(err),
        },
      })
      .eq("id", captureId);

    return NextResponse.json(
      { error: "classification_failed", capture_id: captureId },
      { status: 502 },
    );
  }

  let type: "journal" | "note" | "task" | "connection" | "meal";
  let fallbackReason: string | null = null;

  if (!parsed || parsed.confidence < 0.5) {
    type = "note";
    fallbackReason = !parsed ? "invalid_classification_output" : "low_confidence";
  } else {
    type = parsed.type;
  }

  if (type === "connection" && !parsed?.name) {
    type = "note";
    fallbackReason = "connection_without_name";
  }

  // Meal never lands in notes/embeddings — raw_ingest-first, same as the photo and text
  // nutrition routes, so this path and the replay script (for rows parked before GATE 3
  // shipped) share the exact same estimation pipeline. loggedAtISO is the capture's own
  // created_at (the moment it was actually spoken), never a server "now" computed here at
  // confirm time — confirm can happen well after capture if the user edits before sending.
  if (type === "meal") {
    const { data: pendingIngest, error: ingestError } = await db
      .from("raw_ingest")
      .insert({
        source: "capture_meal",
        payload: { capture_id: existing.id, text },
        status: "pending_meal_pipeline",
      })
      .select("id")
      .single();

    if (ingestError || !pendingIngest) {
      return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
    }

    const classification: Record<string, unknown> = {
      ...(parsed ?? {}),
      model: CLASSIFY_MODEL,
      edited: text !== existing.raw_text,
    };
    if (fallbackReason) classification.fallback_reason = fallbackReason;

    const mealTimeET = etTimeLabel(existing.created_at);

    try {
      const result = await runEstimationAndInsert(db, {
        rawIngestId: pendingIngest.id,
        captureId: `voice-${existing.id}`,
        loggedAtISO: existing.created_at,
        description: text,
        photoPath: null,
        estimateFn: () => estimateMealFromText(text, mealTimeET),
      });

      await db
        .from("raw_captures")
        .update({ classification, routed_to: "nutrition_logs", routed_id: result.nutritionLogId })
        .eq("id", captureId);

      return NextResponse.json({
        ok: true,
        routed_to: "nutrition_logs",
        routed_id: result.nutritionLogId,
        type: "meal",
        embedded: false,
        valid: result.valid,
        ai_confidence: result.ai_confidence,
      });
    } catch (err) {
      // Estimation pipeline failed end-to-end (not just a bad model response, which
      // runEstimationAndInsert already handles by nulling macros) — the row stays parked
      // at pending_meal_pipeline in raw_ingest for the replay script to pick up later.
      // Never a dropped meal, never a 500 that loses the capture.
      await db
        .from("raw_captures")
        .update({
          classification: { ...classification, pipeline_error: err instanceof Error ? err.message : String(err) },
          routed_to: "raw_ingest",
          routed_id: pendingIngest.id,
        })
        .eq("id", captureId);

      return NextResponse.json({
        ok: true,
        routed_to: "raw_ingest",
        routed_id: pendingIngest.id,
        type: "meal",
        embedded: false,
        message: "Logged — nutrition pipeline hit an error and will retry via replay.",
      });
    }
  }

  let routedTo: string;
  let routedId: number | null;
  let sourceId: number;

  if (type === "journal") {
    // Atomic append via RPC (single INSERT ... ON CONFLICT DO UPDATE) — a separate
    // SELECT-then-UPSERT here would let two concurrent confirms read the same prior
    // journal value and have one silently clobber the other's append. p_capture_id makes
    // the append itself idempotent on capture id (daily_journal_appends ledger), so a
    // race or retry against the same capture never appends the text twice.
    const { error: journalError } = await db.rpc("append_daily_journal", {
      p_log_date: captureDay,
      p_text: text,
      p_capture_id: existing.id,
    });

    if (journalError) {
      await db
        .from("raw_captures")
        .update({
          classification: { error: "routing_failed", detail: journalError.message },
        })
        .eq("id", captureId);

      return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
    }

    routedTo = "daily_logs";
    routedId = null;
    sourceId = captureId;
  } else if (type === "task") {
    const title = parsed?.title ?? text.slice(0, 100);
    const priorityScore = await topOfTierScore(db, "this_week");
    const dueDate =
      parsed?.due_date && isRealCalendarDate(parsed.due_date) ? parsed.due_date : null;
    const { data: task, error } = await db
      .from("tasks")
      .insert({
        title,
        description: text === title ? null : text,
        due_date: dueDate,
        tags: parsed?.tags ?? null,
        category: "voice",
        priority_score: priorityScore,
        source_capture_id: existing.id,
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      const { data: winner, error: winnerError } = await db
        .from("tasks")
        .select("id")
        .eq("source_capture_id", existing.id)
        .single();
      if (winnerError || !winner) {
        return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
      }
      routedTo = "tasks";
      routedId = winner.id;
      sourceId = winner.id;
    } else if (error || !task) {
      return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
    } else {
      routedTo = "tasks";
      routedId = task.id;
      sourceId = task.id;
    }
  } else if (type === "connection") {
    const { data: connection, error } = await db
      .from("connections")
      .insert({ name: parsed!.name, org: parsed?.org ?? null, context: text, source_capture_id: existing.id })
      .select("id")
      .single();

    if (error?.code === "23505") {
      const { data: winner, error: winnerError } = await db
        .from("connections")
        .select("id")
        .eq("source_capture_id", existing.id)
        .single();
      if (winnerError || !winner) {
        return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
      }
      routedTo = "connections";
      routedId = winner.id;
      sourceId = winner.id;
    } else if (error || !connection) {
      return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
    } else {
      routedTo = "connections";
      routedId = connection.id;
      sourceId = connection.id;
    }
  } else {
    const title = parsed?.title ?? text.slice(0, 60);
    const { data: note, error } = await db
      .from("notes")
      .insert({ title, body: text, category: "voice", tags: parsed?.tags ?? null, source_capture_id: existing.id })
      .select("id")
      .single();

    if (error?.code === "23505") {
      const { data: winner, error: winnerError } = await db
        .from("notes")
        .select("id")
        .eq("source_capture_id", existing.id)
        .single();
      if (winnerError || !winner) {
        return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
      }
      routedTo = "notes";
      routedId = winner.id;
      sourceId = winner.id;
    } else if (error || !note) {
      return NextResponse.json({ error: "routing_failed", capture_id: captureId }, { status: 500 });
    } else {
      routedTo = "notes";
      routedId = note.id;
      sourceId = note.id;
    }
  }

  const classification: Record<string, unknown> = {
    ...(parsed ?? {}),
    model: CLASSIFY_MODEL,
    edited: text !== existing.raw_text,
  };
  if (fallbackReason) classification.fallback_reason = fallbackReason;
  if (type === "journal") classification.log_date = captureDay;

  const { data: updatedRows, error: updateError } = await db
    .from("raw_captures")
    .update({ classification, routed_to: routedTo, routed_id: routedId })
    .eq("id", captureId)
    .select("id");

  if (updateError || updatedRows?.length !== 1) {
    return NextResponse.json({ error: "finalize_failed", capture_id: captureId }, { status: 500 });
  }

  let embedded = false;
  try {
    const embedding = await embed(text);
    const { error: embedError } = await db
      .from("memory_chunks")
      .insert({ source_type: type, source_id: sourceId, text, embedding });

    if (embedError?.code === "23505") {
      // Lost the race on (source_type, source_id) — confirm the winner's row is really
      // there, then treat this as already-embedded, not a failure.
      const { data: existingChunk } = await db
        .from("memory_chunks")
        .select("id")
        .eq("source_type", type)
        .eq("source_id", sourceId)
        .maybeSingle();
      embedded = existingChunk != null;
    } else {
      embedded = !embedError;
      if (embedError) {
        await db
          .from("raw_captures")
          .update({ classification: { ...classification, embedding_error: embedError.message } })
          .eq("id", captureId);
      }
    }
  } catch (err) {
    await db
      .from("raw_captures")
      .update({
        classification: {
          ...classification,
          embedding_error: err instanceof Error ? err.message : String(err),
        },
      })
      .eq("id", captureId);
  }

  return NextResponse.json({ ok: true, routed_to: routedTo, routed_id: routedId, type, embedded });
}
