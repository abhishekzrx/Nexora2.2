/**
 * workspaceStore
 * Complete Centralized Course & Workspace Store — Single Source of Truth for
 * Nexora's Multi-Course LMS Architecture.
 *
 * Architecture:
 * - One authoritative store for Courses/Workspaces and activeWorkspaceId.
 * - Reactive subscriptions via useSyncExternalStore.
 * - Role-based course filtering and live derived metrics.
 * - Automatic state reconciliation on course creation, update, deletion, or active context change.
 * - localStorage is strictly used for startup persistence fallback, not reactive state.
 */

import { useSyncExternalStore } from 'react'
import { courseService } from '../services/courseService.js'

let listeners = []
let version = 0

// ── Bootstrap Engine ──────────────────────────────────────────────
function bootstrapCourse({ name, icon, themeColor, description, status, examProfile, level }) {
  const now = today()
  const courseStatus = status || 'active'
  const isPublished = courseStatus === 'draft' ? false : true
  const detectedProfile = examProfile || (name && name.toLowerCase().includes('bpsc') ? 'BPSC_PRELIMS' : 'GENERIC')

  return {
    id: nextId('course'),
    name: name || 'New Course',
    icon: icon || 'adminDashboard',
    themeColor: themeColor || '#F1621B',
    description: description || '',
    status: courseStatus,
    published: isPublished,
    examProfile: detectedProfile,
    level: level || (detectedProfile === 'BPSC_PRELIMS' ? 'Competitive Examination' : 'General'),
    version: 'v1.0',
    createdAt: now,
    lastUpdated: now,
    order: 0,

    subjects: [],
    chapters: [],
    mcqs: [],
    flashcards: [],
    notes: [],
    practice: [],
    mockTests: [],

    analytics: {
      totalAttempts: 0,
      avgAccuracy: 0,
      weeklyProgress: 0,
      trend: [50, 55, 60, 65, 70],
    },
    studentProgress: {
      enrolled: 1,
      active: 1,
      completionRate: 0,
    },
    bookmarks: [],
    downloads: [],
    aiStudyPlan: {
      generated: false,
      plan: null,
    },
    contentHealth: {
      score: 100,
      issues: [],
      lastChecked: now,
    },

    settings: {
      allowDownloads: true,
      allowBookmarks: true,
      showLeaderboard: false,
      requireEnrollment: false,
    },
    theme: {
      primaryColor: themeColor || '#F1621B',
      darkMode: true,
    },
    metadata: {
      subjects: 0,
      chapters: 0,
      mcqs: 0,
      flashcards: 0,
      notes: 0,
      completion: 0,
      health: 100,
    },
    audit: {
      createdBy: 'admin',
      lastModifiedBy: 'admin',
      revision: 1,
    },
  }
}

// ── Initial Seed Data (kept for development reference, not auto-loaded) ──
function getSeedWorkspaces() {
  return [
    {
      id: 'bpsc-tre-4',
      name: 'BPSC TRE 4.0 – Computer Science',
      icon: 'adminDashboard',
      themeColor: '#F1621B',
      description: 'Bihar Public Service Commission Teacher Recruitment Exam 4.0',
      status: 'active',
      published: true,
      examProfile: 'BPSC_PRELIMS',
      level: 'Competitive Examination',
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
      id: 'bpsc-prelims',
      name: 'BPSC PRE LIMS',
      icon: 'adminDashboard',
      themeColor: '#F1621B',
      description: 'Bihar Public Service Commission – Preliminary Examination',
      status: 'active',
      published: true,
      examProfile: 'BPSC_PRELIMS',
      level: 'Competitive Examination',
      version: 'v1.0',
      createdAt: '2026-08-23',
      lastUpdated: '2026-08-23',
      order: 2,
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
      contentHealth: { score: 100, issues: [], lastChecked: '2026-08-23' },
      settings: { allowDownloads: true, allowBookmarks: true, showLeaderboard: false, requireEnrollment: false },
      theme: { primaryColor: '#F1621B', darkMode: true },
      metadata: { subjects: 0, chapters: 0, mcqs: 0, flashcards: 0, notes: 0, completion: 0, health: 100 },
      audit: { createdBy: 'admin', lastModifiedBy: 'admin', revision: 1 },
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
      order: 3,
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
      published: true,
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
      status: 'active',
      published: true,
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
}

// ── State ──────────────────────────────────────────────────────
let workspaces = []
let activeWorkspaceId = null
let snapshot = { workspaces: [], activeWorkspaceId: null }

// ── Hydration ──────────────────────────────────────────────────
let hydrationPromise = null

export async function hydrateWorkspacesFromSupabase() {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const res = await courseService.getCourses()
      let dbCourses = res.success && Array.isArray(res.data) ? res.data : []

      const seedWorkspaces = getSeedWorkspaces()
      const dbIds = new Set(dbCourses.map((c) => c.id))

      for (const seed of seedWorkspaces) {
        if (!dbIds.has(seed.id)) {
          dbCourses = [...dbCourses, seed]
          // Background sync missing seed course to Supabase to prevent FK constraint errors
          courseService.ensureCourseExists(seed.id).catch(() => {})
        }
      }

      workspaces = dbCourses

      const savedId = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY)
        } catch {
          return null
        }
      })()

      if (savedId && workspaces.some((w) => w.id === savedId)) {
        activeWorkspaceId = savedId
      } else if (workspaces.length > 0) {
        activeWorkspaceId = workspaces[0].id
        try {
          localStorage.setItem(STORAGE_KEY, workspaces[0].id)
        } catch {
          // ignore
        }
      } else {
        activeWorkspaceId = null
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      }

      snapshot = { workspaces, activeWorkspaceId }
      emit()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[workspaceStore] hydrateWorkspacesFromSupabase failed:', err)
      }
    } finally {
      hydrationPromise = null
    }
  })()
  return hydrationPromise
}

