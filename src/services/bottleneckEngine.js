/**
 * bottleneckEngine.js
 * Diagnostic Readiness Bottleneck Identification Engine for Nexora.
 *
 * Answers: "WHAT IS CURRENTLY LIMITING THE STUDENT'S READINESS?"
 * Identifies the top primary, secondary, and tertiary bottlenecks ranked by severity.
 */

export const BOTTLENECK_TYPES = {
  HIGH_PRIORITY_UNCOVERED: {
    id: 'HIGH_PRIORITY_UNCOVERED',
    severity: 'CRITICAL',
    title: 'High-Priority Concepts Uncovered',
    icon: 'alert-triangle',
    color: '#EF4444',
  },
  CRITICAL_WEAK_CHAPTER: {
    id: 'CRITICAL_WEAK_CHAPTER',
    severity: 'CRITICAL',
    title: 'Critical Weak Chapter',
    icon: 'x-circle',
    color: '#EF4444',
  },
  SUBJECT_IMBALANCE: {
    id: 'SUBJECT_IMBALANCE',
    severity: 'MAJOR',
    title: 'Uneven Subject Balance',
    icon: 'sliders',
    color: '#F97316',
  },
  DIFFICULTY_WEAKNESS: {
    id: 'DIFFICULTY_WEAKNESS',
    severity: 'MAJOR',
    title: 'Difficulty Gap',
    icon: 'trending-down',
    color: '#F59E0B',
  },
  LOW_CONCEPT_COVERAGE: {
    id: 'LOW_CONCEPT_COVERAGE',
    severity: 'MAJOR',
    title: 'Incomplete Syllabus Coverage',
    icon: 'compass',
    color: '#F59E0B',
  },
  LOW_ACCURACY: {
    id: 'LOW_ACCURACY',
    severity: 'MAJOR',
    title: 'Foundational Accuracy Gap',
    icon: 'target',
    color: '#EF4444',
  },
  POOR_CONSISTENCY: {
    id: 'POOR_CONSISTENCY',
    severity: 'MODERATE',
    title: 'Performance Volatility',
    icon: 'activity',
    color: '#3B82F6',
  },
  RECENCY_DECAY: {
    id: 'RECENCY_DECAY',
    severity: 'MODERATE',
    title: 'Knowledge Decay / Revision Due',
    icon: 'clock',
    color: '#8B5CF6',
  },
  INSUFFICIENT_EVIDENCE: {
    id: 'INSUFFICIENT_EVIDENCE',
    severity: 'MODERATE',
    title: 'Limited Evidence Sample',
    icon: 'help-circle',
    color: '#94A3B8',
  },
}

/**
 * Identifies all bottlenecks limiting a student's performance and ranks them.
 */
