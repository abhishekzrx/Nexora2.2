/**
 * performanceConfig.js
 * Centralized Single Source of Truth for Performance Intelligence Weights & Formulas.
 * 
 * Rules:
 * - Centralized configuration: DO NOT hardcode formulas or weights across UI components.
 * - Scalable for large question pools (350–500+ MCQs per chapter).
 */

export const READINESS_WEIGHTS = {
  coverage: 0.25,    // 25% - Proportion of UNIQUE questions attempted
  accuracy: 0.25,    // 25% - Proportion of correct responses out of total responses
  mastery: 0.20,     // 20% - Proportion of attempted questions truly mastered
  consistency: 0.15, // 15% - Streak stability & error recovery performance
  revision: 0.15,    // 15% - Spaced repetition retention & recent review cadence
}

/**
 * Chapter Importance Multipliers for Subject-Level Weighted Aggregation.
 * A 500-MCQ VERY HIGH priority chapter has greater influence than a 50-MCQ LOW priority chapter.
 */
export const PRIORITY_WEIGHTS = {
  VERY_HIGH: 4.0,
  VH: 4.0,
  HIGH: 3.0,
  H: 3.0,
  MEDIUM: 2.0,
  M: 2.0,
  LOW: 1.0,
  L: 1.0,
}

/**
 * Normalized priority getter
 */
export function getPriorityWeight(priority) {
  if (!priority) return PRIORITY_WEIGHTS.M
  const clean = String(priority).toUpperCase().trim().replace(/[^A-Z_]/g, '')
  return PRIORITY_WEIGHTS[clean] || PRIORITY_WEIGHTS[clean.charAt(0)] || PRIORITY_WEIGHTS.M
}

/**
 * Performance Classification Thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Strong Chapter criteria
  strong: {
    minAccuracy: 70,
    minCoverage: 30,
    minReadiness: 60,
  },
  // Weak Chapter criteria
  weak: {
    maxAccuracy: 50,
    maxReadiness: 45,
  },
  // Immediate Focus criteria (High Priority + Low Performance)
  immediateFocus: {
    eligiblePriorities: ['VH', 'VERY_HIGH', 'H', 'HIGH'],
    maxReadiness: 50,
  },
  // Trend detection sensitivity
  trend: {
    minDataPoints: 2,
    stableThresholdDelta: 2.5, // Deltas between -2.5% and +2.5% are considered 'stable'
  },
  // Spaced repetition retention threshold (in days)
  spacedRepetitionDays: {
    fresh: 3,
    due: 7,
    overdue: 14,
  },
}

/**
 * Metric Configurations for UI selection and display
 */
export const METRIC_TYPES = {
  READINESS: 'readiness',
  ACCURACY: 'accuracy',
  COVERAGE: 'coverage',
  MASTERY: 'mastery',
}

export const METRIC_META = {
  [METRIC_TYPES.READINESS]: {
    key: METRIC_TYPES.READINESS,
    label: 'Readiness',
    shortLabel: 'Readiness',
    color: '#F1621B',
    accentGrad: 'linear-gradient(135deg, #F1621B 0%, #EA580C 100%)',
    description: 'Overall exam readiness combining coverage, accuracy, mastery & consistency.',
    insights: {
      high: 'Your exam readiness is in the elite zone! Maintain consistency with periodic review.',
      moderate: 'Solid progress. Focus on high-priority chapters to accelerate your exam readiness.',
      low: 'Readiness is currently developing. Increase question coverage to boost your foundation.',
    },
  },
  [METRIC_TYPES.ACCURACY]: {
    key: METRIC_TYPES.ACCURACY,
    label: 'Accuracy',
    shortLabel: 'Acc.',
    color: '#10B981',
    accentGrad: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    description: 'Percentage of questions answered correctly across all attempts.',
    insights: {
      high: 'Your accuracy is strong. Focus on covering remaining unseen questions.',
      moderate: 'Your accuracy is steady. Revise incorrect answers to eliminate weak spots.',
      low: 'Accuracy is currently low. Focus on concept clarity and read detailed explanations.',
    },
  },
  [METRIC_TYPES.COVERAGE]: {
    key: METRIC_TYPES.COVERAGE,
    label: 'Coverage',
    shortLabel: 'Cov.',
    color: '#38BDF8',
    accentGrad: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
    description: 'Percentage of unique MCQs attempted from the total chapter syllabus.',
    insights: {
      high: 'Great syllabus coverage! Almost all unique questions in the pool have been practiced.',
      moderate: 'Good coverage progress. Continue practicing unattempted questions in the pool.',
      low: 'Syllabus coverage is early. Start practicing more questions to unlock deeper analytics.',
    },
  },
  [METRIC_TYPES.MASTERY]: {
    key: METRIC_TYPES.MASTERY,
    label: 'Mastery',
    shortLabel: 'Mast.',
    color: '#FBBF24',
    accentGrad: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
    description: 'Percentage of attempted questions that have been successfully mastered.',
    insights: {
      high: 'Exceptional concept mastery! Most attempted questions are now firmly understood.',
      moderate: 'Developing mastery. Re-attempt incorrect questions to convert them to mastered.',
      low: 'Mastery is low. Revisit explanations and retry questions you missed previously.',
    },
  },
}

export default {
  READINESS_WEIGHTS,
  PRIORITY_WEIGHTS,
  getPriorityWeight,
  PERFORMANCE_THRESHOLDS,
  METRIC_TYPES,
  METRIC_META,
}