// ── Active Course Persistence & Fallback ──────────────────────────
const STORAGE_KEY = 'nexora-active-course'

function emit() {
  snapshot = { workspaces, activeWorkspaceId }
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getSnapshot() {
  return snapshot
}

export function useWorkspaceStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// ── Non-hook Getters & Central Selectors ───────────────────────────
export function getWorkspaces() {
  return workspaces
}

export function getActiveWorkspaceId() {
  return activeWorkspaceId
}

export function getActiveCourse() {
  return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null
}

export function getCourseById(id) {
  return workspaces.find((w) => w.id === id) || null
}

export function getVisibleCoursesForRole(role = 'student') {
  if (role === 'admin') {
    return workspaces.filter((w) => w.status !== 'deleted')
  }
  return workspaces.filter((w) => w.status !== 'archived')
}

export { subscribe }

// ── Helper Utilities ──────────────────────────────────────────────
function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function findWorkspace(id) {
  return workspaces.find((w) => w.id === id)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ── Course CRUD Operations ────────────────────────────────────────
export function updateWorkspaceMetadata(id, key, count) {
  workspaces = workspaces.map((w) => {
    if (w.id !== id) return w
    return {
      ...w,
      metadata: {
        ...w.metadata,
        [key]: count,
      },
    }
  })
  emit()
}

export function createWorkspace({ name, icon, themeColor, description, status, id, examProfile, level }) {
  const providedId = id
  const course = bootstrapCourse({ name, icon, themeColor, description, status, examProfile, level })
  if (providedId) {
    course.id = providedId
  }
  course.order = workspaces.length + 1
  const existingIndex = workspaces.findIndex((w) => w.id === course.id)
  if (existingIndex >= 0) {
    workspaces = workspaces.map((w, idx) => (idx === existingIndex ? course : w))
  } else {
    workspaces = [...workspaces, course]
  }

  activeWorkspaceId = course.id
  try {
    localStorage.setItem(STORAGE_KEY, course.id)
  } catch (e) {
    // ignore
  }

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

export function editWorkspace(id, { name, icon, themeColor, description, status, examProfile, level }) {
  updateWorkspace(id, {
    ...(name !== undefined ? { name } : {}),
    ...(icon !== undefined ? { icon } : {}),
    ...(themeColor !== undefined ? { themeColor, theme: { primaryColor: themeColor } } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(status !== undefined ? { status, published: status !== 'archived' } : {}),
    ...(examProfile !== undefined ? { examProfile } : {}),
    ...(level !== undefined ? { level } : {}),
  })
}

export function duplicateWorkspace(id) {
  const target = findWorkspace(id)
  if (!target) return
  const copy = JSON.parse(JSON.stringify(target))
  copy.id = nextId('course')
  copy.name = `${target.name} (Copy)`
  copy.status = 'active'
  copy.published = true
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

export function toggleLockWorkspace(id) {
  const target = findWorkspace(id)
  if (!target) return
  updateWorkspace(id, { locked: !target.locked })
}

export function activateWorkspace(id) {
  updateWorkspace(id, { status: 'active', published: true })
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
  if (!target) return null
  workspaces = workspaces.filter((w) => w.id !== id)

  if (activeWorkspaceId === id) {
    activeWorkspaceId = workspaces[0]?.id || null
    try {
      if (activeWorkspaceId) {
        localStorage.setItem(STORAGE_KEY, activeWorkspaceId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      // ignore
    }
  }

  emit()
  return { name: target.name }
}

export function reorderWorkspaces(orderedIds) {
  workspaces = workspaces.map((w) => ({
    ...w,
    order: orderedIds.indexOf(w.id) + 1,
  }))
  emit()
}

// ── Active Course Global Switcher ────────────────────────────────
export function setActiveWorkspace(id) {
  if (id !== null && !findWorkspace(id)) return
  activeWorkspaceId = id
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage unavailable — ignore
  }
  emit()
}
