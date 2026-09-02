/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Supabase DB column mapping.
 */

import { apiService } from './apiService.js'
import {
  injectMcqsIntoStore,
  injectFlashcardsIntoStore,
  hydrateAdminStoreFromSupabase,
  removeMcqsFromStore,
  removeMcqsForChapterFromStore,
  updateMcqInStore,
} from '../data/adminStore.js'
import {
  resetChapterProgressInStore,
  resetSubjectProgressInStore,
} from '../data/progressStore.js'

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
      // Chapter is the authoritative retrieval scope
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
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
        // Defensive validation on read
        const validated = res.data.filter((m) => {
          if (!m || !m.id) return false
          if (chapterId && isUuid(chapterId)) {
            if (String(m.chapter_id) !== String(chapterId)) {
              console.warn(`[mcqService] Defensive filter dropped MCQ ${m.id}: chapter_id "${m.chapter_id}" does not match requested "${chapterId}".`)
              return false
            }
          }
          if (subjectId && isUuid(subjectId)) {
            if (String(m.subject_id) !== String(subjectId)) {
              console.warn(`[mcqService] Defensive filter dropped MCQ ${m.id}: subject_id "${m.subject_id}" does not match requested "${subjectId}".`)
              return false
            }
          }
          return true
        })

        const mapped = validated.map((m) => {
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

        if (import.meta.env.DEV) {
          console.log(`[MCQ FETCH]\nSubject ID: ${subjectId || 'N/A'}\nChapter ID: ${chapterId || 'N/A'}\nReturned count: ${mapped.length}`)
        }

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
      query = `?chapter_id=eq.${encodeURIComponent(chapterId)}`
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
        const validated = res.data.filter((f) => {
          if (!f || !f.id) return false
          if (chapterId && isUuid(chapterId) && String(f.chapter_id) !== String(chapterId)) return false
          if (subjectId && isUuid(subjectId) && String(f.subject_id) !== String(subjectId)) return false
          return true
        })

        const mapped = validated.map((f) => ({
          ...f,
          courseId,
          subject_id: f.subject_id,
          chapter_id: f.chapter_id,
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
      return { success: false, error: 'MCQ injection failed: courseId, subjectId, and chapterId are required.' }
    }

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    if (!isUuid(subjectId) || !isUuid(chapterId)) {
      return { success: false, error: 'MCQ injection failed: subjectId and chapterId must be valid database UUIDs.' }
    }

    // 1. Verify Chapter exists and belongs to the requested subjectId
    try {
      const chapRes = await apiService.get(`/chapters?id=eq.${encodeURIComponent(chapterId)}`)
      if (!chapRes.success || !Array.isArray(chapRes.data) || chapRes.data.length === 0) {
        return {
          success: false,
          error: 'MCQ injection failed: selected chapter does not exist in the database.',
        }
      }
      const dbChap = chapRes.data[0]
      if (String(dbChap.subject_id) !== String(subjectId)) {
        return {
          success: false,
          error: 'MCQ injection failed: selected chapter does not belong to selected subject.',
        }
      }
    } catch (err) {
      return {
        success: false,
        error: `MCQ injection failed during chapter verification: ${err.message}`,
      }
    }

    // 2. Verify Subject exists and belongs to the requested courseId
    try {
      const subRes = await apiService.get(`/subjects?id=eq.${encodeURIComponent(subjectId)}`)
      if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
        return {
          success: false,
          error: 'MCQ injection failed: selected subject does not exist in the database.',
        }
      }
      const dbSub = subRes.data[0]
      if (dbSub.course_id && String(dbSub.course_id) !== String(courseId)) {
        return {
          success: false,
          error: 'MCQ injection failed: selected subject does not belong to selected course.',
        }
      }
    } catch (err) {
      return {
        success: false,
        error: `MCQ injection failed during subject verification: ${err.message}`,
      }
    }

    // 3. Validate Payload structure
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

    if (import.meta.env.DEV) {
      console.log(`[MCQ INJECTION]\nCourse ID: ${courseId}\nSubject ID: ${subjectId}\nChapter ID: ${chapterId}\nMCQ count: ${dbItems.length}`)
    }

    const res = await apiService.post(`/${table}`, dbItems)

    if (!res.success) {
      return { success: false, error: res.error || `Failed to inject ${injectionType} into database` }
    }

    const insertedRecords = Array.isArray(res.data) ? res.data : dbItems

    if (isMcq) {
      const isBpsc = contextMeta.exam_profile === 'BPSC_PRELIMS' || (courseId && String(courseId).toLowerCase().includes('bpsc'))
      const formattedRecords = insertedRecords.map((m, idx) => {
        const original = payload[idx] || {}
        const optE = original.options?.E || original.options?.[4] || (isBpsc ? 'Not Attempted' : null)
        return {
          id: m.id,
          courseId: courseId,
          subject_id: m.subject_id || subjectId,
          chapter_id: m.chapter_id || chapterId,
          subjectId: m.subject_id || subjectId,
          chapterId: m.chapter_id || chapterId,
          subject: contextMeta.subjectName || subjectId,
          chapter: contextMeta.chapterName || chapterId,
          question: m.question,
          options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
          correct: m.correct_answer,
          difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          explanation: m.explanation || '',
          exam_profile: contextMeta.exam_profile || (isBpsc ? 'BPSC_PRELIMS' : 'GENERIC'),
          prompt_version: contextMeta.prompt_version || (isBpsc ? 'bpsc-prelims-v1' : 'generic-v1'),
          attempts: '0',
          accuracy: '—',
        }
      })
      injectMcqsIntoStore(formattedRecords)
    } else {
      const formattedRecords = insertedRecords.map((f) => ({
        id: f.id,
        courseId: courseId,
        subject_id: f.subject_id || subjectId,
        chapter_id: f.chapter_id || chapterId,
        subjectId: f.subject_id || subjectId,
        chapterId: f.chapter_id || chapterId,
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
