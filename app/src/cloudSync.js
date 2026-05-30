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

function client() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('未配置云同步（缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）')
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

/** @returns {string} */
export function storageFingerprint() {
  return listAppStorageKeysForSync()
    .map((k) => `${k}\0${localStorage.getItem(k)}`)
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

/**
 * @param {string} syncKey
 * @returns {Promise<{ updatedAt: string, payload: ReturnType<typeof buildBackupPayload> } | null>}
 */
export async function pullRemoteSync(syncKey) {
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
}

/**
 * @param {string} syncKey
 * @returns {Promise<string>}
 */
export async function pushRemoteSync(syncKey) {
  const payload = buildBackupPayload()
  const sb = client()
  const updatedAt = new Date().toISOString()
  const { error } = await sb.from('app_sync').upsert({
    sync_key: syncKey,
    payload,
    updated_at: updatedAt,
  })
  if (error) throw new Error(error.message)
  localStorage.setItem(SYNC_LAST_PUSH, updatedAt)
  return updatedAt
}

/**
 * @param {ReturnType<typeof buildBackupPayload>} payload
 * @param {string} remoteUpdatedAt
 */
export function applyRemotePayload(payload, remoteUpdatedAt) {
  applyStorageRecord(payload.storage, { replace: true })
  localStorage.setItem(SYNC_LAST_PULL, remoteUpdatedAt)
}

/** @returns {string} */
export function generateSyncCode() {
  const chars = 'abcdefghijkmnopqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export { SYNC_LAST_PUSH, SYNC_LAST_PULL }
