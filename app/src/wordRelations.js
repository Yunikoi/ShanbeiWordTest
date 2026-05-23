/** @typedef {{ label: string, zh?: string, pos?: string }} RelationItem */
/** @typedef {{ synonyms: RelationItem[], antonyms: RelationItem[], similar: RelationItem[], derivatives: RelationItem[], roots: RelationItem[], collocations: RelationItem[] }} WordRelations */

export const RELATION_KEYS = /** @type {const} */ ([
  'synonyms',
  'antonyms',
  'similar',
  'derivatives',
  'roots',
  'collocations',
])

export const RELATION_LABELS = {
  synonyms: '近义词',
  antonyms: '反义词',
  similar: '形近词',
  derivatives: '衍生词',
  roots: '词根 / 词族',
  collocations: '短语搭配',
}

/** @returns {WordRelations} */
export function emptyRelations() {
  return {
    synonyms: [],
    antonyms: [],
    similar: [],
    derivatives: [],
    roots: [],
    collocations: [],
  }
}

/**
 * @param {WordRelations | undefined} a
 * @param {WordRelations | undefined} b
 * @returns {WordRelations}
 */
export function mergeRelations(a, b) {
  const out = emptyRelations()
  for (const key of RELATION_KEYS) {
    const seen = new Set()
    for (const src of [a?.[key], b?.[key]]) {
      for (const item of src || []) {
        const id = item.label.toLowerCase()
        if (seen.has(id)) continue
        seen.add(id)
        out[key].push(item)
      }
    }
  }
  return out
}

/** @param {WordRelations | undefined} rel */
export function hasRelations(rel) {
  if (!rel) return false
  return RELATION_KEYS.some((k) => rel[k]?.length > 0)
}

/**
 * @param {string} title
 * @returns {keyof WordRelations | null}
 */
export function detectRelationSection(title) {
  const t = String(title).trim()
  if (/反义/.test(t)) return 'antonyms'
  if (/同义/.test(t)) return 'synonyms'
  if (/形近|易混/.test(t)) return 'similar'
  if (/词根|词族/.test(t)) return 'roots'
  if (/衍生/.test(t)) return 'derivatives'
  if (/搭配|句型|固定|高频/.test(t) || /高频必考|核心固定/.test(t)) return 'collocations'
  return null
}

/** @param {{ word: string, senses?: { pos?: string, zh?: string }[] }} entry @returns {RelationItem} */
export function relationItemFromEntry(entry) {
  const zh = entry.senses?.map((s) => s.zh).filter(Boolean).join('；') || ''
  const pos = entry.senses?.find((s) => s.pos)?.pos
  return {
    label: entry.word,
    ...(zh ? { zh } : {}),
    ...(pos ? { pos } : {}),
  }
}
