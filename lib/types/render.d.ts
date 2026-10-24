import type { TranscriptLine } from './line.ts';
/** Pure HTML report rendering: a self-contained offline page per session —
 * inline CSS, no assets, no scripts, opens anywhere. */
export interface ReportMeta {
    sessionId: string;
    title?: string;
}
export declare function escapeHtml(text: string): string;
export declare function reportStats(lines: TranscriptLine[]): {
    entries: number;
    users: number;
    assistants: number;
    tools: number;
    chars: number;
};
export declare function renderHtml(lines: TranscriptLine[], meta: ReportMeta): string;
//# sourceMappingURL=render.d.ts.map