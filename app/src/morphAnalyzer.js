/**
 * 通用构词分析器：前缀 → 后缀 → 贪心词根 → 现代合成。
 * @typedef {import('./etymologyData.js').EtyPart} EtyPart
 */

import {
  PREFIX_ETYMOLOGY,
  SUFFIX_ETYMOLOGY,
  ROOT_ETYMOLOGY,
  WORD_LEXICON,
} from './etymologyData.js'
import { decomposeCompound } from './compoundMorphology.js'

const PREFIX_FORMS = Object.keys(PREFIX_ETYMOLOGY).sort((a, b) => b.length - a.length)
const SUFFIX_FORMS = Object.keys(SUFFIX_ETYMOLOGY).sort((a, b) => b.length - a.length)
const ROOT_FORMS = Object.keys(ROOT_ETYMOLOGY).sort((a, b) => b.length - a.length)

const MIN_STEM = 2

/**
 * @param {string} rest
 * @param {EtyPart[]} parts
 */
function stripPrefixes(rest, parts) {
  let guard = 0
  while (guard++ < 8) {
    let hit = false
    for (const p of PREFIX_FORMS) {
      if (!rest.startsWith(p)) continue
      const next = rest.slice(p.length)
      if (next.length < MIN_STEM) continue
      const meta = PREFIX_ETYMOLOGY[p]
      parts.push({
        type: 'prefix',
        part: p.endsWith('-') ? p : `${p}-`,
        meaning: meta.meaning,
        etymology: meta.source,
      })
      rest = next
      hit = true
      break
    }
    if (!hit) break
  }
  return rest
}

/**
 * @param {string} rest
 * @param {EtyPart[]} suffixParts
 */
function stripSuffixes(rest, suffixParts) {
  let guard = 0
  while (guard++ < 8) {
    let hit = false
    for (const s of SUFFIX_FORMS) {
      if (!rest.endsWith(s)) continue
      const next = rest.slice(0, -s.length)
      if (next.length < MIN_STEM) continue
      const meta = SUFFIX_ETYMOLOGY[s]
      suffixParts.unshift({
        type: 'suffix',
        part: s.startsWith('-') ? s : `-${s}`,
        meaning: meta.meaning,
        etymology: meta.source,
      })
      rest = next
      hit = true
      break
    }
    if (!hit) break
  }
  return rest
}

/**
 * 从左到右贪心匹配最长词根（支持 photograph = photo + graph）。
 * @param {string} rest
 * @returns {EtyPart[]}
 */
function greedyRoots(rest) {
  /** @type {EtyPart[]} */
  const roots = []
  let guard = 0
  while (rest.length >= MIN_STEM && guard++ < 6) {
    let best = ''
    for (const r of ROOT_FORMS) {
      if (r.length < 3) continue
      if (!rest.startsWith(r)) continue
      if (r.length > best.length) best = r
    }
    if (!best) break
    const meta = ROOT_ETYMOLOGY[best]
    roots.push({
      type: 'root',
      part: best,
      meaning: meta.meaning,
      etymology: [meta.source, meta.pie].filter(Boolean).join('; '),
    })
    rest = rest.slice(best.length)
    if (rest.length === 1 && /[aeiouy]/i.test(rest)) rest = ''
  }
  return roots
}

/**
 * 整词或词尾匹配（seism-ic → seism）。
 * @param {string} rest
 */
function matchSingleRoot(rest) {
  if (rest.length < 3) return null
  if (ROOT_ETYMOLOGY[rest]) {
    const meta = ROOT_ETYMOLOGY[rest]
    return {
      type: 'root',
      part: rest,
      meaning: meta.meaning,
      etymology: [meta.source, meta.pie].filter(Boolean).join('; '),
    }
  }
  for (const r of ROOT_FORMS) {
    if (r.length < 4) continue
    if (rest === r) {
      const meta = ROOT_ETYMOLOGY[r]
      return {
        type: 'root',
        part: r,
        meaning: meta.meaning,
        etymology: [meta.source, meta.pie].filter(Boolean).join('; '),
      }
    }
  }
  return null
}

/**
 * @param {string} token
 * @returns {EtyPart[] | null}
 */
export function analyzeMorphology(token) {
  const w = token.toLowerCase().replace(/[^a-z]/g, '')
  if (!w || w.length < 2) return null

  if (WORD_LEXICON[w]) return WORD_LEXICON[w].map((p) => ({ ...p }))

  /** @type {EtyPart[]} */
  const prefixParts = []
  /** @type {EtyPart[]} */
  const suffixParts = []

  let rest = stripPrefixes(w, prefixParts)
  rest = stripSuffixes(rest, suffixParts)

  /** @type {EtyPart[]} */
  let rootParts = greedyRoots(rest)
  rest = rest.slice(rootParts.reduce((n, p) => n + p.part.length, 0))

  if (!rootParts.length) {
    const single = matchSingleRoot(rest || w)
    if (single) rootParts = [single]
  }

  if (!rootParts.length) {
    const compound = decomposeCompound(w)
    if (compound?.some((p) => p.type === 'root' || p.type === 'prefix')) return compound
    return null
  }

  return [...prefixParts, ...rootParts, ...suffixParts]
}
