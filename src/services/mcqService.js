/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Supabase DB column mapping.
 */

import { apiService } from './apiService'
import {
  injectMcqsIntoStore,
  injectFlashcardsIntoStore,
  hydrateAdminStoreFromSupabase,
} from '../data/adminStore'

function mapMcqToPayload(item, subjectId, chapterId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  const correctMap = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
  const rawCorrect = item.correct !== undefined ? item.correct : item.correct_answer
  const correctInt = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

  let diffInt = 2
  if (typeof item.difficulty === 'number') {
    diffInt = item.difficulty
  } else if (item.difficulty === 'Easy') {
    diffInt = 1
  } else if (item.difficulty === 'Hard') {
    diffInt = 3
  }

  return {
    id: isValidUuid ? item.id : crypto.randomUUID(),
    subject_id: subjectId,
    chapter_id: chapterId,
    question: item.question,
    option_a: item.options?.[0] || item.option_a || item.optionA || 'Option A',
    option_b: item.options?.[1] || item.option_b || item.optionB || 'Option B',
    option_c: item.options?.[2] || item.option_c || item.optionC || 'Option C',
    option_d: item.options?.[3] || item.option_d || item.optionD || 'Option D',
    correct_answer: correctInt,
    explanation: item.explanation || '',
    difficulty: diffInt,
    status: item.status || 'active',
  }
}

function mapFlashcardToPayload(item, subjectId, chapterId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  return {
    id: isValidUuid ? item.id : crypto.randomUUID(),
    subject_id: subjectId,
    chapter_id: chapterId,
    front: item.front,
    back: item.back,
    status: item.status || 'active',
  }
}

