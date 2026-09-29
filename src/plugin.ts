/**
 * dsh wiring for html-report: renders the transcript sidecars (same JSONL
 * contract and default dataDir as dsh-plugin-transcript) into self-contained
 * HTML files. Read-only on the sidecars.
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type {} from '@deepseek-ai/dsh-commands';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { parseJsonl, type TranscriptLine } from './line.ts';
import { pickSessions } from './select.ts';
import { renderHtml, reportStats } from './render.ts';

export const name = 'html-report';
export const inject = ['commands'];

export interface Config {
  enabled: boolean;
  dataDir?: string;
  outDir?: string;
  title: string;
}

export const Config = Schema.object({
  enabled: Schema.boolean().default(true),
  dataDir: Schema.string(),
  outDir: Schema.string(),
  title: Schema.string().default('Session Report'),
});

export function expandHome(path: string): string {
  return path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
}

function readAllLines(dataDir: string): TranscriptLine[] {
  const records: TranscriptLine[] = [];
  if (!existsSync(dataDir)) return records;
  for (const name of readdirSync(dataDir)) {
    if (!/^transcript-(\d{4})-(\d{2})\.jsonl$/.test(name)) continue;
    records.push(...parseJsonl(readFileSync(join(dataDir, name), 'utf8')).records);
  }
  return records;
}

export function apply(ctx: Context, config: Config): void {
  const log = ctx.logger('html-report');
  if (!config.enabled) return void log.info('disabled by config');
  const dataDir = config.dataDir ? expandHome(config.dataDir) : join(homedir(), '.dsh', 'transcripts');
  const outDir = config.outDir ? expandHome(config.outDir) : join(homedir(), '.dsh', 'html-reports');

  ctx.commands.register({
    name: 'report',
    description: '把会话转录渲染成自包含 HTML 报告：/report [sessionId|all]（缺省最新）',
    input: { hint: '[sessionId|all]' },
    handler: ({ rawInput }) => {
      const records = readAllLines(dataDir);
      if (!records.length) return { kind: 'error', text: `还没有归档转录（${dataDir}）。` };
      const argument = String(rawInput ?? '').trim();
      const targets = new Set(pickSessions(records, argument));
      if (!targets.size) return { kind: 'error', text: `没有匹配 ${argument || '(最新)'} 的会话。` };
      const groups = new Map<string, TranscriptLine[]>();
      for (const record of records) {
        if (!targets.has(record.sessionId)) continue;
        const group = groups.get(record.sessionId);
        if (group) group.push(record);
        else groups.set(record.sessionId, [record]);
      }
      mkdirSync(outDir, { recursive: true });
      const written: string[] = [];
      for (const sessionId of targets) {
        const lines = groups.get(sessionId)!;
        const stats = reportStats(lines);
        const file = join(outDir, `${sessionId.replace(/^session-/, '').slice(0, 12)}.html`);
        writeFileSync(file, renderHtml(lines, { sessionId, title: config.title }), 'utf8');
        written.push(`${file}（${stats.entries} 条 / ${stats.chars.toLocaleString()} 字符）`);
      }
      return { kind: 'success', text: `已渲染 ${written.length} 份报告：\n${written.join('\n')}` };
    },
  });

  log.info(`mounted · outDir=${outDir}`);
}
