/**
 * performanceEngine.js
 * Central Performance Intelligence Engine.
 *
 * Coordinates the full hierarchy:
 * MCQ ATTEMPT → CHAPTER ANALYTICS → CHAPTER SNAPSHOT → SUBJECT AGGREGATION → SUBJECT SNAPSHOT → COURSE ANALYTICS
 *
 * Features:
 * - In-memory LRU/memoization caching to prevent recalculations on large question pools (350–500+ MCQs).
 * - Real-time snapshot recording on MCQ practice session completion.
 */

import { calculateDeepChapterPerformance } from './chapterAnalyticsService.js'
import { calculateSubjectIntelligence } from './subjectAnalyticsService.js'
import { recordChapterSnapshot } from './trendService.js'

// In-memory cache for processed subject intelligence
const subjectCache = new Map()

/**
 * Generate cache key based on subject ID and progress list length/signatures
 */
function getCacheKey(subjectId, chaptersCount, progressCount) {
  return `${subjectId}_ch${chaptersCount}_pr${progressCount}`
}

/**
 * Process and enrich a Subject and all its Chapters with deep performance intelligence.
 *
 * @param {Object} subject - Raw subject from course catalog
 * @param {Array} progressList - Global user progress records from progressStore
 */
export function getEnrichedSubjectIntelligence(subject, progressList = []) {
  if (!subject) return null

  const subjectId = subject.id || subject.subjectId || subject.subjectKey || 'default-sub'
  const rawChapters = subject.chapters || []
  const cacheKey = getCacheKey(subjectId, rawChapters.length, progressList.length)

  if (subjectCache.has(cacheKey)) {
    return subjectCache.get(cacheKey)
  }

  // 1. Calculate deep performance for each chapter
  const enrichedChapters = rawChapters.map((ch, idx) => {
    const totalMcqs = typeof ch.totalMcqs === 'number' ? ch.totalMcqs : (typeof ch.mcqs === 'number' ? ch.mcqs : 0)
    const chMcqIds = new Set(Array.isArray(ch.chMcqs) ? ch.chMcqs.map((m) => String(m.id)) : [])

    // Filter progress records belonging to this chapter
    const chProgressRecords = progressList.filter((rec) => {
      if (!rec) return false
      const recChapId = rec.chapter_id || rec.chapterId
      if (recChapId && ch.id && String(recChapId) === String(ch.id)) return true
      const recMcqId = String(rec.mcq_id || rec.mcqId || '')
      if (recMcqId && chMcqIds.has(recMcqId)) return true
      return false
    })

    const priority = ch.priority || ch.priorityLabel || 'M'
    const deepMetrics = calculateDeepChapterPerformance(totalMcqs, chProgressRecords, priority, ch.id)

    return {
      ...ch,
      num: String(ch.number || idx + 1).padStart(2, '0'),
      number: Number(ch.number) || idx + 1,
      ...deepMetrics,
      // Backward compatibility bindings
      progress: deepMetrics.readinessScore,
      pct: `${deepMetrics.readinessScore}%`,
    }
  })

  // 2. Aggregate all chapters into deep subject intelligence
  const subjectIntelligence = calculateSubjectIntelligence(subject, enrichedChapters, subjectId)

  const result = {
    ...subject,
    ...subjectIntelligence,
    chapters: enrichedChapters,
    counts: {
      ...subject.counts,
      chapters: enrichedChapters.length,
      mcqs: subjectIntelligence.subjectTotalMcqs,
    },
    // Backward compatibility fields
    readiness: subjectIntelligence.subjectReadinessScore,
    accuracy: subjectIntelligence.subjectAccuracyPercentage,
    coverage: subjectIntelligence.subjectCoveragePercent,
    mastery: subjectIntelligence.subjectMasteryPercentage,
    progress: subjectIntelligence.subjectReadinessScore,
  }

  // Limit cache size to prevent memory leaks
  if (subjectCache.size > 30) {
    const oldestKey = subjectCache.keys().next().value
    subjectCache.delete(oldestKey)
  }

  subjectCache.set(cacheKey, result)
  return result
}

/**
 * Handle practice session completion:
 * Recalculates metrics and records historical snapshots for both Chapter and Subject.
 */
export function onPracticeSessionCompleted({
  chapterId,
  totalPool = 0,
  updatedProgressRecords = [],
  chapterPriority = 'M',
}) {
  // Clear cached intelligence for this subject
  subjectCache.clear()

  // Record the chapter snapshot immediately. Subject snapshots are persisted
  // from the subject detail view where we have the full aggregate metrics.
  if (chapterId) {
    const chapterMetrics = calculateDeepChapterPerformance(
      totalPool,
      updatedProgressRecords,
      chapterPriority,
      chapterId
    )
    recordChapterSnapshot(chapterId, chapterMetrics)
  }
}

export function clearPerformanceCache() {
  subjectCache.clear()
}

export default {
  getEnrichedSubjectIntelligence,
  onPracticeSessionCompleted,
  clearPerformanceCache,
}
