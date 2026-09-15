/**
 * submissionService.js
 * Atomic, Idempotent Practice Submission & User-Scoped Network Retry Engine.
 *
 * Guarantees:
 * 1. Idempotency: Duplicate submission_id requests return the existing attempt record without duplicate writes.
 * 2. Network Resilience: Failed submissions are preserved in a user-scoped pending queue and retried upon reconnection.
 * 3. Scoped Isolation: User A's pending queue never leaks to User B.
 * 4. Read-Only Protection: Super Admin "View As Member" mode is prevented from writing records.
 */

import { userAnalyticsService } from './userAnalyticsService.js'
import { mcqService } from './mcqService.js'
import { updateUserProgressStore } from '../data/progressStore.js'
import { hydrateUserAnalytics } from '../data/analyticsStore.js'
import { apiService } from './apiService.js'

const PENDING_QUEUE_PREFIX = 'nexora_pending_submissions'
const PROCESSED_SUBMISSIONS_PREFIX = 'nexora_processed_submissions'

const memoryProcessed = new Map()
const memoryPendingQueue = new Map()

function getScopedKey(userId, prefix) {
  return `${prefix}_${userId || 'anon'}`
}

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return null
}

function setStorageItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // ignore
  }
}

export const submissionService = {
  /**
   * Generates a unique submission identifier.
   */
  generateSubmissionId(userId) {
    return `sub_${userId || 'usr'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  },

  /**
   * Checks if a submission has already been processed (Idempotency).
   */
  isSubmissionProcessed(userId, submissionId) {
    if (!submissionId) return null
    const scopedMemoryKey = `${userId || 'anon'}_${submissionId}`

    if (memoryProcessed.has(scopedMemoryKey)) {
      return memoryProcessed.get(scopedMemoryKey)
    }

    try {
      const key = getScopedKey(userId, PROCESSED_SUBMISSIONS_PREFIX)
      const saved = getStorageItem(key)
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          const found = list.find((item) => item.submissionId === submissionId)
          if (found) {
            memoryProcessed.set(scopedMemoryKey, found.result)
            return found.result
          }
        }
      }
    } catch {
      // ignore
    }

    return null
  },

  /**
   * Marks a submission as processed.
   */
  markSubmissionProcessed(userId, submissionId, result) {
    if (!submissionId) return
    const scopedMemoryKey = `${userId || 'anon'}_${submissionId}`

    memoryProcessed.set(scopedMemoryKey, result)

    try {
      const key = getScopedKey(userId, PROCESSED_SUBMISSIONS_PREFIX)
      const saved = getStorageItem(key)
      const list = saved ? JSON.parse(saved) : []
      list.push({ submissionId, result, timestamp: Date.now() })
      setStorageItem(key, JSON.stringify(list.slice(-100)))
    } catch {
      // ignore
    }
  },

  /**
   * Saves a failed submission into user-scoped pending queue.
   */
  queuePendingSubmission(userId, submissionPayload) {
    if (!userId || !submissionPayload) return

    const key = getScopedKey(userId, PENDING_QUEUE_PREFIX)
    const existing = this.getPendingSubmissions(userId)
    const updated = [...existing.filter((s) => s.submissionId !== submissionPayload.submissionId), submissionPayload]

    memoryPendingQueue.set(userId, updated)

    try {
      setStorageItem(key, JSON.stringify(updated))
    } catch {
      // ignore
    }
  },

  /**
   * Gets user-scoped pending submissions.
   */
  getPendingSubmissions(userId) {
    if (!userId) return []

    if (memoryPendingQueue.has(userId)) {
      return memoryPendingQueue.get(userId)
    }

    try {
      const key = getScopedKey(userId, PENDING_QUEUE_PREFIX)
      const saved = getStorageItem(key)
      if (saved) {
        const list = JSON.parse(saved)
        if (Array.isArray(list)) {
          memoryPendingQueue.set(userId, list)
          return list
        }
      }
    } catch {
      // ignore
    }

    return []
  },

  /**
   * Removes a successfully processed submission from pending queue.
   */
  removePendingSubmission(userId, submissionId) {
    if (!userId || !submissionId) return

    const key = getScopedKey(userId, PENDING_QUEUE_PREFIX)
    const existing = this.getPendingSubmissions(userId)
    const updated = existing.filter((s) => s.submissionId !== submissionId)

    memoryPendingQueue.set(userId, updated)

    try {
      setStorageItem(key, JSON.stringify(updated))
    } catch {
      // ignore
    }
  },

  /**
   * Clears all pending submissions for a user.
   */
  clearPendingSubmissions(userId) {
    if (!userId) return

    const key = getScopedKey(userId, PENDING_QUEUE_PREFIX)
    memoryPendingQueue.delete(userId)

    try {
      setStorageItem(key, JSON.stringify([]))
    } catch {
      // ignore
    }
  },

  /**
   * Primary practice submission pipeline.
   *
   * Flow:
   * 1. Validate session & Idempotency.
   * 2. Guard Read-Only mode.
   * 3. Update Question Progress (Unique questions).
   * 4. Save Practice Attempt.
   * 5. Update Daily Snapshot.
   * 6. Update Stores & Return.
   */
  async submitPracticeSession({
    userId,
    submissionId,
    courseId,
    subjectId,
    subjectTitle,
    chapterId,
    chapterTitle,
    topicId,
    conceptId,
    mode = 'set_20',
    totalQuestions,
    attemptedCount,
    correctCount,
    incorrectCount,
    skippedCount,
    score,
    percentage,
    accuracy,
    timeTakenSeconds = 0,
    progressUpdates = [],
    attemptLogs = [],
    isReadOnly = false,
  }) {
    if (!userId) {
      return { success: false, error: 'User ID is required for submission.' }
    }

    // Strict Read-Only Guard: Super Admin viewing as member (defense-in-depth)
    const isViewAsActive = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('nexora_view_as_member_profile'))
    if (isReadOnly || isViewAsActive) {
      return {
        success: true,
        isReadOnly: true,
        readOnly: true,
        message: 'Viewing as member (Read-Only Mode): Practice attempt not recorded.',
      }
    }

    const subId = submissionId || this.generateSubmissionId(userId)

    // Idempotency Check: Return existing result if already processed
    const alreadyProcessed = this.isSubmissionProcessed(userId, subId)
    if (alreadyProcessed) {
      return { success: true, idempotent: true, data: alreadyProcessed }
    }

    const payload = {
      userId,
      submissionId: subId,
      courseId,
      subjectId,
      subjectTitle,
      chapterId,
      chapterTitle,
      topicId,
      conceptId,
      mode,
      totalQuestions,
      attemptedCount,
      correctCount,
      incorrectCount,
      skippedCount,
      score,
      percentage,
      accuracy,
      timeTakenSeconds,
      progressUpdates,
      attemptLogs,
    }

    try {
      // Step 1: Atomic Supabase RPC (idempotent, handles progress + attempt + snapshots + sessions)
      const rpcPayload = {
        user_id: userId,
        userId,
        submission_id: subId,
        submissionId: subId,
        course_id: courseId,
        courseId,
        subject_id: subjectId,
        subjectId,
        subject_title: subjectTitle,
        subjectTitle,
        chapter_id: chapterId,
        chapterId,
        chapter_title: chapterTitle,
        chapterTitle,
        topic_id: topicId,
        topicId,
        concept_id: conceptId,
        conceptId,
        mode,
        total_questions: totalQuestions,
        totalQuestions,
        attempted_count: attemptedCount,
        attemptedCount,
        correct_count: correctCount,
        correctCount,
        incorrect_count: incorrectCount,
        incorrectCount,
        skipped_count: skippedCount,
        skippedCount,
        score,
        percentage,
        accuracy,
        time_taken_seconds: timeTakenSeconds,
        timeTakenSeconds,
        progress_updates: progressUpdates || [],
        progressUpdates: progressUpdates || [],
        attempt_logs: attemptLogs || [],
        attemptLogs: attemptLogs || [],
      }

      const rpcRes = await apiService.rpc('submit_practice_session', rpcPayload)

      if (rpcRes && rpcRes.success) {
        // Step 2: Update local progress store from cloud
        if (Array.isArray(progressUpdates) && progressUpdates.length > 0) {
          updateUserProgressStore(progressUpdates)
        }

        // Mirror attempt to user-scoped local attempts cache
        try {
          const attemptRecord = {
            id: rpcRes.data?.attempt_id || subId,
            user_id: userId,
            course_id: courseId || 'course_default',
            subject_id: subjectId,
            subject_title: subjectTitle || subjectId,
            chapter_id: chapterId,
            chapter_title: chapterTitle || 'Practice Set',
            topic_id: topicId || null,
            concept_id: conceptId || null,
            mode: mode || 'set_20',
            total_questions: totalQuestions,
            attempted_count: attemptedCount,
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            skipped_count: skippedCount,
            score,
            percentage,
            accuracy,
            time_taken_seconds: timeTakenSeconds,
            created_at: new Date().toISOString(),
          }
          const key = `nexora_attempts_${userId}`
          const saved = getStorageItem(key)
          const list = saved ? JSON.parse(saved) : []
          if (Array.isArray(list)) {
            list.push(attemptRecord)
            setStorageItem(key, JSON.stringify(list.slice(-200)))
          }
        } catch {
          // ignore
        }

        // Step 3: Refresh analytics from cloud (snapshots are authoritative)
        if (courseId) {
          hydrateUserAnalytics(userId, courseId)
        }

        // Step 4: Clean pending queue
        this.removePendingSubmission(userId, subId)
        this.markSubmissionProcessed(userId, subId, rpcRes.data)

        return {
          success: true,
          attempt: rpcRes.data,
          submissionId: subId,
          idempotent: rpcRes.data?.idempotent || false,
        }
      }

      // Fallback to legacy pipeline if RPC fails
      throw new Error(rpcRes?.error || 'RPC submission failed')
    } catch (err) {
      // Fallback: legacy pipeline for network resilience
      try {
        // Step 1: Save Unique Question Progress
        if (Array.isArray(progressUpdates) && progressUpdates.length > 0) {
          await mcqService.updateUserProgress(userId, progressUpdates)
          updateUserProgressStore(progressUpdates)
        }

        // Step 2: Record Attempt in central analytics pipeline
        const attemptRes = await userAnalyticsService.recordAttempt({
          userId,
          courseId,
          subjectId,
          subjectTitle,
          chapterId,
          chapterTitle,
          topicId,
          conceptId,
          mode,
          totalQuestions,
          attemptedCount,
          correctCount,
          incorrectCount,
          skippedCount,
          score,
          percentage,
          accuracy,
          timeTakenSeconds,
          isReadOnly: false,
        })

        // Step 3: Hydrate reactive analytics store
        if (courseId) {
          hydrateUserAnalytics(userId, courseId)
        }

        // Step 4: Confirm success & clean pending queue
        this.removePendingSubmission(userId, subId)
        this.markSubmissionProcessed(userId, subId, attemptRes)

        return {
          success: true,
          attempt: attemptRes.attempt,
          submissionId: subId,
        }
      } catch (fallbackErr) {
        // Step 5: Network failure resilience: Queue locally for auto-retry
        this.queuePendingSubmission(userId, { ...payload, error: fallbackErr?.message })
        return {
          success: false,
          pending: true,
          submissionId: subId,
          error: fallbackErr?.message || 'Network error. Submission queued for retry.',
        }
      }
    }
  },

  /**
   * Retries all pending submissions for the user.
   */
  async retryPendingSubmissions(userId) {
    if (!userId) return { success: true, processed: 0 }

    const pending = this.getPendingSubmissions(userId)
    if (pending.length === 0) return { success: true, processed: 0 }

    let processedCount = 0
    for (const item of pending) {
      const res = await this.submitPracticeSession(item)
      if (res.success) {
        processedCount += 1
      }
    }

    return { success: true, processed: processedCount, remaining: this.getPendingSubmissions(userId).length }
  },
}

/**
 * Initializes automatic retry listener on window online event.
 */
export function initNetworkRetryListener() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      try {
        const activeUserId = localStorage.getItem('nexora_user_id')
        if (activeUserId) {
          submissionService.retryPendingSubmissions(activeUserId).catch(() => {})
        }
      } catch {
        // ignore
      }
    })
  }
}

if (typeof window !== 'undefined') {
  initNetworkRetryListener()
}
