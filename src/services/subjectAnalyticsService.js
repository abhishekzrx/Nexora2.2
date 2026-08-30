/**
 * subjectAnalyticsService.js
 * Subject-Level Performance Intelligence Engine.
 *
 * Implements Phase 2 Requirements:
 * - Aggregates ALL chapters belonging to the subject.
 * - Does NOT simply average chapter percentages; uses weighted aggregation:
 *     Chapter Importance Weight (VERY HIGH > HIGH > MEDIUM > LOW)
 *     Chapter Pool Size Factor (500 MCQs has more impact than 50 MCQs).
 * - Identifies Strong Chapters, Weak Chapters, and Immediate Focus (High Priority + Low Performance).
 * - Pulls historical subject trend data for Hero and Subject Analysis tabs.
 */

import {
  getPriorityWeight,
  PERFORMANCE_THRESHOLDS,
  METRIC_TYPES,
} from '../config/performanceConfig.js'
import { getSubjectSnapshots, calculateTrendDirection } from './trendService.js'
import { getAttemptCoverageLevel } from './mcqAnalyticsService.js'

/**
 * Calculate deep subject intelligence from all constituent chapters.
 *
 * @param {Object} subject - The subject entity
 * @param {Array} chaptersWithMetrics - Array of chapters with precalculated deep metrics
 * @param {string} subjectId - Unique subject ID
 */
