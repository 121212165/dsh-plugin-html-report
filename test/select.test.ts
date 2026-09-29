import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickSessions, type SessionRecord } from '../src/select.ts';

const rec = (sessionId: string, at: string): SessionRecord => ({ sessionId, at });
const records = [
  rec('session-aaa', '2026-09-01T00:00:00.000Z'),
  rec('session-bbb', '2026-09-29T00:00:00.000Z'),
  rec('session-ccc', '2026-09-15T00:00:00.000Z'),
];

test('no argument returns only the most recently active session', () => {
  assert.deepEqual(pickSessions(records, ''), ['session-bbb']);
  assert.deepEqual(pickSessions([], ''), []);
});

test('"all" lists every session, newest first', () => {
  assert.deepEqual(pickSessions(records, 'all'), ['session-bbb', 'session-ccc', 'session-aaa']);
});

test('prefix matches with or without the session- prefix', () => {
  assert.deepEqual(pickSessions(records, 'bbb'), ['session-bbb']);
  assert.deepEqual(pickSessions(records, 'session-aaa'), ['session-aaa']);
  assert.deepEqual(pickSessions(records, 'zzz'), []);
});

test('a session keeps its latest timestamp across interleaved records', () => {
  const interleaved = [rec('old', '2026-01-01T00:00:00.000Z'), rec('new', '2026-06-01T00:00:00.000Z'), rec('old', '2026-12-01T00:00:00.000Z')];
  assert.deepEqual(pickSessions(interleaved, ''), ['old']);
});
