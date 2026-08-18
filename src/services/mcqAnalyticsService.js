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
 * Reusable Four-Color Coverage Level System Config
 * Exactly four coverage ranges:
 * 0% - <25%: Level 1 / Very Low Coverage (Getting Started)
 * 25% - <50%: Level 2 / Developing Coverage (Building Coverage)
 * 50% - <75%: Level 3 / Strong Coverage (Strong Coverage)
 * 75% - 100%: Level 4 / High Coverage (High Coverage)
 */
export const COVERAGE_LEVELS = [
  {
    level: 1,
    min: 0,
    max: 24.99,
    rangeLabel: '0–24%',
    label: 'Getting Started',
    color: '#F04438',
    bg: 'rgba(240, 68, 56, 0.1)',
    ringTrack: 'rgba(240, 68, 56, 0.2)',
  },
  {
    level: 2,
    min: 25,
    max: 49.99,
    rangeLabel: '25–49%',
    label: 'Building Coverage',
    color: '#F1621B',
    bg: 'rgba(241, 98, 27, 0.1)',
    ringTrack: 'rgba(241, 98, 27, 0.2)',
  },
  {
    level: 3,
    min: 50,
    max: 74.99,
    rangeLabel: '50–74%',
    label: 'Strong Coverage',
    color: '#0E9494',
    bg: 'rgba(14, 148, 148, 0.1)',
    ringTrack: 'rgba(14, 148, 148, 0.2)',
  },
  {
    level: 4,
    min: 75,
    max: 100,
    rangeLabel: '75–100%',
    label: 'High Coverage',
    color: '#12B76A',
    bg: 'rgba(18, 183, 106, 0.1)',
    ringTrack: 'rgba(18, 183, 106, 0.2)',
  },
]

/**
 * Reusable coverage level helper
 * Returns { level, label, color, bg, ringTrack, rangeLabel }
 */
export function getAttemptCoverageLevel(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  if (p < 25) return COVERAGE_LEVELS[0]
  if (p < 50) return COVERAGE_LEVELS[1]
  if (p < 75) return COVERAGE_LEVELS[2]
  return COVERAGE_LEVELS[3]
}

/**
 * Calculate chapter MCQ metrics from total DB MCQs and user progress records.
 *
 * COVERAGE = attemptedUniqueQuestions / totalChapterMcqs * 100
 * MASTERY  = masteredUniqueQuestions / attemptedUniqueQuestions * 100
 *
 * @param {number} totalMcqs - Actual count of MCQs belonging to the chapter in DB
 * @param {Array} progressRecords - Supabase progress records for this chapter
 */
export function calculateChapterMetrics(totalMcqs = 0, progressRecords = []) {
  const total = Math.max(0, Math.round(Number(totalMcqs) || 0))
  const records = Array.isArray(progressRecords) ? progressRecords : []

  const attemptedSet = new Set()
  const masteredSet = new Set()
  const incorrectSet = new Set()

  records.forEach((rec) => {
    if (!rec) return
    const mcqId = rec.mcq_id || rec.mcqId
    if (!mcqId) return

    attemptedSet.add(mcqId)
    const status = String(rec.status || '').toUpperCase()
    if (status === 'MASTERED') {
      masteredSet.add(mcqId)
    } else if (status === 'INCORRECT') {
      incorrectSet.add(mcqId)
    }
  })

  const attemptedMcqs = Math.min(total, attemptedSet.size)
  const masteredMcqs = Math.min(attemptedMcqs, masteredSet.size)
  const incorrectMcqs = Math.min(attemptedMcqs - masteredMcqs, incorrectSet.size)

  const unseenMcqs = Math.max(0, total - attemptedMcqs)
  const remainingUnmastered = Math.max(0, total - masteredMcqs)

  const rawCoverage = total > 0 ? (attemptedMcqs / total) * 100 : 0
  const coveragePercent = Math.round(rawCoverage * 10) / 10
  const masteryPercentage = attemptedMcqs > 0 ? Math.round((masteredMcqs / attemptedMcqs) * 100) : 0
  const coverageLevel = getAttemptCoverageLevel(coveragePercent)

  let state = 'IN_PROGRESS'
  if (total === 0) {
    state = 'NOT_AVAILABLE'
  } else if (attemptedMcqs === 0) {
    state = 'NOT_STARTED'
  } else if (masteredMcqs === total && total > 0) {
    state = 'MASTERED'
  }

  return {
    totalMcqs: total,
    attemptedMcqs,
    masteredMcqs,
    incorrectMcqs,
    unseenMcqs,
    remainingUnmastered,
    coveragePercent,
    masteryPercentage,
    coverageLevel,
    state,
    isCompleted: state === 'MASTERED',
  }
}

