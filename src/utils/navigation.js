/**
 * navigation.js
 * Minimal hash-based router helpers + persistent test session store.
 *
 * Keeps browser back/forward working without adding a router dependency.
 * Routes:
 *   #/                                     → dashboard
 *   #/subjects                             → subjects
 *   #/subject/:key                         → subject detail
 *   #/subject/:key/mcq                     → MCQ practice
 *   #/subject/:key/chapter/:chapterId/mcq  → MCQ practice for specific chapter
 *   #/subject/:key/review                  → MCQ review (restores last test session)
 *   #/subject/:key/chapter/:chapterId/review → MCQ review for specific chapter
 *   #/subject/:key/results                 → test results
 *   #/subject/:key/chapter/:chapterId/results → test results for specific chapter
 *   #/practice                             → practice hub
 *   #/notes                                → notes hub
 *   #/admin                                → admin
 */

export function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return raw.split('/').filter(Boolean)
}

export function navigate(path) {
  window.location.hash = `/${path.replace(/^\/+/, '')}`
}

function getActiveUserId() {
  try {
    if (typeof localStorage !== 'undefined') {
      const viewAs = localStorage.getItem('nexora_view_as_member_profile')
      if (viewAs) {
        const parsed = JSON.parse(viewAs)
        if (parsed?.id) return parsed.id
      }
      const prof = localStorage.getItem('nexora_active_member_profile')
      if (prof) {
        const parsed = JSON.parse(prof)
        if (parsed?.id) return parsed.id
      }
      const uid = localStorage.getItem('nexora_user_id')
      if (uid) return uid
    }
  } catch {
    // ignore
  }
  return 'usr_super_admin_alpha'
}

function getSessionKey(userId = null) {
  const uid = userId || getActiveUserId()
  return `nexora_active_test_session_${uid || 'anon'}`
}

function loadSavedSession(userId = null) {
  try {
    const key = getSessionKey(userId)
    const raw = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null) ||
                (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        subjectKey: parsed.subjectKey || null,
        chapter: parsed.chapter || null,
        answers: parsed.answers || {},
        marked: new Set(parsed.marked || []),
        visited: new Set(parsed.visited || [0]),
        mode: parsed.mode || 'practice',
        result: parsed.result || null,
        timeTakenSeconds: parsed.timeTakenSeconds || 0,
        attemptHistoryData: parsed.attemptHistoryData || [],
        questions: parsed.questions || null,
      }
    }
  } catch {
    // ignore
  }
  return null
}

const saved = loadSavedSession()

/**
 * In-memory & session-persisted session for the active MCQ test so "Review Answers"
 * and browser refresh restore the exact chapter, answers, and visited state.
 */
export const testSession = {
  subjectKey: saved?.subjectKey || null,
  chapter: saved?.chapter || null,
  answers: saved?.answers || {},
  marked: saved?.marked || new Set(),
  visited: saved?.visited || new Set([0]),
  mode: saved?.mode || 'practice', // 'practice' | 'review'
  result: saved?.result || null,
  timeTakenSeconds: saved?.timeTakenSeconds || 0,
  attemptHistoryData: saved?.attemptHistoryData || [],
  questions: saved?.questions || null,

  loadForUser(userId = null) {
    const loaded = loadSavedSession(userId)
    this.subjectKey = loaded?.subjectKey || null
    this.chapter = loaded?.chapter || null
    this.answers = loaded?.answers || {}
    this.marked = loaded?.marked || new Set()
    this.visited = loaded?.visited || new Set([0])
    this.mode = loaded?.mode || 'practice'
    this.result = loaded?.result || null
    this.timeTakenSeconds = loaded?.timeTakenSeconds || 0
    this.attemptHistoryData = loaded?.attemptHistoryData || []
    this.questions = loaded?.questions || null
    return this
  },

  save(userId = null) {
    try {
      const key = getSessionKey(userId)
      const data = JSON.stringify({
        subjectKey: this.subjectKey,
        chapter: this.chapter,
        answers: this.answers,
        marked: Array.from(this.marked),
        visited: Array.from(this.visited),
        mode: this.mode,
        result: this.result,
        timeTakenSeconds: this.timeTakenSeconds,
        attemptHistoryData: this.attemptHistoryData,
        questions: this.questions,
      })
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, data)
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, data)
      }
    } catch {
      // ignore
    }
  },

  reset(userId = null) {
    const key = getSessionKey(userId)
    this.subjectKey = null
    this.chapter = null
    this.answers = {}
    this.marked = new Set()
    this.visited = new Set([0])
    this.mode = 'practice'
    this.result = null
    this.questions = null
    this.timeTakenSeconds = 0
    this.attemptHistoryData = []
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key)
        sessionStorage.removeItem('nexora_active_test_session')
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
        localStorage.removeItem('nexora_active_test_session')
      }
    } catch {
      // ignore
    }
  },
}

/**
 * Preserves the active tab per subject so returning from MCQ practice
 * (or any navigation) does not reset the user's selected tab.
 */
export const subjectTabs = {}