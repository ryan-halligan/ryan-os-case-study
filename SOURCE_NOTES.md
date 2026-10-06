# Source notes

This is a new curated repository with no inherited private Git history. It presents selected organizer code from a private ryan-os snapshot and new material prepared for this case study.

The source snapshot is commit `5f777b5a78504fc8c1b1ff50485da135ce0b8b5b`. Unfinished Jobs changes in the working checkout are outside this publication's scope.

| Public file | Original path | Changes |
|---|---|---|
| `excerpts/classifier.ts` | `lib/capture/classifier.ts` | Unchanged |
| `excerpts/task-search.route.ts` | `app/api/tasks/smart-search/route.ts` | A generic example person's name in the prompt replaced with “Example Person” |
| `excerpts/audio-capture.route.ts` | `app/api/capture/voice/route.ts` | Unchanged |
| `excerpts/capture-confirm.ts` | `app/api/capture/confirm/route.ts` | Unchanged |
| `src/task-selection.mjs` | Prompt-field projection and ID-filtering blocks from the task-search route | TypeScript types and route wiring removed; two pure functions exported |

The route excerpts rely on application modules and middleware that are deliberately not included. In the private app, middleware authenticates these routes. These files are for inspection and are not a standalone backend or deployment template.

The public demo, fixture data, Node server, and standalone tests were created for this publication. The demo uses fixed synthetic model outputs. It does not reproduce the original app's interface pixel for pixel and does not perform inference. Source and excerpt hashes are available in [the manifest](evidence/source-manifest.json).

## Publishing scope

Only the files in this curated repository are intended for publication. The private application's logs, plans, personal fixtures, résumé data, migrations, credentials, calendar feeds, and production address were not copied. The public GitHub account name is intentionally included as authorship and the project link.
