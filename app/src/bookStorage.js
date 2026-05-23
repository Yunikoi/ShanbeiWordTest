import { removeStudyHistory } from './studyHistory.js'
import { removeRelationsCache } from './relationsCache.js'

const META_KEY = 'swt-books-meta'
const PREFIX_BOOK = 'swt-book-'
const PREFIX_PROG = 'swt-prog-'

/** @typedef {{ id: string, title: string, source: 'builtin' | 'import', file?: string, sourceFile?: string, createdAt?: string, updatedAt?: string }} BookMeta */

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/** @param {BookMeta[]} list */
export function saveMeta(list) {
  localStorage.setItem(META_KEY, JSON.stringify(list))
}

/** @param {string} bookId */
export function loadBookEntries(bookId) {
  try {
    const raw = localStorage.getItem(PREFIX_BOOK + bookId)
    if (!raw) return null
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/** @param {string} bookId @param {unknown[]} entries */
export function saveBookEntries(bookId, entries) {
  localStorage.setItem(PREFIX_BOOK + bookId, JSON.stringify(entries))
}

/** @param {string} bookId */
export function loadProgress(bookId) {
  try {
    const raw = localStorage.getItem(PREFIX_PROG + bookId)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** @param {string} bookId @param {Record<string, unknown>} map */
export function saveProgress(bookId, map) {
  localStorage.setItem(PREFIX_PROG + bookId, JSON.stringify(map))
}

/**
 * @param {string} title
 * @param {unknown[]} entries
 * @returns {string} new id
 */
/**
 * @param {string} filename
 * @returns {BookMeta | undefined}
 */
export function findImportBySourceFile(filename) {
  if (!filename) return undefined
  const base = filename.replace(/\.(txt|md)$/i, '')
  return loadMeta().find(
    (b) =>
      b.source === 'import' &&
      (b.sourceFile === filename || b.title === base || b.title === filename),
  )
}

/**
 * @param {string} bookId
 * @param {unknown[]} entries
 * @param {{ sourceFile?: string, title?: string }} [opts]
 * @returns {boolean}
 */
export function updateImportedBook(bookId, entries, opts = {}) {
  const meta = loadMeta()
  const idx = meta.findIndex((b) => b.id === bookId && b.source === 'import')
  if (idx < 0) return false

  const newWords = new Set(
    entries.map((e) => (typeof e === 'object' && e && 'word' in e ? String(/** @type {{ word: string }} */ (e).word) : '')),
  )
  const oldProg = loadProgress(bookId)
  /** @type {Record<string, unknown>} */
  const mergedProg = {}
  for (const [w, p] of Object.entries(oldProg)) {
    if (newWords.has(w)) mergedProg[w] = p
  }

  saveBookEntries(bookId, entries)
  saveProgress(bookId, mergedProg)
  if (opts.title) meta[idx].title = opts.title
  if (opts.sourceFile) meta[idx].sourceFile = opts.sourceFile
  meta[idx].updatedAt = new Date().toISOString()
  saveMeta(meta)
  return true
}

/**
 * @param {string} title
 * @param {unknown[]} entries
 * @param {{ sourceFile?: string }} [opts]
 * @returns {string} new id
 */
export function addImportedBook(title, entries, opts = {}) {
  const id = `import-${Date.now()}`
  const meta = loadMeta()
  meta.push({
    id,
    title: title || '导入词书',
    source: 'import',
    ...(opts.sourceFile ? { sourceFile: opts.sourceFile } : {}),
    createdAt: new Date().toISOString(),
  })
  saveMeta(meta)
  saveBookEntries(id, entries)
  saveProgress(id, {})
  return id
}

/** @param {string} bookId */
export function removeImportedBook(bookId) {
  const meta = loadMeta().filter((b) => b.id !== bookId)
  saveMeta(meta)
  localStorage.removeItem(PREFIX_BOOK + bookId)
  localStorage.removeItem(PREFIX_PROG + bookId)
  removeStudyHistory(bookId)
  removeRelationsCache(bookId)
}
