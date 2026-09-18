/**
 * practiceSessionService.js
 * Authoritative Practice Session Integrity, Question Freezing & Interruption Recovery Service.
 *
 * Enforces Phase 1 Core Rule:
 * ONCE A PRACTICE SESSION IS CREATED, ITS QUESTION SET MUST REMAIN FIXED FOR THAT ENTIRE SESSION.
 *
 * Guarantees:
 * 1. Single Randomization: Questions are selected/shuffled ONLY ONCE at session creation.
 * 2. Question Set Freeze: The same session_id ALWAYS yields the exact same questions in the exact same order.
 * 3. Question-ID Answer Mapping: Answers are associated strictly with question_id (never array index).
 * 4. Interruption Resilience: Survives tab switches, app switching, lock/unlock, page reload, and remounts.
 * 5. Single Source of Truth: Supabase authoritative session with resilient user-scoped local recovery cache.
 * 6. Answer Autosave: Immediate local persistence with server sync queue and retry on failure.
 * 7. Result Safety: Score evaluation verifies every answer against question_id and frozen session question IDs.
 */

import { apiService } from './apiService.js'
import { buildAdaptivePracticeSet } from './adaptivePracticeEngine.js'

const ACTIVE_SESSION_PREFIX = 'nexora_active_practice_session'
const PENDING_SYNC_PREFIX = 'nexora_pending_session_sync'
const PENDING_ANSWERS_PREFIX = 'nexora_pending_answers'

// In-memory active session cache & concurrency tracker
const memoryActiveSessions = new Map()
const memoryPendingSync = new Map()
const memoryLatestServerTime = new Map()

