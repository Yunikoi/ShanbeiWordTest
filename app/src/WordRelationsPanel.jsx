import { RELATION_KEYS, RELATION_LABELS, hasRelations } from './wordRelations.js'

/**
 * @param {{ relations?: import('./wordRelations.js').WordRelations | null }} props
 */
export function WordRelationsPanel({ relations }) {
  if (!hasRelations(relations)) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        暂无联想词。笔记里若写了同义 / 反义等小节会自动合并；其余由词书内词条与模板本地生成。
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-4">
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
      <p className="text-[10px] text-slate-400">悬浮词条查看释义 · 本地词书联想（不调用 API）</p>
    </div>
  )
}
