# Building an organizer around how I actually capture things

## Starting problem

I was having trouble keeping myself organized. Tasks, ideas, and calendar commitments lived in different places, so figuring out what to do next required rebuilding the context. I wanted a system that made it easy to capture something immediately and useful to come back to later.

That became ryan-os, my personal operating system. It grew to include a CRM for people and follow-ups, a Jobs pipeline, an editable Notes workspace, Training plans and reports, and a read-only investment Portfolio with paper trading. This case study focuses on the organizer's ML workflow; the public demo uses invented examples to show the other areas.

## The question I tested through the implementation

Could unstructured language become usable organizer data without letting the model invent the underlying records?

There are two model tasks: classify a capture into the right kind of item, and rank relevant existing tasks for a natural-language request. Calendar parsing, task-ID validation, duplicate removal, result limits, and storage rules remain deterministic. This is applied ML engineering with existing models, not a model trained from scratch.

## Capture and classification

The audio route saves the recording and creates a raw capture before calling Whisper. A transcription failure therefore leaves a recoverable original rather than an apparently successful empty note. The user can review the transcript before confirming it.

Classification uses a structured schema with a category, title, due date, person fields, tags, and a model-reported confidence value. Confidence is a routing heuristic, not a calibrated probability. A null or low-confidence parsed result falls back to a note; a connection without a name also becomes a note. Task dates are validated in code. A model or schema parse error returns an error.

Capture time determines the ET calendar day. That matters when a recording just before midnight is confirmed after midnight. The original capture ID is also used to prevent duplicate downstream records on retries. Historical acceptance checks tested simultaneous and repeated confirmation.

## Task search

For a request such as “quick wins under 30 minutes,” the model receives a compact list of at most 300 active tasks. Each prompt field is named explicitly: title, description, urgency, due date, effort estimate, tags, importance, category, and linked person. New database columns are not automatically exposed to the model.

The model returns task IDs and a short explanation. Code then checks every ID against the fetched list, removes duplicates, and stops at 20 results. This prevents a fabricated task from appearing as a real result. It does not guarantee that a valid task is relevant, or that the explanation is correct. If the model call fails, the interface offers ordinary text matching.

## Calendar and reliability

Calendar feeds are preserved before parsing. A deterministic parser expands recurring events and exclusions and assigns ET event dates. The agenda combines those cached events with open tasks. A failed feed does not overwrite the previous event snapshot; repeating the same ingest does not duplicate events.

The full app reads cached data on page load. This makes opening the organizer predictable and avoids paying for a fresh model call every time I look at it.

## Validation and result

For this publication I reran the existing calendar acceptance suite offline: 41 checks passed. I also published runnable tests of the extracted field whitelist and task-ID guard. Capture retry, concurrency, fallback, and date checks are documented historical results; they were not rerun against production for this publication.

The result is a personal system I use to organize my day. I do not have a measured time-saving claim. The next evaluation should separately measure capture classification and task-ranking relevance against labeled examples, include ambiguous requests and missing dates, and compare ranking against a keyword-search baseline. That would test the model's usefulness rather than just the pipeline's reliability.
