/**
 * @param {{ senses: { pos?: string, zh: string }[] }} entry
 */
function glossPreview(entry) {
  const parts = entry.senses.map((s) => s.zh).filter(Boolean)
  if (!parts.length) return ''
  const joined = parts.join('；')
  return joined.length > 36 ? `${joined.slice(0, 36)}…` : joined
}

/**
 * @param {{
 *   words: { word: string, ipa?: string, senses: { pos?: string, zh: string }[] }[],
 *   completedCount: number,
 *   sessionTotal: number,
 *   onContinue: () => void,
 * }} props
 */
export function SessionCheckpoint({ words, completedCount, sessionTotal, onContinue }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center pb-8">
      <section className="w-full rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">阶段性回顾</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">刚完成的 {words.length} 个词</h2>
          <p className="mt-2 text-sm text-slate-600">
            悬停（或轻触）单词在卡片内展开释义，不遮挡其他词 · 已测 {completedCount}
            {sessionTotal > 0 ? ` / ${sessionTotal}` : ''}
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {words.map((entry, i) => (
            <li key={`${entry.word}-${i}`}>
              <div
                tabIndex={0}
                className="group cursor-default rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5 text-center outline-none transition hover:border-indigo-200 hover:bg-indigo-50/60 focus:border-indigo-200 focus:bg-indigo-50/60"
              >
                <p className="text-lg font-bold text-slate-900">{entry.word}</p>
                {entry.ipa ? (
                  <p className="mt-0.5 text-xs text-slate-400">{entry.ipa}</p>
                ) : null}
                <p className="mt-1.5 text-xs text-slate-400 group-hover:hidden group-focus:hidden">
                  {glossPreview(entry) || '悬停查看释义'}
                </p>

                <div
                  className="mt-2 hidden max-h-28 overflow-y-auto border-t border-indigo-100 pt-2 text-left group-hover:block group-focus:block"
                  role="region"
                  aria-label={`${entry.word} 释义`}
                >
                  <ul className="space-y-1 pr-1">
                    {entry.senses.map((s, si) => (
                      <li key={si} className="text-sm leading-snug text-slate-800">
                        {s.pos ? (
                          <span className="mr-1.5 text-xs font-medium text-indigo-600">{s.pos}.</span>
                        ) : null}
                        {s.zh}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-xs text-slate-400">回忆一遍后点击继续</p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500"
        >
          继续测试
        </button>
      </section>
    </main>
  )
}
