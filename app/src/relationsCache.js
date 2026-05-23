const PREFIX = 'swt-relations-'

/** @param {string} bookId @returns {Record<string, import('./wordRelations.js').WordRelations>} */
function loadBookRelationsMap(bookId) {
  try {
    const raw = localStorage.getItem(PREFIX + bookId)
    const data = raw ? JSON.parse(raw) : {}
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** @param {string} bookId @param {Record<string, import('./wordRelations.js').WordRelations>} map */
function saveBookRelationsMap(bookId, map) {
  localStorage.setItem(PREFIX + bookId, JSON.stringify(map))
}

/** @param {string} bookId @param {string} word */
export function loadWordRelations(bookId, word) {
  const map = loadBookRelationsMap(bookId)
  return map[word] ?? map[word.toLowerCase()] ?? null
}

/**
 * @param {string} bookId
 * @param {string} word
 * @param {import('./wordRelations.js').WordRelations} relations
 */
export function saveWordRelations(bookId, word, relations) {
  const map = loadBookRelationsMap(bookId)
  map[word] = relations
  saveBookRelationsMap(bookId, map)
}

/** @param {string} bookId */
export function removeRelationsCache(bookId) {
  localStorage.removeItem(PREFIX + bookId)
}
