export const statuses = ["todo", "in_progress", "done"] as const;
export const priorities = ["low", "medium", "high"] as const;
export type TaskInput = { title: string; description: string; status: typeof statuses[number]; priority: typeof priorities[number] };
export type Task = TaskInput & { id: string; created_at: string; updated_at: string };
export class InputError extends Error {}
export function taskId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new InputError("Invalid task ID.");
  return id;
}
export function fields(value: unknown, partial = false): Partial<TaskInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected a JSON object.");
  const body = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ["title", "description", "status", "priority"]) {
    if (!(key in body)) continue;
    if (typeof body[key] !== "string") throw new InputError(`${key} must be text.`);
    result[key] = (body[key] as string).trim();
  }
  if ((!partial || "title" in result) && (!result.title || result.title.length > 200)) throw new InputError("Title must contain 1–200 characters.");
  if (result.description?.length > 5000) throw new InputError("Description must be at most 5000 characters.");
  if ("status" in result && !statuses.includes(result.status as TaskInput["status"])) throw new InputError("Invalid status.");
  if ("priority" in result && !priorities.includes(result.priority as TaskInput["priority"])) throw new InputError("Invalid priority.");
  if (partial && !Object.keys(result).length) throw new InputError("Provide at least one supported field.");
  return partial ? result : { description: "", status: "todo", priority: "medium", ...result };
}
export function filters(url: string) {
  const params = new URL(url).searchParams;
  const search = (params.get("search") ?? "").trim();
  const status = params.get("status") || "";
  if (search.length > 200) throw new InputError("Search must be at most 200 characters.");
  if (status && !statuses.includes(status as TaskInput["status"])) throw new InputError("Invalid status filter.");
  return { search, status };
}
