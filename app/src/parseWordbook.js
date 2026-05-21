/**
 * 解析词书行，支持：
 * - 单词 | 词性.释义（仅当「|」出现在词条与释义分界时：| 在首段冒号之前）
 * - 词条：释义…（释义内可用 | 分成大组，组内用；或 ; 拆成多个义项）
 * - 词条,释义1；释义2
 * - # 注释行、【章节标题】行忽略
 * Obsidian / Markdown：`#### 单词：释义`、`> - 单词：释义`（见 detectMarkdownWordbook）
 */

function splitMeaningsChunk(s) {
  return s
    .split(/[；;]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** @typedef {{ pos?: string, zh: string }} Sense */

/**
 * 词条侧可写音标：abandon /əˈbændən/ 或 abandon [əˈbændən]
 * @param {string} token
 * @returns {{ word: string, ipa?: string }}
 */
export function splitWordAndIpa(token) {
  const t = String(token ?? '').trim()
  if (!t) return { word: '' }

  const slash = t.match(/^(.+?)\s*\/([^/]+)\/\s*$/u)
  if (slash) {
    return { word: slash[1].trim(), ipa: `/${slash[2].trim()}/` }
  }

  const bracket = t.match(/^(.+?)\s*\[([^\]]+)\]\s*$/u)
  if (bracket) {
    return { word: bracket[1].trim(), ipa: `/${bracket[2].trim()}/` }
  }

  return { word: t }
}

/**
 * @param {string} chunk
 * @returns {Sense}
 */
function parseSenseChunk(chunk) {
  const m = chunk.match(/^([a-zA-Z]{1,6}\.)\s*(.+)$/)
  if (m) return { pos: m[1].replace(/\.$/, ''), zh: m[2].trim() }
  return { zh: chunk.trim() }
}

/** 释义里用 | 分成若干组，每组再按；拆开 */
function sensesFromColonTail(tail) {
  const rawParts = []
  for (const group of tail.split('|').map((g) => g.trim()).filter(Boolean)) {
    rawParts.push(...splitMeaningsChunk(group))
  }
  return rawParts.map(parseSenseChunk).filter((s) => s.zh.length > 0)
}

/**
 * 全角冒号优先；若无则用首个半角冒号（词条侧）
 * @param {string} s
 * @returns {{ idx: number, len: number } | null}
 */
function firstWordDelimiterColon(s) {
  const fw = s.indexOf('：')
  if (fw > 0) return { idx: fw, len: 1 }
  const asc = s.indexOf(':')
  if (asc > 0) return { idx: asc, len: 1 }
  return null
}

/**
 * @param {string} line
 * @returns {{ word: string, ipa?: string, senses: Sense[] } | null}
 */
export function parseWordbookLine(line) {
  const raw = line.trim()
  if (!raw || raw.startsWith('#')) return null
  if (/^【[^】]*】\s*$/.test(raw)) return null

  const pipeIdx = raw.indexOf('|')
  const colon = firstWordDelimiterColon(raw)

  /** 「单词 | 释义」：竖线出现在词条与释义之间（竖线在首段冒号之前，或整行无冒号） */
  if (pipeIdx >= 0 && (!colon || pipeIdx < colon.idx)) {
    const { word, ipa } = splitWordAndIpa(raw.slice(0, pipeIdx))
    const rest = raw.slice(pipeIdx + 1).trim()
    if (!word || !rest) return null
    const senses = sensesFromColonTail(rest)
    if (!senses.length) return null
    return ipa ? { word, ipa, senses } : { word, senses }
  }

  if (colon) {
    const { word, ipa } = splitWordAndIpa(raw.slice(0, colon.idx))
    const tail = raw.slice(colon.idx + colon.len).trim()
    if (!word || !tail) return null
    const senses = sensesFromColonTail(tail)
    if (!senses.length) return null
    return ipa ? { word, ipa, senses } : { word, senses }
  }

  const hasCommaEarly = /^[^,|：:]{1,120},/.test(raw)
  const commaIdx = raw.indexOf(',')
  if (commaIdx > 0 && hasCommaEarly) {
    const { word, ipa } = splitWordAndIpa(raw.slice(0, commaIdx))
    const tail = raw.slice(commaIdx + 1).trim()
    if (!word || !tail) return null
    const senses = sensesFromColonTail(tail)
    if (!senses.length) return null
    return ipa ? { word, ipa, senses } : { word, senses }
  }

  return null
}

function isIgnorablePlainLine(line) {
  const t = line.trim()
  if (!t) return true
  if (t.startsWith('#')) return true
  if (/^【[^】]*】\s*$/.test(t)) return true
  return false
}

/** @param {{ word: string, ipa?: string, senses: Sense[] }} parsed */
function mergeParsedEntry(byWord, parsed) {
  const key = parsed.word.toLowerCase()
  const prev = byWord.get(key)
  if (prev) {
    prev.senses.push(...parsed.senses)
    if (!prev.ipa && parsed.ipa) prev.ipa = parsed.ipa
  } else {
    byWord.set(key, {
      word: parsed.word,
      ...(parsed.ipa ? { ipa: parsed.ipa } : {}),
      senses: [...parsed.senses],
    })
  }
}

/**
 * @param {string} text
 * @param {(line: string) => { word: string, ipa?: string, senses: Sense[] } | null} parseLine
 * @param {(line: string) => boolean} isIgnorable
 */
function collectWordbookEntries(text, parseLine, isIgnorable) {
  const lines = text.split(/\r?\n/)
  const byWord = new Map()
  const badLineNumbers = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isIgnorable(line)) continue

    const parsed = parseLine(line)
    if (!parsed) {
      badLineNumbers.push(i + 1)
      continue
    }
    mergeParsedEntry(byWord, parsed)
  }

  return {
    entries: [...byWord.values()],
    badLineNumbers,
  }
}

