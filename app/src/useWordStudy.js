import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const STATUS = {
  NOT_LEARNED: '未学',
  KNOWN: '认识',
  VAGUE: '模糊',
  UNKNOWN: '不认识',
}

const KEY_PROGRESS = 'shanbei-word-progress'
const KEY_DAILY = 'shanbei-word-daily'
const KEY_CUSTOM = 'shanbei-word-custom-vocab'

/** 与根目录 parser.js 一致：每行 `单词：释义`，兼容中英文冒号 */
export function parseVocabText(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const items = []
  const badLineNumbers = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(.+)[：:](.+)/)
    if (!m) {
      badLineNumbers.push(i + 1)
      continue
    }
    const word = m[1].trim()
    const translation = m[2].trim()
    if (!word || !translation) {
      badLineNumbers.push(i + 1)
      continue
    }
    items.push({ word, translation })
  }
  return { items, badLineNumbers }
}

function loadCustomVocab() {
  try {
    const raw = localStorage.getItem(KEY_CUSTOM)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data) || data.length === 0) return null
    return data
  } catch {
    return null
  }
}

function saveCustomVocab(items) {
  localStorage.setItem(KEY_CUSTOM, JSON.stringify(items))
}

function clearCustomVocabStorage() {
  localStorage.removeItem(KEY_CUSTOM)
}

function pruneProgressToWords(wordList) {
  const allowed = new Set(wordList.map((e) => e.word))
  const next = {}
  const prev = loadProgress()
  for (const key of Object.keys(prev)) {
    if (allowed.has(key)) next[key] = prev[key]
  }
  saveProgress(next)
  return next
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(map) {
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(map))
}

function loadStudiedToday() {
  try {
    const raw = localStorage.getItem(KEY_DAILY)
    const all = raw ? JSON.parse(raw) : {}
    const list = all[todayIso()]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveStudiedToday(list) {
  try {
    const raw = localStorage.getItem(KEY_DAILY)
    const all = raw ? JSON.parse(raw) : {}
    all[todayIso()] = list
    localStorage.setItem(KEY_DAILY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function defaultEntry() {
  return { status: STATUS.NOT_LEARNED, efactor: 2.5 }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 待复习队列：排除已在进度里标记为「认识」的词条 */
export function buildReviewQueue(wordList, prog) {
  const pending = wordList.filter(
    (w) => (prog[w.word]?.status ?? STATUS.NOT_LEARNED) !== STATUS.KNOWN,
  )
  return shuffle(pending)
}

function applyProgressForKind(prev, word, kind) {
  const next = { ...prev }
  const cur = { ...(next[word] ?? defaultEntry()) }
  if (kind === 'easy') {
    cur.status = STATUS.KNOWN
    cur.efactor = Math.min(3, (cur.efactor ?? 2.5) + 0.15)
  } else if (kind === 'review') {
    cur.status = STATUS.VAGUE
    cur.efactor = Math.max(1.3, (cur.efactor ?? 2.5) * 0.95)
  } else {
    cur.status = STATUS.UNKNOWN
    cur.efactor = Math.max(1.3, (cur.efactor ?? 2.5) * 0.85)
  }
  next[word] = cur
  return next
}

/**
 * 「不认识 / 需复习」：当前词插入到队首移除后的第 3 个位置之后（不足则靠末尾）
 * 等价：在 rest 中插入索引 pos = min(3, rest.length)
 */
function requeueAfterThree(head, rest) {
  const pos = Math.min(3, rest.length)
  return [...rest.slice(0, pos), head, ...rest.slice(pos)]
}

export function useWordStudy() {
  const [words, setWords] = useState(() => loadCustomVocab() ?? [])
  const [loadError, setLoadError] = useState(null)
  const [isCustomVocab, setIsCustomVocab] = useState(() => !!loadCustomVocab())
  const [progress, setProgress] = useState(loadProgress)
  const [studiedToday, setStudiedToday] = useState(() => loadStudiedToday())
  const [currentQueue, setCurrentQueue] = useState(() => {
    const w = loadCustomVocab() ?? []
    return w.length ? buildReviewQueue(w, loadProgress()) : []
  })
  const [showTranslation, setShowTranslation] = useState(false)

  const queueRef = useRef(currentQueue)
  useEffect(() => {
    queueRef.current = currentQueue
  }, [currentQueue])

  useEffect(() => {
    let cancelled = false
    if (loadCustomVocab()) return

    fetch('/data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败 ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return
        const p = loadProgress()
        setWords(data)
        setCurrentQueue(buildReviewQueue(data, p))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message ?? String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const importFromText = useCallback((text) => {
    const { items, badLineNumbers } = parseVocabText(text)
    if (!items.length) {
      return {
        ok: false,
        message: '没有解析到有效条目。请保证每行格式为：单词：释义（可用中文冒号「：」或英文冒号「:」）',
      }
    }
    saveCustomVocab(items)
    const nextProgress = pruneProgressToWords(items)
    setProgress(nextProgress)
    setWords(items)
    setCurrentQueue(buildReviewQueue(items, nextProgress))
    setIsCustomVocab(true)
    setLoadError(null)
    setShowTranslation(false)
    return {
      ok: true,
      count: items.length,
      skippedLines: badLineNumbers.length,
    }
  }, [])

  const restoreBuiltinVocab = useCallback(async () => {
    clearCustomVocabStorage()
    setIsCustomVocab(false)
    try {
      const r = await fetch('/data.json')
      if (!r.ok) throw new Error(`加载失败 ${r.status}`)
      const data = await r.json()
      if (!Array.isArray(data)) throw new Error('词库格式错误')
      const nextProgress = pruneProgressToWords(data)
      setProgress(nextProgress)
      setWords(data)
      setCurrentQueue(buildReviewQueue(data, nextProgress))
      setLoadError(null)
      setShowTranslation(false)
    } catch (e) {
      setLoadError(e.message ?? String(e))
      setWords([])
      setCurrentQueue([])
    }
  }, [])

  const current = useMemo(() => currentQueue[0] ?? null, [currentQueue])

  const todayPercent = useMemo(() => {
    if (!words.length) return 0
    const n = new Set(studiedToday).size
    return Math.round((n / words.length) * 100)
  }, [words.length, studiedToday])

  /**
   * 核心状态迁移：更新进度 + 调整 currentQueue（nextWord 的数据侧）。
   * easy：出队并计为今日已掌握；review/hard：队首取出后插到「三个位置之后」
   * @returns {{ remaining: number }} 更新后队列长度
   */
  const commitFeedback = useCallback((kind) => {
    const q = queueRef.current
    if (!q.length) return { remaining: 0 }

    const [head, ...rest] = q
    const w = head.word
    const nextQ = kind === 'easy' ? rest : requeueAfterThree(head, rest)

    setProgress((prev) => {
      const nextP = applyProgressForKind(prev, w, kind)
      saveProgress(nextP)
      return nextP
    })

    if (kind === 'easy') {
      setStudiedToday((prev) => {
        const next = [...new Set([...prev, w])]
        saveStudiedToday(next)
        return next
      })
    }

    setCurrentQueue(nextQ)
    return { remaining: nextQ.length }
  }, [])

  const entryFor = useCallback(
    (word) => progress[word] ?? defaultEntry(),
    [progress],
  )

  const sessionComplete = words.length > 0 && currentQueue.length === 0

  return {
    words,
    loadError,
    isCustomVocab,
    current,
    currentQueue,
    progress,
    showTranslation,
    setShowTranslation,
    todayPercent,
    commitFeedback,
    entryFor,
    sessionComplete,
    importFromText,
    restoreBuiltinVocab,
  }
}
