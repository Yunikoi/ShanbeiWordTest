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
  ['花', '素'],
  ['复杂', '简单'],
  ['公开', '秘密'],
  ['明显', '隐蔽'],
]

const PREFIXES = ['un', 're', 'dis', 'mis', 'non', 'in', 'im', 'il', 'ir', 'over', 'under', 'pre', 'post', 'sub', 'inter', 'trans', 'multi']
const STRIP_SUFFIXES = [
  'tion',
  'sion',
  'ment',
  'ness',
  'ity',
  'ive',
  'ize',
  'ise',
  'able',
  'ible',
  'ful',
  'less',
  'ally',
  'ial',
  'ical',
  'ous',
  'ent',
  'ant',
  'ance',
  'ence',
  'ing',
  'ed',
  'ly',
  'al',
  'er',
  'est',
  'ist',
  'es',
  's',
]

/** @param {string} zh */
function glossParts(zh) {
  return String(zh)
    .split(/[；，、/\s()（）]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 1)
}

/** @param {string} zh */
function glossKeywords(zh) {
  /** @type {Set<string>} */
  const keys = new Set()
  for (const p of glossParts(zh)) {
    if (p.length >= 2) keys.add(p)
    for (const ch of p) {
      if (/[\u4e00-\u9fff]/.test(ch)) keys.add(ch)
    }
  }
  return [...keys]
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
  const ka = glossKeywords(a)
  const kb = glossKeywords(b)
  for (const x of ka) {
    for (const y of kb) {
      if (x === y && x.length >= 1) score += x.length >= 2 ? 4 : 3
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
  if (s.length < 3) return null
  for (const p of PREFIXES) {
    if (s.startsWith(p) && s.length > p.length + 2) {
      s = s.slice(p.length)
      break
    }
  }
  for (const suf of STRIP_SUFFIXES) {
    if (s.endsWith(suf) && s.length > suf.length + 2) {
      s = s.slice(0, -suf.length)
      break
    }
  }
  return s.length >= 3 ? s : null
}

/** @param {string} w */
function englishStems(w) {
  const s = w.toLowerCase().replace(/[^a-z]/g, '')
  const stem = stemWord(w)
  /** @type {string[]} */
  const out = []
  if (stem) {
    out.push(stem)
    if (stem.length >= 5) out.push(stem.slice(0, 4))
    if (stem.length >= 4) out.push(stem.slice(0, 3))
  }
  if (s.length >= 4) out.push(s.slice(0, 4))
  if (s.length >= 3) out.push(s.slice(0, 3))
  return [...new Set(out.filter((x) => x.length >= 3))]
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
    out.add(base.slice(0, -1) + 'al')
  }
  if (base.endsWith('y') && base.length > 3) {
    out.add(base.slice(0, -1) + 'ies')
    out.add(base.slice(0, -1) + 'iness')
    out.add(base.slice(0, -1) + 'ily')
  }
  if (base.endsWith('al') && base.length > 4) {
    const root = base.slice(0, -2)
    out.add(root)
    out.add(root + 'a')
    out.add(root + 'ally')
    out.add(root + 'ist')
    out.add(root + 'iculture')
  }
  if (base.endsWith('ic') && base.length > 4) {
    const root = base.slice(0, -2)
    out.add(root + 'ally')
    out.add(root + 'ity')
  }
  for (const suf of ['s', 'ed', 'ing', 'ly', 'ness', 'ment', 'tion', 'ity', 'ive', 'ize', 'able', 'ful', 'less']) {
    out.add(base + suf)
  }
  out.delete(base)
  return [...out]
}

/**
 * @param {string} form
 * @param {string} gloss
 * @param {string} [pos]
 */
function syntheticDerivative(form, gloss, pos) {
  const f = form.toLowerCase()
  let zh = gloss
  let p = pos
  if (f.endsWith('ly')) {
    zh = `${gloss}地`
    p = 'adv'
  } else if (f.endsWith('tion') || f.endsWith('ment') || f.endsWith('ness') || f.endsWith('ity')) {
    zh = `${gloss}（名词形式）`
    p = 'n'
  } else if (f.endsWith('ive') || f.endsWith('ful') || f.endsWith('less') || f.endsWith('ous') || f.endsWith('al')) {
    zh = `与${gloss}相关的`
    p = 'adj'
  } else if (f.endsWith('ize') || f.endsWith('ify') || f.endsWith('ate')) {
    zh = `使…${gloss}`
    p = 'v'
  } else if (f.endsWith('ist')) {
    zh = `与${gloss}相关的人/物`
    p = 'n'
  }
  return { label: form, zh, ...(p ? { pos: p } : {}) }
}

/** @param {string} pos @param {string} word */
function inferPos(pos, word) {
  const p = String(pos || '')
    .toLowerCase()
    .replace(/\.$/, '')
  if (/^(n|noun|名词)/.test(p)) return 'n'
  if (/^(v|verb|动词)/.test(p)) return 'v'
  if (/^(adj|adjective|形容词)/.test(p)) return 'adj'
  if (/^(adv|adverb|副词)/.test(p)) return 'adv'
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.endsWith('tion') || w.endsWith('ment') || w.endsWith('ness') || w.endsWith('ity')) return 'n'
  if (w.endsWith('ize') || w.endsWith('ify') || w.endsWith('ate')) return 'v'
  if (w.endsWith('ly')) return 'adv'
  if (w.endsWith('al') || w.endsWith('ic') || w.endsWith('ous') || w.endsWith('ful') || w.endsWith('less')) return 'adj'
  return 'unknown'
}

