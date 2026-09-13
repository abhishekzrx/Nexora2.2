/**
 * studentAnalyticsEngine.js
 * Centralized Authoritative Mathematical Calculation Engine for Student Performance & Analytics.
 *
 * Implements Phase 1 Calculation Contracts:
 * 1. Immutable calculations for Accuracy, Question Coverage, Concept Coverage, Mastery, Confidence, Consistency, Recency, Difficulty.
 * 2. Strict distinction: UNCOVERED (insufficient evidence) ≠ WEAK (sufficient evidence, low accuracy).
 * 3. Question Coverage = Unique Questions Attempted / Total Pool (Repeated attempts never inflate coverage).
 * 4. Mastery Engine combining Performance, Evidence, Difficulty, Consistency, and Recency.
 * 5. Dynamic support for arbitrary Chapter, Subject, and Course counts without hardcoding.
 */

import {
  ANALYTICS_VERSION,
  MASTERY_MODEL_WEIGHTS,
  CONCEPT_THRESHOLDS,
  SESSION_EVIDENCE_WEIGHTS,
  DIFFICULTY_WEIGHTS,
  getPriorityMultiplier,
  RECENCY_CONFIG,
  CONFIDENCE_CONFIG,
} from '../config/analyticsConfig.js'
import { getFlatConceptsForChapter } from './knowledgeHierarchyService.js'
import { calculateExamReadinessIndex, getReadinessBand, calculateSubjectBalance } from './examReadinessEngine.js'
import { identifyReadinessBottlenecks } from './bottleneckEngine.js'
import { generateSmartRecommendations } from './recommendationEngine.js'
import { calculatePersonalRanking } from './rankingEngine.js'
import { calculateWindowComparison, calculateLearningMomentum, calculateWeaknessTrend } from './trendEngine.js'

// ── 1. ACCURACY CALCULATIONS ────────────────────────────────────────

/**
 * Calculates overall accuracy from an array of valid attempt records or progress records.
 * Overall Accuracy = Total Correct Valid Responses / Total Valid Responses
 */
export function calculateOverallAccuracy(records = []) {
  if (!Array.isArray(records) || records.length === 0) return 0

  let totalCorrect = 0
  let totalResponses = 0

  records.forEach((rec) => {
    if (!rec) return
    const attempts = Math.max(
      Number(rec.total_attempts || rec.attempts || 0),
      (Number(rec.correct_attempts || rec.correct_count || 0)) + (Number(rec.incorrect_attempts || rec.incorrect_count || 0)),
      1
    )
    const correct = Number(rec.correct_attempts ?? rec.correct_count ?? (rec.status === 'MASTERED' || rec.result === 'CORRECT' ? 1 : 0)) || 0
    totalResponses += attempts
    totalCorrect += Math.min(correct, attempts)
  })

  return totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0
}

/**
 * Calculates first-attempt accuracy (evaluates initial understanding prior to repetition).
 */
export function calculateFirstAttemptAccuracy(progressRecords = []) {
  if (!Array.isArray(progressRecords) || progressRecords.length === 0) return 0

  let firstAttemptTotal = 0
  let firstAttemptCorrect = 0

  progressRecords.forEach((rec) => {
    if (!rec) return
    const status = String(rec.status || '').toUpperCase()
    if (status === 'UNSEEN') return

    firstAttemptTotal += 1
    const firstRes = String(rec.first_result || (rec.incorrect_count === 0 && (rec.correct_count > 0 || status === 'MASTERED') ? 'CORRECT' : 'INCORRECT')).toUpperCase()
    if (firstRes === 'CORRECT') {
      firstAttemptCorrect += 1
    }
  })

  return firstAttemptTotal > 0 ? Math.round((firstAttemptCorrect / firstAttemptTotal) * 100) : 0
}

/**
 * Calculates recent accuracy from the most recent N sessions or attempts.
 */
export function calculateRecentAccuracy(attempts = [], limit = 10) {
  if (!Array.isArray(attempts) || attempts.length === 0) return 0
  const recent = attempts.slice(-limit)
  let totalAttempted = 0
  let totalCorrect = 0

  recent.forEach((att) => {
    totalAttempted += Number(att.attempted_count || att.attempted || att.total || 0)
    totalCorrect += Number(att.correct_count || att.correct || att.score || 0)
  })

  return totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0
}

// ── 2. QUESTION COVERAGE ────────────────────────────────────────────

/**
 * Calculates Question Coverage.
 * Question Coverage = Unique MCQs Attempted / Total Available MCQs
 * Repeated attempts NEVER increase question coverage.
 */
