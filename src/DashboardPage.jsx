import { useEffect, useMemo, useRef, useState } from 'react'
import './Dashboard.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import { useContentRegistry } from './data/contentRegistry'
import { navigate, testSession } from './utils/navigation'
import { useRoleStore } from './data/roleStore'
import { useWorkspaceStore, setActiveWorkspace } from './data/workspaceStore'
import { useCourseRegistry } from './data/courseRegistry'
import StudentCourseSelector from './components/student/StudentCourseSelector'
import RoleSwitch from './components/student/RoleSwitch'
import EmptyCourseState from './components/admin/EmptyCourseState'
import { formatCompactNumber, formatInteger } from './services/mcqAnalyticsService'
import SubjectCard from './components/subject/SubjectCard'

const strongAreas = ['DBMS', 'Operating System', 'Computer Networks']
const weakAreas = ['COA', 'Digital Electronics']

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

// ── Dynamic Readiness Levels ─────────────────────────────
const READINESS_LEVELS = {
  beginner: {
    min: 0,
    max: 39,
    label: 'Beginner',
    message: "Let's build your foundation.",
    ringGradient: ['#FF5A5F', '#F1621B'],
    glow: 'rgba(240, 68, 56, 0.4)',
    accent: '#FF6B6B',
    badgeClass: 'badge-beginner',
    cardAccent: 'rgba(240, 68, 56, 0.14)',
  },
  improving: {
    min: 40,
    max: 69,
    label: 'Improving',
    message: 'Keep going!',
    ringGradient: ['#F1621B', '#FFB020'],
    glow: 'rgba(241, 98, 27, 0.4)',
    accent: '#FF8A3D',
    badgeClass: 'badge-improving',
    cardAccent: 'rgba(241, 98, 27, 0.14)',
  },
  competitive: {
    min: 70,
    max: 84,
    label: 'Competitive',
    message: 'Approaching exam-ready.',
    ringGradient: ['#0E9494', '#12B76A'],
    glow: 'rgba(14, 148, 148, 0.4)',
    accent: '#3EE088',
    badgeClass: 'badge-competitive',
    cardAccent: 'rgba(14, 148, 148, 0.14)',
  },
  examReady: {
    min: 85,
    max: 100,
    label: 'Exam Ready',
    message: 'Excellent momentum!',
    ringGradient: ['#12B76A', '#34D399'],
    glow: 'rgba(18, 183, 106, 0.4)',
    accent: '#3EE088',
    badgeClass: 'badge-exam-ready',
    cardAccent: 'rgba(18, 183, 106, 0.14)',
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

// Color tone mapping for dashboard subject cards
const DASH_TONE_MAP = [
  { iconClass: 'icon-red', accent: '#F04438', accentBg: '#FDEDEC', ringTrack: '#FDEDEC' },
  { iconClass: 'icon-blue', accent: '#2E5CE6', accentBg: '#EEF2FF', ringTrack: '#E7EDFD' },
  { iconClass: 'icon-green', accent: '#12B76A', accentBg: '#E9F9F1', ringTrack: '#DFF7EA' },
  { iconClass: 'icon-purple', accent: '#7C3AED', accentBg: '#F1EDFC', ringTrack: '#EFE6FC' },
  { iconClass: 'icon-orange', accent: '#F1621B', accentBg: '#FFF1E6', ringTrack: '#FFE9D9' },
  { iconClass: 'icon-teal', accent: '#0E9494', accentBg: '#E6F7F7', ringTrack: '#DDF4F4' },
]

const drawerPrimaryItems = [
  { icon: 'home', label: 'Dashboard', active: true },
  { icon: 'subjects', label: 'Subjects' },
  { icon: 'practice', label: 'Practice' },
  { icon: 'flashcards', label: 'Flashcards', disabled: true },
  { icon: 'mockTests', label: 'Mock Tests', disabled: true },
]

const drawerProgressItems = [
  { icon: 'analytics', label: 'Analytics', disabled: true },
  { icon: 'studyPlanner', label: 'Study Planner', disabled: true },
  { icon: 'leaderboard', label: 'Leaderboard', disabled: true },
]

const drawerMoreItems = [
  { icon: 'notes', label: 'Notes', disabled: true },
  { icon: 'notifications', label: 'Notifications', badge: '3', disabled: true },
  { icon: 'settings', label: 'Settings', disabled: true },
  { icon: 'help', label: 'Help & Support', disabled: true },
  { icon: 'adminDashboard', label: 'Admin' },
]

function ReadinessRing({ size = 96, radius = 38, strokeWidth = 8, progress, gradient, glow, trackColor = '#1E293B', children }) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const animatedRef = useRef(0)
  const gradientId = useMemo(() => `readiness-grad-${Math.random().toString(36).slice(2, 9)}`, [])
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    let raf
    const start = performance.now()
    const from = animatedRef.current
    const to = progress
    const duration = 1400

    const tick = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (to - from) * eased
      setAnimatedProgress(current)
      animatedRef.current = current
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [progress])

  const dashOffset = circumference - (animatedProgress / 100) * circumference

  return (
    <div className="readiness-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="readiness-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="readiness-ring-value">{children}</div>
    </div>
  )
}

