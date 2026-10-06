import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { supabaseServer } from "@/lib/supabase";
import { anthropic, CLASSIFY_MODEL } from "@/lib/ai";

export const runtime = "nodejs";

const requestSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

const smartSchema = z.object({
  task_ids: z.array(z.number()),
  reasoning: z.string(),
});

const SMART_SEARCH_SYSTEM = `You select and rank tasks from the user's personal task list in response to a natural-language request. You receive the full list of active tasks as JSON plus the current date and time (America/New_York). Return task_ids: the ids of matching tasks, best match first. Interpret intent, not just keywords: time of day ("this morning" → short, urgent items), effort ("quick wins" → low time_est_min), people ("for Example Person" → person or tag match), dates ("overdue" → due_date before today), importance ("what matters" → is_key and today/this_week urgency). Return at most 20 ids. Return an empty array if nothing fits — never invent ids. reasoning: one or two sentences addressed to the user explaining the selection.`;

function nowET(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

type CompactTask = {
  id: number;
  title: string;
  description: string | null;
  urgency: string;
  due_date: string | null;
  time_est_min: number | null;
  tags: string[] | null;
  is_key: boolean;
  category: string | null;
  person: string | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    const flattened = z.flattenError(result.error);
    return NextResponse.json(
      { error: "Validation failed", fields: flattened.fieldErrors, formErrors: flattened.formErrors },
      { status: 422 },
    );
  }

  const { query } = result.data;
  const db = supabaseServer();

  const { data: tasks, error } = await db
    .from("tasks")
    .select("*, connections(id,name,org)")
    .is("completed_at", null)
    .order("urgency", { ascending: true })
    .order("priority_score", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: "Failed to load tasks", details: error.message }, { status: 500 });
  }

  const liveTasks = tasks ?? [];

  if (liveTasks.length === 0) {
    return NextResponse.json({ task_ids: [], reasoning: "No active tasks.", tasks: [] });
  }

  const compactTasks: CompactTask[] = liveTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ? String(t.description).slice(0, 200) : null,
    urgency: t.urgency,
    due_date: t.due_date,
    time_est_min: t.time_est_min,
    tags: t.tags,
    is_key: t.is_key,
    category: t.category,
    person: t.connections?.name ?? null,
  }));

  let taskIds: number[];
  let reasoning: string;
  try {
    const response = await anthropic().messages.parse({
      model: CLASSIFY_MODEL,
      max_tokens: 2048,
      system: SMART_SEARCH_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Now: ${nowET()}\nRequest: ${query}\n\nTasks (JSON):\n${JSON.stringify(compactTasks)}`,
        },
      ],
      output_config: { format: zodOutputFormat(smartSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("empty parsed_output");
    }

    taskIds = parsed.task_ids;
    reasoning = parsed.reasoning;
  } catch {
    return NextResponse.json({ error: "smart_search_failed" }, { status: 502 });
  }

  const liveById = new Map(liveTasks.map((t) => [t.id, t]));
  const seen = new Set<number>();
  const validIds: number[] = [];
  for (const id of taskIds) {
    if (liveById.has(id) && !seen.has(id)) {
      seen.add(id);
      validIds.push(id);
      if (validIds.length >= 20) break;
    }
  }

  const orderedTasks = validIds.map((id) => liveById.get(id));

  return NextResponse.json({ task_ids: validIds, reasoning, tasks: orderedTasks });
}
