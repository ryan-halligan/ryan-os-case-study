# Application response

I built ryan-os because I was losing time keeping track of commitments across different tools. I wanted one place to capture an idea, find the next action, and see how it fit into my day. It grew into a personal operating system with a CRM for people and follow-ups, a Jobs pipeline, an editable Notes workspace, Training plans and reports, and a read-only investment Portfolio with paper trading.

The applied ML problem I focused on was turning an unstructured voice capture into a useful item and finding the right existing tasks from a natural-language request. A capture can become a task, note, or journal entry; a request such as “what can I finish this morning?” can rank tasks using urgency, due dates, and effort. I chose a small language model for interpreting language and ranking, while code handles date logic and safeguards. The task-search prompt includes only explicitly selected fields, protecting private data if new database columns are added. Code also rejects model-invented task IDs, removes duplicates, and caps the result.

I validated the capture flow with repeated and concurrent submissions to check that one capture does not create duplicate items. I tested calendar and agenda logic against sample events, including recurrence and time-zone boundaries. The public case study includes 41 passing offline calendar checks and runnable task-selection guard tests. These verify parts of the system, but I have not yet measured model accuracy or time saved. I published a curated repo and a demo with invented records so reviewers can explore the broader workspace without accessing my personal notes, health, finances, or accounts.

Project, screenshot, runnable demo, and selected code: https://github.com/ryan-halligan/ryan-os-case-study
Validation and limitations: https://github.com/ryan-halligan/ryan-os-case-study/blob/main/VALIDATION.md
