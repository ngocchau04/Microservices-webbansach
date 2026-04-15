/**
 * Short-term in-memory state for admin copilot only (not persisted, not shared with customer chat).
 * Keyed by tenant + ticket + client session id for safe follow-ups across turns.
 */

const MAX_ENTRIES = 150;
const TTL_MS = 45 * 60 * 1000;

/** @type {Map<string, { lastFocus: string, lastEscalationLevel: string, recentAdminQuestions: string[], updatedAt: number }>} */
const store = new Map();

const buildKey = (tenantId, ticketId, copilotSessionId) => {
  const t = String(tenantId || "public").trim() || "public";
  const tick = String(ticketId || "").trim() || "unknown";
  const sid = String(copilotSessionId || "default").trim() || "default";
  return `${t}::${tick}::${sid}`;
};

const pruneIfNeeded = () => {
  if (store.size <= MAX_ENTRIES) return;
  const entries = [...store.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const drop = Math.ceil(store.size - MAX_ENTRIES + 10);
  for (let i = 0; i < drop && i < entries.length; i += 1) {
    store.delete(entries[i][0]);
  }
};

const pruneStale = () => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.updatedAt > TTL_MS) {
      store.delete(k);
    }
  }
};

/**
 * @returns {{ lastFocus?: string, lastEscalationLevel?: string, recentAdminQuestions?: string[] } | null}
 */
const getAdminCopilotMemory = (tenantId, ticketId, copilotSessionId) => {
  pruneStale();
  const key = buildKey(tenantId, ticketId, copilotSessionId);
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() - row.updatedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return {
    lastFocus: row.lastFocus,
    lastEscalationLevel: row.lastEscalationLevel,
    recentAdminQuestions: row.recentAdminQuestions || [],
  };
};

/**
 * @param {{ lastFocus: string, escalationLevel: string, adminQuestion: string }} patch
 */
const setAdminCopilotMemory = (tenantId, ticketId, copilotSessionId, patch) => {
  pruneStale();
  pruneIfNeeded();
  const key = buildKey(tenantId, ticketId, copilotSessionId);
  const prev = store.get(key) || {
    lastFocus: "balanced",
    lastEscalationLevel: "low",
    recentAdminQuestions: [],
    updatedAt: Date.now(),
  };
  const recent = [...(prev.recentAdminQuestions || []), String(patch.adminQuestion || "").trim()].filter(Boolean).slice(-5);
  const next = {
    lastFocus: patch.lastFocus || prev.lastFocus,
    lastEscalationLevel: patch.escalationLevel || prev.lastEscalationLevel,
    recentAdminQuestions: recent,
    updatedAt: Date.now(),
  };
  store.set(key, next);
};

/** Test helper */
const _resetAdminCopilotMemoryForTests = () => {
  store.clear();
};

module.exports = {
  buildKey,
  getAdminCopilotMemory,
  setAdminCopilotMemory,
  _resetAdminCopilotMemoryForTests,
};
