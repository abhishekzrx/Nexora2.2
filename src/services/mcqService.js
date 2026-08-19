/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Supabase DB column mapping.
 */

import { apiService } from './apiService'
import {
  injectMcqsIntoStore,
  injectFlashcardsIntoStore,
  hydrateAdminStoreFromSupabase,
  removeMcqsFromStore,
  removeMcqsForChapterFromStore,
  updateMcqInStore,
} from '../data/adminStore'
import {
  resetChapterProgressInStore,
  resetSubjectProgressInStore,
} from '../data/progressStore'

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
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    if (chapterId) {
      if (!isUuid(chapterId)) {
        return { success: true, data: [] }
      }
      if (subjectId && isUuid(subjectId)) {
        query = `?subject_id=eq.${encodeURIComponent(subjectId)}&chapter_id=eq.${encodeURIComponent(chapterId)}`
      } else {
        query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
      }
    } else if (subjectId) {
      if (!isUuid(subjectId)) {
        return { success: true, data: [] }
      }
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    } else if (courseId) {
      const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
      if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
        return { success: true, data: [] }
      }
      const subIds = subRes.data.map((s) => s.id).filter(isUuid)
      if (subIds.length === 0) return { success: true, data: [] }
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
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    if (chapterId) {
      if (!isUuid(chapterId)) {
        return { success: true, data: [] }
      }
      if (subjectId && isUuid(subjectId)) {
        query = `?subject_id=eq.${encodeURIComponent(subjectId)}&chapter_id=eq.${encodeURIComponent(chapterId)}`
      } else {
        query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
      }
    } else if (subjectId) {
      if (!isUuid(subjectId)) {
        return { success: true, data: [] }
      }
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    } else if (courseId) {
      const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
      if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
        return { success: true, data: [] }
      }
      const subIds = subRes.data.map((s) => s.id).filter(isUuid)
      if (subIds.length === 0) return { success: true, data: [] }
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

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    if (!isUuid(subjectId) || !isUuid(chapterId)) {
      return { success: false, error: 'Hierarchy Violation: subjectId and chapterId must be valid database UUIDs.' }
    }

    // Verify chapter exists in Supabase and belongs to the requested subjectId
    try {
      const chapRes = await apiService.get(`/chapters?id=eq.${encodeURIComponent(chapterId)}`)
      if (chapRes.success && Array.isArray(chapRes.data) && chapRes.data.length > 0) {
        const dbChap = chapRes.data[0]
        if (dbChap.subject_id && String(dbChap.subject_id) !== String(subjectId)) {
          return {
            success: false,
            error: `Hierarchy Violation: Chapter "${dbChap.name || chapterId}" belongs to subject_id "${dbChap.subject_id}", not target subject_id "${subjectId}".`,
          }
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[mcqService] Hierarchy check warning:', err)
      }
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
      if (res && res.success) {
        return {
          success: true,
          data: Array.isArray(res.data) ? res.data : [],
        }
      }
      return {
        success: false,
        error: res?.error || res?.message || 'Failed to fetch MCQ progress',
      }
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Failed to fetch MCQ progress',
      }
    }
  },

  async getAllUserProgress(userId) {
    if (!userId) {
      return { success: true, data: [] }
    }
    try {
      const res = await apiService.get(
        `/mcq_progress?user_id=eq.${encodeURIComponent(userId)}`
      )
      if (res && res.success) {
        return {
          success: true,
          data: Array.isArray(res.data) ? res.data : [],
        }
      }
      return {
        success: false,
        error: res?.error || res?.message || 'Failed to fetch overall MCQ progress',
      }
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Failed to fetch overall MCQ progress',
      }
    }
  },

  async updateUserProgress(userId, progressUpdates) {
    if (!userId || !Array.isArray(progressUpdates) || progressUpdates.length === 0) {
      return { success: true, data: [] }
    }

    const payload = progressUpdates.map((item) => ({
      user_id: item.user_id || userId,
      mcq_id: item.mcq_id,
      chapter_id: item.chapter_id,
      status: item.status,
      attempts: item.attempts !== undefined ? item.attempts : 1,
      correct_count: item.correct_count !== undefined ? item.correct_count : 0,
      incorrect_count: item.incorrect_count !== undefined ? item.incorrect_count : 0,
      last_attempted_at: item.last_attempted_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
    }))

    try {
      const res = await apiService.post(
        `/mcq_progress?on_conflict=user_id,mcq_id`,
        payload,
        { Prefer: 'resolution=merge-duplicates,return=representation' }
      )

      if (res && res.success) {
        return {
          success: true,
          data: Array.isArray(res.data) ? res.data : [res.data],
        }
      }

      return {
        success: false,
        error: res?.error || res?.message || 'Failed to update MCQ progress',
      }
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Failed to update MCQ progress',
      }
    }
  },

  async resetChapterProgress(chapterId) {
    if (!chapterId) {
      return { success: false, error: 'Chapter ID required for progress reset' }
    }

    try {
      // 1. Delete progress records from Supabase
      const res = await apiService.delete(`/mcq_progress?chapter_id=eq.${encodeURIComponent(chapterId)}`)
      
      // 2. Update reactive in-memory progressStore
      resetChapterProgressInStore(chapterId)

      // 3. Clean local attempt history in localStorage
      try {
        const saved = localStorage.getItem('nexora_recent_mcq_attempts')
        if (saved) {
          const list = JSON.parse(saved)
          if (Array.isArray(list)) {
            const filtered = list.filter((item) => String(item.chapterId) !== String(chapterId))
            localStorage.setItem('nexora_recent_mcq_attempts', JSON.stringify(filtered))
          }
        }
      } catch {
        // ignore storage errors
      }

      if (res && res.success) {
        return { success: true }
      }
      // If table row deletion succeeded or returned 204
      return { success: true }
    } catch (err) {
      // Always clear local state even if remote fails
      resetChapterProgressInStore(chapterId)
      return { success: false, error: err.message || 'Failed to reset chapter progress' }
    }
  },

  async resetSubjectProgress(subjectId, chapterIds = []) {
    if (!subjectId && chapterIds.length === 0) {
      return { success: false, error: 'Subject ID or Chapter IDs required for progress reset' }
    }

    try {
      if (subjectId) {
        await apiService.delete(`/mcq_progress?subject_id=eq.${encodeURIComponent(subjectId)}`)
      } else if (chapterIds.length > 0) {
        const idQuery = `?chapter_id=in.(${chapterIds.map((id) => encodeURIComponent(id)).join(',')})`
        await apiService.delete(`/mcq_progress${idQuery}`)
      }

      resetSubjectProgressInStore(subjectId, chapterIds)

      try {
        const saved = localStorage.getItem('nexora_recent_mcq_attempts')
        if (saved) {
          const list = JSON.parse(saved)
          if (Array.isArray(list)) {
            const chapSet = new Set(chapterIds.map((id) => String(id)))
            const filtered = list.filter(
              (item) => String(item.subjectKey) !== String(subjectId) && !chapSet.has(String(item.chapterId))
            )
            localStorage.setItem('nexora_recent_mcq_attempts', JSON.stringify(filtered))
          }
        }
      } catch {
        // ignore
      }

      return { success: true }
    } catch (err) {
      resetSubjectProgressInStore(subjectId, chapterIds)
      return { success: false, error: err.message || 'Failed to reset subject progress' }
    }
  },

  async deleteMcqs(mcqIds = []) {
    if (!Array.isArray(mcqIds) || mcqIds.length === 0) {
      return { success: true, count: 0 }
    }

    try {
      const idQuery = `?id=in.(${mcqIds.map((id) => encodeURIComponent(id)).join(',')})`
      const res = await apiService.delete(`/mcqs${idQuery}`)

      if (res && res.success) {
        removeMcqsFromStore(mcqIds)
        hydrateAdminStoreFromSupabase().catch(() => {})
        return { success: true, count: mcqIds.length }
      }
      return { success: false, error: res?.error || 'Failed to delete MCQs from database' }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },

  async deleteChapterMcqs(chapterId) {
    if (!chapterId) {
      return { success: false, error: 'Chapter ID required' }
    }

    try {
      const res = await apiService.delete(`/mcqs?chapter_id=eq.${encodeURIComponent(chapterId)}`)
      if (res && res.success) {
        removeMcqsForChapterFromStore(chapterId)
        hydrateAdminStoreFromSupabase().catch(() => {})
        return { success: true }
      }
      return { success: false, error: res?.error || 'Failed to delete chapter MCQs from database' }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },

  async deleteTargetedMcqs(chapterId, targetCount = 1, position = 'end') {
    if (!chapterId) {
      return { success: false, error: 'Chapter ID required for targeted deletion' }
    }

    const count = Math.max(1, parseInt(targetCount, 10) || 1)
    const getRes = await this.getMcqs('', '', chapterId)
    if (!getRes.success || !Array.isArray(getRes.data)) {
      return { success: false, error: getRes.error || 'Failed to fetch chapter MCQs' }
    }

    const currentMcqs = getRes.data
    if (currentMcqs.length === 0) {
      return { success: false, error: 'Chapter has no MCQs to delete' }
    }

    let toDelete = []
    if (position === 'start') {
      toDelete = currentMcqs.slice(0, count)
    } else {
      toDelete = currentMcqs.slice(-count)
    }

    const toDeleteIds = toDelete.map((m) => m.id).filter(Boolean)
    if (toDeleteIds.length === 0) {
      return { success: false, error: 'No valid questions found to delete' }
    }

    const delRes = await this.deleteMcqs(toDeleteIds)
    if (delRes.success) {
      return {
        success: true,
        deletedCount: toDeleteIds.length,
        totalRemaining: Math.max(0, currentMcqs.length - toDeleteIds.length),
      }
    }

    return delRes
  },

  async trimChapterMcqs(chapterId, maxCount = 50) {
    if (!chapterId) {
      return { success: false, error: 'Chapter ID required for trimming' }
    }

    const limit = Math.max(0, parseInt(maxCount, 10) || 0)
    const getRes = await this.getMcqs('', '', chapterId)
    if (!getRes.success || !Array.isArray(getRes.data)) {
      return { success: false, error: getRes.error || 'Failed to fetch chapter MCQs to trim' }
    }

    const currentMcqs = getRes.data
    if (currentMcqs.length <= limit) {
      return { success: true, trimmedCount: 0, message: `Chapter already has ${currentMcqs.length} MCQs (<= ${limit}).` }
    }

    // Keep first `limit` MCQs, delete excess
    const excess = currentMcqs.slice(limit)
    const excessIds = excess.map((m) => m.id).filter(Boolean)

    if (excessIds.length === 0) {
      return { success: true, trimmedCount: 0 }
    }

    const delRes = await this.deleteMcqs(excessIds)
    if (delRes.success) {
      return { success: true, trimmedCount: excessIds.length, totalRemaining: limit }
    }

    return delRes
  },

  async updateMcq(mcqId, updatePayload = {}) {
    if (!mcqId) {
      return { success: false, error: 'MCQ ID is required for update' }
    }

    const correctMap = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
    const rawCorrect = updatePayload.correct !== undefined ? updatePayload.correct : updatePayload.correct_answer
    const correctInt = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

    const dbPayload = {
      question: updatePayload.question,
      option_a: updatePayload.options?.[0] || updatePayload.option_a || 'Option A',
      option_b: updatePayload.options?.[1] || updatePayload.option_b || 'Option B',
      option_c: updatePayload.options?.[2] || updatePayload.option_c || 'Option C',
      option_d: updatePayload.options?.[3] || updatePayload.option_d || 'Option D',
      correct_answer: correctInt,
      explanation: updatePayload.explanation || '',
    }

    try {
      const res = await apiService.patch(`/mcqs?id=eq.${encodeURIComponent(mcqId)}`, dbPayload)
      if (res && res.success) {
        updateMcqInStore({ id: mcqId, ...updatePayload, ...dbPayload })
        hydrateAdminStoreFromSupabase().catch(() => {})
        return { success: true }
      }
      return { success: false, error: res?.error || 'Failed to update MCQ in database' }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },
}
