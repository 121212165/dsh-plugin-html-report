/** Wire-level assembly tests for html-report: the real apply() against a mock
 * context, over a real temp transcript sidecar + outDir. Covers the new
 * report_create agent tool face and the shared render implementation.
 * @module test/plugin.test */

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { apply } from '../src/plugin.ts';

interface CapturedCommand {
  name: string;
  handler: (args: { rawInput?: string }) => { kind: string; text: string };
}
interface CapturedTool {
  name: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

const tempDirs: string[] = [];
after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

interface Mounted {
  command(name: string): CapturedCommand;
  tool(name: string): CapturedTool;
  dataDir: string;
  outDir: string;
}

async function mounted(config: Record<string, unknown> = {}): Promise<Mounted> {
  const dir = mkdtempSync(join(tmpdir(), 'html-report-wire-'));
  tempDirs.push(dir);
  const dataDir = join(dir, 'transcripts');
  const outDir = join(dir, 'html-reports');
  const sidecar = join(dataDir, 'transcript-2026-10.jsonl');
  mkdirSync(dataDir, { recursive: true });
  const lines = [
    { v: 1, sessionId: 'session-reportprobe-aaa', at: '2026-10-17T10:00:00.000Z', kind: 'user', text: 'probe-green question' },
    { v: 1, sessionId: 'session-reportprobe-aaa', at: '2026-10-17T10:00:01.000Z', kind: 'assistant', text: 'probe-green answer' },
    { v: 1, sessionId: 'session-other-bbb', at: '2026-10-17T10:01:00.000Z', kind: 'user', text: 'other session line' },
  ];
  writeFileSync(sidecar, lines.map((line) => JSON.stringify(line)).join('\n') + '\n', 'utf8');

  const commands: CapturedCommand[] = [];
  const tools: CapturedTool[] = [];
  const ctx = {
    logger(_name: string) {
      return { info() {}, warn() {} };
    },
    commands: { register(definition: CapturedCommand) { commands.push(definition); } },
    tools: { register(definition: CapturedTool) { tools.push(definition); } },
  };
  apply(ctx as never, { enabled: true, dataDir, outDir, ...config } as never);
  const command = (name: string): CapturedCommand => {
    const found = commands.find((c) => c.name === name);
    assert.ok(found, `command ${name} never registered`);
    return found!;
  };
  const tool = (name: string): CapturedTool => {
    const found = tools.find((c) => c.name === name);
    assert.ok(found, `tool ${name} never registered`);
    return found!;
  };
  return { command, tool, dataDir, outDir };
}

test('agents get report_create next to the /report command; both share the renderer', async () => {
  const h = await mounted();
  assert.ok(h.command('report'), 'command face still registered');
  const created = await h.tool('report_create').execute({ sessionId: 'session-reportprobe-aaa' });
  assert.ok(created.includes('已渲染 1 份报告'), created);
  const file = join(h.outDir, 'reportprobe-.html');
  assert.ok(existsSync(file));
  const html = readFileSync(file, 'utf8');
  assert.ok(html.includes('probe-green answer'), 'session content present');
  assert.ok(!html.includes('other session line'), 'only the requested session');
});

test('report_create defaults to the newest session, supports all, errors loudly', async () => {
  const h = await mounted();
  const newest = await h.tool('report_create').execute({});
  assert.ok(newest.includes('已渲染 1 份报告'), newest);

  const every = await h.tool('report_create').execute({ sessionId: 'all' });
  assert.ok(every.includes('已渲染 2 份报告'), every);

  const missing = await h.tool('report_create').execute({ sessionId: 'session-nosuch' });
  assert.ok(missing.includes('没有匹配'), missing);
});

test('command face unchanged: /report shares the renderer and config-owned outDir', async () => {
  const h = await mounted();
  const ok = await h.tool('report_create').execute({ sessionId: 'other' });
  assert.ok(ok.includes('已渲染 1 份报告'), ok);
  assert.ok(existsSync(join(h.outDir, 'other-bbb.html')), ok);
});

test('an empty transcript dir errors loudly from the tool face', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'html-report-empty-'));
  tempDirs.push(dir);
  const commands: CapturedCommand[] = [];
  const tools: CapturedTool[] = [];
  const ctx = {
    logger(_name: string) {
      return { info() {}, warn() {} };
    },
    commands: { register(definition: CapturedCommand) { commands.push(definition); } },
    tools: { register(definition: CapturedTool) { tools.push(definition); } },
  };
  apply(ctx as never, { enabled: true, dataDir: join(dir, 'none'), outDir: join(dir, 'out') } as never);
  const tool = (name: string): CapturedTool => {
    const found = tools.find((c) => c.name === name);
    assert.ok(found, `tool ${name} never registered`);
    return found!;
  };
  const out = await tool('report_create').execute({});
  assert.ok(out.includes('还没有归档转录'), out);
});
