/**
 * academicStore
 * Academic Structure Management — the single source of truth for Nexora's
 * learning hierarchy: Examination → Class → Subject → Chapter → Content.
 *
 * Local/mock only. Every entity is shaped to map 1:1 to future DB tables,
 * so backend integration later only requires replacing this data source.
 */
import { useSyncExternalStore } from 'react'

let listeners = []
let version = 0

// ── Seed data ─────────────────────────────────────────────────────
let examinations = [
  {
    id: 'bpsc',
    name: 'BPSC TRE 4.0',
    shortCode: 'BPSC',
    status: 'active',
    locked: false,
    archived: false,
    order: 1,
    classes: [
      {
        id: 'bpsc-c11',
        name: 'Class 11',
        status: 'active',
        locked: false,
        archived: false,
        order: 1,
        subjects: [
          {
            id: 'bpsc-c11-cn',
            name: 'Computer Networks',
            shortCode: 'CN',
            icon: 'computerNetworks',
            status: 'active',
            locked: false,
            archived: false,
            order: 1,
            chapters: [
              { id: 'bpsc-c11-cn-1', name: 'Introduction to Networks', number: 1, status: 'published', locked: false, difficulty: 'Easy', estMinutes: 45, lastUpdated: '2026-08-01', mcqs: 20, flashcards: 15, notes: 2 },
              { id: 'bpsc-c11-cn-2', name: 'OSI Model', number: 2, status: 'published', locked: false, difficulty: 'Medium', estMinutes: 60, lastUpdated: '2026-08-02', mcqs: 25, flashcards: 18, notes: 1 },
              { id: 'bpsc-c11-cn-3', name: 'Routing Algorithms', number: 3, status: 'draft', locked: false, difficulty: 'Hard', estMinutes: 75, lastUpdated: '2026-08-03', mcqs: 10, flashcards: 5, notes: 0 },
            ],
          },
          {
            id: 'bpsc-c11-dbms',
            name: 'Database Management System',
            shortCode: 'DBMS',
            icon: 'dbms',
            status: 'active',
            locked: false,
            archived: false,
            order: 2,
            chapters: [
              { id: 'bpsc-c11-dbms-1', name: 'SQL Fundamentals', number: 1, status: 'published', locked: false, difficulty: 'Easy', estMinutes: 50, lastUpdated: '2026-07-28', mcqs: 30, flashcards: 20, notes: 3 },
              { id: 'bpsc-c11-dbms-2', name: 'Normalization', number: 2, status: 'draft', locked: false, difficulty: 'Medium', estMinutes: 65, lastUpdated: '2026-07-30', mcqs: 8, flashcards: 4, notes: 0 },
            ],
          },
        ],
      },
      {
        id: 'bpsc-c12',
        name: 'Class 12',
        status: 'active',
        locked: false,
        archived: false,
        order: 2,
        subjects: [
          {
            id: 'bpsc-c12-os',
            name: 'Operating System',
            shortCode: 'OS',
            icon: 'operatingSystems',
            status: 'active',
            locked: false,
            archived: false,
            order: 1,
            chapters: [
              { id: 'bpsc-c12-os-1', name: 'Process Management', number: 1, status: 'published', locked: false, difficulty: 'Medium', estMinutes: 70, lastUpdated: '2026-08-05', mcqs: 22, flashcards: 16, notes: 2 },
            ],
          },
          {
            id: 'bpsc-c12-coa',
            name: 'Computer Organization & Architecture',
            shortCode: 'COA',
            icon: 'computerOrganization',
            status: 'active',
            locked: false,
            archived: false,
            order: 2,
            chapters: [
              { id: 'bpsc-c12-coa-1', name: 'Memory Hierarchy', number: 1, status: 'draft', locked: false, difficulty: 'Hard', estMinutes: 80, lastUpdated: '2026-08-06', mcqs: 5, flashcards: 2, notes: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cbse',
    name: 'CBSE',
    shortCode: 'CBSE',
    status: 'active',
    locked: false,
    archived: false,
    order: 2,
    classes: [
      {
        id: 'cbse-c10',
        name: 'Class 10',
        status: 'active',
        locked: false,
        archived: false,
        order: 1,
        subjects: [
          {
            id: 'cbse-c10-ph',
            name: 'Physics',
            shortCode: 'PHY',
            icon: 'physics',
            status: 'active',
            locked: false,
            archived: false,
            order: 1,
            chapters: [
              { id: 'cbse-c10-ph-1', name: 'Light & Reflection', number: 1, status: 'published', locked: false, difficulty: 'Easy', estMinutes: 40, lastUpdated: '2026-07-20', mcqs: 15, flashcards: 10, notes: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ssc',
    name: 'SSC',
    shortCode: 'SSC',
    status: 'active',
    locked: false,
    archived: false,
    order: 3,
    classes: [],
  },
  {
    id: 'ctet',
    name: 'CTET',
    shortCode: 'CTET',
    status: 'active',
    locked: false,
    archived: false,
    order: 4,
    classes: [],
  },
  {
    id: 'upsc',
    name: 'UPSC',
    shortCode: 'UPSC',
    status: 'active',
    locked: false,
    archived: false,
    order: 5,
    classes: [],
  },
]

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

export function useAcademicStore() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { examinations }
}

// ── Helpers ───────────────────────────────────────────────────────
function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function findExam(examId) {
  return examinations.find((e) => e.id === examId)
}

function findClass(examId, classId) {
  const exam = findExam(examId)
  return exam?.classes.find((c) => c.id === classId)
}

function findSubject(examId, classId, subjectId) {
  const cls = findClass(examId, classId)
  return cls?.subjects.find((s) => s.id === subjectId)
}

function findChapter(examId, classId, subjectId, chapterId) {
  const subject = findSubject(examId, classId, subjectId)
  return subject?.chapters.find((c) => c.id === chapterId)
}

// ── Content health computation ────────────────────────────────────
export function computeHealth(chapters) {
  if (!chapters || chapters.length === 0) return { score: 0, issues: [] }
  const issues = []
  let score = 0
  chapters.forEach((ch) => {
    let chScore = 0
    if (ch.mcqs > 0) chScore += 1
    if (ch.flashcards > 0) chScore += 1
    if (ch.notes > 0) chScore += 1
    if (ch.status === 'published') chScore += 1
    score += chScore / 4
    if (ch.mcqs === 0) issues.push(`No MCQs in "${ch.name}"`)
    if (ch.flashcards === 0) issues.push(`No Flashcards in "${ch.name}"`)
    if (ch.notes === 0) issues.push(`No Notes in "${ch.name}"`)
  })
  return { score: Math.round((score / chapters.length) * 100), issues: issues.slice(0, 4) }
}

export function computeStats(exam) {
  let classes = 0
  let subjects = 0
  let chapters = 0
  let mcqs = 0
  let flashcards = 0
  let notes = 0
  exam.classes.forEach((cls) => {
    classes += 1
    cls.subjects.forEach((sub) => {
      subjects += 1
      sub.chapters.forEach((ch) => {
        chapters += 1
        mcqs += ch.mcqs || 0
        flashcards += ch.flashcards || 0
        notes += ch.notes || 0
      })
    })
  })
  return { classes, subjects, chapters, mcqs, flashcards, notes }
}

// ── Examination CRUD ──────────────────────────────────────────────
export function addExamination({ name, shortCode }) {
  const exam = {
    id: nextId('exam'),
    name: name || 'New Examination',
    shortCode: shortCode || name?.slice(0, 4).toUpperCase() || 'NEW',
    status: 'active',
    locked: false,
    archived: false,
    order: examinations.length + 1,
    classes: [],
  }
  examinations = [...examinations, exam]
  emit()
  return exam
}

export function updateExamination(id, patch) {
  examinations = examinations.map((e) => (e.id === id ? { ...e, ...patch } : e))
  emit()
}

export function deleteExamination(id) {
  const target = findExam(id)
  const stats = target ? computeStats(target) : { classes: 0, subjects: 0, chapters: 0, mcqs: 0, flashcards: 0, notes: 0 }
  examinations = examinations.filter((e) => e.id !== id)
  emit()
  return { name: target?.name, ...stats }
}

export function duplicateExamination(id) {
  const target = findExam(id)
  if (!target) return
  const copy = JSON.parse(JSON.stringify(target))
  copy.id = nextId('exam')
  copy.name = `${target.name} (Copy)`
  copy.order = examinations.length + 1
  examinations = [...examinations, copy]
  emit()
  return copy
}

// ── Class CRUD ────────────────────────────────────────────────────
export function addClass(examId, { name }) {
  const exam = findExam(examId)
  if (!exam) return
  const cls = {
    id: nextId('class'),
    name: name || 'New Class',
    status: 'active',
    locked: false,
    archived: false,
    order: exam.classes.length + 1,
    subjects: [],
  }
  examinations = examinations.map((e) => (e.id === examId ? { ...e, classes: [...e.classes, cls] } : e))
  emit()
  return cls
}

export function updateClass(examId, classId, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, ...patch } : c)) }
  })
  emit()
}

export function deleteClass(examId, classId) {
  const cls = findClass(examId, classId)
  let stats = { subjects: 0, chapters: 0, mcqs: 0, flashcards: 0, notes: 0 }
  if (cls) {
    stats = { subjects: cls.subjects.length, chapters: cls.subjects.reduce((n, s) => n + s.chapters.length, 0), mcqs: 0, flashcards: 0, notes: 0 }
    cls.subjects.forEach((s) => s.chapters.forEach((ch) => { stats.mcqs += ch.mcqs; stats.flashcards += ch.flashcards; stats.notes += ch.notes }))
  }
  examinations = examinations.map((e) => (e.id === examId ? { ...e, classes: e.classes.filter((c) => c.id !== classId) } : e))
  emit()
  return { name: cls?.name, ...stats }
}

export function duplicateClass(examId, classId) {
  const cls = findClass(examId, classId)
  if (!cls) return
  const copy = JSON.parse(JSON.stringify(cls))
  copy.id = nextId('class')
  copy.name = `${cls.name} (Copy)`
  copy.order = findExam(examId).classes.length + 1
  examinations = examinations.map((e) => (e.id === examId ? { ...e, classes: [...e.classes, copy] } : e))
  emit()
  return copy
}

// ── Subject CRUD ──────────────────────────────────────────────────
export function addSubject(examId, classId, { name, shortCode, icon }) {
  const cls = findClass(examId, classId)
  if (!cls) return
  const subject = {
    id: nextId('subject'),
    name: name || 'New Subject',
    shortCode: shortCode || name?.split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase() || 'SUB',
    icon: icon || 'chapters',
    status: 'active',
    locked: false,
    archived: false,
    order: cls.subjects.length + 1,
    chapters: [],
  }
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: [...c.subjects, subject] } : c)) }
  })
  emit()
  return subject
}