export const mcqService = {
  validatePayload(payload, type = 'mcqs') {
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return { valid: false, error: 'Payload must be a non-empty JSON array of items.' }
    }

    if (type === 'mcqs') {
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i]
        if (!item.question || typeof item.question !== 'string') {
          return { valid: false, error: `Item #${i + 1} is missing a valid "question" field.` }
        }
        if (!item.options || typeof item.options !== 'object') {
          return { valid: false, error: `Item #${i + 1} ("${item.question.slice(0, 30)}...") is missing an "options" map.` }
        }
      }
    } else if (type === 'flashcards') {
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i]
        if (!item.front || !item.back) {
          return { valid: false, error: `Flashcard #${i + 1} must contain both "front" and "back" text.` }
        }
      }
    }

    return { valid: true }
  },

  async getMcqs(courseId, subjectId, chapterId) {
    let query = ''
    if (chapterId) {
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
    } else if (subjectId) {
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    } else if (courseId) {
      const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
      if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
        return { success: true, data: [] }
      }
      const subIds = subRes.data.map((s) => s.id)
      query = `?subject_id=in.(${subIds.map((id) => encodeURIComponent(id)).join(',')})`
    } else {
      return { success: true, data: [] }
    }

    try {
      const res = await apiService.get(`/mcqs${query}`)
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((m) => ({
          ...m,
          courseId,
          subjectId: m.subject_id,
          chapterId: m.chapter_id,
          correct: m.correct_answer,
          options: [m.option_a, m.option_b, m.option_c, m.option_d],
        }))
        return { success: true, data: mapped }
      }
      return { success: false, error: res.error || 'Failed to fetch MCQs from database' }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },

  async getFlashcards(courseId, subjectId, chapterId) {
    let query = ''
    if (chapterId) {
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
    } else if (subjectId) {
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    } else if (courseId) {
      const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
      if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
        return { success: true, data: [] }
      }
      const subIds = subRes.data.map((s) => s.id)
      query = `?subject_id=in.(${subIds.map((id) => encodeURIComponent(id)).join(',')})`
    } else {
      return { success: true, data: [] }
    }

    try {
      const res = await apiService.get(`/flashcards${query}`)
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((f) => ({
          ...f,
          courseId,
          subjectId: f.subject_id,
          chapterId: f.chapter_id,
        }))
        return { success: true, data: mapped }
      }
      return { success: false, error: res.error || 'Failed to fetch flashcards from database' }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },

  async injectMcqs(courseId, subjectId, chapterId, payload, injectionType = 'mcqs', contextMeta = {}) {
    if (!courseId || !subjectId || !chapterId) {
      return { success: false, error: 'Hierarchy Violation: courseId, subjectId, and chapterId are required for injection.' }
    }

    const validation = this.validatePayload(payload, injectionType)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const isMcq = injectionType === 'mcqs'
    const table = isMcq ? 'mcqs' : 'flashcards'

    const dbItems = payload.map((item) =>
      isMcq
        ? mapMcqToPayload(item, subjectId, chapterId)
        : mapFlashcardToPayload(item, subjectId, chapterId)
    )

    const res = await apiService.post(`/${table}`, dbItems)

    if (!res.success) {
      return { success: false, error: res.error || `Failed to inject ${injectionType} into database` }
    }

    const insertedRecords = Array.isArray(res.data) ? res.data : dbItems

    if (isMcq) {
      const formattedRecords = insertedRecords.map((m) => ({
        id: m.id,
        courseId: courseId,
        subjectId: m.subject_id,
        chapterId: m.chapter_id,
        subject: contextMeta.subjectName || subjectId,
        chapter: contextMeta.chapterName || chapterId,
        question: m.question,
        options: [m.option_a, m.option_b, m.option_c, m.option_d],
        correct: m.correct_answer,
        difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
        difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
        explanation: m.explanation || '',
        attempts: '0',
        accuracy: '—',
      }))
      injectMcqsIntoStore(formattedRecords)
    } else {
      const formattedRecords = insertedRecords.map((f) => ({
        id: f.id,
        courseId: courseId,
        subjectId: f.subject_id,
        chapterId: f.chapter_id,
        subject: contextMeta.subjectName || subjectId,
        chapter: contextMeta.chapterName || chapterId,
        front: f.front,
        back: f.back,
        views: '0 views',
      }))
      injectFlashcardsIntoStore(formattedRecords)
    }

    // Trigger store re-hydration in background to guarantee database count accuracy
    hydrateAdminStoreFromSupabase().catch(() => {})

    return {
      success: true,
      count: insertedRecords.length,
      data: insertedRecords,
    }
  },

  async getUserProgress(userId, chapterId) {
    if (!userId || !chapterId) {
      return { success: true, data: [] }
    }
    try {
      const res = await apiService.get(
        `/mcq_progress?user_id=eq.${encodeURIComponent(userId)}&chapter_id=eq.${encodeURIComponent(chapterId)}`
      )
      if (res.success && Array.isArray(res.data)) {
        return { success: true, data: res.data }
      }

      // If table doesn't exist yet on Supabase (e.g. 404), fallback to persistent local cache
      const localCacheKey = `mcq_progress_${userId}_${chapterId}`
      const cached = localStorage.getItem(localCacheKey)
      const data = cached ? JSON.parse(cached) : []
      return { success: true, data, isFallback: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch MCQ progress' }
    }
  },

  async updateUserProgress(userId, progressUpdates) {
    if (!userId || !Array.isArray(progressUpdates) || progressUpdates.length === 0) {
      return { success: true, data: [] }
    }
    try {
      const res = await apiService.post(
        `/mcq_progress?on_conflict=user_id,mcq_id`,
        progressUpdates,
        { Prefer: 'resolution=merge-duplicates,return=representation' }
      )

      // Maintain local fallback cache for robust offline / fallback behavior
      const chapterGroups = {}
      progressUpdates.forEach((p) => {
        const cId = p.chapter_id
        if (cId) {
          if (!chapterGroups[cId]) chapterGroups[cId] = []
          chapterGroups[cId].push(p)
        }
      })
      Object.keys(chapterGroups).forEach((cId) => {
        const localCacheKey = `mcq_progress_${userId}_${cId}`
        try {
          const cachedRaw = localStorage.getItem(localCacheKey)
          const existing = cachedRaw ? JSON.parse(cachedRaw) : []
          const existingMap = new Map(existing.map((item) => [item.mcq_id, item]))
          chapterGroups[cId].forEach((item) => {
            existingMap.set(item.mcq_id, item)
          })
          localStorage.setItem(localCacheKey, JSON.stringify(Array.from(existingMap.values())))
        } catch {
          // ignore
        }
      })

      if (res.success) {
        return { success: true, data: res.data }
      }

      // If Supabase table does not exist yet (e.g. 404 before migration execution), fallback gracefully
      if (res.error && String(res.error).includes('Could not find the table')) {
        return { success: true, data: progressUpdates, isFallback: true }
      }

      return { success: false, error: res.error || 'Failed to update progress in database' }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update progress' }
    }
  },
}
