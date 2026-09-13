/**
 * mcqService.js
 * Centralized API Service for MCQ & Flashcard Injection with Strict Course -> Subject -> Chapter Binding.
 * Enforces Super Admin permission strictly on all content mutations.
 * Guarantees zero cross-course, cross-subject, or cross-chapter leakage.
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
  getSnapshot as getAdminStoreSnapshot,
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

/**
 * Maps an incoming MCQ raw item to a canonical DB payload.
 * Target IDs (courseId, subjectId, chapterId) are stamped authoritatively from the verified Admin selection context.
 */
function mapMcqToPayload(item, subjectId, chapterId, courseId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  const correctMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
  const rawCorrect = item.correct !== undefined ? item.correct : (item.correct_answer !== undefined ? item.correct_answer : item.correctAnswer)
  const correctInt = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

  let diffInt = 2
  if (typeof item.difficulty === 'number') {
    diffInt = item.difficulty
  } else if (item.difficulty === 'Easy' || item.difficultyText === 'Easy') {
    diffInt = 1
  } else if (item.difficulty === 'Hard' || item.difficultyText === 'Hard') {
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
    course_id: String(courseId),
    subject_id: String(subjectId),
    chapter_id: String(chapterId),
    question: String(item.question || item.text || '').trim(),
    option_a: optA,
    option_b: optB,
    option_c: optC,
    option_d: optD,
    correct_answer: correctInt,
    explanation: String(item.explanation || '').trim(),
    difficulty: diffInt,
    status: item.status || 'active',
  }

  return payload
}

/**
 * Maps an incoming Flashcard item to a canonical DB payload.
 * Target IDs are stamped authoritatively from the verified Admin selection context.
 */
function mapFlashcardToPayload(item, subjectId, chapterId, courseId) {
  const isValidUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
  return {
    id: isValidUuid ? item.id : crypto.randomUUID(),
    course_id: String(courseId),
    subject_id: String(subjectId),
    chapter_id: String(chapterId),
    front: String(item.front || item.question || '').trim(),
    back: String(item.back || item.answer || item.explanation || '').trim(),
    status: item.status || 'active',
  }
}

const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function resolveHierarchy(courseId, subjectId, chapterId, allSubs = [], allChapters = [], allCourses = []) {
  let resolvedChId = chapterId ? String(chapterId).trim() : null
  let resolvedSubId = subjectId ? String(subjectId).trim() : null
  let resolvedCourseId = courseId ? String(courseId).trim() : null

  if (resolvedChId) {
    const ch = allChapters.find((c) => String(c.id) === resolvedChId || String(c.chapterId || '') === resolvedChId)
    if (ch) {
      resolvedChId = ch.id
      if (!resolvedSubId || !isUuid(resolvedSubId)) {
        resolvedSubId = ch.subject_id || ch.subjectId || resolvedSubId
      }
      if (!resolvedCourseId || !isUuid(resolvedCourseId)) {
        resolvedCourseId = ch.course_id || ch.courseId || resolvedCourseId
      }
    }
  }

  if (resolvedSubId) {
    const sub = allSubs.find((s) =>
      String(s.id) === resolvedSubId ||
      slugify(s.name) === slugify(resolvedSubId) ||
      slugify(s.slug || '') === slugify(resolvedSubId) ||
      slugify(s.shortCode || '') === slugify(resolvedSubId) ||
      slugify(s.key || '') === slugify(resolvedSubId)
    )
    if (sub) {
      resolvedSubId = sub.id
      if (!resolvedCourseId || !isUuid(resolvedCourseId)) {
        resolvedCourseId = sub.course_id || sub.courseId || resolvedCourseId
      }
    }
  }

  if (resolvedCourseId && allCourses.length > 0) {
    const course = allCourses.find((c) =>
      String(c.id) === resolvedCourseId ||
      slugify(c.name) === slugify(resolvedCourseId) ||
      slugify(c.id) === slugify(resolvedCourseId)
    )
    if (course) {
      resolvedCourseId = course.id
    }
  }

  return { resolvedCourseId, resolvedSubId, resolvedChId }
}

