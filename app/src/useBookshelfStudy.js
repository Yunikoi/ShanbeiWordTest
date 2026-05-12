import { useCallback, useEffect, useMemo, useState } from 'react'
import { addImportedBook, loadBookEntries, loadMeta, loadProgress, saveProgress } from './bookStorage.js'
import { enrichQueueWithLLM } from './llmExamples.js'
import { getLlmSettings } from './llmSettings.js'
import { attachExamples } from './ieltsSentence.js'
import { parseWordbookText } from './parseWordbook.js'

/** @typedef {{ id: string, title: string, source: 'builtin' | 'import', file?: string }} ShelfBook */
/** @typedef {{ pos?: string, zh: string, example: string, exampleZh?: string }} SenseEx */
/** @typedef {{ word: string, senses: SenseEx[] }} CardEntry */

const MANIFEST_URL = '/wordbooks/manifest.json'

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

/**
 * @typedef {{
 *   intervalNext: number,
 *   nextDue: string,
 *   lastReviewed?: string,
 *   fuzzyCount?: number,
 * }} WordProg */

/** @param {Record<string, WordProg>} progMap @param {string} word @param {string} today */
function isDue(progMap, word, today) {
  const p = progMap[word]
  if (!p || !p.nextDue) return true
  return p.nextDue <= today
}

/**
 * @param {Record<string, WordProg>} progMap
 * @param {CardEntry[]} entries
 * @param {string} today
 */
