import { hasJapaneseText } from './japaneseSentence.js'

const PROXY = '/api/quword'
const FETCH_MS = 12000

/** @typedef {{ word: string, zh: string, morphBreakdown?: string }} QuwordExample */
/** @typedef {{ heading: string, detailUrl?: string, meaning?: string, source?: string, cognates: string[] }} QuwordSearchSection */
/** @typedef {{ meaning: string, examples: QuwordExample[] }} QuwordMeaningGroup */
/** @typedef {{ label: string, groups: QuwordMeaningGroup[] }} QuwordAffixDetail */
/** @typedef {{ word: string, zhEtymology?: string, enEtymology?: string, search: { sections: QuwordSearchSection[] }, affixDetails: QuwordAffixDetail[] }} QuwordPack */

/** @param {string} word */
export function quwordLookupToken(word) {
  const t = String(word ?? '').trim().toLowerCase()
  if (!t || hasJapaneseText(t)) return ''
  const first = t.split(/\s+/)[0].replace(/[^a-z'-]/g, '')
  return first.length >= 2 ? first : t.replace(/[^a-z'-]/g, '')
}

/** @param {string} html */
function stripTags(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&#13;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** @param {string} html */
function extractArticle(html) {
  const m = html.match(/<div id="article"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
  if (m) return m[1]
  const m2 = html.match(/id="yd-ciyuan"[\s\S]*?<\/div>/i)
  return m2 ? html : null
}

/**
 * @param {string} path 如 /root/search?wd=progress
 */
async function fetchQuwordHtml(path) {
  const url = path.startsWith('http') ? path : `${PROXY}${path.startsWith('/') ? path : `/${path}`}`
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), FETCH_MS)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'text/html' },
    })
    if (!r.ok) throw new Error(`quword ${r.status}`)
    return await r.text()
  } finally {
    window.clearTimeout(timer)
  }
}

/** @param {string} html @returns {{ sections: QuwordSearchSection[] } | null} */
export function parseRootSearchHtml(html) {
  const article = extractArticle(html)
  if (!article) return null

  /** @type {QuwordSearchSection[]} */
  const sections = []
  const blocks = article.split(/<h2>/i).slice(1)
  for (const block of blocks) {
    const headingHtml = block.split(/<\/h2>/i)[0] || ''
    const body = block.split(/<\/h2>/i).slice(1).join('</h2>')
    const heading = stripTags(headingHtml)
    if (!heading) continue
    const detailUrl = headingHtml.match(/href="(\/root\/id\/\d+)"/i)?.[1]
    const meaning =
      body.match(/【词根含义】[：:]\s*([^<\n]+)/)?.[1]?.trim() ||
      body.match(/【来源及含义】[^<]*<\/p>\s*<p>([^<]+)/)?.[1]?.trim()
    const source = body.match(/【词根来源】[：:]\s*([^<\n]+)/)?.[1]?.trim()
    const cognates = [...body.matchAll(/class="cognate"[^>]*>([^<]+)</gi)].map((x) => x[1].trim())
    sections.push({
      heading,
      ...(detailUrl ? { detailUrl } : {}),
      ...(meaning ? { meaning } : {}),
      ...(source ? { source } : {}),
      cognates: cognates.slice(0, 15),
    })
  }
  return sections.length ? { sections } : null
}

/** @param {string} html @returns {QuwordAffixDetail | null} */
export function parseRootDetailHtml(html) {
  const article = extractArticle(html)
  if (!article) return null

  const titleRaw = article.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] || ''
  const label = stripTags(titleRaw).replace(/^(前缀|词根|后缀)[：:]\s*/u, '').trim()
  if (!label) return null

  /** @type {QuwordMeaningGroup[]} */
  const groups = []
  /** @type {QuwordMeaningGroup | null} */
  let current = null

  for (const p of article.matchAll(/<p>([\s\S]*?)<\/p>/gi)) {
    const inner = p[1]
    const plain = stripTags(inner)
    if (!plain) continue

    if (/^[①②③④⑤]/.test(plain) && !/<a\s/i.test(inner)) {
      if (current?.examples.length) groups.push(current)
      current = { meaning: plain, examples: [] }
      continue
    }

    const exM = inner.match(/<a[^>]+href="\/w\/[^"]+"[^>]*>([^<]+)<\/a>\s*([\s\S]*)/i)
    if (!exM) continue
    if (!current) current = { meaning: label, examples: [] }

    const word = exM[1].trim()
    const rest = stripTags(exM[2])
    const morphM = rest.match(/[（(]([^）)]+)[）)]/)
    const zh = rest.replace(/[（(][^）)]+[）)]/g, '').trim()

    current.examples.push({
      word,
      zh,
      ...(morphM ? { morphBreakdown: morphM[1].trim() } : {}),
    })
  }
  if (current?.examples.length) groups.push(current)

  return groups.length ? { label, groups } : null
}

