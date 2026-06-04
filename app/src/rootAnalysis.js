import { hasJapaneseText } from './japaneseSentence.js'
import {
  decomposeEtymology,
  summarizePie,
  getCanonicalRootKeysFromParts,
  formatMorphBreakdown,
  buildLiteralEvolution,
  formatMorphLine,
} from './etymologyData.js'
import {
  isCompoundMorphology,
  getCompoundFamilyKey,
  buildCompoundEvolution,
} from './compoundMorphology.js'

/** @typedef {{ type: 'prefix' | 'suffix' | 'root' | 'kanji' | 'connect', part: string, meaning: string, etymology?: string }} MorphPart */
/** @typedef {{ word: string, zh?: string, pos?: string, morphBreakdown?: string }} FamilyWord */
/** @typedef {{ word: string, pos: string, zh: string, morphBreakdown?: string }} DerivativeWord */
/** @typedef {{ label: string, zh?: string }} RelatedNote */
/** @typedef {{ type: 'prefix' | 'suffix' | 'root', label: string, meaning: string, examples: FamilyWord[] }} AffixGroup */
/** @typedef {{
 *   gloss: string,
 *   morphKind?: 'classical' | 'compound',
 *   prefixLine: string,
 *   rootLine: string,
 *   suffixLine: string,
 *   evolution: string,
 *   targetFormula?: string,
 *   affixGroups?: AffixGroup[],
 *   parts: MorphPart[],
 *   pieSummary?: string,
 *   family: FamilyWord[],
 *   derivatives: DerivativeWord[],
 *   bookSameRoot?: DerivativeWord[],
 *   themeTopic?: string,
 *   themeSummary?: string,
 *   themeWords?: DerivativeWord[],
 *   relatedNotes: RelatedNote[],
 *   tips: string[],
 *   insight?: string,
 *   strictEtymology?: boolean,
 *   source?: 'local' | 'deepseek',
 *   schemaVersion?: number,
 * }} RootAnalysis */

/** @typedef {{ word: string, senses: { pos?: string, zh: string }[], ipa?: string, rootAnalysis?: RootAnalysis }} PoolEntry */

const KANJI_HINTS = {
  移: '移动、迁移',
  転: '转、迁移',
  合: '合并、符合',
  体: '身体、整体',
  像: '形象、肖像',
  概: '概要',
  要: '要点',
  保: '保持',
  持: '保持、持有',
  接: '接触、连接',
  触: '接触',
  活: '活跃、生活',
  発: '发生、发展',
  物: '事物',
  事: '事情',
  即: '立即',
  座: '座位、就座',
  興: '兴趣、兴奋',
  奮: '兴奋',
  落: '落下、低落',
  胆: '胆量',
  入: '进入',
  交: '交错、交往',
  話: '说话',
  受: '接受',
  止: '停止',
  自: '自己',
  慢: '骄傲、慢',
  学: '学习',
  年: '年、年级',
  上: '上面、上级',
  位: '位置',
  永: '永久',
  氷: '冰',
  解: '解开、解决',
  妖: '妖怪、可疑',
  退: '后退、衰退',
  屈: '弯曲、无聊',
  挫: '挫折',
  折: '折断',
  扱: '处理',
  恐: '恐惧',
  竜: '龙',
  映: '映照',
  作: '制作',
  品: '物品',
  伝: '传达',
  達: '达到',
  妨: '妨碍',
  害: '损害',
  背: '背后',
  景: '景色、背景',
  憧: '憧憬',
  憬: '憧憬',
  確: '确定',
  定: '确定',
  申: '申请',
  込: '进入、深入',
  都: '都市',
  貸: '借出',
  切: '切、全部',
  快: '愉快',
  不: '不',
  根: '根本、词根',
  本: '根本',
  構: '结构',
  造: '制造',
  詞: '词语',
  語: '语言',
  読: '读',
  書: '写',
  記: '记录',
  憶: '记忆',
}

/** @param {PoolEntry} e */
function primaryGloss(e) {
  return e.senses.map((s) => s.zh).filter(Boolean).join('；')
}

/** @param {string} w */
function englishToken(w) {
  return w.toLowerCase().replace(/[^a-z]/g, '')
}

/** @param {string | undefined} raw @param {string} word */
export function normalizePos(raw, word) {
  const s = String(raw || '').toLowerCase()
  if (/^n\.?$|^noun|^名词|^名/.test(s)) return 'n'
  if (/^v\.?$|^verb|^动词|^动/.test(s)) return 'v'
  if (/^adj|^a\.?$|^形容词|^形/.test(s)) return 'adj'
  if (/^adv|^ad\.?$|^副词|^副/.test(s)) return 'adv'
  const w = englishToken(word)
  if (w.endsWith('ly') && w.length > 3) return 'adv'
  if (/(tion|sion|ment|ness|ity|ence|ance|ship|dom|ism|ist|ure|age)$/.test(w)) return 'n'
  if (/(ify|ize|ise)$/.test(w) || (w.endsWith('ate') && w.length > 4)) return 'v'
  if (/(al|ive|ous|ic|able|ible|ful|less|ant|ent|ary|ory|y)$/.test(w)) return 'adj'
  return 'other'
}

