/** @typedef {{ pos?: string, zh: string }} Sense */

export function splitWordAndIpa(token) {
  const t = String(token ?? '').trim()
  if (!t) return { word: '' }

  const slash = t.match(/^(.+?)\s*\/([^/]+)\/\s*$/u)
  if (slash) {
    return { word: slash[1].trim(), ipa: `/${slash[2].trim()}/` }
  }

  const bracket = t.match(/^(.+?)\s*\[([^\]]+)\]\s*$/u)
  if (bracket) {
    return { word: bracket[1].trim(), ipa: `/${bracket[2].trim()}/` }
  }

  return { word: t }
}

/**
 * @param {string} s
 * @returns {{ idx: number, len: number } | null}
 */
export function firstWordDelimiterColon(s) {
  const fw = s.indexOf('：')
  if (fw > 0) return { idx: fw, len: 1 }
  const asc = s.indexOf(':')
  if (asc > 0) return { idx: asc, len: 1 }
  return null
}

function splitMeaningsChunk(s) {
  return s
    .split(/[；;]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseSenseChunk(chunk) {
  const m = chunk.match(/^([a-zA-Z]{1,6}\.)\s*(.+)$/)
  if (m) return { pos: m[1].replace(/\.$/, ''), zh: m[2].trim() }
  return { zh: chunk.trim() }
}

/** @param {string} tail @returns {Sense[]} */
export function sensesFromColonTail(tail) {
  const rawParts = []
  for (const group of tail.split('|').map((g) => g.trim()).filter(Boolean)) {
    rawParts.push(...splitMeaningsChunk(group))
  }
  return rawParts.map(parseSenseChunk).filter((s) => s.zh.length > 0)
}
