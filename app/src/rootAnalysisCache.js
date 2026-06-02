import { resolveRootStorageKey, migrateLegacyRootStorage } from './rootStorageKey.js'
import { scheduleRootFileSync } from './rootFileStorage.js'

const PREFIX = 'swt-root-llm-'

/** 词根分析缓存结构版本；升级后旧缓存会自动重分析 */
export const ROOT_ANALYSIS_SCHEMA_VERSION = 2

/** @param {import('./rootAnalysis.js').RootAnalysis | null | undefined} analysis */
export function isRootAnalysisStale(analysis) {
  if (!analysis || analysis.source !== 'deepseek') return false
  // 只要核心字段完整就视为有效，不因 schema 升级隔天又全量重跑（手动点「重新分析」即可）
  if (!analysis.rootLine || !analysis.gloss) return true
  return false
}

/** @type {Map<string, Record<string, import('./rootAnalysis.js').RootAnalysis>>} */
const bookMapMem = new Map()

/** @param {string} bookId */
export function clearBookRootAnalysisCache(bookId) {
  bookMapMem.delete(storageKey(bookId))
  localStorage.removeItem(storageKey(bookId))
}

/** @param {string} bookId @param {string} word */
export function removeWordRootAnalysis(bookId, word) {
  const map = loadBookRootMap(bookId)
  if (map[word]) {
    delete map[word]
    saveBookRootMap(bookId, map)
  }
  if (map[word.toLowerCase()]) {
    delete map[word.toLowerCase()]
    saveBookRootMap(bookId, map)
  }
}

/** @param {string} bookId */
function storageKey(bookId) {
  migrateLegacyRootStorage(bookId)
  return PREFIX + resolveRootStorageKey(bookId)
}

/** @param {string} bookId @returns {Record<string, import('./rootAnalysis.js').RootAnalysis>} */
function loadBookRootMap(bookId) {
  const key = storageKey(bookId)
  const hit = bookMapMem.get(key)
  if (hit) return hit
  try {
    const raw = localStorage.getItem(key)
    const data = raw ? JSON.parse(raw) : {}
    const map = data && typeof data === 'object' ? data : {}
    bookMapMem.set(key, map)
    return map
  } catch {
    bookMapMem.set(key, /** @type {Record<string, import('./rootAnalysis.js').RootAnalysis>} */ ({}))
    return bookMapMem.get(key)
  }
}

/** @param {string} bookId @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} map */
function saveBookRootMap(bookId, map) {
  const key = storageKey(bookId)
  bookMapMem.set(key, map)
  localStorage.setItem(key, JSON.stringify(map))
  scheduleRootFileSync(bookId, map)
}

/** @param {string} bookId @returns {Record<string, import('./rootAnalysis.js').RootAnalysis>} */
export function exportBookRootMap(bookId) {
  return loadBookRootMap(bookId)
}

/**
 * @param {string} bookId
 * @param {Record<string, unknown>} wordsMap
 * @returns {number} imported count
 */
export function importBookRootMap(bookId, wordsMap) {
  if (!bookId || !wordsMap) return 0
  const fileKeys = Object.keys(wordsMap)
  if (!fileKeys.length) return 0
  const map = loadBookRootMap(bookId)
  if (Object.keys(map).length >= fileKeys.length) {
    let missing = 0
    for (const word of fileKeys) {
      if (!normalizeStored(map[word] ?? map[word.toLowerCase()])) missing += 1
    }
    if (missing === 0) return 0
  }
  let n = 0
  for (const [word, raw] of Object.entries(wordsMap)) {
    const norm = normalizeStored(raw)
    if (!norm) continue
    const prev = normalizeStored(map[word] ?? map[word.toLowerCase()])
    if (prev?.rootLine === norm.rootLine && prev?.gloss === norm.gloss) continue
    map[word] = norm
    n += 1
  }
  if (n) saveBookRootMap(bookId, map)
  return n
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
  bookMapMem.delete(storageKey(bookId))
  localStorage.removeItem(storageKey(bookId))
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

/** @param {string} bookId @param {string[]} words */
export function countPendingRootAnalysis(bookId, words) {
  if (!bookId || !words.length) return 0
  const map = loadBookRootMap(bookId)
  let n = 0
  for (const w of words) {
    const stored = normalizeStored(map[w] ?? map[w.toLowerCase()])
    if (!stored || isRootAnalysisStale(stored)) n += 1
  }
  return n
}
