import { buildBackupPayload, applyStorageRecord, importUserDataBackup } from './dataBackup.js'

const DB_NAME = 'swt-user-data-file-db'
const STORE = 'handles'
const HANDLE_KEY = 'global-backup'

/** @typedef {FileSystemFileHandle} FileHandle */

/** @returns {boolean} */
export function isUserDataFileStorageSupported() {
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

/** @returns {Promise<FileHandle | null>} */
async function getStoredHandle() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(HANDLE_KEY)
      req.onsuccess = () => resolve(/** @type {FileHandle | null} */ (req.result ?? null))
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/** @param {FileHandle} handle */
async function putStoredHandle(handle) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(handle, HANDLE_KEY)
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
async function readFileText(handle) {
  const file = await handle.getFile()
  return await file.text()
}

/** @returns {Promise<boolean>} */
export async function hasBoundUserDataFile() {
  return Boolean(await getStoredHandle())
}

/** @param {string} [suggestedName] */
export async function bindUserDataFile(suggestedName) {
  if (!isUserDataFileStorageSupported()) {
    throw new Error('当前浏览器不支持写入本机文件，请用电脑版 Chrome 或 Edge')
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: suggestedName || 'shanbei-学习数据.json',
    types: [{ description: '扇贝学习数据 JSON', accept: { 'application/json': ['.json'] } }],
  })
  await putStoredHandle(handle)
  await writeUserDataToBoundFile()
  return handle
}

/** 选择已有备份文件并绑定（换浏览器后恢复用） */
export async function bindExistingUserDataFile() {
  if (!isUserDataFileStorageSupported()) {
    throw new Error('当前浏览器不支持读取本机文件，请用电脑版 Chrome 或 Edge')
  }
  const handles = await window.showOpenFilePicker({
    multiple: false,
    types: [{ description: '扇贝学习数据 JSON', accept: { 'application/json': ['.json'] } }],
  })
  const handle = handles[0]
  await putStoredHandle(handle)
  const text = await readFileText(handle)
  importUserDataBackup(text, { replace: true })
  return handle
}

/** @returns {Promise<boolean>} */
export async function writeUserDataToBoundFile() {
  const handle = await getStoredHandle()
  if (!handle) return false
  if (!(await ensureWritePermission(handle))) return false
  const payload = buildBackupPayload()
  if (!Object.keys(payload.storage).length) return false
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(payload, null, 2))
  await writable.close()
  return true
}

let syncTimer = null

/** 学习数据变更后 debounce 写入本机 JSON */
export function scheduleUserDataFileSync() {
  if (!isUserDataFileStorageSupported()) return
  if (syncTimer) window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => {
    syncTimer = null
    writeUserDataToBoundFile().catch(() => {})
  }, 1200)
}

/**
 * 启动时：若已绑定本机文件，从文件恢复或把浏览器数据写回文件。
 * @returns {Promise<'loaded' | 'saved' | 'skip'>}
 */
export async function hydrateUserDataFromBoundFile() {
  const handle = await getStoredHandle()
  if (!handle) return 'skip'

  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const r = await handle.requestPermission({ mode: 'readwrite' })
      if (r !== 'granted') return 'skip'
    }

    const text = await readFileText(handle)
    if (!text.trim()) return 'skip'

    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      return 'skip'
    }

    const local = buildBackupPayload()
    const localKeys = Object.keys(local.storage).length
    const fileKeys = Object.keys(payload.storage || {}).length

    if (fileKeys === 0) return 'skip'

    const fileTime = Date.parse(payload.exportedAt || '')
    const localTime = Date.parse(local.exportedAt || '')

    if (localKeys === 0 || (Number.isFinite(fileTime) && fileTime > localTime)) {
      importUserDataBackup(text, { replace: true })
      return 'loaded'
    }

    if (localKeys > 0 && (!Number.isFinite(fileTime) || localTime >= fileTime)) {
      await writeUserDataToBoundFile()
      return 'saved'
    }

    return 'skip'
  } catch {
    return 'skip'
  }
}
