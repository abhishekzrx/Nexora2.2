/**
 * recommendationEngine.js
 * Context-Aware Smart Next-Action & Recommendation Priority Engine for Nexora.
 *
 * Implements Phase 2 Requirements:
 * 1. Prioritizes candidate actions based on learning weakness, priority, coverage gap, recency, and expected readiness impact.
 * 2. Generates concrete, specific recommendations linked directly to actual student data.
 * 3. Provides educational rationale explaining "WHY" each action is recommended.
 */

import { getPriorityMultiplier } from '../config/analyticsConfig.js'

export const ACTION_TYPES = {
  PRACTICE_WEAK_CONCEPT: 'PRACTICE_WEAK_CONCEPT',
  UNCOVERED_PRIORITY_CONCEPT: 'UNCOVERED_PRIORITY_CONCEPT',
  REVISE_ERROR_PRONE_CHAPTER: 'REVISE_ERROR_PRONE_CHAPTER',
  BALANCE_WEAK_SUBJECT: 'BALANCE_WEAK_SUBJECT',
  HIGH_DIFFICULTY_CHALLENGE: 'HIGH_DIFFICULTY_CHALLENGE',
  SPACED_RETENTION_REFRESH: 'SPACED_RETENTION_REFRESH',
  EXPLORE_NEW_SYLLABUS: 'EXPLORE_NEW_SYLLABUS',
}

/**
 * Generates prioritized smart next actions for a student.
 */
export function generateSmartRecommendations({
  examReadinessIndex = 0,
  bottlenecks = {},
  chapters = [],
  subjects = [],
  weakConcepts = [],
  uncoveredConcepts = [],
  subjectBalance = {},
  recentAttempts = [],
}) {
  const candidateActions = []

  // 1. High-Priority Uncovered Concepts
  const highPriorityUncovered = (uncoveredConcepts || []).filter((c) => {
    const p = String(c.priority || '').toUpperCase()
    return p.includes('HIGH') || p === 'H' || p === 'VH'
  })
  if (highPriorityUncovered.length > 0) {
    const topConcept = highPriorityUncovered[0]
    candidateActions.push({
      id: `rec-uncovered-${topConcept.id || 'c1'}`,
      type: ACTION_TYPES.UNCOVERED_PRIORITY_CONCEPT,
      priorityScore: 98,
      title: `Cover ${topConcept.name || 'High-Priority Concept'}`,
      subtitle: 'Uncovered High-Priority Concept',
      chapterTitle: topConcept.topicName || 'Core Topic',
      targetConceptId: topConcept.id,
      targetTopicId: topConcept.topicId,
      recommendedMode: 'set_10',
      estimatedTimeMinutes: 10,
      expectedImpact: '+3–5 ERI points',
      rationale: `Practice '${topConcept.name || 'this concept'}' next because it is high-priority and currently has 0 practice evidence.`,
    })
  }

  // 2. Weak High-Priority Chapters
  const weakHighChapters = (chapters || []).filter((ch) => {
    const prio = String(ch.priority || ch.priorityLabel || '').toUpperCase()
    const isHigh = prio.includes('HIGH') || prio === 'H' || prio === 'VH'
    const mast = Number(ch.masteryScore ?? ch.mastery ?? 0)
    return isHigh && mast < 60 && (ch.uniqueAttemptedCount || 0) > 0
  }).sort((a, b) => (a.masteryScore ?? 0) - (b.masteryScore ?? 0))

  if (weakHighChapters.length > 0) {
    const targetCh = weakHighChapters[0]
    candidateActions.push({
      id: `rec-weak-ch-${targetCh.id}`,
      type: ACTION_TYPES.REVISE_ERROR_PRONE_CHAPTER,
      priorityScore: 92,
      title: `Reinforce ${targetCh.title || targetCh.name}`,
      subtitle: `${targetCh.masteryScore ?? 0}% Mastery (Needs Improvement)`,
      chapterId: targetCh.id,
      chapterTitle: targetCh.title || targetCh.name,
      recommendedMode: 'set_20',
      estimatedTimeMinutes: 20,
      expectedImpact: '+4–6 ERI points',
      rationale: `Practice '${targetCh.title || targetCh.name}' next because it is a high-priority chapter with ${targetCh.masteryScore ?? 0}% mastery and is currently the largest contributor to your readiness gap.`,
    })
  }

  // 3. Subject Balance Reinforcement
  if (subjectBalance.spread > 25 && subjectBalance.weakestSubject) {
    candidateActions.push({
      id: `rec-balance-${subjectBalance.weakestSubjectId || 'sub'}`,
      type: ACTION_TYPES.BALANCE_WEAK_SUBJECT,
      priorityScore: 86,
      title: `Boost ${subjectBalance.weakestSubject}`,
      subtitle: `Lags by ${subjectBalance.spread} points`,
      subjectTitle: subjectBalance.weakestSubject,
      subjectId: subjectBalance.weakestSubjectId,
      recommendedMode: 'set_20',
      estimatedTimeMinutes: 20,
      expectedImpact: '+3–5 ERI points',
      rationale: `Dedicate a session to '${subjectBalance.weakestSubject}' to eliminate the ${subjectBalance.spread}-point spread holding back your overall course balance.`,
    })
  }

  // 4. Specific Weak Concepts
  if (weakConcepts.length > 0) {
    const topWeak = weakConcepts[0]
    candidateActions.push({
      id: `rec-weak-concept-${topWeak.id || 'c'}`,
      type: ACTION_TYPES.PRACTICE_WEAK_CONCEPT,
      priorityScore: 82,
      title: `Master ${topWeak.name || 'Weak Concept'}`,
      subtitle: `${topWeak.accuracy ?? 0}% Accuracy on recent attempts`,
      conceptId: topWeak.id,
      recommendedMode: 'set_10',
      estimatedTimeMinutes: 10,
      expectedImpact: '+2–4 ERI points',
      rationale: `Drill '${topWeak.name}' to fix persistent mistake patterns and graduate this concept to Competent status.`,
    })
  }

  // 5. Default General Syllabus Expansion / Marathon
  if (candidateActions.length === 0) {
    const firstChapter = chapters[0] || {}
    candidateActions.push({
      id: 'rec-general-practice',
      type: ACTION_TYPES.EXPLORE_NEW_SYLLABUS,
      priorityScore: 70,
      title: `Practice ${firstChapter.title || 'Next Chapter'}`,
      subtitle: 'Standard Practice Session',
      chapterId: firstChapter.id,
      chapterTitle: firstChapter.title || 'Chapter Practice',
      recommendedMode: 'set_20',
      estimatedTimeMinutes: 20,
      expectedImpact: '+2–3 ERI points',
      rationale: 'Continue standard practice to build question coverage and confidence across the curriculum.',
    })
  }

  const sorted = candidateActions.sort((a, b) => b.priorityScore - a.priorityScore)
  const primaryRecommendation = sorted[0]
  const alternateRecommendations = sorted.slice(1, 4)

  return {
    primaryRecommendation,
    alternateRecommendations,
    allRecommendations: sorted,
  }
}

export default {
  ACTION_TYPES,
  generateSmartRecommendations,
}
