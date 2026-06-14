/** 学习阶段：第 1、2 次「真的认识」后，距下次可计为正确的间隔（天） */
export const LEARNING_GAP_DAYS = [1, 2]

/** 已掌握后每次答对，距下次复习的间隔（天）：1、2、4、7、15… */
export const MASTERY_GAP_DAYS = [1, 2, 4, 7, 15, 30, 60]

/** 刚达成连续 3 次正确、进入已掌握时，第一次「已掌握复习」的间隔（天） */
export const FIRST_MASTERED_GAP_DAYS = 1

/** 标记「不熟悉 / 不认识」后，需再答对「认识」的次数才算真正认识 */
export const KNOWN_CONFIRM_AFTER_WRONG = 2

/**
 * @typedef {{
 *   version: 2,
 *   phase: 'learning' | 'mastered',
 *   streak: number,
 *   masteryIndex: number,
 *   nextDue: string,
 *   lastReviewed?: string,
 *   confirmKnownLeft?: number,
 * }} WordProgV2
 */

/**
 * @param {unknown} p
 * @param {string} today YYYY-MM-DD
 * @returns {WordProgV2}
 */
export function migrateWordProg(p, today) {
  if (p && typeof p === 'object' && /** @type {any} */ (p).version === 2 && /** @type {any} */ (p).phase) {
    const x = /** @type {any} */ (p)
    return {
      version: 2,
      phase: x.phase === 'mastered' ? 'mastered' : 'learning',
      streak: Math.max(0, Math.min(3, Number(x.streak) || 0)),
      masteryIndex: Math.max(0, Math.min(MASTERY_GAP_DAYS.length - 1, Number(x.masteryIndex) || 0)),
      nextDue: typeof x.nextDue === 'string' && x.nextDue ? x.nextDue : today,
      lastReviewed: typeof x.lastReviewed === 'string' ? x.lastReviewed : undefined,
      ...(Number(x.confirmKnownLeft) > 0
        ? { confirmKnownLeft: Math.min(KNOWN_CONFIRM_AFTER_WRONG, Number(x.confirmKnownLeft)) }
        : {}),
    }
  }
  if (!p || typeof p !== 'object') {
    return {
      version: 2,
      phase: 'learning',
      streak: 0,
      masteryIndex: 0,
      nextDue: today,
      lastReviewed: undefined,
    }
  }
  const x = /** @type {any} */ (p)
  const nextDue = typeof x.nextDue === 'string' && x.nextDue ? x.nextDue : today
  return {
    version: 2,
    phase: 'learning',
    streak: 0,
    masteryIndex: 0,
    nextDue: nextDue <= today ? today : nextDue,
    lastReviewed: typeof x.lastReviewed === 'string' ? x.lastReviewed : undefined,
  }
}

/**
 * @param {WordProgV2} prev
 * @param {'known' | 'fuzzy' | 'forget'} kind
 * @param {string} today
 * @param {(ymd: string, n: number) => string} addDaysYmd
 * @returns {{ prog: WordProgV2, requeueAfterKnown?: boolean }}
 */
export function applySrsV2(prev, kind, today, addDaysYmd) {
  let base = migrateWordProg(prev, today)
  const wrong = kind === 'fuzzy' || kind === 'forget'

  if (wrong) {
    const reset = {
      version: 2,
      phase: /** @type {'learning'} */ ('learning'),
      streak: 0,
      masteryIndex: 0,
      nextDue: today,
      lastReviewed: today,
      confirmKnownLeft: KNOWN_CONFIRM_AFTER_WRONG,
    }
    if (base.phase === 'mastered') {
      return { prog: reset, requeueAfterKnown: false }
    }
    return {
      prog: {
        ...reset,
        masteryIndex: base.masteryIndex,
      },
      requeueAfterKnown: false,
    }
  }

  const confirmLeft = Number(base.confirmKnownLeft) || 0
  if (confirmLeft > 0) {
    const nextLeft = confirmLeft - 1
    if (nextLeft > 0) {
      return {
        prog: {
          ...base,
          phase: 'learning',
          streak: 0,
          confirmKnownLeft: nextLeft,
          nextDue: today,
          lastReviewed: today,
        },
        requeueAfterKnown: true,
      }
    }
    base = { ...base, confirmKnownLeft: undefined }
  }

  if (base.phase === 'mastered') {
    const idx = Math.min(base.masteryIndex, MASTERY_GAP_DAYS.length - 1)
    const gap = MASTERY_GAP_DAYS[idx]
    return {
      prog: {
        version: 2,
        phase: 'mastered',
        streak: 3,
        masteryIndex: Math.min(idx + 1, MASTERY_GAP_DAYS.length - 1),
        nextDue: addDaysYmd(today, gap),
        lastReviewed: today,
      },
      requeueAfterKnown: false,
    }
  }

  const nextStreak = Math.min(3, base.streak + 1)
  if (nextStreak >= 3) {
    return {
      prog: {
        version: 2,
        phase: 'mastered',
        streak: 3,
        masteryIndex: 0,
        nextDue: addDaysYmd(today, FIRST_MASTERED_GAP_DAYS),
        lastReviewed: today,
      },
      requeueAfterKnown: false,
    }
  }

  const gapIdx = nextStreak - 1
  const gap = LEARNING_GAP_DAYS[Math.min(gapIdx, LEARNING_GAP_DAYS.length - 1)]
  return {
    prog: {
      version: 2,
      phase: 'learning',
      streak: nextStreak,
      masteryIndex: 0,
      nextDue: addDaysYmd(today, gap),
      lastReviewed: today,
    },
    requeueAfterKnown: false,
  }
}
