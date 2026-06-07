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
 * @param {StudySession[]} sessions
 * @returns {{ word: string, count: number, forgetCount: number, fuzzyCount: number, lastAt: string }[]}
 */
export function aggregateUnknownWords(sessions) {
  /** @type {Map<string, { count: number, forgetCount: number, fuzzyCount: number, lastAt: string }>} */
  const map = new Map()

  for (const session of sessions) {
    for (const e of session.events) {
      if (e.kind !== 'forget' && e.kind !== 'fuzzy') continue
      const prev = map.get(e.word) || { count: 0, forgetCount: 0, fuzzyCount: 0, lastAt: '' }
      prev.count += 1
      if (e.kind === 'forget') prev.forgetCount += 1
      else prev.fuzzyCount += 1
      if (!prev.lastAt || e.at > prev.lastAt) prev.lastAt = e.at
      map.set(e.word, prev)
    }
  }

  return [...map.entries()]
    .map(([word, stat]) => ({ word, ...stat }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
}

/**
 * @param {StudySession[]} sessions
 * @returns {string[]}
 */
export function allUnknownWordsSorted(sessions) {
  return aggregateUnknownWords(sessions).map((item) => item.word)
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
 * @param {StudySession} session
 * @returns {string} YYYY-MM-DD
 */
export function sessionDayKey(session) {
  try {
    const d = new Date(session.endedAt || session.startedAt)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

/**
 * @param {StudySession[]} sessions
 * @returns {Map<string, { sessions: StudySession[], testedTotal: number, unknownTotal: number, sessionCount: number }>}
 */
export function groupSessionsByDay(sessions) {
  /** @type {Map<string, { sessions: StudySession[], testedTotal: number, unknownTotal: number, sessionCount: number }>} */
  const map = new Map()
  for (const s of sessions) {
    const key = sessionDayKey(s)
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, { sessions: [], testedTotal: 0, unknownTotal: 0, sessionCount: 0 })
    }
    const bucket = map.get(key)
    const sum = summarizeSession(s)
    bucket.sessions.push(s)
    bucket.testedTotal += sum.testedCount
    bucket.unknownTotal += sum.unknownCount
    bucket.sessionCount += 1
  }
  for (const bucket of map.values()) {
    bucket.sessions.sort(
      (a, b) =>
        new Date(b.endedAt || b.startedAt).getTime() - new Date(a.endedAt || a.startedAt).getTime(),
    )
  }
  return map
}

/** @param {string} key YYYY-MM-DD */
export function formatDayKey(key) {
  const [y, m, d] = key.split('-')
  if (!y || !m || !d) return key
  return `${y}年${Number(m)}月${Number(d)}日`
}

/** @param {number} year @param {number} month 0-based */
export function formatMonthTitle(year, month) {
  return `${year}年${month + 1}月`
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
