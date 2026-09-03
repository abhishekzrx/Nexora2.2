import { useEffect, useMemo, useRef, useState } from 'react'
import './Dashboard.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import SideDrawer from './components/layout/SideDrawer'
import { useContentRegistry } from './data/contentRegistry'
import { navigate, testSession } from './utils/navigation'
import { useRoleStore } from './data/roleStore'
import { useWorkspaceStore, setActiveWorkspace } from './data/workspaceStore'
import { useCourseRegistry } from './data/courseRegistry'
import StudentCourseSelector from './components/student/StudentCourseSelector'
import RoleSwitch from './components/student/RoleSwitch'
import { formatCompactNumber, formatInteger } from './services/mcqAnalyticsService'
import SubjectCard from './components/subject/SubjectCard'
import EmptyCourseState from './components/admin/EmptyCourseState'
import { useMemberStore } from './data/memberStore'
import { permissionService } from './services/permissionService'
import { userAnalyticsService } from './services/userAnalyticsService'
import { hydrateUserAnalytics, useUserAnalytics } from './data/analyticsStore'
import { hydrateUserProgressFromSupabase, useUserProgressStore } from './data/progressStore'

const strongAreasFallback = ['DBMS', 'Operating System', 'Computer Networks']
const weakAreasFallback = ['COA', 'Digital Electronics']

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Recently'
  const diffMs = Date.now() - timestamp
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '1d ago'
  return `${diffDays}d ago`
}

