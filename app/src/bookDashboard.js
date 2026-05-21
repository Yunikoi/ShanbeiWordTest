import { migrateWordProg } from './srsCurve.js'

/**
 * @param {Record<string, unknown>} progress
 * @param {{ word: string }[]} entries
 * @param {string} today YYYY-MM-DD
 */
export function computeBookDashboard(progress, entries, today) {
  const totalWords = entries.length
  let studiedWords = 0
  let masteredWords = 0
  let dueTodayTotal = 0

  for (const e of entries) {
    const p = migrateWordProg(progress[e.word], today)
    const hasStudied =
      Boolean(p.lastReviewed) || p.phase === 'mastered' || p.streak > 0
    if (hasStudied) studiedWords++
    if (p.phase === 'mastered') masteredWords++
    if (p.nextDue <= today) dueTodayTotal++
  }

  const learnedPercent = totalWords ? (studiedWords / totalWords) * 100 : 0

  return {
    totalWords,
    studiedWords,
    masteredWords,
    learnedPercent,
    dueTodayTotal,
  }
}
