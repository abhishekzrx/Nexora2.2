/**
 * PracticeHubPage.jsx
 * Course-Dependent Dynamic Practice Hub with Dopamine-Boosting Recent Activities.
 * Fully responsive (Mobile-first, Tablet, Desktop) and styled with the vibrant Orange Theme.
 */

import { useEffect, useMemo, useState } from 'react'
import '../styles/practiceHub.css'
import MobileLayout from '../components/layout/MobileLayout'
import AppIcon from '../components/ui/AppIcon'
import StudentCourseSelector from '../components/student/StudentCourseSelector'
import RoleSwitch from '../components/student/RoleSwitch'
import { useWorkspaceStore, setActiveWorkspace } from '../data/workspaceStore'
import { useCourseRegistry } from '../data/courseRegistry'
import { useMemberStore } from '../data/memberStore'
import { useRoleStore } from '../data/roleStore'
import { userAnalyticsService } from '../services/userAnalyticsService'
import { hydrateUserAnalytics, useUserAnalytics } from '../data/analyticsStore'
import { hydrateUserProgressFromSupabase, useUserProgressStore } from '../data/progressStore'
import { formatCompactNumber, formatInteger } from '../services/mcqAnalyticsService'
import { testSession } from '../utils/navigation'

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
  if (hours > 0) return `${hours}h ${minutes}m`
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

  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0

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

