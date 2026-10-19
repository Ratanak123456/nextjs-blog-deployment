import nextEnv from '@next/env';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
// Same dotenv precedence as Next.js; default to development, production when specified.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required. Configure .env.local or .env.production.'); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, query_timeout: 10000, statement_timeout: 10000 });
try {
  await pool.query(await readFile(new URL('../migrations/001_tasks.sql', import.meta.url), 'utf8'));
  console.log('Task schema applied.');
} catch {
  console.error('Migration failed. Check database connectivity, permissions, and schema.');
  process.exitCode = 1;
} finally { await pool.end(); }
