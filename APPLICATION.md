# Application response

I built **ryan-os** because I was losing time keeping track of commitments across notes, tasks, and calendars. I wanted to capture something quickly, find it later, and see what needed my attention today.

The applied ML part turns a voice capture into a structured item and lets me search my tasks by intent. A capture can become a task, note, or journal entry; a query such as “what can I finish this morning?” can rank existing tasks using urgency, due dates, and estimated effort. I chose a small language model for the unstructured language and kept task ordering, calendar dates, and safeguards in code. Search checks every model-returned ID against the actual task list, removes duplicates, and limits the result.

I validated the capture flow with repeated and concurrent submissions to check that one capture does not create duplicate items. I also tested calendar and agenda logic against sample events, including recurrence and time-zone boundaries. The public case study includes an offline calendar run with 41 passing checks and runnable tests for the task-selection guards. These establish specific reliability properties; I have not measured model accuracy or time saved. The result is a personal daily organizer, with a synthetic demo and selected code available at the project link.
