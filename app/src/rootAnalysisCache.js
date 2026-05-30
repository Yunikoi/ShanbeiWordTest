const PREFIX = 'swt-root-llm-'

/** @param {string} bookId @returns {Record<string, import('./rootAnalysis.js').RootAnalysis>} */
function loadBookRootMap(bookId) {
  try {
    const raw = localStorage.getItem(PREFIX + bookId)
    const data = raw ? JSON.parse(raw) : {}
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** @param {string} bookId @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} map */
function saveBookRootMap(bookId, map) {
  localStorage.setItem(PREFIX + bookId, JSON.stringify(map))
}

/** @param {unknown} raw @returns {import('./rootAnalysis.js').RootAnalysis | null} */
function normalizeStored(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {import('./rootAnalysis.js').RootAnalysis} */ (raw)
  if (o.source !== 'deepseek') return null
  if (!o.rootLine || !o.gloss) return null
  return o
}

/** @param {string} bookId @param {string} word */
export function loadWordRootAnalysis(bookId, word) {
  if (!bookId || !word) return null
  const map = loadBookRootMap(bookId)
  return normalizeStored(map[word] ?? map[word.toLowerCase()])
}

/**
 * @param {string} bookId
 * @param {string} word
 * @param {import('./rootAnalysis.js').RootAnalysis} analysis
 */
export function saveWordRootAnalysis(bookId, word, analysis) {
  if (!bookId || !word || analysis.source !== 'deepseek') return
  const map = loadBookRootMap(bookId)
  map[word] = analysis
  saveBookRootMap(bookId, map)
}

/** @param {string} bookId @param {Set<string>} keepWords */
export function pruneRootAnalysisCache(bookId, keepWords) {
  const map = loadBookRootMap(bookId)
  let changed = false
  for (const w of Object.keys(map)) {
    if (!keepWords.has(w)) {
      delete map[w]
      changed = true
    }
  }
  if (changed) saveBookRootMap(bookId, map)
}

/** @param {string} bookId */
export function removeRootAnalysisCache(bookId) {
  localStorage.removeItem(PREFIX + bookId)
}

/** @param {string} bookId @param {string[]} words */
export function countCachedRootAnalysis(bookId, words) {
  if (!bookId || !words.length) return 0
  const map = loadBookRootMap(bookId)
  let n = 0
  for (const w of words) {
    if (normalizeStored(map[w] ?? map[w.toLowerCase()])) n += 1
  }
  return n
}
