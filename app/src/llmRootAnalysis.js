import { openaiChatJsonForRoot } from './llmOpenai.js'
import { hasJapaneseText } from './japaneseSentence.js'
import { normalizePos } from './rootAnalysis.js'
import { loadWordRootAnalysis, saveWordRootAnalysis, isRootAnalysisStale, ROOT_ANALYSIS_SCHEMA_VERSION } from './rootAnalysisCache.js'
import { findBookSameRootWords, withBookSameRoot } from './rootAnalysis.js'
import { fetchQuwordPack, formatQuwordForPrompt, mergeQuwordIntoAnalysis } from './quwordClient.js'

const SYSTEM_PROMPT = `你是一位精通印欧语源学的高级英语词源专家，擅长把趣词（quword.com）词根资料整理成结构化学习卡片。

当用户提供【趣词 quword.com 抓取】资料时：
1. 必须优先采用趣词的前缀/词根/后缀含义与举例，保留 morphBreakdown 格式（如 pro+gress走→向前走）。
2. 不得与趣词明显矛盾；趣词未覆盖处可补充雅思 B2–C1 词汇。
3. 无趣词资料时，按词源学常识分析。

分析顺序（JSON 字段对应）：
① target 构词：prefixLine / rootLine / suffixLine / evolution
② affixGroups：每个前缀或词根一组，含含义 + 趣词式举例（8–16 个/组，优先趣词原文）
③ derivatives：同底层词根的雅思派生，按 n/v/adj/adv 标注 pos
④ themeTopic + themeSummary + themeWords：同一雅思主题常考词（6–12 个，不要求同词根）

铁律：
- 禁止整词当词干敷衍；必须拆前缀/词根/后缀。
- 同根词族须共享拉丁/希腊/PIE 血统。
- 日语汉字词不适用印欧语同根词族。

只输出 JSON：
{
  "gloss": "核心中文释义",
  "morphKind": "classical|compound|germanic",
  "prefixLine": "前缀说明；无则「无」",
  "rootLine": "词根及来源",
  "suffixLine": "后缀说明；无则「无」",
  "evolution": "本词 morphBreakdown 格式，如 pro+gress走→向前走→进步",
  "pieSummary": "PIE 摘要，无则空",
  "insight": "记忆心法一两句",
  "affixGroups": [
    {
      "type": "prefix|root|suffix",
      "label": "pro-",
      "meaning": "① 表示「向前，在前」",
      "examples": [{"word":"progress","zh":"进步","morphBreakdown":"pro+gress走→向前走"}]
    }
  ],
  "family": [{"word":"同根词","zh":"释义","morphBreakdown":"拆解","pos":"n|v|adj|adv"}],
  "derivatives": [{"word":"structure","pos":"n","zh":"结构","morphBreakdown":"struct + -ure"}],
  "themeTopic": "雅思主题",
  "themeSummary": "场景说明",
  "themeWords": [{"word":"emission","pos":"n","zh":"排放"}],
  "tips": ["补充说明，可注明「参考趣词词典」"]
}`

/** @type {Map<string, import('./rootAnalysis.js').RootAnalysis>} */
const cache = new Map()

function memKey(bookId, word) {
  const w = word.toLowerCase()
  return bookId ? `${bookId}:${w}` : w
}

/** @param {string} [bookId] @param {string} word */
export function getCachedRootAnalysisLlm(bookId, word) {
  const key = memKey(bookId || '', word)
  if (cache.has(key)) return cache.get(key)
  if (!bookId) return null
  const stored = loadWordRootAnalysis(bookId, word)
  if (stored) cache.set(key, stored)
  return stored
}

/**
 * @param {unknown} raw
 * @param {string} gloss
 * @returns {import('./rootAnalysis.js').RootAnalysis}
 */
