const CACHE_KEY = 'swt-ipa-cache-v1'

/** @returns {Record<string, string>} */
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** @param {Record<string, string>} map */
function saveCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeIpa(raw) {
  let t = String(raw ?? '').trim()
  if (!t) return ''
  if (!t.startsWith('/')) t = `/${t}`
  if (!t.endsWith('/')) t = `${t}/`
  return t
}

/**
 * @param {unknown} data
 * @returns {string | null}
 */
function pickIpaFromApiPayload(data) {
  if (!Array.isArray(data)) return null
  for (const entry of data) {
    const phonetics = entry?.phonetics
    if (!Array.isArray(phonetics)) continue
    for (const p of phonetics) {
      const text = typeof p?.text === 'string' ? p.text.trim() : ''
      if (text) return normalizeIpa(text.replace(/^\/|\/$/g, ''))
    }
  }
  return null
}

/**
 * 在线查询 IPA（结果写入 localStorage，下次离线可读缓存）。
 * @param {string} word
 * @returns {Promise<string | null>}
 */
export async function fetchIpa(word) {
  const key = String(word ?? '').trim().toLowerCase()
  if (!key) return null

  const cache = loadCache()
  if (cache[key]) return cache[key]

  try {
    const r = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
    )
    if (!r.ok) return null
    const data = await r.json()
    const ipa = pickIpaFromApiPayload(data)
    if (ipa) {
      cache[key] = ipa
      saveCache(cache)
    }
    return ipa
  } catch {
    return null
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 为词条补上 ipa（已有则跳过）。
 * @template {{ word: string, ipa?: string }} T
 * @param {T[]} entries
 * @param {{ onProgress?: (done: number, total: number) => void }} [opts]
 * @returns {Promise<T[]>}
 */
export async function enrichEntriesWithIpa(entries, opts = {}) {
  const { onProgress } = opts
  const out = []
  let done = 0
  for (const entry of entries) {
    if (entry.ipa?.trim()) {
      out.push(entry)
    } else {
      const ipa = await fetchIpa(entry.word)
      out.push(ipa ? { ...entry, ipa } : entry)
      await sleep(120)
    }
    done += 1
    onProgress?.(done, entries.length)
  }
  return out
}
