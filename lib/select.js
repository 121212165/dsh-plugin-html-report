/** Session selection for /report: no argument means the most recently active
 * session, `all` means every session, anything else is an id prefix match. */
function groupBySession(records) {
    const lastAt = new Map();
    for (const record of records) {
        const seen = lastAt.get(record.sessionId);
        if (!seen || record.at > seen)
            lastAt.set(record.sessionId, record.at);
    }
    return lastAt;
}
export function pickSessions(records, argument) {
    const lastAt = groupBySession(records);
    const ids = [...lastAt.keys()];
    const trimmed = argument.trim();
    if (trimmed === 'all')
        return ids.sort((a, b) => (lastAt.get(a) < lastAt.get(b) ? 1 : -1));
    if (!trimmed) {
        if (!ids.length)
            return [];
        return [ids.reduce((best, id) => (lastAt.get(id) > lastAt.get(best) ? id : best))];
    }
    return ids.filter((id) => id.startsWith(trimmed) || id.replace(/^session-/, '').startsWith(trimmed));
}
//# sourceMappingURL=select.js.map