import { connectionString, databaseDiagnostic } from '../src/lib/database-config.mjs';
import nextEnv from '@next/env';
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
// Same dotenv precedence as Next.js; default to development, production when specified.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
let pool;
try {
  pool = new pg.Pool({ connectionString: connectionString(), connectionTimeoutMillis: 3000, query_timeout: 10000, statement_timeout: 10000 });
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    await pool.query(await readFile(new URL(file, directory), 'utf8'));
    console.log(`Applied ${file}`);
  }
  console.log('Schema migrations complete. Existing data preserved.');
} catch (cause) {
  console.error('Migration failed', databaseDiagnostic(cause));
  process.exitCode = 1;
} finally { await pool?.end(); }
