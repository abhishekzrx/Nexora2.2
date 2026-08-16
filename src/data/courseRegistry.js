/**
 * courseRegistry
 * Course-aware content registry that derives student-facing views
 * from the adminStore for a specific Course.
 *
 * This bridges the admin-centric Course architecture with the
 * student-facing experience.
 *
 * When a student selects a Course, this registry provides:
 * - Subject catalog (from adminStore subjects)
 * - Chapter lists (from adminStore chapters)
 * - Content counts (MCQs, Flashcards, Notes)
 * - Progress estimates
 *
 * Fallback: if no course is selected or course has no content,
 * returns empty state data.
 */

import { useMemo } from 'react'
import { useAdminStore, matchContentToChapter } from './adminStore'

const ACCENT_PALETTE = [
  { accent: '#F1621B', accentLight: '#FF7A2E', accentBg: '#FFF1E6', accentSoft: '#FDECE3' },
  { accent: '#2E5CE6', accentLight: '#4F7AF7', accentBg: '#EEF2FF', accentSoft: '#E7EDFD' },
  { accent: '#12B76A', accentLight: '#2ACB7A', accentBg: '#E9F9F1', accentSoft: '#DFF7EA' },
  { accent: '#7C3AED', accentLight: '#9B5CFF', accentBg: '#F1EDFC', accentSoft: '#EFE6FC' },
  { accent: '#0E9494', accentLight: '#13BABA', accentBg: '#E6F7F7', accentSoft: '#DDF4F4' },
  { accent: '#E8491D', accentLight: '#FF6A3D', accentBg: '#FDECE7', accentSoft: '#FCE2DC' },
]

