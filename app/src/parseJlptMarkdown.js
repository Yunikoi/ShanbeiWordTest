/**
 * 解析 Obsidian JLPT 笔记（如 JLPT05.md）：
 * - #### **詞（よみ）** [N2]：中文释义
 * - #### 詞（よみ）：释义
 * - #### 外来語 [N3]：释义
 * - #### 合宿（がっしゅく）N2：释义（级别可不带方括号）
 */

/** @typedef {{ pos?: string, zh: string }} Sense */
/** @typedef {{ word: string, ipa?: string, senses: Sense[] }} Entry */

/**
 * @param {string} text
 * @returns {boolean}
 */
export function detectJlptMarkdown(text) {
  const sample = text.slice(0, 12000)
  const jlptTag = (sample.match(/#{4}[^\n]*\[(N[1-5])\]/g) || []).length
  if (jlptTag >= 2) return true
  const jaHead = (sample.match(/#{4}[^\n]*（[\u3040-\u30ff\u31f0-\u31ffーa-zA-Z\s]+）/g) || []).length
  const jaGloss = (sample.match(/#{4}[^\n]*[：:][^\n]*[\u4e00-\u9fff]/g) || []).length
  if (jaHead >= 3 && jaGloss >= 3) return true
  if (jlptTag >= 1 && jaHead >= 2) return true
  return false
}

/**
 * @param {string} raw
 * @returns {Entry | null}
 */
export function parseJlptLine(raw) {
  let line = raw.trim()
  if (!line) return null
  line = line.replace(/^[-*+]\s+/, '').trim()
  if (!line.startsWith('####')) return null

  let body = line.replace(/^#{4}\s+/, '').trim()
  body = body.replace(/\*\*/g, '').trim()
  if (!body) return null

  let level
  const bracketLvl = body.match(/\s*\[(N[1-5])\]\s*/)
  if (bracketLvl) {
    level = bracketLvl[1]
    body = body.replace(bracketLvl[0], ' ').trim()
  }
  const bareLvl = body.match(/\s+(N[1-5])\s*(?=[：:]|$)/)
  if (bareLvl) {
    level = bareLvl[1]
    body = body.replace(bareLvl[0], ' ').trim()
  }

  const colon = body.search(/[：:]/)
  if (colon < 0) return null
  const left = body.slice(0, colon).trim()
  const zh = body.slice(colon + 1).trim()
  if (!left || !zh) return null

  let word = left
  let reading = ''
  const readFull = left.match(/^(.+?)（([^）]+)）\s*$/)
  if (readFull) {
    word = readFull[1].trim()
    reading = readFull[2].trim()
  }

  if (!word) return null

  return {
    word,
    ...(reading ? { ipa: reading } : {}),
    senses: [{ ...(level ? { pos: level } : {}), zh }],
  }
}

/**
 * @param {string} text
 * @returns {{ entries: Entry[], badLineNumbers: number[], format: 'jlpt' }}
 */
export function parseJlptMarkdownText(text) {
  const lines = text.split(/\r?\n/)
  /** @type {Map<string, Entry>} */
  const byWord = new Map()
  const badLineNumbers = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('##') && !trimmed.startsWith('####')) continue
    if (trimmed.startsWith('#') && !trimmed.startsWith('####')) continue

    const parsed = parseJlptLine(lines[i])
    if (!parsed) {
      if (/^[-*+]\s*#{4}\s+/.test(trimmed) || /^#{4}\s+/.test(trimmed)) {
        badLineNumbers.push(i + 1)
      }
      continue
    }

    const key = parsed.word
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

  return {
    entries: [...byWord.values()],
    badLineNumbers,
    format: /** @type {const} */ ('jlpt'),
  }
}
