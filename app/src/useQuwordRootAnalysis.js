import { useEffect, useState } from 'react'
import { enrichAnalysisWithQuword } from './quwordClient.js'
import { saveWordRootAnalysis } from './rootAnalysisCache.js'

/**
 * 旧缓存无 affixGroups 时，打开单词页自动从趣词补全举例。
 * @param {import('./rootAnalysis.js').RootAnalysis | null | undefined} base
 * @param {string | undefined} word
 * @param {string | null | undefined} [bookId]
 */
export function useQuwordRootAnalysis(base, word, bookId) {
  const [analysis, setAnalysis] = useState(base)
  const [quwordLoading, setQuwordLoading] = useState(false)

  useEffect(() => {
    setAnalysis(base)
    if (!base || !word || base.affixGroups?.length) {
      setQuwordLoading(false)
      return
    }
    let cancelled = false
    setQuwordLoading(true)
    enrichAnalysisWithQuword(base, word).then((next) => {
      if (cancelled) return
      const merged = next ?? base
      setAnalysis(merged)
      setQuwordLoading(false)
      if (
        bookId &&
        merged?.affixGroups?.length &&
        !base.affixGroups?.length &&
        merged.source === 'deepseek'
      ) {
        saveWordRootAnalysis(bookId, word, merged)
      }
    })
    return () => {
      cancelled = true
    }
  }, [base, word, bookId])

  return { analysis, quwordLoading }
}