export function updateSubject(examId, classId, subjectId, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, ...patch } : s)) } : c)) }
  })
  emit()
}

export function deleteSubject(examId, classId, subjectId) {
  const subject = findSubject(examId, classId, subjectId)
  let stats = { chapters: 0, mcqs: 0, flashcards: 0, notes: 0 }
  if (subject) {
    stats = { chapters: subject.chapters.length, mcqs: 0, flashcards: 0, notes: 0 }
    subject.chapters.forEach((ch) => { stats.mcqs += ch.mcqs; stats.flashcards += ch.flashcards; stats.notes += ch.notes })
  }
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.filter((s) => s.id !== subjectId) } : c)) }
  })
  emit()
  return { name: subject?.name, ...stats }
}

export function duplicateSubject(examId, classId, subjectId) {
  const subject = findSubject(examId, classId, subjectId)
  if (!subject) return
  const copy = JSON.parse(JSON.stringify(subject))
  copy.id = nextId('subject')
  copy.name = `${subject.name} (Copy)`
  copy.order = findClass(examId, classId).subjects.length + 1
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: [...c.subjects, copy] } : c)) }
  })
  emit()
  return copy
}

// ── Chapter CRUD ──────────────────────────────────────────────────
export function addChapter(examId, classId, subjectId, { name, difficulty, estMinutes }) {
  const subject = findSubject(examId, classId, subjectId)
  if (!subject) return
  const chapter = {
    id: nextId('chapter'),
    name: name || 'New Chapter',
    number: subject.chapters.length + 1,
    status: 'draft',
    locked: false,
    difficulty: difficulty || 'Easy',
    estMinutes: estMinutes || 45,
    lastUpdated: new Date().toISOString().slice(0, 10),
    mcqs: 0,
    flashcards: 0,
    notes: 0,
  }
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: [...s.chapters, chapter] } : s)) } : c)) }
  })
  emit()
  return chapter
}

