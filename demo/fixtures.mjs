// All records and model outputs in this file are invented for the public demo.
export const tasks = [
  { id: 1, title: "Draft presentation outline", description: "List the three points for a class presentation.", urgency: "today", due_date: "2026-10-05", time_est_min: 25, tags: ["study"], is_key: true, category: "school", connections: null },
  { id: 2, title: "Send project check-in", description: "Send a short progress note to the project group.", urgency: "today", due_date: "2026-10-05", time_est_min: 10, tags: ["project"], is_key: false, category: "school", connections: null },
  { id: 3, title: "Review practice problems", description: "Work through the next problem set.", urgency: "this_week", due_date: "2026-10-07", time_est_min: 60, tags: ["study"], is_key: true, category: "school", connections: null },
  { id: 4, title: "Book study room", description: "Reserve a room for the group session.", urgency: "this_week", due_date: "2026-10-06", time_est_min: 5, tags: ["project"], is_key: false, category: "school", connections: null },
  { id: 5, title: "Plan weekend errands", description: "Make a list of the errands for the weekend.", urgency: "this_month", due_date: null, time_est_min: 20, tags: ["personal"], is_key: false, category: "personal", connections: null },
  { id: 6, title: "Save ideas for a reading list", description: "Collect book ideas to revisit later.", urgency: "someday", due_date: null, time_est_min: 15, tags: ["reading"], is_key: false, category: "personal", connections: null }
];

export const requests = [
  { label: "What can I finish this morning?", ids: [1, 2, 4], explanation: "Fixed example: two tasks due today, followed by a short task due tomorrow." },
  { label: "Quick wins under 30 minutes", ids: [4, 2, 6, 5, 1], explanation: "Fixed example: tasks with effort estimates below 30 minutes, shortest first." },
  { label: "Show project tasks", ids: [2, 4], explanation: "Fixed example: both tasks tagged project." },
  { label: "Test an invalid model response", ids: [2, 999, 2, 4], explanation: "The real published guard removes invented ID 999 and the duplicate ID 2." }
];

export const captures = [
  { transcript: "Remind me to draft the presentation outline today.", type: "task", title: "Draft presentation outline", due_date: "2026-10-05" },
  { transcript: "An idea for later: organize reading notes by the question each book answers.", type: "note", title: "Organize reading notes by question", due_date: null },
  { transcript: "Today felt more manageable once I picked one task to finish first.", type: "journal", title: null, due_date: null }
];
