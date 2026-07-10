import { scheduleUserDataFileSync } from './userDataFileStorage.js'

const BACKUP_FORMAT = 'shanbei-word-test-backup'
const BACKUP_VERSION = 1
const KEY_PREFIX = 'swt-'

/** @returns {string[]} */
export function listAppStorageKeys() {
  /** @type {string[]} */
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(KEY_PREFIX)) keys.push(k)
  }
  return keys.sort()
}

/** @returns {{ format: string, version: number, exportedAt: string, storage: Record<string, string> }} */
export function buildBackupPayload() {
  /** @type {Record<string, string>} */
  const storage = {}
  for (const key of listAppStorageKeys()) {
    const val = localStorage.getItem(key)
    if (val != null) storage[key] = val
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storage,
  }
}

/** @param {{ format?: string, version?: number, storage?: Record<string, string> }} payload */
function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('不是有效的备份文件')
  if (payload.format !== BACKUP_FORMAT) throw new Error('备份格式不匹配')
  if (payload.version !== BACKUP_VERSION) throw new Error(`备份版本 ${payload.version} 与当前 ${BACKUP_VERSION} 不兼容`)
  if (!payload.storage || typeof payload.storage !== 'object') throw new Error('备份缺少 storage 数据')
  const keys = Object.keys(payload.storage)
  if (!keys.length) throw new Error('备份为空')
  for (const k of keys) {
    if (!k.startsWith(KEY_PREFIX)) throw new Error(`非法键名：${k}`)
    if (typeof payload.storage[k] !== 'string') throw new Error(`键 ${k} 数据损坏`)
  }
}

/**
 * @returns {{ filename: string, json: string, keyCount: number }}
 */
export function exportUserDataBackup() {
  const payload = buildBackupPayload()
  const keyCount = Object.keys(payload.storage).length
  if (!keyCount) throw new Error('当前没有可备份的学习数据')
  const d = new Date()
  const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return {
    filename: `shanbei-backup-${tag}.json`,
    json: JSON.stringify(payload, null, 2),
    keyCount,
  }
}

/** @param {string} json */
export function downloadUserDataBackup(json, filename) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** @param {Record<string, string>} storage @param {{ replace?: boolean }} [opts] */
export function applyStorageRecord(storage, opts = {}) {
  const { replace = true } = opts
  const keys = Object.keys(storage)
  if (!keys.length) throw new Error('同步数据为空')
  for (const k of keys) {
    if (!k.startsWith(KEY_PREFIX)) throw new Error(`非法键名：${k}`)
    if (typeof storage[k] !== 'string') throw new Error(`键 ${k} 数据损坏`)
  }
  if (replace) {
    for (const key of listAppStorageKeys()) {
      localStorage.removeItem(key)
    }
  }
  for (const [key, val] of Object.entries(storage)) {
    localStorage.setItem(key, val)
  }
  return { keyCount: keys.length }
}

/**
 * @param {string} text
 * @param {{ replace?: boolean }} [opts]
 * @returns {{ keyCount: number }}
 */
export function importUserDataBackup(text, opts = {}) {
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败')
  }
  validateBackup(payload)
  const result = applyStorageRecord(payload.storage, opts)
  scheduleUserDataFileSync()
  return result
}

/** @returns {{ keyCount: number, bookCount: number } | null} */
export function summarizeLocalData() {
  const keys = listAppStorageKeys()
  if (!keys.length) return null
  let bookCount = 0
  try {
    const metaRaw = localStorage.getItem('swt-books-meta')
    const meta = metaRaw ? JSON.parse(metaRaw) : []
    bookCount = Array.isArray(meta) ? meta.length : 0
  } catch {
    bookCount = 0
  }
  return { keyCount: keys.length, bookCount }
}
