import { useEffect, useMemo, useState } from 'react'
import { buildGlossMap, formatSessionTime, summarizeSession } from './studyHistory.js'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   sessions: import('./studyHistory.js').StudySession[],
 *   entries: { word: string, senses?: { zh?: string }[] }[],
 * }} props
 */
export function StudyHistoryModal({ open, onClose, sessions, entries }) {
  const [selectedId, setSelectedId] = useState(null)
  const glossMap = useMemo(() => buildGlossMap(entries), [entries])

  useEffect(() => {
    if (!open) setSelectedId(null)
  }, [open])

  const selected = sessions.find((s) => s.id === selectedId)
  const selectedSummary = selected ? summarizeSession(selected) : null
  const unknownSet = useMemo(
    () => new Set(selectedSummary?.unknown ?? []),
    [selectedSummary],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-history-title"
    >
      <div className="mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 id="study-history-title" className="text-lg font-bold text-slate-900">
              {selected ? '本次测试详情' : '测试历史'}
            </h3>
            {selected ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {formatSessionTime(selected.endedAt || selected.startedAt)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">悬浮单词可查看释义</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedId) setSelectedId(null)
              else onClose()
            }}
            className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            {selectedId ? '返回' : '关闭'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!selected ? (
            sessions.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">暂无记录，完成一次「开始学习」后会出现在这里。</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => {
                  const sum = summarizeSession(s)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {formatSessionTime(s.endedAt || s.startedAt)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          测试 {sum.testedCount} 词 · 不会 {sum.unknownCount} 词
                          {sum.unknownCount > 0 ? (
                            <span className="ml-2 text-rose-600">（不熟悉 / 不认识）</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : selectedSummary ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">共 {selectedSummary.testedCount} 词</span>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
                  不会 {selectedSummary.unknownCount} 词
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                  认识 {selectedSummary.testedCount - selectedSummary.unknownCount} 词
                </span>
              </div>

              {selectedSummary.unknownCount > 0 ? (
                <>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600">不会的</h4>
                  <WordChipGrid
                    words={selectedSummary.unknown}
                    highlight
                    glossMap={glossMap}
                  />
                </>
              ) : null}

              <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">全部测试词</h4>
              <WordChipGrid
                words={selectedSummary.tested}
                unknownSet={unknownSet}
                glossMap={glossMap}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   words: string[],
 *   highlight?: boolean,
 *   unknownSet?: Set<string>,
 *   glossMap: Map<string, string>,
 * }} props
 */
function WordChipGrid({ words, highlight, unknownSet, glossMap }) {
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word) => {
        const isUnknown = highlight || unknownSet?.has(word)
        const gloss = glossMap.get(word) || '（无释义）'
        return (
          <span
            key={word}
            title={gloss}
            className={`cursor-default rounded-xl px-3 py-1.5 text-sm font-medium ${
              isUnknown
                ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-200'
                : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
            }`}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
