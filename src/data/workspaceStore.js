/**
 * workspaceStore
 * Complete Course Management System — the single source of truth for
 * Nexora's multi-course LMS architecture.
 *
 * A Course is NOT just a name. Each Course represents one complete and
 * independent learning ecosystem with its own isolated containers:
 *
 *   Course
 *   ├── Subjects Collection
 *   ├── Chapters Collection
 *   ├── MCQ Repository
 *   ├── Flashcard Repository
 *   ├── Notes Repository
 *   ├── Practice Repository
 *   ├── Mock Test Repository
 *   ├── Analytics Container
 *   ├── Student Progress Container
 *   ├── Bookmarks Container
 *   ├── Downloads Container
 *   ├── AI Study Plan Container
 *   ├── Content Health Container
 *   ├── Course Settings
 *   ├── Theme Configuration
 *   ├── Course Metadata
 *   └── Audit Information
 *
 * Nothing is shared between Courses unless explicitly duplicated.
 * Every entity references its parent using stable IDs so Supabase
 * integration later only requires replacing this data source.
 */
import { useSyncExternalStore } from 'react'

let listeners = []
let version = 0

// ── Bootstrap Engine ──────────────────────────────────────────────
// Creates a fully isolated Course Workspace with all containers
// pre-initialized. The administrator never manually creates the
// basic structure — it is generated automatically.
function bootstrapCourse({ name, icon, themeColor, description, status }) {
  const now = today()
  return {
    id: nextId('course'),
    name: name || 'New Course',
    icon: icon || 'adminDashboard',
    themeColor: themeColor || '#F1621B',
    description: description || '',
    status: status || 'draft',
    published: false,
    version: 'v1.0',
    createdAt: now,
    lastUpdated: now,
    order: 0,

    // ── Isolated Collections (empty by default) ──────────────────
    subjects: [],          // Subject Collection
    chapters: [],          // Chapters Collection
    mcqs: [],              // MCQ Repository
    flashcards: [],        // Flashcard Repository
    notes: [],             // Notes Repository
    practice: [],          // Practice Repository
    mockTests: [],         // Mock Test Repository

    // ── Containers ───────────────────────────────────────────────
    analytics: {           // Analytics Container
      totalAttempts: 0,
      avgAccuracy: 0,
      weeklyProgress: 0,
      trend: [],
    },
    studentProgress: {     // Student Progress Container
      enrolled: 0,
      active: 0,
      completionRate: 0,
    },
    bookmarks: [],         // Bookmarks Container
    downloads: [],         // Downloads Container
    aiStudyPlan: {         // AI Study Plan Container
      generated: false,
      plan: null,
    },
    contentHealth: {       // Content Health Container
      score: 0,
      issues: [],
      lastChecked: now,
    },

    // ── Configuration ────────────────────────────────────────────
    settings: {            // Course Settings
      allowDownloads: true,
      allowBookmarks: true,
      showLeaderboard: false,
      requireEnrollment: false,
    },
    theme: {               // Theme Configuration
      primaryColor: themeColor || '#F1621B',
      darkMode: true,
    },
    metadata: {            // Course Metadata
      subjects: 0,
      chapters: 0,
      mcqs: 0,
      flashcards: 0,
      notes: 0,
      completion: 0,
      health: 0,
    },
    audit: {               // Audit Information
      createdBy: 'admin',
      lastModifiedBy: 'admin',
      revision: 1,
    },
  }
}

