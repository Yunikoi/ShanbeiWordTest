import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCloudSyncSettings,
  isCloudSyncConfigured,
  pullRemoteSync,
  pushRemoteSync,
  applyRemotePayload,
  storageFingerprint,
  SYNC_LAST_PUSH,
} from './cloudSync.js'

const PULL_MS = 12_000
const PUSH_MS = 8_000

/**
 * @returns {{
 *   configured: boolean,
 *   settings: { enabled: boolean, syncKey: string },
 *   status: string,
 *   syncing: boolean,
 *   enableSync: (syncKey: string) => Promise<void>,
 *   disableSync: () => void,
 * }}
 */
export function useCloudSync() {
  const configured = isCloudSyncConfigured()
  const [settings, setSettings] = useState(() => getCloudSyncSettings())
  const [status, setStatus] = useState('')
  const [syncing, setSyncing] = useState(false)
  const fingerprintRef = useRef(storageFingerprint())
  const applyingRemoteRef = useRef(false)

  const pullIfNewer = useCallback(async () => {
    const { enabled, syncKey } = getCloudSyncSettings()
    if (!configured || !enabled || !syncKey) return
    try {
      const remote = await pullRemoteSync(syncKey)
      if (!remote) return
      const localPush = localStorage.getItem(SYNC_LAST_PUSH) || ''
      if (remote.updatedAt <= localPush) return
      applyingRemoteRef.current = true
      applyRemotePayload(remote.payload, remote.updatedAt)
      setStatus(`已从云端更新 · ${new Date(remote.updatedAt).toLocaleString()}`)
      window.setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setStatus(`拉取失败：${e?.message || String(e)}`)
    }
  }, [configured])

  const pushIfDirty = useCallback(async () => {
    if (applyingRemoteRef.current) return
    const { enabled, syncKey } = getCloudSyncSettings()
    if (!configured || !enabled || !syncKey) return
    const fp = storageFingerprint()
    if (fp === fingerprintRef.current) return
    fingerprintRef.current = fp
    setSyncing(true)
    try {
      const at = await pushRemoteSync(syncKey)
      setStatus(`已同步到云端 · ${new Date(at).toLocaleTimeString()}`)
    } catch (e) {
      setStatus(`上传失败：${e?.message || String(e)}`)
    } finally {
      setSyncing(false)
    }
  }, [configured])

  const enableSync = useCallback(
    async (syncKey) => {
      if (!configured) throw new Error('服务端未配置云同步')
      const key = syncKey.trim()
      if (key.length < 4) throw new Error('同步码至少 4 个字符')
      localStorage.setItem('swt-cloud-sync-key', key)
      localStorage.setItem('swt-cloud-sync-enabled', '1')
      setSettings(getCloudSyncSettings())
      setSyncing(true)
      try {
        const remote = await pullRemoteSync(key)
        if (remote) {
          const localHasData = storageFingerprint().length > 50
          if (localHasData && !window.confirm('云端已有数据。确定用云端覆盖本机？\n取消则改为上传本机数据到云端。')) {
            await pushRemoteSync(key)
            fingerprintRef.current = storageFingerprint()
            setStatus('已启用：本机数据已上传到云端')
          } else {
            applyRemotePayload(remote.payload, remote.updatedAt)
            setStatus('已启用：已从云端恢复')
            window.setTimeout(() => window.location.reload(), 600)
          }
        } else {
          await pushRemoteSync(key)
          fingerprintRef.current = storageFingerprint()
          setStatus('已启用：首次同步完成')
        }
      } finally {
        setSyncing(false)
      }
    },
    [configured],
  )

  const disableSync = useCallback(() => {
    localStorage.setItem('swt-cloud-sync-enabled', '0')
    setSettings(getCloudSyncSettings())
    setStatus('已关闭自动同步（本机数据保留）')
  }, [])

  useEffect(() => {
    if (!configured || !settings.enabled || !settings.syncKey) return
    pullIfNewer()
    const pullId = window.setInterval(pullIfNewer, PULL_MS)
    const pushId = window.setInterval(pushIfDirty, PUSH_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pullIfNewer()
        pushIfDirty()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(pullId)
      window.clearInterval(pushId)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [configured, settings.enabled, settings.syncKey, pullIfNewer, pushIfDirty])

  useEffect(() => {
    if (!settings.enabled) return
    const onHide = () => {
      pushIfDirty()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [settings.enabled, pushIfDirty])

  return {
    configured,
    settings,
    status,
    syncing,
    enableSync,
    disableSync,
  }
}
