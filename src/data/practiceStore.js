/**
 * practiceStore
 * Local/mock store powering the Practice Hub.
 *
 * Tracks practice sessions (attempts), recommendations, weak topics,
 * quick actions and daily stats. Uses the same useSyncExternalStore
 * pattern as academicStore so a future backend swap only replaces
 * this data source — no UI redesign.
 *
 * Future backend-ready fields:
 *   session.attemptId   → resume by attempt ID
 *   session.resumeIndex → resume from last answered question
 *   session.offlineSync → offline progress sync flag
 */
import { useSyncExternalStore } from 'react'

let listeners = []
let version = 0

function emit() {
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot() {
  return version
}

export function usePracticeStore() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    sessions,
    recommendations,
    weakTopics,
    quickActions,
    stats,
    historyFilters,
  }
}

/** Non-hook getters for event handlers / non-React modules. */
export function getSessions() {
  return sessions
}

export function getStats() {
  return stats
}

// ── Seed sessions ──────────────────────────────────────────────────
// Statuses: new | in-progress | completed | paused | locked | failed | mastered
const now = Date.now()
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const sessions = [
  {
    id: 'sess-001',
    attemptId: 'at-001',
    subjectKey: 'computer-networks',
    subjectTitle: 'Computer Networks',
    icon: 'computerNetworks',
    chapterId: 'bpsc-c11-cn-3',
    chapterName: 'Routing Algorithms',
    type: 'mcq',
    status: 'in-progress',
    progress: 74,
    currentQuestion: 15,
    totalQuestions: 20,
    answered: 14,
    accuracy: 64,
    score: '14/20',
    timeTaken: '14m 30s',
    estRemaining: '6 min',
    lastPracticed: now - 3 * HOUR,
    lastAttempt: '3h ago',
    date: 'Today',
  },
  {
    id: 'sess-002',
    attemptId: 'at-002',
    subjectKey: 'operating-systems',
    subjectTitle: 'Operating System',
    icon: 'operatingSystems',
    chapterId: 'bpsc-c12-os-1',
    chapterName: 'Process Management',
    type: 'mcq',
    status: 'completed',
    progress: 100,
    currentQuestion: 22,
    totalQuestions: 22,
    answered: 22,
    accuracy: 82,
    score: '18/22',
    timeTaken: '18m 05s',
    estRemaining: '0 min',
    lastPracticed: now - 6 * HOUR,
    lastAttempt: '6h ago',
    date: 'Today',
  },
  {
    id: 'sess-003',
    attemptId: 'at-003',
    subjectKey: 'dbms',
    subjectTitle: 'Database Management System',
    icon: 'dbms',
    chapterId: 'bpsc-c11-dbms-1',
    chapterName: 'SQL Fundamentals',
    type: 'mcq',
    status: 'completed',
    progress: 100,
    currentQuestion: 30,
    totalQuestions: 30,
    answered: 30,
    accuracy: 58,
    score: '17/30',
    timeTaken: '24m 40s',
    estRemaining: '0 min',
    lastPracticed: now - 1 * DAY,
    lastAttempt: '1d ago',
    date: 'Yesterday',
  },
  {
    id: 'sess-004',
    attemptId: 'at-004',
    subjectKey: 'computer-organization',
    subjectTitle: 'Computer Organization & Architecture',
    icon: 'computerOrganization',
    chapterId: 'bpsc-c12-coa-1',
    chapterName: 'Memory Hierarchy',
    type: 'revision',
    status: 'paused',
    progress: 42,
    currentQuestion: 8,
    totalQuestions: 14,
    answered: 6,
    accuracy: 50,
    score: '3/6',
    timeTaken: '9m 20s',
    estRemaining: '7 min',
    lastPracticed: now - 6 * DAY,
    lastAttempt: '6d ago',
    date: 'Aug 1',
  },
  {
    id: 'sess-005',
    attemptId: 'at-005',
    subjectKey: 'computer-networks',
    subjectTitle: 'Computer Networks',
    icon: 'computerNetworks',
    chapterId: 'bpsc-c11-cn-2',
    chapterName: 'OSI Model',
    type: 'flashcards',
    status: 'mastered',
    progress: 100,
    currentQuestion: 18,
    totalQuestions: 18,
    answered: 18,
    accuracy: 94,
    score: '17/18',
    timeTaken: '8m 12s',
    estRemaining: '0 min',
    lastPracticed: now - 2 * DAY,
    lastAttempt: '2d ago',
    date: 'Aug 4',
  },
  {
    id: 'sess-006',
    attemptId: 'at-006',
    subjectKey: 'dbms',
    subjectTitle: 'Database Management System',
    icon: 'dbms',
    chapterId: 'bpsc-c11-dbms-2',
    chapterName: 'Normalization',
    type: 'mcq',
    status: 'failed',
    progress: 100,
    currentQuestion: 8,
    totalQuestions: 8,
    answered: 8,
    accuracy: 37,
    score: '3/8',
    timeTaken: '7m 55s',
    estRemaining: '0 min',
    lastPracticed: now - 3 * DAY,
    lastAttempt: '3d ago',
    date: 'Aug 3',
  },
  {
    id: 'sess-007',
    attemptId: 'at-007',
    subjectKey: 'digital-electronics',
    subjectTitle: 'Digital Electronics',
    icon: 'digitalElectronics',
    chapterId: 'de-1',
    chapterName: 'Number Systems',
    type: 'mock',
    status: 'completed',
    progress: 100,
    currentQuestion: 50,
    totalQuestions: 50,
    answered: 50,
    accuracy: 66,
    score: '33/50',
    timeTaken: '42m 10s',
    estRemaining: '0 min',
    lastPracticed: now - 4 * DAY,
    lastAttempt: '4d ago',
    date: 'Aug 2',
  },
]