function formatTotalTimeSpent(attempts = []) {
  const totalSeconds = attempts.reduce((sum, a) => sum + (Number(a.time_taken_seconds || a.timeTakenSeconds) || 0), 0)
  if (totalSeconds <= 0) return '0m'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${Math.max(1, minutes)}m`
}

function calculateStudyStreak(attempts = [], snapshots = []) {
  const activeDays = new Set()
  attempts.forEach((a) => {
    const ts = a.created_at || a.timestamp
    if (ts) {
      try {
        const d = new Date(ts).toISOString().split('T')[0]
        activeDays.add(d)
      } catch {
        // ignore
      }
    }
  })
  snapshots.forEach((s) => {
    if (s.date) activeDays.add(s.date)
  })

  if (activeDays.size === 0) return 0

  const sorted = Array.from(activeDays).sort().reverse()
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) {
    return 0
  }

  let streak = 0
  let checkDate = new Date(sorted[0])
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (activeDays.has(dateStr)) {
      streak += 1
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

function generateSparkline(values = [], maxVal = 100) {
  if (!values || values.length === 0) {
    return {
      path: 'M0,18 Q30,18,60,18 T100,18',
    }
  }
  if (values.length === 1) {
    const y = Math.round(20 - Math.min(16, Math.max(2, (Number(values[0] || 0) / maxVal) * 16)))
    return {
      path: `M0,${y} Q30,${y},60,${y} T100,${y}`,
    }
  }
  const step = 100 / (values.length - 1)
  const points = values.map((v, i) => {
    const x = Math.round(i * step)
    const y = Math.round(20 - Math.min(16, Math.max(2, (Number(v || 0) / maxVal) * 16)))
    return { x, y }
  })
  let path = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = Math.round((prev.x + curr.x) / 2)
    path += ` Q${cpx},${prev.y},${curr.x},${curr.y}`
  }
  return { path }
}

// ── Dynamic Readiness Levels ─────────────────────────────
const READINESS_LEVELS = {
  beginner: {
    min: 0,
    max: 39,
    label: 'Beginner',
    message: "Let's build your foundation.",
    conicColor: '#F04438',
    textColor: '#F04438',
  },
  improving: {
    min: 40,
    max: 69,
    label: 'Improving',
    message: 'Keep going! Consistent daily practice.',
    conicColor: '#2d6a4f',
    textColor: '#1b4332',
  },
  competitive: {
    min: 70,
    max: 84,
    label: 'Competitive',
    message: 'Approaching exam-ready.',
    conicColor: '#0E9494',
    textColor: '#0E9494',
  },
  examReady: {
    min: 85,
    max: 100,
    label: 'Exam Ready',
    message: 'Excellent momentum!',
    conicColor: '#12B76A',
    textColor: '#12B76A',
  },
}

function getReadinessLevel(score) {
  const clamped = Math.max(0, Math.min(100, score))
  if (clamped <= 39) return READINESS_LEVELS.beginner
  if (clamped <= 69) return READINESS_LEVELS.improving
  if (clamped <= 84) return READINESS_LEVELS.competitive
  return READINESS_LEVELS.examReady
}

function useAnimatedNumber(target, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

const drawerSections = [
  {
    label: 'HOME',
    items: [
      { icon: 'home', label: 'Dashboard', active: true },
      { icon: 'subjects', label: 'Subjects' },
      { icon: 'practice', label: 'Practice' },
    ],
  },
  {
    label: 'LEARNING',
    items: [
      { icon: 'notes', label: 'Notes' },
      { icon: 'flashcards', label: 'Flashcards', disabled: true },
      { icon: 'mockTests', label: 'Mock Tests', disabled: true },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { icon: 'analytics', label: 'Analytics', disabled: true },
      { icon: 'studyPlanner', label: 'Study Planner', disabled: true },
      { icon: 'leaderboard', label: 'Leaderboard', disabled: true },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { icon: 'adminDashboard', label: 'Admin' },
      { icon: 'settings', label: 'Settings', disabled: true },
      { icon: 'help', label: 'Help & Support', disabled: true },
    ],
  },
]

function DashboardPage({
  courseId,
  onNavigateSubjects = () => {},
  onNavigatePractice = () => {},
  onNavigateNotes = () => {},
  onOpenSubjectDetail = () => {},
  onNavigateAdmin = () => {},
  onLogout = () => {},
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const registry = useContentRegistry()
  const courseRegistry = useCourseRegistry(activeWorkspaceId)
  const { isAdmin } = useRoleStore()
  const { effectiveMember } = useMemberStore()
  const userProgressState = useUserProgressStore()
  const [persistentAttempts, setPersistentAttempts] = useState([])

  const activeCourse = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null
  const effectiveCourseId = activeWorkspaceId || activeCourse?.id

  // Hydrate user progress and persistent analytics on mount & when user or course changes
  useEffect(() => {
    const userId = effectiveMember?.id
    if (!userId || !effectiveCourseId) return

    let isMounted = true
    async function hydrate() {
      await Promise.all([
        hydrateUserProgressFromSupabase(userId),
        hydrateUserAnalytics(userId, effectiveCourseId),
      ])
      const attempts = await userAnalyticsService.getUserAttempts(userId, effectiveCourseId)
      if (isMounted) {
        setPersistentAttempts(attempts)
      }
    }

    hydrate()
    return () => {
      isMounted = false
    }
  }, [effectiveMember?.id, effectiveCourseId])

  const userAnalytics = useUserAnalytics(effectiveMember?.id, effectiveCourseId, 50)
  const progressList = userProgressState.progressList || []

  // Past attempts history merging persistent Supabase/local attempts with testSession
  const pastAttempts = useMemo(() => {
    let memoryAttempts = Array.isArray(testSession.attemptHistoryData) ? testSession.attemptHistoryData : []
    if (memoryAttempts.length === 0 && persistentAttempts.length > 0) {
      return persistentAttempts.map((a) => ({
        id: a.id,
        timestamp: new Date(a.created_at || Date.now()).getTime(),
        created_at: a.created_at,
        subjectKey: a.subject_id,
        subjectTitle: a.subject_title || a.subject_id,
        chapterId: a.chapter_id,
        chapterTitle: a.chapter_title,
        accuracy: a.accuracy,
        correct: a.correct_count,
        attempted: a.attempted_count,
        total: a.total_questions,
        time_taken_seconds: a.time_taken_seconds || a.timeTakenSeconds || 0,
      }))
    }
    if (memoryAttempts.length === 0) {
      try {
        const cached = localStorage.getItem(`nexora_attempts_${effectiveMember?.id}`) || localStorage.getItem('nexora_recent_mcq_attempts')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) memoryAttempts = parsed
        }
      } catch {
        // ignore
      }
    }
    return memoryAttempts
  }, [testSession.attemptHistoryData, persistentAttempts, effectiveMember?.id])

  // Recent attempted MCQs list sorted by newest attempt first
  const recentAttemptsList = useMemo(() => {
    const attempts = [...pastAttempts]
    attempts.reverse()

    if (attempts.length > 0) {
      return attempts.map((att) => {
        const sub = courseRegistry.subjectCatalog[att.subjectKey] || registry.subjectCatalog[att.subjectKey] || null
        const subjectTitle = att.subjectTitle || sub?.title || att.subjectKey || 'Subject'
        const chapterTitle = att.chapterTitle || 'MCQ Practice Session'
        const icon = sub?.icon || 'computerNetworks'

        return {
          id: att.id || `att-${att.timestamp}`,
          subjectKey: att.subjectKey,
          subjectTitle,
          chapterTitle,
          icon,
          accuracy: att.accuracy !== undefined ? att.accuracy : 0,
          correct: att.correct !== undefined ? att.correct : 0,
          attempted: att.attempted !== undefined ? att.attempted : (att.total || 0),
          total: att.total || 0,
          timestamp: att.timestamp,
          timeAgo: formatTimeAgo(att.timestamp || (att.created_at ? new Date(att.created_at).getTime() : Date.now())),
          isReal: true,
        }
      })
    }

    return []
  }, [pastAttempts, courseRegistry.subjectCatalog, registry.subjectCatalog])

  const topRecentAttempt = recentAttemptsList[0] || null

  // Subject last attempt / access timestamp lookup map
  const subjectLastAttemptMap = useMemo(() => {
    const map = {}
    pastAttempts.forEach((att, idx) => {
      if (att.subjectKey) {
        const ts = att.timestamp || (idx + 1) * 1000
        map[att.subjectKey] = Math.max(map[att.subjectKey] || 0, ts)
      }
    })
    try {
      const cachedAccess = localStorage.getItem('nexora_recent_subject_access')
      if (cachedAccess) {
        const accessMap = JSON.parse(cachedAccess)
        Object.keys(accessMap).forEach((key) => {
          map[key] = Math.max(map[key] || 0, accessMap[key] || 0)
        })
      }
    } catch {
      // ignore
    }
    return map
  }, [pastAttempts])

  // Subject performance metrics map calculated from MCQ attempt history
  const subjectPerformanceMap = useMemo(() => {
    const map = {}
    pastAttempts.forEach((att) => {
      if (att.subjectKey) {
        if (!map[att.subjectKey]) {
          map[att.subjectKey] = {
            attemptsCount: 0,
            totalCorrect: 0,
            totalAttempted: 0,
            latestAccuracy: 0,
            accuracies: [],
            lastAttemptTimestamp: 0,
          }
        }
        const item = map[att.subjectKey]
        item.attemptsCount += 1
        item.totalCorrect += att.correct || 0
        item.totalAttempted += att.attempted || att.total || 0
        item.accuracies.push(att.accuracy !== undefined ? att.accuracy : 0)
        if ((att.timestamp || 0) >= item.lastAttemptTimestamp) {
          item.lastAttemptTimestamp = att.timestamp || 0
          item.latestAccuracy = att.accuracy !== undefined ? att.accuracy : 0
        }
      }
    })

    Object.keys(map).forEach((key) => {
      const item = map[key]
      const avg = item.accuracies.length > 0
        ? Math.round(item.accuracies.reduce((a, b) => a + b, 0) / item.accuracies.length)
        : 0
      item.effectiveAccuracy = item.latestAccuracy !== undefined ? item.latestAccuracy : avg
    })
    return map
  }, [pastAttempts])

  // Dynamic Exam Readiness Index calculated across ALL subjects
  const readinessScore = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    if (list.length === 0) {
      if (pastAttempts.length > 0) {
        const totalAcc = pastAttempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0)
        return Math.min(100, Math.max(0, Math.round(totalAcc / pastAttempts.length)))
      }
      return 0
    }

    let totalProgress = 0
    let totalMastery = 0
    let totalAttemptedSubCount = 0

    list.forEach((s) => {
      const cov = typeof s.coveragePercent === 'number' ? s.coveragePercent : (s.progress || 0)
      const mast = typeof s.masteryPercent === 'number' ? s.masteryPercent : (s.accuracy || 0)
      totalProgress += cov
      if (s.hasAttempts || s.attemptedMcqs > 0 || (subjectPerformanceMap[s.subjectKey]?.attemptsCount > 0)) {
        totalMastery += mast
        totalAttemptedSubCount += 1
      }
    })

    const avgCoverage = Math.round(totalProgress / list.length)

    let avgQuizAccuracy = 0
    if (pastAttempts.length > 0) {
      const totalAcc = pastAttempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0)
      avgQuizAccuracy = Math.round(totalAcc / pastAttempts.length)
    } else if (totalAttemptedSubCount > 0) {
      avgQuizAccuracy = Math.round(totalMastery / totalAttemptedSubCount)
    }

    if (pastAttempts.length > 0 || totalAttemptedSubCount > 0) {
      const blended = Math.round(avgCoverage * 0.4 + avgQuizAccuracy * 0.6)
      return Math.max(5, Math.min(100, blended))
    }

    return Math.max(0, Math.min(100, avgCoverage))
  }, [courseRegistry.subjectsList, pastAttempts, subjectPerformanceMap])

  const readinessLevel = getReadinessLevel(readinessScore)
  const animatedScore = useAnimatedNumber(readinessScore)

  // Dynamic Projected Score (out of 100)
  const projectedScore = useMemo(() => {
    if (readinessScore <= 0 && pastAttempts.length === 0) return 0
    if (pastAttempts.length > 0) {
      const avgAcc = Math.round(pastAttempts.reduce((s, a) => s + (Number(a.accuracy) || 0), 0) / pastAttempts.length)
      const calculated = Math.round(readinessScore * 0.5 + avgAcc * 0.5)
      return Math.min(100, Math.max(10, calculated))
    }
    return Math.min(100, Math.max(10, Math.round(readinessScore * 0.85 + 15)))
  }, [readinessScore, pastAttempts])

  const animatedProjectedScore = useAnimatedNumber(projectedScore)

  // Dynamic Content Counts dynamically summing all subjects
  const totalMcqs = useMemo(() => {
    if (typeof courseRegistry.mcqCount === 'number' && courseRegistry.mcqCount > 0) {
      return courseRegistry.mcqCount
    }
    const list = courseRegistry.subjectsList || []
    return list.reduce((acc, s) => acc + (s.counts?.mcqs || s.totalMcqs || 0), 0)
  }, [courseRegistry])

  const totalFlashcards = useMemo(() => {
    if (typeof courseRegistry.flashcardCount === 'number' && courseRegistry.flashcardCount > 0) {
      return courseRegistry.flashcardCount
    }
    const list = courseRegistry.subjectsList || []
    return list.reduce((acc, s) => acc + (s.counts?.flashcards || s.totalFlashcards || 0), 0)
  }, [courseRegistry])

  const completionRate = readinessScore

  // Real Study Streak calculation
  const studyStreakDays = useMemo(() => {
    return calculateStudyStreak(pastAttempts, userAnalytics.snapshots || [])
  }, [pastAttempts, userAnalytics.snapshots])

  // Derive ALL subject cards from courseRegistry
  const subjectCards = useMemo(() => {
    const list = [...(courseRegistry.subjectsList || [])]
    
    list.sort((a, b) => {
      const timeA = subjectLastAttemptMap[a.subjectKey] || 0
      const timeB = subjectLastAttemptMap[b.subjectKey] || 0
      if (timeA !== timeB) return timeB - timeA
      return 0
    })

    return list.map((s, i) => {
      const perf = subjectPerformanceMap[s.subjectKey] || null
      const lastTs = perf?.lastAttemptTimestamp || subjectLastAttemptMap[s.subjectKey]

      const hasAttempts = Boolean(s.hasAttempts || (perf && perf.attemptsCount > 0))
      const coveragePercent = typeof s.coveragePercent === 'number' ? s.coveragePercent : (s.progress || 0)
      const masteryPercent = typeof s.masteryPercent === 'number' ? s.masteryPercent : (s.accuracy || 0)
      const coverageLevel = s.coverageLevel

      return {
        subjectKey: s.subjectKey,
        title: s.title,
        icon: s.icon,
        progress: coveragePercent,
        accuracy: masteryPercent,
        coveragePercent,
        masteryPercent,
        coverageLevel,
        hasAttempts,
        attemptsCount: perf?.attemptsCount || 0,
        totalCorrect: perf?.totalCorrect || s.masteredMcqs || 0,
        totalAttempted: perf?.totalAttempted || s.attemptedMcqs || 0,
        attemptedMcqs: s.attemptedMcqs || 0,
        masteredMcqs: s.masteredMcqs || 0,
        chapters: s.counts?.chapters || 0,
        mcqs: s.counts?.mcqs || s.totalMcqs || 0,
        flashcards: s.counts?.flashcards || 0,
        highlight: i === 0,
        isRecent: Boolean(lastTs),
      }
    })
  }, [courseRegistry, subjectLastAttemptMap, subjectPerformanceMap])

  // Dynamic Strong / Weak areas
  const { dynamicStrongAreas, dynamicWeakAreas } = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    if (list.length === 0) {
      return { dynamicStrongAreas: strongAreasFallback, dynamicWeakAreas: weakAreasFallback }
    }

    const evaluated = list.map((s) => {
      const perf = subjectPerformanceMap[s.subjectKey]
      const hasAttempts = Boolean(s.hasAttempts || s.attemptedMcqs > 0 || (perf && perf.attemptsCount > 0))
      const accuracy = perf?.effectiveAccuracy !== undefined
        ? perf.effectiveAccuracy
        : (typeof s.masteryPercent === 'number' ? s.masteryPercent : (s.accuracy || s.progress || 0))
      const coverage = typeof s.coveragePercent === 'number' ? s.coveragePercent : (s.progress || 0)
      const rankScore = hasAttempts ? (accuracy * 0.7 + coverage * 0.3) : (coverage * 0.4)

      return {
        key: s.subjectKey,
        title: s.title || s.name,
        accuracy,
        coverage,
        hasAttempts,
        rankScore,
      }
    })

    const sorted = [...evaluated].sort((a, b) => b.rankScore - a.rankScore)
    const strong = sorted.slice(0, 3).map((s) => s.title)

    const lowAccuracySubs = sorted.filter((s) => s.hasAttempts && s.accuracy < 55)
    let weak = []
    if (lowAccuracySubs.length > 0) {
      weak = lowAccuracySubs.slice(0, 2).map((s) => s.title)
    } else if (sorted.length > 3) {
      weak = sorted.slice(-2).reverse().map((s) => s.title)
    } else if (sorted.length > 1) {
      weak = [sorted[sorted.length - 1].title]
    }

    const filteredWeak = weak.filter((w) => !strong.includes(w)).slice(0, 2)
    return {
      dynamicStrongAreas: strong.length > 0 ? strong : strongAreasFallback,
      dynamicWeakAreas: filteredWeak.length > 0 ? filteredWeak : (sorted.length > 1 ? [sorted[sorted.length - 1].title] : weakAreasFallback),
    }
  }, [courseRegistry.subjectsList, subjectPerformanceMap])

  // Dynamic Activity Items
  const dynamicActivityItems = useMemo(() => {
    if (pastAttempts.length > 0) {
      return pastAttempts.slice(-4).reverse().map((att, idx) => {
        const sub = courseRegistry.subjectCatalog[att.subjectKey]
        const subjectTitle = sub?.title || att.subjectTitle || att.subjectKey || 'Practice Session'
        const chapterTitle = att.chapterTitle || 'MCQ Practice'
        const acc = att.accuracy !== undefined ? att.accuracy : 0
        const isGood = acc >= 50
        const total = att.total || att.attempted || 10
        const correct = att.correct !== undefined ? att.correct : Math.round((acc / 100) * total)

        return {
          id: att.id || `act-${idx}`,
          subjectKey: att.subjectKey,
          icon: isGood ? 'check' : 'cross',
          iconType: isGood ? 'good' : 'bad',
          title: `${subjectTitle}: ${chapterTitle}`,
          statText: `${correct}/${total} Correct`,
          accuracyText: `${acc}% Accuracy`,
          accuracyVal: acc,
          timeAgo: formatTimeAgo(att.timestamp || (att.created_at ? new Date(att.created_at).getTime() : null)),
        }
      })
    }

    return []
  }, [pastAttempts, courseRegistry])

  // Daily Focus real metrics
  const dailyFocus = useMemo(() => {
    const flashcardsDue = totalFlashcards || 0
    const incorrectQuestions = userAnalytics.incorrectCount || progressList.filter((p) => p.status === 'INCORRECT').length || 0

    let forgottenTopics = 0
    const list = courseRegistry.subjectsList || []
    list.forEach((sub) => {
      const chs = sub.chapters || []
      chs.forEach((ch) => {
        if (ch.hasAttempts && ch.masteryPercent < 50) {
          forgottenTopics += 1
        } else if (ch.revisionRequirement) {
          forgottenTopics += 1
        }
      })
    })

    const todayStr = new Date().toISOString().split('T')[0]
    const todayAttempts = pastAttempts.filter((a) => {
      const d = (a.created_at || a.timestamp) ? new Date(a.created_at || a.timestamp).toISOString().split('T')[0] : null
      return d === todayStr
    })

    const todayMcqsSolved = todayAttempts.reduce((sum, a) => sum + (Number(a.attempted || a.total || 0)), 0)
    const mcqDailyTarget = 30
    const mcqPercent = Math.min(100, Math.round((todayMcqsSolved / mcqDailyTarget) * 100))

    const todayFlashcardsSolved = todayAttempts.reduce((sum, a) => sum + (Number(a.flashcardsReviewed || 0)), 0)
    const flashcardDailyTarget = 10
    const flashcardPercent = Math.min(100, Math.round((todayFlashcardsSolved / flashcardDailyTarget) * 100))

    const todayMocks = todayAttempts.filter((a) => a.isMockTest || a.type === 'mock').length
    const mockDailyTarget = 1
    const mockPercent = Math.min(100, Math.round((todayMocks / mockDailyTarget) * 100))

    return {
      flashcardsDue,
      incorrectQuestions,
      forgottenTopics,
      mcqPercent,
      flashcardPercent,
      mockPercent,
    }
  }, [totalFlashcards, userAnalytics.incorrectCount, progressList, courseRegistry.subjectsList, pastAttempts])

  // Metrics for Performance Overview
  const totalQuestionsAttempted = useMemo(() => {
    if (pastAttempts.length > 0) {
      return pastAttempts.reduce((sum, a) => sum + (Number(a.attempted || a.total || 0)), 0)
    }
    return userAnalytics.totalQuestionsAttempted || 0
  }, [pastAttempts, userAnalytics.totalQuestionsAttempted])

  const averageAccuracy = useMemo(() => {
    if (pastAttempts.length > 0) {
      const sum = pastAttempts.reduce((s, a) => s + (Number(a.accuracy || 0)), 0)
      return Math.round(sum / pastAttempts.length)
    }
    return userAnalytics.accuracy || 0
  }, [pastAttempts, userAnalytics.accuracy])

  const totalTimeSpentFormatted = useMemo(() => {
    return formatTotalTimeSpent(pastAttempts)
  }, [pastAttempts])

  // Sparklines calculated strictly from real history points
  const accuracySparkline = useMemo(() => {
    const historyAccuracies = (userAnalytics.trendHistory || []).map((t) => t.accuracy)
    if (historyAccuracies.length > 0) {
      return generateSparkline(historyAccuracies, 100)
    }
    if (pastAttempts.length > 0) {
      const points = pastAttempts.slice(-7).map((a) => a.accuracy || 0)
      return generateSparkline(points, 100)
    }
    return generateSparkline([averageAccuracy], 100)
  }, [userAnalytics.trendHistory, pastAttempts, averageAccuracy])

  const questionsSparkline = useMemo(() => {
    const historyQuestions = (userAnalytics.trendHistory || []).map((t) => t.questions)
    if (historyQuestions.length > 0) {
      const maxQ = Math.max(...historyQuestions, 10)
      return generateSparkline(historyQuestions, maxQ)
    }
    if (pastAttempts.length > 0) {
      const points = pastAttempts.slice(-7).map((a) => a.attempted || a.total || 0)
      const maxQ = Math.max(...points, 10)
      return generateSparkline(points, maxQ)
    }
    return generateSparkline([totalQuestionsAttempted], Math.max(totalQuestionsAttempted, 10))
  }, [userAnalytics.trendHistory, pastAttempts, totalQuestionsAttempted])

  const timeSparkline = useMemo(() => {
    if (pastAttempts.length > 0) {
      const points = pastAttempts.slice(-7).map((a) => Math.round((Number(a.time_taken_seconds || 0) / 60)))
      const maxT = Math.max(...points, 10)
      return generateSparkline(points, maxT)
    }
    return generateSparkline([1], 10)
  }, [pastAttempts])

  const handleCourseSelect = (id) => {
    setActiveWorkspace(id)
  }

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const daysUntilExam = activeCourse?.examDays || 84

  return (
    <div className="mobile-dash-page">
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={onLogout}
        profile={{
          name: effectiveMember?.display_name || 'Student',
          warrior: `${effectiveMember?.warrior_name || 'WARRIOR'} • ${effectiveMember?.public_user_id || 'NEX-WAR-001'}`,
          sub: `${activeCourse?.name || 'Assigned Course'}`,
          streak: `${studyStreakDays} Day Streak`,
        }}
        sections={drawerSections}
        onItemClick={(item) => {
          setDrawerOpen(false)
          if (item.label === 'Dashboard') navigate('')
          else if (item.label === 'Subjects') onNavigateSubjects()
          else if (item.label === 'Practice') onNavigatePractice()
          else if (item.label === 'Notes') onNavigateNotes ? onNavigateNotes() : navigate('notes')
          else if (item.label === 'Member Management' || item.key === 'members') onNavigateAdmin ? onNavigateAdmin('members') : navigate('admin/members')
          else if (item.label === 'Admin') onNavigateAdmin()
        }}
        onSwitchMode={(mode) => {
          if (mode === 'admin') onNavigateAdmin?.()
          else navigate('')
        }}
      />

      <MobileLayout
        activeTab="Home"
        disabledItems={['Profile']}
        onNavigate={(item) => {
          if (item.center || item.label === 'Subjects') {
            onNavigateSubjects()
          } else if (item.label === 'Practice') {
            onNavigatePractice()
          }
        }}
      >
        {/* TOP MOBILE HEADER BAR */}
        <header className="mobile-top-header">
          <div className="header-inner-row">
            {/* Hamburger Button */}
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <svg className="h-btn-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
              </svg>
            </button>

            {/* Course Track Dropdown Pill */}
            <div className="header-course-selector-col">
              <StudentCourseSelector onSelect={handleCourseSelect} />
            </div>

            {/* Notification Bell Button */}
            <div className="header-bell-wrapper">
              <button
                type="button"
                className="header-icon-btn"
                aria-label="Notifications"
              >
                <svg className="h-btn-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
              {/* Optional unread notification dot/badge */}
              {pastAttempts.length > 0 && (
                <span className="header-bell-badge">3</span>
              )}
            </div>

            {/* Admin Role Switch if Admin */}
            {isAdmin && (
              <div className="header-role-switch-wrap">
                <RoleSwitch onSwitchToAdmin={onNavigateAdmin} onSwitchToStudent={() => navigate('')} />
              </div>
            )}
          </div>
        </header>

        {/* MAIN SCROLLABLE DASHBOARD FEED */}
        <main className="mobile-dash-feed">
          {/* 1. CONTINUE PRACTICE BANNER */}
          <section
            className="continue-practice-cta-card"
            onClick={() => {
              if (topRecentAttempt?.subjectKey) {
                onOpenSubjectDetail(topRecentAttempt.subjectKey)
              } else if (courseRegistry.subjectsList?.[0]?.subjectKey) {
                onOpenSubjectDetail(courseRegistry.subjectsList[0].subjectKey)
              } else {
                onNavigatePractice()
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="continue-cta-left">
              <div className="continue-cta-icon-box">
                <svg className="continue-cta-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                  <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                </svg>
              </div>
              <div className="continue-cta-info">
                <h2 className="continue-cta-title">
                  {topRecentAttempt ? 'Continue Practice' : 'Begin Practice'}
                </h2>
                <p className="continue-cta-sub">
                  {topRecentAttempt
                    ? `Resume ${topRecentAttempt.subjectTitle}: ${topRecentAttempt.chapterTitle}`
                    : `Start with ${courseRegistry.subjectsList?.[0]?.title || 'Core Syllabus'}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="continue-cta-circle-btn"
              aria-label="Resume session"
            >
              <svg className="continue-arrow-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </button>
            <div className="continue-cta-glow" />
          </section>

          {/* 2. EXAM READINESS & MILESTONES CARD */}
          <section className="exam-readiness-overview-card">
            {/* Top 3 Milestones */}
            <div className="milestones-top-row">
              {/* Milestone 1: Exam in */}
              <div className="milestone-item">
                <div className="milestone-icon-box">
                  <svg className="milestone-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <div className="milestone-info">
                  <div className="milestone-lbl">EXAM IN</div>
                  <div className="milestone-val">
                    {daysUntilExam} <span className="milestone-unit">Days</span>
                  </div>
                </div>
              </div>

              {/* Milestone 2: Today's Goal */}
              <div className="milestone-item border-l">
                <div className="milestone-icon-box">
                  <svg className="milestone-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  </svg>
                </div>
                <div className="milestone-info">
                  <div className="milestone-lbl">TODAY'S GOAL</div>
                  <div className="milestone-val">
                    {formatCompactNumber(totalMcqs)} <span className="milestone-unit font-bold">MCQs</span>
                  </div>
                  <div className="milestone-extra">{formatCompactNumber(totalFlashcards)} Flashcards</div>
                </div>
              </div>

              {/* Milestone 3: Study Streak */}
              <div className="milestone-item border-l">
                <div className="milestone-icon-box">
                  <svg className="milestone-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path clipRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.316.492-.533 1.05-.724 1.577a23.36 23.36 0 00-.77 2.658c-.417.062-.834.17-1.233.332C6.18 8.1 5 9.77 5 11.5 5 14.538 7.462 17 10.5 17c3.038 0 5.5-2.462 5.5-5.5 0-1.89-1.01-3.616-2.585-4.664a1 1 0 00-.594-.213c-.026 0-.051.002-.077.006a1 1 0 00-.814.733c-.157.653-.418 1.258-.77 1.8a1 1 0 01-1.62-.27c-.244-.45-.373-.974-.373-1.5 0-1.282.518-2.443 1.228-3.339.294-.37.382-.84.226-1.29a1 1 0 00-.226-.31z" fillRule="evenodd" />
                  </svg>
                </div>
                <div className="milestone-info">
                  <div className="milestone-lbl">STREAK</div>
                  <div className="milestone-val">
                    {studyStreakDays} <span className="milestone-unit">Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Completion Progress Bar */}
            <div className="milestone-progress-section">
              <div className="milestone-progress-header">
                <span className="progress-status-text">{completionRate}% Completed</span>
                <span className="progress-target-text">Target: 100% by Exam Day</span>
              </div>
              <div className="milestone-progress-track">
                <div
                  className="milestone-progress-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Exam Readiness Box */}
            <div className="exam-readiness-box">
              <h3 className="readiness-box-header">EXAM READINESS</h3>
              <div className="readiness-box-inner">
                {/* Radial Gauge & Status */}
                <div className="readiness-box-left">
                  <div
                    className="readiness-conic-gauge"
                    style={{
                      background: `conic-gradient(#2d6a4f 0% ${readinessScore}%, #E2E8F0 ${readinessScore}% 100%)`,
                    }}
                  >
                    <div className="readiness-conic-inner">
                      <span className="readiness-conic-pct">{animatedScore}%</span>
                      <span className="readiness-conic-lbl">Ready</span>
                    </div>
                  </div>
                  <div className="readiness-box-msg-col">
                    <div className="readiness-level-title">{readinessLevel.label}</div>
                    <div className="readiness-level-msg">{readinessLevel.message}</div>
                  </div>
                </div>

                {/* Projected Score Pill */}
                <div className="projected-score-pill">
                  <div className="projected-pill-lbl">PROJECTED</div>
                  <div className="projected-pill-val">
                    {animatedProjectedScore} <span className="projected-pill-max">/ 100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strong Areas vs Weak Areas */}
            <div className="areas-matrix-row">
              {/* Strong Areas */}
              <div className="areas-list-col">
                <div className="areas-title-wrap">
                  <div className="areas-dot dot-green" />
                  <h4 className="areas-title text-green">Strong Areas</h4>
                </div>
                <ul className="areas-pill-list">
                  {dynamicStrongAreas.map((area) => (
                    <li className="area-pill-item green" key={area}>
                      <span className="area-pill-icon green">✓</span>
                      <span className="area-pill-text">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weak Areas */}
              <div className="areas-list-col border-t-sm">
                <div className="areas-title-wrap">
                  <div className="areas-dot dot-red" />
                  <h4 className="areas-title text-red">Weak Areas</h4>
                </div>
                <ul className="areas-pill-list">
                  {dynamicWeakAreas.map((area) => (
                    <li className="area-pill-item red" key={area}>
                      <span className="area-pill-icon red">✕</span>
                      <span className="area-pill-text">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 3. DAILY FOCUS & QUICK REVIEW (2x2 Grid) */}
          <section className="daily-focus-grid-section">
            <div className="daily-focus-header">
              <div className="daily-focus-header-left">
                <h3 className="daily-focus-title">Daily Focus &amp; Quick Review</h3>
                <span className="daily-focus-badge">High Yield</span>
              </div>
              <span className="daily-focus-sub">Spaced repetition</span>
            </div>

            {/* 2x2 Clean Mobile Grid */}
            <div className="daily-focus-2x2-grid">
              {/* Card 1: Today's Revision */}
              <div className="focus-card card-revision">
                <div className="focus-card-top-row">
                  <div className="focus-icon-box bg-forest">
                    <svg className="focus-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect height="12" rx="2" strokeWidth="2" width="18" x="3" y="4" />
                      <path d="M7 20h10" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="focus-badge badge-forest">Due</span>
                </div>
                <div className="focus-card-body">
                  <div className="focus-card-name">Today's<br />Revision</div>
                  <div className="focus-card-metric text-forest">{dailyFocus.flashcardsDue}</div>
                  <div className="focus-card-unit">Flashcards Due</div>
                </div>
                <button
                  type="button"
                  className="focus-card-btn btn-forest"
                  onClick={onNavigateSubjects}
                >
                  <span>Review Now</span>
                  <span>→</span>
                </button>
              </div>

              {/* Card 2: Incorrect Qs */}
              <div className="focus-card card-incorrect">
                <div className="focus-card-top-row">
                  <div className="focus-icon-box bg-rose">
                    <svg className="focus-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <span className="focus-badge badge-rose">Alert</span>
                </div>
                <div className="focus-card-body">
                  <div className="focus-card-name">Incorrect<br />Qs</div>
                  <div className="focus-card-metric text-rose">{dailyFocus.incorrectQuestions}</div>
                  <div className="focus-card-unit">Questions</div>
                </div>
                <button
                  type="button"
                  className="focus-card-btn btn-rose"
                  onClick={onNavigatePractice}
                >
                  <span>Review Now</span>
                  <span>→</span>
                </button>
              </div>

              {/* Card 3: Forgotten Topics */}
              <div className="focus-card card-forgotten">
                <div className="focus-card-top-row">
                  <div className="focus-icon-box bg-purple">
                    <svg className="focus-svg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                    </svg>
                  </div>
                  <span className="focus-badge badge-purple">Memory</span>
                </div>
                <div className="focus-card-body">
                  <div className="focus-card-name">Forgotten<br />Topics</div>
                  <div className="focus-card-metric text-purple">{dailyFocus.forgottenTopics}</div>
                  <div className="focus-card-unit">Topics</div>
                </div>
                <button
                  type="button"
                  className="focus-card-btn btn-purple"
                  onClick={onNavigateSubjects}
                >
                  <span>Review Now</span>
                  <span>→</span>
                </button>
              </div>

              {/* Card 4: Daily Mission */}
              <div className="focus-card card-mission">
                <div>
                  <div className="mission-title-row">
                    <div className="mission-icon-box">
                      <svg className="mission-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" strokeWidth="2" />
                      </svg>
                    </div>
                    <span className="mission-title-text">Daily Mission</span>
                  </div>

                  <div className="mission-items-wrap">
                    {/* MCQs */}
                    <div className="mission-progress-item">
                      <div className="mission-item-header">
                        <span className="mission-item-name">
                          <span className="mission-check-symbol">✔</span> MCQs
                        </span>
                        <span className="mission-item-pct">{dailyFocus.mcqPercent}%</span>
                      </div>
                      <div className="mission-track-line">
                        <div
                          className="mission-fill-line fill-forest"
                          style={{ width: `${dailyFocus.mcqPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Flashcards */}
                    <div className="mission-progress-item">
                      <div className="mission-item-header">
                        <span className="mission-item-name">
                          <span className="mission-check-symbol">✔</span> Cards
                        </span>
                        <span className="mission-item-pct">{dailyFocus.flashcardPercent}%</span>
                      </div>
                      <div className="mission-track-line">
                        <div
                          className="mission-fill-line fill-forest"
                          style={{ width: `${dailyFocus.flashcardPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Mock Test */}
                    <div className="mission-progress-item">
                      <div className="mission-item-header">
                        <span className="mission-item-name muted">
                          <span className="mission-circle-symbol">○</span> Mock
                        </span>
                        <span className="mission-item-pct muted">{dailyFocus.mockPercent}%</span>
                      </div>
                      <div className="mission-track-line">
                        <div
                          className="mission-fill-line fill-forest"
                          style={{ width: `${dailyFocus.mockPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. SUBJECTS & MODULES SECTION */}
          <section className="subjects-modules-section">
            <div className="subjects-section-header">
              <div className="subjects-header-left">
                <div className="subjects-header-dot" />
                <h3 className="subjects-header-title">Subjects &amp; Modules</h3>
                <span className="subjects-header-badge">{subjectCards.length} Active</span>
              </div>
              <button
                type="button"
                className="subjects-view-all-btn"
                onClick={onNavigateSubjects}
              >
                Core Syllabus
              </button>
            </div>

            {effectiveCourseId && courseRegistry.subjectsList.length === 0 ? (
              <EmptyCourseState courseName={activeCourse?.name} />
            ) : (
              <div className="subjects-2col-grid">
                {subjectCards.map((subject) => (
                  <SubjectCard
                    key={subject.title}
                    subject={subject}
                    onSelect={onOpenSubjectDetail}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 5. PERFORMANCE OVERVIEW SECTION */}
          <section className="performance-analytics-card">
            <div className="perf-header-row">
              <h3 className="perf-section-title">Performance Overview</h3>
              <button type="button" className="perf-filter-pill">
                <span>This Week</span>
                <svg className="perf-chevron-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="perf-stats-3col-grid">
              {/* Metric 1: Accuracy */}
              <div className="perf-stat-card">
                <div>
                  <div className="perf-stat-label-row">
                    <svg className="perf-stat-svg text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span className="perf-stat-label">Accuracy</span>
                  </div>
                  <div className="perf-stat-number">{averageAccuracy}%</div>
                  {averageAccuracy > 0 && (
                    <div className="perf-stat-trend-tag">↑ Real</div>
                  )}
                </div>
                <div className="perf-sparkline-box">
                  <svg className="perf-sparkline-svg" fill="none" stroke="#40916c" viewBox="0 0 100 25">
                    <path d={accuracySparkline.path} strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              {/* Metric 2: Questions */}
              <div className="perf-stat-card">
                <div>
                  <div className="perf-stat-label-row">
                    <svg className="perf-stat-svg text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span className="perf-stat-label">Questions</span>
                  </div>
                  <div className="perf-stat-number">{formatCompactNumber(totalQuestionsAttempted)}</div>
                  {totalQuestionsAttempted > 0 && (
                    <div className="perf-stat-trend-tag">↑ Solved</div>
                  )}
                </div>
                <div className="perf-sparkline-box">
                  <svg className="perf-sparkline-svg" fill="none" stroke="#40916c" viewBox="0 0 100 25">
                    <path d={questionsSparkline.path} strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              {/* Metric 3: Time Spent */}
              <div className="perf-stat-card">
                <div>
                  <div className="perf-stat-label-row">
                    <svg className="perf-stat-svg text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" strokeWidth="2" />
                      <path d="M12 7v5l3 3" strokeWidth="2" />
                    </svg>
                    <span className="perf-stat-label">Time</span>
                  </div>
                  <div className="perf-stat-number leading-tight">{totalTimeSpentFormatted}</div>
                  {pastAttempts.length > 0 && (
                    <div className="perf-stat-trend-tag">Active</div>
                  )}
                </div>
                <div className="perf-sparkline-box">
                  <svg className="perf-sparkline-svg" fill="none" stroke="#2d6a4f" viewBox="0 0 100 25">
                    <path d={timeSparkline.path} strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* 6. RECENT ACTIVITY FEED */}
          <section className="recent-activity-card">
            <div className="activity-header-row">
              <h3 className="activity-section-title">Recent Activity</h3>
              <button
                type="button"
                className="activity-view-all-link"
                onClick={onNavigatePractice}
              >
                View All &gt;
              </button>
            </div>

            <div className="activity-feed-list">
              {dynamicActivityItems.length === 0 ? (
                <div className="activity-empty-state">
                  <span className="activity-empty-icon">📝</span>
                  <span className="activity-empty-text">No practice activity yet. Complete a quiz to track your history!</span>
                </div>
              ) : (
                dynamicActivityItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="activity-feed-item"
                    onClick={() => {
                      if (item.subjectKey) onOpenSubjectDetail(item.subjectKey)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="activity-item-left">
                      <div className={`activity-icon-sq ${item.iconType === 'good' ? 'bg-green' : 'bg-red'}`}>
                        {item.iconType === 'good' ? (
                          <svg className="act-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                          </svg>
                        ) : (
                          <svg className="act-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                          </svg>
                        )}
                      </div>
                      <div className="activity-item-info">
                        <h4 className="activity-item-title" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="activity-item-meta">
                          <span className="activity-item-stat">{item.statText}</span>
                          <span className="activity-item-bullet">•</span>
                          <span className={`activity-item-acc ${item.accuracyVal >= 50 ? 'acc-green' : 'acc-red'}`}>
                            {item.accuracyText}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="activity-item-time">{item.timeAgo}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 7. EXAM STRATEGY TIP CARD */}
          <section className="exam-strategy-card">
            <div className="strategy-icon-box">💡</div>
            <p className="strategy-text">
              <strong className="strategy-bold">Exam Strategy:</strong>{' '}
              {dynamicWeakAreas.length > 0
                ? `Practice 50+ ${dynamicWeakAreas.join(' and ')} MCQs today to convert weak areas into strengths.`
                : 'Consistent daily practice and regular chapter revisions maximize retention and exam confidence.'}
            </p>
          </section>
        </main>
      </MobileLayout>
    </div>
  )
}

export default DashboardPage