const ICON_LIBRARY = [
  'computerNetworks',
  'operatingSystems',
  'dbms',
  'digitalElectronics',
  'dataStructures',
  'computerOrganization',
  'physics',
  'chemistry',
]

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function subjectKeyFor(subjectName, subjectId) {
  if (subjectId && /^[a-z0-9-]+$/.test(subjectId)) return subjectId
  return String(subjectName || 'subject')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSubjectEntry(key, subject, index) {
  const chapters = subject.chapters
    .filter((ch) => !ch.archived)
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .map((ch, ci) => {
      const rawMcqs = typeof ch.totalMcqs === 'number' ? ch.totalMcqs : (typeof ch.mcqs === 'number' ? ch.mcqs : 0)
      const totalMcqs = rawMcqs === 1000 ? 0 : rawMcqs
      const rawFlash = typeof ch.totalFlashcards === 'number' ? ch.totalFlashcards : (typeof ch.flashcards === 'number' ? ch.flashcards : 0)
      const totalFlashcards = rawFlash === 1000 ? 0 : rawFlash
      const answeredMcqs = typeof ch.answeredMcqs === 'number' ? ch.answeredMcqs : 0
      
      const progress = totalMcqs > 0
        ? Math.min(100, Math.max(0, Math.round((answeredMcqs / totalMcqs) * 100)))
        : (ch.completion && typeof ch.completion === 'number' ? Math.min(100, Math.max(0, ch.completion)) : 0)

      return {
        num: String(ch.number || ci + 1).padStart(2, '0'),
        title: ch.name || ch.title || 'Chapter',
        sub: ch.difficulty ? `${ch.difficulty.toUpperCase()} • ${ch.estMinutes || 45} min` : `${ch.status || 'draft'} • ${ch.estMinutes || 45} min`,
        progress,
        pct: `${progress}%`,
        complete: progress === 100,
        meta: `${totalMcqs} MCQs • ${totalFlashcards} Flashcards`,
        locked: Boolean(ch.locked),
        status: ch.locked ? 'locked' : ch.status || 'draft',
        id: ch.id,
      }
    })

  const averageProgress = chapters.length
    ? Math.round(chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length)
    : 0

  const palette = ACCENT_PALETTE[index % ACCENT_PALETTE.length]
  const icon = subject.icon || ICON_LIBRARY[index % ICON_LIBRARY.length]
  const locked = Boolean(subject.locked)
  const badge = locked
    ? 'LOCKED'
    : (subject.status || 'active').toUpperCase().slice(0, 6) === 'DRAFT'
      ? 'DRAFT'
      : subject.status === 'published'
        ? 'READY'
        : index % 2 === 0
          ? 'MEDIUM'
          : 'HARD'

  return {
    subjectKey: key,
    subjectId: subject.id,
    title: subject.name,
    shortCode: subject.shortCode,
    icon,
    badge,
    progress: averageProgress,
    desc: subject.desc || '',
    counts: {
      chapters: chapters.length,
      mcqs: subject.mcqs || 0,
      flashcards: subject.flashcards || 0,
      notes: subject.notes || 0,
    },
    accent: subject.accent || palette.accent,
    accentLight: subject.accentLight || palette.accentLight,
    accentBg: subject.accentBg || palette.accentBg,
    accentSoft: subject.accentSoft || palette.accentSoft,
    chapters,
    locked,
    status: subject.status || 'active',
    order: subject.order || index + 1,
    examName: '',
    examId: '',
    className: '',
    classId: '',
  }
}

export function useCourseRegistry(courseId) {
  const adminState = useAdminStore()
  const subjects = adminState.allSubjects || adminState.subjects || []
  const chapters = adminState.allChapters || adminState.chapters || []
  const mcqs = adminState.allMcqs || adminState.mcqs || []
  const flashcards = adminState.allFlashcards || adminState.flashcards || []

  const courseSubjects = useMemo(() => {
    if (!courseId) return []
    return subjects.filter((s) => s.courseId === courseId)
  }, [courseId, subjects])

  const courseChapters = useMemo(() => {
    if (!courseId) return []
    return chapters.filter((c) => c.courseId === courseId)
  }, [courseId, chapters])

  const courseMcqs = useMemo(() => {
    if (!courseId) return []
    return mcqs.filter((m) => m.courseId === courseId)
  }, [courseId, mcqs])

  const courseFlashcards = useMemo(() => {
    if (!courseId) return []
    return flashcards.filter((f) => f.courseId === courseId)
  }, [courseId, flashcards])

  const snapshot = useMemo(() => {
    const catalog = {}
    const orderedKeys = []

    courseSubjects.forEach((sub, index) => {
      const key = subjectKeyFor(sub.name, sub.id)
      const subChapters = courseChapters.filter(
        (c) => (c.subject === sub.name || c.subjectId === sub.id || c.subject === sub.id) && c.courseId === courseId
      )
      const subMcqs = courseMcqs.filter(
        (m) => (m.subject === sub.name || m.subjectId === sub.id || m.subject === sub.id) && m.courseId === courseId
      )
      const subFlashcards = courseFlashcards.filter(
        (f) => (f.subject === sub.name || f.subjectId === sub.id || f.subject === sub.id) && f.courseId === courseId
      )

      const enrichedChapters = subChapters.map((ch) => {
        const chMcqs = subMcqs.filter((m) => matchContentToChapter(m, ch))
        const chFlash = subFlashcards.filter((f) => matchContentToChapter(f, ch))

        const totalMcqs = chMcqs.length > 0 ? chMcqs.length : (typeof ch.mcqs === 'number' && ch.mcqs !== 1000 ? ch.mcqs : 0)
        const totalFlashcards = chFlash.length > 0 ? chFlash.length : (typeof ch.flashcards === 'number' && ch.flashcards !== 1000 ? ch.flashcards : 0)

        return {
          ...ch,
          mcqs: totalMcqs,
          totalMcqs,
          flashcards: totalFlashcards,
          totalFlashcards,
        }
      })

      const enrichedSubject = {
        ...sub,
        chapters: enrichedChapters,
        mcqs: subMcqs.length || sub.mcqs || 0,
        flashcards: subFlashcards.length || sub.flashcards || 0,
        notes: sub.notes || 0,
      }

      catalog[key] = buildSubjectEntry(key, enrichedSubject, index)
      orderedKeys.push(key)
    })

    const list = orderedKeys.map((k) => catalog[k]).filter(Boolean)

    return {
      subjectCatalog: catalog,
      subjectsList: list,
      orderedKeys,
      subjectCount: list.length,
      chapterCount: list.reduce((n, s) => n + (s.chapters?.length || 0), 0),
      mcqCount: list.reduce((n, s) => n + (s.counts?.mcqs || 0), 0),
      flashcardCount: list.reduce((n, s) => n + (s.counts?.flashcards || 0), 0),
      noteCount: list.reduce((n, s) => n + (s.counts?.notes || 0), 0),
      lockedSubjectCount: list.filter((s) => s.locked).length,
    }
  }, [courseSubjects, courseChapters, courseMcqs, courseFlashcards])

  return snapshot
}

export function getCourseSnapshot(courseId, subjects, chapters, mcqs, flashcards) {
  const courseSubjects = subjects.filter((s) => s.courseId === courseId)
  const courseChapters = chapters.filter((c) => c.courseId === courseId)
  const courseMcqs = mcqs.filter((m) => m.courseId === courseId)
  const courseFlashcards = flashcards.filter((f) => f.courseId === courseId)

  const catalog = {}
  const orderedKeys = []
  courseSubjects.forEach((sub, index) => {
    const key = subjectKeyFor(sub.name, sub.id)
    const subChapters = courseChapters.filter((c) => c.subject === sub.name)
    const enrichedSubject = {
      ...sub,
      chapters: subChapters,
      mcqs: courseMcqs.filter((m) => m.subject === sub.name).length,
      flashcards: courseFlashcards.filter((f) => f.subject === sub.name).length,
      notes: 0,
    }
    catalog[key] = buildSubjectEntry(key, enrichedSubject, index)
    orderedKeys.push(key)
  })

  const list = orderedKeys.map((k) => catalog[k]).filter(Boolean)
  return {
    subjectCatalog: catalog,
    subjectsList: list,
    orderedKeys,
    subjectCount: list.length,
    chapterCount: list.reduce((n, s) => n + (s.chapters?.length || 0), 0),
    mcqCount: list.reduce((n, s) => n + (s.counts?.mcqs || 0), 0),
    flashcardCount: list.reduce((n, s) => n + (s.counts?.flashcards || 0), 0),
    noteCount: list.reduce((n, s) => n + (s.counts?.notes || 0), 0),
    lockedSubjectCount: list.filter((s) => s.locked).length,
  }
}
