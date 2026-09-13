/**
 * analyticsConfig.js
 * Centralized Single Source of Truth for Nexora Student Analytics & Performance Configuration.
 * 
 * Version: 2 (Phase 2 Advanced Intelligence)
 * Implements Phase 1 + Phase 2 Configurable Contracts:
 * - Version traceability (analytics_version = 2)
 * - Exam Readiness Index (ERI) 9-factor model
 * - Readiness bands (STARTING to HIGHLY READY)
 * - Safety caps / readiness constraints
 * - Subject balance and spread tolerances
 * - Academic course-scoped ranking configuration
 * - Trend windows, smoothing, and momentum thresholds
 * - Adaptive practice sampling matrices (10/20/30 MCQs)
 */

export const ANALYTICS_VERSION = 2

/**
 * Foundational Mastery Formula Weights (Phase 1 Baseline)
 * Mastery = Performance (35%) + Evidence Quality / Unique Coverage (25%) + Difficulty Strength (15%) + Consistency (15%) + Recency (10%)
 */
export const MASTERY_MODEL_WEIGHTS = {
  performance: 0.35,  // Accuracy / correct ratio on attempted questions
  accuracy: 0.35,     // Alias for performance
  coverage: 0.25,     // Unique question coverage against total pool
  difficulty: 0.15,   // Performance weighted by difficulty strength
  consistency: 0.15,  // Stability across sessions vs volatility
  recency: 0.10,      // Retention / activity within active window
}

/**
 * Final Exam Readiness Index (ERI) Weights (Phase 2 Master Contract)
 * Total = 100%
 */
export const ERI_MODEL_WEIGHTS = {
  performanceQuality: 0.20,   // Overall + first-attempt + recent accuracy synthesis
  conceptCoverage: 0.15,      // Ratio of meaningfully practiced concepts
  mastery: 0.20,              // 5-component validated mastery index
  difficultyStrength: 0.10,   // Performance on Moderate, Difficult, and Very Difficult MCQs
  consistency: 0.10,          // Stability across sessions (low volatility)
  recency: 0.10,              // Freshness / retention within active learning window
  evidenceConfidence: 0.05,   // Statistical trustworthiness of evidence
  subjectBalance: 0.05,       // Evenness of preparation across all course subjects
  priorityCoverage: 0.05,     // Coverage & mastery specifically on High & Very High priority areas
}

/**
 * Exam Readiness Bands
 */
