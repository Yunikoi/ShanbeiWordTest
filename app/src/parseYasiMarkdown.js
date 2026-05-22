/**
 * 解析 Obsidian 雅思笔记（Yasi.md）格式：
 * - #### 词条：释义 | #### 词条 中文（无冒号）
 * - > - 短语：释义 / > - 短语  中文
 * - > word adj. 中文 / > **phrase** + 下一行中文
 * - > ##### pandemic 大流行…（同义替换行）
 * - 一行多词：decorative 装饰；adornment 装饰品
 */

import { splitWordAndIpa, firstWordDelimiterColon } from './parseWordbookCore.js'

const MD_WORD_MAX_LEN = 160
const NOTE_GLOSS = '（见笔记）'

/** @typedef {{ pos?: string, zh: string }} Sense */
/** @typedef {{ word: string, ipa?: string, senses: Sense[] }} Entry */

function stripMdDecorations(s) {
  return String(s)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\\#\s*/, '')
    .trim()
}

function stripBlockquote(line) {
  let t = line.trim()
  while (t.startsWith('>')) {
    t = t.slice(1).trim()
  }
  return t.trim()
}

function stripMarkdownLine(line) {
  return stripBlockquote(line).replace(/^[-*+]\s+/, '').trim()
}

function isMarkdownMetaLine(t) {
  return /^(title|toc|date|tags|column):\s/i.test(t)
}

function firstCjkIndex(s) {
  for (let i = 0; i < s.length; i++) {
    if (/[\u4e00-\u9fff]/.test(s[i])) return i
  }
  return -1
}

/** @returns {{ en: string, zh: string } | null} */
function splitEnglishChinese(s) {
  const idx = firstCjkIndex(s)
  if (idx <= 0) return null
  const en = stripMdDecorations(s.slice(0, idx))
  const zh = s.slice(idx).trim()
  if (!en || !zh || en.length > MD_WORD_MAX_LEN) return null
  if (!/[a-zA-Z]/.test(en)) return null
  return { en, zh }
}

function sensesFromTail(tail) {
  const rawParts = []
  for (const group of tail.split('|').map((g) => g.trim()).filter(Boolean)) {
    for (const piece of group.split(/[；;]/).map((x) => x.trim()).filter(Boolean)) {
      rawParts.push(piece)
    }
  }
  const senses = []
  for (const chunk of rawParts) {
    const posM = chunk.match(/^([a-zA-Z]{1,6})\.\s*(.+)$/)
    if (posM && !/[：:]/.test(chunk.slice(0, 8))) {
      senses.push({ pos: posM[1].replace(/\.$/, ''), zh: posM[2].trim() })
      continue
    }
    senses.push({ zh: stripMdDecorations(chunk) })
  }
  return senses.filter((s) => s.zh.length > 0)
}

/** @returns {Entry | null} */
function entryFromColon(body) {
  const colon = firstWordDelimiterColon(body)
  if (!colon) return null
  const wordPart = stripMdDecorations(body.slice(0, colon.idx).trim())
  const tail = body.slice(colon.idx + colon.len).trim()
  if (!wordPart || !tail || wordPart.length > MD_WORD_MAX_LEN) return null
  if (isSectionLabel(wordPart)) return null
  const { word, ipa } = splitWordAndIpa(wordPart)
  if (!word) return null
  const senses = sensesFromTail(tail)
  if (!senses.length) return null
  return ipa ? { word, ipa, senses } : { word, senses }
}

function isSectionLabel(text) {
  return /^(衍生|形近|同义|语法|必背|词根|常用|词族|易混|对应|高频|核心|必背|词族衍生|常用句型)/u.test(text)
}

/** @returns {Entry | null} */
function entryFromSegment(seg) {
  const body = stripMdDecorations(seg.trim())
  if (!body || body.length > MD_WORD_MAX_LEN * 2) return null

  const colon = entryFromColon(body)
  if (colon) return colon

  const posM = body.match(/^(.+?)\s+([a-z]{1,6})\.(?:\/?([a-z]{1,6})\.)?\s*([\u4e00-\u9fff].+)$/iu)
  if (posM) {
    const { word, ipa } = splitWordAndIpa(stripMdDecorations(posM[1]))
    if (!word) return null
    const zh = posM[4].trim()
    return {
      word,
      ...(ipa ? { ipa } : {}),
      senses: [{ pos: posM[2].replace(/\.$/, ''), zh }],
    }
  }

  const ez = splitEnglishChinese(body)
  if (ez) {
    const { word, ipa } = splitWordAndIpa(ez.en)
    if (!word) return null
    return {
      word,
      ...(ipa ? { ipa } : {}),
      senses: sensesFromTail(ez.zh),
    }
  }

  return null
}

