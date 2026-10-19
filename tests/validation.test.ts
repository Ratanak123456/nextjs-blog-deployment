import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fields, filters, InputError, taskId } from '../src/lib/tasks';
import { body, failure, json } from '../src/lib/http';
test('creation trims text and supplies defaults', () => {
  assert.deepEqual(fields({ title: ' Ship it ', ignored: 'x' }), { title: 'Ship it', description: '', status: 'todo', priority: 'medium' });
});
test('invalid creation values are rejected', () => {
  for (const value of [null, [], {}, { title: ' ' }, { title: 'x'.repeat(201) }, { title: 42 }, { title: 'x', status: 'invalid' }, { title: 'x', priority: 'urgent' }, { title: 'x', description: 'x'.repeat(5001) }, { title: 'x', description: null }]) assert.throws(() => fields(value), InputError);
});
test('patch allows only explicit supported fields', () => {
  assert.deepEqual(fields({ status: 'done', id: 'untrusted' }, true), { status: 'done' });
  for (const value of [{}, { id: 'x' }, { title: '' }, { priority: false }]) assert.throws(() => fields(value, true), InputError);
});
test('IDs reject invalid and SQL-like input', () => {
  assert.equal(taskId('07c93577-63a5-4d27-9f3a-0eff2d7fba83'), '07c93577-63a5-4d27-9f3a-0eff2d7fba83');
  for (const id of ['1', 'x', "' OR 1=1", '']) assert.throws(() => taskId(id), InputError);
});
test('filter validation retains literal search strings', () => {
  assert.deepEqual(filters('http://localhost/api/tasks?search=%25_&status=todo'), { search: '%_', status: 'todo' });
  assert.throws(() => filters('http://localhost/?status=bad'), InputError);
  assert.throws(() => filters(`http://localhost/?search=${'x'.repeat(201)}`), InputError);
});
test('invalid JSON becomes a validation failure', async () => {
  await assert.rejects(() => body(new Request('http://localhost', { method: 'POST', body: '{' })), InputError);
});
test('consistent errors redact database secrets and stack traces', async () => {
  const original = console.error;
  const logs: unknown[][] = [];
  console.error = (...args) => { logs.push(args); };
  try {
    const response = failure(new Error('postgresql://secret:password@private/db'));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(await response.json()) + JSON.stringify(logs), /password|postgresql|stack/);
    assert.equal(failure(new InputError('Invalid status.')).status, 400);
    assert.deepEqual(await json({ status: 'ok' }).json(), { data: { status: 'ok' } });
  } finally { console.error = original; }
});