export function calculateQuestionCoverage(uniqueAttempted = 0, totalAvailable = 0) {
  const total = Math.max(0, Number(totalAvailable) || 0)
  const unique = Math.max(0, Math.min(total > 0 ? total : Infinity, Number(uniqueAttempted) || 0))
  if (total === 0) return 0
  return Math.min(100, Math.round((unique / total) * 100))
}

// ── 3. CONCEPT-LEVEL PERFORMANCE & COVERAGE ─────────────────────────

/**
 * Evaluates performance for a single concept.
 * Enforces rule: UNCOVERED (insufficient evidence) ≠ WEAK (sufficient evidence, poor accuracy).
 */
export function evaluateConceptPerformance(concept, progressRecords = []) {
  if (!concept) return null

  // Support direct summary objects: { total: 5, correct: 1 } or { totalAttempts: 5, correctAttempts: 1 }
  if (typeof concept.total === 'number' || typeof concept.totalAttempts === 'number') {
    const totalAttempts = Number(concept.totalAttempts ?? concept.total ?? 0)
    const correctAttempts = Number(concept.correctAttempts ?? concept.correct ?? 0)
    const incorrectAttempts = Math.max(0, totalAttempts - correctAttempts)
    const uniqueQuestions = Number(concept.uniqueQuestions ?? (totalAttempts > 0 ? 1 : 0))
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

    const hasMeaningfulEvidence = totalAttempts >= CONCEPT_THRESHOLDS.minAttemptsForEvidence || uniqueQuestions >= CONCEPT_THRESHOLDS.minUniqueQuestionsForEvidence

    let status = 'UNCOVERED'
    if (!hasMeaningfulEvidence) {
      status = 'UNCOVERED'
    } else if (accuracy < CONCEPT_THRESHOLDS.learningMinAccuracy) {
      status = 'WEAK'
    } else if (accuracy < CONCEPT_THRESHOLDS.competentMinAccuracy) {
      status = 'LEARNING'
    } else if (accuracy < CONCEPT_THRESHOLDS.masteredMinAccuracy) {
      status = 'COMPETENT'
    } else {
      status = 'STRONG'
    }

    return {
      id: concept.id || 'concept_summary',
      name: concept.name || 'Concept',
      status,
      hasEvidence: hasMeaningfulEvidence,
      isWeak: status === 'WEAK',
      isUncovered: status === 'UNCOVERED',
      isLearning: status === 'LEARNING',
      isCompetent: status === 'COMPETENT',
      isStrong: status === 'STRONG' || status === 'MASTERED',
      isMastered: status === 'MASTERED' || status === 'STRONG',
      uniqueQuestions,
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      accuracy,
      lastPracticedAt: concept.lastPracticedAt || null,
    }
  }

  const cId = concept.id || concept.conceptId
  const matchingRecords = progressRecords.filter((rec) => {
    if (!rec) return false
    return String(rec.concept_id || rec.conceptId) === String(cId)
  })

  const uniqueQuestions = new Set(matchingRecords.map((r) => r.mcq_id || r.mcqId)).size
  let totalAttempts = 0
  let correctAttempts = 0
  let incorrectAttempts = 0
  let lastPracticedAt = null

  matchingRecords.forEach((r) => {
    const att = Math.max(Number(r.total_attempts || r.attempts || 1), 1)
    const corr = Number(r.correct_attempts ?? r.correct_count ?? (r.status === 'MASTERED' ? 1 : 0)) || 0
    const incorr = Number(r.incorrect_attempts ?? r.incorrect_count ?? (r.status === 'INCORRECT' ? 1 : 0)) || 0
    totalAttempts += att
    correctAttempts += corr
    incorrectAttempts += incorr

    const d = r.last_attempted_at ? new Date(r.last_attempted_at).getTime() : 0
    if (d && (!lastPracticedAt || d > lastPracticedAt)) {
      lastPracticedAt = d
    }
  })

  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  // Determine Concept Status
  let status = 'UNCOVERED'
  const hasMeaningfulEvidence = totalAttempts >= CONCEPT_THRESHOLDS.minAttemptsForEvidence || uniqueQuestions >= CONCEPT_THRESHOLDS.minUniqueQuestionsForEvidence

  if (!hasMeaningfulEvidence) {
    status = 'UNCOVERED' // Insufficient evidence - NEVER automatically marked WEAK
  } else if (accuracy < CONCEPT_THRESHOLDS.learningMinAccuracy) {
    status = 'WEAK' // Sufficient evidence + poor accuracy
  } else if (accuracy < CONCEPT_THRESHOLDS.competentMinAccuracy) {
    status = 'LEARNING'
  } else if (accuracy < CONCEPT_THRESHOLDS.masteredMinAccuracy) {
    status = 'COMPETENT'
  } else {
    status = 'MASTERED'
  }

  return {
    id: cId,
    name: concept.name || concept.title || 'Concept',
    topicId: concept.topicId || null,
    topicName: concept.topicName || null,
    status,
    hasEvidence: hasMeaningfulEvidence,
    isWeak: status === 'WEAK',
    isUncovered: status === 'UNCOVERED',
    isLearning: status === 'LEARNING',
    isCompetent: status === 'COMPETENT',
    isStrong: status === 'MASTERED',
    isMastered: status === 'MASTERED',
    uniqueQuestions,
    totalAttempts,
    correctAttempts,
    incorrectAttempts,
    accuracy,
    lastPracticedAt,
  }
}

