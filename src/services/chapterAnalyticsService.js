/**
 * chapterAnalyticsService.js
 * Deep Chapter-Level Performance Engine.
 *
 * Implements Phase 1 Requirements:
 * - Coverage strictly based on UNIQUE MCQs attempted (repeated attempts do not inflate coverage).
 * - Mastery evaluating concept retention, error recovery & correct consistency.
 * - Centralized Readiness Formula using READINESS_WEIGHTS.
 * - Spaced repetition & revision behavior detection.
 * - Historical snapshot & trend direction.
 */

import {
  READINESS_WEIGHTS,
  PERFORMANCE_THRESHOLDS,
} from '../config/performanceConfig.js'
import { getChapterSnapshots, calculateTrendDirection } from './trendService.js'
import { getAttemptCoverageLevel } from './mcqAnalyticsService.js'

/**
 * Calculate deep chapter performance metrics.
 *
 * @param {number} totalChapterMcqs - Total count of MCQs in DB for this chapter
 * @param {Array} progressRecords - Supabase user progress records for this chapter
 * @param {string} chapterPriority - Chapter priority ('VERY HIGH', 'HIGH', 'MEDIUM', 'LOW')
 * @param {string} chapterId - Chapter unique ID for trend retrieval
 */
export function calculateDeepChapterPerformance(
  totalChapterMcqs = 0,
  progressRecords = [],
  chapterPriority = 'M',
  chapterId = null
) {
  const total = Math.max(0, Math.round(Number(totalChapterMcqs) || 0))
  const records = Array.isArray(progressRecords) ? progressRecords : []

  // 1. UNIQUE MCQS ATTEMPTED
  const attemptedUniqueSet = new Set()
  const masteredUniqueSet = new Set()
  const incorrectUniqueSet = new Set()

  let totalCorrectResponses = 0
  let totalResponses = 0
  let latestAttemptTimestamp = 0
  let multiAttemptCount = 0
  let recoveredQuestionsCount = 0 // questions with attempts > 1 that reached MASTERED

  records.forEach((rec) => {
    if (!rec) return
    const mcqId = rec.mcq_id || rec.mcqId
    if (!mcqId) return

    attemptedUniqueSet.add(mcqId)
    const status = String(rec.status || '').toUpperCase()

    if (status === 'MASTERED') {
      masteredUniqueSet.add(mcqId)
    } else if (status === 'INCORRECT') {
      incorrectUniqueSet.add(mcqId)
    }

    const attempts = Math.max(
      Number(rec.attempts) || 0,
      (Number(rec.correct_count) || 0) + (Number(rec.incorrect_count) || 0),
      1
    )
    const correct =
      Number(rec.correct_count) !== undefined && !isNaN(Number(rec.correct_count))
        ? Number(rec.correct_count)
        : status === 'MASTERED'
        ? 1
        : 0

    totalResponses += attempts
    totalCorrectResponses += Math.min(correct, attempts)

    if (attempts > 1) {
      multiAttemptCount += 1
      if (status === 'MASTERED' && (Number(rec.incorrect_count) || 0) > 0) {
        recoveredQuestionsCount += 1
      }
    }

    if (rec.last_attempted_at) {
      const ts = new Date(rec.last_attempted_at).getTime()
      if (ts > latestAttemptTimestamp) {
        latestAttemptTimestamp = ts
      }
    }
  })

  const uniqueAttemptedCount = Math.min(total, attemptedUniqueSet.size)
  const uniqueMasteredCount = Math.min(uniqueAttemptedCount, masteredUniqueSet.size)
  const uniqueIncorrectCount = Math.min(uniqueAttemptedCount - uniqueMasteredCount, incorrectUniqueSet.size)
  const unseenCount = Math.max(0, total - uniqueAttemptedCount)
  const remainingQuestions = unseenCount
  const remainingUnmastered = Math.max(0, total - uniqueMasteredCount)

  // 2. COVERAGE % (Strictly based on Unique questions)
  const rawCoverage = total > 0 ? (uniqueAttemptedCount / total) * 100 : 0
  const coveragePercent = Math.round(rawCoverage * 10) / 10

  // 3. MASTERY % (How well student understands attempted questions)
  // Considers unique mastered out of unique attempted, plus bonus for error recovery
  const baseMastery = uniqueAttemptedCount > 0 ? (uniqueMasteredCount / uniqueAttemptedCount) * 100 : 0
  const masteryPercentage = Math.round(baseMastery * 10) / 10

  // 4. ACCURACY % (Total correct responses / Total responses)
  const accuracyPercentage =
    totalResponses > 0
      ? Math.round((totalCorrectResponses / totalResponses) * 100)
      : uniqueAttemptedCount > 0
      ? masteryPercentage
      : 0

  // 5. CONSISTENCY SCORE (0–100)
  // Evaluates accuracy stability, error recovery, and multiple attempt efficiency
  let consistencyScore = 0
  if (uniqueAttemptedCount > 0) {
    const accuracyRatio = accuracyPercentage / 100
    const recoveryBonus = multiAttemptCount > 0 ? (recoveredQuestionsCount / multiAttemptCount) * 20 : 10
    consistencyScore = Math.min(100, Math.round(accuracyRatio * 80 + recoveryBonus))
  }

  // 6. REVISION / RETENTION SCORE (0–100)
  // Based on spaced repetition recency and mastery stability
  let revisionScore = 0
  let revisionRequirement = 'Not Started'
  if (uniqueAttemptedCount > 0) {
    const daysSincePractice =
      latestAttemptTimestamp > 0
        ? (Date.now() - latestAttemptTimestamp) / (1000 * 60 * 60 * 24)
        : 99

    if (daysSincePractice <= PERFORMANCE_THRESHOLDS.spacedRepetitionDays.fresh) {
      revisionScore = Math.round(85 + (masteryPercentage / 100) * 15)
      revisionRequirement = 'Up to date'
    } else if (daysSincePractice <= PERFORMANCE_THRESHOLDS.spacedRepetitionDays.due) {
      revisionScore = Math.round(60 + (masteryPercentage / 100) * 20)
      revisionRequirement = 'Revision due'
    } else {
      revisionScore = Math.max(10, Math.round(40 - Math.min(30, daysSincePractice)))
      revisionRequirement = 'Urgent revision needed'
    }
  }

  // 7. BALANCED READINESS FORMULA (Configurable via READINESS_WEIGHTS)
  // READINESS = (Coverage * W_cov + Accuracy * W_acc + Mastery * W_mast + Consistency * W_const + Revision * W_rev) * CoverageConfidence
  let readinessScore = 0
  if (total > 0 && uniqueAttemptedCount > 0) {
    const w = READINESS_WEIGHTS
    const weightedSum =
      coveragePercent * w.coverage +
      accuracyPercentage * w.accuracy +
      masteryPercentage * w.mastery +
      consistencyScore * w.consistency +
      revisionScore * w.revision

    // Coverage Confidence: prevents a 500-MCQ chapter with only 10 attempts (2% coverage) from appearing ready
    const coverageFactor = Math.min(1.0, Math.max(0.15, coveragePercent / 50))
    readinessScore = Math.max(0, Math.min(100, Math.round(weightedSum * coverageFactor)))
  }

  // 8. CONFIDENCE LEVEL
  let confidenceLevel = 'Not Started'
  if (readinessScore >= 75) {
    confidenceLevel = 'High Confidence'
  } else if (readinessScore >= 50) {
    confidenceLevel = 'Moderate'
  } else if (readinessScore > 0) {
    confidenceLevel = 'Developing'
  }

  // 9. HISTORICAL SNAPSHOTS & TREND
  const snapshots = chapterId ? getChapterSnapshots(chapterId) : []
  const trendInfo = calculateTrendDirection(snapshots, 'readiness')

  const coverageLevel = getAttemptCoverageLevel(coveragePercent)

  let state = 'IN_PROGRESS'
  if (total === 0) {
    state = 'NOT_AVAILABLE'
  } else if (uniqueAttemptedCount === 0) {
    state = 'NOT_STARTED'
  } else if (uniqueMasteredCount === total && total > 0) {
    state = 'MASTERED'
  }

  return {
    totalMcqs: total,
    attemptedMcqs: uniqueAttemptedCount,
    uniqueAttempted: uniqueAttemptedCount,
    masteredMcqs: uniqueMasteredCount,
    incorrectMcqs: uniqueIncorrectCount,
    unseenMcqs: unseenCount,
    remainingQuestions,
    remainingUnmastered,
    coveragePercent,
    masteryPercentage,
    accuracyPercentage,
    consistencyScore,
    revisionScore,
    revisionRequirement,
    readinessScore,
    confidenceLevel,
    coverageLevel,
    totalCorrectResponses,
    totalResponses,
    latestAttemptTimestamp,
    state,
    isCompleted: state === 'MASTERED',
    priority: chapterPriority,
    trendDirection: trendInfo.direction,
    trendSymbol: trendInfo.symbol,
    trendDelta: trendInfo.delta,
    trendLabel: trendInfo.label,
    hasTrendHistory: trendInfo.hasHistory,
  }
}

export default {
  calculateDeepChapterPerformance,
}
