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

const SESSION_STORAGE_KEY = 'nexora_active_test_session'

function loadSavedSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
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
  questions: null,

  save() {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          subjectKey: this.subjectKey,
          chapter: this.chapter,
          answers: this.answers,
          marked: Array.from(this.marked),
          visited: Array.from(this.visited),
          mode: this.mode,
          result: this.result,
          timeTakenSeconds: this.timeTakenSeconds,
        })
      )
    } catch {
      // ignore
    }
  },

  reset() {
    this.subjectKey = null
    this.chapter = null
    this.answers = {}
    this.marked = new Set()
    this.visited = new Set([0])
    this.mode = 'practice'
    this.result = null
    this.questions = null
    this.timeTakenSeconds = 0
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
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