const META_KEY = 'swt-books-meta'
const PREFIX = 'swt-root-llm-'

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
  const stable = resolveRootStorageKey(bookId)
  if (!bookId || stable === bookId) return
  const legacy = localStorage.getItem(PREFIX + bookId)
  const current = localStorage.getItem(PREFIX + stable)
  if (legacy && (!current || current === '{}')) {
    localStorage.setItem(PREFIX + stable, legacy)
  }
}
