import { hash32 } from './ieltsSentence.js'
import { emptyRelations, mergeRelations } from './wordRelations.js'

/** @typedef {{ word: string, senses: { pos?: string, zh: string }[], ipa?: string, relations?: import('./wordRelations.js').WordRelations }} PoolEntry */

const ANTONYM_GLOSS = [
  ['增', '减'],
  ['升', '降'],
  ['上', '下'],
  ['内', '外'],
  ['开', '关'],
  ['强', '弱'],
  ['大', '小'],
  ['多', '少'],
  ['进', '退'],
  ['积极', '消极'],
  ['支持', '反对'],
  ['接受', '拒绝'],
  ['扩大', '缩小'],
  ['增加', '减少'],
  ['上升', '下降'],
  ['优点', '缺点'],
  ['成功', '失败'],
  ['繁荣', '衰退'],
]

const PREFIXES = ['un', 're', 'dis', 'mis', 'non', 'in', 'im', 'il', 'ir', 'over', 'under', 'pre', 'post', 'sub', 'inter', 'trans', 'multi']
const SUFFIXES = ['tion', 'sion', 'ment', 'ness', 'ity', 'ive', 'ize', 'ise', 'able', 'ible', 'ful', 'less', 'ly', 'er', 'est', 'ist', 'ing', 'ed', 'es', 's']

/** @param {string} zh */
function glossParts(zh) {
  return String(zh)
    .split(/[；，、/\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

/** @param {string} a @param {string} b */
function glossOverlap(a, b) {
  const pa = glossParts(a)
  const pb = glossParts(b)
  let score = 0
  for (const x of pa) {
    for (const y of pb) {
      if (x === y) score += x.length * 3
      else if (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))) {
        score += Math.min(x.length, y.length)
      }
    }
  }
  return score
}

/** @param {string} a @param {string} b */
function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  /** @type {number[]} */
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    /** @type {number[]} */
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[n]
}

/** @param {string} w */
function stemWord(w) {
  let s = w.toLowerCase().replace(/[^a-z]/g, '')
  if (s.length < 4) return null
  for (const p of PREFIXES) {
    if (s.startsWith(p) && s.length > p.length + 3) {
      s = s.slice(p.length)
      break
    }
  }
  for (const suf of SUFFIXES) {
    if (s.endsWith(suf) && s.length > suf.length + 3) {
      s = s.slice(0, -suf.length)
      break
    }
  }
  return s.length >= 4 ? s : null
}

/** @param {string} w */
function morphCandidates(w) {
  const base = w.toLowerCase().split(/\s+/)[0]
  if (base.length < 3) return []
  /** @type {Set<string>} */
  const out = new Set()
  for (const p of PREFIXES) out.add(p + base)
  if (base.endsWith('e')) {
    out.add(base.slice(0, -1) + 'tion')
    out.add(base.slice(0, -1) + 'ive')
  }
  if (base.endsWith('y') && base.length > 3) {
    out.add(base.slice(0, -1) + 'ies')
    out.add(base.slice(0, -1) + 'iness')
    out.add(base.slice(0, -1) + 'ily')
  }
  for (const suf of ['s', 'ed', 'ing', 'ly', 'ness', 'ment', 'tion', 'ity', 'ive', 'ize', 'able']) {
    out.add(base + suf)
  }
  out.delete(base)
  return [...out]
}

/**
 * @param {{ label: string, zh?: string, pos?: string, score: number }[]} items
 * @param {number} n
 * @param {string|number} seed
 */
function pickScored(items, n, seed) {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
  if (sorted.length <= n) {
    return sorted.map(({ label, zh, pos }) => ({ label, ...(zh ? { zh } : {}), ...(pos ? { pos } : {}) }))
  }
  const start = hash32(String(seed)) % sorted.length
  const picked = []
  const used = new Set()
  for (let i = 0; i < sorted.length && picked.length < n; i++) {
    const idx = (start + i * 5) % sorted.length
    const item = sorted[idx]
    const key = item.label.toLowerCase()
    if (used.has(key)) continue
    used.add(key)
    picked.push({ label: item.label, ...(item.zh ? { zh: item.zh } : {}), ...(item.pos ? { pos: item.pos } : {}) })
  }
  return picked
}

/** @param {PoolEntry} e */
function primaryGloss(e) {
  return e.senses.map((s) => s.zh).filter(Boolean).join('；')
}