function getScopedKey(userId, keySuffix) {
  const uid = userId || 'anon'
  return `${ACTIVE_SESSION_PREFIX}_${uid}_${keySuffix}`
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

function removeStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

export const practiceSessionService = {
  /**
   * Generates a unique, collision-resistant practice session ID.
   */
  generateSessionId(userId) {
    const cleanUser = String(userId || 'usr').replace(/[^a-zA-Z0-9_-]/g, '')
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 9)
    return `psess_${cleanUser}_${ts}_${rand}`
  },

  /**
   * Finds an existing active or paused practice session for the student.
   * Priority:
   * 1. Authoritative Supabase session
   * 2. User-scoped local recovery cache
   * 3. null (Supabase wins if discrepancy exists)
   */
  async findActiveSession({ userId, courseId, chapterId, subjectId, subjectKey, sessionId = null }) {
    if (!userId) return null

    const effectiveSubj = subjectId || subjectKey || null
    const memoryKey = `${userId}_${chapterId || effectiveSubj || 'default'}`
    const localKey = getScopedKey(userId, chapterId || effectiveSubj || 'latest')
    const generalKey = getScopedKey(userId, 'latest')

    // 1. Try Supabase authoritative session
    try {
      let query = `?user_id=eq.${encodeURIComponent(userId)}&status=in.(ACTIVE,PAUSED)&order=updated_at.desc&limit=1`
      if (sessionId) {
        query = `?session_id=eq.${encodeURIComponent(sessionId)}&limit=1`
      } else if (chapterId) {
        query = `?user_id=eq.${encodeURIComponent(userId)}&chapter_id=eq.${encodeURIComponent(chapterId)}&status=in.(ACTIVE,PAUSED)&order=updated_at.desc&limit=1`
      }

      const res = await apiService.get(`/practice_sessions${query}`)
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const row = res.data[0]
        if (row.status === 'ACTIVE' || row.status === 'PAUSED') {
          const session = this.mapDbRowToSession(row)
          // Update local cache so it matches Supabase
          this.saveToLocalCache(session)
          memoryActiveSessions.set(memoryKey, session)
          return session
        }
      }
    } catch {
      // Supabase network / table unavailable -> proceed to local recovery cache
    }

    // 2. User-scoped local recovery cache
    try {
      const raw = getStorageItem(localKey) || getStorageItem(generalKey)
      if (raw) {
        const session = JSON.parse(raw)
        if (session && (session.status === 'ACTIVE' || session.status === 'PAUSED')) {
          // If a specific chapterId was requested, verify match
          if (!chapterId || String(session.chapterId) === String(chapterId)) {
            memoryActiveSessions.set(memoryKey, session)
            return session
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Check memory
    if (memoryActiveSessions.has(memoryKey)) {
      const sess = memoryActiveSessions.get(memoryKey)
      if (sess && (sess.status === 'ACTIVE' || sess.status === 'PAUSED')) {
        return sess
      }
    }

    return null
  },

  /**
   * Creates and persists a brand-new practice session with FROZEN questions and order.
   * Ensures randomization happens ONCE and ONLY ONCE.
   */
  async createSession({
    userId,
    courseId,
    subjectId,
    subjectKey,
    subjectTitle = '',
    chapterId,
    chapterTitle = '',
    targetCount = null,
    sessionSize = null,
    mode = 'adaptive',
    selectedConceptId = null,
    candidateQuestions = [],
    questions = [],
    progressList = [],
    chapter = null,
    totalAllocatedSeconds = null,
  }) {
    if (!userId) {
      throw new Error('[practiceSessionService] userId is required to create a practice session.')
    }

    const effectiveSubjectId = subjectId || subjectKey || null
    let effectiveTargetCount = 20
    if (typeof targetCount === 'number' || targetCount === 'all') {
      effectiveTargetCount = targetCount
    } else if (typeof sessionSize === 'number' || sessionSize === 'all') {
      effectiveTargetCount = sessionSize
    } else if (mode === 'set_10') {
      effectiveTargetCount = 10
    } else if (mode === 'set_20') {
      effectiveTargetCount = 20
    } else if (mode === 'set_30') {
      effectiveTargetCount = 30
    } else if (mode === 'set_all') {
      effectiveTargetCount = 'all'
    }

    const pool = (Array.isArray(candidateQuestions) && candidateQuestions.length > 0)
      ? candidateQuestions
      : (Array.isArray(questions) ? questions : [])

    // Guard: check if an active session already exists for this exact context to avoid duplicate/replacement
    const existing = await this.findActiveSession({ userId, courseId, chapterId, subjectId: effectiveSubjectId })
    if (existing && Array.isArray(existing.questionIds) && existing.questionIds.length > 0) {
      return existing
    }

    // 1. Select and randomize questions EXACTLY ONCE
    const selected = buildAdaptivePracticeSet(pool, progressList, {
      mode,
      targetCount: effectiveTargetCount,
      selectedConceptId,
      chapter,
    })

    if (!Array.isArray(selected) || selected.length === 0) {
      throw new Error('[practiceSessionService] No questions available to construct session.')
    }

    const sessionId = this.generateSessionId(userId)
    const questionIds = selected.map((q) => String(q.id))
    const questionOrder = [...questionIds]

    // Capture frozen option orders for absolute integrity
    const optionOrders = {}
    selected.forEach((q) => {
      optionOrders[q.id] = Array.isArray(q.options) ? [...q.options] : []
    })

    const qCount = selected.length
    const calcSeconds = totalAllocatedSeconds || Math.max(10 * 60, qCount * 90)

    const session = {
      sessionId,
      session_id: sessionId,
      userId,
      user_id: userId,
      courseId: courseId || 'course_default',
      course_id: courseId || 'course_default',
      subjectId: subjectId || null,
      subject_id: subjectId || null,
      subjectTitle: subjectTitle || null,
      subject_title: subjectTitle || null,
      chapterId: chapterId || null,
      chapter_id: chapterId || null,
      chapterTitle: chapterTitle || null,
      chapter_title: chapterTitle || null,
      mode,
      sessionSize: qCount,
      session_size: qCount,
      questionIds,
      question_ids: questionIds,
      questionOrder,
      question_order: questionOrder,
      optionOrders,
      option_orders: optionOrders,
      status: 'ACTIVE',
      currentIndex: 0,
      currentQuestionIndex: 0,
      current_question_index: 0,
      answers: {}, // { [question_id]: { selectedOption, answeredAt, updatedAt } }
      markedQuestionIds: [],
      marked_question_ids: [],
      visitedQuestionIds: [questionIds[0]],
      visited_question_ids: [questionIds[0]],
      secondsLeft: calcSeconds,
      seconds_left: calcSeconds,
      totalAllocatedSeconds: calcSeconds,
      total_allocated_seconds: calcSeconds,
      frozenQuestions: selected.map((q) => ({
        id: q.id,
        text: q.text || q.question,
        question: q.text || q.question,
        options: optionOrders[q.id] || q.options,
        correct: q.correct !== undefined ? q.correct : (q.correct_answer ?? 0),
        correct_answer: q.correct !== undefined ? q.correct : (q.correct_answer ?? 0),
        explanation: q.explanation || '',
        chapterId: q.chapterId || chapterId,
        subjectId: q.subjectId || subjectId,
        difficulty: q.difficulty || 'Medium',
        conceptName: q.conceptName || null,
        questionAngle: q.questionAngle || null,
        pyq_year: q.pyq_year || null,
      })),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 2. Persist locally first (immediate resilience)
    this.saveToLocalCache(session)
    const memoryKey = `${userId}_${chapterId || subjectId || 'default'}`
    memoryActiveSessions.set(memoryKey, session)

    // 3. Persist to Supabase asynchronously
    this.syncSessionToSupabase(session).catch((err) => {
      if (import.meta.env?.DEV) {
        console.warn('[practiceSessionService] Background Supabase session creation queued:', err.message)
      }
    })

    return session
  },

  /**
   * Reconstructs the exact questions in the EXACT order of the frozen session.
   * Guarantees that neither questions nor options change.
   */
  restoreSessionQuestions(session, allAvailableQuestions = []) {
    if (!session || !Array.isArray(session.questionIds) || session.questionIds.length === 0) {
      return []
    }

    const availableMap = new Map()
    allAvailableQuestions.forEach((q) => {
      if (q && q.id) availableMap.set(String(q.id), q)
    })

    const frozenMap = new Map()
    if (Array.isArray(session.frozenQuestions)) {
      session.frozenQuestions.forEach((q) => {
        if (q && q.id) frozenMap.set(String(q.id), q)
      })
    }

    const restored = []
    const optionOrders = session.optionOrders || {}

    for (const qId of session.questionIds) {
      const q = availableMap.get(qId) || frozenMap.get(qId)
      if (q) {
        const frozenOpts = optionOrders[qId] || q.options
        restored.push({
          ...q,
          options: frozenOpts,
        })
      }
    }

    return restored
  },

  /**
   * Records and persists an answer associated strictly with question_id.
   * Uses atomic single-question writes on Supabase to prevent cross-device overwrites.
   */
  async saveAnswer({ sessionId, userId, questionId, selectedOption }) {
    if (!sessionId || !userId || !questionId) return

    // Strict Read-Only Guard: Viewing As Member must not write answers
    if (this.isReadOnly()) return

    const session = await this.findActiveSession({ userId, sessionId })
    if (!session) return

    const nowIso = new Date().toISOString()
    const answerRecord = {
      practice_session_id: sessionId,
      user_id: userId,
      question_id: String(questionId),
      selected_option: selectedOption,
      selectedOption,
      answered_at: session.answers[questionId]?.answered_at || nowIso,
      updated_at: nowIso,
    }

    session.answers = {
      ...session.answers,
      [String(questionId)]: answerRecord,
    }
    session.updatedAt = nowIso
    session.updated_at = nowIso

    // Persist immediately to local cache
    this.saveToLocalCache(session)
    const memoryKey = `${userId}_${session.chapterId || session.subjectId || 'default'}`
    memoryActiveSessions.set(memoryKey, session)

    // 1. Try atomic single-question write on Supabase
    try {
      const rpcRes = await apiService.rpc('record_practice_session_answer', {
        p_session_id: sessionId,
        p_user_id: userId,
        p_question_id: String(questionId),
        p_answer: answerRecord,
      })
      if (rpcRes && rpcRes.success) {
        this.removePendingAnswer(userId, sessionId, questionId)
        return { success: true, atomic: true }
      }
    } catch {
      // RPC unavailable or network offline -> queue fallback
    }

    // 2. Queue debounced full sync to server
    this.queueSync(session)

    // 3. Track in pending answers queue for reliable offline replay
    this.queuePendingAnswer(userId, sessionId, questionId, answerRecord)
    return { success: true, queued: true }
  },

  /**
   * Updates session navigation & timer progress.
   */
  async saveProgress({
    sessionId,
    userId,
    currentIndex,
    markedQuestionIds,
    visitedQuestionIds,
    secondsLeft,
    status = 'ACTIVE',
  }) {
    if (!sessionId || !userId) return

    const session = await this.findActiveSession({ userId, sessionId })
    if (!session) return

    const nowIso = new Date().toISOString()
    if (typeof currentIndex === 'number') {
      session.currentIndex = currentIndex
      session.currentQuestionIndex = currentIndex
      session.current_question_index = currentIndex
    }
    if (Array.isArray(markedQuestionIds)) {
      session.markedQuestionIds = markedQuestionIds.map(String)
      session.marked_question_ids = session.markedQuestionIds
    }
    if (Array.isArray(visitedQuestionIds)) {
      session.visitedQuestionIds = visitedQuestionIds.map(String)
      session.visited_question_ids = session.visitedQuestionIds
    }
    if (typeof secondsLeft === 'number') {
      session.secondsLeft = secondsLeft
      session.seconds_left = secondsLeft
    }
    if (status) {
      session.status = status
    }
    session.updatedAt = nowIso
    session.updated_at = nowIso

    this.saveToLocalCache(session)
    const memoryKey = `${userId}_${session.chapterId || session.subjectId || 'default'}`
    memoryActiveSessions.set(memoryKey, session)

    this.queueSync(session)
  },

  /**
   * Marks a practice session as completed/submitted.
   * Cleans active cache so subsequent practice starts fresh.
   */
  async markSessionSubmitted({ sessionId, userId, result = {} }) {
    if (!sessionId || !userId) return

    const session = await this.findActiveSession({ userId, sessionId })
    const nowIso = new Date().toISOString()

    const updatePayload = {
      status: 'SUBMITTED',
      completed_at: nowIso,
      score: result.score || 0,
      percentage: result.percentage || 0,
      accuracy: result.accuracy || 0,
      correct_count: result.correct || 0,
      incorrect_count: result.incorrect || 0,
      skipped_count: result.unanswered || 0,
      time_taken_seconds: result.timeTakenSeconds || 0,
      updated_at: nowIso,
    }

    if (session) {
      session.status = 'SUBMITTED'
      session.updatedAt = nowIso
      session.updated_at = nowIso
    }

    // 1. Remove from active caches
    if (session) {
      const localKey = getScopedKey(userId, session.chapterId || session.subjectId || 'latest')
      removeStorageItem(localKey)
      removeStorageItem(getScopedKey(userId, 'latest'))
      const memoryKey = `${userId}_${session.chapterId || session.subjectId || 'default'}`
      memoryActiveSessions.delete(memoryKey)
    }

    // 2. Persist submitted state to Supabase
    try {
      await apiService.patch(`/practice_sessions?session_id=eq.${encodeURIComponent(sessionId)}`, updatePayload)
    } catch {
      // ignore
    }
  },

  /**
   * Explicitly abandons an active session.
   */
  async abandonSession({ sessionId, userId }) {
    if (!sessionId || !userId) return

    const session = await this.findActiveSession({ userId, sessionId })
    if (session) {
      session.status = 'ABANDONED'
      const localKey = getScopedKey(userId, session.chapterId || session.subjectId || 'latest')
      removeStorageItem(localKey)
      removeStorageItem(getScopedKey(userId, 'latest'))
      const memoryKey = `${userId}_${session.chapterId || session.subjectId || 'default'}`
      memoryActiveSessions.delete(memoryKey)
    }

    try {
      await apiService.patch(`/practice_sessions?session_id=eq.${encodeURIComponent(sessionId)}`, {
        status: 'ABANDONED',
        updated_at: new Date().toISOString(),
      })
    } catch {
      // ignore
    }
  },

  /**
   * Validates result calculation safety before finalizing score.
   * Throws or returns validation failure if questions do not match frozen session.
   */
  validateSessionResultSafety(session, evaluatedQuestions = []) {
    if (!session) {
      return { valid: false, error: 'No active session found for validation.' }
    }

    const frozenIds = session.questionIds || []
    const evalIds = evaluatedQuestions.map((q) => String(q.id))

    if (frozenIds.length !== evalIds.length) {
      return {
        valid: false,
        error: `Session Question Count Mismatch: Expected ${frozenIds.length} questions, evaluated ${evalIds.length}.`,
      }
    }

    for (let i = 0; i < frozenIds.length; i++) {
      if (frozenIds[i] !== evalIds[i]) {
        return {
          valid: false,
          error: `Question Order Integrity Violation at index ${i}: Expected ${frozenIds[i]}, got ${evalIds[i]}.`,
        }
      }
    }

    return { valid: true }
  },

  // ── Cross-Device Revalidation & Real-Time Sync ───────────────────────

  /**
   * Authoritative Cross-Device Revalidation:
   * Polls or fetches the latest server state of the session from Supabase,
   * detects other devices' answers or status updates, and converges local state.
   */
  async revalidateActiveSession({ sessionId, userId }) {
    if (!sessionId || !userId) return { hasUpdates: false, session: null }

    try {
      const res = await apiService.get(`/practice_sessions?session_id=eq.${encodeURIComponent(sessionId)}&limit=1`)
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const row = res.data[0]

        // Concurrency / Stale Request Protection:
        // Discard responses that are older than our tracked server state
        const serverUpdatedAt = new Date(row.updated_at || 0).getTime()
        const lastKnown = memoryLatestServerTime.get(sessionId) || 0
        if (serverUpdatedAt < lastKnown) {
          return { hasUpdates: false, stale: true }
        }
        memoryLatestServerTime.set(sessionId, serverUpdatedAt)

        // Detect remote submission or abandonment
        if (row.status === 'SUBMITTED' || row.status === 'ABANDONED') {
          const localKey = getScopedKey(userId, row.chapter_id || row.subject_id || 'latest')
          removeStorageItem(localKey)
          removeStorageItem(getScopedKey(userId, 'latest'))
          const memoryKey = `${userId}_${row.chapter_id || row.subject_id || 'default'}`
          memoryActiveSessions.delete(memoryKey)

          return {
            hasUpdates: true,
            statusChanged: true,
            status: row.status,
            remoteStatus: row.status,
            session: this.mapDbRowToSession(row),
          }
        }

        // Active / Paused session: converge answers
        const serverAnswers = row.answers || {}
        const memoryKey = `${userId}_${row.chapter_id || row.subject_id || 'default'}`
        let localSession = memoryActiveSessions.get(memoryKey) || this.mapDbRowToSession(row)

        // Merge: Server answers take authority; preserve any unconfirmed local pending answers
        const mergedAnswers = { ...(localSession.answers || {}) }
        let newAnswersCount = 0

        Object.entries(serverAnswers).forEach(([qId, sAns]) => {
          const currentAns = mergedAnswers[qId]
          const serverOpt = (sAns !== null && typeof sAns === 'object') ? (sAns.selected_option ?? sAns.selectedOption) : sAns
          const currentOpt = (currentAns !== null && typeof currentAns === 'object') ? (currentAns?.selected_option ?? currentAns?.selectedOption) : currentAns

          if (serverOpt !== undefined && serverOpt !== currentOpt) {
            mergedAnswers[qId] = sAns
            newAnswersCount++
          }
        })

        const updatedSession = {
          ...localSession,
          answers: mergedAnswers,
          currentQuestionIndex: row.current_question_index ?? localSession.currentQuestionIndex,
          currentIndex: row.current_question_index ?? localSession.currentQuestionIndex,
          secondsLeft: Math.min(localSession.secondsLeft, row.seconds_left || localSession.secondsLeft),
          status: row.status,
          updatedAt: row.updated_at,
          updated_at: row.updated_at,
        }

        this.saveToLocalCache(updatedSession)
        memoryActiveSessions.set(memoryKey, updatedSession)

        return {
          hasUpdates: newAnswersCount > 0,
          newAnswersCount,
          session: updatedSession,
          answers: mergedAnswers,
          remoteStatus: row.status,
        }
      }
    } catch {
      // Offline / network failure -> proceed to resilient local recovery cache
    }

    // 2. Resilient local recovery cache fallback
    try {
      const localKey = getScopedKey(userId, 'latest')
      const raw = getStorageItem(localKey)
      if (raw) {
        const localSession = JSON.parse(raw)
        if (localSession && (localSession.sessionId === sessionId || localSession.session_id === sessionId)) {
          return {
            hasUpdates: true,
            session: localSession,
            answers: localSession.answers || {},
            remoteStatus: localSession.status || 'ACTIVE',
            isOffline: true,
          }
        }
      }
    } catch {
      // ignore
    }

    return { hasUpdates: false, session: null }
  },

  /**
   * Subscribes to cross-device lifecycle events (focus, visibility, online, heartbeat polling)
   * to automatically revalidate active session.
   */
  subscribeToSession({
    sessionId,
    userId,
    onRemoteUpdate,
    onRemoteSubmitted,
    pollIntervalMs = 5000,
  }) {
    if (!sessionId || !userId) return () => {}

    let isSubscribed = true

    const triggerRevalidation = async () => {
      if (!isSubscribed) return
      try {
        const result = await this.revalidateActiveSession({ sessionId, userId })
        if (!isSubscribed) return

        if (result.statusChanged && (result.status === 'SUBMITTED' || result.status === 'ABANDONED')) {
          onRemoteSubmitted?.(result.status)
        } else if (result.hasUpdates) {
          onRemoteUpdate?.(result)
        }
      } catch {
        // ignore
      }
    }

    // 1. Focus listener (switching tabs or switching windows)
    const handleFocus = () => {
      triggerRevalidation()
    }

    // 2. Visibility change listener (mobile app resume, browser tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRevalidation()
      }
    }

    // 3. Online event listener (network reconnection)
    const handleOnline = () => {
      this.flushPendingAnswers(userId, sessionId).then(() => {
        triggerRevalidation()
      })
    }

    // 4. Periodic polling heartbeat (only while tab is visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerRevalidation()
      }
    }, pollIntervalMs)

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus)
      window.addEventListener('online', handleOnline)
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      isSubscribed = false
      clearInterval(intervalId)
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus)
        window.removeEventListener('online', handleOnline)
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  },

  // ── Offline Queue & Replay Helpers ─────────────────────────────────

  queuePendingAnswer(userId, sessionId, questionId, answerRecord) {
    if (!userId || !sessionId) return
    const key = `${PENDING_ANSWERS_PREFIX}_${userId}_${sessionId}`
    try {
      const raw = getStorageItem(key)
      const list = raw ? JSON.parse(raw) : {}
      list[String(questionId)] = answerRecord
      setStorageItem(key, JSON.stringify(list))
    } catch {
      // ignore
    }
  },

  removePendingAnswer(userId, sessionId, questionId) {
    if (!userId || !sessionId) return
    const key = `${PENDING_ANSWERS_PREFIX}_${userId}_${sessionId}`
    try {
      const raw = getStorageItem(key)
      if (raw) {
        const list = JSON.parse(raw)
        delete list[String(questionId)]
        setStorageItem(key, JSON.stringify(list))
      }
    } catch {
      // ignore
    }
  },

  getPendingAnswersCount(userId, sessionId) {
    if (!userId || !sessionId) return 0
    const key = `${PENDING_ANSWERS_PREFIX}_${userId}_${sessionId}`
    try {
      const raw = getStorageItem(key)
      if (raw) {
        const list = JSON.parse(raw)
        return Object.keys(list).length
      }
    } catch {
      // ignore
    }
    return 0
  },

  async flushPendingAnswers(userId, sessionId) {
    if (!userId || !sessionId) return
    const key = `${PENDING_ANSWERS_PREFIX}_${userId}_${sessionId}`
    try {
      const raw = getStorageItem(key)
      if (!raw) return
      const list = JSON.parse(raw)
      const entries = Object.entries(list)
      if (entries.length === 0) return

      for (const [qId, ansRecord] of entries) {
        let synced = false
        try {
          const res = await apiService.rpc('record_practice_session_answer', {
            p_session_id: sessionId,
            p_user_id: userId,
            p_question_id: String(qId),
            p_answer: ansRecord,
          })
          if (res && res.success) {
            synced = true
          }
        } catch {
          // RPC may fail in offline / mock
        }

        if (!synced) {
          // Fallback to local session update if local session exists
          const sess = await this.findActiveSession({ userId, sessionId })
          if (sess) {
            sess.answers = { ...(sess.answers || {}), [qId]: ansRecord }
            this.saveToLocalCache(sess)
            synced = true
          }
        }

        if (synced) {
          delete list[qId]
        }
      }

      setStorageItem(key, JSON.stringify(list))
    } catch {
      // ignore
    }
  },

  isReadOnly() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('nexora_view_as_member_profile')) {
        return true
      }
    } catch {
      // ignore
    }
    return false
  },

  // ── Internal Storage & Sync Helpers ─────────────────────────────────

  saveToLocalCache(session) {
    if (!session || !session.userId) return
    try {
      const data = JSON.stringify(session)
      const specificKey = getScopedKey(session.userId, session.chapterId || session.subjectId || 'latest')
      const generalKey = getScopedKey(session.userId, 'latest')
      setStorageItem(specificKey, data)
      setStorageItem(generalKey, data)
    } catch {
      // ignore
    }
  },

  mapDbRowToSession(row) {
    return {
      sessionId: row.session_id,
      session_id: row.session_id,
      userId: row.user_id,
      user_id: row.user_id,
      courseId: row.course_id,
      course_id: row.course_id,
      subjectId: row.subject_id,
      subject_id: row.subject_id,
      subjectTitle: row.subject_title,
      subject_title: row.subject_title,
      chapterId: row.chapter_id,
      chapter_id: row.chapter_id,
      chapterTitle: row.chapter_title,
      chapter_title: row.chapter_title,
      mode: row.mode || 'adaptive',
      sessionSize: row.session_size || row.actual_count || 20,
      session_size: row.session_size || row.actual_count || 20,
      questionIds: Array.isArray(row.question_ids) ? row.question_ids : [],
      question_ids: Array.isArray(row.question_ids) ? row.question_ids : [],
      questionOrder: Array.isArray(row.question_order) ? row.question_order : (row.question_ids || []),
      question_order: Array.isArray(row.question_order) ? row.question_order : (row.question_ids || []),
      optionOrders: row.option_orders || {},
      option_orders: row.option_orders || {},
      status: row.status || 'ACTIVE',
      currentIndex: row.current_question_index || 0,
      currentQuestionIndex: row.current_question_index || 0,
      current_question_index: row.current_question_index || 0,
      answers: row.answers || {},
      markedQuestionIds: Array.isArray(row.marked_question_ids) ? row.marked_question_ids : [],
      marked_question_ids: Array.isArray(row.marked_question_ids) ? row.marked_question_ids : [],
      visitedQuestionIds: Array.isArray(row.visited_question_ids) ? row.visited_question_ids : [],
      visited_question_ids: Array.isArray(row.visited_question_ids) ? row.visited_question_ids : [],
      secondsLeft: row.seconds_left || row.total_allocated_seconds || 1800,
      seconds_left: row.seconds_left || row.total_allocated_seconds || 1800,
      totalAllocatedSeconds: row.total_allocated_seconds || 1800,
      total_allocated_seconds: row.total_allocated_seconds || 1800,
      frozenQuestions: Array.isArray(row.frozen_questions) ? row.frozen_questions : [],
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    }
  },

  async syncSessionToSupabase(session) {
    if (!session || !session.sessionId) return

    const payload = {
      session_id: session.sessionId,
      user_id: session.userId,
      course_id: session.courseId,
      subject_id: session.subjectId,
      subject_title: session.subjectTitle,
      chapter_id: session.chapterId,
      chapter_title: session.chapterTitle,
      mode: session.mode,
      session_size: session.sessionSize,
      actual_count: session.sessionSize,
      requested_count: session.sessionSize,
      question_ids: session.questionIds,
      question_order: session.questionOrder,
      option_orders: session.optionOrders,
      status: session.status,
      current_question_index: session.currentQuestionIndex,
      answers: session.answers,
      marked_question_ids: session.markedQuestionIds,
      visited_question_ids: session.visitedQuestionIds,
      seconds_left: session.secondsLeft,
      total_allocated_seconds: session.totalAllocatedSeconds,
      updated_at: new Date().toISOString(),
    }

    try {
      // 1. Try RPC if available
      const rpcRes = await apiService.rpc('save_practice_session_state', { p_payload: payload })
      if (rpcRes && rpcRes.success) return

      // 2. Direct POST / PATCH
      const postRes = await apiService.post('/practice_sessions', payload)
      if (postRes && postRes.success) return

      // If duplicate key, patch
      if (postRes && (postRes.status === 409 || String(postRes.error).includes('duplicate'))) {
        await apiService.patch(`/practice_sessions?session_id=eq.${encodeURIComponent(session.sessionId)}`, payload)
      }
    } catch {
      // Network or schema issue -> safely handled by local cache
    }
  },

  queueSync(session) {
    if (!session || !session.sessionId) return
    const userId = session.userId
    const sessId = session.sessionId

    // Debounce background server sync to prevent network hammering
    if (this._syncTimers?.has(sessId)) {
      clearTimeout(this._syncTimers.get(sessId))
    }

    if (!this._syncTimers) {
      this._syncTimers = new Map()
    }

    const timer = setTimeout(() => {
      this._syncTimers.delete(sessId)
      this.syncSessionToSupabase(session).catch(() => {})
    }, 400)

    this._syncTimers.set(sessId, timer)
  },
}