/**
 * Calculates Concept Coverage across a list of concepts for a chapter/subject.
 * Concept Coverage = Meaningfully Practiced Concepts / Total Active Concepts
 */
export function calculateConceptCoverage(concepts = [], progressRecords = []) {
  if (!Array.isArray(concepts) || concepts.length === 0) {
    return {
      coveragePercent: 0,
      totalConcepts: 0,
      coveredCount: 0,
      weakCount: 0,
      uncoveredCount: 0,
      masteredCount: 0,
      conceptPerformances: [],
    }
  }

  const performances = concepts.map((c) => evaluateConceptPerformance(c, progressRecords))
  const covered = performances.filter((p) => p.hasEvidence)
  const weak = performances.filter((p) => p.status === 'WEAK')
  const uncovered = performances.filter((p) => p.status === 'UNCOVERED')
  const mastered = performances.filter((p) => p.status === 'MASTERED')

  const coveragePercent = Math.min(100, Math.round((covered.length / concepts.length) * 100))

  return {
    coveragePercent,
    totalConcepts: concepts.length,
    coveredCount: covered.length,
    weakCount: weak.length,
    uncoveredCount: uncovered.length,
    masteredCount: mastered.length,
    conceptPerformances: performances,
    weakConcepts: weak,
    uncoveredConcepts: uncovered,
  }
}

// ── 4. DIFFICULTY BREAKDOWN & STRENGTH ──────────────────────────────

/**
 * Calculates accuracy and performance breakdown across difficulty levels (Easy, Moderate, Difficult, Very Difficult).
 */
export function calculateDifficultyBreakdown(progressRecords = []) {
  const breakdown = {
    EASY: { attempts: 0, correct: 0, accuracy: 0, weight: DIFFICULTY_WEIGHTS.EASY },
    MODERATE: { attempts: 0, correct: 0, accuracy: 0, weight: DIFFICULTY_WEIGHTS.MODERATE },
    DIFFICULT: { attempts: 0, correct: 0, accuracy: 0, weight: DIFFICULTY_WEIGHTS.DIFFICULT },
    VERY_DIFFICULT: { attempts: 0, correct: 0, accuracy: 0, weight: DIFFICULTY_WEIGHTS.VERY_DIFFICULT },
  }

  progressRecords.forEach((rec) => {
    if (!rec) return
    const rawDiff = String(rec.difficulty || 'Moderate').toUpperCase()
    let diffKey = 'MODERATE'
    if (rawDiff.includes('VERY') || rawDiff === 'HARD' || rawDiff === 'DIFFICULT') {
      diffKey = rawDiff.includes('VERY') ? 'VERY_DIFFICULT' : 'DIFFICULT'
    } else if (rawDiff === 'MEDIUM' || rawDiff === 'MODERATE') {
      diffKey = 'MODERATE'
    } else if (rawDiff === 'EASY') {
      diffKey = 'EASY'
    }

    const att = Math.max(Number(rec.total_attempts || rec.attempts || 1), 1)
    const corr = Number(rec.correct_attempts ?? rec.correct_count ?? (rec.status === 'MASTERED' ? 1 : 0)) || 0

    breakdown[diffKey].attempts += att
    breakdown[diffKey].correct += corr
  })

  let weightedSum = 0
  let totalWeight = 0

  Object.keys(breakdown).forEach((k) => {
    const item = breakdown[k]
    item.accuracy = item.attempts > 0 ? Math.round((item.correct / item.attempts) * 100) : 0
    if (item.attempts > 0) {
      weightedSum += item.accuracy * item.weight
      totalWeight += item.weight
    }
  })

  const difficultyStrength = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

  // Provide convenient lowercase aliases
  breakdown.easy = breakdown.EASY
  breakdown.medium = breakdown.MODERATE
  breakdown.moderate = breakdown.MODERATE
  breakdown.hard = breakdown.DIFFICULT
  breakdown.difficult = breakdown.DIFFICULT

  return {
    breakdown,
    difficultyStrength,
  }
}