export function updateChapter(examId, classId, subjectId, chapterId, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: s.chapters.map((ch) => (ch.id === chapterId ? { ...ch, ...patch } : ch)) } : s)) } : c)) }
  })
  emit()
}

export function deleteChapter(examId, classId, subjectId, chapterId) {
  const chapter = findChapter(examId, classId, subjectId, chapterId)
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: s.chapters.filter((ch) => ch.id !== chapterId) } : s)) } : c)) }
  })
  emit()
  return { name: chapter?.name, mcqs: chapter?.mcqs || 0, flashcards: chapter?.flashcards || 0, notes: chapter?.notes || 0 }
}

export function duplicateChapter(examId, classId, subjectId, chapterId) {
  const chapter = findChapter(examId, classId, subjectId, chapterId)
  if (!chapter) return
  const copy = JSON.parse(JSON.stringify(chapter))
  copy.id = nextId('chapter')
  copy.name = `${chapter.name} (Copy)`
  copy.number = findSubject(examId, classId, subjectId).chapters.length + 1
  copy.status = 'draft'
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: [...s.chapters, copy] } : s)) } : c)) }
  })
  emit()
  return copy
}

// ── Bulk operations ───────────────────────────────────────────────
export function bulkUpdateClasses(examId, ids, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (ids.includes(c.id) ? { ...c, ...patch } : c)) }
  })
  emit()
}