/** @param {string} html */
export function parseWordPageHtml(html) {
  const zhBlock = html.match(/id="yd-ciyuan"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const zhEtymology = zhBlock ? stripTags(zhBlock.replace(/<span class="ciyuan-title">[\s\S]*?<\/span>/i, '')) : ''
  const enBlock = html.match(/id="yd-etym"[^>]*>([\s\S]*?)<\/dl>/i)?.[1]
  const enEtymology = enBlock ? stripTags(enBlock).slice(0, 1200) : ''
  return {
    ...(zhEtymology ? { zhEtymology } : {}),
    ...(enEtymology ? { enEtymology } : {}),
  }
}

/** @param {string} word @returns {Promise<QuwordPack | null>} */
export async function fetchQuwordPack(word) {
  const token = quwordLookupToken(word)
  if (!token) return null

  try {
    const searchHtml = await fetchQuwordHtml(`/root/search?wd=${encodeURIComponent(token)}`)
    const search = parseRootSearchHtml(searchHtml)
    if (!search) return null

    let wordNote = {}
    try {
      const wordHtml = await fetchQuwordHtml(`/w/${encodeURIComponent(token)}`)
      wordNote = parseWordPageHtml(wordHtml)
    } catch {
      /* optional */
    }

    const urls = [...new Set(search.sections.map((s) => s.detailUrl).filter(Boolean))].slice(0, 3)
    /** @type {QuwordAffixDetail[]} */
    const affixDetails = []
    for (const url of urls) {
      try {
        const html = await fetchQuwordHtml(url)
        const detail = parseRootDetailHtml(html)
        if (detail) affixDetails.push(detail)
      } catch {
        /* skip one affix page */
      }
    }

    return {
      word: token,
      search,
      affixDetails,
      ...wordNote,
    }
  } catch {
    return null
  }
}

/** @param {QuwordPack | null} pack @param {number} [maxExamples] */
export function formatQuwordForPrompt(pack, maxExamples = 40) {
  if (!pack) return ''
  const lines = [`【趣词 quword.com 抓取 · ${pack.word}】`]

  if (pack.zhEtymology) lines.push(`中文词源：${pack.zhEtymology}`)
  if (pack.enEtymology) lines.push(`英文词源摘录：${pack.enEtymology.slice(0, 600)}`)

  for (const sec of pack.search.sections) {
    lines.push(`\n${sec.heading}`)
    if (sec.meaning) lines.push(`含义：${sec.meaning}`)
    if (sec.source) lines.push(`来源：${sec.source}`)
    if (sec.cognates.length) lines.push(`同源词：${sec.cognates.join('、')}`)
  }

  let exCount = 0
  for (const aff of pack.affixDetails) {
    lines.push(`\n【${aff.label} 举例】`)
    for (const g of aff.groups) {
      lines.push(g.meaning)
      for (const ex of g.examples) {
        if (exCount >= maxExamples) break
        lines.push(
          `- ${ex.word} ${ex.zh}${ex.morphBreakdown ? `（${ex.morphBreakdown}）` : ''}`,
        )
        exCount += 1
      }
    }
  }

  lines.push(
    '\n请优先依据以上趣词资料整理 JSON；affixGroups 保留趣词举例格式（morphBreakdown 如 pro+gress走→向前走）；不足处再补充雅思常考词。',
  )
  return lines.join('\n')
}

/** @param {string} heading @param {string} label */
function inferAffixType(heading, label) {
  if (/前缀/u.test(heading) || (label.endsWith('-') && !label.startsWith('-'))) return 'prefix'
  if (/后缀/u.test(heading) || label.startsWith('-')) return 'suffix'
  return 'root'
}

/** @param {QuwordPack} pack @returns {import('./rootAnalysis.js').AffixGroup[]} */
export function affixGroupsFromQuwordPack(pack) {
  if (!pack) return []
  /** @type {import('./rootAnalysis.js').AffixGroup[]} */
  const groups = []
  const seen = new Set()

  for (const aff of pack.affixDetails || []) {
    for (const g of aff.groups) {
      const key = `${aff.label}:${g.meaning}`
      if (seen.has(key) || !g.examples.length) continue
      seen.add(key)
      groups.push({
        type: inferAffixType('', aff.label),
        label: aff.label,
        meaning: g.meaning,
        examples: g.examples.slice(0, 16),
      })
    }
  }

  for (const sec of pack.search?.sections || []) {
    const label = sec.heading.replace(/^(词根|前缀|后缀|词根词缀)[：:]\s*/u, '').trim()
    if (!label) continue
    const key = `sec:${label}`
    if (seen.has(key)) continue
    const meaning = [sec.meaning, sec.source].filter(Boolean).join('；') || sec.heading
    const examples = (sec.cognates || []).map((w) => ({ word: w, zh: '' }))
    if (!examples.length && groups.some((g) => g.label.includes(label) || label.includes(g.label))) continue
    seen.add(key)
    groups.push({
      type: inferAffixType(sec.heading, label),
      label,
      meaning,
      examples: examples.slice(0, 12),
    })
  }

  return groups.filter((g) => g.examples.length > 0).slice(0, 5)
}

/**
 * @param {import('./rootAnalysis.js').RootAnalysis} analysis
 * @param {QuwordPack | null} pack
 */
export function mergeQuwordIntoAnalysis(analysis, pack) {
  if (!analysis || !pack) return analysis
  const fromQw = affixGroupsFromQuwordPack(pack)
  if (!fromQw.length) return analysis

  const tips = [...(analysis.tips || [])]
  if (!tips.some((t) => t.includes('趣词'))) tips.push('参考趣词词典 quword.com')

  return {
    ...analysis,
    affixGroups: analysis.affixGroups?.length ? analysis.affixGroups : fromQw,
    ...(pack.zhEtymology && analysis.rootLine === '无'
      ? { rootLine: pack.zhEtymology.slice(0, 200) }
      : {}),
    tips,
  }
}

/**
 * @param {import('./rootAnalysis.js').RootAnalysis | null | undefined} analysis
 * @param {string} word
 */
export async function enrichAnalysisWithQuword(analysis, word) {
  if (!analysis || analysis.affixGroups?.length) return analysis ?? null
  try {
    const pack = await fetchQuwordPack(word)
    return mergeQuwordIntoAnalysis(analysis, pack)
  } catch {
    return analysis
  }
}
