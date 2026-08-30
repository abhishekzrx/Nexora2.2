import { useMemo } from 'react'
import { useAdminStore, matchContentToChapter, applyChapterOverrides } from './adminStore.js'
import { useUserProgressStore } from './progressStore.js'
import {
  calculateChapterMetrics,
  calculateSubjectMetrics,
  getAttemptCoverageLevel,
} from '../services/mcqAnalyticsService.js'
import { formatPriority, getBpscChapterMeta } from './bpscPrelimsChapters.js'

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

function buildSubjectEntry(key, subject, index, progressList = []) {
  const chapters = subject.chapters
    .filter((ch) => !ch.archived)
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .map((ch, ci) => {
      const totalMcqs = typeof ch.totalMcqs === 'number' ? ch.totalMcqs : (typeof ch.mcqs === 'number' ? ch.mcqs : 0)
      const totalFlashcards = typeof ch.totalFlashcards === 'number' ? ch.totalFlashcards : (typeof ch.flashcards === 'number' ? ch.flashcards : 0)
      
      // Filter progress records belonging to this chapter or its MCQs
      const chMcqIds = new Set(Array.isArray(ch.chMcqs) ? ch.chMcqs.map((m) => String(m.id)) : [])
      const chProgressRecords = progressList.filter((rec) => {
        if (!rec) return false
        const recChapId = rec.chapter_id || rec.chapterId
        if (recChapId && ch.id && String(recChapId) === String(ch.id)) return true
        const recMcqId = String(rec.mcq_id || rec.mcqId || '')
        if (recMcqId && chMcqIds.has(recMcqId)) return true
        return false
      })

      const metrics = calculateChapterMetrics(totalMcqs, chProgressRecords)

      const bpscMeta = getBpscChapterMeta(ch.name || ch.title, ch.code || ch.slug)
      const code = ch.code || (bpscMeta ? bpscMeta.code : '')
      const rawPriority = ch.priority || (bpscMeta ? bpscMeta.priority : 'M')
      const prioInfo = formatPriority(rawPriority)

      const subText = metrics.attemptedMcqs > 0
        ? `${metrics.attemptedMcqs} / ${metrics.totalMcqs} MCQs`
        : `${metrics.totalMcqs} MCQs`

      return {
        id: ch.id,
        num: String(ch.number || ci + 1).padStart(2, '0'),
        number: Number(ch.number) || ci + 1,
        code,
        priority: prioInfo.code,
        priorityLabel: prioInfo.label,
        priorityTone: prioInfo.tone,
        desc: ch.desc || ch.description || (bpscMeta ? bpscMeta.description : ''),
        title: ch.name || ch.title || 'Chapter',
        sub: subText,
        totalMcqs: metrics.totalMcqs,
        attemptedMcqs: metrics.attemptedMcqs,
        masteredMcqs: metrics.masteredMcqs,
        remainingQuestions: metrics.remainingQuestions,
        coveragePercent: metrics.coveragePercent,
        masteryPercent: metrics.masteryPercentage,
        accuracyPercent: metrics.accuracyPercentage,
        coverageLevel: metrics.coverageLevel,
        totalCorrectResponses: metrics.totalCorrectResponses,
        totalResponses: metrics.totalResponses,
        progress: metrics.coveragePercent, // Circular coverage %
        pct: `${metrics.masteryPercentage}%`, // Numeric mastery %
        complete: metrics.coveragePercent === 100 && metrics.masteryPercentage === 100,
        meta: `${metrics.totalMcqs} MCQs • ${totalFlashcards} Flashcards`,
        locked: Boolean(ch.locked),
        status: ch.locked ? 'locked' : ch.status || 'draft',
      }
    })

  const subjectMetrics = calculateSubjectMetrics(chapters)
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
    progress: subjectMetrics.subjectCoveragePercent,
    accuracy: subjectMetrics.subjectMasteryPercentage,
    coveragePercent: subjectMetrics.subjectCoveragePercent,
    masteryPercent: subjectMetrics.subjectMasteryPercentage,
    accuracyPercent: subjectMetrics.subjectAccuracyPercentage,
    remainingQuestions: subjectMetrics.subjectRemainingQuestions,
    coverageLevel: subjectMetrics.subjectCoverageLevel,
    totalMcqs: subjectMetrics.subjectTotalMcqs,
    attemptedMcqs: subjectMetrics.subjectAttemptedMcqs,
    masteredMcqs: subjectMetrics.subjectMasteredMcqs,
    hasAttempts: subjectMetrics.subjectAttemptedMcqs > 0,
    desc: subject.desc || '',
    counts: {
      chapters: chapters.length,
      mcqs: subjectMetrics.subjectTotalMcqs,
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
  const userProgressState = useUserProgressStore()

  const subjects = adminState.allSubjects || adminState.subjects || []
  const rawChapters = adminState.allChapters || adminState.chapters || []
  const chapters = useMemo(() => applyChapterOverrides(rawChapters), [rawChapters])
  const mcqs = adminState.allMcqs || adminState.mcqs || []
  const flashcards = adminState.allFlashcards || adminState.flashcards || []
  const progressList = userProgressState.progressList || []

  const courseSubjects = useMemo(() => {
    if (!courseId) return subjects
    return subjects.filter((s) => !s.courseId || s.courseId === courseId)
  }, [courseId, subjects])

  const courseChapters = useMemo(() => {
    if (!courseId) return chapters
    return chapters.filter((c) => !c.courseId || c.courseId === courseId)
  }, [courseId, chapters])

  const courseMcqs = useMemo(() => {
    if (!courseId) return mcqs
    return mcqs.filter((m) => !m.courseId || m.courseId === courseId)
  }, [courseId, mcqs])

  const courseFlashcards = useMemo(() => {
    if (!courseId) return flashcards
    return flashcards.filter((f) => !f.courseId || f.courseId === courseId)
  }, [courseId, flashcards])

  const snapshot = useMemo(() => {
    const catalog = {}
    const orderedKeys = []

    courseSubjects.forEach((sub, index) => {
      const key = subjectKeyFor(sub.name, sub.id)
      const subChapters = courseChapters.filter((c) => {
        if (!c) return false
        const chSubKey = subjectKeyFor(c.subject || c.subjectName, c.subjectId || c.subject_id)
        return (
          c.subject === sub.name ||
          c.subjectId === sub.id ||
          c.subject === sub.id ||
          c.subject_id === sub.id ||
          c.subject === key ||
          c.subjectId === key ||
          chSubKey === key
        )
      })

      const subMcqs = courseMcqs.filter((m) => {
        if (!m) return false
        const mSubKey = subjectKeyFor(m.subject || m.subjectName, m.subjectId || m.subject_id)
        return (
          m.subject === sub.name ||
          m.subjectId === sub.id ||
          m.subject === sub.id ||
          m.subject_id === sub.id ||
          m.subject === key ||
          m.subjectId === key ||
          mSubKey === key
        )
      })

      const subFlashcards = courseFlashcards.filter((f) => {
        if (!f) return false
        const fSubKey = subjectKeyFor(f.subject || f.subjectName, f.subjectId || f.subject_id)
        return (
          f.subject === sub.name ||
          f.subjectId === sub.id ||
          f.subject === sub.id ||
          f.subject_id === sub.id ||
          f.subject === key ||
          f.subjectId === key ||
          fSubKey === key
        )
      })

      const enrichedChapters = subChapters.map((ch) => {
        const chMcqs = subMcqs.filter((m) => matchContentToChapter(m, ch))
        const chFlash = subFlashcards.filter((f) => matchContentToChapter(f, ch))

        const totalMcqs = chMcqs.length
        const totalFlashcards = chFlash.length > 0 ? chFlash.length : (typeof ch.flashcards === 'number' ? ch.flashcards : 0)

        return {
          ...ch,
          chMcqs,
          mcqs: totalMcqs,
          totalMcqs,
          flashcards: totalFlashcards,
          totalFlashcards,
        }
      })

      const actualSubjectMcqs = enrichedChapters.reduce((sum, c) => sum + (c.totalMcqs || 0), 0)

      const enrichedSubject = {
        ...sub,
        chapters: enrichedChapters,
        mcqs: actualSubjectMcqs,
        flashcards: subFlashcards.length || sub.flashcards || 0,
        notes: sub.notes || 0,
      }

      catalog[key] = buildSubjectEntry(key, enrichedSubject, index, progressList)
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
  }, [courseSubjects, courseChapters, courseMcqs, courseFlashcards, progressList])

  return snapshot
}

export function getCourseSnapshot(courseId, subjects, chapters, mcqs, flashcards, progressList = []) {
  const courseSubjects = subjects.filter((s) => s.courseId === courseId)
  const courseChapters = chapters.filter((c) => c.courseId === courseId)
  const courseMcqs = mcqs.filter((m) => m.courseId === courseId)
  const courseFlashcards = flashcards.filter((f) => f.courseId === courseId)

  const catalog = {}
  const orderedKeys = []
  courseSubjects.forEach((sub, index) => {
    const key = subjectKeyFor(sub.name, sub.id)
    const subChapters = courseChapters.filter(
      (c) => c.subjectId === sub.id || c.subject_id === sub.id || c.subject === sub.name
    )
    const subMcqs = courseMcqs.filter(
      (m) => m.subjectId === sub.id || m.subject_id === sub.id || m.subject === sub.name
    )
    const subFlashcards = courseFlashcards.filter(
      (f) => f.subjectId === sub.id || f.subject_id === sub.id || f.subject === sub.name
    )

    const enrichedChapters = subChapters.map((ch) => {
      const chMcqs = subMcqs.filter((m) => matchContentToChapter(m, ch))
      const chFlash = subFlashcards.filter((f) => matchContentToChapter(f, ch))
      const totalMcqs = chMcqs.length
      const totalFlashcards = chFlash.length > 0 ? chFlash.length : (typeof ch.flashcards === 'number' ? ch.flashcards : 0)
      return {
        ...ch,
        chMcqs,
        mcqs: totalMcqs,
        totalMcqs,
        flashcards: totalFlashcards,
        totalFlashcards,
      }
    })

    const actualSubjectMcqs = enrichedChapters.reduce((sum, c) => sum + (c.totalMcqs || 0), 0)

    const enrichedSubject = {
      ...sub,
      chapters: enrichedChapters,
      mcqs: actualSubjectMcqs,
      flashcards: subFlashcards.length || sub.flashcards || 0,
      notes: 0,
    }
    catalog[key] = buildSubjectEntry(key, enrichedSubject, index, progressList)
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

