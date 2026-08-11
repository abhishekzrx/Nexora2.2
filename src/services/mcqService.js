/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Supabase DB column mapping.
 */

import { apiService } from './apiService'
import {
  injectMcqsIntoStore,
  injectFlashcardsIntoStore,
} from '../data/adminStore'

function mapMcqToPayload(item, courseId, subjectId, chapterId, contextMeta = {}) {
  return {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    course_id: courseId,
    subject_id: subjectId,
    chapter_id: chapterId,
    subject: contextMeta.subjectName || subjectId,
    chapter: contextMeta.chapterName || chapterId,
    question: item.question,
    option_a: item.options?.[0] || 'Option A',
    option_b: item.options?.[1] || 'Option B',
    option_c: item.options?.[2] || 'Option C',
    option_d: item.options?.[3] || 'Option D',
    correct_answer: item.correct || 'A',
    explanation: item.explanation || '',
    difficulty: item.difficulty || 'Medium',
  }
}

function mapFlashcardToPayload(item, courseId, subjectId, chapterId, contextMeta = {}) {
  return {
    id: `f-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    course_id: courseId,
    subject_id: subjectId,
    chapter_id: chapterId,
    subject: contextMeta.subjectName || subjectId,
    chapter: contextMeta.chapterName || chapterId,
    front: item.front,
    back: item.back,
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
        if (!item.correct || typeof item.correct !== 'string') {
          return { valid: false, error: `Item #${i + 1} is missing a valid "correct" answer key (e.g. "A").` }
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
    // Guard: require all three hierarchy IDs before querying.
    // Never query with a name/title/slug in place of an ID.
    if (!courseId || !subjectId || !chapterId) {
      const missing = []
      if (!courseId) missing.push('courseId')
      if (!subjectId) missing.push('subjectId')
      if (!chapterId) missing.push('chapterId')
      return {
        success: false,
        error: `Cannot query MCQs without valid IDs: ${missing.join(', ')}. Ensure Course, Subject, and Chapter are selected.`,
      }
    }

    const endpoint = `/mcqs?course_id=eq.${encodeURIComponent(courseId)}&subject_id=eq.${encodeURIComponent(subjectId)}&chapter_id=eq.${encodeURIComponent(chapterId)}`

    try {
      const res = await apiService.get(endpoint)

      // STATE A: Supabase query succeeded and returned records
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        if (import.meta.env.DEV) {
          console.log('[mcqService] Supabase MCQs loaded:', {
            courseId,
            subjectId,
            chapterId,
            count: res.data.length,
            first: res.data[0] ? {
              id: res.data[0].id,
              course_id: res.data[0].course_id,
              subject_id: res.data[0].subject_id,
              chapter_id: res.data[0].chapter_id,
            } : null,
          })
        }
        return { success: true, data: res.data }
      }

      // STATE B: Supabase query succeeded but returned zero records
      if (res.success) {
        if (import.meta.env.DEV) {
          console.log('[mcqService] Supabase returned 0 MCQs for:', {
            courseId,
            subjectId,
            chapterId,
            status: res.status,
          })
        }
        return { success: true, data: [] }
      }

      // STATE C: Supabase query failed (HTTP error or network failure)
      if (import.meta.env.DEV) {
        console.warn('[mcqService] Supabase query failed:', {
          courseId,
          subjectId,
          chapterId,
          error: res.error,
          status: res.status,
        })
      }
      return { success: false, error: res.error || 'Supabase query failed' }
    } catch (err) {
      // Network / unexpected failure
      if (import.meta.env.DEV) {
        console.warn('[mcqService] Supabase request exception:', {
          courseId,
          subjectId,
          chapterId,
          error: err.message,
        })
      }
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
        ? mapMcqToPayload(item, courseId, subjectId, chapterId, contextMeta)
        : mapFlashcardToPayload(item, courseId, subjectId, chapterId, contextMeta)
    )

    const res = await apiService.post(`/${table}`, dbItems)

    // Store injection synchronously for instant local preview
    if (isMcq) {
      const formattedRecords = payload.map((m) => ({
        ...m,
        subject: contextMeta.subjectName || subjectId,
        chapter: contextMeta.chapterName || chapterId,
        optionA: m.options?.[0] || 'Option A',
        optionB: m.options?.[1] || 'Option B',
        optionC: m.options?.[2] || 'Option C',
        optionD: m.options?.[3] || 'Option D',
        correctAnswer: m.correct || 'A',
      }))
      injectMcqsIntoStore(formattedRecords)
    } else {
      const formattedRecords = payload.map((f) => ({
        ...f,
        subject: contextMeta.subjectName || subjectId,
        chapter: contextMeta.chapterName || chapterId,
      }))
      injectFlashcardsIntoStore(formattedRecords)
    }

    return {
      success: true,
      count: payload.length,
      data: res.success && res.data ? res.data : { injected: payload.length, type: injectionType },
    }
  },
}