// ── Seed data ─────────────────────────────────────────────────────
let workspaces = [
  {
    id: 'bpsc-tre-4',
    name: 'BPSC TRE 4.0 – Computer Science',
    icon: 'adminDashboard',
    themeColor: '#F1621B',
    description: 'Bihar Public Service Commission Teacher Recruitment Exam 4.0',
    status: 'active',
    published: true,
    version: 'v2.3',
    createdAt: '2026-07-01',
    lastUpdated: '2026-08-06',
    order: 1,
    subjects: [],
    chapters: [],
    mcqs: [],
    flashcards: [],
    notes: [],
    practice: [],
    mockTests: [],
    analytics: { totalAttempts: 128, avgAccuracy: 72, weeklyProgress: 18, trend: [60, 65, 68, 70, 72, 71, 74] },
    studentProgress: { enrolled: 45, active: 32, completionRate: 72 },
    bookmarks: [],
    downloads: [],
    aiStudyPlan: { generated: true, plan: { focus: 'COA', dailyTarget: 120 } },
    contentHealth: { score: 85, issues: [], lastChecked: '2026-08-06' },
    settings: { allowDownloads: true, allowBookmarks: true, showLeaderboard: false, requireEnrollment: false },
    theme: { primaryColor: '#F1621B', darkMode: true },
    metadata: { subjects: 4, chapters: 7, mcqs: 120, flashcards: 80, notes: 8, completion: 72, health: 85 },
    audit: { createdBy: 'admin', lastModifiedBy: 'admin', revision: 12 },
  },
  {
    id: 'cbse-12-cs',
    name: 'CBSE Class 12 – Computer Science',
    icon: 'computer',
    themeColor: '#2E5CE6',
    description: 'Central Board of Secondary Education Class 12 Computer Science',
    status: 'active',
    published: true,
    version: 'v1.8',
    createdAt: '2026-07-15',
    lastUpdated: '2026-08-03',
    order: 2,
    subjects: [],
    chapters: [],
    mcqs: [],
    flashcards: [],
    notes: [],
    practice: [],
    mockTests: [],
    analytics: { totalAttempts: 86, avgAccuracy: 65, weeklyProgress: 12, trend: [50, 55, 58, 60, 62, 64, 65] },
    studentProgress: { enrolled: 28, active: 19, completionRate: 45 },
    bookmarks: [],
    downloads: [],
    aiStudyPlan: { generated: true, plan: { focus: 'SQL', dailyTarget: 80 } },
    contentHealth: { score: 62, issues: ['No Notes in Normalization'], lastChecked: '2026-08-03' },
    settings: { allowDownloads: true, allowBookmarks: true, showLeaderboard: false, requireEnrollment: false },
    theme: { primaryColor: '#2E5CE6', darkMode: true },
    metadata: { subjects: 3, chapters: 12, mcqs: 200, flashcards: 150, notes: 15, completion: 45, health: 62 },
    audit: { createdBy: 'admin', lastModifiedBy: 'admin', revision: 8 },
  },
  {
    id: 'cbse-11-ph',
    name: 'CBSE Class 11 – Physics',
    icon: 'physics',
    themeColor: '#7C3AED',
    description: 'Central Board of Secondary Education Class 11 Physics',
    status: 'draft',
    published: false,
    version: 'v1.0',
    createdAt: '2026-07-20',
    lastUpdated: '2026-07-28',
    order: 3,
    subjects: [],
    chapters: [],
    mcqs: [],
    flashcards: [],
    notes: [],
    practice: [],
    mockTests: [],
    analytics: { totalAttempts: 0, avgAccuracy: 0, weeklyProgress: 0, trend: [] },
    studentProgress: { enrolled: 0, active: 0, completionRate: 0 },
    bookmarks: [],
    downloads: [],
    aiStudyPlan: { generated: false, plan: null },
    contentHealth: { score: 35, issues: ['No MCQs', 'No Flashcards', 'No Notes'], lastChecked: '2026-07-28' },
    settings: { allowDownloads: true, allowBookmarks: true, showLeaderboard: false, requireEnrollment: false },
    theme: { primaryColor: '#7C3AED', darkMode: true },
    metadata: { subjects: 1, chapters: 5, mcqs: 60, flashcards: 40, notes: 3, completion: 18, health: 35 },
    audit: { createdBy: 'admin', lastModifiedBy: 'admin', revision: 3 },
  },
  {
    id: 'ssc-cgl-computer',
    name: 'SSC CGL – Computer',
    icon: 'computerNetworks',
    themeColor: '#12B76A',
    description: 'Staff Selection Commission Combined Graduate Level – Computer Section',
    status: 'archived',
    published: false,
    version: 'v1.2',
    createdAt: '2026-06-10',
    lastUpdated: '2026-07-05',
    order: 4,
    subjects: [],
    chapters: [],
    mcqs: [],
    flashcards: [],
    notes: [],
    practice: [],
    mockTests: [],
    analytics: { totalAttempts: 42, avgAccuracy: 58, weeklyProgress: 0, trend: [50, 52, 55, 58] },
    studentProgress: { enrolled: 15, active: 0, completionRate: 30 },
    bookmarks: [],
    downloads: [],
    aiStudyPlan: { generated: false, plan: null },
    contentHealth: { score: 48, issues: ['No Notes'], lastChecked: '2026-07-05' },
    settings: { allowDownloads: true, allowBookmarks: true, showLeaderboard: false, requireEnrollment: false },
    theme: { primaryColor: '#12B76A', darkMode: true },
    metadata: { subjects: 2, chapters: 8, mcqs: 90, flashcards: 55, notes: 5, completion: 30, health: 48 },
    audit: { createdBy: 'admin', lastModifiedBy: 'admin', revision: 5 },
  },
]

