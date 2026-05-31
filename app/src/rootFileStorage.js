import { resolveRootStorageKey } from './rootStorageKey.js'

const DB_NAME = 'swt-root-file-db'
const STORE = 'handles'
const FILE_FORMAT = 'shanbei-root-analysis'
const FILE_VERSION = 1

/** @typedef {FileSystemFileHandle} FileHandle */

/** @returns {boolean} */
export function isRootFileStorageSupported() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** @param {string} storageKey @returns {Promise<FileHandle | null>} */
async function getStoredHandle(storageKey) {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(storageKey)
      req.onsuccess = () => resolve(/** @type {FileHandle | null} */ (req.result ?? null))
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/** @param {string} storageKey @param {FileHandle} handle */
async function putStoredHandle(storageKey, handle) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(handle, storageKey)
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
}

/** @param {FileHandle} handle */
async function ensureWritePermission(handle) {
  const q = await handle.queryPermission({ mode: 'readwrite' })
  if (q === 'granted') return true
  const r = await handle.requestPermission({ mode: 'readwrite' })
  return r === 'granted'
}

/** @param {FileHandle} handle */
async function readJsonFile(handle) {
  const file = await handle.getFile()
  const text = await file.text()
  if (!text.trim()) return null
  return JSON.parse(text)
}

/**
 * @param {string} bookId
 * @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} words
 * @param {string} [bookTitle]
 */
function buildFilePayload(bookId, words, bookTitle) {
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    storageKey: resolveRootStorageKey(bookId),
    bookId,
    bookTitle: bookTitle || '',
    updatedAt: new Date().toISOString(),
    words,
  }
}

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const syncTimers = new Map()

/** @type {Map<string, string>} */
const bookTitles = new Map()

/** @param {string} bookId @param {string} title */
export function setRootFileBookTitle(bookId, title) {
  if (bookId) bookTitles.set(resolveRootStorageKey(bookId), title)
}

/**
 * @param {string} bookId
 * @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} map
 * @param {string} [bookTitle]
 */
export function scheduleRootFileSync(bookId, map, bookTitle) {
  if (!isRootFileStorageSupported() || !bookId) return
  const storageKey = resolveRootStorageKey(bookId)
  const title = bookTitle || bookTitles.get(storageKey) || ''
  const prev = syncTimers.get(storageKey)
  if (prev) window.clearTimeout(prev)
  syncTimers.set(
    storageKey,
    window.setTimeout(() => {
      syncTimers.delete(storageKey)
      writeRootsToBoundFile(bookId, map, bookTitle).catch(() => {})
    }, 800),
  )
}

/**
 * @param {string} bookId
 * @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} map
 * @param {string} [bookTitle]
 */
export async function writeRootsToBoundFile(bookId, map, bookTitle) {
  const storageKey = resolveRootStorageKey(bookId)
  const handle = await getStoredHandle(storageKey)
  if (!handle) return false
  if (!(await ensureWritePermission(handle))) return false
  const payload = buildFilePayload(bookId, map, bookTitle)
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(payload, null, 2))
  await writable.close()
  return true
}

/**
 * @param {string} bookId
 * @param {string} [suggestedName]
 */
export async function pickRootSaveFile(bookId, suggestedName) {
  if (!isRootFileStorageSupported()) {
    throw new Error('当前浏览器不支持写入本机文件，请用电脑版 Chrome 或 Edge')
  }
  const storageKey = resolveRootStorageKey(bookId)
  const base = suggestedName || `词根-${storageKey.replace(/[^a-zA-Z0-9\u4e00-\u9fff._-]+/g, '-')}`
  const handle = await window.showSaveFilePicker({
    suggestedName: base.endsWith('.json') ? base : `${base}.json`,
    types: [{ description: '词根分析 JSON', accept: { 'application/json': ['.json'] } }],
  })
  await putStoredHandle(storageKey, handle)
  return handle
}

/** @param {string} bookId */
export async function pickRootLoadFile(bookId) {
  if (!isRootFileStorageSupported()) {
    throw new Error('当前浏览器不支持读取本机文件，请用电脑版 Chrome 或 Edge')
  }
  const handles = await window.showOpenFilePicker({
    multiple: false,
    types: [{ description: '词根分析 JSON', accept: { 'application/json': ['.json'] } }],
  })
  const handle = handles[0]
  const storageKey = resolveRootStorageKey(bookId)
  await putStoredHandle(storageKey, handle)
  return handle
}

/** @param {string} bookId */
export async function hasBoundRootFile(bookId) {
  const storageKey = resolveRootStorageKey(bookId)
  return Boolean(await getStoredHandle(storageKey))
}

/**
 * @param {string} bookId
 * @returns {Promise<Record<string, import('./rootAnalysis.js').RootAnalysis> | null>}
 */
export async function loadRootsFromBoundFile(bookId) {
  const storageKey = resolveRootStorageKey(bookId)
  const handle = await getStoredHandle(storageKey)
  if (!handle) return null
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const r = await handle.requestPermission({ mode: 'readwrite' })
      if (r !== 'granted') return null
    }
    const data = await readJsonFile(handle)
    if (!data || data.format !== FILE_FORMAT) return null
    if (data.storageKey && data.storageKey !== storageKey) return null
    const words = data.words
    if (!words || typeof words !== 'object') return null
    return /** @type {Record<string, import('./rootAnalysis.js').RootAnalysis>} */ (words)
  } catch {
    return null
  }
}

/** @param {string} bookId @param {Record<string, import('./rootAnalysis.js').RootAnalysis>} map @param {string} [bookTitle] */
export async function bindAndWriteRootFile(bookId, map, bookTitle) {
  await pickRootSaveFile(bookId, bookTitle ? `${bookTitle}-词根` : undefined)
  await writeRootsToBoundFile(bookId, map, bookTitle)
}
