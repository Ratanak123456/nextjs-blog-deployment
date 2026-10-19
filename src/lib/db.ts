import "server-only";
import { Pool } from "pg";
const globalDb = globalThis as typeof globalThis & { taskPool?: Pool };
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalDb.taskPool) {
    globalDb.taskPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000, query_timeout: 5000, statement_timeout: 5000 });
    globalDb.taskPool.on("error", () => console.error("[database] Idle connection failed."));
  }
  return globalDb.taskPool;
}