// ── Active course placeholder (Sprint 2) ──────────────────────────
// UI-only placeholder. Sprint 2 will enable global switching without
// refactoring — just set this value from the Course Selector.
// Persisted to localStorage so the last selected Course is restored
// automatically when the application is refreshed.
const STORAGE_KEY = 'nexora-active-course'
let activeWorkspaceId = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved || 'bpsc-tre-4'
  } catch {
    return 'bpsc-tre-4'
  }
})()

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
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

export function useWorkspaceStore() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { workspaces, activeWorkspaceId }
}

/** Non-hook getter for the current workspaces array (for utils, event handlers). */
export function getWorkspaces() {
  return workspaces
}

/** Non-hook getter for the active workspace id. */
export function getActiveWorkspaceId() {
  return activeWorkspaceId
}

/** Non-hook subscribe for external stores. */
export { subscribe, getSnapshot }

// ── Helpers ───────────────────────────────────────────────────────
function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function findWorkspace(id) {
  return workspaces.find((w) => w.id === id)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ── Course CRUD ───────────────────────────────────────────────────
// Bootstrap Engine: creating a Course automatically generates an
// entire isolated Course Workspace with all containers initialized.
export function createWorkspace({ name, icon, themeColor, description, status }) {
  const course = bootstrapCourse({ name, icon, themeColor, description, status })
  course.order = workspaces.length + 1
  workspaces = [...workspaces, course]
  emit()
  return course
}

export function updateWorkspace(id, patch) {
  workspaces = workspaces.map((w) =>
    w.id === id
      ? {
          ...w,
          ...patch,
          lastUpdated: today(),
          audit: { ...w.audit, lastModifiedBy: 'admin', revision: (w.audit?.revision || 1) + 1 },
        }
      : w,
  )
  emit()
}

export function renameWorkspace(id, name) {
  updateWorkspace(id, { name })
}

export function editWorkspace(id, { name, icon, themeColor, description, status }) {
  updateWorkspace(id, {
    ...(name !== undefined ? { name } : {}),
    ...(icon !== undefined ? { icon } : {}),
    ...(themeColor !== undefined ? { themeColor, theme: { primaryColor: themeColor } } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(status !== undefined ? { status } : {}),
  })
}

export function duplicateWorkspace(id) {
  const target = findWorkspace(id)
  if (!target) return
  const copy = JSON.parse(JSON.stringify(target))
  copy.id = nextId('course')
  copy.name = `${target.name} (Copy)`
  copy.status = 'draft'
  copy.published = false
  copy.version = 'v1.0'
  copy.createdAt = today()
  copy.lastUpdated = today()
  copy.order = workspaces.length + 1
  copy.audit = { createdBy: 'admin', lastModifiedBy: 'admin', revision: 1 }
  workspaces = [...workspaces, copy]
  emit()
  return copy
}

export function archiveWorkspace(id) {
  updateWorkspace(id, { status: 'archived', published: false })
}

export function activateWorkspace(id) {
  updateWorkspace(id, { status: 'active' })
}

export function deactivateWorkspace(id) {
  updateWorkspace(id, { status: 'inactive' })
}

export function publishWorkspace(id) {
  updateWorkspace(id, { published: true, status: 'active' })
}

export function unpublishWorkspace(id) {
  updateWorkspace(id, { published: false })
}

export function makePrivateWorkspace(id) {
  updateWorkspace(id, { status: 'private' })
}

export function deleteWorkspace(id) {
  const target = findWorkspace(id)
  workspaces = workspaces.filter((w) => w.id !== id)
  if (activeWorkspaceId === id) {
    activeWorkspaceId = workspaces[0]?.id || null
  }
  emit()
  return { name: target?.name }
}

export function reorderWorkspaces(orderedIds) {
  workspaces = workspaces.map((w) => ({
    ...w,
    order: orderedIds.indexOf(w.id) + 1,
  }))
  emit()
}

// ── Active course (Sprint 2 placeholder) ──────────────────────────
export function setActiveWorkspace(id) {
  if (!findWorkspace(id)) return
  activeWorkspaceId = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // localStorage unavailable — ignore
  }
  emit()
}
