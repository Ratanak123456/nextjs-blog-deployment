import { database } from "@/lib/db";
import { body, failure, json } from "@/lib/http";
import { fields, filters } from "@/lib/tasks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { search, status } = filters(request.url);
    const result = await database().query("SELECT * FROM tasks WHERE ($1 = '' OR strpos(lower(title || ' ' || description), lower($1)) > 0) AND ($2 = '' OR status = $2) ORDER BY created_at DESC, id", [search, status]);
    return json(result.rows);
  } catch (cause) { return failure(cause); }
}
export async function POST(request: Request) {
  try {
    const task = fields(await body(request));
    const result = await database().query("INSERT INTO tasks (title, description, status, priority) VALUES ($1,$2,$3,$4) RETURNING *", [task.title, task.description, task.status, task.priority]);
    return json(result.rows[0], 201);
  } catch (cause) { return failure(cause); }
}
