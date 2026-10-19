import { database } from "@/lib/db";
import { body, failure, json } from "@/lib/http";
import { fields } from "@/lib/posts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const result = await database().query("SELECT id, title, author, created_at, updated_at, left(content, 240) AS excerpt FROM posts ORDER BY created_at DESC, id DESC");
    return json(result.rows);
  } catch (cause) { return failure(cause); }
}
export async function POST(request: Request) {
  try {
    const post = fields(await body(request));
    const result = await database().query("INSERT INTO posts (title, content, author) VALUES ($1,$2,$3) RETURNING *", [post.title, post.content, post.author]);
    return json(result.rows[0], 201);
  } catch (cause) { return failure(cause); }
}
