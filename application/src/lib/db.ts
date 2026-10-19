import "server-only";
import { Pool } from "pg";
import { connectionString, databaseDiagnostic } from "./database-config.mjs";
const globalDb = globalThis as typeof globalThis & { blogPool?: Pool };
export function database() {
  const url = connectionString();
  if (!globalDb.blogPool) {
    globalDb.blogPool = new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000, query_timeout: 5000, statement_timeout: 5000 });
    globalDb.blogPool.on("error", (cause) => console.error("[database] Idle connection failed", databaseDiagnostic(cause)));
  }
  return globalDb.blogPool;
}
