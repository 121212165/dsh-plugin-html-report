import type { TranscriptLine } from './line.ts';

/** Pure HTML report rendering: a self-contained offline page per session —
 * inline CSS, no assets, no scripts, opens anywhere. */

export interface ReportMeta {
  sessionId: string;
  title?: string;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function reportStats(lines: TranscriptLine[]): { entries: number; users: number; assistants: number; tools: number; chars: number } {
  let users = 0;
  let assistants = 0;
  let tools = 0;
  let chars = 0;
  for (const line of lines) {
    if (line.kind === 'user') users++;
    else if (line.kind === 'assistant') assistants++;
    else if (line.kind === 'tool') tools++;
    chars += line.text.length;
  }
  return { entries: lines.length, users, assistants, tools, chars };
}

/** Colors as CSS variables, flipped by the OS scheme. This is a standalone
 * offline page — dsh's --dsw-alias-* tokens do not exist here, so the report
 * carries its own two-theme token set and follows prefers-color-scheme. */
const CSS = `:root{--fg:#1a1a1a;--muted:#666;--user-bg:#F2F4F7;--user-accent:#4A90D9;--assistant-bg:#FFF7F2;--assistant-accent:#FF6B2C;--tool-bg:#FAFAFA;--tool-border:#EEE;--tool-fg:#555;--kind:#888}
@media (prefers-color-scheme:dark){:root{--fg:#e8e8e8;--muted:#9a9a9a;--user-bg:#1d2430;--user-accent:#5b9bd5;--assistant-bg:#2a201a;--assistant-accent:#ff8a4d;--tool-bg:#222222;--tool-border:#333;--tool-fg:#bbbbbb;--kind:#777777}}
body{font-family:-apple-system,Segoe UI,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:var(--fg);line-height:1.6;background:transparent}
h1{border-bottom:2px solid var(--assistant-accent);padding-bottom:8px}
.meta{color:var(--muted);font-size:13px;margin-bottom:24px}
.turn{margin:18px 0;padding:12px 16px;border-radius:8px}
.user{background:var(--user-bg);border-left:4px solid var(--user-accent)}
.assistant{background:var(--assistant-bg);border-left:4px solid var(--assistant-accent)}
.tool{font-family:Consolas,monospace;font-size:13px;background:var(--tool-bg);border:1px solid var(--tool-border);border-radius:6px;padding:6px 10px;margin:6px 0;color:var(--tool-fg)}
.kind{font-size:12px;font-weight:700;color:var(--kind);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit}`;

export function renderHtml(lines: TranscriptLine[], meta: ReportMeta): string {
  const stats = reportStats(lines);
  const sorted = [...lines].sort((a, b) => (a.at < b.at ? -1 : 1));
  const body: string[] = [];
  for (const line of sorted) {
    if (line.kind === 'tool') {
      body.push(`<div class="tool">🔧 ${escapeHtml(line.who ?? 'tool')} — ${escapeHtml(line.text.slice(0, 300))}</div>`);
      continue;
    }
    const label = line.kind === 'user' ? '👤 用户' : `🤖 助手${line.who ? ` · ${escapeHtml(line.who)}` : ''}`;
    body.push(`<div class="turn ${line.kind}"><div class="kind">${label}</div><pre>${escapeHtml(line.text)}</pre></div>`);
  }
  const title = escapeHtml(meta.title ?? `Session ${meta.sessionId.replace(/^session-/, '').slice(0, 8)}`);
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>
<h1>${title}</h1>
<div class="meta">${stats.entries} 条 · 用户 ${stats.users} · 助手 ${stats.assistants} · 工具 ${stats.tools} · ${stats.chars.toLocaleString()} 字符 · session ${escapeHtml(meta.sessionId)}</div>
${body.join('\n')}
</body></html>`;
}
