import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLlmSettings, setLlmSettings, getRootLlmSettings, setRootLlmSettings } from './llmSettings.js'
import { useBookshelfStudy } from './useBookshelfStudy.js'
import { StudyHistoryModal } from './StudyHistoryModal.jsx'
import { RootAnalysisPanel } from './RootAnalysisPanel.jsx'
import { useResolvedRootAnalysis } from './useResolvedRootAnalysis.js'
import { SessionCheckpoint } from './SessionCheckpoint.jsx'
import { WordDetailView } from './WordDetailView.jsx'
import { getCachedRootAnalysisLlm } from './llmRootAnalysis.js'
import { countCachedRootAnalysis, exportBookRootMap, importBookRootMap } from './rootAnalysisCache.js'
import {
  isRootFileStorageSupported,
  bindAndWriteRootFile,
  loadRootsFromBoundFile,
  hasBoundRootFile,
  pickRootLoadFile,
} from './rootFileStorage.js'
import { hasJapaneseText } from './japaneseSentence.js'
import {
  exportUserDataBackup,
  downloadUserDataBackup,
  importUserDataBackup,
  summarizeLocalData,
} from './dataBackup.js'
import { useCloudSync } from './useCloudSync.js'
import { generateSyncCode } from './cloudSync.js'

function speakWord(text, reading) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance()
  const ja = hasJapaneseText(text)
  u.lang = ja ? 'ja-JP' : 'en-US'
  u.text = ja && reading?.trim() ? reading.trim() : text
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

function importFormatLabel(format) {
  if (format === 'jlpt') return 'JLPT 日语'
  if (format === 'markdown') return 'Obsidian/雅思'
  return 'txt'
}

const CHECKPOINT_EVERY = 6

function resetStudyUiState(setters) {
  setters.setRevealed(false)
  setters.setStudyPhase('word')
  setters.setPreliminary(null)
  setters.setShowExamples(false)
  setters.setShowRoots(false)
  setters.setCheckpointOpen(false)
  setters.setCheckpointWords([])
  setters.setPendingDone(false)
  setters.setSessionCompletedCount(0)
}