function toRootAnalysis(raw, gloss) {
  const o = /** @type {Record<string, unknown>} */ (raw)

  /** @param {unknown} arr */
  function mapWords(arr) {
    if (!Array.isArray(arr)) return []
    return arr
      .map((f) => {
        const x = /** @type {Record<string, string>} */ (f)
        const word = String(x.word || '')
        if (!word) return null
        return {
          word,
          pos: normalizePos(x.pos, word),
          zh: String(x.zh || ''),
          ...(x.morphBreakdown ? { morphBreakdown: String(x.morphBreakdown) } : {}),
        }
      })
      .filter(Boolean)
  }

  const derivatives = mapWords(o.derivatives).slice(0, 10)
  const themeWords = mapWords(o.themeWords).slice(0, 12)
  const familyRaw = mapWords(o.family).slice(0, 4)

  /** @param {unknown} arr */
  function mapAffixGroups(arr) {
    if (!Array.isArray(arr)) return []
    return arr
      .map((item) => {
        const x = /** @type {Record<string, unknown>} */ (item)
        const label = String(x.label || '').trim()
        const meaning = String(x.meaning || '').trim()
        const type = String(x.type || 'root')
        if (!label || !meaning) return null
        const examples = mapWords(x.examples).slice(0, 16)
        if (!examples.length) return null
        return {
          type: /** @type {'prefix'|'root'|'suffix'} */ (
            ['prefix', 'root', 'suffix'].includes(type) ? type : 'root'
          ),
          label,
          meaning,
          examples,
        }
      })
      .filter(Boolean)
  }

  const affixGroups = mapAffixGroups(o.affixGroups).slice(0, 4)
  const family =
    familyRaw.length > 0
      ? familyRaw
      : derivatives.slice(0, 4).map((d) => ({
          word: d.word,
          zh: d.zh,
          morphBreakdown: d.morphBreakdown,
          pos: d.pos,
        }))

  return {
    gloss: String(o.gloss || gloss),
    morphKind: ['classical', 'compound', 'germanic'].includes(String(o.morphKind))
      ? /** @type {'classical'|'compound'|'germanic'} */ (o.morphKind)
      : 'classical',
    prefixLine: String(o.prefixLine || '无'),
    rootLine: String(o.rootLine || '无'),
    suffixLine: String(o.suffixLine || '无'),
    evolution: String(o.evolution || ''),
    parts: [],
    ...(o.pieSummary ? { pieSummary: String(o.pieSummary) } : {}),
    ...(affixGroups.length ? { affixGroups } : {}),
    family,
    derivatives: derivatives.length ? derivatives : familyRaw,
    ...(themeWords.length ? { themeWords } : {}),
    ...(o.themeTopic ? { themeTopic: String(o.themeTopic) } : {}),
    ...(o.themeSummary ? { themeSummary: String(o.themeSummary) } : {}),
    relatedNotes: [],
    tips: Array.isArray(o.tips) ? o.tips.map(String) : [],
    ...(o.insight ? { insight: String(o.insight) } : {}),
    strictEtymology: !hasJapaneseText(String(o.gloss || gloss)),
    source: 'deepseek',
    schemaVersion: ROOT_ANALYSIS_SCHEMA_VERSION,
  }
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[], ipa?: string }} entry
 * @param {import('./llmSettings.js').RootLlmSettings} cfg
 * @param {string} [bookId]
 * @param {Array<{ word: string, senses: { pos?: string, zh: string }[] }>} [pool]
 */
