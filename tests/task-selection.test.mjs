import test from "node:test";
import assert from "node:assert/strict";
import { compactTasksForPrompt, selectExistingTasks } from "../src/task-selection.mjs";
import { tasks } from "../demo/fixtures.mjs";

test("unknown IDs cannot create a displayed task", () => {
  assert.deepEqual(selectExistingTasks(tasks, [999, 2]).task_ids, [2]);
});
test("duplicate IDs are removed and model order is preserved", () => {
  assert.deepEqual(selectExistingTasks(tasks, [4, 2, 4, 1, 2]).task_ids, [4, 2, 1]);
});
test("a stale task ID is filtered after it leaves the supplied task snapshot", () => {
  assert.deepEqual(selectExistingTasks(tasks.filter((t) => t.id !== 2), [2, 4]).task_ids, [4]);
});
test("an empty task list produces no displayed selection", () => {
  assert.deepEqual(selectExistingTasks([], [1, 2]), { task_ids: [], tasks: [] });
});
test("an empty response produces no selection", () => {
  assert.deepEqual(selectExistingTasks(tasks, []), { task_ids: [], tasks: [] });
});
test("results stop at 20 valid distinct IDs, rather than 20 attempted IDs", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
  assert.deepEqual(selectExistingTasks(many, [999, 999, ...many.map((t) => t.id)]).task_ids, many.slice(0, 20).map((t) => t.id));
});
test("string IDs and non-finite values do not match numeric IDs", () => {
  assert.deepEqual(selectExistingTasks(tasks, ["2", null, NaN, Infinity, 2]).task_ids, [2]);
});
test("displayed rows come from the stored task snapshot", () => {
  const selected = selectExistingTasks(tasks, [2]);
  assert.equal(selected.tasks[0], tasks[1]);
  assert.equal(selected.tasks[0].title, "Send project check-in");
});
test("a newly added private field is absent from model prompt data", () => {
  const rows = compactTasksForPrompt([{ ...tasks[0], private_annotation: "synthetic field that must stay private", unrelated_record: { value: 123 } }]);
  assert.deepEqual(Object.keys(rows[0]), ["id", "title", "description", "urgency", "due_date", "time_est_min", "tags", "is_key", "category", "person"]);
  assert.equal(JSON.stringify(rows).includes("private_annotation"), false);
  assert.equal(JSON.stringify(rows).includes("must stay private"), false);
});
test("description is bounded and only the linked person's name is sent", () => {
  const rows = compactTasksForPrompt([{ ...tasks[0], description: "x".repeat(500), connections: { name: "Example Person", email: "example@example.invalid" } }]);
  assert.equal(rows[0].description.length, 200);
  assert.equal(rows[0].person, "Example Person");
  assert.equal(JSON.stringify(rows).includes("example@example.invalid"), false);
});
test("missing descriptions and people remain explicit null values", () => {
  const row = compactTasksForPrompt([{ ...tasks[0], description: null, connections: null }])[0];
  assert.equal(row.description, null);
  assert.equal(row.person, null);
});