export const POS_LABELS = {
  n: '名词',
  v: '动词',
  adj: '形容词',
  adv: '副词',
  other: '其他',
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {string[]} myRootKeys
 * @param {number} max
 */
function findDerivativesInPool(entry, pool, myRootKeys, max = 10) {
  if (!myRootKeys.length) return []

  const self = entry.word.toLowerCase()
  /** @type {DerivativeWord[]} */
  const out = []
  const seen = new Set([self])
  const wantPos = new Set(['n', 'v', 'adj', 'adv'])

  for (const other of pool) {
    if (other.word.toLowerCase() === self) continue
    const otherToken = englishToken(other.word.split(/\s+/)[0])
    const otherParts = decomposeEtymology(otherToken)
    if (!otherParts?.length || isCompoundMorphology(otherParts)) continue
    const otherKeys = getCanonicalRootKeysFromParts(otherParts)
    if (!myRootKeys.some((k) => otherKeys.includes(k))) continue

    const key = other.word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const sensePos = other.senses.find((s) => s.pos)?.pos
    const pos = normalizePos(sensePos, other.word)
    out.push({
      word: other.word,
      pos,
      zh: primaryGloss(other),
      morphBreakdown: formatMorphBreakdown(otherParts),
    })
  }

  out.sort((a, b) => {
    const pa = wantPos.has(a.pos) ? 0 : 1
    const pb = wantPos.has(b.pos) ? 0 : 1
    if (pa !== pb) return pa - pb
    const order = { n: 0, v: 1, adj: 2, adv: 3, other: 4 }
    return (order[a.pos] ?? 9) - (order[b.pos] ?? 9)
  })

  const picked = []
  const posCount = { n: 0, v: 0, adj: 0, adv: 0, other: 0 }
  for (const d of out) {
    if (picked.length >= max) break
    if (d.pos !== 'other' && posCount[d.pos] >= 3) continue
    picked.push(d)
    posCount[d.pos] = (posCount[d.pos] || 0) + 1
  }
  for (const d of out) {
    if (picked.length >= max) break
    if (!picked.some((p) => p.word === d.word)) picked.push(d)
  }
  return picked.slice(0, max)
}

/**
 * 从词书中找出与 entry 共享词源血统的同根词（供雅思词书联动展示）。
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {number} [max]
 * @returns {DerivativeWord[]}
 */
export function findBookSameRootWords(entry, pool, max = 10) {
  const token = englishToken(entry.word.split(/\s+/)[0])
  const parts = decomposeEtymology(token) || []
  if (isCompoundMorphology(parts)) {
    return findCompoundFamily(entry, pool, parts)
      .map((f) => ({
        word: f.word,
        pos: normalizePos(f.pos, f.word),
        zh: f.zh || '',
        morphBreakdown: f.morphBreakdown,
      }))
      .slice(0, max)
  }
  if (!parts.length) return []
  const keys = getCanonicalRootKeysFromParts(parts)
  return findDerivativesInPool(entry, pool, keys, max)
}

/**
 * DeepSeek 结果合并词书内同根词；本地分析已在 derivatives 中含词书匹配，无需重复。
 * @param {RootAnalysis | null | undefined} analysis
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @returns {RootAnalysis | null | undefined}
 */
export function withBookSameRoot(analysis, entry, pool) {
  if (!analysis || !pool.length || hasJapaneseText(entry.word)) return analysis
  if (analysis.source !== 'deepseek') return analysis

  const bookWords = findBookSameRootWords(entry, pool, 12)
  if (!bookWords.length) return analysis

  const seen = new Set([
    entry.word.toLowerCase(),
    ...(analysis.derivatives?.map((d) => d.word.toLowerCase()) ?? []),
    ...(analysis.family?.map((f) => f.word.toLowerCase()) ?? []),
  ])
  const bookSameRoot = bookWords.filter((w) => !seen.has(w.word.toLowerCase()))
  if (!bookSameRoot.length) return analysis
  return { ...analysis, bookSameRoot }
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {string[]} myRootKeys
 */
function findEtymologicalFamily(entry, pool, myRootKeys) {
  return findDerivativesInPool(entry, pool, myRootKeys, 4).map((d) => ({
    word: d.word,
    zh: d.zh,
    morphBreakdown: d.morphBreakdown,
    pos: d.pos,
  }))
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {MorphPart[]} parts
 */
function findCompoundFamily(entry, pool, parts) {
  const key = getCompoundFamilyKey(parts)
  if (!key) return []

  const tailRoot = [...parts].reverse().find((p) => p.type === 'root')?.part
  const self = entry.word.toLowerCase()
  /** @type {FamilyWord[]} */
  const exact = []
  /** @type {FamilyWord[]} */
  const tail = []
  const seen = new Set([self])

  for (const other of pool) {
    if (other.word.toLowerCase() === self) continue
    const otherToken = englishToken(other.word.split(/\s+/)[0])
    const op = decomposeEtymology(otherToken)
    if (!op?.length || !isCompoundMorphology(op)) continue
    const ok = getCompoundFamilyKey(op)
    if (!ok) continue

    const wkey = other.word.toLowerCase()
    if (seen.has(wkey)) continue
    seen.add(wkey)

    const item = {
      word: other.word,
      zh: primaryGloss(other),
      morphBreakdown: formatMorphBreakdown(op),
    }

    if (ok === key) exact.push(item)
    else if (tailRoot && op.some((p) => p.type === 'root' && p.part === tailRoot)) tail.push(item)
  }

  return [...exact, ...tail].slice(0, 4)
}

/**
 * @param {import('./wordRelations.js').RelationItem[]} noteRoots
 * @returns {RelatedNote[]}
 */
function mapRelatedNotes(noteRoots) {
  return noteRoots
    .filter((n) => n.label)
    .map((n) => ({ label: n.label, ...(n.zh ? { zh: n.zh } : {}) }))
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {import('./wordRelations.js').RelationItem[]} noteRoots
 */
function buildEnglishRootAnalysis(entry, pool, noteRoots) {
  const token = englishToken(entry.word.split(/\s+/)[0])
  const gloss = primaryGloss(entry)
  const relatedNotes = mapRelatedNotes(noteRoots)

  /** @type {MorphPart[]} */
  const parts = decomposeEtymology(token) || []
  const compound = isCompoundMorphology(parts)
  const germanic =
    parts.length === 1 &&
    parts[0].type === 'root' &&
    /Old English|Germanic|Old Norse|Middle English/i.test(parts[0].etymology || '')

  let prefixLine = '无'
  let rootLine = '无'
  let suffixLine = '无'
  let evolution = ''
  let insight = ''
  /** @type {FamilyWord[]} */
  let family = []
  /** @type {DerivativeWord[]} */
  let derivatives = []
  const tips = []
  let myRootKeys = []

  if (parts.length && germanic) {
    prefixLine = '无'
    rootLine = `${parts[0].part}（${parts[0].meaning}）← ${parts[0].etymology || ''}`
    suffixLine = '无'
    evolution = `${parts[0].part}（${parts[0].etymology?.split(';')[0] || parts[0].meaning}）→ ${gloss}`
    insight = '日耳曼本土词：无拉丁/希腊前后缀，整词即古英语词干，可沿 PIE 追溯。'
    tips.push('构词类型：日耳曼本土词（单一词根，非整词敷衍为拉丁词干）。')
  } else if (parts.length && compound) {
    const pre = parts.filter((p) => p.type === 'prefix')
    const roots = parts.filter((p) => p.type === 'root')
    const suf = parts.filter((p) => p.type === 'suffix')

    prefixLine = pre.length ? formatMorphLine(parts, 'prefix') : '无'
    rootLine = roots.length
      ? roots.map((p) => `${p.part}（${p.meaning}）← ${p.etymology || ''}`).join('；')
      : '无'
    suffixLine = suf.length ? formatMorphLine(parts, 'suffix') : '无（现代合成，无屈折后缀）'
    evolution = buildCompoundEvolution(parts, gloss)
    insight =
      roots.length >= 2
        ? `把两个现代英语词「拼」在一起：${roots.map((r) => r.part).join(' + ')}，语义直接叠加。`
        : pre.length && roots.length
          ? `前缀 ${pre[0].part} 限定方向，词干 ${roots[0].part} 提供核心概念，合成后得到「${gloss}」。`
          : ''
    family = findCompoundFamily(entry, pool, parts)
    derivatives = family.map((f) => ({
      word: f.word,
      pos: normalizePos(f.pos, f.word),
      zh: f.zh || '',
      morphBreakdown: f.morphBreakdown,
    }))
    tips.push('构词类型：现代英语合成法（非拉丁/希腊屈折词干）。')
    tips.push('笔记中的关联词（如 subtle 与 subset）若不同源，不会列入同根词族。')
  } else if (parts.length) {
    prefixLine = formatMorphLine(parts, 'prefix')
    rootLine = formatMorphLine(parts, 'root')
    suffixLine = formatMorphLine(parts, 'suffix')
    evolution = buildLiteralEvolution(parts, gloss)
    const pieSummary = summarizePie(parts)
    myRootKeys = getCanonicalRootKeysFromParts(parts)
    derivatives = findDerivativesInPool(entry, pool, myRootKeys, 10)
    family = derivatives.slice(0, 4).map((d) => ({
      word: d.word,
      zh: d.zh,
      morphBreakdown: d.morphBreakdown,
      pos: d.pos,
    }))
    if (pieSummary) tips.push(`印欧语源：${pieSummary}`)
    tips.push('同根词族仅收录共享同一拉丁/希腊/PIE 词源血统者。')
  } else {
    tips.push(
      `「${entry.word}」暂未拆解；释义：${gloss}。可后续补入词源库。`,
    )
  }

  for (const n of relatedNotes) {
    tips.push(`笔记关联（非同根）：${n.label}${n.zh ? ` — ${n.zh}` : ''}`)
  }

  const pieSummary = compound ? '' : summarizePie(parts)

  return {
    gloss,
    morphKind: germanic ? 'germanic' : compound ? 'compound' : parts.length ? 'classical' : undefined,
    prefixLine,
    rootLine,
    suffixLine,
    evolution,
    parts,
    ...(pieSummary ? { pieSummary } : {}),
    family,
    derivatives,
    relatedNotes,
    tips,
    ...(insight ? { insight } : {}),
    strictEtymology: true,
  }
}

function buildJapaneseRootAnalysis(entry, pool, noteRoots) {
  /** @type {MorphPart[]} */
  const parts = []
  const gloss = primaryGloss(entry)
  const relatedNotes = mapRelatedNotes(noteRoots)

  if (/^[\u30a0-\u30ffー・]+$/u.test(entry.word.replace(/\s/g, ''))) {
    parts.push({
      type: 'root',
      part: entry.word,
      meaning: '外来语（片假名）',
      etymology: '现代日语借词，无印欧语前后缀体系',
    })
  }

  for (const ch of entry.word) {
    if (/[\u3400-\u9fff]/.test(ch)) {
      parts.push({
        type: 'kanji',
        part: ch,
        meaning: KANJI_HINTS[ch] || '汉字（可联想字形）',
        etymology: KANJI_HINTS[ch] ? '常用汉字义' : '未收录单字源',
      })
    }
  }
  if (!parts.length && entry.ipa) {
    parts.push({
      type: 'root',
      part: entry.ipa,
      meaning: '读音（假名）',
      etymology: '训读/音读',
    })
  }

  /** @type {string[]} */
  const tips = []
  if (parts.some((p) => p.type === 'kanji')) {
    tips.push(
      `汉字拆解：${parts
        .filter((p) => p.type === 'kanji')
        .map((p) => `${p.part}＝${p.meaning}`)
        .join('，')}。`,
    )
  }
  const level = entry.senses.find((s) => s.pos)?.pos
  if (level && /^N[1-5]$/.test(level)) {
    tips.push(`JLPT 等级：${level}。`)
  }
  tips.push(`释义：${gloss}`)

  const kanjiParts = parts.filter((p) => p.type === 'kanji')
  return {
    gloss,
    prefixLine: '无（日语汉字词）',
    rootLine: kanjiParts.length
      ? kanjiParts.map((p) => `${p.part}（${p.meaning}）`).join('；')
      : parts.length
        ? parts.map((p) => `${p.part}（${p.meaning}）`).join('；')
        : '无',
    suffixLine: '无',
    evolution: kanjiParts.length
      ? `${kanjiParts.map((p) => p.part).join('')} → ${gloss}`
      : gloss,
    parts,
    family: [],
    derivatives: [],
    relatedNotes,
    tips,
    strictEtymology: false,
  }
}

export function buildRootAnalysis(entry, pool) {
  if (hasJapaneseText(entry.word)) {
    return buildJapaneseRootAnalysis(entry, pool, [])
  }
  return buildEnglishRootAnalysis(entry, pool, [])
}

/** @param {RootAnalysis | undefined} a */
export function hasRootAnalysis(a) {
  if (!a) return false
  return (
    !!a.gloss ||
    (a.parts?.length ?? 0) > 0 ||
    (a.family?.length ?? 0) > 0 ||
    (a.derivatives?.length ?? 0) > 0 ||
    (a.themeWords?.length ?? 0) > 0 ||
    !!a.themeTopic ||
    (a.tips?.length ?? 0) > 0 ||
    !!a.evolution ||
    !!a.pieSummary ||
    !!a.insight
  )
}

export function attachRootAnalysis(entry, pool) {
  const rootAnalysis = buildRootAnalysis(entry, pool)
  return { ...entry, rootAnalysis }
}