export async function fetchRootAnalysisLlm(entry, cfg, bookId, pool = []) {
  const key = memKey(bookId || '', entry.word)
  const hit = getCachedRootAnalysisLlm(bookId, entry.word)

  let quwordPack = null
  if (!hasJapaneseText(entry.word)) {
    try {
      quwordPack = await fetchQuwordPack(entry.word)
    } catch {
      quwordPack = null
    }
  }

  if (hit && !isRootAnalysisStale(hit)) {
    const merged = mergeQuwordIntoAnalysis(hit, quwordPack)
    return withBookSameRoot(merged, entry, pool) ?? merged
  }

  const gloss = entry.senses.map((s) => s.zh).filter(Boolean).join('；')
  const bookCandidates = pool.length ? findBookSameRootWords(entry, pool, 15) : []
  const bookHint = bookCandidates.length
    ? `\n本雅思词书中检测到可能同根词：${bookCandidates.map((c) => c.word).join('、')}。derivatives 与 family 请优先从此列表选取（保留释义），并补充其他雅思常考同根词。`
    : '\nderivatives 与 family 请优先给出雅思（IELTS）常考、B2–C1 书面语场景的同词根词汇。'

  const quwordBlock = quwordPack ? formatQuwordForPrompt(quwordPack) : ''

  const userPrompt = `分析单词：${entry.word}
读音：${entry.ipa || '无'}
释义：${gloss}
${bookHint}
${quwordBlock ? `\n${quwordBlock}\n` : '\n（未获取到趣词资料，请按词源学分析并补充 affixGroups 举例）\n'}

请输出完整 JSON，顺序：① 本词构词 ② affixGroups（趣词式举例） ③ derivatives（按词性） ④ themeTopic/themeWords`

  const raw = await openaiChatJsonForRoot(
    cfg.apiKey,
    cfg.model,
    userPrompt,
    SYSTEM_PROMPT,
  )
  let analysis = toRootAnalysis(raw, gloss)
  analysis = mergeQuwordIntoAnalysis(analysis, quwordPack)
  cache.set(key, analysis)
  if (bookId) saveWordRootAnalysis(bookId, entry.word, analysis)
  return withBookSameRoot(analysis, entry, pool) ?? analysis
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function enrichBookEntriesWithRootLlm(entries, cfg, opts = {}) {
  const { bookId, onProgress } = opts
  if (!cfg.enabled || !cfg.apiKey.trim() || !bookId) {
    return { analyzed: 0, cached: entries.length, failed: 0, total: entries.length }
  }

  let analyzed = 0
  let cached = 0
  let failed = 0
  const total = entries.length

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (hasJapaneseText(entry.word)) {
      onProgress?.({ done: i + 1, total, word: entry.word, status: 'skip' })
      continue
    }
    const stored = getCachedRootAnalysisLlm(bookId, entry.word)
    if (stored && !isRootAnalysisStale(stored)) {
      cached += 1
      onProgress?.({ done: i + 1, total, word: entry.word, status: 'cached' })
      if (i % 40 === 39) await sleep(0)
      continue
    }
    try {
      const rootAnalysis = await fetchRootAnalysisLlm(entry, cfg, bookId, entries)
      analyzed += 1
      onProgress?.({ done: i + 1, total, word: entry.word, status: 'done', rootAnalysis })
      await sleep(350)
    } catch {
      failed += 1
      onProgress?.({ done: i + 1, total, word: entry.word, status: 'error' })
    }
  }

  return { analyzed, cached, failed, total }
}

/**
 * 开始学习前批量生成词根分析（与例句 LLM 同样策略）。
 * @param {Array<{ word: string, senses: { pos?: string, zh: string }[], ipa?: string, rootAnalysis?: import('./rootAnalysis.js').RootAnalysis }>} queue
 * @param {import('./llmSettings.js').RootLlmSettings} cfg
 * @param {{ onProgress?: (done: number, total: number) => void, bookId?: string }} [opts]
 */
export async function enrichQueueWithRootLlm(queue, cfg, opts = {}) {
  const { onProgress, bookId } = opts
  if (!cfg.enabled || !cfg.apiKey.trim()) return queue

  /** @type {typeof queue} */
  const out = []
  let done = 0
  for (const entry of queue) {
    if (hasJapaneseText(entry.word)) {
      out.push(entry)
      done += 1
      onProgress?.(done, queue.length)
      continue
    }
    const cached = !!getCachedRootAnalysisLlm(bookId, entry.word)
    try {
      const rootAnalysis = await fetchRootAnalysisLlm(entry, cfg, bookId, queue)
      out.push({ ...entry, rootAnalysis })
      if (!cached) await sleep(350)
    } catch {
      out.push(entry)
    }
    done += 1
    onProgress?.(done, queue.length)
  }
  return out
}

export function clearRootAnalysisCache() {
  cache.clear()
}
