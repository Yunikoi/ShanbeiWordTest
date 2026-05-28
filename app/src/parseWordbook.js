/**
 * 解析词书行，支持：
 * - 单词 | 词性.释义（仅当「|」出现在词条与释义分界时：| 在首段冒号之前）
 * - 词条：释义…（释义内可用 | 分成大组，组内用；或 ; 拆成多个义项）
 * - 词条,释义1；释义2
 * - # 注释行、【章节标题】行忽略
 * Obsidian Yasi.md：见 parseYasiMarkdown.js
 * Obsidian JLPT*.md：见 parseJlptMarkdown.js
 */

import { detectYasiMarkdown, parseYasiMarkdownText } from './parseYasiMarkdown.js'
import { detectJlptMarkdown, parseJlptMarkdownText } from './parseJlptMarkdown.js'
import { firstWordDelimiterColon, sensesFromColonTail, splitWordAndIpa } from './parseWordbookCore.js'

export { splitWordAndIpa, firstWordDelimiterColon, sensesFromColonTail } from './parseWordbookCore.js'

/**
 * @param {string} line
 * @returns {{ word: string, ipa?: string, senses: import('./parseWordbookCore.js').Sense[] } | null}
 */
export function parseWordbookLine(line) {
  const raw = line.trim()
  if (!raw || raw.startsWith('#')) return null
  if (/^【[^】]*】\s*$/.test(raw)) return null

  const pipeIdx = raw.indexOf('|')
  const colon = firstWordDelimiterColon(raw)

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

/** @param {{ word: string, ipa?: string, senses: import('./parseWordbookCore.js').Sense[] }} parsed */
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

/** @param {string} text */
export function parsePlainWordbookText(text) {
  return collectWordbookEntries(text, parseWordbookLine, isIgnorablePlainLine)
}

/** @deprecated 使用 parseYasiMarkdownText */
export function parseMarkdownWordbookText(text) {
  return parseYasiMarkdownText(text)
}

export function detectMarkdownWordbook(text) {
  return detectYasiMarkdown(text)
}

/**
 * @param {string} text
 * @returns {{ entries: { word: string, senses: import('./parseWordbookCore.js').Sense[] }[], badLineNumbers: number[], format: 'jlpt' | 'markdown' | 'plain' }}
 */
export function parseWordbookText(text) {
  if (detectJlptMarkdown(text)) {
    const result = parseJlptMarkdownText(text)
    return { ...result, format: 'jlpt' }
  }
  if (detectYasiMarkdown(text)) {
    const result = parseYasiMarkdownText(text)
    return { ...result, format: 'markdown' }
  }
  const result = parsePlainWordbookText(text)
  return { ...result, format: 'plain' }
}
