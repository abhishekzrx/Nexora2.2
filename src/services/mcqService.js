/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Supabase DB column mapping.
 * Enforces Super Admin permission strictly on all content mutations.
 * Supports resilient local store injection with background Supabase synchronization.
 */

import { apiService } from './apiService.js'
import {
  injectMcqsIntoStore,
  injectFlashcardsIntoStore,
  hydrateAdminStoreFromSupabase,
  removeMcqsFromStore,
  removeMcqsForChapterFromStore,
  updateMcqInStore,
  useAdminStore,
} from '../data/adminStore.js'
import {
  resetChapterProgressInStore,
  resetSubjectProgressInStore,
} from '../data/progressStore.js'
import { getMemberStoreSnapshot } from '../data/memberStore.js'

function ensureSuperAdmin() {
  try {
    const snapshot = getMemberStoreSnapshot()
    if (!snapshot.isSuperAdmin || snapshot.isViewingAs) {
      return {
        authorized: false,
        error: 'Permission Denied: Only Super Admin is authorized to create, update, or delete content.',
      }
    }
  } catch {
    // If store is loading, proceed with safety
  }
  return { authorized: true }
}

function mapMcqToPayload(item, subjectId, chapterId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  const correctMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
  const rawCorrect = item.correct !== undefined ? item.correct : (item.correct_answer !== undefined ? item.correct_answer : item.correctAnswer)
  const correctInt = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

  let diffInt = 2
  if (typeof item.difficulty === 'number') {
    diffInt = item.difficulty
  } else if (item.difficulty === 'Easy') {
    diffInt = 1
  } else if (item.difficulty === 'Hard') {
    diffInt = 3
  }

  const getOpt = (letter, idx) => {
    if (item.options) {
      if (typeof item.options === 'object' && !Array.isArray(item.options)) {
        if (item.options[letter] !== undefined && item.options[letter] !== null) return String(item.options[letter])
        if (item.options[letter.toUpperCase()] !== undefined && item.options[letter.toUpperCase()] !== null) return String(item.options[letter.toUpperCase()])
        if (item.options[letter.toLowerCase()] !== undefined && item.options[letter.toLowerCase()] !== null) return String(item.options[letter.toLowerCase()])
        if (item.options[idx] !== undefined && item.options[idx] !== null) return String(item.options[idx])
        if (item.options[String(idx)] !== undefined && item.options[String(idx)] !== null) return String(item.options[String(idx)])
      } else if (Array.isArray(item.options)) {
        if (item.options[idx] !== undefined && item.options[idx] !== null) return String(item.options[idx])
      }
    }
    const directVal = item[`option_${letter.toLowerCase()}`] ?? item[`option_${letter.toUpperCase()}`] ?? item[`option${letter.toUpperCase()}`] ?? item[`option${letter.toLowerCase()}`] ?? item[letter.toLowerCase()] ?? item[letter.toUpperCase()]
    if (directVal !== undefined && directVal !== null) {
      return String(directVal)
    }
    return ''
  }

  const optA = getOpt('A', 0) || 'Option A'
  const optB = getOpt('B', 1) || 'Option B'
  const optC = getOpt('C', 2) || 'Option C'
  const optD = getOpt('D', 3) || 'Option D'

  const payload = {
    id: isValidUuid ? item.id : crypto.randomUUID(),
    subject_id: subjectId,
    chapter_id: chapterId,
    question: item.question || item.text || '',
    option_a: optA,
    option_b: optB,
    option_c: optC,
    option_d: optD,
    correct_answer: correctInt,
    explanation: item.explanation || '',
    difficulty: diffInt,
    status: item.status || 'active',
  }

  return payload
}

