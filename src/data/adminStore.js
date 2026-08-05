/**
 * adminStore
 * Mutable in-memory store for the Admin Content Management System.
 * No backend — purely local mock data with full CRUD operations.
 *
 * Components subscribe via useAdminStore() and re-render automatically
 * whenever any CRUD operation mutates the store, so all counters and
 * related UI stay in sync without a page refresh.
 */
import { useSyncExternalStore } from 'react'
import {
  adminSubjects,
  chaptersData,
  allChapters,
  mcqRows,
  flashcardCards,
} from './adminData'

let listeners = []
let version = 0

// ── Seed state from adminData ─────────────────────────────────────
let subjects = adminSubjects.map((s) => ({ ...s, stats: s.stats.map((st) => ({ ...st })) }))
let chapters = allChapters.map((c) => ({ ...c }))
let mcqs = mcqRows.map((m) => ({ ...m }))
let flashcards = flashcardCards.map((f) => ({ ...f }))

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

export function useAdminStore() {
  useSyncExternalStore(subscribe, getSnapshot)
  return { subjects, chapters, mcqs, flashcards }
}

// ── Helpers ───────────────────────────────────────────────────────
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function recomputeSubjectStats(subject) {
  const subjectChapters = chapters.filter((c) => c.subject === subject.name)
  const subjectMcqs = mcqs.filter((m) => m.subject === subject.name)
  const subjectFlashcards = flashcards.filter((f) => f.subject === subject.name)
  subject.stats = [
    { value: String(subjectChapters.length), label: 'Chapters' },
    { value: String(subjectMcqs.length), label: 'MCQs' },
    { value: String(subjectFlashcards.length), label: 'Flashcards' },
    { value: 'Active', label: 'Status' },
  ]
}

function recomputeAllSubjectStats() {
  subjects.forEach(recomputeSubjectStats)
}

// ── Subject CRUD ──────────────────────────────────────────────────
export function addSubject({ name, icon, desc }) {
  const subject = {
    id: `s${nextId(subjects)}`,
    name: name || 'New Subject',
    icon: icon || 'chapters',
    desc: desc || '',
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  }
  subjects = [...subjects, subject]
  emit()
  return subject
}

