/**
 * rankingEngine.js
 * Course-Scoped Academic Ranking, Eligibility & Privacy Safeguard Engine.
 *
 * Implements Phase 2 Requirements:
 * 1. Multi-metric Academic Rank (ERI 35%, Mastery 25%, Accuracy 15%, Coverage 10%, Consistency 10%, Confidence 5%).
 * 2. Deterministic 6-tier tie breaking.
 * 3. Eligibility Gate: Students with insufficient practice show "Not enough data" instead of inaccurate ranks.
 * 4. Privacy Guarantee: Zero peer analytics leakage (only own rank, total count, percentile, and trend).
 */

import { RANKING_CONFIG } from '../config/analyticsConfig.js'

/**
 * Validates if a student has enough empirical evidence to be eligible for ranking.
 */
export function validateRankingEligibility(studentMetrics = {}) {
  const uniqueAttempted = Number(studentMetrics.uniqueAttemptedCount || studentMetrics.attemptedMcqs || 0)
  const sessionsCount = Number(studentMetrics.sessionsCount || (Array.isArray(studentMetrics.sessions) ? studentMetrics.sessions.length : 0))
  const confidence = Number(studentMetrics.readinessConfidence || studentMetrics.confidenceScore || 0)

  if (
    uniqueAttempted < RANKING_CONFIG.minUniqueAttemptsForRanking ||
    sessionsCount < RANKING_CONFIG.minSessionsForRanking ||
    confidence < RANKING_CONFIG.minConfidenceForRanking
  ) {
    return {
      isEligible: false,
      statusMessage: 'Not enough data for reliable ranking (minimum 15 unique MCQs across 2+ sessions required)',
      reason: 'INSUFFICIENT_EVIDENCE',
      currentEvidence: { uniqueAttempted, sessionsCount, confidence },
    }
  }

  return {
    isEligible: true,
    statusMessage: 'Eligible',
  }
}

/**
 * Computes deterministic composite academic ranking score.
 */
export function calculateAcademicRankingScore(metrics = {}) {
  const w = RANKING_CONFIG.weights
  const eri = Number(metrics.examReadinessIndex ?? metrics.readinessScore ?? 0)
  const mastery = Number(metrics.masteryScore ?? metrics.mastery ?? 0)
  const accuracy = Number(metrics.accuracy ?? metrics.overallAccuracy ?? 0)
  const coverage = Number(metrics.conceptCoverage ?? metrics.questionCoverage ?? 0)
  const consistency = Number(metrics.consistencyScore ?? metrics.consistency ?? 70)
  const confidence = Number(metrics.readinessConfidence ?? metrics.confidenceScore ?? 50)

  const score =
    eri * w.eri +
    mastery * w.mastery +
    accuracy * w.accuracy +
    coverage * w.conceptCoverage +
    consistency * w.consistency +
    confidence * w.confidence

  return Math.round(score * 100) / 100
}

/**
 * Deterministic multi-tier comparator for students in the same course.
 */
export function compareStudentsForRanking(a, b) {
  const scoreA = calculateAcademicRankingScore(a)
  const scoreB = calculateAcademicRankingScore(b)
  if (scoreB !== scoreA) return scoreB - scoreA

  // Tie-breaker 1: Exam Readiness Index
  const eriA = Number(a.examReadinessIndex ?? 0)
  const eriB = Number(b.examReadinessIndex ?? 0)
  if (eriB !== eriA) return eriB - eriA

  // Tie-breaker 2: Mastery
  const mastA = Number(a.masteryScore ?? 0)
  const mastB = Number(b.masteryScore ?? 0)
  if (mastB !== mastA) return mastB - mastA

  // Tie-breaker 3: Accuracy
  const accA = Number(a.accuracy ?? 0)
  const accB = Number(b.accuracy ?? 0)
  if (accB !== accA) return accB - accA

  // Tie-breaker 4: Concept Coverage
  const covA = Number(a.conceptCoverage ?? 0)
  const covB = Number(b.conceptCoverage ?? 0)
  if (covB !== covA) return covB - covA

  // Tie-breaker 5: Consistency
  const constA = Number(a.consistencyScore ?? 0)
  const constB = Number(b.consistencyScore ?? 0)
  if (constB !== constA) return constB - constA

  // Tie-breaker 6: Confidence
  const confA = Number(a.readinessConfidence ?? 0)
  const confB = Number(b.readinessConfidence ?? 0)
  return confB - confA
}

/**
 * Calculates a student's private personal rank and percentile in a course cohort.
 */
export function calculatePersonalRanking({
  targetUserId,
  currentStudentMetrics = {},
  cohortParticipants = [],
  previousRank = null,
}) {
  const eligibility = validateRankingEligibility(currentStudentMetrics)
  if (!eligibility.isEligible) {
    return {
      isEligible: false,
      statusMessage: eligibility.statusMessage,
      rank: null,
      totalEligibleParticipants: 0,
      percentile: null,
      percentileLabel: 'Not enough data',
      rankTrend: null,
    }
  }

  // Filter only eligible cohort participants
  const eligibleCohort = (cohortParticipants || [])
    .filter((p) => p && p.userId !== targetUserId)
    .map((p) => ({
      userId: p.userId,
      ...p,
      isEligible: validateRankingEligibility(p).isEligible,
    }))
    .filter((p) => p.isEligible)

  // Add target student
  const targetStudent = {
    userId: targetUserId,
    ...currentStudentMetrics,
    isEligible: true,
  }

  const allEligible = [...eligibleCohort, targetStudent].sort(compareStudentsForRanking)
  const totalEligible = allEligible.length
  const rankIndex = allEligible.findIndex((p) => p.userId === targetUserId)
  const rank = rankIndex !== -1 ? rankIndex + 1 : 1

  // Percentile calculation: (1 - (rank - 1) / total) * 100
  const rawPercentile = totalEligible > 0 ? Math.max(1, Math.round(((totalEligible - rank + 1) / totalEligible) * 100)) : 100
  const topPercent = Math.max(1, Math.round((rank / totalEligible) * 100))
  const percentileLabel = topPercent <= 10 ? `Top ${topPercent}%` : `Top ${topPercent}% of Class`

  let rankTrend = { delta: 0, direction: 'STABLE', label: '→ Stable' }
  if (previousRank && typeof previousRank === 'number' && previousRank > 0) {
    const delta = previousRank - rank // positive delta means climbed ranks
    if (delta > 0) {
      rankTrend = { delta, direction: 'UP', label: `↑ ${delta} position${delta > 1 ? 's' : ''}` }
    } else if (delta < 0) {
      rankTrend = { delta: Math.abs(delta), direction: 'DOWN', label: `↓ ${Math.abs(delta)} position${Math.abs(delta) > 1 ? 's' : ''}` }
    }
  }

  return {
    isEligible: true,
    rank,
    totalEligibleParticipants: totalEligible,
    percentile: rawPercentile,
    topPercent,
    percentileLabel,
    rankTrend,
    statusMessage: `Rank #${rank} of ${totalEligible} (${percentileLabel})`,
  }
}

export default {
  validateRankingEligibility,
  calculateAcademicRankingScore,
  compareStudentsForRanking,
  calculatePersonalRanking,
}