/**
 * @param {string} head
 * @param {string} gloss
 * @param {string} posKind
 */
function collocationTemplates(head, gloss, posKind) {
  const g = gloss || '…'
  if (posKind === 'adj') {
    return [
      { label: `${head} pattern`, zh: `${g}图案` },
      { label: `${head} design`, zh: `${g}设计` },
      { label: `${head} scent`, zh: `${g}香气` },
      { label: `${head} display`, zh: `${g}展示` },
      { label: `${head} arrangement`, zh: `${g}陈设/插花` },
      { label: `${head} motif`, zh: `${g}元素/母题` },
      { label: `a ${head} theme`, zh: `${g}主题` },
      { label: `${head} elements`, zh: `${g}元素` },
    ]
  }
  if (posKind === 'n') {
    return [
      { label: `a ${head} of`, zh: `一种${g}` },
      { label: `the ${head} of`, zh: `…的${g}` },
      { label: `${head} between`, zh: `…之间的${g}` },
      { label: `a range of ${head}`, zh: `一系列${g}` },
      { label: `${head} for`, zh: `用于…的${g}` },
      { label: `in terms of ${head}`, zh: `就${g}而言` },
    ]
  }
  if (posKind === 'v') {
    return [
      { label: `${head} sth`, zh: `${g}某事物` },
      { label: `${head} from`, zh: `从…${g}` },
      { label: `${head} to`, zh: `向…${g}` },
      { label: `${head} with`, zh: `与…${g}` },
      { label: `be ${head.replace(/e$/, '')}ed`, zh: `被${g}` },
      { label: `${head} effectively`, zh: `有效地${g}` },
    ]
  }
  return [
    { label: `${head}`, zh: g },
    { label: `related to ${head}`, zh: `与${g}相关` },
    { label: `associated with ${head}`, zh: `与${g}有关` },
    { label: `in ${head}`, zh: `在${g}中` },
    { label: `${head} and …`, zh: `${g}与…` },
    { label: `the role of ${head}`, zh: `${g}的作用` },
  ]
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

/** @param {import('./wordRelations.js').RelationItem[]} items @param {number} min @param {() => import('./wordRelations.js').RelationItem | null} next */
function ensureMinItems(items, min, next) {
  const out = [...items]
  const seen = new Set(out.map((x) => x.label.toLowerCase()))
  for (let guard = 0; out.length < min && guard < 20; guard++) {
    const item = next()
    if (!item) break
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
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
  const headAlpha = head.toLowerCase().replace(/[^a-z]/g, '')
  const posKind = inferPos(primaryPos(entry), head)
  const seedBase = `${head}|${salt}`
  const stems = englishStems(head)

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
    const minSyn = gloss.length <= 3 ? 2 : 3
    if (overlap >= minSyn) {
      synCandidates.push({
        label: other.word,
        zh: og,
        pos: primaryPos(other),
        score: overlap,
      })
    }

    const b = other.word.toLowerCase().replace(/[^a-z]/g, '')
    if (headAlpha && b && headAlpha !== b) {
      const dist = levenshtein(headAlpha, b)
      const lenDiff = Math.abs(headAlpha.length - b.length)
      if (dist <= 3 && lenDiff <= 3 && headAlpha.length >= 4) {
        simCandidates.push({
          label: other.word,
          zh: og,
          pos: primaryPos(other),
          score: 10 - dist,
        })
      }
      for (let i = 3; i <= 5; i++) {
        if (headAlpha.length >= i && b.length >= i && headAlpha.slice(0, i) === b.slice(0, i)) {
          simCandidates.push({
            label: other.word,
            zh: og,
            pos: primaryPos(other),
            score: 4 + i,
          })
        }
      }
      for (const st of stems) {
        if (b.includes(st) && b !== st) {
          synCandidates.push({
            label: other.word,
            zh: og,
            pos: primaryPos(other),
            score: 5 + st.length,
          })
        }
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

  out.synonyms = pickScored(synCandidates, 6, `${seedBase}|syn`)
  out.similar = pickScored(simCandidates, 5, `${seedBase}|sim`)
  out.antonyms = pickScored(antCandidates, 4, `${seedBase}|ant`)

  /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
  const derCandidates = []
  for (const cand of morphCandidates(head)) {
    const hit = index.get(cand)
    if (hit && hit.word.toLowerCase() !== self) {
      derCandidates.push({
        label: hit.word,
        zh: primaryGloss(hit),
        pos: primaryPos(hit),
        score: 8,
      })
    } else {
      derCandidates.push({ ...syntheticDerivative(cand, gloss), score: 4 })
    }
  }
  out.derivatives = pickScored(derCandidates, 6, `${seedBase}|der`)

  const stem = stemWord(head)
  if (stem) {
    /** @type {{ label: string, zh?: string, pos?: string, score: number }[]} */
    const rootHits = []
    for (const other of pool) {
      if (other.word.toLowerCase() === self) continue
      const ow = other.word.toLowerCase().replace(/[^a-z]/g, '')
      for (const st of englishStems(head)) {
        if (ow.includes(st) && ow !== st) {
          rootHits.push({
            label: other.word,
            zh: primaryGloss(other),
            pos: primaryPos(other),
            score: 5 + st.length,
          })
        }
      }
    }
    const pickedRoots = pickScored(rootHits, 5, `${seedBase}|root`)
    out.roots = [{ label: stem, zh: '词干 / 词族核心' }, ...pickedRoots.slice(0, 4)]
  }

  const colTemplates = collocationTemplates(head, entry.senses[0]?.zh || gloss, posKind)
  const colStart = hash32(`${seedBase}|col`) % colTemplates.length
  out.collocations = []
  for (let i = 0; i < 6; i++) {
    out.collocations.push(colTemplates[(colStart + i) % colTemplates.length])
  }

  out.synonyms = ensureMinItems(out.synonyms, 2, () => {
    for (const st of stems) {
      for (const other of pool) {
        if (other.word.toLowerCase() === self) continue
        const ow = other.word.toLowerCase().replace(/[^a-z]/g, '')
        if (ow.includes(st)) {
          return {
            label: other.word,
            zh: primaryGloss(other),
            ...(primaryPos(other) ? { pos: primaryPos(other) } : {}),
          }
        }
      }
    }
    return null
  })

  out.derivatives = ensureMinItems(out.derivatives, 3, () => {
    const forms = morphCandidates(head)
    const form = forms[out.derivatives.length % Math.max(forms.length, 1)]
    return form ? syntheticDerivative(form, gloss) : null
  })

  if (!out.roots.length && stem) {
    out.roots = [{ label: stem, zh: '词干 / 词族核心' }]
  }

  for (const p of ['un', 'non', 'dis']) {
    const label = p + headAlpha
    if (label.toLowerCase() !== self) {
      out.antonyms = ensureMinItems(out.antonyms, 1, () => ({
        label,
        zh: `非${gloss}的 / 否定形式`,
        pos: primaryPos(entry),
      }))
      break
    }
  }

  return out
}

/** @param {PoolEntry} e */
function includeInPool(e) {
  const w = e.word
  if (!w || w.length > 60) return false
  if (/node_modules|\.git[\\/]|[/\\]dist[/\\]/.test(w)) return false
  if (/\.(png|jpe?g|gif|css|scss|map|woff2?|ttf|ico|svg|json|lock|node)$/i.test(w)) return false
  return true
}

/**
 * @param {PoolEntry} entry
 * @param {PoolEntry[]} pool
 * @param {string|number} [salt]
 */
export function attachLocalRelations(entry, pool, salt = 0) {
  const filtered = pool.filter(includeInPool)
  const index = new Map(filtered.map((e) => [e.word.toLowerCase().split(/\s+/)[0], e]))
  for (const e of filtered) index.set(e.word.toLowerCase(), e)
  const local = buildLocalRelations(entry, filtered, index, salt)
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