export function bulkUpdateSubjects(examId, classId, ids, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s)) } : c)) }
  })
  emit()
}

export function bulkUpdateChapters(examId, classId, subjectId, ids, patch) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: s.chapters.map((ch) => (ids.includes(ch.id) ? { ...ch, ...patch } : ch)) } : s)) } : c)) }
  })
  emit()
}

// ── Reorder ───────────────────────────────────────────────────────
export function reorderExaminations(orderedIds) {
  examinations = examinations.map((e) => ({ ...e, order: orderedIds.indexOf(e.id) + 1 }))
  emit()
}

export function reorderClasses(examId, orderedIds) {
  examinations = examinations.map((e) => (e.id === examId ? { ...e, classes: e.classes.map((c) => ({ ...c, order: orderedIds.indexOf(c.id) + 1 })) } : e))
  emit()
}

export function reorderSubjects(examId, classId, orderedIds) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => ({ ...s, order: orderedIds.indexOf(s.id) + 1 })) } : c)) }
  })
  emit()
}

export function reorderChapters(examId, classId, subjectId, orderedIds) {
  examinations = examinations.map((e) => {
    if (e.id !== examId) return e
    return { ...e, classes: e.classes.map((c) => (c.id === classId ? { ...c, subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, chapters: s.chapters.map((ch) => ({ ...ch, number: orderedIds.indexOf(ch.id) + 1 })) } : s)) } : c)) }
  })
  emit()
}

// ── Lookup helpers for AI Studio preload ──────────────────────────
export function getChapterContext(examId, classId, subjectId, chapterId) {
  const exam = findExam(examId)
  const cls = findClass(examId, classId)
  const subject = findSubject(examId, classId, subjectId)
  const chapter = findChapter(examId, classId, subjectId, chapterId)
  return {
    examination: exam?.name || '',
    className: cls?.name || '',
    subject: subject?.name || '',
    chapter: chapter?.name || '',
  }
}