function buildDueSortedQueue(progMap, entries, today) {
  const due = entries.filter((e) => isDue(progMap, e.word, today))
  const score = (w) => {
    const p = progMap[w.word]
    if (!p || !p.nextDue) return 0
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
 * @param {WordProg|undefined} prev
 * @param {'known' | 'fuzzy' | 'forget'} kind
 * @param {string} today
 */
function applySrs(prev, kind, today) {
  const base = prev ?? { intervalNext: 1, nextDue: today, fuzzyCount: 0 }
  const intervalNext = base.intervalNext && base.intervalNext > 0 ? base.intervalNext : 1

  if (kind === 'known') {
    const wait = intervalNext
    return {
      intervalNext: Math.min(wait * 2, 512),
      nextDue: addDaysYmd(today, wait),
      lastReviewed: today,
      fuzzyCount: base.fuzzyCount ?? 0,
    }
  }
  if (kind === 'fuzzy') {
    return {
      intervalNext,
      nextDue: today,
      lastReviewed: today,
      fuzzyCount: (base.fuzzyCount ?? 0) + 1,
    }
  }
  return {
    intervalNext: 1,
    nextDue: today,
    lastReviewed: today,
    fuzzyCount: base.fuzzyCount ?? 0,
  }
}

export function useBookshelfStudy() {
  const [shelfLoading, setShelfLoading] = useState(true)
  const [shelfError, setShelfError] = useState(null)
  const [builtinManifest, setBuiltinManifest] = useState(/** @type {ShelfBook[]} */ ([]))
  const [importMeta, setImportMeta] = useState(() => loadMeta())

  const refreshImports = useCallback(() => {
    setImportMeta(loadMeta())
  }, [])

  const [view, setView] = useState(/** @type {'shelf' | 'study'} */ ('shelf'))
  const [activeBookId, setActiveBookId] = useState(/** @type {string | null} */ (null))
  const [activeTitle, setActiveTitle] = useState('')
  const [entries, setEntries] = useState(/** @type {CardEntry[]} */ ([]))
  const [bookLoadError, setBookLoadError] = useState(null)

  const [progress, setProgress] = useState(/** @type {Record<string, WordProg>} */ ({}))
  const [sessionQueue, setSessionQueue] = useState(/** @type {CardEntry[]} */ ([]))
  const [sessionIndex, setSessionIndex] = useState(0)
  const [sessionFlag, setSessionFlag] = useState(/** @type {'idle' | 'active' | 'done' | 'empty'} */ ('idle'))
  const [preparingSession, setPreparingSession] = useState(false)

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
      const withEx = raw.map((e) => attachExamples({ word: e.word, senses: e.senses }, salt))
      setEntries(withEx)
      setProgress(loadProgress(book.id))
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
      setProgress(loadProgress(book.id))
      return { ok: true }
    } catch (e) {
      setBookLoadError(e.message ?? String(e))
      setEntries([])
      return { ok: false }
    }
  }, [])

  /**
   * @param {number} dailyGoal 10–100 step 5
   */
  const beginSession = useCallback(
    async (dailyGoal) => {
      if (!activeBookId || !entries.length) return { ok: false, message: '请先选择有效词书' }
      setPreparingSession(true)
      try {
        const today = localTodayYMD()
        const prog = loadProgress(activeBookId)
        const dueSorted = buildDueSortedQueue(prog, entries, today)
        const n = Math.max(0, Math.min(dailyGoal, dueSorted.length))
        if (n === 0) {
          setSessionQueue([])
          setSessionIndex(0)
          setSessionFlag('empty')
          setView('study')
          return { ok: true, empty: true }
        }
        let queue = dueSorted.slice(0, n)
        const cfg = getLlmSettings()
        if (cfg.enabled && cfg.apiKey.trim()) {
          queue = await enrichQueueWithLLM(queue, cfg)
        }
        setSessionQueue(queue)
        setSessionIndex(0)
        setSessionFlag('active')
        setView('study')
        return { ok: true, count: queue.length }
      } finally {
        setPreparingSession(false)
      }
    },
    [activeBookId, entries],
  )

  const backToShelf = useCallback(() => {
    setView('shelf')
    setSessionFlag('idle')
    setSessionQueue([])
    setSessionIndex(0)
    setActiveBookId(null)
    setEntries([])
    setActiveTitle('')
    setBookLoadError(null)
  }, [])

  const clearActiveBook = useCallback(() => {
    setActiveBookId(null)
    setEntries([])
    setActiveTitle('')
    setBookLoadError(null)
    setProgress({})
  }, [])

  const backToShelfKeepBook = useCallback(() => {
    setView('shelf')
    setSessionFlag('idle')
    setSessionQueue([])
    setSessionIndex(0)
  }, [])

  const commitGrade = useCallback(
    (kind) => {
      if (!activeBookId || sessionFlag !== 'active') return { done: false }
      const cur = sessionQueue[sessionIndex]
      if (!cur) return { done: true }

      const today = localTodayYMD()
      const map = { ...loadProgress(activeBookId) }
      map[cur.word] = applySrs(map[cur.word], kind, today)
      saveProgress(activeBookId, map)
      setProgress(map)

      const next = sessionIndex + 1
      if (next >= sessionQueue.length) {
        setSessionFlag('done')
        return { done: true }
      }
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
  const sessionTotal = sessionQueue.length
  const sessionPosition =
    sessionTotal === 0 ? 0 : sessionComplete ? sessionTotal : Math.min(sessionIndex + 1, sessionTotal)

  /**
   * @param {string} text
   * @param {string} [title]
   */
  const importFromText = useCallback((text, title) => {
    const { entries: parsed, badLineNumbers } = parseWordbookText(text)
    if (!parsed.length) {
      return {
        ok: false,
        message:
          '没有解析到有效词条。支持：单词 | 词性.释义；单词,释义1；释义2；单词：释义',
      }
    }
    const withSenses = parsed.map((e) => ({
      word: e.word,
      senses: e.senses.map((s) => ({ pos: s.pos, zh: s.zh })),
    }))
    const id = addImportedBook(title?.trim() || '导入词书', withSenses)
    refreshImports()
    return {
      ok: true,
      id,
      count: withSenses.length,
      skippedLines: badLineNumbers.length,
    }
  }, [refreshImports])

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
    loadBook,
    beginSession,
    preparingSession,
    backToShelf,
    clearActiveBook,
    backToShelfKeepBook,
    sessionQueue,
    sessionIndex,
    sessionTotal,
    sessionPosition,
    sessionComplete,
    sessionEmpty,
    sessionFlag,
    currentCard,
    commitGrade,
    importFromText,
    progress,
  }
}
