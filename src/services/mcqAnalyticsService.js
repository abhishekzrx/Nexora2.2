/**
 * mcqAnalyticsService.js
 * Centralized Single Source of Truth for MCQ Analytics, Mastery Metrics & Display Formatting.
 *
 * Rules:
 * - NO fixed or hardcoded denominators (0, 1, 5, 20, 300, 1000, 10000+ dynamic scalability).
 * - All metrics derived from actual Supabase records.
 * - Current progress states: UNSEEN, INCORRECT, MASTERED.
 * - Historical attempt counters are NEVER used as current pool counts.
 * - Accuracy and Mastery are strictly distinct.
 */

/**
 * Format numbers compactly for display (e.g. 1240 -> "1.24K", 306 -> "306", 10500 -> "10.5K").
 * Calculations always use exact integer values.
 */
export function formatCompactNumber(num) {
  const val = Number(num) || 0
  if (val >= 1000000) {
    const formatted = (val / 1000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')
    return `${formatted}M`
  }
  if (val >= 1000) {
    const formatted = (val / 1000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')
    return `${formatted}K`
  }
  return String(val)
}

/**
 * Format integer with commas for display (e.g. 1240 -> "1,240").
 */
export function formatInteger(num) {
  const val = Math.round(Number(num) || 0)
  return val.toLocaleString('en-US')
}

/**
 * Calculate chapter MCQ metrics from total DB MCQs and user progress records.
 *
 * @param {number} totalMcqs - Actual count of MCQs belonging to the chapter in DB
 * @param {Array} progressRecords - Supabase progress records for this chapter
 */
export function calculateChapterMetrics(totalMcqs = 0, progressRecords = []) {
  const total = Math.max(0, Math.round(Number(totalMcqs) || 0))
  const records = Array.isArray(progressRecords) ? progressRecords : []

  // Count current progress states
  let masteredMcqs = 0
  let incorrectMcqs = 0

  records.forEach((rec) => {
    if (!rec) return
    const status = String(rec.status || '').toUpperCase()
    if (status === 'MASTERED') {
      masteredMcqs += 1
    } else if (status === 'INCORRECT') {
      incorrectMcqs += 1
    }
  })

  // Prevent counts from exceeding actual total MCQs
  masteredMcqs = Math.min(total, masteredMcqs)
  incorrectMcqs = Math.min(total - masteredMcqs, incorrectMcqs)

  const unseenMcqs = Math.max(0, total - masteredMcqs - incorrectMcqs)
  const remainingUnmastered = Math.max(0, total - masteredMcqs)

  const masteryPercentage = total > 0 ? Math.round((masteredMcqs / total) * 100) : null

  let state = 'IN_PROGRESS'
  if (total === 0) {
    state = 'NOT_AVAILABLE'
  } else if (masteredMcqs === total && total > 0) {
    state = 'MASTERED'
  }

  return {
    totalMcqs: total,
    masteredMcqs,
    incorrectMcqs,
    unseenMcqs,
    remainingUnmastered,
    masteryPercentage,
    state,
    isCompleted: state === 'MASTERED',
  }
}

/**
 * Aggregate chapter metrics into Subject metrics.
 *
 * @param {Array} chapterMetricsList - Array of calculated chapter metrics objects
 */
export function calculateSubjectMetrics(chapterMetricsList = []) {
  const list = Array.isArray(chapterMetricsList) ? chapterMetricsList : []

  let subjectTotalMcqs = 0
  let subjectMasteredMcqs = 0
  let subjectIncorrectMcqs = 0
  let subjectUnseenMcqs = 0
  let subjectRemainingUnmastered = 0
  let subjectCompletedChapters = 0

  list.forEach((ch) => {
    if (!ch) return
    subjectTotalMcqs += ch.totalMcqs || 0
    subjectMasteredMcqs += ch.masteredMcqs || 0
    subjectIncorrectMcqs += ch.incorrectMcqs || 0
    subjectUnseenMcqs += ch.unseenMcqs || 0
    subjectRemainingUnmastered += ch.remainingUnmastered || 0

    if (ch.totalMcqs > 0 && ch.masteredMcqs === ch.totalMcqs) {
      subjectCompletedChapters += 1
    }
  })

  const subjectTotalChapters = list.length
  const subjectMasteryPercentage =
    subjectTotalMcqs > 0
      ? Math.round((subjectMasteredMcqs / subjectTotalMcqs) * 100)
      : null

  let state = 'IN_PROGRESS'
  if (subjectTotalMcqs === 0) {
    state = 'NOT_AVAILABLE'
  } else if (subjectMasteredMcqs === subjectTotalMcqs && subjectTotalMcqs > 0) {
    state = 'MASTERED'
  }

  return {
    subjectTotalMcqs,
    subjectMasteredMcqs,
    subjectIncorrectMcqs,
    subjectUnseenMcqs,
    subjectRemainingUnmastered,
    subjectMasteryPercentage,
    subjectCompletedChapters,
    subjectTotalChapters,
    state,
    isCompleted: state === 'MASTERED',
  }
}

/**
 * Calculate attempt accuracy separately from mastery.
 *
 * @param {number} totalAttempts - Total questions attempted
 * @param {number} correctAttempts - Total questions answered correctly
 */
export function calculateAccuracy(totalAttempts = 0, correctAttempts = 0) {
  const attempts = Math.max(0, Number(totalAttempts) || 0)
  const correct = Math.max(0, Number(correctAttempts) || 0)

  if (attempts === 0) return null
  return Math.round((correct / attempts) * 100)
}

/**
 * Format Chapter display strings per contract.
 * Example outputs:
 * - "306 MCQs • 5 Flashcards"
 * - "42% mastered • 178 remaining"
 */
export function formatChapterDisplay(metrics, flashcardsCount = 0) {
  if (!metrics || metrics.state === 'NOT_AVAILABLE') {
    return {
      mcqMeta: `0 MCQs • ${flashcardsCount} Flashcards`,
      masteryMeta: 'No MCQs available',
    }
  }

  const formattedTotal = formatCompactNumber(metrics.totalMcqs)
  const formattedRemaining = formatCompactNumber(metrics.remainingUnmastered)
  const pct = metrics.masteryPercentage !== null ? `${metrics.masteryPercentage}%` : '0%'

  return {
    mcqMeta: `${formattedTotal} MCQs • ${flashcardsCount} Flashcards`,
    masteryMeta: `${pct} mastered • ${formattedRemaining} remaining`,
  }
}

/**
 * Format Subject display strings per contract.
 * Example outputs:
 * - "1.24K MCQs • 320 Flashcards"
 * - "27% mastery"
 * - "334 / 1,240 mastered"
 * - "3 / 12 chapters mastered"
 */
export function formatSubjectDisplay(metrics, flashcardsCount = 0) {
  if (!metrics || metrics.state === 'NOT_AVAILABLE') {
    return {
      mcqMeta: `0 MCQs • ${flashcardsCount} Flashcards`,
      masteryPct: 'No MCQs',
      masteredRatio: '0 / 0 mastered',
      chaptersRatio: `0 / ${metrics?.subjectTotalChapters || 0} chapters mastered`,
    }
  }

  const formattedTotal = formatCompactNumber(metrics.subjectTotalMcqs)
  const formattedFlash = formatCompactNumber(flashcardsCount)

  const masteredExact = formatInteger(metrics.subjectMasteredMcqs)
  const totalExact = formatInteger(metrics.subjectTotalMcqs)
  const pct = metrics.subjectMasteryPercentage !== null ? `${metrics.subjectMasteryPercentage}%` : '0%'

  return {
    mcqMeta: `${formattedTotal} MCQs • ${formattedFlash} Flashcards`,
    masteryPct: `${pct} mastery`,
    masteredRatio: `${masteredExact} / ${totalExact} mastered`,
    chaptersRatio: `${metrics.subjectCompletedChapters} / ${metrics.subjectTotalChapters} chapters mastered`,
  }
}

export default {
  formatCompactNumber,
  formatInteger,
  calculateChapterMetrics,
  calculateSubjectMetrics,
  calculateAccuracy,
  formatChapterDisplay,
  formatSubjectDisplay,
}
