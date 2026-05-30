import { openaiChatJsonForRoot } from './llmOpenai.js'
import { hasJapaneseText } from './japaneseSentence.js'
import { normalizePos } from './rootAnalysis.js'
import { loadWordRootAnalysis, saveWordRootAnalysis } from './rootAnalysisCache.js'

const SYSTEM_PROMPT = `你是一位精通印欧语源学（PIE）、比较语言学的高级英语词源专家。

铁律：
1. 禁止将整词当作词干敷衍；必须拆到前缀/词根/后缀，或说明是现代合成词（sub+set）。
2. 同根词族必须共享同一拉丁/希腊/PIE 血统；形似不同源不得列入。
3. 单一词根词追溯 PIE；不确定时标明，不捏造。
4. 日语汉字词按汉字拆解，不适用印欧语同根词族。

只输出 JSON，不要 markdown。格式：
{
  "gloss": "核心中文释义",
  "morphKind": "classical|compound|germanic",
  "prefixLine": "前缀说明；无则写「无」",
  "rootLine": "词根及拉丁/希腊/PIE来源",
  "suffixLine": "后缀说明；无则写「无」",
  "evolution": "字面逻辑演变一句话",
  "pieSummary": "PIE 摘要，无则空字符串",
  "insight": "深度记忆心法一两句",
  "family": [{"word":"同根词","zh":"释义","morphBreakdown":"拆解公式","pos":"n|v|adj|adv"}],
  "derivatives": [
    {"word":"structure","pos":"n","zh":"结构","morphBreakdown":"struct + -ure"},
    {"word":"construct","pos":"v","zh":"建造","morphBreakdown":"con- + struct"},
    {"word":"structural","pos":"adj","zh":"结构的","morphBreakdown":"struct + -ural"},
    {"word":"structurally","pos":"adv","zh":"在结构上","morphBreakdown":"structural + -ly"}
  ],
  "tips": ["补充说明"]
}

family：2-4 个，必须真同根（不同前缀/后缀的同血统词）。
derivatives：4-10 个，必须共享同一底层词根，尽量覆盖名词(n)、动词(v)、形容词(adj)、副词(adv)等词性派生；每个词标注 pos（n/v/adj/adv/other）并给出构词拆解。`

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
  const familyRaw = mapWords(o.family).slice(0, 4)
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
    family,
    derivatives: derivatives.length ? derivatives : familyRaw,
    relatedNotes: [],
    tips: Array.isArray(o.tips) ? o.tips.map(String) : [],
    ...(o.insight ? { insight: String(o.insight) } : {}),
    strictEtymology: !hasJapaneseText(String(o.gloss || gloss)),
    source: 'deepseek',
  }
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[], ipa?: string }} entry
 * @param {import('./llmSettings.js').RootLlmSettings} cfg
 * @param {string} [bookId]
 */
export async function fetchRootAnalysisLlm(entry, cfg, bookId) {
  const key = memKey(bookId || '', entry.word)
  const hit = getCachedRootAnalysisLlm(bookId, entry.word)
  if (hit) return hit

  const gloss = entry.senses.map((s) => s.zh).filter(Boolean).join('；')
  const userPrompt = `分析单词：${entry.word}
读音：${entry.ipa || '无'}
释义：${gloss}

请输出完整 JSON，尤其列出 derivatives：同词根的名词/动词/形容词/副词等派生形式（含 pos 与构词拆解）。`

  const raw = await openaiChatJsonForRoot(
    cfg.apiKey,
    cfg.model,
    userPrompt,
    SYSTEM_PROMPT,
  )
  const analysis = toRootAnalysis(raw, gloss)
  cache.set(key, analysis)
  if (bookId) saveWordRootAnalysis(bookId, entry.word, analysis)
  return analysis
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
    if (getCachedRootAnalysisLlm(bookId, entry.word)) {
      cached += 1
      onProgress?.({
        done: i + 1,
        total,
        word: entry.word,
        status: 'cached',
        rootAnalysis: getCachedRootAnalysisLlm(bookId, entry.word),
      })
      continue
    }
    try {
      const rootAnalysis = await fetchRootAnalysisLlm(entry, cfg, bookId)
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
      const rootAnalysis = await fetchRootAnalysisLlm(entry, cfg, bookId)
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
