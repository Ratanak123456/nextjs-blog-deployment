import { database } from "@/lib/db";
import { body, error, failure, json } from "@/lib/http";
import { fields, taskId } from "@/lib/tasks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const id = taskId((await context.params).id);
    const result = await database().query("SELECT * FROM tasks WHERE id = $1", [id]);
    return result.rows[0] ? json(result.rows[0]) : error("Task not found.", 404);
  } catch (cause) { return failure(cause); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const id = taskId((await context.params).id);
    const changes = fields(await body(request), true);
    const keys = Object.keys(changes) as (keyof typeof changes)[];
    // Column names come exclusively from the validation allowlist.
    const assignments = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const result = await database().query(`UPDATE tasks SET ${assignments}, updated_at = clock_timestamp() WHERE id = $${keys.length + 1} RETURNING *`, [...keys.map(key => changes[key]), id]);
    return result.rows[0] ? json(result.rows[0]) : error("Task not found.", 404);
  } catch (cause) { return failure(cause); }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    const id = taskId((await context.params).id);
    const result = await database().query("DELETE FROM tasks WHERE id = $1 RETURNING id", [id]);
    return result.rows[0] ? json(result.rows[0]) : error("Task not found.", 404);
  } catch (cause) { return failure(cause); }
}
