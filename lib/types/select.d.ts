/** Session selection for /report: no argument means the most recently active
 * session, `all` means every session, anything else is an id prefix match. */
export interface SessionRecord {
    sessionId: string;
    at: string;
}
export declare function pickSessions(records: SessionRecord[], argument: string): string[];
//# sourceMappingURL=select.d.ts.map