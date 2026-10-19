import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fields, InputError, postId } from '../src/lib/posts';
import { body, error, failure, json } from '../src/lib/http';
const valid = { title: ' A story ', author: ' Lab author ', content: 'First line\n\nSecond line\n' };
test('creation trims title and author while preserving plain-text content', () => {
  assert.equal(fields({ ...valid, title: ` ${'x'.repeat(200)} ` }).title?.length, 200);
  assert.deepEqual(fields({ ...valid, ignored: 'x' }), { title: 'A story', author: 'Lab author', content: valid.content });
});
test('required fields reject missing, blank, non-text and oversized input', () => {
  for (const value of [null, [], {}, 'text', 42]) assert.throws(() => fields(value), InputError);
  for (const [key, limit] of [['title', 200], ['author', 100], ['content', 50000]] as const) {
    for (const value of ['', ' \n\t ', null, 42, true, [], {}, 'x'.repeat(limit + 1)]) assert.throws(() => fields({ ...valid, [key]: value }), InputError, `${key}: ${String(value).slice(0, 20)}`);
    const missing: Record<string, unknown> = { ...valid }; delete missing[key];
    assert.throws(() => fields(missing), InputError);
    assert.equal(fields({ ...valid, [key]: 'x'.repeat(limit) })[key]?.length, limit);
  }
});
test('patch allows only explicit supported fields and validates every supplied value', () => {
  assert.deepEqual(fields({ author: ' New author ', id: 'untrusted' }, true), { author: 'New author' });
  assert.deepEqual(fields({ content: '\n  Kept intact\n' }, true), { content: '\n  Kept intact\n' });
  for (const value of [{}, { id: 'x' }, { title: '' }, { author: false }, { content: null }, { content: 'x'.repeat(50001) }]) assert.throws(() => fields(value, true), InputError);
  assert.throws(() => fields(Object.create({ title: 'Inherited' }), true), InputError);
});
test('UUIDs reject invalid and SQL-like input', () => {
  const id = '07c93577-63a5-4d27-9f3a-0eff2d7fba83';
  assert.equal(postId(id), id);
  for (const value of ['1', 'x', "' OR 1=1", '', `${id}-extra`]) assert.throws(() => postId(value), InputError);
});
test('HTML-like content is retained as text, not transformed into markup', () => {
  const content = '<script>alert("x")</script>\n<img src=x onerror=alert(1)>';
  assert.equal(fields({ ...valid, content }).content, content);
});
test('invalid JSON becomes a validation failure', async () => {
  await assert.rejects(() => body(new Request('http://localhost', { method: 'POST', body: '{' })), InputError);
});
test('consistent responses return 404 and redact database secrets and stack traces', async () => {
  const original = console.error;
  const logs: unknown[][] = [];
  console.error = (...args) => { logs.push(args); };
  try {
    const response = failure(new Error('postgresql://secret:password@private/db'));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(await response.json()) + JSON.stringify(logs), /password|postgresql|stack/);
    assert.equal(failure(new InputError('Invalid post ID.')).status, 400);
    assert.deepEqual(await json({ status: 'ok' }).json(), { data: { status: 'ok' } });
    const missing = error('Post not found.', 404);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: { message: 'Post not found.' } });
  } finally { console.error = original; }
});
