import { generateLlmJson } from './llmExamples.js'
import { emptyRelations, RELATION_KEYS } from './wordRelations.js'

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[] }} entry
 */
function buildRelationsPrompt(entry) {
  const gloss = entry.senses.map((s, i) => `${i + 1}. ${s.pos ? s.pos + '. ' : ''}${s.zh}`).join('\n')
  return `You are an IELTS Academic vocabulary tutor.

Headword (exact spelling): ${JSON.stringify(entry.word)}

Chinese meanings:
${gloss}

Generate related vocabulary for exam prep. Return JSON ONLY with this shape (all six keys required; use [] if none):
{
  "synonyms": [{"label":"English word or phrase","zh":"中文释义","pos":"optional: n/v/adj/adv"}],
  "antonyms": [...],
  "similar": [...],
  "derivatives": [...],
  "roots": [...],
  "collocations": [...]
}

Rules:
- 2–6 items per non-empty category; IELTS B2–C1 level
- label: English only; zh: concise Chinese gloss
- synonyms: same or very close meaning
- antonyms: common opposites (omit if rare/none)
- similar: easily confused spellings or look-alikes (not synonyms)
- derivatives: same word family (noun/verb/adj forms, compounds)
- roots: morpheme or core root plus related forms (e.g. "struct → structure, construct")
- collocations: fixed phrases or patterns using the headword (label can be multi-word)
- Do NOT repeat the headword alone as an item`
}

/**
 * @param {unknown} raw
 * @returns {import('./wordRelations.js').WordRelations}
 */
function normalizeRelations(raw) {
  const out = emptyRelations()
  if (!raw || typeof raw !== 'object') return out
  const obj = /** @type {Record<string, unknown>} */ (raw)
  for (const key of RELATION_KEYS) {
    const arr = obj[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const x = /** @type {{ label?: string, zh?: string, pos?: string }} */ (item)
      const label = typeof x.label === 'string' ? x.label.trim() : ''
      if (!label) continue
      out[key].push({
        label,
        ...(typeof x.zh === 'string' && x.zh.trim() ? { zh: x.zh.trim() } : {}),
        ...(typeof x.pos === 'string' && x.pos.trim()
          ? { pos: x.pos.trim().replace(/\.$/, '') }
          : {}),
      })
    }
  }
  return out
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[] }} entry
 * @param {import('./llmSettings.js').LlmSettings} cfg
 */
export async function generateEntryRelations(entry, cfg) {
  const prompt = buildRelationsPrompt(entry)
  const parsed = await generateLlmJson(
    cfg,
    prompt,
    'You reply with valid JSON only. The user asks for IELTS vocabulary relations in a fixed JSON shape with six array keys.',
  )
  const rel = normalizeRelations(parsed)
  const hasAny = RELATION_KEYS.some((k) => rel[k].length > 0)
  if (!hasAny) throw new Error('模型未返回有效联想词')
  return rel
}