/** @param {PoolEntry} e */
function primaryPos(e) {
  return e.senses.find((s) => s.pos)?.pos
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {Map<string, PoolEntry>} index
 * @param {string|number} salt
 */
function buildLocalRelations(entry, pool, index, salt) {
  const out = emptyRelations()
  const self = entry.word.toLowerCase()
  const gloss = primaryGloss(entry)
  const head = entry.word.trim()
  const seedBase = `${head}|${salt}`

  /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
  const synCandidates = []
  /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
  const simCandidates = []
  /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
  const antCandidates = []

  for (const other of pool) {
    if (other.word.toLowerCase() === self) continue
    const og = primaryGloss(other)
    const overlap = glossOverlap(gloss, og)
    if (overlap >= 4) {
      synCandidates.push({
        label: other.word,
        zh: og,
        pos: primaryPos(other),
        score: overlap,
      })
    }

    const a = head.toLowerCase().replace(/[^a-z]/g, '')
    const b = other.word.toLowerCase().replace(/[^a-z]/g, '')
    if (a && b && a !== b) {
      const dist = levenshtein(a, b)
      const lenDiff = Math.abs(a.length - b.length)
      if (dist <= 2 && lenDiff <= 2 && a.length >= 4) {
        simCandidates.push({
          label: other.word,
          zh: og,
          pos: primaryPos(other),
          score: 10 - dist,
        })
      } else if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) {
        simCandidates.push({
          label: other.word,
          zh: og,
          pos: primaryPos(other),
          score: 5,
        })
      }
    }

    for (const [x, y] of ANTONYM_GLOSS) {
      if ((gloss.includes(x) && og.includes(y)) || (gloss.includes(y) && og.includes(x))) {
        antCandidates.push({
          label: other.word,
          zh: og,
          pos: primaryPos(other),
          score: 8,
        })
      }
    }

    for (const p of PREFIXES) {
      if (other.word.toLowerCase() === p + self || self === p + other.word.toLowerCase()) {
        antCandidates.push({
          label: other.word,
          zh: og,
          pos: primaryPos(other),
          score: 9,
        })
      }
    }
  }

  out.synonyms = pickScored(synCandidates, 5, `${seedBase}|syn`)
  out.similar = pickScored(simCandidates, 4, `${seedBase}|sim`)
  out.antonyms = pickScored(antCandidates, 3, `${seedBase}|ant`)

  /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
  const derCandidates = []
  for (const cand of morphCandidates(head)) {
    const hit = index.get(cand)
    if (hit && hit.word.toLowerCase() !== self) {
      derCandidates.push({
        label: hit.word,
        zh: primaryGloss(hit),
        pos: primaryPos(hit),
        score: 7,
      })
    }
  }
  out.derivatives = pickScored(derCandidates, 5, `${seedBase}|der`)

  const stem = stemWord(head)
  if (stem) {
    /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
    const rootHits = []
    for (const other of pool) {
      if (other.word.toLowerCase() === self) continue
      const ow = other.word.toLowerCase().replace(/[^a-z]/g, '')
      if (ow.includes(stem) && ow !== stem) {
        rootHits.push({
          label: other.word,
          zh: primaryGloss(other),
          pos: primaryPos(other),
          score: ow === stem ? 10 : 6,
        })
      }
    }
  const pickedRoots = pickScored(rootHits, 4, `${seedBase}|root`)
    if (pickedRoots.length) {
      out.roots = [{ label: stem, zh: '词干 / 词族核心' }, ...pickedRoots.slice(0, 3)]
    }
  }

  const g0 = entry.senses[0]?.zh || '…'
  const colTemplates = [
    { label: `the ${head} of`, zh: `…的${g0}` },
    { label: `a ${head}`, zh: `一种${g0}` },
    { label: `${head} for`, zh: `为…而${g0}` },
    { label: `${head} to`, zh: `向…${g0}` },
    { label: `${head} in`, zh: `在…中${g0}` },
    { label: `${head} with`, zh: `与…${g0}` },
    { label: `in terms of ${head}`, zh: `就${g0}而言` },
    { label: `play a role in ${head}`, zh: `在${g0}中发挥作用` },
    { label: `be associated with ${head}`, zh: `与${g0}相关` },
    { label: `a range of ${head}`, zh: `一系列${g0}` },
  ]
  const colStart = hash32(`${seedBase}|col`) % colTemplates.length
  out.collocations = []
  for (let i = 0; i < 4; i++) {
    const t = colTemplates[(colStart + i) % colTemplates.length]
    out.collocations.push(t)
  }

  return out
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {string|number} [salt]
 */
export function attachLocalRelations(entry, pool, salt = 0) {
  const index = new Map(pool.map((e) => [e.word.toLowerCase().split(/\s+/)[0], e]))
  for (const e of pool) index.set(e.word.toLowerCase(), e)
  const local = buildLocalRelations(entry, pool, index, salt)
  return {
    ...entry,
    relations: mergeRelations(entry.relations, local),
  }
}

/**
 * @param {PoolEntry[]} entries
 * @param {string|number} [salt]
 */
export function attachLocalRelationsAll(entries, salt = 0) {
  return entries.map((e) => attachLocalRelations(e, entries, salt))
}
