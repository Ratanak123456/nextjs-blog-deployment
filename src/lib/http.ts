import { InputError } from "./tasks";
export function json(data: unknown, status = 200) {
  return Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}
export function error(message: string, status: number) {
  return Response.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function body(request: Request) {
  try { return await request.json(); } catch { throw new InputError("Request body must be valid JSON."); }
}
export function failure(cause: unknown) {
  if (cause instanceof InputError) return error(cause.message, 400);
  // Never log driver messages: they can contain connection URLs or user-supplied SQL data.
  const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "unavailable";
  console.error("[tasks] Database operation failed", { code: /^[A-Z0-9_]{1,30}$/.test(code) ? code : "unavailable" });
  return error("Database unavailable. Check the database connection and migrations, then retry.", 503);
}