/** @param {string} stripped @returns {Entry[]} */
function entriesFromInlineBold(stripped) {
  if (!/\*\*[^*]+\*\*/.test(stripped)) return []
  const out = []
  const re = /\*\*([^*]+)\*\*/gu
  let m
  while ((m = re.exec(stripped)) !== null) {
    const inner = m[1].trim()
    const after = stripped.slice(m.index + m[0].length)
    const ez = splitEnglishChinese(inner)
    if (ez) {
      const { word, ipa } = splitWordAndIpa(ez.en)
      if (word) {
        out.push({
          word,
          ...(ipa ? { ipa } : {}),
          senses: sensesFromTail(ez.zh),
        })
      }
      continue
    }
    const afterZh = after.match(/^\s*([\u4e00-\u9fff][^*、]*)/u)
    if (afterZh) {
      const { word, ipa } = splitWordAndIpa(inner)
      if (word) {
        out.push({
          word,
          ...(ipa ? { ipa } : {}),
          senses: [{ zh: afterZh[1].trim() }],
        })
      }
      continue
    }
    const tail = inner.match(/\s+([\u4e00-\u9fff].+)$/u)
    if (tail) {
      const { word, ipa } = splitWordAndIpa(inner.slice(0, tail.index).trim())
      if (word) {
        out.push({
          word,
          ...(ipa ? { ipa } : {}),
          senses: [{ zh: tail[1].trim() }],
        })
      }
    }
  }
  return out
}

