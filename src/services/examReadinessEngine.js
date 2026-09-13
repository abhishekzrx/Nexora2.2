/**
 * examReadinessEngine.js
 * Authoritative Exam Readiness Index (ERI) & Multi-Factor Constraint Engine.
 *
 * Implements Phase 2 Requirements:
 * 1. 14-Step ERI Calculation Pipeline using centralized ERI_MODEL_WEIGHTS.
 * 2. Academic Safety Caps / Constraints (prevents inflated readiness on low evidence or uncovered critical concepts).
 * 3. Subject Balance & Spread Penalty (detects weakest/strongest subjects, penalizes extreme disparity).
 * 4. Readiness Band Classification (STARTING to HIGHLY READY).
 * 5. Plain-English diagnostic explanation generation ("Why is my readiness X?").
 */

import {
  ANALYTICS_VERSION,
  ERI_MODEL_WEIGHTS,
  READINESS_BANDS,
  READINESS_CAPS_CONFIG,
  SUBJECT_BALANCE_CONFIG,
  getPriorityMultiplier,
} from '../config/analyticsConfig.js'

/**
 * Calculates subject balance metrics and spread penalty across constituent subjects.
 */
export function calculateSubjectBalance(subjects = []) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return {
      balanceScore: 100,
      balancePenalty: 0,
      spread: 0,
      strongestSubject: null,
      weakestSubject: null,
      hasSevereImbalance: false,
      subjectReadinessList: [],
    }
  }

  if (subjects.length === 1) {
    const s = subjects[0]
    return {
      balanceScore: 100,
      balancePenalty: 0,
      spread: 0,
      strongestSubject: s.title || s.name || 'Subject',
      weakestSubject: s.title || s.name || 'Subject',
      hasSevereImbalance: false,
      subjectReadinessList: [{ id: s.id, title: s.title || s.name, readiness: s.readinessScore || s.masteryScore || 0 }],
    }
  }

  const list = subjects.map((s) => ({
    id: s.id || s.subjectKey || 'sub',
    title: s.title || s.name || 'Subject',
    readiness: Number(s.readinessScore ?? s.masteryScore ?? s.readiness ?? 0),
    priority: s.priority || 'M',
    totalMcqs: Number(s.totalMcqs || 0),
    uncoveredConceptsCount: (s.uncoveredConcepts || []).length,
    weakConceptsCount: (s.weakConcepts || []).length,
  })).sort((a, b) => b.readiness - a.readiness)

  const strongest = list[0]
  const weakest = list[list.length - 1]
  const spread = Math.max(0, strongest.readiness - weakest.readiness)

  let balancePenalty = 0
  if (spread > SUBJECT_BALANCE_CONFIG.maxSpreadTolerance) {
    const excessSpread = spread - SUBJECT_BALANCE_CONFIG.maxSpreadTolerance
    balancePenalty = Math.min(
      SUBJECT_BALANCE_CONFIG.maxBalancePenalty,
      Math.round(excessSpread * SUBJECT_BALANCE_CONFIG.spreadPenaltyMultiplier)
    )
  }

  const balanceScore = Math.max(0, Math.min(100, 100 - balancePenalty * 4))
  const hasSevereImbalance = spread >= READINESS_CAPS_CONFIG.severeSubjectSpreadThreshold

  return {
    balanceScore,
    balancePenalty,
    spread,
    strongestSubject: strongest.title,
    weakestSubject: weakest.title,
    weakestSubjectId: weakest.id,
    hasSevereImbalance,
    subjectReadinessList: list,
  }
}

/**
 * Evaluates priority coverage ratio across high-priority chapters and concepts.
 */
export function calculatePriorityCoverage(chapters = [], uncoveredConcepts = []) {
  if (!Array.isArray(chapters) || chapters.length === 0) return 100

  const highPriorityChapters = chapters.filter((ch) => {
    const prio = String(ch.priority || ch.priorityLabel || '').toUpperCase()
    return prio.includes('HIGH') || prio === 'H' || prio === 'VH'
  })

  if (highPriorityChapters.length === 0) return 100

  let totalWeight = 0
  let weightedMasterySum = 0

  highPriorityChapters.forEach((ch) => {
    const pWeight = getPriorityMultiplier(ch.priority || 'HIGH')
    const mast = Number(ch.masteryScore ?? ch.mastery ?? 0)
    totalWeight += pWeight
    weightedMasterySum += mast * pWeight
  })

  const highPriorityMastery = totalWeight > 0 ? Math.round(weightedMasterySum / totalWeight) : 0
  return highPriorityMastery
}