// ── 5. CONSISTENCY & STABILITY ──────────────────────────────────────

/**
 * Calculates consistency / stability score (0–100) based on variance across rolling sessions.
 * Low variance between multiple sessions = high stability.
 */
export function calculateConsistencyScore(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length < 2) {
    // Single session or no data has neutral baseline stability
    return sessions.length === 1 ? 70 : 50
  }

  const scores = sessions.map((s) => Number(s.accuracy ?? s.percentage ?? 0))
  const mean = scores.reduce((sum, v) => sum + v, 0) / scores.length

  const variance = scores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Standard deviation of 0 -> 100% stability. StdDev of 30+ -> low stability.
  const stability = Math.max(0, Math.min(100, Math.round(100 - stdDev * 2)))
  return stability
}

// ── 6. RECENCY FACTOR ───────────────────────────────────────────────

/**
 * Calculates recency factor (0–100) based on time elapsed since last practice.
 * Continuous exponential decay with configurable half-life (default 30 days).
 */
export function calculateRecencyScore(lastAttemptedTimestamp = null, referenceTimestamp = null, halfLifeDays = RECENCY_CONFIG.halfLifeDays) {
  if (!lastAttemptedTimestamp) return 50

  const now = typeof referenceTimestamp === 'number' ? referenceTimestamp : Date.now()
  const lastTime = new Date(lastAttemptedTimestamp).getTime()
  if (isNaN(lastTime)) return 50

  const elapsedDays = Math.max(0, (now - lastTime) / (1000 * 60 * 60 * 24))

  // Continuous exponential decay with configured half-life
  const decayFactor = Math.pow(0.5, elapsedDays / halfLifeDays)
  return Math.max(0, Math.min(100, Math.round(100 * decayFactor)))
}

// ── 7. ANALYTICS CONFIDENCE SCORE ───────────────────────────────────

/**
 * Calculates Analytics Confidence Score (0–100).
 * Represents the volume, diversity, and reliability of evidence supporting the measurements.
 * 10/10 in 1 session = high accuracy, low confidence. 200+ attempts across concepts = high confidence.
 */
export function calculateConfidenceScore({
  uniqueQuestionsAttempted = 0,
  totalAvailableQuestions = 1,
  totalAttempts = 0,
  sessionsCount = 0,
  conceptCoveragePercent = 0,
}) {
  const qCoverageRatio = totalAvailableQuestions > 0 ? Math.min(1, uniqueQuestionsAttempted / totalAvailableQuestions) : 0
  const attemptsRatio = Math.min(1, totalAttempts / CONFIDENCE_CONFIG.minAttemptsForFullConfidence)
  const sessionsRatio = Math.min(1, sessionsCount / CONFIDENCE_CONFIG.minSessionsForFullConfidence)
  const conceptRatio = Math.min(1, conceptCoveragePercent / CONFIDENCE_CONFIG.minConceptCoverageForFullConfidence)

  // Weighted confidence synthesis
  const confidence = (qCoverageRatio * 35) + (attemptsRatio * 25) + (sessionsRatio * 20) + (conceptRatio * 20)
  return Math.min(100, Math.round(confidence))
}

// ── 8. FOUNDATIONAL MASTERY ENGINE ──────────────────────────────────

/**
 * Calculates Foundational Mastery Score (0–100).
 * Mastery = Performance (35%) + Evidence/Coverage (25%) + Difficulty Strength (15%) + Consistency (15%) + Recency (10%)
 */
export function calculateMasteryScore({
  accuracy = 0,
  coveragePercent = 0,
  difficultyStrength = 0,
  consistencyScore = 70,
  recencyScore = 100,
  confidenceScore = 50,
}) {
  const w = MASTERY_MODEL_WEIGHTS

  const rawMastery =
    accuracy * w.performance +
    coveragePercent * w.coverage +
    difficultyStrength * w.difficulty +
    consistencyScore * w.consistency +
    recencyScore * w.recency

  // Apply confidence calibration (low evidence tempers inflated short-session mastery)
  const confidenceFactor = 0.5 + (confidenceScore / 200) // Ranges from 0.5 to 1.0
  const calibratedMastery = Math.round(rawMastery * confidenceFactor)

  return Math.max(0, Math.min(100, calibratedMastery))
}

