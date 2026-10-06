import { NextResponse } from "next/server";
import { toFile } from "openai";
import { supabaseServer } from "@/lib/supabase";
import { openai } from "@/lib/ai";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 24 * 1024 * 1024; // Whisper's limit is 25 MB; leave headroom

// raw_captures.raw_text is NOT NULL with no default (verified live against the real
// schema) — a pending/failed row can't just leave it null. This placeholder can never
// equal a real Whisper transcript, and is always paired with `classification` marking the
// row pending/failed, so a later reader or retry job can tell "capture failed before a
// transcript existed" apart from "Whisper genuinely transcribed silence as an empty
// string" (audit remediation A4, item 3).
const PENDING_PLACEHOLDER = "[[pending_transcription]]";

function extForMime(mime: string): string {
  const base = mime.split(";")[0].trim();
  if (base === "audio/mp4") return "m4a";
  if (base === "audio/webm") return "webm";
  return "bin";
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No audio or text provided" }, { status: 422 });
  }

  const db = supabaseServer();

  // Typed-text fallback: skips Storage + Whisper entirely.
  const text = formData.get("text");
  if (typeof text === "string" && text.trim().length > 0) {
    const { data, error } = await db
      .from("raw_captures")
      .insert({ source: "web_voice", raw_text: text })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to record capture" }, { status: 500 });
    }

    return NextResponse.json({ capture_id: data.id, transcript: text });
  }

  const audio = formData.get("audio");
  if (typeof audio === "string" || audio === null) {
    return NextResponse.json({ error: "No audio or text provided" }, { status: 422 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const ext = extForMime(audio.type);
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  // Read per-request (not a module-level constant) so the acceptance script can drive a
  // REAL, deterministic upload failure (point it at a bucket that doesn't exist) through
  // the actual route, instead of mocking the Supabase client — defaults to the real
  // bucket, so runtime behavior is unchanged.
  const bucket = process.env.VOICE_CAPTURES_BUCKET || "voice-captures";

  // Raw-first (invariant 2): the original audio must never be silently unrecoverable, so
  // the upload must succeed BEFORE Whisper is ever called. Second-order trade, intentional:
  // a storage outage now fails the whole capture (the client still holds the audio and can
  // retry) instead of silently degrading to audio_path: null and transcribing anyway —
  // which used to make a storage hiccup lose the recording forever, not just delay it.
  const { error: uploadError } = await db.storage
    .from(bucket)
    .upload(path, buffer, { contentType: audio.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json(
      {
        error: "audio_persist_failed",
        detail: uploadError.message,
        message: "The audio was not saved. Please retry the recording.",
      },
      { status: 502 },
    );
  }

  // Insert the raw_captures row BEFORE transcription — this is what makes the capture
  // replayable: the audio is already in storage and this row points at it. raw_text is a
  // placeholder (see PENDING_PLACEHOLDER above), never treated as a real transcript.
  const { data: pending, error: pendingError } = await db
    .from("raw_captures")
    .insert({ source: "web_voice", raw_text: PENDING_PLACEHOLDER, audio_path: path, classification: { status: "pending" } })
    .select("id")
    .single();

  if (pendingError || !pending) {
    return NextResponse.json(
      { error: "Failed to record capture", detail: pendingError?.message },
      { status: 500 },
    );
  }

  let transcript: string;
  try {
    const transcription = await openai().audio.transcriptions.create({
      file: await toFile(buffer, `audio.${ext}`),
      model: "whisper-1",
    });
    transcript = transcription.text;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);

    // The audio is already safe in storage and the row already exists — leave it in a
    // replayable pending state: raw_text stays the placeholder (never overwritten with ""
    // as if it were a real empty transcript), audio_path stays set, and the failure is
    // recorded for a later reader or retry job to distinguish from a genuine empty
    // transcript. Best-effort logging write: if IT fails too, the original 502 below is
    // still what the caller needs to see, never masked by a secondary write's own error.
    const { error: markFailedError } = await db
      .from("raw_captures")
      .update({ classification: { status: "failed", error: "transcription_failed", detail } })
      .eq("id", pending.id);
    if (markFailedError) {
      console.error(`raw_captures ${pending.id}: failed to record transcription_failed classification:`, markFailedError.message);
    }

    return NextResponse.json({ error: "transcription_failed", capture_id: pending.id, detail }, { status: 502 });
  }

  // Update the existing row rather than inserting a second one. Confirm the update
  // affected exactly one row (invariant 8) — an update that matches nothing must raise,
  // not report success, since that would silently strand a "pending" row forever while the
  // response claims a transcript was saved.
  const { data: updatedRows, error: updateError } = await db
    .from("raw_captures")
    .update({ raw_text: transcript, classification: null })
    .eq("id", pending.id)
    .select("id");

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save transcript", capture_id: pending.id, detail: updateError.message },
      { status: 500 },
    );
  }
  if (!updatedRows || updatedRows.length !== 1) {
    throw new Error(
      `raw_captures update affected ${updatedRows?.length ?? 0} row(s) for id=${pending.id}, expected exactly 1`,
    );
  }

  return NextResponse.json({ capture_id: pending.id, transcript });
}
