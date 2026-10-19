import { connectionString, databaseDiagnostic } from '../src/lib/database-config.mjs';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
let pool;
try {
  pool = new pg.Pool({ connectionString: connectionString(), connectionTimeoutMillis: 3000, query_timeout: 10000, statement_timeout: 10000 });
  await pool.query("INSERT INTO posts (title, content, author) VALUES ($1,$2,$3), ($4,$5,$6)", [
    'Welcome to Fieldnotes', 'A place for small discoveries and useful ideas.\n\nWrite your first post, or edit this one to make it your own.', 'Lab team',
    'From development to deployment', 'Build locally. Configure your environment. Apply migrations explicitly.\n\nThen start the service and check both liveness and database readiness.', 'Lab team'
  ]);
  console.log('Created two example blog posts. Each invocation adds two posts.');
} catch (cause) { console.error('Seed failed', databaseDiagnostic(cause)); process.exitCode = 1; }
finally { await pool?.end(); }
