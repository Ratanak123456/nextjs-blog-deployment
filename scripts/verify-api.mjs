// Explicit, destructive only to the task created by this script. Run against your lab URL.
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:3000';
async function call(path, method = 'GET', payload, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result.data;
}
await call('/api/health');
await call('/api/ready');
await call('/api/tasks/not-a-uuid', 'GET', undefined, 400);
await call('/api/tasks', 'POST', { title: ' ' }, 400);
const task = await call('/api/tasks', 'POST', { title: `Persistence check ${Date.now()}`, priority: 'high' }, 201);
try {
  assert.equal((await call(`/api/tasks/${task.id}`)).title, task.title);
  await call(`/api/tasks/${task.id}`, 'PATCH', { unsupported: true }, 400);
  const changed = await call(`/api/tasks/${task.id}`, 'PATCH', { status: 'done', description: 'Saved to PostgreSQL' });
  assert.equal(changed.status, 'done');
  const rows = await call(`/api/tasks?status=done&search=${encodeURIComponent(task.title)}`);
  assert.ok(rows.some(row => row.id === task.id));
  console.log(`CRUD and separate-request persistence verified against ${base}`);
} finally { await call(`/api/tasks/${task.id}`, 'DELETE'); }
await call(`/api/tasks/${task.id}`, 'GET', undefined, 404);
console.log('Deletion verified. For restart persistence, follow README manual steps.');
