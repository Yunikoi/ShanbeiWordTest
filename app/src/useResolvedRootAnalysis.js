import { useEffect, useMemo, useState } from 'react'
import { buildRootAnalysis, isPlaceholderRootAnalysis, withBookSameRoot } from './rootAnalysis.js'
import { fetchRootAnalysisLlm, getCachedRootAnalysisLlm } from './llmRootAnalysis.js'
import { getRootLlmSettings } from './llmSettings.js'
import { saveWordRootAnalysis } from './rootAnalysisCache.js'
import { enrichAnalysisWithQuword } from './quwordClient.js'

/**
 * 统一解析词根：DeepSeek 缓存 → 卡片缓存 → 本地词库；按需拉 API + 趣词补全。
 * @param {{ word: string, senses?: { pos?: string, zh: string }[], ipa?: string, rootAnalysis?: import('./rootAnalysis.js').RootAnalysis } | null | undefined} entry
 * @param {string | null | undefined} bookId
 * @param {Array<{ word: string, senses?: { pos?: string, zh: string }[] }>} pool
 * @param {{ fetchOnDemand?: boolean }} [opts]
 */
export function useResolvedRootAnalysis(entry, bookId, pool, opts = {}) {
  const fetchOnDemand = opts.fetchOnDemand === true
  const word = entry?.word

  const staticBase = useMemo(() => {
    if (!entry?.word) return null
    const cached = bookId ? getCachedRootAnalysisLlm(bookId, entry.word) : null
    if (cached) return withBookSameRoot(cached, entry, pool) ?? cached
    if (entry.rootAnalysis?.source === 'deepseek' || entry.rootAnalysis?.source === 'quword') {
      return withBookSameRoot(entry.rootAnalysis, entry, pool) ?? entry.rootAnalysis
    }
    const local = entry.rootAnalysis ?? buildRootAnalysis(entry, pool)
    return withBookSameRoot(local, entry, pool) ?? local
  }, [entry, bookId, pool])

  const [llmAnalysis, setLlmAnalysis] = useState(/** @type {import('./rootAnalysis.js').RootAnalysis | null} */ (null))
  const [llmLoading, setLlmLoading] = useState(false)
  const [quwordAnalysis, setQuwordAnalysis] = useState(/** @type {import('./rootAnalysis.js').RootAnalysis | null} */ (null))
  const [quwordLoading, setQuwordLoading] = useState(false)

  const resolvedBase = llmAnalysis ?? staticBase

  useEffect(() => {
    setLlmAnalysis(null)
    setLlmLoading(false)
    if (!fetchOnDemand || !entry?.word || !bookId) return
    if (staticBase?.source === 'deepseek' && !isPlaceholderRootAnalysis(staticBase)) return
    if (staticBase?.source === 'quword' && !isPlaceholderRootAnalysis(staticBase)) return

    const cfg = getRootLlmSettings()
    if (!cfg.enabled || !cfg.apiKey.trim()) return

    let cancelled = false
    setLlmLoading(true)
    fetchRootAnalysisLlm(entry, cfg, bookId, pool.length ? pool : [entry])
      .then((result) => {
        if (!cancelled && result) setLlmAnalysis(result)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLlmLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchOnDemand, entry, bookId, pool, word, staticBase])

  const enrichBase = llmAnalysis ?? staticBase

  useEffect(() => {
    setQuwordAnalysis(null)
    setQuwordLoading(false)
    if (!fetchOnDemand || !enrichBase || !word) return
    if (enrichBase.affixGroups?.length && !isPlaceholderRootAnalysis(enrichBase)) {
      setQuwordAnalysis(enrichBase)
      return
    }

    let cancelled = false
    setQuwordLoading(true)
    enrichAnalysisWithQuword(enrichBase, word)
      .then((next) => {
        if (cancelled) return
        const merged = next ?? enrichBase
        setQuwordAnalysis(merged)
        setQuwordLoading(false)
        if (
          bookId &&
          merged?.source &&
          (merged.source === 'deepseek' || merged.source === 'quword') &&
          (merged.affixGroups?.length || (merged.rootLine && merged.rootLine !== '无'))
        ) {
          saveWordRootAnalysis(bookId, word, merged)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuwordAnalysis(enrichBase)
          setQuwordLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fetchOnDemand, enrichBase, word, bookId])

  const analysis = quwordAnalysis ?? resolvedBase

  return {
    analysis,
    loading: llmLoading || quwordLoading,
    llmLoading,
    quwordLoading,
  }
}
