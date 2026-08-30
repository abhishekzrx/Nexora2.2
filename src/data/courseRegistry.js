import { useMemo } from 'react'
import { useAdminStore, matchContentToChapter, applyChapterOverrides } from './adminStore.js'
import { useUserProgressStore } from './progressStore.js'
import {
  calculateChapterMetrics,
  calculateSubjectMetrics,
  getAttemptCoverageLevel,
} from '../services/mcqAnalyticsService.js'
import { calculateDeepChapterPerformance } from '../services/chapterAnalyticsService.js'
import { calculateSubjectIntelligence } from '../services/subjectAnalyticsService.js'
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

      const bpscMeta = getBpscChapterMeta(ch.name || ch.title, ch.code || ch.slug)
      const code = ch.code || (bpscMeta ? bpscMeta.code : '')
      const rawPriority = ch.priority || (bpscMeta ? bpscMeta.priority : 'M')
      const prioInfo = formatPriority(rawPriority)

      const deepMetrics = calculateDeepChapterPerformance(totalMcqs, chProgressRecords, prioInfo.code, ch.id)

      const subText = deepMetrics.attemptedMcqs > 0
        ? `${deepMetrics.attemptedMcqs} / ${deepMetrics.totalMcqs} MCQs`
        : `${deepMetrics.totalMcqs} MCQs`

      return {
        id: ch.id,
        num: String(ch.number || ci + 1).padStart(2, '0'),
        number: Number(ch.number) || ci + 1,
        code,
        priority: prioInfo.code,
        priorityLabel: prioInfo.label,
        priorityTone: prioInfo.tone,
        priorityClass: prioInfo.className || `prio-${prioInfo.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        desc: ch.desc || ch.description || (bpscMeta ? bpscMeta.description : ''),
        title: ch.name || ch.title || 'Chapter',
        sub: subText,
        totalMcqs: deepMetrics.totalMcqs,
        attemptedMcqs: deepMetrics.attemptedMcqs,
        masteredMcqs: deepMetrics.masteredMcqs,
        incorrectMcqs: deepMetrics.incorrectMcqs,
        unseenMcqs: deepMetrics.unseenMcqs,
        remainingQuestions: deepMetrics.remainingQuestions,
        remainingUnmastered: deepMetrics.remainingUnmastered,
        coveragePercent: deepMetrics.coveragePercent,
        masteryPercent: deepMetrics.masteryPercentage,
        accuracyPercent: deepMetrics.accuracyPercentage,
        consistencyScore: deepMetrics.consistencyScore,
        revisionScore: deepMetrics.revisionScore,
        revisionRequirement: deepMetrics.revisionRequirement,
        readinessScore: deepMetrics.readinessScore,
        confidenceLevel: deepMetrics.confidenceLevel,
        coverageLevel: deepMetrics.coverageLevel,
        totalCorrectResponses: deepMetrics.totalCorrectResponses,
        totalResponses: deepMetrics.totalResponses,
        trendDirection: deepMetrics.trendDirection,
        trendSymbol: deepMetrics.trendSymbol,
        trendDelta: deepMetrics.trendDelta,
        trendLabel: deepMetrics.trendLabel,
        hasTrendHistory: deepMetrics.hasTrendHistory,
        progress: deepMetrics.readinessScore, // Primary readiness
        pct: `${deepMetrics.readinessScore}%`,
        complete: deepMetrics.coveragePercent === 100 && deepMetrics.masteryPercentage === 100,
        meta: `${deepMetrics.totalMcqs} MCQs • ${totalFlashcards} Flashcards`,
        locked: Boolean(ch.locked),
        status: ch.locked ? 'locked' : ch.status || 'draft',
      }
    })

  const subjectIntelligence = calculateSubjectIntelligence(subject, chapters, subject.id || key)
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
    readinessScore: subjectIntelligence.subjectReadinessScore,
    progress: subjectIntelligence.subjectReadinessScore,
    accuracy: subjectIntelligence.subjectAccuracyPercentage,
    coveragePercent: subjectIntelligence.subjectCoveragePercent,
    masteryPercent: subjectIntelligence.subjectMasteryPercentage,
    accuracyPercent: subjectIntelligence.subjectAccuracyPercentage,
    readinessPercent: subjectIntelligence.subjectReadinessScore,
    remainingQuestions: subjectIntelligence.subjectRemainingQuestions,
    coverageLevel: subjectIntelligence.subjectCoverageLevel,
    totalMcqs: subjectIntelligence.subjectTotalMcqs,
    attemptedMcqs: subjectIntelligence.subjectAttemptedMcqs,
    masteredMcqs: subjectIntelligence.subjectMasteredMcqs,
    hasAttempts: subjectIntelligence.subjectAttemptedMcqs > 0,
    hasPracticed: subjectIntelligence.hasPracticed,
    strongChapters: subjectIntelligence.strongChapters,
    weakChapters: subjectIntelligence.weakChapters,
    immediateFocusChapters: subjectIntelligence.immediateFocusChapters,
    rankedChapters: subjectIntelligence.rankedChapters,
    trends: subjectIntelligence.trends,
    snapshots: subjectIntelligence.snapshots,
    desc: subject.desc || '',
    counts: {
      chapters: chapters.length,
      mcqs: subjectIntelligence.subjectTotalMcqs,
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