function PracticeHubPage({
  courseId,
  onNavigateHome = () => {},
  onNavigateSubjects = () => {},
  onOpenSubject = () => {},
  onOpenFlashcards = () => {},
  onResume = () => {},
  onStartPractice = () => {},
  onNavigateAdmin = () => {},
  onLogout = () => {},
}) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { isAdmin } = useRoleStore()
  const { effectiveMember } = useMemberStore()
  const userProgressState = useUserProgressStore()
  const [persistentAttempts, setPersistentAttempts] = useState([])

  const activeCourse = workspaces.find((w) => w.id === (courseId || activeWorkspaceId)) || workspaces[0] || null
  const effectiveCourseId = activeCourse?.id || activeWorkspaceId

  // Reactive course registry
  const courseRegistry = useCourseRegistry(effectiveCourseId)

  // Hydrate user progress and course attempts
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

  // Past attempts filtered / derived for active course
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
        accuracy: a.accuracy !== undefined ? a.accuracy : 0,
        correct: a.correct_count !== undefined ? a.correct_count : 0,
        attempted: a.attempted_count !== undefined ? a.attempted_count : (a.total_questions || 0),
        total: a.total_questions || 0,
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

  // Filter attempts strictly belonging to active course subjects
  const courseAttempts = useMemo(() => {
    const validSubjectKeys = new Set((courseRegistry.subjectsList || []).map((s) => s.subjectKey))
    if (validSubjectKeys.size === 0) return pastAttempts
    return pastAttempts.filter((a) => !a.subjectKey || validSubjectKeys.has(a.subjectKey))
  }, [pastAttempts, courseRegistry.subjectsList])

  // Top Most Recent MCQ Attempt (Activity 1)
  const topRecentMcqAttempt = useMemo(() => {
    if (courseAttempts.length > 0) {
      const newest = courseAttempts[courseAttempts.length - 1]
      const sub = courseRegistry.subjectCatalog[newest.subjectKey]
      return {
        id: newest.id,
        subjectKey: newest.subjectKey || courseRegistry.subjectsList?.[0]?.subjectKey,
        subjectTitle: newest.subjectTitle || sub?.title || 'Subject Practice',
        chapterId: newest.chapterId,
        chapterTitle: newest.chapterTitle || 'MCQ Practice Session',
        accuracy: newest.accuracy !== undefined ? newest.accuracy : 0,
        correct: newest.correct !== undefined ? newest.correct : 0,
        attempted: newest.attempted || newest.total || 10,
        total: newest.total || 10,
        timeTaken: newest.time_taken_seconds ? `${Math.ceil(newest.time_taken_seconds / 60)} min` : '5 min',
        timeAgo: formatTimeAgo(newest.timestamp || (newest.created_at ? new Date(newest.created_at).getTime() : Date.now())),
        xpEarned: Math.max(20, (newest.correct || 5) * 10),
        isReal: true,
      }
    }
    return null
  }, [courseAttempts, courseRegistry])

  // Flashcard Activity (Activity 2)
  const topFlashcardActivity = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    const firstSubWithCards = list.find((s) => (s.counts?.flashcards || s.totalFlashcards || 0) > 0) || list[0]
    const totalCourseFlashcards = courseRegistry.flashcardCount || list.reduce((sum, s) => sum + (s.counts?.flashcards || s.totalFlashcards || 0), 0)
    
    return {
      subjectKey: firstSubWithCards?.subjectKey || 'core-topics',
      subjectTitle: firstSubWithCards?.title || 'Course Flashcards',
      cardsDue: Math.min(25, Math.max(5, Math.round(totalCourseFlashcards * 0.3) || 12)),
      totalCards: totalCourseFlashcards || 40,
      retentionScore: 94,
      deckName: 'Spaced Repetition Active Recall Queue',
    }
  }, [courseRegistry])

  // Dynamic Course Stats
  const courseStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayAttempts = courseAttempts.filter((a) => {
      const d = (a.created_at || a.timestamp) ? new Date(a.created_at || a.timestamp).toISOString().split('T')[0] : null
      return d === todayStr
    })

    const todayQuestions = todayAttempts.reduce((sum, a) => sum + (Number(a.attempted || a.total || 0)), 0)
    const todayTarget = 30
    const todayProgress = Math.min(100, Math.round((todayQuestions / todayTarget) * 100))

    const accuracy = courseAttempts.length > 0
      ? Math.round(courseAttempts.reduce((s, a) => s + (Number(a.accuracy || 0)), 0) / courseAttempts.length)
      : (userAnalytics.accuracy || 0)

    const studyStreak = calculateStudyStreak(courseAttempts, userAnalytics.snapshots || [])
    const totalTimeSpent = formatTotalTimeSpent(courseAttempts)

    return {
      todayQuestions,
      todayTarget,
      todayProgress,
      accuracy,
      studyStreak,
      totalTimeSpent,
    }
  }, [courseAttempts, userAnalytics])

  // Dynamic Weak Topics for this course
  const weakTopicsList = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    const weakList = []

    list.forEach((sub) => {
      const chs = sub.chapters || []
      chs.forEach((ch) => {
        if (ch.hasAttempts && ch.masteryPercent < 55) {
          weakList.push({
            id: ch.id,
            subjectKey: sub.subjectKey,
            subjectTitle: sub.title,
            chapterName: ch.name || ch.title,
            accuracy: ch.masteryPercent || ch.accuracyPercent || 35,
            opportunity: 'High Yield Gap',
            readinessGain: '+6%',
          })
        }
      })
    })

    if (weakList.length === 0 && list.length > 0) {
      list.slice(0, 2).forEach((sub) => {
        const firstCh = sub.chapters?.[0]
        if (firstCh) {
          weakList.push({
            id: firstCh.id,
            subjectKey: sub.subjectKey,
            subjectTitle: sub.title,
            chapterName: firstCh.name || firstCh.title,
            accuracy: 40,
            opportunity: 'Recommended Focus',
            readinessGain: '+8%',
          })
        }
      })
    }

    return weakList.slice(0, 3)
  }, [courseRegistry.subjectsList])

  // Search and Filter State for History
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [sortBy, setSortBy] = useState('Newest')

  const subjectOptions = useMemo(() => {
    const list = courseRegistry.subjectsList || []
    return ['All Subjects', ...list.map((s) => s.title)]
  }, [courseRegistry.subjectsList])

  const filteredHistory = useMemo(() => {
    let list = [...courseAttempts].reverse()

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          (a.subjectTitle || '').toLowerCase().includes(q) ||
          (a.chapterTitle || '').toLowerCase().includes(q)
      )
    }

    if (subjectFilter !== 'All Subjects') {
      list = list.filter((a) => (a.subjectTitle || '') === subjectFilter)
    }

    if (sortBy === 'Accuracy') {
      list.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
    }

    return list
  }, [courseAttempts, search, subjectFilter, sortBy])

  const handleCourseSelect = (id) => {
    setActiveWorkspace(id)
  }

  return (
    <div className="practice-hub-page">
      <MobileLayout
        activeTab="Practice"
        disabledItems={['Profile']}
        onNavigate={(item) => {
          if (item.center || item.label === 'Subjects') {
            onNavigateSubjects()
          } else if (item.label === 'Home') {
            onNavigateHome()
          }
        }}
      >
        {/* TOP STICKY HEADER WITH COURSE SWITCHER */}
        <header className="practice-top-header">
          <div className="header-inner-row">
            <button
              type="button"
              className="practice-back-btn"
              onClick={onNavigateHome}
              aria-label="Go to dashboard"
            >
              <svg className="p-btn-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </button>

            <div className="header-course-selector-col">
              <StudentCourseSelector onSelect={handleCourseSelect} />
            </div>

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
              {courseAttempts.length > 0 && (
                <span className="header-bell-badge">3</span>
              )}
            </div>

            {isAdmin && (
              <div className="header-role-switch-wrap">
                <RoleSwitch onSwitchToAdmin={onNavigateAdmin} onSwitchToStudent={onNavigateHome} />
              </div>
            )}
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="practice-hub-feed">
          {/* ══════════════════════════════════════════════════════════
              1. DOPAMINE BOOST: TWO MOST RECENT PRODUCT ACTIVITIES
             ══════════════════════════════════════════════════════════ */}
          <section className="dopamine-activities-section">
            <div className="section-title-row">
              <div className="title-with-pill">
                <span className="section-dot" />
                <h2 className="section-heading">Your Learning Momentum</h2>
              </div>
              <span className="section-subtitle">Real-time engagement</span>
            </div>

            <div className="dopamine-cards-grid">
              {/* Card 1: Recent MCQ Practice & High-Score Booster */}
              <div className="dopamine-card card-mcq-momentum">
                <div className="dopamine-card-glow mcq-glow" />
                <div className="dopamine-card-header">
                  <div className="dopamine-icon-box bg-orange-gradient">
                    <svg className="d-card-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                    </svg>
                  </div>
                  <div className="dopamine-badge-wrap">
                    <span className="dopamine-pill pill-mcq">
                      {topRecentMcqAttempt ? '🔥 ACTIVE RECALL' : '🚀 READY TO BLAST'}
                    </span>
                  </div>
                </div>

                <div className="dopamine-card-body">
                  <div className="dopamine-kicker">RECENT MCQ PRACTICE</div>
                  <h3 className="dopamine-title" title={topRecentMcqAttempt ? `${topRecentMcqAttempt.subjectTitle}: ${topRecentMcqAttempt.chapterTitle}` : 'Core Syllabus MCQ Sprint'}>
                    {topRecentMcqAttempt
                      ? `${topRecentMcqAttempt.subjectTitle}: ${topRecentMcqAttempt.chapterTitle}`
                      : `${courseRegistry.subjectsList?.[0]?.title || 'Core Syllabus'} Practice`}
                  </h3>

                  {/* Dopamine Stat Badges */}
                  <div className="dopamine-stats-row">
                    <div className="d-stat-chip chip-orange">
                      <span className="d-chip-lbl">Accuracy</span>
                      <span className="d-chip-val">{topRecentMcqAttempt ? `${topRecentMcqAttempt.accuracy}%` : '85% Target'}</span>
                    </div>
                    <div className="d-stat-chip chip-slate">
                      <span className="d-chip-lbl">Correct</span>
                      <span className="d-chip-val">{topRecentMcqAttempt ? `${topRecentMcqAttempt.correct}/${topRecentMcqAttempt.total}` : '10 Qs'}</span>
                    </div>
                    <div className="d-stat-chip chip-amber">
                      <span className="d-chip-lbl">XP Earned</span>
                      <span className="d-chip-val">+{topRecentMcqAttempt ? topRecentMcqAttempt.xpEarned : 100} XP</span>
                    </div>
                  </div>

                  <p className="dopamine-microcopy">
                    {topRecentMcqAttempt
                      ? topRecentMcqAttempt.accuracy >= 75
                        ? '🏆 High mastery level! One more quick run will secure peak retention.'
                        : '🔥 Strong momentum! Practice 5 more questions to boost accuracy above 80%.'
                      : '⚡ Kick off your daily sprint! Solve 10 high-yield questions to level up.'}
                  </p>
                </div>

                <div className="dopamine-card-footer">
                  <button
                    type="button"
                    className="dopamine-action-btn btn-mcq"
                    onClick={() => {
                      if (topRecentMcqAttempt?.subjectKey) {
                        onResume({
                          subjectKey: topRecentMcqAttempt.subjectKey,
                          chapterId: topRecentMcqAttempt.chapterId,
                          chapterTitle: topRecentMcqAttempt.chapterTitle,
                        })
                      } else if (courseRegistry.subjectsList?.[0]?.subjectKey) {
                        onStartPractice(courseRegistry.subjectsList[0].subjectKey)
                      } else {
                        onNavigateSubjects()
                      }
                    }}
                  >
                    <span>{topRecentMcqAttempt ? 'Resume MCQ Practice' : 'Start MCQ Sprint'}</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Recent Flashcard Active Recall Sprint */}
              <div className="dopamine-card card-flashcard-momentum">
                <div className="dopamine-card-glow flashcard-glow" />
                <div className="dopamine-card-header">
                  <div className="dopamine-icon-box bg-purple-gradient">
                    <svg className="d-card-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect height="12" rx="2" strokeWidth="2.2" width="18" x="3" y="4" />
                      <path d="M7 20h10" strokeLinecap="round" strokeWidth="2.2" />
                    </svg>
                  </div>
                  <div className="dopamine-badge-wrap">
                    <span className="dopamine-pill pill-flashcard">
                      🧠 RETENTION QUEUE
                    </span>
                  </div>
                </div>

                <div className="dopamine-card-body">
                  <div className="dopamine-kicker">FLASHCARD REVISION</div>
                  <h3 className="dopamine-title" title={topFlashcardActivity.subjectTitle}>
                    {topFlashcardActivity.subjectTitle}: Spaced Recall
                  </h3>

                  {/* Dopamine Stat Badges */}
                  <div className="dopamine-stats-row">
                    <div className="d-stat-chip chip-purple">
                      <span className="d-chip-lbl">Cards Due</span>
                      <span className="d-chip-val">{topFlashcardActivity.cardsDue} Due</span>
                    </div>
                    <div className="d-stat-chip chip-slate">
                      <span className="d-chip-lbl">Retention</span>
                      <span className="d-chip-val">{topFlashcardActivity.retentionScore}%</span>
                    </div>
                    <div className="d-stat-chip chip-orange">
                      <span className="d-chip-lbl">Streak</span>
                      <span className="d-chip-val">{courseStats.studyStreak} Days</span>
                    </div>
                  </div>

                  <p className="dopamine-microcopy">
                    🧠 Active spaced repetition consolidation prevents memory decay and guarantees rapid recall on exam day.
                  </p>
                </div>

                <div className="dopamine-card-footer">
                  <button
                    type="button"
                    className="dopamine-action-btn btn-flashcard"
                    onClick={() => {
                      if (topFlashcardActivity.subjectKey) {
                        onOpenFlashcards(topFlashcardActivity.subjectKey)
                      } else {
                        onNavigateSubjects()
                      }
                    }}
                  >
                    <span>Flip Flashcards Now</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              2. COURSE SUBJECTS & CHAPTER MODULES MATRIX
             ══════════════════════════════════════════════════════════ */}
          <section className="course-subjects-practice-section">
            <div className="section-title-row">
              <div className="title-with-pill">
                <span className="section-dot" />
                <h2 className="section-heading">Course Subjects &amp; Chapters</h2>
                <span className="count-badge">{courseRegistry.subjectsList?.length || 0} Modules</span>
              </div>
              <button
                type="button"
                className="section-link-btn"
                onClick={onNavigateSubjects}
              >
                View Syllabus &gt;
              </button>
            </div>

            <div className="practice-subjects-grid">
              {(courseRegistry.subjectsList || []).map((sub) => {
                const totalChapters = sub.counts?.chapters || sub.chapters?.length || 0
                const totalMcqs = sub.counts?.mcqs || sub.totalMcqs || 0
                const attempted = sub.attemptedMcqs || 0
                const progressPct = typeof sub.coveragePercent === 'number' ? sub.coveragePercent : (sub.progress || 0)

                return (
                  <div className="practice-subject-card" key={sub.subjectKey}>
                    <div className="p-sub-header">
                      <div className="p-sub-icon-box">
                        <AppIcon name={sub.icon || 'computerNetworks'} size={20} />
                      </div>
                      <div className="p-sub-title-col">
                        <h4 className="p-sub-title" title={sub.title}>{sub.title}</h4>
                        <span className="p-sub-meta">{totalChapters} Chapters • {totalMcqs} MCQs</span>
                      </div>
                    </div>

                    <div className="p-sub-progress-wrap">
                      <div className="p-sub-progress-lbl-row">
                        <span className="p-sub-progress-lbl">Mastery Progress</span>
                        <span className="p-sub-progress-pct">{progressPct}%</span>
                      </div>
                      <div className="p-sub-progress-track">
                        <div
                          className="p-sub-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-sub-actions-row">
                      <button
                        type="button"
                        className="p-sub-btn-mcq"
                        onClick={() => onStartPractice(sub.subjectKey)}
                      >
                        <span>Practice MCQs</span>
                        <span>⚡</span>
                      </button>
                      <button
                        type="button"
                        className="p-sub-btn-flash"
                        onClick={() => onOpenFlashcards(sub.subjectKey)}
                      >
                        <span>Flashcards</span>
                        <span>🧠</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              3. WEAK TOPICS ACCELERATOR
             ══════════════════════════════════════════════════════════ */}
          {weakTopicsList.length > 0 && (
            <section className="weak-topics-section">
              <div className="section-title-row">
                <div className="title-with-pill">
                  <span className="section-dot dot-red" />
                  <h2 className="section-heading">Weak Topics Accelerator</h2>
                  <span className="high-yield-badge">High Impact</span>
                </div>
              </div>

              <div className="weak-topics-list">
                {weakTopicsList.map((topic) => (
                  <div className="weak-topic-row" key={topic.id || topic.chapterName}>
                    <div className="weak-topic-left">
                      <div className="weak-icon-sq">🎯</div>
                      <div className="weak-info-col">
                        <span className="weak-sub-name">{topic.subjectTitle}</span>
                        <h4 className="weak-chapter-name">{topic.chapterName}</h4>
                        <div className="weak-meta-row">
                          <span className="weak-gain-pill">{topic.readinessGain} Readiness</span>
                          <span className="weak-opp-text">{topic.opportunity}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="weak-practice-btn"
                      onClick={() => onStartPractice(topic.subjectKey, topic.id)}
                    >
                      <span>Attack Topic</span>
                      <span>→</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════
              4. PRACTICE STATISTICS (Real Course Data)
             ══════════════════════════════════════════════════════════ */}
          <section className="practice-stats-section">
            <div className="section-title-row">
              <div className="title-with-pill">
                <span className="section-dot" />
                <h2 className="section-heading">Practice Statistics</h2>
              </div>
            </div>

            <div className="practice-stats-grid">
              {/* Stat 1: Questions Today */}
              <div className="p-stat-tile tile-orange">
                <div className="p-stat-top">
                  <span className="p-stat-icon-wrap">⚡</span>
                  <span className="p-stat-sub">Target {courseStats.todayTarget}</span>
                </div>
                <div className="p-stat-val">{courseStats.todayQuestions}</div>
                <div className="p-stat-lbl">Questions Solved Today</div>
                <div className="p-stat-track">
                  <div className="p-stat-fill" style={{ width: `${courseStats.todayProgress}%` }} />
                </div>
              </div>

              {/* Stat 2: Course Accuracy */}
              <div className="p-stat-tile tile-emerald">
                <div className="p-stat-top">
                  <span className="p-stat-icon-wrap">🎯</span>
                  <span className="p-stat-sub">Real Analytics</span>
                </div>
                <div className="p-stat-val">{courseStats.accuracy}%</div>
                <div className="p-stat-lbl">Overall Accuracy</div>
              </div>

              {/* Stat 3: Study Streak */}
              <div className="p-stat-tile tile-amber">
                <div className="p-stat-top">
                  <span className="p-stat-icon-wrap">🔥</span>
                  <span className="p-stat-sub">Active Days</span>
                </div>
                <div className="p-stat-val">{courseStats.studyStreak} Days</div>
                <div className="p-stat-lbl">Daily Streak</div>
              </div>

              {/* Stat 4: Time Spent */}
              <div className="p-stat-tile tile-blue">
                <div className="p-stat-top">
                  <span className="p-stat-icon-wrap">⏱️</span>
                  <span className="p-stat-sub">Time Invested</span>
                </div>
                <div className="p-stat-val">{courseStats.totalTimeSpent}</div>
                <div className="p-stat-lbl">Total Practice Time</div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              5. PRACTICE SESSION HISTORY LOG
             ══════════════════════════════════════════════════════════ */}
          <section className="practice-history-section">
            <div className="section-title-row">
              <div className="title-with-pill">
                <span className="section-dot" />
                <h2 className="section-heading">Practice History</h2>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="history-search-filter-box">
              <div className="history-search-wrap">
                <svg className="history-search-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                </svg>
                <input
                  type="search"
                  className="history-search-input"
                  placeholder="Search completed sessions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="history-filters-row">
                <select
                  className="history-filter-select"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                >
                  {subjectOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <select
                  className="history-filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="Newest">Newest First</option>
                  <option value="Accuracy">Highest Accuracy</option>
                </select>
              </div>
            </div>

            {/* History List */}
            <div className="history-list-container">
              {filteredHistory.length === 0 ? (
                <div className="history-empty-box">
                  <span className="history-empty-icon">📝</span>
                  <h4 className="history-empty-title">No practice sessions found</h4>
                  <p className="history-empty-sub">Complete an MCQ practice quiz or flip flashcards to record your learning momentum!</p>
                  <button
                    type="button"
                    className="history-start-btn"
                    onClick={onNavigateSubjects}
                  >
                    Start Practicing Now
                  </button>
                </div>
              ) : (
                filteredHistory.map((att, idx) => (
                  <div className="history-row-item" key={att.id || idx}>
                    <div className="history-item-left">
                      <div className={`history-status-icon ${att.accuracy >= 50 ? 'icon-good' : 'icon-alert'}`}>
                        {att.accuracy >= 50 ? '✔' : '✕'}
                      </div>
                      <div className="history-info-col">
                        <h4 className="history-title">{att.subjectTitle || 'Subject Practice'}: {att.chapterTitle || 'MCQ Quiz'}</h4>
                        <div className="history-meta-line">
                          <span className="history-correct-stat">{att.correct !== undefined ? `${att.correct}/${att.attempted || att.total}` : '10/10'} Correct</span>
                          <span className="history-bullet">•</span>
                          <span className={`history-acc-tag ${att.accuracy >= 50 ? 'tag-good' : 'tag-alert'}`}>
                            {att.accuracy !== undefined ? `${att.accuracy}% Accuracy` : '100%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="history-item-right">
                      <span className="history-time-ago">{formatTimeAgo(att.timestamp || (att.created_at ? new Date(att.created_at).getTime() : Date.now()))}</span>
                      <button
                        type="button"
                        className="history-retake-btn"
                        onClick={() => {
                          if (att.subjectKey) {
                            onResume({
                              subjectKey: att.subjectKey,
                              chapterId: att.chapterId,
                              chapterTitle: att.chapterTitle,
                            })
                          } else {
                            onNavigateSubjects()
                          }
                        }}
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </MobileLayout>
    </div>
  )
}

export default PracticeHubPage