/**
 * Aggregate chapter metrics into Subject metrics.
 *
 * Subject Coverage = attempted / totalMCQs * 100
 * Subject Mastery  = mastered / attempted * 100
 *
 * @param {Array} chapterMetricsList - Array of calculated chapter metrics objects
 */
export function calculateSubjectMetrics(chapterMetricsList = []) {
  const list = Array.isArray(chapterMetricsList) ? chapterMetricsList : []

  let subjectTotalMcqs = 0
  let subjectAttemptedMcqs = 0
  let subjectMasteredMcqs = 0
  let subjectIncorrectMcqs = 0
  let subjectUnseenMcqs = 0
  let subjectRemainingUnmastered = 0
  let subjectCompletedChapters = 0

  list.forEach((ch) => {
    if (!ch) return
    subjectTotalMcqs += ch.totalMcqs || 0
    subjectAttemptedMcqs += ch.attemptedMcqs || 0
    subjectMasteredMcqs += ch.masteredMcqs || 0
    subjectIncorrectMcqs += ch.incorrectMcqs || 0
    subjectUnseenMcqs += ch.unseenMcqs || 0
    subjectRemainingUnmastered += ch.remainingUnmastered || 0

    if (ch.totalMcqs > 0 && ch.masteredMcqs === ch.totalMcqs) {
      subjectCompletedChapters += 1
    }
  })

  const subjectTotalChapters = list.length
  const rawCoverage = subjectTotalMcqs > 0 ? (subjectAttemptedMcqs / subjectTotalMcqs) * 100 : 0
  const subjectCoveragePercent = Math.round(rawCoverage * 10) / 10
  const subjectMasteryPercentage =
    subjectAttemptedMcqs > 0
      ? Math.round((subjectMasteredMcqs / subjectAttemptedMcqs) * 100)
      : 0
  const subjectCoverageLevel = getAttemptCoverageLevel(subjectCoveragePercent)

  let state = 'IN_PROGRESS'
  if (subjectTotalMcqs === 0) {
    state = 'NOT_AVAILABLE'
  } else if (subjectAttemptedMcqs === 0) {
    state = 'NOT_STARTED'
  } else if (subjectMasteredMcqs === subjectTotalMcqs && subjectTotalMcqs > 0) {
    state = 'MASTERED'
  }

  return {
    subjectTotalMcqs,
    subjectAttemptedMcqs,
    subjectMasteredMcqs,
    subjectIncorrectMcqs,
    subjectUnseenMcqs,
    subjectRemainingUnmastered,
    subjectCoveragePercent,
    subjectMasteryPercentage,
    subjectCoverageLevel,
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
 */
export function formatChapterDisplay(metrics, flashcardsCount = 0) {
  if (!metrics || metrics.state === 'NOT_AVAILABLE') {
    return {
      mcqMeta: `0 MCQs • ${flashcardsCount} Flashcards`,
      masteryMeta: 'No MCQs available',
    }
  }

  const formattedTotal = formatCompactNumber(metrics.totalMcqs)
  const formattedAttempted = formatCompactNumber(metrics.attemptedMcqs)
  const masteryPct = `${metrics.masteryPercentage}%`

  return {
    mcqMeta: metrics.attemptedMcqs > 0
      ? `${formattedAttempted} / ${formattedTotal} MCQs`
      : `${formattedTotal} MCQs`,
    masteryMeta: `${masteryPct} mastery`,
  }
}

/**
 * Format Subject display strings per contract.
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
  const pct = `${metrics.subjectMasteryPercentage}%`

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
  COVERAGE_LEVELS,
  getAttemptCoverageLevel,
  calculateChapterMetrics,
  calculateSubjectMetrics,
  calculateAccuracy,
  formatChapterDisplay,
  formatSubjectDisplay,
}

