const PREFIX_HISTORY = 'swt-history-'
const MAX_SESSIONS = 150

/** @typedef {'known' | 'fuzzy' | 'forget'} GradeKind */
/** @typedef {{ word: string, kind: GradeKind, at: string }} HistoryEvent */
/** @typedef {{ id: string, startedAt: string, endedAt: string, planTotal: number, dailyGoal: number, events: HistoryEvent[] }} StudySession */

/**
 * @param {string} bookId
 * @returns {StudySession[]}
 */
export function loadStudyHistory(bookId) {
  try {
    const raw = localStorage.getItem(PREFIX_HISTORY + bookId)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/**
 * @param {string} bookId
 * @param {StudySession} session
 */
export function appendStudySession(bookId, session) {
  const prev = loadStudyHistory(bookId)
  const next = [session, ...prev.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS)
  localStorage.setItem(PREFIX_HISTORY + bookId, JSON.stringify(next))
  return next
}

/** @param {string} bookId */
export function removeStudyHistory(bookId) {
  localStorage.removeItem(PREFIX_HISTORY + bookId)
}

/**
 * @param {StudySession} session
 * @returns {{ tested: string[], unknown: string[], testedCount: number, unknownCount: number }}
 */
export function summarizeSession(session) {
  const testedSet = new Set()
  /** @type {Set<string>} */
  const unknownSet = new Set()

  for (const e of session.events) {
    testedSet.add(e.word)
    if (e.kind === 'forget' || e.kind === 'fuzzy') {
      unknownSet.add(e.word)
    }
  }

  const tested = [...testedSet]
  const unknown = tested.filter((w) => unknownSet.has(w))
  return {
    tested,
    unknown,
    testedCount: tested.length,
    unknownCount: unknown.length,
  }
}

/**
 * @param {string} iso
 * @returns {string}
 */
export function formatSessionTime(iso) {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/**
 * @param {{ senses?: { zh?: string }[] }[]} entries
 * @returns {Map<string, string>}
 */
export function buildGlossMap(entries) {
  const map = new Map()
  for (const e of entries) {
    const zh = e.senses?.map((s) => s.zh).filter(Boolean).join('；') || ''
    if (zh) map.set(e.word, zh)
  }
  return map
}