/**
 * Assigns the formal Readiness Band from an ERI value (0–100).
 */
export function getReadinessBand(eriScore = 0) {
  const score = Math.max(0, Math.min(100, Math.round(Number(eriScore) || 0)))

  if (score >= READINESS_BANDS.HIGHLY_READY.min) return READINESS_BANDS.HIGHLY_READY
  if (score >= READINESS_BANDS.STRONGLY_READY.min) return READINESS_BANDS.STRONGLY_READY
  if (score >= READINESS_BANDS.EXAM_READY.min) return READINESS_BANDS.EXAM_READY
  if (score >= READINESS_BANDS.PROGRESSING.min) return READINESS_BANDS.PROGRESSING
  if (score >= READINESS_BANDS.DEVELOPING.min) return READINESS_BANDS.DEVELOPING
  if (score >= READINESS_BANDS.BUILDING_FOUNDATION.min) return READINESS_BANDS.BUILDING_FOUNDATION
  return READINESS_BANDS.STARTING
}

/**
 * Primary 14-Step Exam Readiness Index (ERI) Pipeline.
 */
export function calculateExamReadinessIndex({
  performanceQuality = 0,
  conceptCoverage = 0,
  mastery = 0,
  difficultyStrength = 0,
  consistency = 70,
  recency = 100,
  evidenceConfidence = 50,
  subjects = [],
  chapters = [],
  uncoveredConcepts = [],
  weakConcepts = [],
}) {
  const w = ERI_MODEL_WEIGHTS

  // 1. Balance Analysis
  const balanceInfo = calculateSubjectBalance(subjects)

  // 2. Priority Coverage
  const priorityCoverage = calculatePriorityCoverage(chapters, uncoveredConcepts)

  // 3. Raw Synthesis
  const rawWeightedSum =
    (performanceQuality * w.performanceQuality) +
    (conceptCoverage * w.conceptCoverage) +
    (mastery * w.mastery) +
    (difficultyStrength * w.difficultyStrength) +
    (consistency * w.consistency) +
    (recency * w.recency) +
    (evidenceConfidence * w.evidenceConfidence) +
    (balanceInfo.balanceScore * w.subjectBalance) +
    (priorityCoverage * w.priorityCoverage)

  const rawEri = Math.max(0, Math.min(100, Math.round(rawWeightedSum - balanceInfo.balancePenalty)))

  // 4. Critical Academic Gap Detection & Safety Caps
  const capsApplied = []
  let cappedEri = rawEri

  // Cap Rule 0: Poor performance quality (< 45% accuracy)
  if (performanceQuality < READINESS_CAPS_CONFIG.lowPerformanceQualityThreshold && cappedEri > READINESS_CAPS_CONFIG.lowPerformanceQualityMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.lowPerformanceQualityMaxCap
    capsApplied.push({
      reason: `Foundational accuracy is only ${performanceQuality}% (below ${READINESS_CAPS_CONFIG.lowPerformanceQualityThreshold}% benchmark)`,
      capValue: READINESS_CAPS_CONFIG.lowPerformanceQualityMaxCap,
    })
  }

  // Cap Rule 1: Critically low concept coverage (< 25%)
  if (conceptCoverage < READINESS_CAPS_CONFIG.criticallyLowConceptCoverageThreshold && cappedEri > READINESS_CAPS_CONFIG.criticallyLowConceptCoverageMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.criticallyLowConceptCoverageMaxCap
    capsApplied.push({
      reason: `Concept coverage is only ${conceptCoverage}% (below ${READINESS_CAPS_CONFIG.criticallyLowConceptCoverageThreshold}% minimum threshold)`,
      capValue: READINESS_CAPS_CONFIG.criticallyLowConceptCoverageMaxCap,
    })
  }

  // Cap Rule 1b: Low difficulty strength (< 40%)
  if (difficultyStrength < READINESS_CAPS_CONFIG.lowDifficultyStrengthThreshold && cappedEri > READINESS_CAPS_CONFIG.lowDifficultyStrengthMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.lowDifficultyStrengthMaxCap
    capsApplied.push({
      reason: `Difficulty strength is ${difficultyStrength}% (struggling on Hard MCQs)`,
      capValue: READINESS_CAPS_CONFIG.lowDifficultyStrengthMaxCap,
    })
  }

  // Cap Rule 2: Multiple High-Priority concepts uncovered
  const highPriorityUncovered = uncoveredConcepts.filter((c) => {
    const prio = String(c.priority || '').toUpperCase()
    return prio.includes('HIGH') || prio === 'H' || prio === 'VH'
  })
  if (highPriorityUncovered.length > READINESS_CAPS_CONFIG.maxUncoveredHighPriorityConceptsAllowed && cappedEri > READINESS_CAPS_CONFIG.uncoveredHighPriorityMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.uncoveredHighPriorityMaxCap
    capsApplied.push({
      reason: `${highPriorityUncovered.length} high-priority concepts remain unpracticed`,
      capValue: READINESS_CAPS_CONFIG.uncoveredHighPriorityMaxCap,
    })
  }

  // Cap Rule 3: High-priority chapter critically weak (< 40% mastery)
  const weakHighPriorityChapters = chapters.filter((ch) => {
    const prio = String(ch.priority || ch.priorityLabel || '').toUpperCase()
    const isHighPrio = prio.includes('HIGH') || prio === 'H' || prio === 'VH'
    const mast = Number(ch.masteryScore ?? ch.mastery ?? 0)
    return isHighPrio && mast < READINESS_CAPS_CONFIG.criticalHighPriorityChapterMinMastery
  })
  if (weakHighPriorityChapters.length > 0 && cappedEri > READINESS_CAPS_CONFIG.criticalHighPriorityChapterMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.criticalHighPriorityChapterMaxCap
    capsApplied.push({
      reason: `High-priority chapter '${weakHighPriorityChapters[0].title || weakHighPriorityChapters[0].name}' is critically weak (${weakHighPriorityChapters[0].masteryScore ?? 0}% mastery)`,
      capValue: READINESS_CAPS_CONFIG.criticalHighPriorityChapterMaxCap,
    })
  }

  // Cap Rule 4: Very low evidence confidence (< 30)
  if (evidenceConfidence < READINESS_CAPS_CONFIG.lowEvidenceConfidenceThreshold && cappedEri > READINESS_CAPS_CONFIG.lowEvidenceConfidenceMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.lowEvidenceConfidenceMaxCap
    capsApplied.push({
      reason: `Insufficient practice evidence (${evidenceConfidence}/100 confidence)`,
      capValue: READINESS_CAPS_CONFIG.lowEvidenceConfidenceMaxCap,
    })
  }

  // Cap Rule 5: Severe subject imbalance
  if (balanceInfo.hasSevereImbalance && cappedEri > READINESS_CAPS_CONFIG.severeSubjectSpreadMaxCap) {
    cappedEri = READINESS_CAPS_CONFIG.severeSubjectSpreadMaxCap
    capsApplied.push({
      reason: `Large performance spread (${balanceInfo.spread} pts) between '${balanceInfo.strongestSubject}' and '${balanceInfo.weakestSubject}'`,
      capValue: READINESS_CAPS_CONFIG.severeSubjectSpreadMaxCap,
    })
  }

  const finalEri = Math.max(0, Math.min(100, Math.round(cappedEri)))
  const readinessBand = getReadinessBand(finalEri)

  // 5. Generate Diagnostic Explanations
  const explanations = []
  if (performanceQuality >= 75) {
    explanations.push('Overall accuracy and question-solving quality are strong.')
  } else if (performanceQuality < 55) {
    explanations.push('Accuracy is currently low; focus on foundational concept comprehension.')
  }

  if (conceptCoverage >= 80) {
    explanations.push('Broad concept coverage achieved across syllabus.')
  } else if (conceptCoverage < 50) {
    explanations.push(`${Math.round(100 - conceptCoverage)}% of syllabus concepts remain unpracticed.`)
  }

  if (difficultyStrength >= 75) {
    explanations.push('Excellent performance on difficult and multi-step reasoning questions.')
  } else if (difficultyStrength < 50) {
    explanations.push('Performance declines on difficult and complex multi-angle MCQs.')
  }

  if (balanceInfo.balancePenalty > 0) {
    explanations.push(`Preparation is uneven across subjects; '${balanceInfo.weakestSubject}' requires focused revision.`)
  }

  capsApplied.forEach((cap) => {
    explanations.push(`Safety cap applied: ${cap.reason}.`)
  })

  return {
    analyticsVersion: ANALYTICS_VERSION,
    examReadinessIndex: finalEri,
    rawEri,
    readinessBand,
    readinessConfidence: evidenceConfidence,
    isCapped: capsApplied.length > 0,
    capsApplied,
    subjectBalance: balanceInfo,
    priorityCoverage,
    explanations,
  }
}

export default {
  calculateSubjectBalance,
  calculatePriorityCoverage,
  getReadinessBand,
  calculateExamReadinessIndex,
}
