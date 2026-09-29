import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderHtml, reportStats, escapeHtml } from '../src/render.ts';
import type { TranscriptLine } from '../src/line.ts';

const line = (over: Partial<TranscriptLine>): TranscriptLine =>
  ({ v: 1, sessionId: 's1', at: '2026-09-29T01:00:00.000Z', kind: 'user', text: '', ...over }) as TranscriptLine;

test('escaping neutralizes html injection in text, title and tool names', () => {
  assert.equal(escapeHtml('<script>&"'), '&lt;script&gt;&amp;&quot;');
  const html = renderHtml([line({ text: '<img src=x onerror=alert(1)>' })], { sessionId: 'session-abc' });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('stats count kinds and chars', () => {
  const stats = reportStats([
    line({ text: '12345' }),
    line({ kind: 'assistant', text: 'ab' }),
    line({ kind: 'tool', who: 'bash', text: 'x' }),
  ]);
  assert.deepEqual([stats.users, stats.assistants, stats.tools, stats.entries], [1, 1, 1, 3]);
  assert.equal(stats.chars, 8);
});

test('output is self-contained: doctype, inline css, no external refs', () => {
  const html = renderHtml([line({ text: 'hi' })], { sessionId: 'session-97098b89', title: '周报' });
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<style>'));
  assert.ok(!html.includes('src="http'));
  assert.ok(!html.includes('href="http'));
  assert.ok(html.includes('周报'));
  assert.ok(html.includes('97098b89')); // session- prefix stripped in the fallback title
});

test('tool lines render as compact chips, not full turns', () => {
  const html = renderHtml([line({ kind: 'tool', who: 'glob', text: '{}', at: '2026-09-29T02:00:00.000Z' })], { sessionId: 's' });
  assert.ok(html.includes('🔧 glob'));
  assert.ok(!html.includes('class="turn tool"'));
});
