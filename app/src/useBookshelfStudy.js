import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addImportedBook,
  findImportBySourceFile,
  loadBookEntries,
  loadMeta,
  loadProgress,
  saveProgress,
  updateImportedBook,
  removeImportedBook,
} from './bookStorage.js'
import { enrichQueueWithLLM } from './llmExamples.js'
import { getLlmSettings } from './llmSettings.js'
import { attachExamples } from './ieltsSentence.js'
import { attachLocalRelations } from './localRelations.js'
import { parseWordbookText } from './parseWordbook.js'
import { applySrsV2, migrateWordProg } from './srsCurve.js'
import { enrichEntriesWithIpa } from './ipaLookup.js'
import { computeBookDashboard } from './bookDashboard.js'
import { appendStudySession, loadStudyHistory } from './studyHistory.js'

/** @typedef {{ id: string, title: string, source: 'builtin' | 'import', file?: string }} ShelfBook */
/** @typedef {{ pos?: string, zh: string, example: string, exampleZh?: string }} SenseEx */
/** @typedef {{ word: string, ipa?: string, senses: SenseEx[], relations?: import('./wordRelations.js').WordRelations }} CardEntry */

const MANIFEST_URL = '/wordbooks/manifest.json'
/** 本轮答错时，隔几个词后再测（不推到整轮队尾） */
const SESSION_REQUEUE_OFFSET = 4

function localTodayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s) {
  const [y, mo, da] = s.split('-').map(Number)
  return new Date(y, mo - 1, da)
}

function addDaysYmd(ymd, n) {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** @param {Record<string, unknown>} raw @param {string} today */
function normalizeProgressMap(raw, today) {
  /** @type {Record<string, unknown>} */
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [w, p] of Object.entries(raw)) {
    out[w] = migrateWordProg(p, today)
  }
  return out
}

/** @param {Record<string, unknown>} progMap @param {string} word @param {string} today */
function isDue(progMap, word, today) {
  const p = migrateWordProg(progMap[word], today)
  return p.nextDue <= today
}

/**
 * @param {Record<string, unknown>} progMap
 * @param {CardEntry[]} entries
 * @param {string} today
 */
function buildDueSortedQueue(progMap, entries, today) {
  const due = entries.filter((e) => isDue(progMap, e.word, today))
  const score = (w) => {
    const p = migrateWordProg(progMap[w.word], today)
    const diff = (parseYmd(p.nextDue) - parseYmd(today)) / 86400000
    return diff
  }
  due.sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    if (sa !== sb) return sa - sb
    return a.word.localeCompare(b.word)
  })
  return due
}