export default function App() {
  const {
    shelfLoading,
    shelfError,
    books,
    bookLoadError,
    refreshImports,
    view,
    activeTitle,
    entries,
    bookDashboard,
    loadBook,
    beginSession,
    beginReviewSession,
    preparingSession,
    prepareStatus,
    rootEnrich,
    refreshBookRootAnalysis,
    bookRootAnalysisEnabled,
    setBookRootAnalysisEnabled,
    triggerBookRootEnrichment,
    backToShelf,
    backToBook,
    sessionPosition,
    sessionPlanTotal,
    sessionMode,
    sessionQueueLength,
    sessionExtra,
    sessionEmpty,
    currentCard,
    sessionQueue,
    commitGrade,
    importFromText,
    clearActiveBook,
    activeBookSource,
    activeBookId,
    deleteImportedBook,
    studyHistory,
  } = useBookshelfStudy()

  const fileRef = useRef(null)
  const dirRef = useRef(null)
  const backupRef = useRef(null)
  const reimportRef = useRef(null)

  useEffect(() => {
    const el = dirRef.current
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
  }, [])

  const [importTip, setImportTip] = useState(null)
  const [backupTip, setBackupTip] = useState(null)
  const [openingId, setOpeningId] = useState(null)
  const [syncKeyInput, setSyncKeyInput] = useState('')
  const localDataSummary = useMemo(() => summarizeLocalData(), [books, backupTip])
  const cloud = useCloudSync()

  useEffect(() => {
    if (cloud.settings.syncKey && !syncKeyInput) {
      setSyncKeyInput(cloud.settings.syncKey)
    }
  }, [cloud.settings.syncKey, syncKeyInput])

  const [dailyCount, setDailyCount] = useState(30)
  const [wordListOpen, setWordListOpen] = useState(false)
  const [browseWord, setBrowseWord] = useState(/** @type {string | null} */ (null))
  const [historyOpen, setHistoryOpen] = useState(false)

  const [revealed, setRevealed] = useState(false)
  /** 单词页 → 释义页 */
  const [studyPhase, setStudyPhase] = useState('word')
  /** 首轮：认识 / 不熟悉 / 不认识（仅决定释义页底部按钮，此时未写入 SRS） */
  const [preliminary, setPreliminary] = useState(null)
  /** 释义页是否展开例句 */
  const [showExamples, setShowExamples] = useState(false)
  const [showRoots, setShowRoots] = useState(false)
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [cardKey, setCardKey] = useState(0)
  const [doneOpen, setDoneOpen] = useState(false)
  const [checkpointOpen, setCheckpointOpen] = useState(false)
  const [checkpointWords, setCheckpointWords] = useState(/** @type {typeof currentCard[]} */ ([]))
  const [pendingDone, setPendingDone] = useState(false)
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0)
  const checkpointBufferRef = useRef(/** @type {typeof currentCard[]} */ ([]))

  const [rootFileBound, setRootFileBound] = useState(false)
  const [rootFileTip, setRootFileTip] = useState('')
  const [rootStoreTick, setRootStoreTick] = useState(0)
  const [llm, setLlm] = useState(() => getLlmSettings())
  const [rootLlm, setRootLlm] = useState(() => getRootLlmSettings())

  const browseEntry = useMemo(
    () => (browseWord ? entries.find((e) => e.word === browseWord) ?? null : null),
    [browseWord, entries],
  )

  const rootCachedCount = useMemo(() => {
    if (!activeBookId) return 0
    return countCachedRootAnalysis(
      activeBookId,
      entries.map((e) => e.word),
    )
  }, [activeBookId, entries, rootEnrich.done, rootStoreTick])

  useEffect(() => {
    if (!activeBookId) {
      setRootFileBound(false)
      return
    }
    hasBoundRootFile(activeBookId).then(setRootFileBound)
  }, [activeBookId, rootStoreTick, rootEnrich.done])

  useEffect(() => {
    if (view !== 'study' || studyPhase !== 'word' || !currentCard?.word || doneOpen || sessionEmpty || checkpointOpen)
      return
    const word = currentCard.word
    const reading = currentCard.ipa
    const timer = window.setTimeout(() => speakWord(word, reading), 60)
    return () => window.clearTimeout(timer)
  }, [view, studyPhase, cardKey, currentCard?.word, currentCard?.ipa, doneOpen, sessionEmpty, checkpointOpen])

  const studyEntry = useMemo(() => {
    if (!currentCard?.word) return null
    return entries.find((e) => e.word === currentCard.word) ?? currentCard
  }, [currentCard, entries])

  const studyPool = entries.length > 0 ? entries : sessionQueue

  const { analysis: enrichedRootAnalysis, loading: rootAnalysisLoading } = useResolvedRootAnalysis(
    studyEntry,
    activeBookId,
    studyPool,
    { fetchOnDemand: showRoots },
  )

  const onPickBook = useCallback(
    async (book) => {
      setImportTip(null)
      setOpeningId(book.id)
      const r = await loadBook(book)
      setOpeningId(null)
      if (!r.ok) return
      setDailyCount(30)
      setWordListOpen(false)
    },
    [loadBook],
  )

  const onDeleteBook = useCallback(
    (book) => {
      if (book.source !== 'import') return
      const ok = window.confirm(
        `确定删除词书「${book.title}」？\n\n词条与学习进度将从本机浏览器中清除，且无法恢复。`,
      )
      if (!ok) return
      const r = deleteImportedBook(book.id)
      if (r.ok) {
        setImportTip(`已删除「${r.title}」`)
      } else if (r.message) {
        setImportTip(r.message)
      }
    },
    [deleteImportedBook],
  )

  const patchLlm = useCallback((p) => {
    const next = { ...llm, ...p }
    setLlm(next)
    setLlmSettings(next)
  }, [llm])

  const patchRootLlm = useCallback((p) => {
    const next = { ...rootLlm, ...p }
    setRootLlm(next)
    setRootLlmSettings(next)
  }, [rootLlm])

  const onExportBackup = useCallback(() => {
    setBackupTip(null)
    try {
      const { filename, json, keyCount } = exportUserDataBackup()
      downloadUserDataBackup(json, filename)
      setBackupTip(`已导出 ${keyCount} 项数据到 ${filename}。可在 Vercel / 其他浏览器「恢复备份」导入。`)
    } catch (e) {
      setBackupTip(e?.message || String(e))
    }
  }, [])

  const onImportBackupFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setBackupTip(null)
      try {
        const text = await readFileAsText(file)
        const replace = window.confirm(
          '恢复备份？\n\n确定 = 用备份完全覆盖当前浏览器里的学习数据\n取消 = 仅合并（同键名以备份为准）',
        )
        const { keyCount } = importUserDataBackup(text, { replace })
        refreshImports()
        setBackupTip(`已恢复 ${keyCount} 项数据，页面即将刷新…`)
        window.setTimeout(() => window.location.reload(), 800)
      } catch (err) {
        setBackupTip(err?.message || String(err))
      }
    },
    [refreshImports],
  )

  const startFromPicker = useCallback(async () => {
    setDoneOpen(false)
    checkpointBufferRef.current = []
    resetStudyUiState({
      setRevealed,
      setStudyPhase,
      setPreliminary,
      setShowExamples,
      setShowRoots,
      setCheckpointOpen,
      setCheckpointWords,
      setPendingDone,
      setSessionCompletedCount,
    })
    try {
      await beginSession(dailyCount)
      setCardKey((k) => k + 1)
    } catch {
      setImportTip('开始学习失败，请检查网络或大模型 API 设置')
    }
  }, [beginSession, dailyCount])

  const startHistoryReview = useCallback(
    async (words, opts) => {
      setDoneOpen(false)
      checkpointBufferRef.current = []
      resetStudyUiState({
        setRevealed,
        setStudyPhase,
        setPreliminary,
        setShowExamples,
        setShowRoots,
        setCheckpointOpen,
        setCheckpointWords,
        setPendingDone,
        setSessionCompletedCount,
      })
      try {
        const r = await beginReviewSession(words, opts)
        if (!r.ok) {
          setImportTip(r.message || '无法开始复习')
          return
        }
        setHistoryOpen(false)
        setCardKey((k) => k + 1)
        if (r.skipped && r.skipped > 0) {
          setImportTip(`已开始复习 ${r.count} 词（${r.skipped} 词在词书中未找到已跳过）`)
        }
      } catch {
        setImportTip('开始复习失败，请检查网络或大模型 API 设置')
      }
    },
    [beginReviewSession],
  )

  /** 首轮点认识/不熟悉/不认识：进入释义页，不写入 SRS */
  const goToMeaning = useCallback(
    (firstKind) => {
      if (feedbackBusy || !currentCard) return
      setPreliminary(firstKind)
      setShowExamples(false)
      setShowRoots(false)
      setRevealed(true)
      setStudyPhase('meaning')
    },
    [feedbackBusy, currentCard],
  )

  const continueFromCheckpoint = useCallback(() => {
    setCheckpointOpen(false)
    setCheckpointWords([])
    checkpointBufferRef.current = []
    setStudyPhase('word')
    setPreliminary(null)
    setShowExamples(false)
    setShowRoots(false)
    setRevealed(false)
    setCardKey((k) => k + 1)
    if (pendingDone) {
      setPendingDone(false)
      setRevealed(true)
      setDoneOpen(true)
    }
  }, [pendingDone])

  /** 释义页最终确认：写入 SRS 并无动画切下一词 */
  const finalizeGrade = useCallback(
    async (kind) => {
      if (feedbackBusy || !currentCard) return
      setFeedbackBusy(true)
      try {
        const graded = currentCard
        const { done } = commitGrade(kind)
        const nextCompleted = sessionCompletedCount + 1
        setSessionCompletedCount(nextCompleted)

        checkpointBufferRef.current = [...checkpointBufferRef.current, graded].slice(-CHECKPOINT_EVERY)
        const shouldCheckpoint =
          nextCompleted % CHECKPOINT_EVERY === 0 && checkpointBufferRef.current.length > 0

        if (shouldCheckpoint) {
          setCheckpointWords([...checkpointBufferRef.current])
          setCheckpointOpen(true)
          checkpointBufferRef.current = []
          setStudyPhase('word')
          setPreliminary(null)
          setShowExamples(false)
          setShowRoots(false)
          setRevealed(false)
          if (done) setPendingDone(true)
        } else if (done) {
          setRevealed(true)
          setDoneOpen(true)
          setCardKey((k) => k + 1)
        } else {
          setCardKey((k) => k + 1)
          setStudyPhase('word')
          setPreliminary(null)
          setShowExamples(false)
          setShowRoots(false)
          setRevealed(false)
        }
      } finally {
        setFeedbackBusy(false)
      }
    },
    [feedbackBusy, currentCard, commitGrade, sessionCompletedCount],
  )

  const onVocabFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try {
        const text = await readFileAsText(file)
        const base = file.name.replace(/\.(txt|md)$/i, '')
        const r = importFromText(text, base, { sourceFile: file.name })
        if (r.ok) {
          const fmt = importFormatLabel(r.format)
          const verb = r.updated ? '已更新' : '已导入'
          let msg = `${verb}「${base}」（${fmt}）共 ${r.count} 词`
          if (r.updated) msg += '，学习进度已保留'
          if (r.skippedLines) msg += `（未识别 ${r.skippedLines} 行）`
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

  const onReimportFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try {
        const text = await readFileAsText(file)
        const base = file.name.replace(/\.(txt|md)$/i, '')
        const r = importFromText(text, base, {
          sourceFile: file.name,
          updateBookId: activeBookId ?? undefined,
          replaceExisting: true,
        })
        if (r.ok) {
          let msg = `词表已更新，共 ${r.count} 词`
          if (r.skippedLines) msg += `（未识别 ${r.skippedLines} 行）`
          setImportTip(msg)
        } else {
          setImportTip(r.message)
        }
      } catch {
        setImportTip('读取文件失败，请重试')
      }
    },
    [importFromText, activeBookId],
  )

  const onVocabDir = useCallback(
    async (e) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      e.target.value = ''
      const vocabFiles = files.filter((f) => /\.(txt|md)$/i.test(f.name))
      if (!vocabFiles.length) {
        setImportTip('文件夹中未找到 .txt / .md 文件')
        return
      }
      try {
        const parts = await Promise.all(vocabFiles.map((f) => readFileAsText(f)))
        const merged = parts.join('\n')
        const title = `文件夹导入（${vocabFiles.length} 个文件）`
        const r = importFromText(merged, title)
        if (r.ok) {
          setImportTip(`已合并导入 ${vocabFiles.length} 个词书文件，共 ${r.count} 词`)
        } else {
          setImportTip(r.message)
        }
      } catch {
        setImportTip('读取文件夹失败，请重试')
      }
    },
    [importFromText],
  )

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

  if (view === 'book') {
    const dash = bookDashboard
    const pct = dash ? dash.learnedPercent.toFixed(1) : '0.0'
    const studied = dash?.studiedWords ?? 0
    const total = dash?.totalWords ?? entries.length
    const barPct = total ? Math.min(100, (studied / total) * 100) : 0

    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6">
        <div className="mx-auto w-full max-w-lg">
          {bookLoadError ? (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{bookLoadError}</p>
          ) : null}

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => backToShelf()}
                className="flex min-w-0 flex-1 items-center gap-1 text-left"
              >
                <span className="truncate text-lg font-bold text-slate-900">{activeTitle || '词书'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-slate-400">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                  </svg>
                  测试历史
                  {studyHistory.length > 0 ? (
                    <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">
                      {studyHistory.length}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setWordListOpen(true)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                  词表
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between text-sm text-slate-600">
              <span>
                已学 <span className="font-semibold text-slate-800">{pct}%</span>
              </span>
              <span className="font-medium text-slate-800">
                {studied}/{total} 词
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </section>

          {rootLlm.enabled && rootLlm.apiKey.trim() ? (
            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-violet-900">
                <input
                  type="checkbox"
                  checked={bookRootAnalysisEnabled}
                  onChange={(e) => setBookRootAnalysisEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                本书自动分析词根（DeepSeek）
              </label>

              {!bookRootAnalysisEnabled ? (
                <>
                  <p className="mt-2 text-xs text-violet-700">
                    已关闭：打开本书不会调用 API；已保存的词根仍可查看。
                  </p>
                  <button
                    type="button"
                    onClick={() => triggerBookRootEnrichment()}
                    disabled={rootEnrich.running}
                    className="mt-2 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                  >
                    {rootEnrich.running ? '分析中…' : '手动分析缺失词'}
                  </button>
                  <p className="mt-2 text-xs text-violet-600">
                    已保存 <span className="font-semibold">{rootCachedCount}</span> / {total} 词
                  </p>
                </>
              ) : rootEnrich.running ? (
                <>
                  <p className="text-sm font-medium text-violet-900">
                    DeepSeek 补全词根 {rootEnrich.done}/{rootEnrich.total}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-300"
                      style={{
                        width: `${rootEnrich.total ? (rootEnrich.done / rootEnrich.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-violet-700">
                    只分析尚未保存的词；已保存的不会重复调用 API
                  </p>
                  {isRootFileStorageSupported() ? (
                    <p className="mt-1 text-xs text-violet-600">
                      {rootFileBound
                        ? '已绑定本机 .json 文件，每分析一个词会自动写入磁盘'
                        : '建议先点下方「绑定本机词根文件」，分析结果会写入你选的 JSON 文件'}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-violet-600">
                      手机浏览器无法写本机文件；请用电脑 Chrome/Edge 绑定 JSON 保存
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-violet-900">
                    词根已保存 <span className="font-semibold">{rootCachedCount}</span> / {total} 词
                    {rootCachedCount < total ? ' · 再次打开只补全缺失的词' : ' · 整本词表已分析完毕'}
                  </p>
                  {isRootFileStorageSupported() ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activeBookId) return
                          try {
                            await bindAndWriteRootFile(
                              activeBookId,
                              exportBookRootMap(activeBookId),
                              activeTitle,
                            )
                            setRootFileBound(true)
                            setRootFileTip('已绑定本机 JSON，之后每分析一个词会自动写入该文件')
                          } catch (e) {
                            setRootFileTip(e?.message || String(e))
                          }
                        }}
                        className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100"
                      >
                        {rootFileBound ? '更换词根保存文件' : '绑定本机词根文件 (.json)'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activeBookId) return
                          try {
                            await pickRootLoadFile(activeBookId)
                            const words = await loadRootsFromBoundFile(activeBookId)
                            if (words) {
                              const n = importBookRootMap(activeBookId, words)
                              setRootStoreTick((t) => t + 1)
                              setRootFileBound(true)
                              setRootFileTip(`已从本机 JSON 恢复 ${n} 个词根`)
                            }
                          } catch (e) {
                            setRootFileTip(e?.message || String(e))
                          }
                        }}
                        className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100"
                      >
                        从本机文件加载词根
                      </button>
                    </div>
                  ) : null}
                  {rootFileTip ? (
                    <p className="mt-2 text-xs text-violet-800">{rootFileTip}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => refreshBookRootAnalysis()}
                    disabled={rootEnrich.running}
                    className="mt-2 text-xs font-medium text-violet-700 underline hover:text-violet-900 disabled:opacity-50"
                  >
                    重新分析整本词根（含同主题词汇）
                  </button>
                </>
              )}
            </div>
          ) : null}

          <details className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">今日学习量</summary>
            <p className="mt-2 text-xs text-slate-500">从今日到期词中抽取（10–100，步长 5）。</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={dailyCount}
                onChange={(e) => setDailyCount(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <span className="w-10 text-center text-sm font-bold text-emerald-700">{dailyCount}</span>
            </div>
          </details>

          <button
            type="button"
            onClick={() => startFromPicker()}
            disabled={preparingSession || !total}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-4 text-lg font-semibold text-white shadow-lg hover:bg-emerald-600 disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </span>
            {preparingSession ? (prepareStatus || '准备中…') : '开始学习'}
          </button>

          {dash && dash.dueTodayTotal === 0 ? (
            <p className="mt-4 text-center text-sm text-slate-500">今日暂无到期复习，改日再来或清空进度后重试。</p>
          ) : null}

          {activeBookSource === 'import' ? (
            <>
              <input
                ref={reimportRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={onReimportFile}
              />
              <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                词书保存在浏览器本机，不会自动读取磁盘上的文件。修改了 Obsidian / txt 后，请点下方按钮重新选择同一文件以更新词表。
              </p>
              <button
                type="button"
                onClick={() => reimportRef.current?.click()}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                从本地文件更新词表
              </button>
              {importTip ? (
                <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-900">
                  {importTip}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const book = books.find((b) => b.id === activeBookId)
                  if (book) onDeleteBook(book)
                }}
                className="mt-3 w-full rounded-2xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50"
              >
                删除这本词书
              </button>
            </>
          ) : null}
        </div>

        {wordListOpen ? (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:justify-center sm:p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">词表 · {total} 词</h3>
                  <p className="mt-0.5 text-xs text-slate-500">悬停查看释义 · 点击进入详情</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWordListOpen(false)}
                  className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
                >
                  关闭
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto px-5 py-3">
                {entries.map((e) => {
                  const hasRoot =
                    e.rootAnalysis?.source === 'deepseek' ||
                    e.rootAnalysis?.source === 'quword' ||
                    (activeBookId ? !!getCachedRootAnalysisLlm(activeBookId, e.word) : false)
                  return (
                    <li key={e.word} className="border-b border-slate-50 py-1 last:border-0">
                      <button
                        type="button"
                        onClick={() => {
                          setBrowseWord(e.word)
                          setWordListOpen(false)
                        }}
                        className="group w-full rounded-xl px-2 py-2.5 text-left outline-none transition hover:bg-violet-50/80 focus:bg-violet-50/80"
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-slate-900">{e.word}</span>
                          {hasRoot ? (
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"
                              title="已有 DeepSeek 词根"
                            />
                          ) : null}
                        </div>
                        {e.senses.length ? (
                          <div
                            className="mt-1 hidden max-h-28 overflow-y-auto group-hover:block group-focus:block"
                            role="region"
                            aria-label={`${e.word} 释义`}
                          >
                            <ul className="space-y-0.5">
                              {e.senses.map((s, si) => (
                                <li key={si} className="text-sm leading-snug text-slate-600">
                                  {s.pos ? (
                                    <span className="mr-1 text-xs font-medium text-indigo-600">{s.pos}.</span>
                                  ) : null}
                                  {s.zh}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        ) : null}

        {browseEntry ? (
          <WordDetailView
            entry={browseEntry}
            pool={entries}
            bookId={activeBookId}
            rootEnrichRunning={rootEnrich.running}
            onClose={() => setBrowseWord(null)}
          />
        ) : null}

        <StudyHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          sessions={studyHistory}
          entries={entries}
          onReviewUnknown={startHistoryReview}
          reviewStarting={preparingSession}
        />
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
                checkpointBufferRef.current = []
                resetStudyUiState({
                  setRevealed,
                  setStudyPhase,
                  setPreliminary,
                  setShowExamples,
                  setShowRoots,
                  setCheckpointOpen,
                  setCheckpointWords,
                  setPendingDone,
                  setSessionCompletedCount,
                })
                backToBook()
              }}
              className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white"
            >
              ← 书架
            </button>
            <div className="text-right text-xs text-slate-500">
              <div className="font-medium text-slate-800">{activeTitle}</div>
              {sessionMode === 'history-review' ? (
                <div className="text-indigo-600">复习历史不会词</div>
              ) : null}
              {!sessionEmpty && sessionQueueLength ? (
                <div>
                  <div>
                    进度 {sessionPosition}/{sessionQueueLength}
                  </div>
                  {sessionExtra > 0 ? (
                    <div className="text-[10px] text-amber-700">
                      今日目标 {sessionPlanTotal} 词 · 答错加练 {sessionExtra}
                    </div>
                  ) : null}
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
          ) : checkpointOpen && checkpointWords.length ? (
            <SessionCheckpoint
              words={checkpointWords}
              completedCount={sessionCompletedCount}
              sessionTotal={sessionQueueLength}
              onContinue={continueFromCheckpoint}
            />
          ) : currentCard && !doneOpen ? (
            <main className="flex flex-1 flex-col items-center justify-center pb-8">
              <div className="relative w-full overflow-hidden">
                <article
                  key={cardKey}
                  className="w-full rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8"
                >
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        {currentCard.word}
                      </h1>
                      {currentCard.ipa ? (
                        <p className="mt-2 text-lg tracking-wide text-slate-500 sm:text-xl">
                          {hasJapaneseText(currentCard.word) ? (
                            <span className="font-normal text-slate-600">{currentCard.ipa}</span>
                          ) : (
                            <span className="font-mono">{currentCard.ipa}</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakWord(currentCard.word, currentCard.ipa)}
                      disabled={feedbackBusy}
                      className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      aria-label="朗读"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 3.5 3.5 0 0 0 0-4.95.75.75 0 1 1 1.06-1.061 5 5 0 0 1 0 7.07.75.75 0 0 1-1.06 0 6.5 6.5 0 0 1 0-9.192.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    </button>
                  </div>

                  {studyPhase === 'meaning' ? (
                    <div className="mb-6 min-h-[4.5rem] rounded-2xl bg-slate-50/90 p-4">
                      <ul className="space-y-4">
                        {currentCard.senses.map((s, i) => (
                          <li key={i} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                            <p className="text-base font-medium text-slate-900">
                              {s.pos ? <span className="mr-2 text-indigo-600">{s.pos}.</span> : null}
                              {s.zh}
                            </p>
                            {showExamples ? (
                              <>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.example}</p>
                                {s.exampleZh ? (
                                  <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-relaxed text-slate-600">
                                    {s.exampleZh}
                                  </p>
                                ) : null}
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowExamples((v) => !v)}
                          disabled={feedbackBusy || doneOpen}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          {showExamples ? '隐藏例句' : '查看例句'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRoots((v) => !v)}
                          disabled={feedbackBusy || doneOpen}
                          className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm hover:bg-violet-100 disabled:opacity-50"
                        >
                          {showRoots ? '隐藏词根' : '查看词根'}
                        </button>
                      </div>
                      {showRoots ? (
                        enrichedRootAnalysis ? (
                          <RootAnalysisPanel
                            analysis={enrichedRootAnalysis}
                            word={currentCard?.word}
                            loading={rootAnalysisLoading}
                          />
                        ) : (
                          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-center text-xs text-amber-900">
                            词根数据未就绪，请返回书架重新打开词书，或刷新页面后再试。
                          </p>
                        )
                      ) : null}
                    </div>
                  ) : null}

                  {studyPhase === 'word' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => goToMeaning('known')}
                        disabled={feedbackBusy || doneOpen}
                        className="rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
                      >
                        认识
                      </button>
                      <button
                        type="button"
                        onClick={() => goToMeaning('fuzzy')}
                        disabled={feedbackBusy || doneOpen}
                        className="rounded-2xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-amber-500 disabled:opacity-50"
                      >
                        不熟悉
                      </button>
                      <button
                        type="button"
                        onClick={() => goToMeaning('forget')}
                        disabled={feedbackBusy || doneOpen}
                        className="rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
                      >
                        不认识
                      </button>
                    </div>
                  ) : preliminary === 'known' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => finalizeGrade('known')}
                        disabled={feedbackBusy || doneOpen}
                        className="rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                      >
                        真的认识
                      </button>
                      <button
                        type="button"
                        onClick={() => finalizeGrade('forget')}
                        disabled={feedbackBusy || doneOpen}
                        className="rounded-2xl border-2 border-rose-400 bg-white py-3 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50"
                      >
                        原来不认识
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => finalizeGrade(preliminary)}
                        disabled={feedbackBusy || doneOpen || !preliminary}
                        className="w-full max-w-xs rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 sm:max-w-sm"
                      >
                        下一个
                      </button>
                    </div>
                  )}
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
                本轮共 {sessionQueueLength} 张（今日目标 {sessionPlanTotal} 词
                {sessionExtra > 0 ? `，含答错加练 ${sessionExtra}` : ''}）。已掌握词按 1→2→4→7→15→30→60
                天间隔再出现；今天答对的不会在今天重复推送。
              </p>
              <button
                type="button"
                onClick={() => {
                  setDoneOpen(false)
                  backToBook()
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
          <p className="mt-2 text-sm text-slate-600">
            启用云同步后，手机与电脑自动共用进度（同一同步码）
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 text-left shadow-sm">
          <h2 className="text-sm font-semibold text-sky-950">云同步 · 手机 / 电脑自动同步</h2>
          {!cloud.configured ? (
            <p className="mt-2 text-xs leading-relaxed text-sky-900/80">
              需在 Vercel（及本地 <code className="rounded bg-white px-1">app/.env.local</code>）配置{' '}
              <code className="rounded bg-white px-1">VITE_SUPABASE_URL</code> 与{' '}
              <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code>。见 README「云同步一次性配置」。
            </p>
          ) : cloud.settings.enabled ? (
            <>
              <p className="mt-2 text-xs text-sky-900/80">
                同步码：<span className="font-mono font-bold">{cloud.settings.syncKey}</span>
                {cloud.syncing ? ' · 同步中…' : ' · 约每 10 秒自动上传/拉取'}
              </p>
              {cloud.status ? (
                <p className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs text-sky-950">{cloud.status}</p>
              ) : null}
              <button
                type="button"
                onClick={() => cloud.disableSync()}
                className="mt-3 rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50"
              >
                关闭云同步
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed text-sky-900/80">
                在电脑和手机输入<strong>同一个同步码</strong>并启用，词书、进度、词根缓存会自动同步，无需手动导出文件。
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={syncKeyInput}
                  onChange={(e) => setSyncKeyInput(e.target.value)}
                  placeholder="自定义同步码（至少 4 位）"
                  className="min-w-[12rem] flex-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setSyncKeyInput(generateSyncCode())}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800"
                >
                  随机生成
                </button>
                <button
                  type="button"
                  disabled={cloud.syncing}
                  onClick={() => {
                    cloud.enableSync(syncKeyInput).catch((e) => setBackupTip(e?.message || String(e)))
                  }}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  启用自动同步
                </button>
              </div>
            </>
          )}
        </section>

        <details className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-emerald-900">
            手动备份（可选）
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-emerald-900/80">
            导出一份 JSON，在 Vercel、换浏览器、换端口（5173 / 6294）后「恢复备份」即可找回词书、学习进度、测试历史、词根缓存与 API 设置。
          </p>
          {localDataSummary ? (
            <p className="mt-2 text-xs text-emerald-800">
              当前浏览器：{localDataSummary.bookCount} 本导入词书 · {localDataSummary.keyCount} 项存储
            </p>
          ) : (
            <p className="mt-2 text-xs text-emerald-700">当前浏览器尚无学习数据，可先在本机学习后导出。</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              导出备份
            </button>
            <input
              ref={backupRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onImportBackupFile}
            />
            <button
              type="button"
              onClick={() => backupRef.current?.click()}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              恢复备份
            </button>
          </div>
          {backupTip ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs text-emerald-950">
              {backupTip}
            </p>
          ) : null}
        </details>

        <div className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={onVocabFile}
          />
          <input ref={dirRef} type="file" className="hidden" multiple onChange={onVocabDir} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
          >
            导入 txt / md 词书
          </button>
          <button
            type="button"
            onClick={() => dirRef.current?.click()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50"
          >
            导入文件夹（.txt / .md）
          </button>
        </div>
        <p className="mb-4 text-center text-xs text-slate-500">
          支持 <strong>txt</strong>、<strong>Yasi.md</strong>（雅思）、<strong>JLPT*.md</strong>（日语 N1–N5 笔记）；导入后在本机练习，进度与测试历史自动保存。
        </p>
        {importTip ? (
          <p className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            {importTip}
          </p>
        ) : null}

        <details className="mb-6 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">大模型生成例句（可选）</summary>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            默认使用本地模板例句。若填写 API 密钥并勾选，则在点击「开始学习」后对今日抽中的词依次生成例句（密钥仅存本机）。
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
              onChange={(e) =>
                patchLlm({ provider: /** @type {'gemini'|'groq'|'deepseek'} */ (e.target.value) })
              }
              className="rounded-lg border border-slate-200 px-2 py-1"
            >
              <option value="gemini">Google Gemini（浏览器直连）</option>
              <option value="groq">Groq（开发环境走 Vite 代理）</option>
              <option value="deepseek">DeepSeek</option>
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
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
            <input
              type="text"
              placeholder="DeepSeek 模型名"
              value={llm.modelDeepseek}
              onChange={(e) => patchLlm({ modelDeepseek: e.target.value })}
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
            {' · '}
            <a className="text-indigo-600 underline" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">
              DeepSeek 密钥
            </a>
          </p>
        </details>

        <details className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/50 px-4 py-3 text-left shadow-sm" open>
          <summary className="cursor-pointer text-sm font-semibold text-violet-900">词根分析 · DeepSeek（推荐）</summary>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            分析时会先从{' '}
            <a href="https://www.quword.com/" target="_blank" rel="noreferrer" className="underline">
              趣词词典
            </a>{' '}
            抓取词根资料，再由 DeepSeek 整理成卡片（构词→前缀举例→词性派生→主题词）。在词书页可单独开启「本书自动分析词根」。
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rootLlm.enabled}
              onChange={(e) => patchRootLlm({ enabled: e.target.checked })}
            />
            启用 DeepSeek 词根分析
          </label>
          <input
            type="password"
            autoComplete="off"
            placeholder="DeepSeek API Key（sk-…）"
            value={rootLlm.apiKey}
            onChange={(e) => patchRootLlm({ apiKey: e.target.value })}
            className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="模型名"
            value={rootLlm.model}
            onChange={(e) => patchRootLlm({ model: e.target.value })}
            className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs"
          />
        </details>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">可选词书</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {books.map((b) => (
              <div
                key={b.id}
                className="relative rounded-3xl border border-white/70 bg-white/90 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <button
                  type="button"
                  disabled={openingId === b.id}
                  onClick={() => onPickBook(b)}
                  className="flex w-full flex-col items-start p-5 pr-16 text-left disabled:opacity-60"
                >
                  <span className="text-xs font-medium uppercase text-indigo-500">
                    {b.source === 'builtin' ? '内置' : '已导入'}
                  </span>
                  <span className="mt-2 text-lg font-bold text-slate-900">{b.title}</span>
                  <span className="mt-3 text-xs text-slate-500">
                    {openingId === b.id ? '正在载入…' : '点击进入词书首页'}
                  </span>
                </button>
                {b.source === 'import' ? (
                  <button
                    type="button"
                    title="删除词书"
                    onClick={() => onDeleteBook(b)}
                    className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                ) : null}
              </div>
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

    </div>
  )
}