export function identifyReadinessBottlenecks({
  examReadinessIndex = 0,
  accuracy = 0,
  conceptCoverage = 0,
  mastery = 0,
  difficultyStrength = 0,
  consistency = 70,
  recency = 100,
  confidence = 50,
  subjectBalance = {},
  chapters = [],
  subjects = [],
  uncoveredConcepts = [],
  weakConcepts = [],
}) {
  const candidates = []

  // 1. High-Priority Uncovered Concepts
  const highPriorityUncovered = (uncoveredConcepts || []).filter((c) => {
    const p = String(c.priority || '').toUpperCase()
    return p.includes('HIGH') || p === 'H' || p === 'VH'
  })
  if (highPriorityUncovered.length > 0) {
    candidates.push({
      ...BOTTLENECK_TYPES.HIGH_PRIORITY_UNCOVERED,
      priorityWeight: 100 + highPriorityUncovered.length * 5,
      description: `${highPriorityUncovered.length} high-priority concepts remain unattempted, limiting your readiness ceiling.`,
      targetEntity: highPriorityUncovered[0]?.name || 'High Priority Concept',
      actionableGuidance: `Complete initial practice sets for '${highPriorityUncovered[0]?.name || 'uncovered topics'}'.`,
    })
  }

  // 2. Critical Weak Chapter
  const weakChapters = (chapters || []).filter((ch) => {
    const prio = String(ch.priority || ch.priorityLabel || '').toUpperCase()
    const isHigh = prio.includes('HIGH') || prio === 'H' || prio === 'VH'
    const mast = Number(ch.masteryScore ?? ch.mastery ?? 0)
    return isHigh && mast < 50 && (ch.uniqueAttemptedCount || 0) > 0
  }).sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0))

  if (weakChapters.length > 0) {
    const weakest = weakChapters[0]
    candidates.push({
      ...BOTTLENECK_TYPES.CRITICAL_WEAK_CHAPTER,
      priorityWeight: 95,
      description: `Core high-priority chapter '${weakest.title || weakest.name}' has low mastery (${weakest.masteryScore ?? 0}%).`,
      targetEntity: weakest.title || weakest.name,
      targetEntityId: weakest.id,
      actionableGuidance: `Retest weak concepts in '${weakest.title || weakest.name}' to lift subject score.`,
    })
  }

  // 3. Subject Imbalance
  if (subjectBalance.spread > 30 && subjectBalance.weakestSubject) {
    candidates.push({
      ...BOTTLENECK_TYPES.SUBJECT_IMBALANCE,
      priorityWeight: 85 + Math.min(10, subjectBalance.spread / 5),
      description: `Performance in '${subjectBalance.weakestSubject}' lags ${subjectBalance.spread} points behind '${subjectBalance.strongestSubject}'.`,
      targetEntity: subjectBalance.weakestSubject,
      targetEntityId: subjectBalance.weakestSubjectId,
      actionableGuidance: `Allocate next practice sessions to '${subjectBalance.weakestSubject}' to restore balance.`,
    })
  }

  // 4. Difficulty Gap
  if (accuracy >= 65 && difficultyStrength < 50) {
    candidates.push({
      ...BOTTLENECK_TYPES.DIFFICULTY_WEAKNESS,
      priorityWeight: 80,
      description: `Accuracy drops on Difficult and Very Difficult questions (${difficultyStrength}% strength).`,
      targetEntity: 'Difficult MCQs',
      actionableGuidance: 'Engage High-Difficulty Challenge mode to practice multi-step problem solving.',
    })
  }

  // 5. Low Concept Coverage
  if (conceptCoverage < 50) {
    candidates.push({
      ...BOTTLENECK_TYPES.LOW_CONCEPT_COVERAGE,
      priorityWeight: 75,
      description: `Only ${conceptCoverage}% of concepts have been practiced. Readiness cannot reach exam benchmark without broader coverage.`,
      targetEntity: 'Uncovered Concepts',
      actionableGuidance: 'Explore new chapters and practice unattempted questions.',
    })
  }

  // 6. Foundational Accuracy Gap
  if (accuracy < 55 && (confidence || 0) > 20) {
    candidates.push({
      ...BOTTLENECK_TYPES.LOW_ACCURACY,
      priorityWeight: 70,
      description: `Overall accuracy (${accuracy}%) is below the learning threshold.`,
      targetEntity: 'Concept Fundamentals',
      actionableGuidance: 'Revise theory and use Rapid Revision mode before attempting full sets.',
    })
  }

  // 7. Recency Decay
  if (recency < 60) {
    candidates.push({
      ...BOTTLENECK_TYPES.RECENCY_DECAY,
      priorityWeight: 65,
      description: 'Older mastered concepts are due for spaced repetition review.',
      targetEntity: 'Spaced Retention',
      actionableGuidance: 'Take a quick 10-MCQ revision sprint to refresh decaying topics.',
    })
  }

  // 8. Performance Volatility
  if (consistency < 55) {
    candidates.push({
      ...BOTTLENECK_TYPES.POOR_CONSISTENCY,
      priorityWeight: 60,
      description: 'High variance between session scores indicates unstable error recovery.',
      targetEntity: 'Session Stability',
      actionableGuidance: 'Review explanations thoroughly after each mistake before testing again.',
    })
  }

  // 9. Insufficient Evidence
  if (confidence < 30) {
    candidates.push({
      ...BOTTLENECK_TYPES.INSUFFICIENT_EVIDENCE,
      priorityWeight: 50,
      description: 'More practice sessions are needed to establish reliable readiness measurement.',
      targetEntity: 'Practice Volume',
      actionableGuidance: 'Complete 2–3 standard practice sets to increase measurement accuracy.',
    })
  }

  // Sort by priority weight descending
  const sorted = candidates.sort((a, b) => b.priorityWeight - a.priorityWeight)
  const primaryBottleneck = sorted[0] || null
  const secondaryBottlenecks = sorted.slice(1, 4)

  return {
    primaryBottleneck,
    secondaryBottlenecks,
    allBottlenecks: sorted,
    count: sorted.length,
  }
}

export default {
  BOTTLENECK_TYPES,
  identifyReadinessBottlenecks,
}
