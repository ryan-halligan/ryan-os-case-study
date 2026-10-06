// Extracted from the private task-search route for an offline demonstration.
// This module does not call a model, rank tasks, or access a database.
export function compactTasksForPrompt(liveTasks) {
  return liveTasks.map((t) => ({
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
}

export function selectExistingTasks(liveTasks, taskIds) {
  const liveById = new Map(liveTasks.map((t) => [t.id, t]));
  const seen = new Set();
  const validIds = [];
  for (const id of taskIds) {
    if (liveById.has(id) && !seen.has(id)) {
      seen.add(id);
      validIds.push(id);
      if (validIds.length >= 20) break;
    }
  }
  return { task_ids: validIds, tasks: validIds.map((id) => liveById.get(id)) };
}
