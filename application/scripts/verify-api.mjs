// Run explicitly against a designated lab/test database; deletes only its own post.
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
await call('/api/posts/not-a-uuid', 'GET', undefined, 400);
await call('/api/posts', 'POST', { title: ' ' }, 400);
const post = await call('/api/posts', 'POST', { title: `TEMPORARY DATABASE CONNECTION TEST ${Date.now()}`, author: 'Test author', content: 'First line\n\nSecond line' }, 201);
try {
  assert.equal((await call(`/api/posts/${post.id}`)).content, post.content);
  await call(`/api/posts/${post.id}`, 'PATCH', { unsupported: true }, 400);
  const content = 'Updated plain text\n<script>This is text</script>';
  const changed = await call(`/api/posts/${post.id}`, 'PATCH', { title: 'TEMPORARY DATABASE CONNECTION TEST edited', author: 'Updated author', content });
  assert.equal(changed.content, content);
  const retrieved = await call(`/api/posts/${post.id}`);
  assert.equal(retrieved.author, 'Updated author');
  assert.equal(retrieved.title, 'TEMPORARY DATABASE CONNECTION TEST edited');
  assert.equal(retrieved.content, content);
  const rows = await call('/api/posts');
  assert.ok(rows.some(row => row.id === post.id && row.excerpt === content));
  for (let i = 1; i < rows.length; i++) assert.ok(new Date(rows[i - 1].created_at) >= new Date(rows[i].created_at));
  console.log(`CRUD and separate-request persistence verified against ${base}`);
} finally { await call(`/api/posts/${post.id}`, 'DELETE'); }
await call(`/api/posts/${post.id}`, 'GET', undefined, 404);
await call(`/api/posts/${post.id}`, 'PATCH', { title: 'Missing' }, 404);
await call(`/api/posts/${post.id}`, 'DELETE', undefined, 404);
console.log('Deletion and missing-post responses verified. See README for restart persistence.');