export const READINESS_BANDS = {
  STARTING: { key: 'STARTING', label: 'Starting', min: 0, max: 24, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' },
  BUILDING_FOUNDATION: { key: 'BUILDING_FOUNDATION', label: 'Building Foundation', min: 25, max: 39, color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
  DEVELOPING: { key: 'DEVELOPING', label: 'Developing', min: 40, max: 54, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  PROGRESSING: { key: 'PROGRESSING', label: 'Progressing', min: 55, max: 69, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  EXAM_READY: { key: 'EXAM_READY', label: 'Exam Ready', min: 70, max: 79, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  STRONGLY_READY: { key: 'STRONGLY_READY', label: 'Strongly Ready', min: 80, max: 89, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  HIGHLY_READY: { key: 'HIGHLY_READY', label: 'Highly Ready', min: 90, max: 100, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
}

/**
 * Readiness Constraints & Safety Caps Configuration
 * Prevents misleading "Highly Ready" labels when critical evidence or high-priority coverage is missing.
 */
export const READINESS_CAPS_CONFIG = {
  // If performance quality / accuracy is poor (< 45%), student cannot be Exam Ready
  lowPerformanceQualityThreshold: 45,          // Accuracy < 45%
  lowPerformanceQualityMaxCap: 54,             // Caps ERI at max 54 (DEVELOPING)

  // If difficulty strength is weak (< 40%), student struggles on Hard MCQs
  lowDifficultyStrengthThreshold: 40,          // Difficulty strength < 40%
  lowDifficultyStrengthMaxCap: 69,             // Caps ERI at max 69 (PROGRESSING)

  // If concept coverage is below this, cap ERI
  criticallyLowConceptCoverageThreshold: 25,  // < 25% concept coverage
  criticallyLowConceptCoverageMaxCap: 54,     // Caps ERI at max 54 (DEVELOPING)

  // If high-priority concepts remain uncovered
  maxUncoveredHighPriorityConceptsAllowed: 3,  // More than 3 high-priority uncovered concepts
  uncoveredHighPriorityMaxCap: 69,             // Caps ERI at max 69 (PROGRESSING)

  // If high-priority chapter mastery is critically weak
  criticalHighPriorityChapterMinMastery: 40,   // High-priority chapter mastery < 40%
  criticalHighPriorityChapterMaxCap: 69,       // Caps ERI at max 69 (PROGRESSING)

  // If evidence confidence is very low
  lowEvidenceConfidenceThreshold: 30,          // Confidence < 30/100
  lowEvidenceConfidenceMaxCap: 54,             // Caps ERI at max 54 (DEVELOPING)

  // If subject balance spread is severe
  severeSubjectSpreadThreshold: 45,            // Spread between best & worst subject > 45 pts
  severeSubjectSpreadMaxCap: 79,               // Caps ERI at max 79 (EXAM READY)
}

/**
 * Subject Balance Configuration
 */
export const SUBJECT_BALANCE_CONFIG = {
  maxSpreadTolerance: 20,       // Up to 20 pt spread between subjects is considered normal
  spreadPenaltyMultiplier: 0.5, // Deduct 0.5 ERI points for each point of spread beyond tolerance
  maxBalancePenalty: 15,        // Max 15 points penalty for extreme imbalance
}

/**
 * Concept Classification Thresholds
 */
export const CONCEPT_THRESHOLDS = {
  minAttemptsForEvidence: 3,        // Minimum attempts required before a concept is classified as Weak/Learning
  minUniqueQuestionsForEvidence: 2, // Minimum unique questions required for meaningful evidence
  weakMaxAccuracy: 59.99,           // >= 3 attempts with accuracy < 60% is WEAK
  learningMinAccuracy: 60,          // 60% - 74.99% accuracy is LEARNING
  competentMinAccuracy: 75,         // 75% - 89.99% accuracy is COMPETENT
  masteredMinAccuracy: 90,          // >= 90% accuracy with multiple attempts is MASTERED
}

/**
 * Session Evidence Multipliers
 * A 30-MCQ session provides stronger empirical evidence than a 10-MCQ sprint.
 */
export const SESSION_EVIDENCE_WEIGHTS = {
  set_10: 1.0,     // Baseline sprint weight
  set_20: 1.75,    // Standard session weight
  set_30: 2.5,     // Comprehensive marathon weight
  set_all: 3.0,    // Full chapter marathon
  all: 3.0,        // Alias for full chapter marathon
  custom: 1.5,
}

/**
 * Difficulty Weights for Scoring and Difficulty Strength
 */
export const DIFFICULTY_WEIGHTS = {
  EASY: 1.0,
  MODERATE: 1.5,
  DIFFICULT: 2.2,
  VERY_DIFFICULT: 3.0,
}

/**
 * Chapter Importance Multipliers for Subject and Course Aggregation
 */
export const CHAPTER_PRIORITY_WEIGHTS = {
  VERY_HIGH: 4.0,
  VH: 4.0,
  HIGH: 3.0,
  H: 3.0,
  MEDIUM: 2.0,
  MED: 2.0,
  M: 2.0,
  LOW: 1.0,
  L: 1.0,
}

/**
 * Normalized Priority Helper
 */
export function getPriorityMultiplier(priority) {
  if (!priority) return CHAPTER_PRIORITY_WEIGHTS.M
  const clean = String(priority).toUpperCase().trim().replace(/[^A-Z_]/g, '')
  return CHAPTER_PRIORITY_WEIGHTS[clean] || CHAPTER_PRIORITY_WEIGHTS[clean.charAt(0)] || CHAPTER_PRIORITY_WEIGHTS.M
}

/**
 * Recency Decay Configuration
 */
export const RECENCY_CONFIG = {
  halfLifeDays: 30,         // Performance weight halves after 30 days of inactivity
  maxLookbackDays: 60,      // Daily snapshots retention window
  staleThresholdDays: 14,   // After 14 days without practice, recency factor starts declining
}

/**
 * Confidence Calculation Bounds
 */
export const CONFIDENCE_CONFIG = {
  minAttemptsForFullConfidence: 100,
  minUniqueQuestionsForFullConfidence: 50,
  minSessionsForFullConfidence: 10,
  minConceptCoverageForFullConfidence: 80,
}

/**
 * Academic Ranking Configuration
 */
export const RANKING_CONFIG = {
  minUniqueAttemptsForRanking: 15, // Minimum unique questions attempted to be ranked
  minSessionsForRanking: 2,        // Minimum completed sessions to be ranked
  minConfidenceForRanking: 20,     // Minimum confidence score (0-100)
  weights: {
    eri: 0.35,
    mastery: 0.25,
    accuracy: 0.15,
    conceptCoverage: 0.10,
    consistency: 0.10,
    confidence: 0.05,
  },
}

/**
 * Trend & Momentum Configuration
 */
export const TREND_CONFIG = {
  rollingShortWindowDays: 7,
  rollingLongWindowDays: 30,
  historyMaxDays: 60,
  smoothingAlpha: 0.3, // Exponential smoothing weight for recent data
  momentumThresholds: {
    strongGrowthDelta: 5.0,    // +5 ERI points over window is STRONG
    moderateGrowthDelta: 1.5,  // +1.5 to +4.9 is STABLE / STEADY
    declineDelta: -2.0,        // < -2.0 is DECLINING
  },
}

/**
 * Adaptive Practice Question Distribution Matrices (10 / 20 / 30 MCQs)
 */
export const ADAPTIVE_PRACTICE_CONFIG = {
  // 10-MCQ Sprint: Rapid weakness eradication & error recovery
  set_10: {
    weakConceptsRatio: 0.40,      // 4 questions from weak concepts
    uncoveredConceptsRatio: 0.30,  // 3 questions from uncovered concepts
    recentErrorsRatio: 0.20,       // 2 questions from recent mistakes
    spacedRevisionRatio: 0.10,     // 1 question from mastered/due revision
  },
  // 20-MCQ Standard: Balanced learning progression
  set_20: {
    weakConceptsRatio: 0.30,      // 6 questions
    uncoveredConceptsRatio: 0.25,  // 5 questions
    moderateHardRatio: 0.25,       // 5 questions
    errorRecoveryRatio: 0.20,      // 4 questions
  },
  // 30-MCQ Marathon: Comprehensive exam readiness simulation
  set_30: {
    broadConceptSpreadRatio: 0.30, // 9 questions across all topics
    weakSpotsRatio: 0.20,          // 6 questions
    difficultEdgeCasesRatio: 0.25, // 7-8 questions (Difficult & Very Difficult)
    spacedRetentionRatio: 0.25,    // 7-8 questions from mastered/long-term concepts
  },
}

export default {
  ANALYTICS_VERSION,
  MASTERY_MODEL_WEIGHTS,
  ERI_MODEL_WEIGHTS,
  READINESS_BANDS,
  READINESS_CAPS_CONFIG,
  SUBJECT_BALANCE_CONFIG,
  CONCEPT_THRESHOLDS,
  SESSION_EVIDENCE_WEIGHTS,
  DIFFICULTY_WEIGHTS,
  CHAPTER_PRIORITY_WEIGHTS,
  getPriorityMultiplier,
  RECENCY_CONFIG,
  CONFIDENCE_CONFIG,
  RANKING_CONFIG,
  TREND_CONFIG,
  ADAPTIVE_PRACTICE_CONFIG,
}
