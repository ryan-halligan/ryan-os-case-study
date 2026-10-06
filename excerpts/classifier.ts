import { z } from "zod";

// Lives here, not in app/api/capture/confirm/route.ts, because Next's App Router only
// allows route files to export HTTP method handlers plus the config allowlist (runtime,
// dynamic, revalidate, etc.) — any other named export fails the production build (Vercel
// caught this; `tsc --noEmit` does not enforce the rule, only `next build` does). Exporting
// this from here lets both route.ts and the classifier acceptance test import the exact
// same schema/prompt — no duplication, no drift between what's tested and what ships.
export const classificationSchema = z.object({
  type: z.enum(["journal", "note", "task", "connection", "meal"]),
  confidence: z.number(),
  title: z.string().nullable(),
  due_date: z.string().nullable(),
  name: z.string().nullable(),
  org: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
});

export type Classification = z.infer<typeof classificationSchema>;

export function classifySystemPrompt(today: string): string {
  return `You classify a personal voice memo into exactly one bucket.
- "journal": reflections, feelings, how the day went, diary-style content.
- "note": ideas, facts, references, things to remember that aren't actionable.
- "task": something the speaker intends or needs to do; usually verbs like "I need to", "remind me to", "don't forget to".
- "connection": primarily about a person the speaker met or wants to track (who they are, where they work, follow-up context).
- "meal": the speaker is logging food or drink they ate, are eating, or are about to eat/drink — an actual record of what was consumed. A passing mention of a meal that is not itself a food log — e.g. describing how they felt "after lunch" — is "journal", not "meal".
Set confidence between 0 and 1. Extract title (short, for notes/tasks), due_date (YYYY-MM-DD, only if clearly implied — resolve relative dates against today's date given below), name/org (connections only), and up to 5 short tags. Use null for anything not applicable.
Today's date (America/New_York): ${today}`;
}