// ── 9. CHAPTER ANALYTICS ───────────────────────────────────────────

/**
 * Computes deep, dynamic Chapter Analytics for any chapter.
 * Works seamlessly for chapters with 5, 20, 100, 500+ MCQs.
 */
export function calculateChapterAnalytics(chapter = {}, progressRecords = [], sessions = [], attempts = []) {
  const totalMcqs = Number(chapter.totalMcqs ?? (typeof chapter.mcqs === 'number' ? chapter.mcqs : 0)) || 0
  const chId = chapter.id || chapter.num || 'ch_default'

  // Filter progress records belonging to this chapter
  const chRecords = progressRecords.filter((r) => {
    if (!r) return false
    const recChId = r.chapter_id || r.chapterId
    if (recChId && String(recChId) === String(chId)) return true
    if (!recChId) return true
    return false
  })

  // 1. Unique Question Stats
  const attemptedUniqueSet = new Set()
  const masteredUniqueSet = new Set()
  let latestTimestamp = null

  chRecords.forEach((r) => {
    const mId = r.mcq_id || r.mcqId
    if (mId) {
      attemptedUniqueSet.add(String(mId))
      if (String(r.status || '').toUpperCase() === 'MASTERED') {
        masteredUniqueSet.add(String(mId))
      }
      if (r.last_attempted_at) {
        const t = new Date(r.last_attempted_at).getTime()
        if (!latestTimestamp || t > latestTimestamp) latestTimestamp = t
      }
    }
  })

  const uniqueAttemptedCount = Math.min(totalMcqs > 0 ? totalMcqs : Infinity, attemptedUniqueSet.size)
  const uniqueMasteredCount = Math.min(uniqueAttemptedCount, masteredUniqueSet.size)

  // 2. Metrics
  const questionCoverage = calculateQuestionCoverage(uniqueAttemptedCount, totalMcqs)
  const accuracy = calculateOverallAccuracy(chRecords)
  const firstAttemptAccuracy = calculateFirstAttemptAccuracy(chRecords)

  // 3. Concepts
  const flatConcepts = getFlatConceptsForChapter(chapter)
  const conceptAnalytics = calculateConceptCoverage(flatConcepts, chRecords)

  // 4. Difficulty, Consistency, Recency
  const diffInfo = calculateDifficultyBreakdown(chRecords)
  const consistency = calculateConsistencyScore(sessions)
  const recency = calculateRecencyScore(latestTimestamp)

  // 5. Confidence & Mastery
  const confidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: uniqueAttemptedCount,
    totalAvailableQuestions: totalMcqs,
    totalAttempts: chRecords.reduce((sum, r) => sum + (Number(r.total_attempts || r.attempts) || 1), 0),
    sessionsCount: sessions.length,
    conceptCoveragePercent: conceptAnalytics.coveragePercent,
  })

  const mastery = calculateMasteryScore({
    accuracy,
    coveragePercent: questionCoverage,
    difficultyStrength: diffInfo.difficultyStrength || accuracy,
    consistencyScore: consistency,
    recencyScore: recency,
    confidenceScore: confidence,
  })

  // Priority
  const priorityMultiplier = getPriorityMultiplier(chapter.priority || 'M')

  return {
    analyticsVersion: ANALYTICS_VERSION,
    chapterId: chId,
    title: chapter.title || chapter.name || 'Chapter',
    totalMcqs,
    uniqueAttemptedCount,
    uniqueMasteredCount,
    questionCoverage,
    accuracy,
    firstAttemptAccuracy,
    conceptCoverage: conceptAnalytics.coveragePercent,
    totalConcepts: conceptAnalytics.totalConcepts,
    coveredConceptsCount: conceptAnalytics.coveredCount,
    weakConcepts: conceptAnalytics.weakConcepts,
    uncoveredConcepts: conceptAnalytics.uncoveredConcepts,
    conceptPerformances: conceptAnalytics.conceptPerformances,
    difficultyBreakdown: diffInfo.breakdown,
    difficultyStrength: diffInfo.difficultyStrength,
    consistencyScore: consistency,
    recencyScore: recency,
    confidenceScore: confidence,
    masteryScore: mastery,
    readinessScore: mastery, // Phase 1 baseline readiness binds to verified mastery
    priorityMultiplier,
    lastPracticedAt: latestTimestamp,
  }
}