/**
 * 从到期池中随机打乱后再取当日数量，避免每次都抽到排序最靠前的那一批固定词。
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffleCopy(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useBookshelfStudy() {
  const [shelfLoading, setShelfLoading] = useState(true)
  const [shelfError, setShelfError] = useState(null)
  const [builtinManifest, setBuiltinManifest] = useState(/** @type {ShelfBook[]} */ ([]))
  const [importMeta, setImportMeta] = useState(() => loadMeta())

  const refreshImports = useCallback(() => {
    setImportMeta(loadMeta())
  }, [])

  const [view, setView] = useState(/** @type {'shelf' | 'book' | 'study'} */ ('shelf'))
  const [activeBookId, setActiveBookId] = useState(/** @type {string | null} */ (null))
  const [activeTitle, setActiveTitle] = useState('')
  const [entries, setEntries] = useState(/** @type {CardEntry[]} */ ([]))
  const [bookLoadError, setBookLoadError] = useState(null)

  const [progress, setProgress] = useState(/** @type {Record<string, unknown>} */ ({}))
  const [sessionQueue, setSessionQueue] = useState(/** @type {CardEntry[]} */ ([]))
  const [sessionIndex, setSessionIndex] = useState(0)
  /** 本次会话计划词数（进度分母，不因加练变长而改变） */
  const [sessionPlanTotal, setSessionPlanTotal] = useState(0)
  const [sessionFlag, setSessionFlag] = useState(/** @type {'idle' | 'active' | 'done' | 'empty'} */ ('idle'))
  const [preparingSession, setPreparingSession] = useState(false)
  const [studyHistory, setStudyHistory] = useState(/** @type {import('./studyHistory.js').StudySession[]} */ ([]))
  /** @type {import('react').MutableRefObject<import('./studyHistory.js').StudySession | null>} */
  const sessionLogRef = useRef(null)

  const books = useMemo(() => {
    const imp = importMeta.map((b) => ({
      id: b.id,
      title: b.title,
      source: /** @type {'import'} */ ('import'),
    }))
    return [...builtinManifest, ...imp]
  }, [builtinManifest, importMeta])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setShelfLoading(true)
      setShelfError(null)
      try {
        const r = await fetch(MANIFEST_URL)
        if (!r.ok) throw new Error(`无法读取词书清单 (${r.status})`)
        const data = await r.json()
        const list = Array.isArray(data?.books) ? data.books : []
        if (cancelled) return
        setBuiltinManifest(
          list.map((b) => ({
            id: String(b.id),
            title: String(b.title ?? b.file ?? b.id),
            file: String(b.file),
            source: /** @type {'builtin'} */ ('builtin'),
          })),
        )
      } catch (e) {
        if (!cancelled) setShelfError(e.message ?? String(e))
      } finally {
        if (!cancelled) setShelfLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadBook = useCallback(async (book) => {
    setBookLoadError(null)
    setActiveBookId(book.id)
    setActiveTitle(book.title)

    if (book.source === 'import') {
      const raw = loadBookEntries(book.id)
      if (!raw?.length) {
        setBookLoadError('本地词书数据缺失，请重新导入。')
        setEntries([])
        return { ok: false }
      }
      const salt = Date.now()
      const withEx = raw.map((e) =>
        attachExamples(
          {
            word: e.word,
            senses: e.senses,
            ...(e.ipa ? { ipa: e.ipa } : {}),
            ...(e.relations ? { relations: e.relations } : {}),
          },
          salt,
        ),
      )
      setEntries(withEx)
      enrichEntriesWithIpa(withEx).then((enriched) => setEntries(enriched))
      const today = localTodayYMD()
      const progMap = normalizeProgressMap(loadProgress(book.id), today)
      setProgress(progMap)
      saveProgress(book.id, progMap)
      setStudyHistory(loadStudyHistory(book.id))
      setView('book')
      return { ok: true }
    }

    try {
      const url = `/wordbooks/${encodeURIComponent(book.file ?? '')}`
      const r = await fetch(url)
      if (!r.ok) throw new Error(`读取词书失败 (${r.status})`)
      const text = await r.text()
      const { entries: parsed, badLineNumbers } = parseWordbookText(text)
      if (!parsed.length) {
        setBookLoadError(
          badLineNumbers.length
            ? `词书为空或无法解析（问题行号示例：${badLineNumbers.slice(0, 5).join(', ')}）`
            : '词书为空或无法解析。',
        )
        setEntries([])
        return { ok: false }
      }
      const salt = Date.now()
      const withEx = parsed.map((e) => attachExamples(e, salt))
      setEntries(withEx)
      enrichEntriesWithIpa(withEx).then((enriched) => setEntries(enriched))
      const today = localTodayYMD()
      const progMap = normalizeProgressMap(loadProgress(book.id), today)
      setProgress(progMap)
      saveProgress(book.id, progMap)
      setStudyHistory(loadStudyHistory(book.id))
      setView('book')
      return { ok: true }
    } catch (e) {
      setBookLoadError(e.message ?? String(e))
      setEntries([])
      return { ok: false }
    }
  }, [])

  const bookDashboard = useMemo(() => {
    if (!entries.length) return null
    return computeBookDashboard(progress, entries, localTodayYMD())
  }, [entries, progress])

  /**
   * @param {number} dailyGoal 10–100 step 5
   */
  const beginSession = useCallback(
    async (dailyGoal) => {
      if (!activeBookId || !entries.length) return { ok: false, message: '请先选择有效词书' }
      setPreparingSession(true)
      try {
        const today = localTodayYMD()
        const prog = normalizeProgressMap(loadProgress(activeBookId), today)
        const dueSorted = buildDueSortedQueue(prog, entries, today)
        const n = Math.max(0, Math.min(dailyGoal, dueSorted.length))
        if (n === 0) {
          setSessionQueue([])
          setSessionIndex(0)
          setSessionPlanTotal(0)
          setSessionFlag('empty')
          setView('study')
          return { ok: true, empty: true }
        }
        const pool = shuffleCopy(dueSorted)
        let queue = pool.slice(0, n)
        const cfg = getLlmSettings()
        if (cfg.enabled && cfg.apiKey.trim()) {
          queue = await enrichQueueWithLLM(queue, cfg)
        }
        queue = await enrichEntriesWithIpa(queue)
        setSessionPlanTotal(queue.length)
        setSessionQueue(queue)
        setSessionIndex(0)
        setSessionFlag('active')
        sessionLogRef.current = {
          id: `sess-${Date.now()}`,
          startedAt: new Date().toISOString(),
          endedAt: '',
          planTotal: queue.length,
          dailyGoal: n,
          events: [],
        }
        setView('study')
        return { ok: true, count: queue.length }
      } finally {
        setPreparingSession(false)
      }
    },
    [activeBookId, entries],
  )

  const backToShelf = useCallback(() => {
    sessionLogRef.current = null
    setView('shelf')
    setSessionFlag('idle')
    setSessionQueue([])
    setSessionIndex(0)
    setSessionPlanTotal(0)
    setActiveBookId(null)
    setEntries([])
    setActiveTitle('')
    setBookLoadError(null)
    setProgress({})
  }, [])

  const backToBook = useCallback(() => {
    sessionLogRef.current = null
    setView('book')
    setSessionFlag('idle')
    setSessionQueue([])
    setSessionIndex(0)
    setSessionPlanTotal(0)
    if (activeBookId) {
      const today = localTodayYMD()
      setProgress(normalizeProgressMap(loadProgress(activeBookId), today))
    }
  }, [activeBookId])

  const clearActiveBook = useCallback(() => {
    setActiveBookId(null)
    setEntries([])
    setActiveTitle('')
    setBookLoadError(null)
    setProgress({})
    setView('shelf')
  }, [])

  const commitGrade = useCallback(
    (kind) => {
      if (!activeBookId || sessionFlag !== 'active') return { done: false }
      const cur = sessionQueue[sessionIndex]
      if (!cur) return { done: true }

      if (sessionLogRef.current) {
        sessionLogRef.current.events.push({
          word: cur.word,
          kind,
          at: new Date().toISOString(),
        })
      }

      const today = localTodayYMD()
      const raw = loadProgress(activeBookId)
      const prev = raw[cur.word]
      const { prog, requeueSameSession } = applySrsV2(prev, kind, today, addDaysYmd)
      const map = { ...raw, [cur.word]: prog }
      const normalized = normalizeProgressMap(map, today)
      saveProgress(activeBookId, normalized)
      setProgress(normalized)

      const next = sessionIndex + 1
      let newQueue = [...sessionQueue]
      if (requeueSameSession) {
        const insertAt = Math.min(next + SESSION_REQUEUE_OFFSET, newQueue.length)
        newQueue.splice(insertAt, 0, cur)
      }
      if (next >= newQueue.length) {
        setSessionQueue(newQueue)
        setSessionFlag('done')
        if (sessionLogRef.current && activeBookId) {
          const finished = {
            ...sessionLogRef.current,
            endedAt: new Date().toISOString(),
          }
          setStudyHistory(appendStudySession(activeBookId, finished))
          sessionLogRef.current = null
        }
        return { done: true }
      }

      setSessionQueue(newQueue)
      setSessionIndex(next)
      return { done: false }
    },
    [activeBookId, sessionFlag, sessionIndex, sessionQueue],
  )

  const sessionComplete = sessionFlag === 'done'
  const sessionEmpty = sessionFlag === 'empty'

  const currentCard =
    sessionFlag === 'done' && sessionQueue.length
      ? sessionQueue[sessionQueue.length - 1]
      : sessionQueue[sessionIndex] ?? null
  /** 学习页进度分母：含答错插入的重测，避免显示 30/30 后仍有词 */
  const sessionQueueLength = sessionQueue.length
  const sessionExtra = Math.max(0, sessionQueueLength - sessionPlanTotal)

  const sessionPosition =
    sessionQueueLength === 0
      ? 0
      : sessionComplete
        ? sessionQueueLength
        : sessionIndex + 1

  /**
   * @param {string} text
   * @param {string} [title]
   * @param {{ sourceFile?: string, updateBookId?: string, replaceExisting?: boolean }} [opts]
   */
  const importFromText = useCallback(
    (text, title, opts = {}) => {
      const { entries: parsed, badLineNumbers, format } = parseWordbookText(text)
      if (!parsed.length) {
        return {
          ok: false,
          message:
            '没有解析到有效词条。支持 txt：单词：释义。支持 Obsidian（Yasi.md）：#### 词条：释义、> - 短语：释义、词根行 subtle adj. 中文、**短语** 下一行释义等',
        }
      }
    const withSenses = parsed.map((e) => ({
      word: e.word,
      ...(e.ipa ? { ipa: e.ipa } : {}),
      ...(e.relations ? { relations: e.relations } : {}),
      senses: e.senses.map((s) => ({ pos: s.pos, zh: s.zh })),
    }))
      const bookTitle = title?.trim() || '导入词书'

      let targetId = opts.updateBookId
      let updated = false
      if (!targetId && opts.replaceExisting !== false && opts.sourceFile) {
        const existing = findImportBySourceFile(opts.sourceFile)
        if (existing) targetId = existing.id
      }

      if (targetId) {
        const ok = updateImportedBook(targetId, withSenses, {
          sourceFile: opts.sourceFile,
          title: bookTitle,
        })
        if (!ok) {
          return { ok: false, message: '更新词书失败，请重新导入。' }
        }
        updated = true
      } else {
        targetId = addImportedBook(bookTitle, withSenses, {
          sourceFile: opts.sourceFile,
        })
      }

      refreshImports()

      if (updated && activeBookId === targetId) {
        const raw = loadBookEntries(targetId)
        if (raw?.length) {
          const salt = Date.now()
          const withEx = raw.map((e) =>
            attachExamples(
              { word: e.word, senses: e.senses, ...(e.ipa ? { ipa: e.ipa } : {}) },
              salt,
            ),
          )
          setEntries(withEx)
          enrichEntriesWithIpa(withEx).then((enriched) => setEntries(enriched))
          const today = localTodayYMD()
          const progMap = normalizeProgressMap(loadProgress(targetId), today)
          setProgress(progMap)
          saveProgress(targetId, progMap)
          setActiveTitle(bookTitle)
        }
      }

      return {
        ok: true,
        id: targetId,
        count: withSenses.length,
        skippedLines: badLineNumbers.length,
        format,
        updated,
      }
    },
    [refreshImports, activeBookId],
  )

  const deleteImportedBook = useCallback(
    (bookId) => {
      const meta = loadMeta().find((b) => b.id === bookId)
      if (!meta || meta.source !== 'import') {
        return { ok: false, message: '只能删除已导入的词书' }
      }
      removeImportedBook(bookId)
      refreshImports()
      if (activeBookId === bookId) {
        setView('shelf')
        setSessionFlag('idle')
        setSessionQueue([])
        setSessionIndex(0)
        setSessionPlanTotal(0)
        setActiveBookId(null)
        setEntries([])
        setActiveTitle('')
        setBookLoadError(null)
        setProgress({})
      }
      return { ok: true, title: meta.title }
    },
    [refreshImports, activeBookId],
  )

  return {
    shelfLoading,
    shelfError,
    books,
    bookLoadError,
    refreshImports,
    view,
    activeBookId,
    activeTitle,
    entries,
    bookDashboard,
    loadBook,
    beginSession,
    preparingSession,
    backToShelf,
    backToBook,
    clearActiveBook,
    sessionQueue,
    sessionIndex,
    sessionPlanTotal,
    sessionQueueLength,
    sessionExtra,
    sessionPosition,
    sessionComplete,
    sessionEmpty,
    sessionFlag,
    currentCard,
    commitGrade,
    importFromText,
    deleteImportedBook,
    progress,
    activeBookSource:
      books.find((b) => b.id === activeBookId)?.source ?? null,
    studyHistory,
  }
}