const MD_WORD_MAX_LEN = 100

/** Obsidian / Markdown：去掉引用符、列表符 */
function stripMarkdownLine(line) {
  let t = line.trim()
  while (t.startsWith('>')) {
    t = t.slice(1).trim()
  }
  t = t.replace(/^[-*+]\s+/, '')
  return t.trim()
}

function isMarkdownMetaLine(t) {
  return /^(title|toc|date|tags|column):\s/i.test(t)
}

function isIgnorableMarkdownLine(line) {
  const t = stripMarkdownLine(line)
  if (!t) return true
  if (isMarkdownMetaLine(t)) return true
  if (/^---\s*$/.test(t)) return true
  return false
}

/**
 * 解析 Obsidian 笔记行：`#### word：释义`、`> - word：释义` 等
 * @param {string} line
 */
export function parseMarkdownWordbookLine(line) {
  const stripped = stripMarkdownLine(line)
  if (!stripped || isMarkdownMetaLine(stripped)) return null

  let body = stripped
  const heading = stripped.match(/^#{1,6}\s+(.+)$/)
  if (heading) body = heading[1].trim()
  else if (stripped.startsWith('#')) return null

  body = body.replace(/^\\#\s*/, '')
  body = body.replace(/\*\*([^*]+)\*\*/g, '$1').trim()

  const colon = firstWordDelimiterColon(body)
  if (!colon) return null

  let wordPart = body.slice(0, colon.idx).trim()
  const tail = body.slice(colon.idx + colon.len).trim()
  wordPart = wordPart.replace(/^['"]|['"]$/g, '').trim()

  if (!wordPart || !tail) return null
  if (wordPart.length > MD_WORD_MAX_LEN) return null
  if (/^(衍生|形近|同义|语法|必背|词根|常用|易混|词族)/u.test(wordPart)) return null

  const { word, ipa } = splitWordAndIpa(wordPart)
  if (!word) return null
  const senses = sensesFromColonTail(tail)
  if (!senses.length) return null
  return ipa ? { word, ipa, senses } : { word, senses }
}

/** @param {string} text */
export function detectMarkdownWordbook(text) {
  if (/\n\s*#{1,6}\s+\S+[：:]/m.test(text)) return true
  if (/^\s*>\s*#{0,6}\s*\S+[：:]/m.test(text)) return true
  if (/^\s*>\s*[-*+]\s+\S+[：:]/m.test(text)) return true
  return false
}

/** @param {string} text */
export function parseMarkdownWordbookText(text) {
  return collectWordbookEntries(text, parseMarkdownWordbookLine, isIgnorableMarkdownLine)
}

/** @param {string} text */
export function parsePlainWordbookText(text) {
  return collectWordbookEntries(text, parseWordbookLine, isIgnorablePlainLine)
}

/**
 * @param {string} text
 * @returns {{ entries: { word: string, senses: Sense[] }[], badLineNumbers: number[], format: 'markdown' | 'plain' }}
 */
export function parseWordbookText(text) {
  const format = detectMarkdownWordbook(text) ? 'markdown' : 'plain'
  const result =
    format === 'markdown' ? parseMarkdownWordbookText(text) : parsePlainWordbookText(text)
  return { ...result, format }
}
