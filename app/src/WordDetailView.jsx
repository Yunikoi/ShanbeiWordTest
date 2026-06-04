import { useMemo } from 'react'
import { RootAnalysisPanel } from './RootAnalysisPanel.jsx'
import { buildRootAnalysis, withBookSameRoot } from './rootAnalysis.js'
import { getCachedRootAnalysisLlm } from './llmRootAnalysis.js'
import { useQuwordRootAnalysis } from './useQuwordRootAnalysis.js'

/**
 * @param {{
 *   entry: { word: string, ipa?: string, senses: { pos?: string, zh: string }[], rootAnalysis?: import('./rootAnalysis.js').RootAnalysis },
 *   pool: { word: string, senses: { pos?: string, zh: string }[] }[],
 *   bookId?: string | null,
 *   rootEnrichRunning?: boolean,
 *   onClose: () => void,
 * }} props
 */
export function WordDetailView({ entry, pool, bookId, rootEnrichRunning, onClose }) {
  const baseRootAnalysis = useMemo(() => {
    let base
    if (entry.rootAnalysis?.source === 'deepseek') base = entry.rootAnalysis
    else {
      const cached = bookId ? getCachedRootAnalysisLlm(bookId, entry.word) : null
      if (cached) base = cached
      else if (entry.rootAnalysis) base = entry.rootAnalysis
      else base = buildRootAnalysis(entry, pool)
    }
    return withBookSameRoot(base, entry, pool) ?? base
  }, [entry, pool, bookId])

  const { analysis: rootAnalysis, quwordLoading } = useQuwordRootAnalysis(
    baseRootAnalysis,
    entry.word,
  )

  const rootPending =
    rootEnrichRunning &&
    bookId &&
    !getCachedRootAnalysisLlm(bookId, entry.word) &&
    entry.rootAnalysis?.source !== 'deepseek'

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-br from-slate-100 via-violet-50 to-indigo-100"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.word} 详情`}
    >
      <header className="flex items-center gap-3 border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← 返回
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{entry.word}</h2>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-6">
        <section className="rounded-3xl bg-white/95 p-6 shadow-xl backdrop-blur">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{entry.word}</p>
            {entry.ipa ? <p className="mt-1 text-sm text-slate-400">{entry.ipa}</p> : null}
          </div>

          <ul className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            {entry.senses.map((s, i) => (
              <li key={i} className="text-base leading-relaxed text-slate-800">
                {s.pos ? (
                  <span className="mr-2 text-sm font-semibold text-indigo-600">{s.pos}.</span>
                ) : null}
                {s.zh}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="mb-1 px-1 text-sm font-semibold text-violet-900">词根分析</h3>
          {rootPending ? (
            <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-3 text-center text-xs text-violet-800">
              整本词表词根分析进行中，完成后会自动显示 DeepSeek 结果…
            </p>
          ) : null}
          <RootAnalysisPanel analysis={rootAnalysis} word={entry.word} loading={quwordLoading} />
        </section>
      </main>
    </div>
  )
}