export function updateSubject(id, { name, icon, desc }) {
  subjects = subjects.map((subject) => {
    if (subject.id !== id) return subject
    const updated = { ...subject, name: name || subject.name, icon: icon || subject.icon, desc: desc ?? subject.desc }
    // Rename cascades to chapters/mcqs/flashcards
    chapters = chapters.map((c) => (c.subject === subject.name ? { ...c, subject: updated.name } : c))
    mcqs = mcqs.map((m) => (m.subject === subject.name ? { ...m, subject: updated.name } : m))
    flashcards = flashcards.map((f) => (f.subject === subject.name ? { ...f, subject: updated.name } : f))
    return updated
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteSubject(id) {
  const target = subjects.find((s) => s.id === id)
  let impacted = { name: '', chapters: 0, mcqs: 0, flashcards: 0 }
  if (target) {
    const chapterCount = chapters.filter((c) => c.subject === target.name).length
    const mcqCount = mcqs.filter((m) => m.subject === target.name).length
    const flashcardCount = flashcards.filter((f) => f.subject === target.name).length
    impacted = { name: target.name, chapters: chapterCount, mcqs: mcqCount, flashcards: flashcardCount }
    chapters = chapters.filter((c) => c.subject !== target.name)
    mcqs = mcqs.filter((m) => m.subject !== target.name)
    flashcards = flashcards.filter((f) => f.subject !== target.name)
  }
  subjects = subjects.filter((s) => s.id !== id)
  emit()
  return impacted
}

/**
 * getDeleteSubjectImpact — returns affected child-content counts for a subject
 * WITHOUT deleting. Used to preview confirmation dialogs.
 */
export function getDeleteSubjectImpact(id) {
  const target = subjects.find((s) => s.id === id)
  if (!target) return { name: '', chapters: 0, mcqs: 0, flashcards: 0 }
  return {
    name: target.name,
    chapters: chapters.filter((c) => c.subject === target.name).length,
    mcqs: mcqs.filter((m) => m.subject === target.name).length,
    flashcards: flashcards.filter((f) => f.subject === target.name).length,
  }
}

// ── Chapter CRUD ──────────────────────────────────────────────────
export function addChapter({ subject, name, desc, number }) {
  const chapter = {
    id: nextId(chapters),
    name: name || 'New Chapter',
    subject: subject || 'Computer Networks',
    desc: desc || '',
    mcqs: 0,
    flashcards: 0,
    status: 'success',
    statusText: 'Active',
    number: number ? Number(number) : chapters.length + 1,
  }
  chapters = [...chapters, chapter]
  recomputeAllSubjectStats()
  emit()
  return chapter
}

export function updateChapter(id, { subject, name, desc, number }) {
  chapters = chapters.map((chapter) => {
    if (chapter.id !== id) return chapter
    return {
      ...chapter,
      name: name || chapter.name,
      subject: subject || chapter.subject,
      desc: desc ?? chapter.desc,
      number: number ? Number(number) : chapter.number,
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteChapter(id) {
  const target = chapters.find((c) => c.id === id)
  let impacted = { name: '', subject: '', mcqs: 0, flashcards: 0 }
  if (target) {
    const mcqCount = mcqs.filter((m) => m.chapter === target.name).length
    const flashcardCount = flashcards.filter((f) => f.chapter === target.name).length
    impacted = { name: target.name, subject: target.subject, mcqs: mcqCount, flashcards: flashcardCount }
    mcqs = mcqs.filter((m) => m.chapter !== target.name)
    flashcards = flashcards.filter((f) => f.chapter !== target.name)
  }
  chapters = chapters.filter((c) => c.id !== id)
  recomputeAllSubjectStats()
  emit()
  return impacted
}

/**
 * getDeleteChapterImpact — returns affected MCQ/flashcard counts for a chapter
 * WITHOUT deleting. Used to preview confirmation dialogs.
 */
export function getDeleteChapterImpact(id) {
  const target = chapters.find((c) => c.id === id)
  if (!target) return { name: '', subject: '', mcqs: 0, flashcards: 0 }
  return {
    name: target.name,
    subject: target.subject,
    mcqs: mcqs.filter((m) => m.chapter === target.name).length,
    flashcards: flashcards.filter((f) => f.chapter === target.name).length,
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
  const mcq = {
    id: nextId(mcqs),
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
  const count = mcqs.filter((m) => m.chapter === chapterName).length
  mcqs = mcqs.filter((m) => m.chapter !== chapterName)
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteMcqsBySubject(subjectName) {
  const count = mcqs.filter((m) => m.subject === subjectName).length
  mcqs = mcqs.filter((m) => m.subject !== subjectName)
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllMcqs() {
  const count = mcqs.length
  mcqs = []
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Flashcard CRUD ────────────────────────────────────────────────
export function addFlashcard({ subject, chapter, front, back }) {
  const flashcard = {
    id: nextId(flashcards),
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
  const count = flashcards.filter((f) => f.chapter === chapterName).length
  flashcards = flashcards.filter((f) => f.chapter !== chapterName)
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteFlashcardsBySubject(subjectName) {
  const count = flashcards.filter((f) => f.subject === subjectName).length
  flashcards = flashcards.filter((f) => f.subject !== subjectName)
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllFlashcards() {
  const count = flashcards.length
  flashcards = []
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Bulk injection (AI Content Studio) ────────────────────────────
/**
 * injectMcqs — bulk-import MCQs from AI-generated JSON.
 * Each record: { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter }
 * Returns { imported, duplicates, failed, lastSubject, lastChapter }
 */
export function injectMcqs(records) {
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.question || !record.subject || !record.chapter) {
      failed += 1
      return
    }
    const exists = mcqs.some((m) => m.question.toLowerCase() === String(record.question).toLowerCase())
    if (exists) {
      duplicates += 1
      return
    }
    const options = [record.optionA, record.optionB, record.optionC, record.optionD].map((o) => o || '')
    const correctMap = { A: 0, B: 1, C: 2, D: 3 }
    const correct = correctMap[String(record.correctAnswer || 'A').toUpperCase()] ?? 0
    const difficulty = record.difficulty || 'Easy'
    mcqs = [
      ...mcqs,
      {
        id: nextId(mcqs),
        question: record.question,
        options,
        correct,
        subject: record.subject,
        chapter: record.chapter,
        difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
        difficultyText: difficulty,
        attempts: '0',
        accuracy: '—',
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

/**
 * injectFlashcards — bulk-import flashcards from AI-generated JSON.
 * Each record: { front, back, subject, chapter }
 * Returns { imported, duplicates, failed, lastSubject, lastChapter }
 */
export function injectFlashcards(records) {
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.front || !record.back || !record.subject || !record.chapter) {
      failed += 1
      return
    }
    const exists = flashcards.some((f) => f.front.toLowerCase() === String(record.front).toLowerCase())
    if (exists) {
      duplicates += 1
      return
    }
    flashcards = [
      ...flashcards,
      {
        id: nextId(flashcards),
        subject: record.subject,
        chapter: record.chapter,
        front: record.front,
        back: record.back,
        views: '0 views',
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

// ── Derived counts for dashboard summary cards ────────────────────
export function getCounts() {
  return {
    subjects: subjects.length,
    chapters: chapters.length,
    mcqs: mcqs.length,
    flashcards: flashcards.length,
  }
}

// ── Chapter ordering (reorder) ────────────────────────────────────
export function saveChapterOrder(subjectName, orderedChapters) {
  const orderMap = new Map(orderedChapters.map((c, index) => [c.id, index + 1]))
  chapters = chapters.map((chapter) => {
    if (chapter.subject !== subjectName) return chapter
    const newNumber = orderMap.get(chapter.id)
    return newNumber ? { ...chapter, number: newNumber } : chapter
  })
  emit()
}