export function calculateSubjectIntelligence(
  subject = {},
  chaptersWithMetrics = [],
  subjectId = null
) {
  const chapters = Array.isArray(chaptersWithMetrics) ? chaptersWithMetrics : []

  let totalWeight = 0
  let weightedReadinessSum = 0
  let weightedAccuracySum = 0
  let weightedCoverageSum = 0
  let weightedMasterySum = 0

  let subjectTotalMcqs = 0
  let subjectAttemptedMcqs = 0
  let subjectMasteredMcqs = 0
  let subjectIncorrectMcqs = 0
  let subjectUnseenMcqs = 0
  let subjectTotalResponses = 0
  let subjectCorrectResponses = 0
  let subjectCompletedChapters = 0

  const processedChapters = chapters.map((ch, idx) => {
    const totalMcqs = Number(ch.totalMcqs || ch.mcqs || 0)
    const priority = ch.priority || ch.priorityLabel || 'M'
    const prioWeight = getPriorityWeight(priority)
    // Scale factor combines priority weight and relative chapter MCQ size
    const sizeFactor = Math.max(1, Math.sqrt(totalMcqs))
    const chapterWeight = prioWeight * sizeFactor

    const readiness = Number(ch.readinessScore ?? ch.readiness ?? 0)
    const accuracy = Number(ch.accuracyPercent ?? ch.accuracyPercentage ?? ch.accuracy ?? 0)
    const coverage = Number(ch.coveragePercent ?? ch.progress ?? 0)
    const mastery = Number(ch.masteryPercent ?? ch.masteryPercentage ?? 0)

    totalWeight += chapterWeight
    weightedReadinessSum += readiness * chapterWeight
    weightedAccuracySum += accuracy * chapterWeight
    weightedCoverageSum += coverage * chapterWeight
    weightedMasterySum += mastery * chapterWeight

    subjectTotalMcqs += totalMcqs
    subjectAttemptedMcqs += Number(ch.attemptedMcqs || 0)
    subjectMasteredMcqs += Number(ch.masteredMcqs || 0)
    subjectIncorrectMcqs += Number(ch.incorrectMcqs || 0)
    subjectUnseenMcqs += Math.max(0, totalMcqs - Number(ch.attemptedMcqs || 0))
    subjectTotalResponses += Number(ch.totalResponses || 0)
    subjectCorrectResponses += Number(ch.totalCorrectResponses || 0)

    if (totalMcqs > 0 && ch.masteredMcqs === totalMcqs) {
      subjectCompletedChapters += 1
    }

    return {
      ...ch,
      chapterIndex: idx + 1,
      chapterWeight,
      readinessScore: readiness,
      accuracyPercentage: accuracy,
      coveragePercent: coverage,
      masteryPercentage: mastery,
    }
  })

  // 1. CALCULATE WEIGHTED AGGREGATE METRICS
  const subjectReadinessScore =
    totalWeight > 0 ? Math.round(weightedReadinessSum / totalWeight) : 0

  const subjectAccuracyPercentage =
    subjectTotalResponses > 0
      ? Math.round((subjectCorrectResponses / subjectTotalResponses) * 100)
      : totalWeight > 0
      ? Math.round(weightedAccuracySum / totalWeight)
      : 0

  const rawCoverage =
    subjectTotalMcqs > 0 ? (subjectAttemptedMcqs / subjectTotalMcqs) * 100 : 0
  const subjectCoveragePercent = Math.round(rawCoverage * 10) / 10

  const rawMastery =
    subjectAttemptedMcqs > 0 ? (subjectMasteredMcqs / subjectAttemptedMcqs) * 100 : 0
  const subjectMasteryPercentage = Math.round(rawMastery * 10) / 10

  const subjectCoverageLevel = getAttemptCoverageLevel(subjectCoveragePercent)

  // 2. CLASSIFY STRONG CHAPTERS (Accuracy >= 70%, Coverage >= 30%, Readiness >= 60%)
  const strongChapters = processedChapters.filter((ch) => {
    return (
      ch.accuracyPercentage >= PERFORMANCE_THRESHOLDS.strong.minAccuracy &&
      ch.coveragePercent >= PERFORMANCE_THRESHOLDS.strong.minCoverage &&
      ch.readinessScore >= PERFORMANCE_THRESHOLDS.strong.minReadiness
    )
  })

  // 3. CLASSIFY WEAK CHAPTERS (Accuracy < 50% or Readiness < 45% with attempted questions)
  const weakChapters = processedChapters
    .filter((ch) => {
      const hasAttempts = (ch.attemptedMcqs || 0) > 0
      const isWeak =
        ch.accuracyPercentage < PERFORMANCE_THRESHOLDS.weak.maxAccuracy ||
        ch.readinessScore < PERFORMANCE_THRESHOLDS.weak.maxReadiness
      return hasAttempts && isWeak
    })
    .map((ch) => {
      let reason = 'Low accuracy and insufficient concept coverage.'
      if (ch.accuracyPercentage < 40) {
        reason = 'Accuracy below 40% with high error rate.'
      } else if (ch.coveragePercent < 25) {
        reason = 'Accuracy below 50% with low question coverage.'
      } else if (ch.revisionRequirement === 'Urgent revision needed') {
        reason = 'Revision overdue; retention has declined.'
      }
      return {
        ...ch,
        weaknessReason: reason,
      }
    })

  // 4. CLASSIFY IMMEDIATE FOCUS CHAPTERS (HIGH/VERY HIGH Priority + Low Readiness < 50%)
  const immediateFocusChapters = processedChapters
    .filter((ch) => {
      const prio = String(ch.priority || ch.priorityLabel || 'M').toUpperCase().trim().replace(/[^A-Z]/g, '')
      const isHighPriority =
        prio === 'VH' || prio === 'VERYHIGH' || prio === 'H' || prio === 'HIGH' || prio.startsWith('VERY')
      const isLowReadiness = ch.readinessScore < PERFORMANCE_THRESHOLDS.immediateFocus.maxReadiness
      return isHighPriority && isLowReadiness
    })
    .map((ch) => ({
      ...ch,
      urgencyReason: 'High exam weightage with insufficient readiness. Practice recommended immediately.',
    }))

  // 5. RANK ALL CHAPTERS (Sorted by Readiness ascending so weakest/most urgent are prominent, with priority weighting)
  const rankedChapters = [...processedChapters].sort((a, b) => {
    const prioDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
    if (prioDiff !== 0) return prioDiff
    return a.readinessScore - b.readinessScore
  })

  // 6. HISTORICAL SNAPSHOTS & TRENDS FOR HERO & ANALYSIS TABS
  const effectiveSubjectId = subjectId || subject.id || subject.subjectId || subject.subjectKey
  const snapshotsAll = effectiveSubjectId ? getSubjectSnapshots(effectiveSubjectId, 'all') : []
  const snapshots30d = effectiveSubjectId ? getSubjectSnapshots(effectiveSubjectId, '30d') : []
  const snapshots7d = effectiveSubjectId ? getSubjectSnapshots(effectiveSubjectId, '7d') : []

  const readinessTrend = calculateTrendDirection(snapshotsAll, METRIC_TYPES.READINESS)
  const accuracyTrend = calculateTrendDirection(snapshotsAll, METRIC_TYPES.ACCURACY)
  const coverageTrend = calculateTrendDirection(snapshotsAll, METRIC_TYPES.COVERAGE)
  const masteryTrend = calculateTrendDirection(snapshotsAll, METRIC_TYPES.MASTERY)

  return {
    subjectId: effectiveSubjectId,
    subjectTitle: subject.title || subject.name || 'Subject',
    totalChapters: chapters.length,
    subjectTotalMcqs,
    subjectAttemptedMcqs,
    subjectMasteredMcqs,
    subjectIncorrectMcqs,
    subjectUnseenMcqs,
    subjectRemainingQuestions: Math.max(0, subjectTotalMcqs - subjectAttemptedMcqs),
    subjectReadinessScore,
    subjectAccuracyPercentage,
    subjectCoveragePercent,
    subjectMasteryPercentage,
    subjectCoverageLevel,
    subjectCompletedChapters,
    processedChapters,
    strongChapters,
    weakChapters,
    immediateFocusChapters,
    rankedChapters,
    hasPracticed: subjectAttemptedMcqs > 0,
    trends: {
      readiness: readinessTrend,
      accuracy: accuracyTrend,
      coverage: coverageTrend,
      mastery: masteryTrend,
    },
    snapshots: {
      all: snapshotsAll,
      '30d': snapshots30d,
      '7d': snapshots7d,
    },
  }
}

export default {
  calculateSubjectIntelligence,
}
