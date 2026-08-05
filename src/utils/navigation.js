/**
 * navigation.js
 * Minimal hash-based router helpers + in-memory test session store.
 *
 * Keeps browser back/forward working without adding a router dependency.
 * Routes:
 *   #/                     → dashboard
 *   #/subjects             → subjects
 *   #/subject/:key         → subject detail
 *   #/subject/:key/mcq     → MCQ practice
 *   #/subject/:key/review  → MCQ review (restores last test session)
 *   #/subject/:key/results → test results
 *   #/admin                → admin
 */

export function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return raw.split('/').filter(Boolean)
}

export function navigate(path) {
  window.location.hash = `/${path}`
}

/**
 * In-memory session for the active MCQ test so "Review Answers" can
 * restore the exact answers / marks / visited state without a backend.
 */
export const testSession = {
  subjectKey: null,
  chapter: null,
  answers: {},
  marked: new Set(),
  visited: new Set([0]),
  mode: 'practice', // 'practice' | 'review'
  reset() {
    this.subjectKey = null
    this.chapter = null
    this.answers = {}
    this.marked = new Set()
    this.visited = new Set([0])
    this.mode = 'practice'
  },
}

/**
 * Preserves the active tab per subject so returning from MCQ practice
 * (or any navigation) does not reset the user's selected tab.
 */
export const subjectTabs = {}