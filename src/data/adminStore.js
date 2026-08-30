/**
 * adminStore
 * Mutable in-memory cache for the Admin Content Management System.
 * Supabase is the authoritative source; local state is refreshed from
 * successful DB responses so the UI stays in sync without a reload.
 */
import { useSyncExternalStore } from 'react'
import {
  adminSubjects,
  allChapters,
  mcqRows,
  flashcardCards,
} from './adminData.js'
import { getActiveWorkspaceId, subscribe as subscribeWorkspace, getWorkspaces, updateWorkspaceMetadata } from './workspaceStore.js'
import { subjectService } from '../services/subjectService.js'
import { chapterService } from '../services/chapterService.js'
import { mcqService } from '../services/mcqService.js'
import { noteService, getLocalNotes } from '../services/noteService.js'
import { BPSC_PRELIMS_SUBJECTS, BPSC_PRELIMS_COURSE_ID } from './bpscPrelimsSeed.js'
import { BPSC_PRELIMS_CHAPTERS } from './bpscPrelimsChapters.js'

let listeners = []
let version = 0

const DEFAULT_COURSE_ID = 'bpsc-tre-4'

function getSeedSubjects() {
  const bpscPrelimsSeedSubs = BPSC_PRELIMS_SUBJECTS.map((s) => ({
    id: `s-bpsc-prelims-${s.order}`,
    courseId: BPSC_PRELIMS_COURSE_ID,
    name: s.name,
    icon: s.icon,
    desc: s.desc,
    status: 'active',
    locked: false,
    color: s.color,
    order: s.order,
    weightage: s.weightage,
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  }))

  return [
    ...adminSubjects.map((s) => ({
      ...s,
      courseId: DEFAULT_COURSE_ID,
      status: 'active',
      locked: false,
      color: '#F1621B',
      order: adminSubjects.findIndex((x) => x.id === s.id) + 1,
      stats: s.stats.map((st) => ({ ...st })),
    })),
    ...bpscPrelimsSeedSubs,
    {
      id: 's-cbse12-1',
      courseId: 'cbse-12-cs',
      name: 'Python Programming',
      icon: 'dataStructures',
      desc: 'Advanced Python functions, data structures, and file handling.',
      status: 'active',
      locked: false,
      color: '#2E5CE6',
      order: 1,
      stats: [{ value: '4', label: 'Chapters' }, { value: '50', label: 'MCQs' }, { value: '30', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-cbse12-2',
      courseId: 'cbse-12-cs',
      name: 'Database Querying (SQL)',
      icon: 'dbms',
      desc: 'Relational database management, DDL, DML, and SQL queries.',
      status: 'active',
      locked: false,
      color: '#2E5CE6',
      order: 2,
      stats: [{ value: '3', label: 'Chapters' }, { value: '40', label: 'MCQs' }, { value: '25', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-cbse11-1',
      courseId: 'cbse-11-ph',
      name: 'Kinematics & Laws of Motion',
      icon: 'physics',
      desc: 'Motion in a straight line, vectors, Newton laws, and friction.',
      status: 'active',
      locked: false,
      color: '#7C3AED',
      order: 1,
      stats: [{ value: '3', label: 'Chapters' }, { value: '30', label: 'MCQs' }, { value: '20', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-ssc-1',
      courseId: 'ssc-cgl-computer',
      name: 'Computer Fundamentals',
      icon: 'computerNetworks',
      desc: 'Hardware components, operating system basics, and software.',
      status: 'active',
      locked: false,
      color: '#12B76A',
      order: 1,
      stats: [{ value: '2', label: 'Chapters' }, { value: '45', label: 'MCQs' }, { value: '25', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
  ]
}

function getSeedChapters() {
  const bpscPrelimsSeedChapters = BPSC_PRELIMS_CHAPTERS.map((c) => ({
    id: `c-bpsc-prelims-${c.code.toLowerCase()}`,
    courseId: BPSC_PRELIMS_COURSE_ID,
    subject: c.subject,
    name: c.title,
    number: c.number,
    code: c.code,
    priority: c.priority,
    priorityLabel: c.priorityLabel,
    desc: c.description,
    status: 'active',
    locked: false,
    mcqs: 0,
    flashcards: 0,
    notes: 0,
  }))

  return [
    ...allChapters.map((c, i) => ({
      ...c,
      courseId: DEFAULT_COURSE_ID,
      status: 'active',
      locked: false,
      number: i + 1,
    })),
    ...bpscPrelimsSeedChapters,
    { id: 'c-cbse12-1', courseId: 'cbse-12-cs', subject: 'Python Programming', name: 'Functions & Recursion', number: 1, status: 'active', mcqs: 15, flashcards: 10, notes: 1 },
    { id: 'c-cbse12-2', courseId: 'cbse-12-cs', subject: 'Database Querying (SQL)', name: 'SQL Joins & Grouping', number: 1, status: 'active', mcqs: 20, flashcards: 12, notes: 1 },
    { id: 'c-cbse11-1', courseId: 'cbse-11-ph', subject: 'Kinematics & Laws of Motion', name: 'Vectors & Projectile Motion', number: 1, status: 'active', mcqs: 15, flashcards: 10, notes: 1 },
    { id: 'c-ssc-1', courseId: 'ssc-cgl-computer', subject: 'Computer Fundamentals', name: 'Hardware & Input Devices', number: 1, status: 'active', mcqs: 25, flashcards: 15, notes: 1 },
  ]
}

function getSeedMcqs() {
  return mcqRows.map((m) => ({ ...m, courseId: DEFAULT_COURSE_ID }))
}

function getSeedFlashcards() {
  return flashcardCards.map((f) => ({ ...f, courseId: DEFAULT_COURSE_ID }))
}

// ── State ──────────────────────────────────────────────────────
let subjects = getSeedSubjects()
let chapters = getSeedChapters()
let mcqs = getSeedMcqs()
let flashcards = getSeedFlashcards()
let notes = typeof getLocalNotes === 'function' ? getLocalNotes() : []

let snapshot = {
  allSubjects: subjects,
  allChapters: chapters,
  allMcqs: mcqs,
  allFlashcards: flashcards,
  allNotes: notes,
  subjects: [],
  chapters: [],
  mcqs: [],
  flashcards: [],
  notes: notes,
  activeCourseId: null,
}

let hydrationPromise = null

export async function hydrateAdminStoreFromSupabase() {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const activeCourseId = getActiveWorkspaceId()
      const [subjectsRes, chaptersRes, mcqsRes, flashcardsRes, notesRes] = await Promise.all([
        activeCourseId ? subjectService.getSubjects(activeCourseId) : Promise.resolve({ success: true, data: [] }),
        activeCourseId ? chapterService.getChapters(activeCourseId, '') : Promise.resolve({ success: true, data: [] }),
        activeCourseId ? mcqService.getMcqs(activeCourseId, '', '') : Promise.resolve({ success: true, data: [] }),
        activeCourseId ? mcqService.getFlashcards(activeCourseId, '', '') : Promise.resolve({ success: true, data: [] }),
        activeCourseId ? noteService.getNotes({ courseId: activeCourseId }) : Promise.resolve({ success: true, data: [] }),
      ])

      if (subjectsRes.success && Array.isArray(subjectsRes.data)) {
        subjects = subjectsRes.data
      }
      if (chaptersRes.success && Array.isArray(chaptersRes.data)) {
        chapters = chaptersRes.data.map((c) => {
          const parentSub = subjects.find((s) => s.id === c.subjectId)
          return {
            ...c,
            subject: parentSub ? parentSub.name : c.subject || c.subjectId,
          }
        })
      }
      if (mcqsRes.success && Array.isArray(mcqsRes.data)) {
        mcqs = mcqsRes.data
      }
      if (flashcardsRes.success && Array.isArray(flashcardsRes.data)) {
        flashcards = flashcardsRes.data
      }
      if (notesRes.success && Array.isArray(notesRes.data) && notesRes.data.length > 0) {
        notes = notesRes.data
      } else {
        const localList = typeof getLocalNotes === 'function' ? getLocalNotes() : []
        if (localList.length > 0) {
          notes = localList
        }
      }

      recomputeAllSubjectStats()
      updateSnapshot()
      emit()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[adminStore] hydrateAdminStoreFromSupabase failed:', err)
      }
    } finally {
      hydrationPromise = null
    }
  })()
  return hydrationPromise
}

function updateSnapshot() {
  const activeCourseId = getActiveWorkspaceId()
  snapshot = {
    allSubjects: subjects,
    allChapters: chapters,
    allMcqs: mcqs,
    allFlashcards: flashcards,
    allNotes: notes,
    subjects: subjects.filter((s) => s.courseId === activeCourseId),
    chapters: chapters.filter((c) => c.courseId === activeCourseId),
    mcqs: mcqs.filter((m) => m.courseId === activeCourseId),
    flashcards: flashcards.filter((f) => f.courseId === activeCourseId),
    notes: notes.filter((n) => n.courseId === activeCourseId),
    activeCourseId,
  }
}

// Initialize snapshot
updateSnapshot()

function emit() {
  updateSnapshot()
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
  return snapshot
}

let lastWorkspaces = [...getWorkspaces()]
let lastActiveCourseId = getActiveWorkspaceId()

subscribeWorkspace(() => {
  const currentWorkspaces = getWorkspaces()
  const currentIds = new Set(currentWorkspaces.map((w) => w.id))
  const deletedIds = lastWorkspaces.filter((w) => !currentIds.has(w.id)).map((w) => w.id)

  if (deletedIds.length > 0) {
    deletedIds.forEach((courseId) => {
      subjects = subjects.filter((s) => s.courseId !== courseId)
      chapters = chapters.filter((c) => c.courseId !== courseId)
      mcqs = mcqs.filter((m) => m.courseId !== courseId)
      flashcards = flashcards.filter((f) => f.courseId !== courseId)
    })
    recomputeAllSubjectStats()
  }

  const currentActiveCourseId = getActiveWorkspaceId()
  if (currentActiveCourseId !== lastActiveCourseId) {
    lastActiveCourseId = currentActiveCourseId
    if (currentActiveCourseId) {
      hydrationPromise = null
      hydrateAdminStoreFromSupabase()
    }
  }

  lastWorkspaces = [...currentWorkspaces]
  emit()
})

export function useAdminStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// ── Helpers ───────────────────────────────────────────────────────
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

export function matchContentToChapter(item, chapter) {
  if (!item || !chapter) return false

  const itemChapId = item.chapter_id || item.chapterId
  const chapId = chapter.id

  if (itemChapId && chapId) {
    if (String(itemChapId) !== String(chapId)) return false
    const itemSubId = item.subject_id || item.subjectId
    const chapSubId = chapter.subject_id || chapter.subjectId
    if (itemSubId && chapSubId && String(itemSubId) !== String(chapSubId)) return false
    return true
  }

  if (itemChapId || chapId) {
    return false
  }

  const itemSub = String(item.subject_id || item.subjectId || item.subject || '').trim().toLowerCase()
  const chapSub = String(chapter.subject_id || chapter.subjectId || chapter.subject || '').trim().toLowerCase()
  if (itemSub && chapSub && itemSub !== chapSub) {
    return false
  }

  const itemChap = String(item.chapter || item.chapterName || item.title || '').trim().toLowerCase()
  const chapName = String(chapter.name || chapter.title || '').trim().toLowerCase()
  if (!itemChap || !chapName) return false

  return itemChap === chapName || itemChap.includes(chapName) || chapName.includes(itemChap)
}

function recomputeAllChapterStats() {
  chapters = chapters.map((ch) => {
    const matchingMcqs = mcqs.filter((m) => {
      if (m.courseId && ch.courseId && String(m.courseId) !== String(ch.courseId)) return false
      return matchContentToChapter(m, ch)
    })

    const matchingFlashcards = flashcards.filter((f) => {
      if (f.courseId && ch.courseId && String(f.courseId) !== String(ch.courseId)) return false
      return matchContentToChapter(f, ch)
    })

    const matchingNotes = notes.filter((n) => {
      if (n.courseId && ch.courseId && String(n.courseId) !== String(ch.courseId)) return false
      return (
        matchContentToChapter(n, ch) ||
        String(n.chapterId || n.chapter_id) === String(ch.id) ||
        (n.title && ch.name && n.title.toLowerCase().includes(ch.name.toLowerCase())) ||
        (n.chapterName && ch.name && n.chapterName.toLowerCase() === ch.name.toLowerCase())
      )
    })

    const countMcqs = matchingMcqs.length
    const countFlashcards = matchingFlashcards.length
    const countNotes = matchingNotes.length

    return {
      ...ch,
      mcqs: countMcqs,
      totalMcqs: countMcqs,
      flashcards: countFlashcards,
      totalFlashcards: countFlashcards,
      notes: countNotes,
      totalNotes: countNotes,
    }
  })
}

function currentCourseId() {
  return getActiveWorkspaceId() || DEFAULT_COURSE_ID
}

function recomputeSubjectStats(subject) {
  const subjectChapters = chapters.filter(
    (c) =>
      c.courseId === subject.courseId &&
      (c.subjectId === subject.id || c.subject_id === subject.id || c.subject === subject.name)
  )

  const subjectMcqs = mcqs.filter(
    (m) =>
      m.courseId === subject.courseId &&
      (m.subjectId === subject.id || m.subject_id === subject.id || m.subject === subject.name)
  )

  const subjectFlashcards = flashcards.filter(
    (f) =>
      f.courseId === subject.courseId &&
      (f.subjectId === subject.id || f.subject_id === subject.id || f.subject === subject.name)
  )

  const totalChapterMcqs = subjectChapters.reduce((sum, c) => sum + (c.mcqs || 0), 0)
  const finalMcqCount = subjectMcqs.length > 0 ? subjectMcqs.length : totalChapterMcqs

  subject.stats = [
    { value: String(subjectChapters.length), label: 'Chapters' },
    { value: String(finalMcqCount), label: 'MCQs' },
    { value: String(subjectFlashcards.length), label: 'Flashcards' },
    { value: subject.status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
  ]
}

function recomputeAllSubjectStats() {
  recomputeAllChapterStats()
  subjects.forEach(recomputeSubjectStats)
}

// ── Subject CRUD ──────────────────────────────────────────────────
export function addSubject({ name, icon, desc, color, status, courseId }) {
  const targetCourseId = courseId || currentCourseId()
  const courseSubjects = subjects.filter((s) => s.courseId === targetCourseId)
  const subject = {
    id: `s${nextId(subjects)}`,
    courseId: targetCourseId,
    name: name || 'New Subject',
    icon: icon || 'chapters',
    desc: desc || '',
    color: color || '#F1621B',
    status: status || 'active',
    locked: false,
    order: courseSubjects.length + 1,
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
    ],
  }
  subjects = [...subjects, subject]
  updateWorkspaceMetadata(targetCourseId, 'subjects', subjects.filter((s) => s.courseId === targetCourseId).length)
  emit()
  return subject
}

export function seedDefaultSubjects(courseId) {
  const targetCourseId = courseId || currentCourseId()
  const templates = [
    { name: 'Physics', icon: 'chapters', desc: 'Mechanics, Electromagnetism, and Modern Physics', color: '#2E5CE6' },
    { name: 'Chemistry', icon: 'document', desc: 'Organic, Inorganic, and Physical Chemistry', color: '#12B76A' },
    { name: 'Mathematics', icon: 'analyticsTab', desc: 'Calculus, Algebra, Vector & 3D Geometry', color: '#7C3AED' },
    { name: 'Computer Science', icon: 'mcqs', desc: 'Python Programming, Data Structures, and Networking', color: '#F1621B' },
  ]
  templates.forEach((tmpl) => {
    if (!subjects.some((s) => s.courseId === targetCourseId && s.name.toLowerCase() === tmpl.name.toLowerCase())) {
      addSubject({ ...tmpl, status: 'active', courseId: targetCourseId })
    }
  })
}

export function updateSubject(id, { name, icon, desc, color, status }) {
  subjects = subjects.map((subject) => {
    if (subject.id !== id) return subject
    const updated = {
      ...subject,
      name: name || subject.name,
      icon: icon || subject.icon,
      desc: desc ?? subject.desc,
      color: color || subject.color,
      status: status || subject.status,
    }
    chapters = chapters.map((c) => (c.subject === subject.name && c.courseId === subject.courseId ? { ...c, subject: updated.name } : c))
    mcqs = mcqs.map((m) => (m.subject === subject.name && m.courseId === subject.courseId ? { ...m, subject: updated.name } : m))
    flashcards = flashcards.map((f) => (f.subject === subject.name && f.courseId === subject.courseId ? { ...f, subject: updated.name } : f))
    return updated
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteSubject(id) {
  const target = subjects.find((s) => s.id === id || s.name === id)
  let impacted = { name: '', chapters: 0, mcqs: 0, flashcards: 0 }
  if (target) {
    const isTargetChapter = (c) =>
      c.subjectId === target.id ||
      c.subject_id === target.id ||
      (c.subject && String(c.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const isTargetMcq = (m) =>
      m.subjectId === target.id ||
      m.subject_id === target.id ||
      (m.subject && String(m.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const isTargetFlashcard = (f) =>
      f.subjectId === target.id ||
      f.subject_id === target.id ||
      (f.subject && String(f.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const chapterCount = chapters.filter(isTargetChapter).length
    const mcqCount = mcqs.filter(isTargetMcq).length
    const flashcardCount = flashcards.filter(isTargetFlashcard).length
    impacted = { name: target.name, chapters: chapterCount, mcqs: mcqCount, flashcards: flashcardCount }

    chapters = chapters.filter((c) => !isTargetChapter(c))
    mcqs = mcqs.filter((m) => !isTargetMcq(m))
    flashcards = flashcards.filter((f) => !isTargetFlashcard(f))
  }
  subjects = subjects.filter((s) => s.id !== id && s.name !== id)
  if (target) {
    updateWorkspaceMetadata(target.courseId, 'subjects', subjects.filter((s) => s.courseId === target.courseId).length)
  }
  emit()
  return impacted
}

export function duplicateSubject(id) {
  const target = subjects.find((s) => s.id === id)
  if (!target) return
  const courseId = target.courseId
  const copy = {
    ...JSON.parse(JSON.stringify(target)),
    id: `s${nextId(subjects)}`,
    name: `${target.name} (Copy)`,
    status: 'active',
    locked: false,
    order: subjects.filter((s) => s.courseId === courseId).length + 1,
  }
  copy.stats = copy.stats.map((st) => ({ ...st }))
  subjects = [...subjects, copy]
  updateWorkspaceMetadata(courseId, 'subjects', subjects.filter((s) => s.courseId === courseId).length)
  emit()
  return copy
}

export function reorderSubjects(orderedIds) {
  subjects = subjects.map((s) => ({
    ...s,
    order: orderedIds.indexOf(s.id) + 1,
  }))
  emit()
}

export function setSubjectStatus(id, status) {
  subjects = subjects.map((s) => (s.id === id ? { ...s, status } : s))
  recomputeAllSubjectStats()
  emit()
}

export function toggleSubjectLock(id) {
  subjects = subjects.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
  emit()
}

export function getDeleteSubjectImpact(id) {
  const target = subjects.find((s) => s.id === id || s.name === id)
  if (!target) return { name: '', chapters: 0, mcqs: 0, flashcards: 0 }

  const isTargetChapter = (c) =>
    c.subjectId === target.id ||
    c.subject_id === target.id ||
    (c.subject && String(c.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  const isTargetMcq = (m) =>
    m.subjectId === target.id ||
    m.subject_id === target.id ||
    (m.subject && String(m.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  const isTargetFlashcard = (f) =>
    f.subjectId === target.id ||
    f.subject_id === target.id ||
    (f.subject && String(f.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  return {
    name: target.name,
    chapters: chapters.filter(isTargetChapter).length,
    mcqs: mcqs.filter(isTargetMcq).length,
    flashcards: flashcards.filter(isTargetFlashcard).length,
  }
}

// ── Chapter Overrides Persistence ──────────────────────────────────
const CHAPTER_OVERRIDES_KEY = 'nexora_chapter_overrides_v2'

export function getChapterOverrides() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAPTER_OVERRIDES_KEY) : null
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveChapterOverride(id, patch) {
  try {
    if (typeof localStorage === 'undefined') return
    const current = getChapterOverrides()
    const cleanId = String(id || patch?.id || '').trim().toLowerCase()
    const cleanCode = String(patch?.code || '').trim().toUpperCase()
    const cleanName = String(patch?.name || patch?.title || '').trim().toLowerCase()

    const overridePayload = {
      ...(patch.priority ? { priority: patch.priority } : {}),
      ...(patch.name ? { name: patch.name, title: patch.name } : {}),
      ...(patch.code ? { code: patch.code } : {}),
      ...(patch.desc !== undefined || patch.description !== undefined ? { desc: patch.desc || patch.description, description: patch.desc || patch.description } : {}),
      ...(patch.number !== undefined ? { number: Number(patch.number) } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.locked !== undefined ? { locked: Boolean(patch.locked) } : {}),
    }

    const updated = {
      ...current,
      ...(cleanId ? { [cleanId]: { ...current[cleanId], ...overridePayload } } : {}),
      ...(cleanCode ? { [`code_${cleanCode}`]: { ...current[`code_${cleanCode}`], ...overridePayload } } : {}),
      ...(cleanName ? { [`name_${cleanName}`]: { ...current[`name_${cleanName}`], ...overridePayload } } : {}),
    }
    localStorage.setItem(CHAPTER_OVERRIDES_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to save chapter override to localStorage:', err)
  }
}

export function applyChapterOverrides(chList) {
  if (!Array.isArray(chList)) return chList
  const overrides = getChapterOverrides()
  if (Object.keys(overrides).length === 0) return chList

  return chList.map((ch) => {
    if (!ch) return ch
    const chId = String(ch.id || '').trim().toLowerCase()
    const chCode = String(ch.code || '').trim().toUpperCase()
    const chName = String(ch.name || ch.title || '').trim().toLowerCase()

    const ov = overrides[chId] || (chCode ? overrides[`code_${chCode}`] : null) || (chName ? overrides[`name_${chName}`] : null)
    if (!ov) return ch

    return {
      ...ch,
      ...ov,
      priority: ov.priority || ch.priority,
      code: ov.code || ch.code,
      name: ov.name || ch.name,
      title: ov.name || ch.title || ch.name,
      desc: ov.desc || ov.description || ch.desc || ch.description,
      description: ov.desc || ov.description || ch.desc || ch.description,
      status: ov.status || ch.status,
      locked: ov.locked !== undefined ? Boolean(ov.locked) : ch.locked,
    }
  })
}

// ── Chapter CRUD ──────────────────────────────────────────────────
export function addChapter(data) {
  const targetCourseId = data.courseId || currentCourseId()
  const courseChapters = chapters.filter((c) => c.courseId === targetCourseId)
  const chapter = {
    id: data.id || `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    courseId: targetCourseId,
    subjectId: data.subjectId || data.subject || 'Computer Networks',
    subject: data.subject || data.subjectId || 'Computer Networks',
    name: data.name || 'New Chapter',
    desc: data.desc || data.description || '',
    mcqs: data.mcqs || 0,
    flashcards: data.flashcards || 0,
    notes: data.notes || 0,
    status: data.status || 'active',
    statusText: data.status === 'disabled' ? 'Disabled' : 'Active',
    locked: Boolean(data.locked),
    number: data.number ? Number(data.number) : courseChapters.length + 1,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  }
  chapters = [...chapters, chapter]
  recomputeAllSubjectStats()
  emit()
  return chapter
}

export function updateChapter(id, patch) {
  const cleanId = String(id || patch?.id || '').trim().toLowerCase()
  const patchName = String(patch?.name || patch?.title || '').trim().toLowerCase()
  const patchCode = String(patch?.code || '').trim().toUpperCase()
  const patchNumber = patch?.number !== undefined ? Number(patch?.number) : null

  // Save to persistent overrides
  saveChapterOverride(id, patch)

  chapters = chapters.map((chapter) => {
    const chId = String(chapter.id || '').trim().toLowerCase()
    const chName = String(chapter.name || chapter.title || '').trim().toLowerCase()
    const chCode = String(chapter.code || '').trim().toUpperCase()
    const chNumber = Number(chapter.number)

    const isIdMatch = cleanId && (chId === cleanId || chId.includes(cleanId) || cleanId.includes(chId))
    const isCodeMatch = patchCode && chCode && patchCode === chCode
    const isNameSubjectMatch = patchName && chName && patchName === chName && (
      !patch.subject || !chapter.subject || String(patch.subject).trim().toLowerCase() === String(chapter.subject).trim().toLowerCase()
    )
    const isNumberSubjectMatch = patchNumber && chNumber === patchNumber && (
      !patch.subject || !chapter.subject || String(patch.subject).trim().toLowerCase() === String(chapter.subject).trim().toLowerCase()
    )

    if (!isIdMatch && !isCodeMatch && !isNameSubjectMatch && !isNumberSubjectMatch) {
      return chapter
    }

    return {
      ...chapter,
      ...patch,
      name: patch.name || chapter.name,
      title: patch.name || chapter.title || chapter.name,
      number: patch.number !== undefined ? Number(patch.number) : chapter.number,
      code: patch.code !== undefined ? patch.code : chapter.code,
      priority: patch.priority !== undefined ? patch.priority : chapter.priority,
      desc: patch.desc !== undefined ? patch.desc : (patch.description !== undefined ? patch.description : chapter.desc),
      description: patch.desc !== undefined ? patch.desc : (patch.description !== undefined ? patch.description : chapter.description),
      status: patch.status || chapter.status || 'active',
      locked: patch.locked !== undefined ? Boolean(patch.locked) : Boolean(chapter.locked),
      subject: patch.subject || patch.subjectName || chapter.subject,
      subjectName: patch.subjectName || patch.subject || chapter.subjectName,
      subjectId: patch.subjectId || chapter.subjectId,
    }
  })

  recomputeAllSubjectStats()
  emit()
}

export function duplicateChapter(id) {
  const target = chapters.find((c) => c.id === id)
  if (!target) return
  const courseId = target.courseId
  const copy = {
    ...JSON.parse(JSON.stringify(target)),
    id: nextId(chapters),
    name: `${target.name} (Copy)`,
    status: 'active',
    locked: false,
    number: chapters.filter((c) => c.courseId === courseId && c.subject === target.subject).length + 1,
  }
  chapters = [...chapters, copy]
  recomputeAllSubjectStats()
  emit()
  return copy
}

export function reorderChapters(subjectName, orderedChapters) {
  const courseId = currentCourseId()
  const orderMap = new Map(orderedChapters.map((c, index) => [c.id, index + 1]))
  chapters = chapters.map((chapter) => {
    if (chapter.subject !== subjectName || chapter.courseId !== courseId) return chapter
    const newNumber = orderMap.get(chapter.id)
    return newNumber ? { ...chapter, number: newNumber } : chapter
  })
  emit()
}

export function setChapterStatus(id, status) {
  chapters = chapters.map((c) => {
    if (c.id !== id) return c
    const isActive = status === 'active'
    return {
      ...c,
      status: isActive ? 'success' : 'warning',
      statusText: isActive ? 'Active' : 'Disabled',
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function toggleChapterLock(id) {
  chapters = chapters.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c))
  emit()
}

export function deleteChapter(id) {
  const target = chapters.find((c) => c.id === id)
  let impacted = { name: '', subject: '', mcqs: 0, flashcards: 0 }
  if (target) {
    const mcqMatches = (m) =>
      m.chapterId === id ||
      m.chapter_id === id ||
      (m.chapter && String(m.chapter).trim().toLowerCase() === String(target.name).trim().toLowerCase() && m.courseId === target.courseId)

    const flashMatches = (f) =>
      f.chapterId === id ||
      f.chapter_id === id ||
      (f.chapter && String(f.chapter).trim().toLowerCase() === String(target.name).trim().toLowerCase() && f.courseId === target.courseId)

    const mcqCount = mcqs.filter(mcqMatches).length
    const flashcardCount = flashcards.filter(flashMatches).length
    impacted = { name: target.name, subject: target.subject, mcqs: mcqCount, flashcards: flashcardCount }
    mcqs = mcqs.filter((m) => !mcqMatches(m))
    flashcards = flashcards.filter((f) => !flashMatches(f))
  }
  chapters = chapters.filter((c) => c.id !== id)
  recomputeAllSubjectStats()
  emit()
  return impacted
}

export function getDeleteChapterImpact(id) {
  const target = chapters.find((c) => c.id === id)
  if (!target) return { name: '', subject: '', mcqs: 0, flashcards: 0 }
  const mcqMatches = (m) =>
    m.chapterId === id ||
    m.chapter_id === id ||
    (m.chapter && String(m.chapter).trim().toLowerCase() === String(target.name).trim().toLowerCase() && m.courseId === target.courseId)

  const flashMatches = (f) =>
    f.chapterId === id ||
    f.chapter_id === id ||
    (f.chapter && String(f.chapter).trim().toLowerCase() === String(target.name).trim().toLowerCase() && f.courseId === target.courseId)

  return {
    name: target.name,
    subject: target.subject,
    mcqs: mcqs.filter(mcqMatches).length,
    flashcards: flashcards.filter(flashMatches).length,
  }
}

// ── MCQ CRUD ──────────────────────────────────────────────────────
export function deleteSelectedMcqs(ids) {
  const idSet = new Set(ids)
  const removed = mcqs.filter((m) => idSet.has(m.id)).length
  mcqs = mcqs.filter((m) => !idSet.has(m.id))
  recomputeAllSubjectStats()
  emit()
  return removed
}

export function addMcq({ question, options, correct, difficulty, subject, chapter }) {
  const courseId = currentCourseId()
  const mcq = {
    id: nextId(mcqs),
    courseId,
    question: question || 'New question?',
    options: options || ['', '', '', ''],
    correct: correct || 0,
    subject: subject || 'Computer Networks',
    chapter: chapter || 'General',
    difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
    difficultyText: difficulty || 'Easy',
    attempts: '0',
    accuracy: '—',
  }
  mcqs = [...mcqs, mcq]
  recomputeAllSubjectStats()
  emit()
  return mcq
}

export function updateMcq(id, { question, options, correct, difficulty, subject, chapter }) {
  mcqs = mcqs.map((mcq) => {
    if (mcq.id !== id) return mcq
    return {
      ...mcq,
      question: question || mcq.question,
      options: options || mcq.options,
      correct: correct ?? mcq.correct,
      subject: subject || mcq.subject,
      chapter: chapter || mcq.chapter,
      difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
      difficultyText: difficulty || mcq.difficultyText,
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteMcq(id) {
  mcqs = mcqs.filter((m) => m.id !== id)
  recomputeAllSubjectStats()
  emit()
}

export function deleteMcqsByChapter(chapterName) {
  const courseId = currentCourseId()
  const count = mcqs.filter(
    (m) =>
      (m.chapter === chapterName || m.chapterId === chapterName || m.chapter_id === chapterName) &&
      m.courseId === courseId
  ).length
  mcqs = mcqs.filter(
    (m) =>
      !(
        (m.chapter === chapterName || m.chapterId === chapterName || m.chapter_id === chapterName) &&
        m.courseId === courseId
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteMcqsBySubject(subjectName) {
  const courseId = currentCourseId()
  const count = mcqs.filter(
    (m) =>
      (m.subject === subjectName || m.subjectId === subjectName || m.subject_id === subjectName) &&
      m.courseId === courseId
  ).length
  mcqs = mcqs.filter(
    (m) =>
      !(
        (m.subject === subjectName || m.subjectId === subjectName || m.subject_id === subjectName) &&
        m.courseId === courseId
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllMcqs() {
  const courseId = currentCourseId()
  const count = mcqs.filter((m) => m.courseId === courseId).length
  mcqs = mcqs.filter((m) => m.courseId !== courseId)
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Flashcard CRUD ────────────────────────────────────────────────
export function addFlashcard({ subject, chapter, front, back }) {
  const courseId = currentCourseId()
  const flashcard = {
    id: nextId(flashcards),
    courseId,
    subject: subject || 'Computer Networks',
    chapter: chapter || 'General',
    front: front || 'New question?',
    back: back || 'Answer',
    views: '0 views',
  }
  flashcards = [...flashcards, flashcard]
  recomputeAllSubjectStats()
  emit()
  return flashcard
}

export function updateFlashcard(id, { subject, chapter, front, back }) {
  flashcards = flashcards.map((card) => {
    if (card.id !== id) return card
    return {
      ...card,
      subject: subject || card.subject,
      chapter: chapter || card.chapter,
      front: front || card.front,
      back: back || card.back,
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteFlashcard(id) {
  flashcards = flashcards.filter((f) => f.id !== id)
  recomputeAllSubjectStats()
  emit()
}

export function deleteFlashcardsByChapter(chapterName) {
  const courseId = currentCourseId()
  const count = flashcards.filter(
    (f) =>
      (f.chapter === chapterName || f.chapterId === chapterName || f.chapter_id === chapterName) &&
      f.courseId === courseId
  ).length
  flashcards = flashcards.filter(
    (f) =>
      !(
        (f.chapter === chapterName || f.chapterId === chapterName || f.chapter_id === chapterName) &&
        f.courseId === courseId
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteFlashcardsBySubject(subjectName) {
  const courseId = currentCourseId()
  const count = flashcards.filter(
    (f) =>
      (f.subject === subjectName || f.subjectId === subjectName || f.subject_id === subjectName) &&
      f.courseId === courseId
  ).length
  flashcards = flashcards.filter(
    (f) =>
      !(
        (f.subject === subjectName || f.subjectId === subjectName || f.subject_id === subjectName) &&
        f.courseId === courseId
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllFlashcards() {
  const courseId = currentCourseId()
  const count = flashcards.filter((f) => f.courseId === courseId).length
  flashcards = flashcards.filter((f) => f.courseId !== courseId)
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Bulk injection (AI Content Studio) ────────────────────────────
export function injectMcqs(records) {
  const courseId = currentCourseId()
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.question) {
      failed += 1
      return
    }
    const targetChapId = record.chapter_id || record.chapterId
    const targetSubId = record.subject_id || record.subjectId

    const exists = mcqs.some(
      (m) =>
        (record.id && String(m.id) === String(record.id)) ||
        (m.question &&
          record.question &&
          m.question.toLowerCase() === String(record.question).toLowerCase() &&
          String(m.chapter_id || m.chapterId || m.chapter) === String(targetChapId || record.chapter))
    )
    if (exists) {
      duplicates += 1
      return
    }

    const options = Array.isArray(record.options)
      ? record.options
      : [record.optionA, record.optionB, record.optionC, record.optionD].map((o) => o || '')
    const correctMap = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
    const rawCorrect = record.correct !== undefined ? record.correct : (record.correct_answer !== undefined ? record.correct_answer : record.correctAnswer)
    const correct = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)
    const difficulty = record.difficultyText || record.difficulty || 'Easy'

    mcqs = [
      ...mcqs,
      {
        id: record.id || nextId(mcqs),
        courseId: record.courseId || courseId,
        subject_id: targetSubId,
        chapter_id: targetChapId,
        subjectId: targetSubId,
        chapterId: targetChapId,
        question: record.question,
        options,
        correct,
        subject: record.subject,
        chapter: record.chapter,
        difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
        difficultyText: difficulty,
        attempts: record.attempts || '0',
        accuracy: record.accuracy || '—',
        explanation: record.explanation || '',
      },
    ]
    imported += 1
    lastSubject = record.subject
    lastChapter = record.chapter
  })

  recomputeAllSubjectStats()
  emit()
  return { imported, duplicates, failed, lastSubject, lastChapter }
}

export function injectFlashcards(records) {
  const courseId = currentCourseId()
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.front || !record.back) {
      failed += 1
      return
    }
    const targetChapId = record.chapter_id || record.chapterId
    const targetSubId = record.subject_id || record.subjectId

    const exists = flashcards.some(
      (f) =>
        (record.id && String(f.id) === String(record.id)) ||
        (f.front &&
          record.front &&
          f.front.toLowerCase() === String(record.front).toLowerCase() &&
          String(f.chapter_id || f.chapterId || f.chapter) === String(targetChapId || record.chapter))
    )
    if (exists) {
      duplicates += 1
      return
    }

    flashcards = [
      ...flashcards,
      {
        id: record.id || nextId(flashcards),
        courseId: record.courseId || courseId,
        subject_id: targetSubId,
        chapter_id: targetChapId,
        subjectId: targetSubId,
        chapterId: targetChapId,
        subject: record.subject,
        chapter: record.chapter,
        front: record.front,
        back: record.back,
        views: record.views || '0 views',
      },
    ]
    imported += 1
    lastSubject = record.subject
    lastChapter = record.chapter
  })

  recomputeAllSubjectStats()
  emit()
  return { imported, duplicates, failed, lastSubject, lastChapter }
}

export { injectMcqs as injectMcqsIntoStore, injectFlashcards as injectFlashcardsIntoStore }

export function checkDuplicateMcqs(records, targetCourseId) {
  const cId = targetCourseId || currentCourseId()
  const existingSet = new Set(
    mcqs.filter((m) => m.courseId === cId).map((m) => m.question.trim().toLowerCase())
  )
  return records.filter((r) => r.question && existingSet.has(r.question.trim().toLowerCase()))
}

export function checkDuplicateFlashcards(records, targetCourseId) {
  const cId = targetCourseId || currentCourseId()
  const existingSet = new Set(
    flashcards.filter((f) => f.courseId === cId).map((f) => f.front.trim().toLowerCase())
  )
  return records.filter((r) => r.front && existingSet.has(r.front.trim().toLowerCase()))
}

export function getCounts() {
  const courseId = currentCourseId()
  return {
    subjects: subjects.filter((s) => s.courseId === courseId).length,
    chapters: chapters.filter((c) => c.courseId === courseId).length,
    mcqs: mcqs.filter((m) => m.courseId === courseId).length,
    flashcards: flashcards.filter((f) => f.courseId === courseId).length,
  }
}

export function getSubjectByName(name) {
  const courseId = currentCourseId()
  return subjects.find((s) => (s.name === name || s.id === name) && s.courseId === courseId) || null
}

export function getSubjectsByCourse(courseId) {
  return subjects.filter((s) => s.courseId === courseId)
}

export function getChaptersBySubject(subjectName) {
  const courseId = currentCourseId()
  return chapters
    .filter(
      (c) =>
        (c.subject === subjectName || c.subjectId === subjectName || c.subject_id === subjectName) &&
        c.courseId === courseId
    )
    .sort((a, b) => a.number - b.number)
}

export function getChaptersBySubjectAndCourse(subjectId, courseId) {
  return chapters.filter(
    (c) =>
      (c.subjectId === subjectId || c.subject_id === subjectId || c.subject === subjectId) &&
      c.courseId === courseId
  )
}

export function getMcqsByChapterAndCourse(chapterId, subjectId, courseId) {
  return mcqs.filter((m) => {
    if (courseId && m.courseId && m.courseId !== courseId) return false
    if (chapterId && String(m.chapter_id || m.chapterId) !== String(chapterId)) return false
    if (subjectId && String(m.subject_id || m.subjectId) !== String(subjectId)) return false
    return true
  })
}

// ── Chapter ordering (reorder) ────────────────────────────────────
export function saveChapterOrder(subjectName, orderedChapters) {
  const courseId = currentCourseId()
  const orderMap = new Map(orderedChapters.map((c, index) => [c.id, index + 1]))
  chapters = chapters.map((chapter) => {
    if (chapter.subject !== subjectName || chapter.courseId !== courseId) return chapter
    const newNumber = orderMap.get(chapter.id)
    return newNumber ? { ...chapter, number: newNumber } : chapter
  })
  emit()
}

export function replaceSubjects(newSubjects) {
  subjects = Array.isArray(newSubjects) ? newSubjects : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceChapters(newChapters) {
  chapters = Array.isArray(newChapters) ? newChapters : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceMcqs(newMcqs) {
  mcqs = Array.isArray(newMcqs) ? newMcqs : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceFlashcards(newFlashcards) {
  flashcards = Array.isArray(newFlashcards) ? newFlashcards : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceWorkspaces(newWorkspaces) {
  workspaces = Array.isArray(newWorkspaces) ? newWorkspaces : []
  emit()
}

export function removeMcqsFromStore(mcqIdsToRemove = []) {
  const idsSet = new Set(mcqIdsToRemove.map((id) => String(id)))
  mcqs = mcqs.filter((m) => !idsSet.has(String(m.id)))
  recomputeAllSubjectStats()
  emit()
}

export function removeMcqsForChapterFromStore(chapterId) {
  if (!chapterId) return
  mcqs = mcqs.filter((m) => String(m.chapterId || m.chapter_id) !== String(chapterId))
  recomputeAllSubjectStats()
  emit()
}

export function updateMcqInStore(updatedMcq) {
  if (!updatedMcq || !updatedMcq.id) return
  mcqs = mcqs.map((m) => {
    if (String(m.id) === String(updatedMcq.id)) {
      return { ...m, ...updatedMcq }
    }
    return m
  })
  recomputeAllSubjectStats()
  emit()
}

// ── Note CRUD ─────────────────────────────────────────────────────
export function replaceNotes(newNotes) {
  notes = Array.isArray(newNotes) ? newNotes : []
  recomputeAllSubjectStats()
  emit()
}

export function addNote(note) {
  if (!note || !note.id) return
  notes = [note, ...notes.filter((n) => String(n.id) !== String(note.id))]
  recomputeAllSubjectStats()
  emit()
}

export function updateNoteInStore(updatedNote) {
  if (!updatedNote || !updatedNote.id) return
  notes = notes.map((n) => (String(n.id) === String(updatedNote.id) ? { ...n, ...updatedNote } : n))
  recomputeAllSubjectStats()
  emit()
}

export function deleteNoteFromStore(noteId) {
  if (!noteId) return
  notes = notes.filter((n) => String(n.id) !== String(noteId))
  recomputeAllSubjectStats()
  emit()
}
