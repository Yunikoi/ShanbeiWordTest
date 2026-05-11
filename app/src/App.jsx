import { useCallback, useRef, useState } from 'react'
import { useWordStudy } from './useWordStudy.js'

const DICT_API =
  'https://api.dictionaryapi.dev/api/v2/entries/en'

const SLIDE_MS = 320
const REVEAL_MS = 1000

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

async function fetchWordMeaning(token) {
  const q = encodeURIComponent(token.toLowerCase())
  const res = await fetch(`${DICT_API}/${q}`)
  if (res.status === 404) {
    return { token, defs: [], error: '未找到该词' }
  }
  if (!res.ok) {
    return { token, defs: [], error: `请求失败 (${res.status})` }
  }
  const data = await res.json()
  const defs = []
  for (const entry of data) {
    for (const m of entry.meanings ?? []) {
      for (const d of m.definitions ?? []) {
        if (d.definition) defs.push(d.definition)
      }
    }
  }
  return { token, defs: defs.slice(0, 5), error: defs.length ? null : '无英文释义' }
}

export default function App() {
  const {
    words,
    loadError,
    isCustomVocab,
    current,
    showTranslation,
    setShowTranslation,
    todayPercent,
    commitFeedback,
    entryFor,
    sessionComplete,
    importFromText,
    restoreBuiltinVocab,
  } = useWordStudy()

  const fileInputRef = useRef(null)
  const [vocabTip, setVocabTip] = useState(null)

  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupRows, setLookupRows] = useState([])

  const [slideStage, setSlideStage] = useState('idle')
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [cardKey, setCardKey] = useState(0)

  const isPhrase = current && /\s/.test(current.word)

  const openLookup = useCallback(async () => {
    if (!current || !isPhrase || feedbackBusy) return
    const tokens = current.word.split(/\s+/).filter(Boolean)
    setLookupOpen(true)
    setLookupLoading(true)
    setLookupRows([])
    try {
      const rows = await Promise.all(tokens.map((t) => fetchWordMeaning(t)))
      setLookupRows(rows)
    } finally {
      setLookupLoading(false)
    }
  }, [current, isPhrase, feedbackBusy])

  const onVocabFile = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result ?? '')
        const r = importFromText(text)
        if (r.ok) {
          let msg = `已导入 ${r.count} 条`
          if (r.skippedLines) msg += `（跳过 ${r.skippedLines} 行无法解析）`
          setVocabTip(msg)
        } else {
          setVocabTip(r.message)
        }
        e.target.value = ''
        setCardKey((k) => k + 1)
        setSlideStage('idle')
      }
      reader.onerror = () => {
        setVocabTip('读取文件失败，请重试')
        e.target.value = ''
      }
      reader.readAsText(file, 'UTF-8')
    },
    [importFromText],
  )

  /**
   * 任意反馈后都会 nextWord：先（按需）亮释义 1s → 向左离场 → commit 队列 → 新卡从右侧入场。
   */
  const handleFeedback = useCallback(
    async (kind) => {
      if (feedbackBusy || !current) return
      setFeedbackBusy(true)
      try {
        if (kind === 'review' || kind === 'hard') {
          setShowTranslation(true)
          await sleep(REVEAL_MS)
        }

        setSlideStage('exit')
        await sleep(SLIDE_MS)

        const { remaining } = commitFeedback(kind)
        setCardKey((k) => k + 1)
        setShowTranslation(false)

        if (remaining > 0) {
          setSlideStage('enter')
          await sleep(SLIDE_MS)
        }
        setSlideStage('idle')
      } finally {
        setFeedbackBusy(false)
      }
    },
    [feedbackBusy, current, commitFeedback, setShowTranslation],
  )

  const cardAnimClass =
    slideStage === 'exit' ? 'card-slide-exit' : slideStage === 'enter' ? 'card-slide-enter' : ''

  if (loadError && !words.length) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-6">
        <p className="mb-4 text-center text-red-600">无法加载内置词库：{loadError}</p>
        <p className="mb-4 text-center text-sm text-gray-600">
          你仍可直接导入自己的 .txt（每行：单词：释义）。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={onVocabFile}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mx-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          导入词库 (.txt)
        </button>
        {vocabTip ? (
          <p className="mt-4 text-center text-sm text-amber-800">{vocabTip}</p>
        ) : null}
      </div>
    )
  }

  if (!words.length) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        正在加载词库…
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={onVocabFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={feedbackBusy}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            导入词库 (.txt)
          </button>
          {isCustomVocab ? (
            <button
              type="button"
              disabled={feedbackBusy}
              onClick={() => {
                restoreBuiltinVocab().then(() =>
                  setVocabTip('已切换为内置词库（public/data.json）'),
                )
                setCardKey((k) => k + 1)
                setSlideStage('idle')
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              使用内置词库
            </button>
          ) : null}
          <span className="text-xs text-gray-500">
            每行：单词：释义（支持 ： 或 :）
          </span>
        </div>
        {vocabTip ? (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {vocabTip}
          </p>
        ) : null}
        <div className="mb-1 flex justify-between text-sm text-gray-600">
          <span>今日已掌握</span>
          <span>{todayPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${todayPercent}%` }}
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        {sessionComplete ? (
          <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-lg">
            <p className="text-lg font-medium text-gray-800">待复习队列已清空</p>
            <p className="mt-2 text-sm text-gray-500">
              本轮所有词均已「认识」或词库中已全部标记为认识。可导入新词库或清除 localStorage
              学习进度后重新开始。
            </p>
          </div>
        ) : current ? (
          <div className="relative w-full overflow-hidden">
            <article
              key={cardKey}
              className={`w-full rounded-2xl bg-white p-8 shadow-lg will-change-transform ${cardAnimClass}`}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                  {current.word}
                </h1>
                <button
                  type="button"
                  onClick={() => speakEnglish(current.word)}
                  disabled={feedbackBusy}
                  className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
                  title="朗读"
                  aria-label="朗读当前词条"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-7 w-7"
                  >
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 3.5 3.5 0 0 0 0-4.95.75.75 0 1 1 1.06-1.061 5 5 0 0 1 0 7.07.75.75 0 0 1-1.06 0 6.5 6.5 0 0 1 0-9.192.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>

              <p className="mb-4 text-xs text-gray-400">
                状态：{entryFor(current.word).status} · eFactor：{' '}
                {(entryFor(current.word).efactor ?? 2.5).toFixed(2)}
              </p>

              <div className="mb-6 min-h-[4rem] rounded-lg bg-gray-50 p-4">
                {showTranslation ? (
                  <p className="text-lg text-gray-800">{current.translation}</p>
                ) : (
                  <p className="text-gray-400">释义已隐藏</p>
                )}
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowTranslation(true)}
                  disabled={feedbackBusy}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  查看释义
                </button>
                {isPhrase ? (
                  <button
                    type="button"
                    onClick={openLookup}
                    disabled={feedbackBusy}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    查单词
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => handleFeedback('easy')}
                  disabled={feedbackBusy}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                >
                  认识
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('review')}
                  disabled={feedbackBusy}
                  className="flex-1 rounded-xl bg-amber-400 py-3 text-sm font-medium text-gray-900 shadow-sm hover:bg-amber-500 disabled:opacity-50"
                >
                  需复习
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('hard')}
                  disabled={feedbackBusy}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
                >
                  不认识
                </button>
              </div>
            </article>
          </div>
        ) : null}
      </main>

      {lookupOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">短语拆词</h2>
              <button
                type="button"
                onClick={() => setLookupOpen(false)}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                关闭
              </button>
            </div>
            {lookupLoading ? (
              <p className="text-gray-500">正在查询…</p>
            ) : (
              <ul className="space-y-4">
                {lookupRows.map((row) => (
                  <li key={row.token} className="border-b border-gray-100 pb-4 last:border-0">
                    <p className="font-medium text-gray-900">{row.token}</p>
                    {row.error ? (
                      <p className="mt-1 text-sm text-amber-700">{row.error}</p>
                    ) : (
                      <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                        {row.defs.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-gray-400">
              数据来自免费词典接口 dictionaryapi.dev，仅作参考。
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