// ── 10. SUBJECT ANALYTICS ───────────────────────────────────────────

/**
 * Aggregates all constituent chapters into deep Subject Analytics.
 * Priority-weighted and pool-size weighted.
 */
export function calculateSubjectAnalytics(subject = {}, chaptersWithAnalytics = [], sessionHistory = [], rawProgressRecords = []) {
  const chapters = Array.isArray(chaptersWithAnalytics) ? chaptersWithAnalytics : []

  let totalWeight = 0
  let weightedMasterySum = 0
  let weightedAccuracySum = 0
  let weightedCoverageSum = 0
  let weightedConfidenceSum = 0

  let totalSubjectMcqs = 0
  let totalAttemptedMcqs = 0
  let totalMasteredMcqs = 0
  let allWeakConcepts = []
  let allUncoveredConcepts = []

  chapters.forEach((ch) => {
    const total = Number(ch.totalMcqs || 0)
    const prioWeight = Number(ch.priorityMultiplier || 2.0)
    const poolFactor = Math.max(1, Math.sqrt(total))
    const weight = prioWeight * poolFactor

    const mast = Number(ch.masteryScore ?? ch.mastery ?? 0)
    const acc = Number(ch.accuracy ?? 0)
    const cov = Number(ch.questionCoverage ?? ch.coveragePercent ?? 0)
    const conf = Number(ch.confidenceScore ?? 50)

    totalWeight += weight
    weightedMasterySum += mast * weight
    weightedAccuracySum += acc * weight
    weightedCoverageSum += cov * weight
    weightedConfidenceSum += conf * weight

    totalSubjectMcqs += total
    totalAttemptedMcqs += Number(ch.uniqueAttemptedCount || 0)
    totalMasteredMcqs += Number(ch.uniqueMasteredCount || 0)

    if (Array.isArray(ch.weakConcepts)) allWeakConcepts.push(...ch.weakConcepts)
    if (Array.isArray(ch.uncoveredConcepts)) allUncoveredConcepts.push(...ch.uncoveredConcepts)
  })

  const subjectMastery = totalWeight > 0 ? Math.round(weightedMasterySum / totalWeight) : 0
  const subjectAccuracy = totalWeight > 0 ? Math.round(weightedAccuracySum / totalWeight) : 0
  const subjectCoverage = totalSubjectMcqs > 0 ? Math.round((totalAttemptedMcqs / totalSubjectMcqs) * 100) : 0
  const subjectConfidence = totalWeight > 0 ? Math.round(weightedConfidenceSum / totalWeight) : 0

  const strongChapters = chapters.filter((c) => (c.masteryScore || 0) >= 75)
  const weakChapters = chapters.filter((c) => (c.masteryScore || 0) < 60 && (c.uniqueAttemptedCount || 0) > 0)
  const uncoveredChapters = chapters.filter((c) => (c.uniqueAttemptedCount || 0) === 0)

  return {
    analyticsVersion: ANALYTICS_VERSION,
    subjectId: subject.id || subject.subjectKey || 'sub_default',
    title: subject.title || subject.name || 'Subject',
    priority: subject.priority || 'M',
    totalChapters: chapters.length,
    totalMcqs: totalSubjectMcqs,
    attemptedMcqs: totalAttemptedMcqs,
    masteredMcqs: totalMasteredMcqs,
    questionCoverage: subjectCoverage,
    accuracy: subjectAccuracy,
    masteryScore: subjectMastery,
    confidenceScore: subjectConfidence,
    readinessScore: subjectMastery,
    strongChapters,
    weakChapters,
    uncoveredChapters,
    weakConcepts: allWeakConcepts,
    uncoveredConcepts: allUncoveredConcepts,
    chapters,
  }
}

// ── 11. COURSE ANALYTICS (PHASE 2 MASTER CONTRACT) ─────────────────

/**
 * Aggregates all subjects belonging to a course into Course Intelligence,
 * applying the 14-Step Exam Readiness Index (ERI), Bottlenecks, Recommendations, Trends, and Ranking.
 */
