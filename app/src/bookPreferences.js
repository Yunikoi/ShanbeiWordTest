const KEY = 'swt-book-prefs'

/** @typedef {{ rootAnalysisEnabled?: boolean }} BookPrefs */

/** @returns {Record<string, BookPrefs>} */
function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : {}
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** @param {Record<string, BookPrefs>} map */
function saveAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** @param {string} bookId */
export function isBookRootAnalysisEnabled(bookId) {
  if (!bookId) return false
  const prefs = loadAll()[bookId]
  // 默认关闭，需用户在词书页手动开启（避免打开大词书就后台跑 API）
  return prefs?.rootAnalysisEnabled === true
}

/** @param {string} bookId @param {boolean} enabled */
export function setBookRootAnalysisEnabled(bookId, enabled) {
  if (!bookId) return
  const all = loadAll()
  all[bookId] = { ...all[bookId], rootAnalysisEnabled: enabled }
  saveAll(all)
}