/** @returns {Entry[]} */
function entriesFromBody(body) {
  const trimmed = stripMdDecorations(body)
  if (!trimmed) return []

  const single = entryFromSegment(trimmed)
  if (single) return [single]

  if (!/[；;|]/.test(trimmed)) {
    if (/^[a-zA-Z][a-zA-Z0-9\s/'.+?-]*$/u.test(trimmed) && trimmed.length <= MD_WORD_MAX_LEN) {
      const { word, ipa } = splitWordAndIpa(trimmed)
      if (word) return [{ word, ...(ipa ? { ipa } : {}), senses: [{ zh: NOTE_GLOSS }] }]
    }
    return []
  }

  const out = []
  for (const part of trimmed.split(/[；;]/).map((p) => p.trim()).filter(Boolean)) {
    const e = entryFromSegment(part)
    if (e) out.push(e)
  }
  return out
}

/** @param {string} t */
function isIgnorableYasiLine(t) {
  if (!t) return true
  if (isMarkdownMetaLine(t)) return true
  if (/^---\s*$/.test(t)) return true
  if (/^#{1,2}\s+\d{4}\b/.test(t)) return true

  if (/^#{4,6}\s+/.test(t)) {
    const inner = t.replace(/^#{1,6}\s+/, '').trim()
    if (!/[：:]/.test(inner)) {
      if (/^[\u4e00-\u9fff（(【]/.test(inner)) return true
      if (/^(Everyone|Traditional|Cities|This method|The two|Walk|provide insight)/i.test(inner)) return true
      if (isSectionLabel(inner)) return true
    }
  }

  if (/^\d+\.\s/.test(t)) return true
  if (
    /^[\u4e00-\u9fff（(【]/.test(t) &&
    !/[a-zA-Z]{2,}/.test(t) &&
    !/\*\*[^*]+\*\*/.test(t)
  ) {
    return true
  }
  if (/^(Traditional|Cities|This method|The two|Everyone has|walk)\b/i.test(t)) return true
  if (/^[A-Za-z][^.]{12,}\.\s*$/u.test(t) && /\s(the|a|an|is|are|has|have|skills|committee)\s/i.test(t)) {
    return true
  }

  return false
}

/** @param {string} block */
function glossFromInThatBlock(block) {
  const m =
    block.match(/- in that\s+([^\n#-]+)/i) ||
    block.match(/核心意思[：:]\s*\*\*([^*]+)\*\*/u) ||
    block.match(/核心意思[：:]\s*([^\n#]+)/u)
  return m ? stripMdDecorations(m[1]).trim() : '因为；在于；由于'
}

/** @param {Map<string, Entry>} byWord @param {Entry} e */
function mergeEntry(byWord, e) {
  const key = e.word.toLowerCase()
  const prev = byWord.get(key)
  if (prev) {
    prev.senses.push(...e.senses)
    if (!prev.ipa && e.ipa) prev.ipa = e.ipa
  } else {
    byWord.set(key, {
      word: e.word,
      ...(e.ipa ? { ipa: e.ipa } : {}),
      senses: [...e.senses],
    })
  }
}

/**
 * @param {string} text
 * @returns {{ entries: Entry[], badLineNumbers: number[], format: 'markdown' }}
 */
export function parseYasiMarkdownText(text) {
  const lines = text.split(/\r?\n/)
  const byWord = new Map()
  const badLineNumbers = []

  /** @type {{ phrase: string, collectBullets?: boolean } | null} */
  let pending = null
  /** @type {string | null} */
  let pendingHeading = null

  const clearPending = () => {
    pending = null
  }

  const flushPending = (zh) => {
    if (!pending || !zh?.trim()) {
      clearPending()
      return
    }
    const { word } = splitWordAndIpa(pending.phrase)
    if (word) {
      mergeEntry(byWord, { word, senses: [{ zh: zh.trim() }] })
    }
    clearPending()
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const quoted = stripBlockquote(raw)
    const stripped = quoted.replace(/^[-*+]\s+/, '').trim()
    if (!quoted || isIgnorableYasiLine(quoted)) continue

    const h4 = quoted.match(/^####\s+(.+)$/u)
    if (h4) {
      clearPending()
      pendingHeading = null
      const body = stripMdDecorations(h4[1])
      const entries = entriesFromBody(body)
      if (entries.length) {
        for (const e of entries) mergeEntry(byWord, e)
      } else {
        const { word } = splitWordAndIpa(body)
        if (word) pendingHeading = word
      }
      continue
    }

    if (pendingHeading === 'in that' && quoted.includes('in that')) {
      mergeEntry(byWord, {
        word: 'in that',
        senses: [{ zh: glossFromInThatBlock(quoted) }],
      })
      pendingHeading = null
      continue
    }

    if (pendingHeading && !quoted.startsWith('#')) {
      const ez = splitEnglishChinese(stripped || quoted)
      if (ez) {
        mergeEntry(byWord, {
          word: pendingHeading,
          senses: sensesFromTail(ez.zh),
        })
        pendingHeading = null
        continue
      }
      if (/^[\u4e00-\u9fff]/.test(stripped) && stripped.length < 200) {
        mergeEntry(byWord, { word: pendingHeading, senses: [{ zh: stripped }] })
        pendingHeading = null
        continue
      }
    }

    const boldLine = quoted.match(/^\*\*([^*]+)\*\*(.*)$/u)
    if (boldLine) {
      clearPending()
      pendingHeading = null
      const phrase = boldLine[1].trim()
      const rest = stripMdDecorations(boldLine[2]).trim()
      if (rest) {
        const combined = entryFromSegment(`${phrase} ${rest}`) || entryFromSegment(`${phrase}：${rest}`)
        if (combined) {
          mergeEntry(byWord, combined)
        } else {
          const { word } = splitWordAndIpa(phrase)
          if (word) mergeEntry(byWord, { word, senses: [{ zh: rest }] })
        }
      } else {
        pending = { phrase, collectBullets: true }
      }
      continue
    }

    if (pending) {
      if (/^-\s+/.test(quoted)) {
        const inner = quoted.replace(/^-\s+/, '').trim()
        const e = entryFromSegment(inner)
        if (e && e.word.toLowerCase() !== splitWordAndIpa(pending.phrase).word.toLowerCase()) {
          mergeEntry(byWord, e)
        } else {
          const ez = splitEnglishChinese(inner)
          const { word } = splitWordAndIpa(ez?.en || pending.phrase)
          if (word) {
            mergeEntry(byWord, {
              word,
              senses: [{ zh: ez?.zh || inner }],
            })
          }
        }
        continue
      }
      if (/^[\u4e00-\u9fff]/.test(stripped)) {
        flushPending(stripped)
        continue
      }
      pending = null
    }

    let body = stripped || quoted
    const heading = quoted.match(/^#{1,6}\s+(.+)$/u)
    if (heading) {
      body = stripMdDecorations(heading[1])
      if (isSectionLabel(body) && !/[：:]/.test(body)) continue
    } else if (quoted.startsWith('#')) {
      continue
    }

    if (/^-\s+/.test(quoted)) {
      const inner = quoted.replace(/^-\s+/, '').trim()
      const fromList = entriesFromBody(inner)
      if (fromList.length) {
        pendingHeading = null
        clearPending()
        for (const e of fromList) mergeEntry(byWord, e)
        continue
      }
    }

    const inlineBold = entriesFromInlineBold(quoted)
    if (inlineBold.length) {
      pendingHeading = null
      for (const e of inlineBold) mergeEntry(byWord, e)
      continue
    }

    const parsedList = entriesFromBody(body)
    if (parsedList.length) {
      pendingHeading = null
      for (const e of parsedList) mergeEntry(byWord, e)
      continue
    }

    if (pendingHeading && splitEnglishChinese(body)) {
      continue
    }

    if (!isIgnorableYasiLine(quoted)) badLineNumbers.push(i + 1)
  }

  if (pendingHeading) {
    mergeEntry(byWord, {
      word: pendingHeading,
      senses: [{ zh: NOTE_GLOSS }],
    })
  }

  return {
    entries: [...byWord.values()],
    badLineNumbers,
    format: /** @type {const} */ ('markdown'),
  }
}

export function detectYasiMarkdown(text) {
  if (/\n---\s*\n[\s\S]*?^tags:\s/m.test(text) && /^####\s+/m.test(text)) return true
  if (/\n\s*#{4}\s+\S+/m.test(text)) return true
  if (/^\s*>\s*[-*+]\s+\S+/m.test(text)) return true
  return false
}
