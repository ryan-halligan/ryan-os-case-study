# What was validated

Prepared October 5, 2026. No production service was called for this publication.

| Evidence | Scope | Status |
|---|---|---|
| Calendar acceptance suite | Original parser, sync, and agenda modules with sample ICS, in-memory storage, and stubbed fetches | Rerun for this case study: 41 checks passed; [saved output](evidence/calendar-acceptance.txt) |
| Public task-selection tests | Extracted prompt whitelist and returned-ID filtering | Run `npm test`; [saved output](evidence/task-selection-tests.txt) |
| Historical capture acceptance | Concurrent confirms, repeated confirms, an ET midnight boundary, and a connection-without-name fallback | Recorded as passing in the private project's August 31 build log; not rerun here |
| Synthetic organizer demo | Local rendering and interaction with fixed examples | Checked in a local browser; no model or database calls |
| Mockup-style presentation | Three-column desktop layout, responsive layout, capture and task controls, secondary text contrast | Browser checked at 320, 390, 768, 1024, and 1440 pixels; no horizontal overflow; secondary text exceeded 4.5:1 contrast on the panel and page backgrounds |

The calendar suite checks raw-first ingestion, all-day and recurring events, exclusions, ET grouping, repeated-ingest idempotency, independent feed failures, and preservation of the prior snapshot after failed reads. The saved output is from the current source, which has 41 checks; an older build-log entry reported 39.

The public tests check that a field newly added to a task row is not sent to the model, unknown IDs cannot become displayed tasks, duplicates are removed, returned order is preserved, results are capped, and an empty task list produces no selection. These are deterministic guard tests, not model-quality measurements.

## What these checks do not establish

- Classification precision or recall across a representative capture dataset.
- Whether the ranking is better than a keyword or rule-based baseline.
- Whether the model's explanation is supported by the selected tasks.
- Calibrated confidence scores.
- A quantified change in productivity or time spent organizing.

The demo's classifications and rankings are fixed invented examples. They are not sampled model results, and the demo's UI is an illustrative presentation created for this public case study.

## Next evaluation

Build a separate labeled capture set covering tasks, notes, journal entries, connections, meals, and ambiguous inputs. Keep tuning examples separate from held-out examples. Report a confusion matrix and per-category precision/recall, and repeat samples to detect unstable outputs.

For task search, assemble synthetic task lists and requests with labeled relevant IDs. Compare the model with substring search and a rule-based urgency/effort baseline. Measure precision at k, ranking quality, fabricated-ID attempts before filtering, latency, and cost. Include missing effort estimates, conflicting deadlines, empty lists, and requests with no relevant task.

Evaluate the explanations separately. A task can have a valid ID but an unsupported explanation. Finally, record a small personal before/after organizing-time study and label it as evidence from one user.