function DrawerItem({ icon, label, badge, active, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`drawer-item${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="d-icon" aria-hidden="true">
        <AppIcon name={icon} size={18} />
      </span>
      {label}
      {badge ? <span className="d-badge">{badge}</span> : null}
    </button>
  )
}

function DashboardPage({
  courseId,
  onNavigateSubjects = () => {},
  onNavigatePractice = () => {},
  onOpenSubjectDetail = () => {},
  onNavigateAdmin = () => {},
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const registry = useContentRegistry()
  const courseRegistry = useCourseRegistry(activeWorkspaceId)
  const { isAdmin } = useRoleStore()

  const activeCourse = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null
  const effectiveCourseId = activeWorkspaceId || activeCourse?.id

  // Past attempts history merging in-memory state with persistent localStorage cache
  const pastAttempts = useMemo(() => {
    let memoryAttempts = Array.isArray(testSession.attemptHistoryData) ? testSession.attemptHistoryData : []
    if (memoryAttempts.length === 0) {
      try {
        const cached = localStorage.getItem('nexora_recent_mcq_attempts')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) memoryAttempts = parsed
        }
      } catch {
        // ignore
      }
    }
    return memoryAttempts
  }, [testSession.attemptHistoryData])

  // Recent attempted MCQs list sorted by newest attempt first
  const recentAttemptsList = useMemo(() => {
    const attempts = [...pastAttempts]
    attempts.reverse()

    if (attempts.length > 0) {
      return attempts.map((att) => {
        const sub = registry.subjectCatalog[att.subjectKey] || null
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
          timeAgo: formatTimeAgo(att.timestamp),
          isReal: true,
        }
      })
    }

    // Default fallback from subject catalog
    const firstSubKey = Object.keys(registry.subjectCatalog)[0] || 'computer-networks'
    const firstSub = registry.subjectCatalog[firstSubKey]
    return [
      {
        id: 'default-1',
        subjectKey: firstSubKey,
        subjectTitle: firstSub?.title || 'Computer Networks',
        chapterTitle: firstSub?.chapters?.[0]?.title || 'Routing Algorithms',
        icon: firstSub?.icon || 'computerNetworks',
        accuracy: 72,
        correct: 14,
        attempted: 18,
        total: 20,
        timeAgo: 'Recommended',
        isReal: false,
      },
    ]
  }, [pastAttempts, registry.subjectCatalog])

  const topRecentAttempt = recentAttemptsList[0]

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

  // Dynamic Exam Readiness Index calculated across ALL subjects (existing + future newly added subjects)
  const readinessScore = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    if (list.length === 0) {
      if (pastAttempts.length > 0) {
        const totalAcc = pastAttempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0)
        return Math.min(100, Math.max(0, Math.round(totalAcc / pastAttempts.length)))
      }
      return 0
    }

    // 1. Calculate overall coverage across all existing & newly added subjects
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

    // 2. Real quiz accuracy from student response history
    let avgQuizAccuracy = 0
    if (pastAttempts.length > 0) {
      const totalAcc = pastAttempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0)
      avgQuizAccuracy = Math.round(totalAcc / pastAttempts.length)
    } else if (totalAttemptedSubCount > 0) {
      avgQuizAccuracy = Math.round(totalMastery / totalAttemptedSubCount)
    }

    // If student has answered quizzes, blend coverage (40%) and actual accuracy (60%)
    if (pastAttempts.length > 0 || totalAttemptedSubCount > 0) {
      const blended = Math.round(avgCoverage * 0.4 + avgQuizAccuracy * 0.6)
      return Math.max(5, Math.min(100, blended))
    }

    // If brand new or getting started, reflects actual coverage % (default 40% if demo / unattempted)
    return Math.max(0, Math.min(100, avgCoverage > 0 ? avgCoverage : 40))
  }, [courseRegistry.subjectsList, pastAttempts, subjectPerformanceMap])

  const readinessLevel = getReadinessLevel(readinessScore)
  const animatedScore = useAnimatedNumber(readinessScore)

  // Dynamic Projected Score (out of 100) reflecting student real quiz response & readiness
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
    const sum = list.reduce((acc, s) => acc + (s.counts?.mcqs || s.totalMcqs || 0), 0)
    return sum > 0 ? sum : 909
  }, [courseRegistry])

  const totalFlashcards = useMemo(() => {
    if (typeof courseRegistry.flashcardCount === 'number' && courseRegistry.flashcardCount > 0) {
      return courseRegistry.flashcardCount
    }
    const list = courseRegistry.subjectsList || []
    return list.reduce((acc, s) => acc + (s.counts?.flashcards || s.totalFlashcards || 0), 0)
  }, [courseRegistry])

  const completionRate = readinessScore

  // Derive ALL subject cards from courseRegistry, sorted by recent attempt and reflecting real MCQ accuracy
  const subjectCards = useMemo(() => {
    const list = [...(courseRegistry.subjectsList || [])]
    
    // Sort by most recently attempted first
    list.sort((a, b) => {
      const timeA = subjectLastAttemptMap[a.subjectKey] || 0
      const timeB = subjectLastAttemptMap[b.subjectKey] || 0
      if (timeA !== timeB) return timeB - timeA
      return 0
    })

    return list.map((s, i) => {
      const tone = DASH_TONE_MAP[i % DASH_TONE_MAP.length]
      const perf = subjectPerformanceMap[s.subjectKey] || null
      const lastTs = perf?.lastAttemptTimestamp || subjectLastAttemptMap[s.subjectKey]

      const hasAttempts = Boolean(s.hasAttempts || (perf && perf.attemptsCount > 0))
      const coveragePercent = typeof s.coveragePercent === 'number' ? s.coveragePercent : (s.progress || 0)
      const masteryPercent = typeof s.masteryPercent === 'number' ? s.masteryPercent : (s.accuracy || 0)
      const coverageLevel = s.coverageLevel
      const ringColor = coverageLevel?.color || tone.accent

      return {
        subjectKey: s.subjectKey,
        title: s.title,
        icon: s.icon,
        accent: tone.accent,
        accentBg: tone.accentBg,
        iconClass: tone.iconClass,
        progress: coveragePercent,
        accuracy: masteryPercent,
        coveragePercent,
        masteryPercent,
        coverageLevel,
        ringColor,
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

  // Dynamic Strong / Weak areas derived from all subjects in courseRegistry
  const { dynamicStrongAreas, dynamicWeakAreas } = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    if (list.length === 0) {
      return { dynamicStrongAreas: strongAreas, dynamicWeakAreas: weakAreas }
    }

    // Rank all subjects dynamically based on accuracy, coverage, and student attempts
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

    // Sort descending by rankScore
    const sorted = [...evaluated].sort((a, b) => b.rankScore - a.rankScore)

    // Strong areas: top 3 subjects
    const strong = sorted.slice(0, 3).map((s) => s.title)

    // Weak areas: subjects with low accuracy (<55%) or lowest rank, excluding strong areas
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
      dynamicStrongAreas: strong.length > 0 ? strong : strongAreas,
      dynamicWeakAreas: filteredWeak.length > 0 ? filteredWeak : (sorted.length > 1 ? [sorted[sorted.length - 1].title] : weakAreas),
    }
  }, [courseRegistry.subjectsList, subjectPerformanceMap])

  // Dynamic Activity Items
  const dynamicActivityItems = useMemo(() => {
    if (pastAttempts.length > 0) {
      return pastAttempts.slice(-3).reverse().map((att, idx) => {
        const sub = courseRegistry.subjectCatalog[att.subjectKey]
        const subjectTitle = sub?.title || att.subjectTitle || att.subjectKey || 'Subject Practice'
        const chapterTitle = att.chapterTitle || 'MCQ Practice Session'
        const acc = att.accuracy !== undefined ? att.accuracy : 0
        const isGood = acc >= 50
        const total = att.total || att.attempted || 10
        const correct = att.correct !== undefined ? att.correct : Math.round((acc / 100) * total)

        return {
          id: att.id || `act-${idx}`,
          subjectKey: att.subjectKey,
          icon: isGood ? 'check' : 'cross',
          iconClass: isGood ? 'icon-green' : 'icon-red',
          title: `${subjectTitle}: ${chapterTitle}`,
          statText: `${correct}/${total} Correct`,
          accuracyText: `${acc}% Accuracy`,
          accuracyVal: acc,
          timeAgo: formatTimeAgo(att.timestamp),
        }
      })
    }

    // Default canonical mockup items with 10 questions representation
    return [
      {
        id: 'mock-1',
        icon: 'check',
        iconClass: 'icon-green',
        title: 'Chapter 01: Introduction to Computer Networks & Network Models',
        statText: '10/10 Correct',
        accuracyText: '100% Accuracy',
        accuracyVal: 100,
        timeAgo: '4h ago',
      },
      {
        id: 'mock-2',
        icon: 'cross',
        iconClass: 'icon-red',
        title: 'COA: Instruction Cycle',
        statText: '3/10 Correct',
        accuracyText: '30% Accuracy',
        accuracyVal: 30,
        timeAgo: '1d ago',
      },
      {
        id: 'mock-3',
        icon: 'bookmark',
        iconClass: 'icon-purple',
        title: 'Flashcards Reviewed',
        statText: '',
        accuracyText: '',
        extraSub: '20 Flashcards',
        accuracyVal: 100,
        timeAgo: '2d ago',
      },
    ]
  }, [pastAttempts, courseRegistry])

  // Metrics for Performance Overview
  const totalQuestionsAttempted = useMemo(() => {
    if (pastAttempts.length > 0) {
      return pastAttempts.reduce((sum, a) => sum + (a.attempted || a.total || 0), 0)
    }
    return 20
  }, [pastAttempts])

  const averageAccuracy = useMemo(() => {
    if (pastAttempts.length > 0) {
      const sum = pastAttempts.reduce((s, a) => s + (a.accuracy || 0), 0)
      return Math.round(sum / pastAttempts.length)
    }
    return 100
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

  const courseDisplayName = (activeCourse?.name || 'BPSC 4.0 COMPUTER SCIENCE').toUpperCase()

  return (
    <div className="app-shell">
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`side-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-profile">
          <button
            type="button"
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <AppIcon name="close" size={18} />
          </button>
          <div className="drawer-avatar" aria-hidden="true">
            <AppIcon name="profile" size={26} />
          </div>
          <div className="drawer-name">Abhi Kumar</div>
          <div className="drawer-sub">{activeCourse?.name || 'BPSC TRE 4.0 • Computer Science'}</div>
          <div className="drawer-streak">
            <AppIcon name="streak" size={14} />
            14 Day Streak
          </div>
        </div>

        <div className="drawer-menu">
          {drawerPrimaryItems.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              disabled={item.disabled}
              onClick={() => {
                if (item.label === 'Subjects') {
                  onNavigateSubjects()
                  return
                }
                if (item.label === 'Practice') {
                  onNavigatePractice()
                  return
                }
                setDrawerOpen(false)
              }}
            />
          ))}

          <div className="drawer-divider" />
          <div className="drawer-section-label">TRACK PROGRESS</div>

          {drawerProgressItems.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              disabled={item.disabled}
              onClick={() => setDrawerOpen(false)}
            />
          ))}

          <div className="drawer-divider" />
          <div className="drawer-section-label">MORE</div>

          {drawerMoreItems.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              disabled={item.disabled}
              onClick={() => {
                if (item.label === 'Admin') {
                  onNavigateAdmin()
                  return
                }
                setDrawerOpen(false)
              }}
            />
          ))}
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="drawer-logout"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="d-icon" aria-hidden="true">
              <AppIcon name="logout" size={18} />
            </span>
            Log Out
          </button>
        </div>
      </aside>

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
        {/* HEADER SECTION (Matching Mockup) */}
        <header className="dash-header">
          <div className="dash-header-left">
            <button
              type="button"
              className="dash-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <AppIcon name="menu" size={20} />
            </button>
            <div className="dash-greeting-box">
              <div className="dash-greeting-title">Good Evening, Abhi 👋</div>
              <div className="dash-greeting-sub">{courseDisplayName}</div>
            </div>
          </div>

          <div className="dash-header-right">
            <StudentCourseSelector onSelect={handleCourseSelect} />
            <div className="dash-bell-btn" role="button" tabIndex={0} aria-label="Notifications">
              <AppIcon name="notifications" size={20} />
              <span className="dash-bell-badge">3</span>
            </div>
            {isAdmin && (
              <div className="dashboard-role-switch">
                <RoleSwitch onSwitchToAdmin={onNavigateAdmin} onSwitchToStudent={() => navigate('')} />
              </div>
            )}
          </div>
        </header>

        <main className="dash-content">
          {/* 1. EXAM SUMMARY SECTION */}
          <section className="exam-summary-card">
            <div className="exam-summary-grid">
              {/* Col 1: Exam in */}
              <div className="summary-stat-item">
                <div className="summary-icon-circle">
                  <AppIcon name="calendar" size={18} />
                </div>
                <div className="summary-stat-info">
                  <span className="summary-stat-label">Exam in</span>
                  <span className="summary-stat-val">84</span>
                  <span className="summary-stat-sub">Days</span>
                </div>
              </div>

              <div className="summary-stat-divider" />

              {/* Col 2: Today's Goal */}
              <div className="summary-stat-item goal-item">
                <div className="summary-icon-circle">
                  <AppIcon name="goal" size={18} />
                </div>
                <div className="summary-stat-info">
                  <span className="summary-stat-label">Today's Goal</span>
                  <div className="summary-goal-lines">
                    <span className="summary-goal-line"><b>{formatCompactNumber(totalMcqs)}</b> MCQs</span>
                    <span className="summary-goal-line subtle"><b>{formatCompactNumber(totalFlashcards)}</b> Flashcards</span>
                  </div>
                </div>
              </div>

              <div className="summary-stat-divider" />

              {/* Col 3: Study Streak */}
              <div className="summary-stat-item">
                <div className="summary-icon-circle">
                  <AppIcon name="streak" size={18} />
                </div>
                <div className="summary-stat-info">
                  <span className="summary-stat-label">Study Streak</span>
                  <span className="summary-stat-val">14</span>
                  <span className="summary-stat-sub">Days</span>
                </div>
              </div>
            </div>

            {/* Integrated Completion Progress */}
            <div className="summary-progress-wrap">
              <span className="summary-progress-pct"><b>{completionRate}%</b> Completed</span>
              <div className="summary-progress-track">
                <div
                  className="summary-progress-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </section>

          {/* 2. EXAM READINESS CARD (Dark Premium Theme) */}
          <section className="dash-readiness-card">
            <div className="readiness-card-header">
              <span className="readiness-card-title">EXAM READINESS</span>
            </div>

            <div className="readiness-main-row">
              {/* Circular Indicator */}
              <div className="readiness-ring-col">
                <ReadinessRing
                  size={92}
                  radius={38}
                  strokeWidth={8}
                  progress={readinessScore}
                  gradient={readinessLevel.ringGradient}
                  glow={readinessLevel.glow}
                  trackColor="#1E293B"
                >
                  <div className="readiness-ring-content">
                    <span className="readiness-ring-pct">{animatedScore}%</span>
                    <span className="readiness-ring-sub">Readiness</span>
                  </div>
                </ReadinessRing>
              </div>

              {/* Status Message */}
              <div className="readiness-status-col">
                <span className="readiness-level-name">{readinessLevel.label}</span>
                <span className="readiness-level-sub">{readinessLevel.message}</span>
              </div>

              {/* Projected Score */}
              <div className="readiness-projected-col">
                <span className="projected-label">Projected Score</span>
                <div className="projected-score-val">
                  <b>{animatedProjectedScore}</b> <span>/ 100</span>
                </div>
              </div>
            </div>

            <div className="readiness-hr-divider" />

            {/* Strong Areas vs Weak Areas */}
            <div className="readiness-areas-row">
              <div className="areas-col">
                <div className="areas-header strong-header">Strong Areas</div>
                <div className="areas-list">
                  {dynamicStrongAreas.map((area) => (
                    <div className="area-item" key={area}>
                      <span className="area-icon check-icon"><AppIcon name="check" size={10} /></span>
                      <span className="area-name">{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="areas-col">
                <div className="areas-header weak-header">Weak Areas</div>
                <div className="areas-list">
                  {dynamicWeakAreas.map((area) => (
                    <div className="area-item" key={area}>
                      <span className="area-icon cross-icon"><AppIcon name="cross" size={10} /></span>
                      <span className="area-name">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3. QUICK ACTION SECTION (2 × 2 Grid) */}
          <section className="quick-actions-grid">
            {/* Card 1: Today's Revision */}
            <div className="quick-card card-green" onClick={onNavigateSubjects} role="button" tabIndex={0}>
              <div className="quick-card-top">
                <div className="quick-icon-box icon-green">
                  <AppIcon name="computer" size={16} />
                </div>
              </div>
              <div className="quick-card-title">Today's Revision</div>
              <div className="quick-card-metric num-green">45</div>
              <div className="quick-card-sub">Flashcards Due</div>
              <div className="quick-card-action act-green">Review Now →</div>
            </div>

            {/* Card 2: Incorrect Qs */}
            <div className="quick-card card-red" onClick={onNavigatePractice} role="button" tabIndex={0}>
              <div className="quick-card-top">
                <div className="quick-icon-box icon-red">
                  <AppIcon name="cross" size={14} />
                </div>
              </div>
              <div className="quick-card-title">Incorrect Qs</div>
              <div className="quick-card-metric num-red">12</div>
              <div className="quick-card-sub">Questions</div>
              <div className="quick-card-action act-red">Review Now →</div>
            </div>

            {/* Card 3: Forgotten Topics */}
            <div className="quick-card card-purple" onClick={onNavigateSubjects} role="button" tabIndex={0}>
              <div className="quick-card-top">
                <div className="quick-icon-box icon-purple">
                  <AppIcon name="bookmark" size={15} />
                </div>
              </div>
              <div className="quick-card-title">Forgotten Topics</div>
              <div className="quick-card-metric num-purple">6</div>
              <div className="quick-card-sub">Topics</div>
              <div className="quick-card-action act-purple">Review Now →</div>
            </div>

            {/* Card 4: Daily Mission */}
            <div className="quick-card card-blue daily-mission-card">
              <div className="quick-card-top mission-top">
                <div className="quick-icon-box icon-blue">
                  <AppIcon name="target" size={15} />
                </div>
                <span className="mission-card-title">Daily Mission</span>
              </div>
              <div className="mission-rows-wrap">
                <div className="mission-row">
                  <div className="mission-row-header">
                    <span className="mission-check done"><AppIcon name="check" size={8} /></span>
                    <span className="mission-name">MCQs</span>
                    <span className="mission-pct">65%</span>
                  </div>
                  <div className="mission-mini-track">
                    <div className="mission-mini-fill fill-green" style={{ width: '65%' }} />
                  </div>
                </div>

                <div className="mission-row">
                  <div className="mission-row-header">
                    <span className="mission-check done"><AppIcon name="check" size={8} /></span>
                    <span className="mission-name">Flashcards</span>
                    <span className="mission-pct">75%</span>
                  </div>
                  <div className="mission-mini-track">
                    <div className="mission-mini-fill fill-green" style={{ width: '75%' }} />
                  </div>
                </div>

                <div className="mission-row">
                  <div className="mission-row-header">
                    <span className="mission-check empty" />
                    <span className="mission-name">Mock Test</span>
                    <span className="mission-pct">0%</span>
                  </div>
                  <div className="mission-mini-track">
                    <div className="mission-mini-fill fill-gray" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. CONTINUE PRACTICE BANNER CTA */}
          <section
            className="continue-practice-banner"
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
            <div className="continue-banner-left">
              <div className="continue-banner-icon">
                <AppIcon name="target" size={20} />
              </div>
              <div className="continue-banner-text">
                <div className="continue-banner-title">Continue Practice</div>
                <div className="continue-banner-sub">Resume your personalized session</div>
              </div>
            </div>
            <div className="continue-banner-arrow">
              <AppIcon name="arrowForward" size={16} />
            </div>
          </section>

          {/* 5. YOUR SUBJECTS SECTION (2-Column Grid on Mobile) */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Your Subjects</h2>
            <button type="button" className="dash-view-all-btn" onClick={onNavigateSubjects}>
              View All ›
            </button>
          </div>

          {effectiveCourseId && courseRegistry.subjectsList.length === 0 ? (
            <EmptyCourseState />
          ) : (
            <section className="dash-subjects-grid">
              {subjectCards.map((subject) => (
                <SubjectCard key={subject.title} subject={subject} onSelect={onOpenSubjectDetail} />
              ))}
            </section>
          )}

          {/* 6. PERFORMANCE OVERVIEW SECTION */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Performance Overview</h2>
            <div className="dash-period-dropdown">
              <span>This Week</span>
              <AppIcon name="chevronDown" size={14} />
            </div>
          </div>

          <section className="dash-perf-grid">
            {/* Card 1: Accuracy */}
            <div className="dash-perf-card">
              <div className="perf-card-top">
                <AppIcon name="trendingUp" size={13} color="#12B76A" />
                <span className="perf-label">Accuracy</span>
              </div>
              <div className="perf-card-metric-row">
                <span className="perf-metric-val">{averageAccuracy}%</span>
                <span className="perf-trend-badge green">↑ 12%</span>
              </div>
              <div className="perf-sparkline">
                <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="sparkline-svg green">
                  <path d="M0,18 Q15,8 30,16 T60,10 T90,14 L100,6" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,18 Q15,8 30,16 T60,10 T90,14 L100,6 L100,24 L0,24 Z" fill="rgba(18, 183, 106, 0.12)" />
                </svg>
              </div>
            </div>

            {/* Card 2: Questions Attempted */}
            <div className="dash-perf-card">
              <div className="perf-card-top">
                <AppIcon name="refresh" size={13} color="#2E5CE6" />
                <span className="perf-label">Questions</span>
              </div>
              <div className="perf-card-metric-row">
                <span className="perf-metric-val">{totalQuestionsAttempted}</span>
                <span className="perf-trend-badge green">↑ 5</span>
              </div>
              <div className="perf-sparkline">
                <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="sparkline-svg blue">
                  <path d="M0,16 Q20,20 40,12 T75,15 L100,8" fill="none" stroke="#2E5CE6" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,16 Q20,20 40,12 T75,15 L100,8 L100,24 L0,24 Z" fill="rgba(46, 92, 230, 0.12)" />
                </svg>
              </div>
            </div>

            {/* Card 3: Time Spent */}
            <div className="dash-perf-card">
              <div className="perf-card-top">
                <AppIcon name="clock" size={13} color="#7C3AED" />
                <span className="perf-label">Time Spent</span>
              </div>
              <div className="perf-card-metric-row">
                <span className="perf-metric-val">1h 45m</span>
                <span className="perf-trend-badge green">↑ 20m</span>
              </div>
              <div className="perf-sparkline">
                <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="sparkline-svg purple">
                  <path d="M0,18 Q18,10 35,17 T70,9 L100,12" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,18 Q18,10 35,17 T70,9 L100,12 L100,24 L0,24 Z" fill="rgba(124, 58, 237, 0.12)" />
                </svg>
              </div>
            </div>
          </section>

          {/* 7. RECENT ACTIVITY SECTION */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Recent Activity</h2>
            <button type="button" className="dash-view-all-btn" onClick={onNavigatePractice}>
              View All ›
            </button>
          </div>

          <section className="dash-activity-card">
            {dynamicActivityItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="dash-activity-item"
                onClick={() => {
                  if (item.subjectKey) onOpenSubjectDetail(item.subjectKey)
                }}
                role="button"
                tabIndex={0}
              >
                <div className={`activity-icon-badge ${item.iconClass || 'icon-green'}`}>
                  <AppIcon name={item.icon || 'check'} size={12} />
                </div>
                <div className="activity-info-box">
                  <div className="activity-item-title" title={item.title}>{item.title}</div>
                  <div className="activity-item-sub">
                    {item.statText && <span className="activity-stat">{item.statText}</span>}
                    {item.accuracyText && (
                      <span className={`activity-acc ${item.accuracyVal >= 50 ? 'acc-good' : 'acc-bad'}`}>
                        {' • '}{item.accuracyText}
                      </span>
                    )}
                    {item.extraSub && <span className="activity-extra">{item.extraSub}</span>}
                  </div>
                </div>
                <div className="activity-item-right">
                  <span className="activity-timestamp">{item.timeAgo}</span>
                  <AppIcon name="chevronRight" size={14} className="activity-chevron-icon" />
                </div>
              </div>
            ))}
          </section>
        </main>
      </MobileLayout>
    </div>
  )
}

export default DashboardPage