function mapFlashcardToPayload(item, subjectId, chapterId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  return {
    id: isValidUuid ? item.id : crypto.randomUUID(),
    subject_id: subjectId,
    chapter_id: chapterId,
    front: item.front || '',
    back: item.back || '',
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
        if (!item.question && !item.text) {
          return { valid: false, error: `Item #${i + 1} is missing a valid "question" field.` }
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

    if (chapterId && isUuid(chapterId)) {
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
    } else if (subjectId && isUuid(subjectId)) {
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    } else if (courseId) {
      try {
        const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
        if (subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
          const subIds = subRes.data.map((s) => s.id).filter(isUuid)
          if (subIds.length > 0) {
            query = `?subject_id=in.(${subIds.map((id) => encodeURIComponent(id)).join(',')})`
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      if (query) {
        const res = await apiService.get(`/mcqs${query}`)
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((m) => {
            const isBpsc = m.exam_profile === 'BPSC_PRELIMS' || (courseId && String(courseId).toLowerCase().includes('bpsc'))
            const optE = m.option_e || (isBpsc ? 'Not Attempted' : null)
            return {
              ...m,
              courseId,
              subject_id: m.subject_id,
              chapter_id: m.chapter_id,
              subjectId: m.subject_id,
              chapterId: m.chapter_id,
              correct: m.correct_answer,
              options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
              exam_profile: m.exam_profile || (isBpsc ? 'BPSC_PRELIMS' : 'GENERIC'),
              prompt_version: m.prompt_version || (isBpsc ? 'bpsc-prelims-v1' : 'generic-v1'),
            }
          })
          return { success: true, data: mapped }
        }
      }
    } catch {
      // Fallback
    }

    // Fallback: Retrieve directly from adminStore
    try {
      const { allMcqs } = useAdminStore.getState ? useAdminStore.getState() : { allMcqs: [] }
      let filtered = allMcqs || []
      if (chapterId) {
        filtered = filtered.filter((m) => String(m.chapterId || m.chapter_id) === String(chapterId))
      } else if (subjectId) {
        filtered = filtered.filter((m) => String(m.subjectId || m.subject_id) === String(subjectId))
      } else if (courseId) {
        filtered = filtered.filter((m) => String(m.courseId) === String(courseId))
      }
      return { success: true, data: filtered }
    } catch {
      return { success: true, data: [] }
    }
  },

  async getFlashcards(courseId, subjectId, chapterId) {
    let query = ''
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    if (chapterId && isUuid(chapterId)) {
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
    } else if (subjectId && isUuid(subjectId)) {
      query = `?subject_id=eq.${encodeURIComponent(subjectId)}`
    }

    try {
      if (query) {
        const res = await apiService.get(`/flashcards${query}`)
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((f) => ({
            ...f,
            courseId,
            subject_id: f.subject_id,
            chapter_id: f.chapter_id,
            subjectId: f.subject_id,
            chapterId: f.chapter_id,
          }))
          return { success: true, data: mapped }
        }
      }
    } catch {
      // Fallback
    }

    try {
      const { allFlashcards } = useAdminStore.getState ? useAdminStore.getState() : { allFlashcards: [] }
      let filtered = allFlashcards || []
      if (chapterId) {
        filtered = filtered.filter((f) => String(f.chapterId || f.chapter_id) === String(chapterId))
      } else if (subjectId) {
        filtered = filtered.filter((f) => String(f.subjectId || f.subject_id) === String(subjectId))
      }
      return { success: true, data: filtered }
    } catch {
      return { success: true, data: [] }
    }
  },

  async injectMcqs(courseId, subjectId, chapterId, payload, injectionType = 'mcqs', contextMeta = {}) {
    // 1. Strict Super Admin Authorization Guard
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!courseId || !subjectId || !chapterId) {
      return { success: false, error: 'MCQ injection failed: courseId, subjectId, and chapterId are required.' }
    }

    // 2. Validate Payload structure
    const validation = this.validatePayload(payload, injectionType)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const isMcq = injectionType === 'mcqs'
    const table = isMcq ? 'mcqs' : 'flashcards'

    // 3. Format items into frontend schema & DB payload
    const isBpsc = contextMeta.exam_profile === 'BPSC_PRELIMS' || (courseId && String(courseId).toLowerCase().includes('bpsc'))

    let formattedRecords = []
    let dbItems = []

    if (isMcq) {
      dbItems = payload.map((item) => mapMcqToPayload(item, subjectId, chapterId))
      formattedRecords = dbItems.map((m, idx) => {
        const original = payload[idx] || {}
        const optE = original.options?.E || original.options?.[4] || (isBpsc ? 'Not Attempted' : null)
        const correctMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
        const rawCorrect = original.correct !== undefined ? original.correct : (original.correct_answer !== undefined ? original.correct_answer : m.correct_answer)
        const correct = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

        return {
          id: m.id || crypto.randomUUID(),
          courseId: courseId,
          subject_id: subjectId,
          chapter_id: chapterId,
          subjectId: subjectId,
          chapterId: chapterId,
          subject: contextMeta.subjectName || subjectId,
          chapter: contextMeta.chapterName || chapterId,
          question: m.question,
          options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
          correct,
          difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          explanation: m.explanation || original.explanation || '',
          exam_profile: contextMeta.exam_profile || (isBpsc ? 'BPSC_PRELIMS' : 'GENERIC'),
          prompt_version: contextMeta.prompt_version || (isBpsc ? 'bpsc-prelims-v1' : 'generic-v1'),
          attempts: '0',
          accuracy: '—',
        }
      })
      // Inject into in-memory admin store immediately
      injectMcqsIntoStore(formattedRecords)
    } else {
      dbItems = payload.map((item) => mapFlashcardToPayload(item, subjectId, chapterId))
      formattedRecords = dbItems.map((f, idx) => {
        const original = payload[idx] || {}
        return {
          id: f.id || crypto.randomUUID(),
          courseId: courseId,
          subject_id: subjectId,
          chapter_id: chapterId,
          subjectId: subjectId,
          chapterId: chapterId,
          subject: contextMeta.subjectName || subjectId,
          chapter: contextMeta.chapterName || chapterId,
          front: f.front || original.front || '',
          back: f.back || original.back || '',
          views: '0 views',
        }
      })
      // Inject into in-memory admin store immediately
      injectFlashcardsIntoStore(formattedRecords)
    }

    // 4. Asynchronously attempt remote Supabase persistence
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    if (isUuid(subjectId) && isUuid(chapterId)) {
      apiService.post(`/${table}`, dbItems).then((res) => {
        if (res.success) {
          hydrateAdminStoreFromSupabase().catch(() => {})
        }
      }).catch((err) => {
        if (import.meta.env.DEV) {
          console.warn(`[mcqService] Background remote sync skipped (${err.message}). Local store updated.`);
        }
      })
    }

    return {
      success: true,
      count: formattedRecords.length,
      data: formattedRecords,
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
      course_id: item.course_id || item.courseId || null,
      subject_id: item.subject_id || item.subjectId || null,
      chapter_id: item.chapter_id || item.chapterId || null,
      status: item.status,
      first_attempted_at: item.first_attempted_at || item.last_attempted_at || new Date().toISOString(),
      last_attempted_at: item.last_attempted_at || new Date().toISOString(),
      attempts: item.total_attempts !== undefined ? item.total_attempts : (item.attempts !== undefined ? item.attempts : 1),
      total_attempts: item.total_attempts !== undefined ? item.total_attempts : (item.attempts !== undefined ? item.attempts : 1),
      correct_count: item.correct_attempts !== undefined ? item.correct_attempts : (item.correct_count !== undefined ? item.correct_count : 0),
      correct_attempts: item.correct_attempts !== undefined ? item.correct_attempts : (item.correct_count !== undefined ? item.correct_count : 0),
      incorrect_count: item.incorrect_attempts !== undefined ? item.incorrect_attempts : (item.incorrect_count !== undefined ? item.incorrect_count : 0),
      incorrect_attempts: item.incorrect_attempts !== undefined ? item.incorrect_attempts : (item.incorrect_count !== undefined ? item.incorrect_count : 0),
      latest_result: item.latest_result || (item.status === 'MASTERED' ? 'CORRECT' : 'INCORRECT'),
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
      const res = await apiService.delete(`/mcq_progress?chapter_id=eq.${encodeURIComponent(chapterId)}`)
      resetChapterProgressInStore(chapterId)

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

      return { success: true }
    } catch (err) {
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
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!Array.isArray(mcqIds) || mcqIds.length === 0) {
      return { success: true, count: 0 }
    }

    try {
      removeMcqsFromStore(mcqIds)
      const idQuery = `?id=in.(${mcqIds.map((id) => encodeURIComponent(id)).join(',')})`
      apiService.delete(`/mcqs${idQuery}`).catch(() => {})
      hydrateAdminStoreFromSupabase().catch(() => {})
      return { success: true, count: mcqIds.length }
    } catch (err) {
      return { success: false, error: err.message || 'Error deleting MCQs' }
    }
  },

  async deleteChapterMcqs(chapterId) {
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!chapterId) {
      return { success: false, error: 'Chapter ID required' }
    }

    try {
      removeMcqsForChapterFromStore(chapterId)
      apiService.delete(`/mcqs?chapter_id=eq.${encodeURIComponent(chapterId)}`).catch(() => {})
      hydrateAdminStoreFromSupabase().catch(() => {})
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete chapter MCQs' }
    }
  },

  async deleteTargetedMcqs(chapterId, targetCount = 1, position = 'end') {
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

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
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

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
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!mcqId) {
      return { success: false, error: 'MCQ ID is required for update' }
    }

    const correctMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
    const rawCorrect = updatePayload.correct !== undefined ? updatePayload.correct : (updatePayload.correct_answer !== undefined ? updatePayload.correct_answer : updatePayload.correctAnswer)
    const correctInt = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

    const getOpt = (letter, idx) => {
      if (updatePayload.options) {
        if (typeof updatePayload.options === 'object' && !Array.isArray(updatePayload.options)) {
          if (updatePayload.options[letter] !== undefined && updatePayload.options[letter] !== null) return String(updatePayload.options[letter])
          if (updatePayload.options[letter.toUpperCase()] !== undefined && updatePayload.options[letter.toUpperCase()] !== null) return String(updatePayload.options[letter.toUpperCase()])
          if (updatePayload.options[letter.toLowerCase()] !== undefined && updatePayload.options[letter.toLowerCase()] !== null) return String(updatePayload.options[letter.toLowerCase()])
          if (updatePayload.options[idx] !== undefined && updatePayload.options[idx] !== null) return String(updatePayload.options[idx])
        } else if (Array.isArray(updatePayload.options)) {
          if (updatePayload.options[idx] !== undefined && updatePayload.options[idx] !== null) return String(updatePayload.options[idx])
        }
      }
      const direct = updatePayload[`option_${letter.toLowerCase()}`] ?? updatePayload[`option_${letter.toUpperCase()}`] ?? updatePayload[`option${letter.toUpperCase()}`] ?? updatePayload[`option${letter.toLowerCase()}`] ?? updatePayload[letter.toLowerCase()] ?? updatePayload[letter.toUpperCase()]
      return direct !== undefined && direct !== null ? String(direct) : ''
    }

    const optA = getOpt('A', 0) || 'Option A'
    const optB = getOpt('B', 1) || 'Option B'
    const optC = getOpt('C', 2) || 'Option C'
    const optD = getOpt('D', 3) || 'Option D'

    const dbPayload = {
      question: updatePayload.question || updatePayload.text || '',
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctInt,
      explanation: updatePayload.explanation || '',
    }

    try {
      updateMcqInStore({ id: mcqId, ...updatePayload, ...dbPayload })
      apiService.patch(`/mcqs?id=eq.${encodeURIComponent(mcqId)}`, dbPayload).catch(() => {})
      hydrateAdminStoreFromSupabase().catch(() => {})
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Network request failed' }
    }
  },
}
