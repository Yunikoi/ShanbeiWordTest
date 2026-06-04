import { useEffect, useState } from 'react'
import { enrichAnalysisWithQuword } from './quwordClient.js'

/**
 * 旧缓存无 affixGroups 时，打开单词页自动从趣词补全举例。
 * @param {import('./rootAnalysis.js').RootAnalysis | null | undefined} base
 * @param {string | undefined} word
 */
export function useQuwordRootAnalysis(base, word) {
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
      if (!cancelled) {
        setAnalysis(next ?? base)
        setQuwordLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [base, word])

  return { analysis, quwordLoading }
}
