import { database } from "@/lib/db";
import { failure, json } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await database().query("SELECT id FROM tasks LIMIT 0"); return json({ status: "ready" }); }
  catch (cause) { return failure(cause); }
}
