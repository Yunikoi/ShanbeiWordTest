const META_KEY = 'swt-books-meta'
const PREFIX = 'swt-root-llm-'

/**
 * @param {string | null} raw
 * @returns {number}
 */
function countRootEntries(raw) {
  if (!raw || raw === '{}') return 0
  try {
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? Object.keys(data).length : 0
  } catch {
    return 0
  }
}

/**
 * 词根持久化键：同一源文件（如 Yasi.md）共用一份，避免重新导入或换 bookId 后丢失。
 * @param {string} bookId
 */
export function resolveRootStorageKey(bookId) {
  if (!bookId) return bookId
  /** @type {Array<{ id: string, sourceFile?: string, file?: string, title?: string }>} */
  let meta = []
  try {
    const raw = localStorage.getItem(META_KEY)
    meta = raw ? JSON.parse(raw) : []
    if (!Array.isArray(meta)) meta = []
  } catch {
    meta = []
  }
  const b = meta.find((x) => x.id === bookId)
  if (b?.sourceFile) return `src:${b.sourceFile}`
  if (b?.file) return `wbf:${b.file}`
  if (b?.title) return `ttl:${b.title}`
  return bookId
}

/** @param {string} bookId */
export function migrateLegacyRootStorage(bookId) {
  if (!bookId) return
  const stable = resolveRootStorageKey(bookId)
  const targetKey = PREFIX + stable

  /** @type {Array<{ id: string, sourceFile?: string, file?: string, title?: string }>} */
  let meta = []
  try {
    const raw = localStorage.getItem(META_KEY)
    meta = raw ? JSON.parse(raw) : []
    if (!Array.isArray(meta)) meta = []
  } catch {
    meta = []
  }

  const current = meta.find((x) => x.id === bookId)
  let bestRaw = localStorage.getItem(targetKey)
  let bestCount = countRootEntries(bestRaw)

  /** @param {string | undefined} raw */
  const consider = (raw) => {
    const n = countRootEntries(raw ?? null)
    if (n > bestCount && raw) {
      bestRaw = raw
      bestCount = n
    }
  }

  consider(localStorage.getItem(PREFIX + bookId))

  if (current) {
    for (const b of meta) {
      const sameFile =
        current.sourceFile && b.sourceFile && current.sourceFile === b.sourceFile
      const sameTitle = current.title && b.title && current.title === b.title
      if (sameFile || sameTitle) {
        consider(localStorage.getItem(PREFIX + b.id))
        consider(localStorage.getItem(PREFIX + resolveRootStorageKey(b.id)))
      }
    }
  }

  if (bestCount > 0 && bestRaw) {
    localStorage.setItem(targetKey, bestRaw)
  }
}
