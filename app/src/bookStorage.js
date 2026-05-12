const META_KEY = 'swt-books-meta'
const PREFIX_BOOK = 'swt-book-'
const PREFIX_PROG = 'swt-prog-'

/** @typedef {{ id: string, title: string, source: 'builtin' | 'import', file?: string, createdAt?: string }} BookMeta */

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
export function addImportedBook(title, entries) {
  const id = `import-${Date.now()}`
  const meta = loadMeta()
  meta.push({
    id,
    title: title || '导入词书',
    source: 'import',
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
}