// ── Recommendations ────────────────────────────────────────────────
// reason, insight, cta, subjectKey, accent
const recommendations = [
  {
    id: 'rec-001',
    title: 'COA revision due',
    insight: "You haven't revised COA for 6 days.",
    cta: 'Practice Now',
    subjectKey: 'computer-organization',
    icon: 'computerOrganization',
    tone: 'orange',
  },
  {
    id: 'rec-002',
    title: 'DBMS accuracy dropped',
    insight: 'Accuracy in DBMS dropped recently to 58%.',
    cta: 'Revise Today',
    subjectKey: 'dbms',
    icon: 'dbms',
    tone: 'red',
  },
  {
    id: 'rec-003',
    title: 'Networking revision due',
    insight: 'Spaced repetition says revise OSI Model today.',
    cta: 'Continue',
    subjectKey: 'computer-networks',
    icon: 'computerNetworks',
    tone: 'blue',
  },
]

// ── Weak topics ────────────────────────────────────────────────────
// subject, chapter, accuracy, improvement opportunity, readiness gain
const weakTopics = [
  {
    id: 'wt-001',
    subjectKey: 'computer-networks',
    subjectTitle: 'Computer Networks',
    chapterName: 'Routing Algorithms',
    accuracy: 42,
    opportunity: '+18% expected',
    readinessGain: '+12%',
    tone: 'red',
  },
  {
    id: 'wt-002',
    subjectKey: 'dbms',
    subjectTitle: 'DBMS',
    chapterName: 'Normalization',
    accuracy: 37,
    opportunity: '+24% expected',
    readinessGain: '+15%',
    tone: 'orange',
  },
  {
    id: 'wt-003',
    subjectKey: 'computer-organization',
    subjectTitle: 'COA',
    chapterName: 'Memory Hierarchy',
    accuracy: 50,
    opportunity: '+14% expected',
    readinessGain: '+9%',
    tone: 'purple',
  },
]

// ── Quick actions ──────────────────────────────────────────────────
const quickActions = [
  { id: 'qa-1', label: 'Random Practice', icon: 'quiz', tone: 'orange', desc: 'Mixed MCQs' },
  { id: 'qa-2', label: 'Weak Topics', icon: 'target', tone: 'red', desc: 'Focus areas' },
  { id: 'qa-3', label: 'Revision Practice', icon: 'refresh', tone: 'blue', desc: 'Due reviews' },
  { id: 'qa-4', label: 'Flashcards', icon: 'flashcards', tone: 'green', desc: 'Quick cards' },
  { id: 'qa-5', label: 'Mock Test', icon: 'mockTests', tone: 'purple', desc: 'Full length' },
  { id: 'qa-6', label: 'Bookmarks', icon: 'bookmark', tone: 'teal', desc: 'Saved questions' },
]

// ── Stats ──────────────────────────────────────────────────────────
// Lightweight stat cards — no heavy charts.
const stats = {
  todayQuestions: 42,
  todayTarget: 120,
  accuracy: 74,
  accuracyDelta: '+6%',
  studyTime: '2h 15m',
  streak: 14,
  weeklyProgress: 68,
  weeklyGoal: 80,
}

// ── History filters (mirrors future backend query params) ──────────
const historyFilters = {
  subjects: ['All Subjects', 'C++ Programming and OOP', 'Computer Networks', 'Operating System', 'DBMS', 'COA', 'Digital Electronics'],
  types: ['All Types', 'MCQ', 'Flashcards', 'Revision', 'Mock'],
  statuses: ['All Statuses', 'Completed', 'In Progress', 'Paused', 'Failed', 'Mastered', 'Locked'],
  periods: ['All Time', 'Today', 'This Week', 'This Month'],
  sortBy: ['Newest', 'Oldest', 'Accuracy', 'Score'],
}

// ── Mutators (no-op for now; replaced by API calls later) ──────────
export function resumeSession(sessionId) {
  // FUTURE: GET /api/practice/sessions/:id → returns attempt + resumeIndex
  return sessions.find((s) => s.id === sessionId) || null
}

export function startPractice({ subjectKey, chapterId, type = 'mcq' }) {
  // FUTURE: POST /api/practice/sessions { subjectKey, chapterId, type }
  const session = {
    id: `sess-${Date.now()}`,
    attemptId: `at-${Date.now()}`,
    subjectKey,
    chapterId,
    type,
    status: 'in-progress',
    progress: 0,
    currentQuestion: 1,
    totalQuestions: 20,
    answered: 0,
    accuracy: 0,
    score: '0/0',
    timeTaken: '0m 00s',
    estRemaining: '15 min',
    lastPracticed: Date.now(),
    lastAttempt: 'Now',
    date: 'Today',
  }
  sessions.unshift(session)
  emit()
  return session
}

export function completeSession(sessionId) {
  const session = sessions.find((s) => s.id === sessionId)
  if (session) {
    session.status = 'completed'
    session.progress = 100
    session.answered = session.totalQuestions
    emit()
  }
  return session
}