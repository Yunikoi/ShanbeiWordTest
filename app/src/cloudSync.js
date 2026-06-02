import { createClient } from '@supabase/supabase-js'
import { buildBackupPayload, applyStorageRecord } from './dataBackup.js'

const SYNC_KEY_STORE = 'swt-cloud-sync-key'
const SYNC_ENABLED = 'swt-cloud-sync-enabled'
const SYNC_LAST_PUSH = 'swt-cloud-sync-last-push'
const SYNC_LAST_PULL = 'swt-cloud-sync-last-pull'
const SYNC_META = new Set([SYNC_LAST_PUSH, SYNC_LAST_PULL])

/** @returns {boolean} */
export function isCloudSyncConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

/** 浏览器走同源代理，避免直连 supabase.co 失败 */
function getSupabaseUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/supabase`
  }
  return import.meta.env.VITE_SUPABASE_URL
}

/** @param {unknown} e */
function toSyncError(e) {
  const msg = e instanceof Error ? e.message : String(e)
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(
      '无法连接云端。请检查：① Supabase 项目是否已恢复运行；② Vercel 环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 已配置并 Redeploy；③ 若页面显示 NOT_FOUND，请在 Vercel 把 Root Directory 留空（不要用 app 子目录）',
    )
  }
  if (/not_found|404/i.test(msg)) {
    return new Error('云同步接口 404：请重新部署最新代码，并确认 Vercel Root Directory 为仓库根目录（留空）')
  }
  return e instanceof Error ? e : new Error(msg)
}

function client() {
  const url = getSupabaseUrl()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!import.meta.env.VITE_SUPABASE_URL || !key) {
    throw new Error('未配置云同步（缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）')
  }
  return createClient(url, key)
}

/** @returns {{ enabled: boolean, syncKey: string }} */
export function getCloudSyncSettings() {
  try {
    return {
      enabled: localStorage.getItem(SYNC_ENABLED) === '1',
      syncKey: localStorage.getItem(SYNC_KEY_STORE) || '',
    }
  } catch {
    return { enabled: false, syncKey: '' }
  }
}

/** @param {{ enabled?: boolean, syncKey?: string }} patch */
export function setCloudSyncSettings(patch) {
  if (patch.syncKey !== undefined) {
    const k = patch.syncKey.trim()
    if (k.length < 4) throw new Error('同步码至少 4 个字符')
    localStorage.setItem(SYNC_KEY_STORE, k)
  }
  if (patch.enabled !== undefined) {
    localStorage.setItem(SYNC_ENABLED, patch.enabled ? '1' : '0')
  }
}

/** @returns {number} */
function normalizeSyncTimeMs(iso) {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

/** @returns {number} */
export function getLastSyncedAtMs() {
  const pull = localStorage.getItem(SYNC_LAST_PULL) || ''
  const push = localStorage.getItem(SYNC_LAST_PUSH) || ''
  return Math.max(normalizeSyncTimeMs(pull), normalizeSyncTimeMs(push))
}

/** @param {ReturnType<typeof buildBackupPayload>} payload */
export function fingerprintFromPayload(payload) {
  return Object.keys(payload.storage)
    .filter((k) => !SYNC_META.has(k))
    .sort()
    .map((k) => `${k}\0${payload.storage[k]}`)
    .join('\n')
}

/** @returns {string[]} */
function listAppStorageKeysForSync() {
  /** @type {string[]} */
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('swt-') && !SYNC_META.has(k)) keys.push(k)
  }
  return keys.sort()
}

/** @returns {string} */
export function storageFingerprint() {
  return listAppStorageKeysForSync()
    .map((k) => {
      const v = localStorage.getItem(k)
      const len = v?.length ?? 0
      // 词根/词书体积大，只用长度做变更检测，避免每 8s 拼接数 MB 字符串卡死页面
      if (k.startsWith('swt-root-llm-') || k.startsWith('swt-book-')) {
        return `${k}:${len}`
      }
      if (len > 8192) {
        return `${k}:${len}:${v?.slice(0, 48)}`
      }
      return `${k}\0${v}`
    })
    .join('\n')
}

/** @param {string | undefined} raw @returns {Record<string, unknown>} */
function parseRootMapJson(raw) {
  if (!raw) return {}
  try {
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

/** @param {unknown} a @param {unknown} b */
function pickRicherRootEntry(a, b) {
  if (!a) return b
  if (!b) return a
  const score = (x) => {
    if (!x || typeof x !== 'object') return 0
    const o = /** @type {Record<string, unknown>} */ (x)
    let s = 0
    if (o.rootLine) s += 2
    if (Array.isArray(o.derivatives) && o.derivatives.length) s += 1
    if (Array.isArray(o.themeWords) && o.themeWords.length) s += 1
    if (o.schemaVersion) s += 0.5
    return s
  }
  return score(a) >= score(b) ? a : b
}

/** @param {string | undefined} localRaw @param {string | undefined} remoteRaw */
function mergeRootMapJson(localRaw, remoteRaw) {
  const a = parseRootMapJson(localRaw)
  const b = parseRootMapJson(remoteRaw)
  /** @type {Record<string, unknown>} */
  const out = { ...b }
  for (const word of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[word] = pickRicherRootEntry(a[word], b[word])
  }
  if (!Object.keys(out).length) return null
  return JSON.stringify(out)
}

/**
 * 词根数据合并：云同步时取本地+云端并集，避免手机进度覆盖电脑已分析词根。
 * @param {Record<string, string>} base
 * @param {Record<string, string>} other
 */
function mergeRootStorageRecords(base, other) {
  const out = { ...base }
  const rootKeys = new Set([
    ...Object.keys(base).filter((k) => k.startsWith('swt-root-llm-')),
    ...Object.keys(other).filter((k) => k.startsWith('swt-root-llm-')),
  ])
  for (const key of rootKeys) {
    const merged = mergeRootMapJson(base[key], other[key])
    if (merged) out[key] = merged
  }
  return out
}

/** @returns {Record<string, string>} */
function collectLocalRootStorage() {
  /** @type {Record<string, string>} */
  const localRoots = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('swt-root-llm-')) {
      const v = localStorage.getItem(k)
      if (v) localRoots[k] = v
    }
  }
  return localRoots
}

/** @param {string} remoteUpdatedAt */
export function markSyncedAt(remoteUpdatedAt) {
  localStorage.setItem(SYNC_LAST_PULL, remoteUpdatedAt)
  localStorage.setItem(SYNC_LAST_PUSH, remoteUpdatedAt)
}

/**
 * @param {string} syncKey
 * @returns {Promise<{ updatedAt: string, payload: ReturnType<typeof buildBackupPayload> } | null>}
 */
export async function pullRemoteSync(syncKey) {
  try {
    const sb = client()
    const { data, error } = await sb
      .from('app_sync')
      .select('updated_at, payload')
      .eq('sync_key', syncKey)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.payload?.storage) return null
    return {
      updatedAt: String(data.updated_at),
      payload: /** @type {ReturnType<typeof buildBackupPayload>} */ (data.payload),
    }
  } catch (e) {
    throw toSyncError(e)
  }
}

/**
 * @param {string} syncKey
 * @returns {Promise<string>}
 */
export async function pushRemoteSync(syncKey) {
  try {
    let storage = buildBackupPayload().storage
    try {
      const remote = await pullRemoteSync(syncKey)
      if (remote?.payload?.storage) {
        storage = mergeRootStorageRecords(storage, remote.payload.storage)
      }
    } catch {
      /* 拉取失败仍上传本机 */
    }
    const payload = {
      format: 'shanbei-word-test-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      storage,
    }
    const sb = client()
    const updatedAt = new Date().toISOString()
    const { error } = await sb.from('app_sync').upsert({
      sync_key: syncKey,
      payload,
      updated_at: updatedAt,
    })
    if (error) throw new Error(error.message)
    for (const [key, val] of Object.entries(storage)) {
      if (key.startsWith('swt-root-llm-')) localStorage.setItem(key, val)
    }
    localStorage.setItem(SYNC_LAST_PUSH, updatedAt)
    return updatedAt
  } catch (e) {
    throw toSyncError(e)
  }
}

/**
 * @param {ReturnType<typeof buildBackupPayload>} payload
 * @param {string} remoteUpdatedAt
 */
export function applyRemotePayload(payload, remoteUpdatedAt) {
  const localRoots = collectLocalRootStorage()
  const merged = mergeRootStorageRecords(payload.storage, localRoots)
  applyStorageRecord(merged, { replace: true })
  markSyncedAt(remoteUpdatedAt)
}

/** @returns {string} */
export function generateSyncCode() {
  const chars = 'abcdefghijkmnopqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export { SYNC_LAST_PUSH, SYNC_LAST_PULL }
