import { RELATION_KEYS, RELATION_LABELS, hasRelations } from './wordRelations.js'

/**
 * @param {{
 *   relations?: import('./wordRelations.js').WordRelations | null,
 *   loading?: boolean,
 *   error?: string | null,
 *   onRetry?: () => void,
 * }} props
 */
export function WordRelationsPanel({ relations, loading, error, onRetry }) {
  if (loading) {
    return (
      <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 text-center text-sm text-indigo-800">
        大模型正在生成联想词…
      </p>
    )
  }

  if (error && !hasRelations(relations)) {
    return (
      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-900">
        <p>{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            重试
          </button>
        ) : null}
      </div>
    )
  }

  if (!hasRelations(relations)) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        暂无联想词。请确认已在书架启用大模型并填写 API Key，然后点击「查看联想」自动生成。
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-4">
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
      {RELATION_KEYS.map((key) => {
        const items = relations?.[key]
        if (!items?.length) return null
        return (
          <section key={key}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {RELATION_LABELS[key]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const tip = [item.pos ? `${item.pos}.` : '', item.zh || '（无释义）'].filter(Boolean).join(' ')
                return (
                  <span
                    key={item.label}
                    title={tip}
                    className="cursor-default rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-950 ring-1 ring-indigo-100"
                  >
                    {item.label}
                  </span>
                )
              })}
            </div>
          </section>
        )
      })}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400">悬浮词条查看释义 · 由大模型生成</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="text-[10px] font-medium text-indigo-600 hover:underline">
            重新生成
          </button>
        ) : null}
      </div>
    </div>
  )
}