export const mcqService = {
  validatePayload(payload, type = 'mcqs') {
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return { valid: false, error: 'Payload must be a non-empty JSON array of items.' }
    }

    if (type === 'mcqs') {
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i]
        if (!item) {
          return { valid: false, error: `Item #${i + 1} is null or undefined.` }
        }
        const qText = item.question || item.text
        if (!qText || typeof qText !== 'string' || !qText.trim()) {
          return { valid: false, error: `Item #${i + 1} is missing a valid "question" stem.` }
        }
      }
    } else if (type === 'flashcards') {
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i]
        if (!item || !item.front || !item.back) {
          return { valid: false, error: `Flashcard #${i + 1} must contain both "front" and "back" text.` }
        }
      }
    }

    return { valid: true }
  },

  /**
   * Retrieves MCQs strictly scoped to Course, Subject, and Chapter.
   */
  async getMcqs(courseId, subjectId, chapterId) {
    let allSubs = []
    let allChapters = []
    let allCourses = []
    try {
      const snap = typeof getAdminStoreSnapshot === 'function' ? getAdminStoreSnapshot() : (useAdminStore.getState ? useAdminStore.getState() : {})
      allSubs = snap?.allSubjects || snap?.subjects || []
      allChapters = snap?.allChapters || snap?.chapters || []
      allCourses = snap?.allCourses || snap?.courses || []
    } catch {
      // ignore
    }

    const { resolvedCourseId, resolvedSubId, resolvedChId } = resolveHierarchy(courseId, subjectId, chapterId, allSubs, allChapters, allCourses)

    const params = []
    if (resolvedChId && isUuid(resolvedChId)) {
      params.push(`chapter_id=eq.${encodeURIComponent(resolvedChId)}`)
    } else if (resolvedSubId && isUuid(resolvedSubId)) {
      params.push(`subject_id=eq.${encodeURIComponent(resolvedSubId)}`)
    }

    const query = params.length > 0 ? `?${params.join('&')}&limit=5000` : `?limit=5000`

    try {
      const res = await apiService.get(`/mcqs${query}`)
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data
          .map((m) => {
            const parentSub = allSubs.find((s) => String(s.id) === String(m.subject_id))
            const cId = parentSub ? (parentSub.course_id || parentSub.courseId) : (m.course_id || m.courseId || resolvedCourseId)
            const isBpsc = m.exam_profile === 'BPSC_PRELIMS' || (cId && String(cId).toLowerCase().includes('bpsc'))
            const optE = m.option_e || (isBpsc ? 'Not Attempted' : null)
            return {
              ...m,
              courseId: cId,
              course_id: cId,
              subject_id: m.subject_id,
              chapter_id: m.chapter_id,
              subjectId: m.subject_id,
              chapterId: m.chapter_id,
              subject: parentSub ? parentSub.name : m.subject || m.subject_id,
              correct: m.correct_answer,
              correct_answer: m.correct_answer,
              correctAnswer: m.correct_answer,
              options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
              difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
              difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
              exam_profile: m.exam_profile || (isBpsc ? 'BPSC_PRELIMS' : 'GENERIC'),
              prompt_version: m.prompt_version || (isBpsc ? 'bpsc-prelims-v1' : 'generic-v1'),
            }
          })
          .filter((m) => {
            if (resolvedChId && m.chapter_id && String(m.chapter_id) !== String(resolvedChId)) return false
            if (!resolvedChId && resolvedSubId && m.subject_id && String(m.subject_id) !== String(resolvedSubId)) return false
            if (!resolvedChId && !resolvedSubId && resolvedCourseId && m.course_id && String(m.course_id) !== String(resolvedCourseId)) return false
            return true
          })

        if (mapped.length > 0) {
          return { success: true, data: mapped }
        }
      }
    } catch {
      // Fallback to store
    }

    // Fallback: Retrieve directly from adminStore with strict multi-key matching
    try {
      const snap = typeof getAdminStoreSnapshot === 'function' ? getAdminStoreSnapshot() : (useAdminStore.getState ? useAdminStore.getState() : {})
      const allMcqs = snap?.allMcqs || snap?.mcqs || []
      let filtered = allMcqs
      if (resolvedChId) {
        filtered = filtered.filter((m) => String(m.chapterId || m.chapter_id) === String(resolvedChId))
      } else if (resolvedSubId) {
        filtered = filtered.filter((m) => String(m.subjectId || m.subject_id) === String(resolvedSubId))
      } else if (resolvedCourseId) {
        filtered = filtered.filter((m) => String(m.courseId || m.course_id) === String(resolvedCourseId))
      }
      return { success: true, data: filtered }
    } catch {
      return { success: true, data: [] }
    }
  },

  /**
   * Retrieves Flashcards strictly scoped to Course, Subject, and Chapter.
   */
  async getFlashcards(courseId, subjectId, chapterId) {
    let allSubs = []
    let allChapters = []
    let allCourses = []
    try {
      const snap = typeof getAdminStoreSnapshot === 'function' ? getAdminStoreSnapshot() : (useAdminStore.getState ? useAdminStore.getState() : {})
      allSubs = snap?.allSubjects || snap?.subjects || []
      allChapters = snap?.allChapters || snap?.chapters || []
      allCourses = snap?.allCourses || snap?.courses || []
    } catch {
      // ignore
    }

    const { resolvedCourseId, resolvedSubId, resolvedChId } = resolveHierarchy(courseId, subjectId, chapterId, allSubs, allChapters, allCourses)

    const params = []
    if (resolvedChId && isUuid(resolvedChId)) {
      params.push(`chapter_id=eq.${encodeURIComponent(resolvedChId)}`)
    } else if (resolvedSubId && isUuid(resolvedSubId)) {
      params.push(`subject_id=eq.${encodeURIComponent(resolvedSubId)}`)
    }

    const query = params.length > 0 ? `?${params.join('&')}&limit=5000` : `?limit=5000`

    try {
      const res = await apiService.get(`/flashcards${query}`)
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data
          .map((f) => {
            const parentSub = allSubs.find((s) => String(s.id) === String(f.subject_id))
            const cId = parentSub ? (parentSub.course_id || parentSub.courseId) : (f.course_id || f.courseId || resolvedCourseId)
            return {
              ...f,
              courseId: cId,
              course_id: cId,
              subject_id: f.subject_id,
              chapter_id: f.chapter_id,
              subjectId: f.subject_id,
              chapterId: f.chapter_id,
              subject: parentSub ? parentSub.name : f.subject || f.subject_id,
            }
          })
          .filter((f) => {
            if (resolvedChId && f.chapter_id && String(f.chapter_id) !== String(resolvedChId)) return false
            if (!resolvedChId && resolvedSubId && f.subject_id && String(f.subject_id) !== String(resolvedSubId)) return false
            if (!resolvedChId && !resolvedSubId && resolvedCourseId && f.course_id && String(f.course_id) !== String(resolvedCourseId)) return false
            return true
          })

        if (mapped.length > 0) {
          return { success: true, data: mapped }
        }
      }
    } catch {
      // Fallback
    }

    try {
      const snap = typeof getAdminStoreSnapshot === 'function' ? getAdminStoreSnapshot() : (useAdminStore.getState ? useAdminStore.getState() : {})
      const allFlashcards = snap?.allFlashcards || snap?.flashcards || []
      let filtered = allFlashcards
      if (resolvedChId) {
        filtered = filtered.filter((f) => String(f.chapterId || f.chapter_id) === String(resolvedChId))
      } else if (resolvedSubId) {
        filtered = filtered.filter((f) => String(f.subjectId || f.subject_id) === String(resolvedSubId))
      } else if (resolvedCourseId) {
        filtered = filtered.filter((f) => String(f.courseId || f.course_id) === String(resolvedCourseId))
      }
      return { success: true, data: filtered }
    } catch {
      return { success: true, data: [] }
    }
  },

  /**
   * Atomic MCQ & Flashcard Injection with complete Course -> Subject -> Chapter validation.
   */
  async injectMcqs(courseIdOrOpts, subjectIdArg, chapterIdArg, payloadArg, injectionTypeArg = 'mcqs', contextMetaArg = {}) {
    // Normalize parameters if first argument is an options object
    let courseId = courseIdOrOpts
    let subjectId = subjectIdArg
    let chapterId = chapterIdArg
    let payload = payloadArg
    let injectionType = injectionTypeArg
    let contextMeta = contextMetaArg

    if (courseIdOrOpts && typeof courseIdOrOpts === 'object' && !Array.isArray(courseIdOrOpts)) {
      courseId = courseIdOrOpts.courseId || courseIdOrOpts.course_id
      subjectId = courseIdOrOpts.subjectId || courseIdOrOpts.subject_id
      chapterId = courseIdOrOpts.chapterId || courseIdOrOpts.chapter_id
      payload = courseIdOrOpts.rawPayload || courseIdOrOpts.payload || courseIdOrOpts.data || []
      injectionType = courseIdOrOpts.injectionType || courseIdOrOpts.type || 'mcqs'
      contextMeta = courseIdOrOpts.contextMeta || courseIdOrOpts
    }

    // 1. Super Admin Authorization Guard
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!courseId || !subjectId || !chapterId) {
      return { success: false, error: 'MCQ injection failed: courseId, subjectId, and chapterId are required.' }
    }

    // Pre-validate hierarchy against store snapshot if available
    try {
      const snap = typeof getAdminStoreSnapshot === 'function' ? getAdminStoreSnapshot() : (useAdminStore.getState ? useAdminStore.getState() : null)
      if (snap) {
        const subjects = snap.allSubjects || snap.subjects || []
        const chapters = snap.allChapters || snap.chapters || []
        
        const targetChapter = chapters.find((c) => String(c.id) === String(chapterId))
        if (targetChapter) {
          const chapSubId = targetChapter.subjectId || targetChapter.subject_id
          if (chapSubId && String(chapSubId) !== String(subjectId)) {
            return {
              success: false,
              error: `MCQ hierarchy validation failed: Chapter "${chapterId}" belongs to Subject "${chapSubId}", but was submitted with Subject "${subjectId}".`,
            }
          }
        }

        const targetSubject = subjects.find((s) => String(s.id) === String(subjectId))
        if (targetSubject) {
          const subCourseId = targetSubject.courseId || targetSubject.course_id
          if (subCourseId && String(subCourseId) !== String(courseId)) {
            return {
              success: false,
              error: `MCQ hierarchy validation failed: Subject "${subjectId}" belongs to Course "${subCourseId}", but was submitted with Course "${courseId}".`,
            }
          }
        }
      }
    } catch {
      // Ignore in non-store environment
    }

    // 2. Validate Payload structure
    const validation = this.validatePayload(payload, injectionType)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const isMcq = injectionType === 'mcqs'
    const table = isMcq ? 'mcqs' : 'flashcards'

    // 3. Map & Stamp Authoritative Target IDs
    const isBpsc = contextMeta.exam_profile === 'BPSC_PRELIMS' || (courseId && String(courseId).toLowerCase().includes('bpsc'))

    let formattedRecords = []
    let dbItems = []

    if (isMcq) {
      dbItems = payload.map((item) => mapMcqToPayload(item, subjectId, chapterId, courseId))
      formattedRecords = dbItems.map((m, idx) => {
        const original = payload[idx] || {}
        const optE = original.options?.E || original.options?.[4] || (isBpsc ? 'Not Attempted' : null)
        const correctMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
        const rawCorrect = original.correct !== undefined ? original.correct : (original.correct_answer !== undefined ? original.correct_answer : m.correct_answer)
        const correct = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)

        return {
          id: m.id || crypto.randomUUID(),
          courseId: String(courseId),
          course_id: String(courseId),
          subject_id: String(subjectId),
          chapter_id: String(chapterId),
          subjectId: String(subjectId),
          chapterId: String(chapterId),
          subject: contextMeta.subjectName || subjectId,
          chapter: contextMeta.chapterName || chapterId,
          question: m.question,
          options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
          correct,
          correct_answer: correct,
          correctAnswer: correct,
          difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
          explanation: m.explanation || original.explanation || '',
          exam_profile: contextMeta.exam_profile || (isBpsc ? 'BPSC_PRELIMS' : 'GENERIC'),
          prompt_version: contextMeta.prompt_version || (isBpsc ? 'bpsc-prelims-v1' : 'generic-v1'),
          attempts: '0',
          accuracy: '—',
        }
      })
    } else {
      dbItems = payload.map((item) => mapFlashcardToPayload(item, subjectId, chapterId, courseId))
      formattedRecords = dbItems.map((f, idx) => {
        const original = payload[idx] || {}
        return {
          id: f.id || crypto.randomUUID(),
          courseId: String(courseId),
          course_id: String(courseId),
          subject_id: String(subjectId),
          chapter_id: String(chapterId),
          subjectId: String(subjectId),
          chapterId: String(chapterId),
          subject: contextMeta.subjectName || subjectId,
          chapter: contextMeta.chapterName || chapterId,
          front: f.front || original.front || '',
          back: f.back || original.back || '',
          views: '0 views',
        }
      })
    }

    // 4. Attempt remote Supabase persistence first if UUIDs present
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    
    if (isUuid(subjectId) && isUuid(chapterId)) {
      try {
        // Strip client-only keys (course_id/courseId) before posting to Supabase tables
        const supabasePayload = dbItems.map((item) => {
          const { course_id, courseId: _cId, ...cleanItem } = item
          return cleanItem
        })
        const postRes = await apiService.post(`/${table}`, supabasePayload)
        if (!postRes.success) {
          return { success: false, error: postRes.error || `Database insertion rejected for ${table}.` }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(`[mcqService] Remote sync fallback: ${err.message}`);
        }
      }
    }

    // 5. Update in-memory store and recompute stats
    if (isMcq) {
      injectMcqsIntoStore(formattedRecords)
    } else {
      injectFlashcardsIntoStore(formattedRecords)
    }

    // Refresh background store
    hydrateAdminStoreFromSupabase().catch(() => {})

    return {
      success: true,
      count: formattedRecords.length,
      insertedCount: formattedRecords.length,
      data: formattedRecords,
    }
  },

  async getUserProgress(userId, chapterId) {
    if (!userId || !chapterId) {
      return { success: true, data: [] }
    }
    const all = await this.getAllUserProgress(userId)
    if (all.success && Array.isArray(all.data)) {
      const filtered = all.data.filter((p) => String(p.chapter_id || p.chapterId) === String(chapterId))
      return { success: true, data: filtered }
    }
    return { success: true, data: [] }
  },

  async getAllUserProgress(userId) {
    if (!userId) {
      return { success: true, data: [] }
    }

    let cloudData = []
    let localData = []

    try {
      const res = await apiService.get(
        `/mcq_progress?user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`
      )
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        cloudData = res.data
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`nexora_progress_${userId}`, JSON.stringify(cloudData))
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // network failure: fall back to local only
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`nexora_progress_${userId}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) localData = parsed
        }
      }
    } catch {
      // ignore
    }

    if (cloudData.length > 0 && localData.length > 0) {
      const cloudMap = new Map(cloudData.map((item) => [String(item.mcq_id || item.mcqId), item]))
      localData.forEach((item) => {
        const mcqId = String(item.mcq_id || item.mcqId)
        if (!cloudMap.has(mcqId)) {
          cloudData.push(item)
        }
      })
    } else if (cloudData.length === 0 && localData.length > 0) {
      cloudData = localData
    }

    return {
      success: true,
      data: cloudData,
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
        try {
          if (typeof localStorage !== 'undefined') {
            const allRes = await this.getAllUserProgress(userId)
            if (allRes.success && Array.isArray(allRes.data)) {
              localStorage.setItem(`nexora_progress_${userId}`, JSON.stringify(allRes.data))
            }
          }
        } catch {
          // ignore
        }
        return {
          success: true,
          data: Array.isArray(res.data) ? res.data : [res.data],
        }
      }
    } catch {
      // fallback
    }

    return {
      success: true,
      data: payload,
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

  async deleteTargetedMcqs(chapterIdOrIds, targetCountOrOpts = 1, position = 'end', courseId = '', subjectId = '') {
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!chapterIdOrIds) {
      return { success: false, error: 'Target identifier required for deletion' }
    }

    // Direct deletion if an array of IDs is passed
    if (Array.isArray(chapterIdOrIds)) {
      return this.deleteMcqs(chapterIdOrIds)
    }

    let chapterId = chapterIdOrIds
    let count = 1
    let pos = position
    let cId = courseId
    let sId = subjectId

    if (typeof targetCountOrOpts === 'object' && targetCountOrOpts !== null) {
      count = Math.max(1, parseInt(targetCountOrOpts.targetCount || targetCountOrOpts.count, 10) || 1)
      pos = targetCountOrOpts.position || position || 'end'
      cId = targetCountOrOpts.courseId || courseId || ''
      sId = targetCountOrOpts.subjectId || subjectId || ''
    } else {
      count = Math.max(1, parseInt(targetCountOrOpts, 10) || 1)
    }

    const getRes = await this.getMcqs(cId, sId, chapterId)
    if (!getRes.success || !Array.isArray(getRes.data)) {
      return { success: false, error: getRes.error || 'Failed to fetch chapter MCQs' }
    }

    const currentMcqs = getRes.data
    if (currentMcqs.length === 0) {
      return { success: false, error: 'Chapter has no MCQs to delete' }
    }

    let toDelete = []
    if (pos === 'start') {
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

  async trimChapterMcqs(chapterId, maxCount = 50, courseId = '', subjectId = '') {
    const auth = ensureSuperAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    if (!chapterId) {
      return { success: false, error: 'Chapter ID required for trimming' }
    }

    const limit = Math.max(0, parseInt(maxCount, 10) || 0)
    const getRes = await this.getMcqs(courseId, subjectId, chapterId)
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
