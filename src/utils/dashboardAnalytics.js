/**
 * dashboardAnalytics.js
 * Centralized utility for computing real-time course health, readiness,
 * content gaps, MCQ database metrics, and subject distributions.
 */

import { matchContentToChapter } from '../data/adminStore'

/**
 * Calculates complete dashboard analytics for an active course workspace.
 * Safely handles empty data and division-by-zero.
 */
export function calculateCourseAnalytics(activeCourse, subjects = [], chapters = [], mcqs = [], flashcards = []) {
  const courseId = activeCourse?.id

  // 1. Filter items belonging to the active course
  const courseSubjects = subjects.filter((s) => !courseId || s.courseId === courseId)
  const courseChapters = chapters.filter((c) => !courseId || c.courseId === courseId)
  const courseMcqs = mcqs.filter((m) => !courseId || m.courseId === courseId)
  const courseFlashcards = flashcards.filter((f) => !courseId || f.courseId === courseId)

  const totalSubjects = courseSubjects.length
  const totalChapters = courseChapters.length
  const totalMcqs = courseMcqs.length
  const totalFlashcards = courseFlashcards.length

  const getSubjectName = (subIdOrName) => {
    if (!subIdOrName) return 'General'
    const match = courseSubjects.find((s) => String(s.id) === String(subIdOrName) || s.name === subIdOrName)
    return match?.name || subIdOrName
  }

  // 2. Map MCQs and Flashcards to individual chapters dynamically
  const chapterDetails = courseChapters.map((chap) => {
    const chapMcqs = courseMcqs.filter((m) => matchContentToChapter(m, chap))
    const chapFlashcards = courseFlashcards.filter((f) => matchContentToChapter(f, chap))

    const mcqCount = chapMcqs.length > 0 ? chapMcqs.length : (typeof chap.mcqs === 'number' && chap.mcqs !== 1000 ? chap.mcqs : 0)
    const flashcardCount = chapFlashcards.length > 0 ? chapFlashcards.length : (typeof chap.flashcards === 'number' && chap.flashcards !== 1000 ? chap.flashcards : 0)

    const resolvedSubjectName = getSubjectName(chap.subject || chap.subjectId)

    return {
      ...chap,
      subjectName: resolvedSubjectName,
      realMcqCount: mcqCount,
      realFlashcardCount: flashcardCount,
      hasMcqs: mcqCount > 0,
      isLowMcqs: mcqCount > 0 && mcqCount < 10,
      hasNoMcqs: mcqCount === 0,
      hasNoFlashcards: flashcardCount === 0,
    }
  })

  // 3. Chapters with / without MCQs
  const chaptersWithMcqs = chapterDetails.filter((c) => c.hasMcqs).length
  const chaptersWithoutMcqs = chapterDetails.filter((c) => c.hasNoMcqs).length

  // 4. MCQ Health Metrics (Largest, Smallest, Average)
  let averageMcqsPerChapter = 0
  let largestMcqChapter = null
  let smallestMcqChapter = null

  if (totalChapters > 0) {
    averageMcqsPerChapter = Math.round(totalMcqs / totalChapters)

    const sortedByMcq = [...chapterDetails].sort((a, b) => b.realMcqCount - a.realMcqCount)
    largestMcqChapter = sortedByMcq[0] ? { name: sortedByMcq[0].name || sortedByMcq[0].title, count: sortedByMcq[0].realMcqCount, subject: sortedByMcq[0].subject } : null

    const chaptersWithSomeMcqs = sortedByMcq.filter((c) => c.realMcqCount > 0)
    if (chaptersWithSomeMcqs.length > 0) {
      const smallest = chaptersWithSomeMcqs[chaptersWithSomeMcqs.length - 1]
      smallestMcqChapter = { name: smallest.name || smallest.title, count: smallest.realMcqCount, subject: smallest.subject }
    }
  }

  // 5. Subject Summaries & Coverage
  const subjectBreakdown = courseSubjects.map((sub) => {
    const subChapters = chapterDetails.filter((c) => c.subject === sub.name || c.subjectId === sub.id)
    const subMcqs = courseMcqs.filter((m) => m.subject === sub.name || m.subjectId === sub.id)
    const subFlashcards = courseFlashcards.filter((f) => f.subject === sub.name || f.subjectId === sub.id)

    const chapCount = subChapters.length
    const mcqCount = subMcqs.length
    const flashCount = subFlashcards.length

    // Target metrics per subject for 100% coverage
    const targetChapters = 5
    const targetMcqs = 50
    const targetFlashcards = 25

    const chapScore = Math.min(1, chapCount / targetChapters) * 0.4
    const mcqScore = Math.min(1, mcqCount / targetMcqs) * 0.4
    const flashScore = Math.min(1, flashCount / targetFlashcards) * 0.2
    const coveragePct = Math.min(100, Math.round((chapScore + mcqScore + flashScore) * 100))

    return {
      id: sub.id,
      name: sub.name,
      icon: sub.icon || 'chapters',
      color: sub.color || '#2E5CE6',
      desc: sub.desc || '',
      chaptersCount: chapCount,
      mcqsCount: mcqCount,
      flashcardsCount: flashCount,
      coveragePct,
      hasNoChapters: chapCount === 0,
      isLowCoverage: coveragePct < 50,
    }
  })

  const subjectsWithoutChapters = subjectBreakdown.filter((s) => s.hasNoChapters).length
  const subjectsLowCoverage = subjectBreakdown.filter((s) => s.isLowCoverage).length

  // 6. Content Gap Items (Actionable list for admin)
  const contentGaps = []
  chapterDetails.forEach((c) => {
    if (c.hasNoMcqs) {
      contentGaps.push({
        id: `gap-mcq-${c.id}`,
        chapterId: c.id,
        chapterName: c.name || c.title,
        subjectName: c.subject,
        type: 'NO_MCQS',
        severity: 'high',
        badge: '0 MCQs',
        recommendation: 'Needs question bank injection',
      })
    } else if (c.isLowMcqs) {
      contentGaps.push({
        id: `gap-low-mcq-${c.id}`,
        chapterId: c.id,
        chapterName: c.name || c.title,
        subjectName: c.subject,
        type: 'LOW_MCQS',
        severity: 'medium',
        badge: `${c.realMcqCount} MCQs`,
        recommendation: 'Low question coverage (< 10 MCQs)',
      })
    }

    if (c.hasNoFlashcards) {
      contentGaps.push({
        id: `gap-flash-${c.id}`,
        chapterId: c.id,
        chapterName: c.name || c.title,
        subjectName: c.subject,
        type: 'NO_FLASHCARDS',
        severity: 'low',
        badge: '0 Flashcards',
        recommendation: 'Needs flashcards deck',
      })
    }
  })

  // 7. Overall Course Readiness % Formula
  let overallReadiness = 0
  if (totalSubjects > 0) {
    const avgSubjectCoverage = subjectBreakdown.reduce((sum, s) => sum + s.coveragePct, 0) / totalSubjects
    const chapterMcqRatio = totalChapters > 0 ? (chaptersWithMcqs / totalChapters) * 100 : 0
    overallReadiness = Math.min(100, Math.round(avgSubjectCoverage * 0.6 + chapterMcqRatio * 0.4))
  }

  return {
    courseName: activeCourse?.name || 'Active Course Workspace',
    courseDesc: activeCourse?.description || 'Curriculum & question bank content management workspace.',
    totalSubjects,
    totalChapters,
    totalMcqs,
    totalFlashcards,
    chaptersWithMcqs,
    chaptersWithoutMcqs,
    subjectsWithoutChapters,
    subjectsLowCoverage,
    averageMcqsPerChapter,
    largestMcqChapter,
    smallestMcqChapter,
    subjectBreakdown,
    chapterDetails,
    contentGaps,
    overallReadiness,
  }
}

