// Shared by Next.js and CLI scripts. Never return driver messages or URLs in diagnostics.
export function connectionString(value = process.env.DATABASE_URL) {
  if (!value) throw Object.assign(new Error('Database configuration missing'), { code: 'DATABASE_NOT_CONFIGURED' });
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
  } catch {
    throw Object.assign(new Error('Expected a PostgreSQL URI'), { code: 'DATABASE_INVALID_URL' });
  }
  return value;
}

export function databaseDiagnostic(cause) {
  const codes = new Set();
  const visit = (error, depth = 0) => {
    if (!error || typeof error !== 'object' || depth > 3) return;
    if (typeof error.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code)) codes.add(error.code);
    if (Array.isArray(error.errors)) error.errors.slice(0, 8).forEach(e => visit(e, depth + 1));
    visit(error.cause, depth + 1);
  };
  visit(cause);
  let category = 'database_error';
  if (codes.has('DATABASE_NOT_CONFIGURED') || codes.has('DATABASE_INVALID_URL')) category = 'invalid_configuration';
  else if (codes.has('ECONNREFUSED')) category = 'connection_refused';
  else if (codes.has('ETIMEDOUT') || codes.has('57014')) category = 'timeout';
  else if (codes.has('ENOTFOUND') || codes.has('EAI_AGAIN')) category = 'host_resolution';
  else if (codes.has('EPERM') || codes.has('EACCES')) category = 'network_permission';
  else if (codes.has('28P01') || codes.has('28000')) category = 'authentication';
  else if (codes.has('3D000')) category = 'database_missing';
  else if (codes.has('42P01')) category = 'table_missing';
  else if (codes.has('42501')) category = 'database_permission';
  // pg emits some authentication and timeout failures without a code.
  else if (cause instanceof Error && /^SASL:/.test(cause.message)) category = 'authentication_configuration';
  else if (cause instanceof Error && /timeout|timed out/i.test(cause.message)) category = 'timeout';
  return { category, codes: [...codes] };
}