export function calculateCourseAnalytics(
  course = {},
  subjectsWithAnalytics = [],
  sessionHistory = [],
  rawProgressRecords = [],
  historicalSnapshots = [],
  cohortParticipants = [],
  userId = null
) {
  const subjects = Array.isArray(subjectsWithAnalytics) ? subjectsWithAnalytics : []

  let totalCourseMcqs = 0
  let totalAttemptedMcqs = 0
  let totalMasteredMcqs = 0

  let weightedMasterySum = 0
  let weightedAccuracySum = 0
  let totalWeight = 0

  const allChapters = []
  const allWeakConcepts = []
  const allUncoveredConcepts = []

  subjects.forEach((sub) => {
    const total = Number(sub.totalMcqs || 0)
    const weight = Math.max(1, total)

    totalCourseMcqs += total
    totalAttemptedMcqs += Number(sub.attemptedMcqs || 0)
    totalMasteredMcqs += Number(sub.masteredMcqs || 0)

    weightedMasterySum += Number(sub.masteryScore || 0) * weight
    weightedAccuracySum += Number(sub.accuracy || 0) * weight
    totalWeight += weight

    if (Array.isArray(sub.chapters)) allChapters.push(...sub.chapters)
    if (Array.isArray(sub.weakConcepts)) allWeakConcepts.push(...sub.weakConcepts)
    if (Array.isArray(sub.uncoveredConcepts)) allUncoveredConcepts.push(...sub.uncoveredConcepts)
  })

  const courseCoverage = totalCourseMcqs > 0 ? Math.round((totalAttemptedMcqs / totalCourseMcqs) * 100) : 0
  const courseAccuracy = totalWeight > 0 ? Math.round(weightedAccuracySum / totalWeight) : 0
  const courseMastery = totalWeight > 0 ? Math.round(weightedMasterySum / totalWeight) : 0

  // 1. Concept Coverage
  const totalConceptsCount = allChapters.reduce((sum, ch) => sum + (ch.totalConcepts || 0), 0)
  const coveredConceptsCount = allChapters.reduce((sum, ch) => sum + (ch.coveredConceptsCount || 0), 0)
  const courseConceptCoverage = totalConceptsCount > 0 ? Math.round((coveredConceptsCount / totalConceptsCount) * 100) : courseCoverage

  // 2. Difficulty Breakdown
  const diffInfo = calculateDifficultyBreakdown(rawProgressRecords)

  // 3. Consistency & Recency
  const consistency = calculateConsistencyScore(sessionHistory)
  const latestTimestamp = sessionHistory.length > 0
    ? Math.max(...sessionHistory.map((s) => new Date(s.timestamp || s.created_at || s.last_attempted_at || 0).getTime()))
    : null
  const recency = calculateRecencyScore(latestTimestamp)

  // 4. Confidence
  const totalAttemptsCount = rawProgressRecords.length > 0
    ? rawProgressRecords.reduce((sum, r) => sum + (Number(r.total_attempts || r.attempts) || 1), 0)
    : sessionHistory.reduce((sum, s) => sum + (Number(s.attemptedCount || s.totalQuestions || s.total) || 10), 0)

  const confidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: totalAttemptedMcqs,
    totalAvailableQuestions: totalCourseMcqs,
    totalAttempts: totalAttemptsCount,
    sessionsCount: sessionHistory.length,
    conceptCoveragePercent: courseConceptCoverage,
  })

  // 5. Exam Readiness Index (ERI) Pipeline
  const eriResult = calculateExamReadinessIndex({
    performanceQuality: courseAccuracy,
    conceptCoverage: courseConceptCoverage,
    mastery: courseMastery,
    difficultyStrength: diffInfo.difficultyStrength || courseAccuracy,
    consistency,
    recency,
    evidenceConfidence: confidence,
    subjects,
    chapters: allChapters,
    uncoveredConcepts: allUncoveredConcepts,
    weakConcepts: allWeakConcepts,
  })

  // 6. Readiness Bottlenecks
  const bottleneckResult = identifyReadinessBottlenecks({
    examReadinessIndex: eriResult.examReadinessIndex,
    accuracy: courseAccuracy,
    conceptCoverage: courseConceptCoverage,
    mastery: courseMastery,
    difficultyStrength: diffInfo.difficultyStrength || courseAccuracy,
    consistency,
    recency,
    confidence,
    subjectBalance: eriResult.subjectBalance,
    chapters: allChapters,
    subjects,
    uncoveredConcepts: allUncoveredConcepts,
    weakConcepts: allWeakConcepts,
  })

  // 7. Smart Next Action Recommendations
  const recommendationResult = generateSmartRecommendations({
    examReadinessIndex: eriResult.examReadinessIndex,
    bottlenecks: bottleneckResult,
    chapters: allChapters,
    subjects,
    weakConcepts: allWeakConcepts,
    uncoveredConcepts: allUncoveredConcepts,
    subjectBalance: eriResult.subjectBalance,
    recentAttempts: sessionHistory,
  })

  // 8. Trends & Momentum
  const trendInfo = calculateWindowComparison(historicalSnapshots, 'readiness')
  const momentumInfo = calculateLearningMomentum({
    trendDelta: trendInfo.delta,
    recentSessionsCount: sessionHistory.length,
    consistencyScore: consistency,
    coverageGrowth: courseCoverage,
    weaknessReduction: Math.max(0, 30 - allWeakConcepts.length),
  })
  const weaknessTrend = calculateWeaknessTrend(historicalSnapshots.map((s) => s.weakConceptsCount ?? allWeakConcepts.length))

  // 9. Personal Academic Ranking
  const rankingInfo = calculatePersonalRanking({
    targetUserId: userId || 'current_user',
    currentStudentMetrics: {
      examReadinessIndex: eriResult.examReadinessIndex,
      masteryScore: courseMastery,
      accuracy: courseAccuracy,
      conceptCoverage: courseConceptCoverage,
      consistencyScore: consistency,
      readinessConfidence: confidence,
      uniqueAttemptedCount: totalAttemptedMcqs,
      sessionsCount: sessionHistory.length,
    },
    cohortParticipants,
  })

  const strongSubjects = subjects.filter((s) => (s.masteryScore || 0) >= 75)
  const weakSubjects = subjects.filter((s) => (s.masteryScore || 0) < 60)

  return {
    analyticsVersion: ANALYTICS_VERSION,
    courseId: course.id || 'course_default',
    title: course.name || course.title || 'Course',
    totalSubjects: subjects.length,
    totalChapters: allChapters.length,
    totalMcqs: totalCourseMcqs,
    attemptedMcqs: totalAttemptedMcqs,
    masteredMcqs: totalMasteredMcqs,
    questionCoverage: courseCoverage,
    conceptCoverage: courseConceptCoverage,
    accuracy: courseAccuracy,
    masteryScore: courseMastery,
    examReadinessIndex: eriResult.examReadinessIndex,
    rawEri: eriResult.rawEri,
    readinessScore: eriResult.examReadinessIndex, // backward compatibility
    readinessBand: eriResult.readinessBand,
    readinessConfidence: confidence,
    confidenceScore: confidence,
    isCapped: eriResult.isCapped,
    capsApplied: eriResult.capsApplied,
    readinessExplanations: eriResult.explanations,
    difficultyBreakdown: diffInfo.breakdown,
    difficultyStrength: diffInfo.difficultyStrength,
    consistencyScore: consistency,
    recencyScore: recency,
    subjectBalance: eriResult.subjectBalance,
    primaryBottleneck: bottleneckResult.primaryBottleneck,
    secondaryBottlenecks: bottleneckResult.secondaryBottlenecks,
    bottlenecks: bottleneckResult.allBottlenecks,
    recommendedNextAction: recommendationResult.primaryRecommendation,
    alternateRecommendations: recommendationResult.alternateRecommendations,
    trend: trendInfo.direction,
    trendDirection: trendInfo.direction,
    trendSymbol: trendInfo.symbol,
    trendDelta: trendInfo.delta,
    momentum: momentumInfo.momentum,
    momentumInfo,
    weaknessTrend,
    rankInfo: rankingInfo,
    overallRank: rankingInfo.rank,
    percentile: rankingInfo.percentile,
    percentileLabel: rankingInfo.percentileLabel,
    totalParticipants: rankingInfo.totalEligibleParticipants,
    strongSubjects,
    weakSubjects,
    weakConcepts: allWeakConcepts,
    uncoveredConcepts: allUncoveredConcepts,
    subjects,
    chapters: allChapters,
  }
}

export default {
  ANALYTICS_VERSION,
  calculateOverallAccuracy,
  calculateFirstAttemptAccuracy,
  calculateRecentAccuracy,
  calculateQuestionCoverage,
  evaluateConceptPerformance,
  calculateConceptCoverage,
  calculateDifficultyBreakdown,
  calculateConsistencyScore,
  calculateRecencyScore,
  calculateConfidenceScore,
  calculateMasteryScore,
  calculateChapterAnalytics,
  calculateSubjectAnalytics,
  calculateCourseAnalytics,
  calculateExamReadinessIndex,
  getReadinessBand,
  calculateSubjectBalance,
  identifyReadinessBottlenecks,
  generateSmartRecommendations,
  calculatePersonalRanking,
  calculateWindowComparison,
  calculateLearningMomentum,
  calculateWeaknessTrend,
}
