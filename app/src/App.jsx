import { useCallback, useEffect, useRef, useState } from 'react'
import { getLlmSettings, setLlmSettings } from './llmSettings.js'
import { useBookshelfStudy } from './useBookshelfStudy.js'

const SLIDE_MS = 320
const REVEAL_MS = 520

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function speakEnglish(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  window.speechSynthesis.speak(u)
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

export default function App() {
  const {
    shelfLoading,
    shelfError,
    books,
    bookLoadError,
    view,
    activeTitle,
    loadBook,
    beginSession,
    preparingSession,
    backToShelf,
    sessionPosition,
    sessionTotal,
    sessionEmpty,
    currentCard,
    commitGrade,
    importFromText,
    clearActiveBook,
  } = useBookshelfStudy()

  const fileRef = useRef(null)
  const dirRef = useRef(null)

  useEffect(() => {
    const el = dirRef.current
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
  }, [])

  const [importTip, setImportTip] = useState(null)
  const [openingId, setOpeningId] = useState(null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [dailyCount, setDailyCount] = useState(30)

  const [revealed, setRevealed] = useState(false)
  const [slideStage, setSlideStage] = useState('idle')
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [cardKey, setCardKey] = useState(0)
  const [doneOpen, setDoneOpen] = useState(false)

  const onPickBook = useCallback(
    async (book) => {
      setImportTip(null)
      setOpeningId(book.id)
      const r = await loadBook(book)
      setOpeningId(null)
      if (!r.ok) return
      setPickerOpen(true)
      setDailyCount(30)
    },
    [loadBook],
  )

  const [llm, setLlm] = useState(() => getLlmSettings())

  const patchLlm = useCallback((p) => {
    const next = { ...llm, ...p }
    setLlm(next)
    setLlmSettings(next)
  }, [llm])

  const startFromPicker = useCallback(async () => {
    setDoneOpen(false)
    try {
      await beginSession(dailyCount)
      setPickerOpen(false)
      setRevealed(false)
      setSlideStage('idle')
      setCardKey((k) => k + 1)
    } catch {
      setImportTip('开始学习失败，请检查网络或大模型 API 设置')
    }
  }, [beginSession, dailyCount])

  const handleGrade = useCallback(
    async (kind) => {
      if (feedbackBusy || !currentCard) return
      setFeedbackBusy(true)
      try {
        if (!revealed && kind !== 'known') {
          setRevealed(true)
          await sleep(REVEAL_MS)
        } else if (!revealed && kind === 'known') {
          setRevealed(true)
          await sleep(REVEAL_MS * 0.6)
        }

        setSlideStage('exit')
        await sleep(SLIDE_MS)

        const { done } = commitGrade(kind)
        setCardKey((k) => k + 1)

        if (done) {
          setRevealed(true)
          setDoneOpen(true)
          setSlideStage('idle')
        } else {
          setRevealed(false)
          setSlideStage('enter')
          await sleep(SLIDE_MS)
          setSlideStage('idle')
        }
      } finally {
        setFeedbackBusy(false)
      }
    },
    [feedbackBusy, currentCard, revealed, commitGrade],
  )

  const onVocabFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try {
        const text = await readFileAsText(file)
        const base = file.name.replace(/\.txt$/i, '')
        const r = importFromText(text, base)
        if (r.ok) {
          let msg = `已导入「${base}」共 ${r.count} 词`
          if (r.skippedLines) msg += `（跳过 ${r.skippedLines} 行）`
          setImportTip(msg)
        } else {
          setImportTip(r.message)
        }
      } catch {
        setImportTip('读取文件失败，请重试')
      }
    },
    [importFromText],
  )

  const onVocabDir = useCallback(
    async (e) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      e.target.value = ''
      const txts = files.filter((f) => /\.txt$/i.test(f.name))
      if (!txts.length) {
        setImportTip('文件夹中未找到 .txt 文件')
        return
      }
      try {
        const parts = await Promise.all(txts.map((f) => readFileAsText(f)))
        const merged = parts.join('\n')
        const title = `文件夹导入（${txts.length} 个文件）`
        const r = importFromText(merged, title)
        if (r.ok) {
          setImportTip(`已合并导入 ${txts.length} 个 txt，共 ${r.count} 词`)
        } else {
          setImportTip(r.message)
        }
      } catch {
        setImportTip('读取文件夹失败，请重试')
      }
    },
    [importFromText],
  )

  const cardAnimClass =
    slideStage === 'exit' ? 'card-slide-exit' : slideStage === 'enter' ? 'card-slide-enter' : ''

  if (shelfLoading && view === 'shelf') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 text-slate-600">
        正在加载书架…
      </div>
    )
  }

  if (shelfError && view === 'shelf' && !books.length) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8 text-center">
        <p className="text-red-600">书架加载失败：{shelfError}</p>
        <p className="text-sm text-slate-600">请确认已存在 /wordbooks/manifest.json 与配套 txt。</p>
      </div>
    )
  }

  if (view === 'study') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDoneOpen(false)
                backToShelf()
              }}
              className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              ← 书架
            </button>
            <div className="text-right text-xs text-slate-500">
              <div className="font-medium text-slate-800">{activeTitle}</div>
              {!sessionEmpty && sessionTotal ? (
                <div>
                  进度 {sessionPosition}/{sessionTotal}
                </div>
              ) : null}
            </div>
          </header>

          {bookLoadError ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{bookLoadError}</p>
          ) : null}

          {sessionEmpty ? (
            <section className="rounded-3xl bg-white/90 p-8 text-center shadow-xl backdrop-blur">
              <p className="text-lg font-semibold text-slate-800">今日没有待复习单词</p>
              <p className="mt-2 text-sm text-slate-600">
                所有词条的下次复习日期都在今天之后，或词书为空。可以改日再来，或调整词书。
              </p>
              <button
                type="button"
                onClick={() => backToShelf()}
                className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500"
              >
                返回书架
              </button>
            </section>
          ) : currentCard && !doneOpen ? (
            <main className="flex flex-1 flex-col items-center justify-center pb-8">
              <div className="relative w-full overflow-hidden">
                <article
                  key={cardKey}
                  className={`w-full rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur will-change-transform sm:p-8 ${cardAnimClass}`}
                >
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        {currentCard.word}
                      </h1>
                      <p className="mt-1 text-xs text-slate-400">
                        例句为阅读向英文模板（不含中文释义；中文义项仅用于离线轮换选句）
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(currentCard.word)}
                      disabled={feedbackBusy}
                      className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      aria-label="朗读"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 3.5 3.5 0 0 0 0-4.95.75.75 0 1 1 1.06-1.061 5 5 0 0 1 0 7.07.75.75 0 0 1-1.06 0 6.5 6.5 0 0 1 0-9.192.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6 min-h-[4.5rem] rounded-2xl bg-slate-50/90 p-4">
                    {!revealed ? (
                      <p className="text-sm text-slate-400">释义与例句已隐藏，先尝试回忆再看提示。</p>
                    ) : (
                      <ul className="space-y-4">
                        {currentCard.senses.map((s, i) => (
                          <li key={i} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                            <p className="text-base font-medium text-slate-900">
                              {s.pos ? <span className="mr-2 text-indigo-600">{s.pos}.</span> : null}
                              {s.zh}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.example}</p>
                            {s.exampleZh ? (
                              <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-relaxed text-slate-600">
                                {s.exampleZh}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      disabled={feedbackBusy || revealed}
                      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-40"
                    >
                      显示释义 / 例句
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => handleGrade('known')}
                      disabled={feedbackBusy || doneOpen}
                      className="rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
                    >
                      认识
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade('fuzzy')}
                      disabled={feedbackBusy || doneOpen}
                      className="rounded-2xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-amber-500 disabled:opacity-50"
                    >
                      模糊
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade('forget')}
                      disabled={feedbackBusy || doneOpen}
                      className="rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
                    >
                      忘记
                    </button>
                  </div>
                </article>
              </div>
            </main>
          ) : null}
        </div>

        {doneOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900">今日复习完成</h2>
              <p className="mt-2 text-sm text-slate-600">
                已完成 {sessionTotal} 个词条。已根据「认识 / 模糊 / 忘记」更新下次复习时间。
              </p>
              <button
                type="button"
                onClick={() => {
                  setDoneOpen(false)
                  backToShelf()
                }}
                className="mt-6 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500"
              >
                返回书架
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">雅思梯度记忆 · 书架</h1>
          <p className="mt-2 text-sm text-slate-600">纯前端离线复习 · 进度保存在本机 localStorage</p>
        </header>

        <div className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={onVocabFile} />
          <input ref={dirRef} type="file" className="hidden" multiple onChange={onVocabDir} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
          >
            导入 txt 词书
          </button>
          <button
            type="button"
            onClick={() => dirRef.current?.click()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50"
          >
            导入文件夹（全部 .txt）
          </button>
        </div>
        {importTip ? (
          <p className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            {importTip}
          </p>
        ) : null}

        <details className="mb-6 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">大模型生成例句+译文（可选）</summary>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            默认使用本地模板。若填写 API 密钥并勾选，则在点击「开始学习」后<strong>仅对今日抽中的词</strong>依次调用模型生成阅读向英文句与中文译文（密钥仅存本机）。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={llm.enabled}
                onChange={(e) => patchLlm({ enabled: e.target.checked })}
              />
              启用在线生成
            </label>
            <select
              value={llm.provider}
              onChange={(e) => patchLlm({ provider: /** @type {'gemini'|'groq'} */ (e.target.value) })}
              className="rounded-lg border border-slate-200 px-2 py-1"
            >
              <option value="gemini">Google Gemini（浏览器直连）</option>
              <option value="groq">Groq（开发环境走 Vite 代理）</option>
            </select>
          </div>
          <input
            type="password"
            autoComplete="off"
            placeholder="API Key"
            value={llm.apiKey}
            onChange={(e) => patchLlm({ apiKey: e.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Gemini 模型名"
              value={llm.modelGemini}
              onChange={(e) => patchLlm({ modelGemini: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              type="text"
              placeholder="Groq 模型名"
              value={llm.modelGroq}
              onChange={(e) => patchLlm({ modelGroq: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <a className="text-indigo-600 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Gemini 密钥（AI Studio）
            </a>
            {' · '}
            <a className="text-indigo-600 underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              Groq 密钥
            </a>
          </p>
        </details>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">可选词书</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {books.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={openingId === b.id}
                onClick={() => onPickBook(b)}
                className="group flex flex-col items-start rounded-3xl border border-white/70 bg-white/90 p-5 text-left shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
              >
                <span className="text-xs font-medium uppercase text-indigo-500">
                  {b.source === 'builtin' ? '内置' : '已导入'}
                </span>
                <span className="mt-2 text-lg font-bold text-slate-900">{b.title}</span>
                <span className="mt-3 text-xs text-slate-500">
                  {openingId === b.id ? '正在载入…' : '点击选择并开始配置今日复习量'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
          支持行格式：<span className="whitespace-nowrap">词条：义1；义2 | 义3</span>（竖线在冒号后表示义项大组）、
          <span className="whitespace-nowrap">单词 | 词性.释义</span>、
          <span className="whitespace-nowrap">单词,释义1；释义2</span>
          。章节标题行 <span className="whitespace-nowrap">【…】</span> 与 <span className="whitespace-nowrap">#</span> 注释会跳过。
        </p>
      </div>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h3 className="text-lg font-bold text-slate-900">今日复习多少个词？</h3>
            <p className="mt-1 text-sm text-slate-600">从当前到期的词条中按优先级抽取（10–100，步长 5）。</p>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={dailyCount}
                  onChange={(e) => setDailyCount(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={dailyCount}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (Number.isNaN(v)) return
                    const c = Math.min(100, Math.max(10, Math.round(v / 5) * 5))
                    setDailyCount(c)
                  }}
                  className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm font-semibold"
                />
              </div>
              <p className="text-center text-2xl font-bold text-indigo-700">{dailyCount}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false)
                  clearActiveBook()
                }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => startFromPicker()}
                disabled={preparingSession}
                className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
              >
                {preparingSession ? '正在生成例句…' : '开始学习'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
