import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from '@dsh-family/kit';
import { parseJsonl } from './line.js';
import { pickSessions } from './select.js';
import { renderHtml, reportStats } from './render.js';
export const name = 'html-report';
export const inject = ['commands', 'tools'];
export const Config = Schema.object({
    enabled: Schema.boolean().default(true),
    dataDir: Schema.string(),
    outDir: Schema.string(),
    title: Schema.string().default('Session Report'),
});
export function expandHome(path) {
    return path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
}
function readAllLines(dataDir) {
    const records = [];
    if (!existsSync(dataDir))
        return records;
    for (const name of readdirSync(dataDir)) {
        if (!/^transcript-(\d{4})-(\d{2})\.jsonl$/.test(name))
            continue;
        records.push(...parseJsonl(readFileSync(join(dataDir, name), 'utf8')).records);
    }
    return records;
}
export function apply(ctx, config) {
    const log = ctx.logger('html-report');
    if (!config.enabled)
        return void log.info('disabled by config');
    const dataDir = config.dataDir ? expandHome(config.dataDir) : join(homedir(), '.dsh', 'transcripts');
    const outDir = config.outDir ? expandHome(config.outDir) : join(homedir(), '.dsh', 'html-reports');
    /** Render `argument` (sessionId | all | empty = newest) into self-contained
     * HTML files. The agent tool face shares exactly this implementation and is
     * bounded by it: no path parameters — dataDir is read-only and outDir is the
     * owner's config, never caller-chosen. */
    const renderReports = (argument) => {
        const records = readAllLines(dataDir);
        if (!records.length)
            return { kind: 'error', text: `还没有归档转录（${dataDir}）。` };
        const targets = new Set(pickSessions(records, argument));
        if (!targets.size)
            return { kind: 'error', text: `没有匹配 ${argument || '(最新)'} 的会话。` };
        const groups = new Map();
        for (const record of records) {
            if (!targets.has(record.sessionId))
                continue;
            const group = groups.get(record.sessionId);
            if (group)
                group.push(record);
            else
                groups.set(record.sessionId, [record]);
        }
        mkdirSync(outDir, { recursive: true });
        const written = [];
        for (const sessionId of targets) {
            const lines = groups.get(sessionId);
            const stats = reportStats(lines);
            const file = join(outDir, `${sessionId.replace(/^session-/, '').slice(0, 12)}.html`);
            writeFileAtomic(file, renderHtml(lines, { sessionId, title: config.title }));
            written.push(`${file}（${stats.entries} 条 / ${stats.chars.toLocaleString()} 字符）`);
        }
        return { kind: 'success', text: `已渲染 ${written.length} 份报告：\n${written.join('\n')}` };
    };
    ctx.commands.register({
        name: 'report',
        description: '把会话转录渲染成自包含 HTML 报告：/report [sessionId|all]（缺省最新）',
        input: { hint: '[sessionId|all]' },
        handler: ({ rawInput }) => renderReports(String(rawInput ?? '').trim()),
    });
    ctx.tools.register(defineTool({
        name: 'report_create',
        description: '把归档会话转录渲染成自包含 HTML 报告（落 ~/.dsh/html-reports/）。用户要"生成会话报告/汇编这份对话"时用它。缺省渲染最新会话，或指定 sessionId（reports 目录里看到的完整 id，全渲染用 all）。',
        parameters: {
            sessionId: { type: 'string', description: '目标 sessionId；缺省最新，all=全部' },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
        },
        presentCall: () => ({ card: 'generic', title: '渲染会话报告', kind: 'edit' }),
        presentResult: (_args, value) => ({
            card: 'generic',
            title: String(value).split('\n')[0].slice(0, 60),
            kind: 'edit',
            rawInput: value,
        }),
        async execute(args) {
            const result = renderReports(String(args.sessionId ?? '').trim());
            if (result.kind === 'error')
                return result.text;
            return result.text;
        },
    }));
    log.info(`mounted · outDir=${outDir}`);
}
//# sourceMappingURL=plugin.js.map