import { hasRootAnalysis } from './rootAnalysis.js'

/**
 * @param {{ analysis?: import('./rootAnalysis.js').RootAnalysis | null, word?: string }} props
 */
export function RootAnalysisPanel({ analysis, word }) {
  if (!hasRootAnalysis(analysis)) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        暂无词根分析。英语词将拆解为前缀 / 词根 / 后缀，或识别现代合成法（如 subset = sub + set）。
      </p>
    )
  }

  const title = word || '词条'
  const morphLabel =
    analysis?.morphKind === 'compound'
      ? '现代英语合成法'
      : analysis?.morphKind === 'classical'
        ? '拉丁 / 希腊词根词'
        : null

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <header>
        <h3 className="text-base font-bold text-violet-950">🔍 {title}</h3>
        {morphLabel ? (
          <span className="mt-1 inline-block rounded-md bg-violet-200/80 px-2 py-0.5 text-[10px] font-semibold text-violet-900">
            {morphLabel}
          </span>
        ) : null}
        {analysis?.gloss ? (
          <p className="mt-2 text-sm text-slate-800">
            <span className="font-medium text-violet-800">1. 核心释义：</span>
            {analysis.gloss}
          </p>
        ) : null}
      </header>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
          2. 构词法深度拆解
        </h4>
        <dl className="space-y-2 rounded-xl bg-white px-3 py-3 text-sm ring-1 ring-violet-100">
          {analysis?.morphKind === 'compound' ? (
            <p className="text-xs leading-relaxed text-slate-600">
              本词属于现代合成词：由独立词/前缀组合而成，不宜强行套用拉丁词干拆解。
            </p>
          ) : null}
          <div>
            <dt className="text-[11px] font-semibold text-violet-600">
              {analysis?.morphKind === 'compound' ? '成分 A（前缀/前项）' : '前缀 (Prefix)'}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-slate-800">{analysis?.prefixLine || '无'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-violet-600">
              {analysis?.morphKind === 'compound' ? '成分 B（词干/后项）' : '词根 (Root)'}
            </dt>
            <dd className="mt-0.5 leading-relaxed text-slate-800">{analysis?.rootLine || '无'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-violet-600">后缀 (Suffix)</dt>
            <dd className="mt-0.5 leading-relaxed text-slate-800">{analysis?.suffixLine || '无'}</dd>
          </div>
          {analysis?.evolution ? (
            <div className="border-t border-violet-50 pt-2">
              <dt className="text-[11px] font-semibold text-violet-600">字面逻辑演变</dt>
              <dd className="mt-0.5 leading-relaxed text-slate-700">{analysis.evolution}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {analysis?.pieSummary ? (
        <section className="rounded-xl bg-violet-100/60 px-3 py-2">
          <h4 className="text-xs font-semibold text-violet-800">印欧语源（PIE）</h4>
          <p className="mt-1 text-sm text-violet-950">{analysis.pieSummary}</p>
        </section>
      ) : null}

      {analysis?.insight ? (
        <section className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
          <h4 className="text-xs font-semibold text-amber-900">4. 深度记忆心法</h4>
          <p className="mt-1 text-sm leading-relaxed text-amber-950">{analysis.insight}</p>
        </section>
      ) : null}

      {analysis?.family?.length ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            3. 真正的同根 / 同合成词族（本词书 · 限 2–4 个）
          </h4>
          <ul className="space-y-2">
            {analysis.family.map((f) => (
              <li
                key={f.word}
                className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-violet-100"
              >
                <span className="font-bold text-violet-950">{f.word}</span>
                {f.morphBreakdown ? (
                  <p className="mt-1 text-xs text-slate-600">{f.morphBreakdown} → {f.zh || ''}</p>
                ) : f.zh ? (
                  <p className="mt-0.5 text-xs text-slate-500">→ {f.zh}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-slate-400">
            {analysis.morphKind === 'compound'
              ? '仅列出相同合成模式或共享同一合成成分者；形似不同源（如 subtle 与 subset）不会入选。'
              : '仅列出共享同一拉丁/希腊/PIE 词源血统者。'}
          </p>
        </section>
      ) : analysis?.strictEtymology && analysis?.parts?.length ? (
        <p className="text-xs text-slate-500">本词书中暂无其它同血统词。</p>
      ) : null}

      {analysis?.relatedNotes?.length ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold text-slate-600">笔记关联（非词源同根）</h4>
          <ul className="flex flex-wrap gap-2">
            {analysis.relatedNotes.map((n) => (
              <li
                key={n.label}
                title={n.zh || ''}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {n.label}
                {n.zh ? <span className="text-slate-500"> · {n.zh}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis?.tips?.length ? (
        <section>
          <ul className="space-y-1 text-[11px] leading-relaxed text-slate-500">
            {analysis.tips.map((t, i) => (
              <li key={i}>· {t}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[10px] text-slate-400">印欧语源学 + 现代合成法 · 本地词库 · 不调用 API</p>
    </div>
  )
}
