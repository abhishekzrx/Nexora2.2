import { useMemo, useRef, useState } from 'react'
import './Subjects.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import SideDrawer from './components/layout/SideDrawer'
import { useCourseRegistry } from './data/courseRegistry'
import { useWorkspaceStore } from './data/workspaceStore'
import { useMemberStore } from './data/memberStore'
import { permissionService } from './services/permissionService'

import ProgressRing from './components/ui/ProgressRing'
import ConcentricRingGraph from './components/ui/ConcentricRingGraph'
import BatteryCoverageRing, { getBatteryGrade } from './components/ui/BatteryCoverageRing'
import SubjectCard from './components/subject/SubjectCard'
import { testSession } from './utils/navigation'
import { formatCompactNumber, formatInteger, formatSubjectDisplay } from './services/mcqAnalyticsService'

const TONE_MAP = [
  { iconClass: 'icon-orange', pillClass: 'pill-orange', progressClass: 'fill-orange', percentClass: 'pct-orange', arrowClass: 'arrow-orange' },
  { iconClass: 'icon-blue', pillClass: 'pill-blue', progressClass: 'fill-blue', percentClass: 'pct-blue', arrowClass: 'arrow-blue' },
  { iconClass: 'icon-green', pillClass: 'pill-green', progressClass: 'fill-green', percentClass: 'pct-green', arrowClass: 'arrow-green' },
  { iconClass: 'icon-red', pillClass: 'pill-red', progressClass: 'fill-red', percentClass: 'pct-red', arrowClass: 'arrow-red' },
  { iconClass: 'icon-purple', pillClass: 'pill-purple', progressClass: 'fill-purple', percentClass: 'pct-purple', arrowClass: 'arrow-purple' },
  { iconClass: 'icon-teal', pillClass: 'pill-teal', progressClass: 'fill-teal', percentClass: 'pct-teal', arrowClass: 'arrow-teal' },
]

const drawerSections = [
  {
    label: 'MAIN',
    items: [
      { icon: 'home', label: 'Dashboard' },
      { icon: 'subjects', label: 'Subjects', active: true },
      { icon: 'practice', label: 'Practice' },
      { icon: 'flashcards', label: 'Flashcards', disabled: true },
      { icon: 'mockTests', label: 'Mock Tests', disabled: true },
    ],
  },
  {
    label: 'TRACK PROGRESS',
    items: [
      { icon: 'analytics', label: 'Analytics', disabled: true },
      { icon: 'studyPlanner', label: 'Study Planner', disabled: true },
      { icon: 'leaderboard', label: 'Leaderboard', disabled: true },
    ],
  },
  {
    label: 'MORE',
    items: [
      { icon: 'notes', label: 'Notes', disabled: true },
      { icon: 'notifications', label: 'Notifications', badge: '3', disabled: true },
      { icon: 'settings', label: 'Settings', disabled: true },
      { icon: 'help', label: 'Help & Support', disabled: true },
      { icon: 'adminDashboard', label: 'Admin' },
    ],
  },
]

function generateSmoothPath(points, width = 200, height = 34, padding = 4) {
  if (!points || points.length === 0) {
    points = [40, 55, 50, 68, 75, 82, 88]
  }
  
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = (max - min) === 0 ? 1 : (max - min)
  
  const coords = points.map((val, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y }
  })
  
  let d = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]
    const next = coords[i + 1]
    const cp1x = curr.x + (next.x - curr.x) / 2
    const cp1y = curr.y
    const cp2x = curr.x + (next.x - curr.x) / 2
    const cp2y = next.y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }
  
  const last = coords[coords.length - 1]
  const first = coords[0]
  const area = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`
  
  return { path: d, area, lastPoint: last }
}

function SubjectsPage({ courseId, onNavigateHome = () => {}, onOpenSubjectDetail = () => {}, onNavigatePractice = () => {}, onNavigateAdmin = () => {} }) {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const searchInputRef = useRef(null)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { effectiveMember } = useMemberStore()
  const registry = useCourseRegistry(courseId || activeWorkspaceId)

  const activeCourse = workspaces.find((w) => w.id === (courseId || activeWorkspaceId)) || workspaces[0]

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

  const subjectPerformanceMap = useMemo(() => {
    const map = {}
    pastAttempts.forEach((att) => {
      if (att.subjectKey) {
        if (!map[att.subjectKey]) {
          map[att.subjectKey] = {
            attemptsCount: 0,
            latestAccuracy: 0,
            accuracies: [],
            lastAttemptTimestamp: 0,
          }
        }
        const item = map[att.subjectKey]
        item.attemptsCount += 1
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

  const subjects = useMemo(() => {
    const rawList = [...(registry.subjectsList || [])]
    const list = permissionService.filterAllowedSubjects(effectiveMember, activeCourse?.id, rawList)
    
    // Sort by most recently used/attempted subject at the TOP
    list.sort((a, b) => {
      const timeA = subjectLastAttemptMap[a.subjectKey] || 0
      const timeB = subjectLastAttemptMap[b.subjectKey] || 0
      if (timeA !== timeB) return timeB - timeA
      return 0
    })

    return list.map((s, i) => {
      const tone = TONE_MAP[i % TONE_MAP.length]
      const perf = subjectPerformanceMap[s.subjectKey] || null
      const hasAttempts = Boolean(s.hasAttempts || (perf && perf.attemptsCount > 0))
      const coveragePercent = typeof s.coveragePercent === 'number' ? s.coveragePercent : (s.progress || 0)
      const masteryPercent = typeof s.masteryPercent === 'number' ? s.masteryPercent : (s.accuracy || 0)
      const coverageLevel = s.coverageLevel

      const chapCount = s.counts?.chapters ?? s.chaptersCount ?? 0
      const mcqCount = s.counts?.mcqs ?? s.mcqsCount ?? 0
      const flashCount = s.counts?.flashcards ?? s.flashcardsCount ?? 0
      const notesCount = s.counts?.notes ?? s.notesCount ?? 0

      const metaStr = hasAttempts
        ? `${chapCount} C • ${s.attemptedMcqs || 0}/${mcqCount} MCQs`
        : `${chapCount} C • ${mcqCount} MCQs • ${flashCount} FC • ${notesCount} N`

      return {
        subjectKey: s.subjectKey,
        title: s.title,
        icon: s.icon,
        iconClass: tone.iconClass,
        pillClass: tone.pillClass,
        pillLabel: hasAttempts ? `${masteryPercent}% MASTERY` : (s.badge || 'MEDIUM'),
        meta: metaStr,
        progress: coveragePercent,
        coveragePercent,
        masteryPercent,
        coverageLevel,
        hasAttempts,
        progressClass: tone.progressClass,
        percentClass: tone.percentClass,
        arrowClass: tone.arrowClass,
        locked: s.locked,
      }
    })
  }, [registry, subjectPerformanceMap, subjectLastAttemptMap])

  const courseAnalysis = useMemo(() => {
    const list = registry.subjectsList || []
    const totalSubjects = list.length
    
    let totalChapters = 0
    let totalMcqs = 0
    let attemptedMcqs = 0
    let masteredMcqs = 0

    list.forEach((sub) => {
      const cCount = sub.counts?.chapters ?? sub.chapters?.length ?? 10
      const mCount = sub.totalMcqs ?? (sub.chapters ? sub.chapters.reduce((sum, ch) => sum + (ch.totalMcqs || ch.mcqs || 0), 0) : (sub.counts?.mcqs ?? 0))
      
      // Fact calculation fallback: each subject has ~10 chapters & ~100 MCQs per chapter if empty
      const finalMcqs = mCount > 0 ? mCount : cCount * 100

      totalChapters += cCount
      totalMcqs += finalMcqs
      attemptedMcqs += sub.attemptedMcqs || 0
      masteredMcqs += sub.masteredMcqs || 0
    })

    const remainingMcqs = Math.max(0, totalMcqs - attemptedMcqs)
    const overallCoverage = totalMcqs > 0 ? Math.round((attemptedMcqs / totalMcqs) * 100) : 0
    const overallAccuracy = attemptedMcqs > 0 ? Math.round((masteredMcqs / attemptedMcqs) * 100) : 0

    return {
      totalSubjects,
      totalChapters,
      totalMcqs,
      attemptedMcqs,
      remainingMcqs,
      masteredMcqs,
      overallCoverage,
      overallAccuracy,
    }
  }, [registry])

  const courseTrendPoints = useMemo(() => {
    if (subjects && subjects.length >= 2) {
      const pts = subjects.map((s) => Number(s.progress || s.accuracyPercent || s.coveragePercent || 50))
      return pts.length > 7 ? pts.slice(-7) : pts
    }
    const base = courseAnalysis.overallAccuracy || 65
    return [
      Math.max(10, base - 15),
      Math.max(15, base - 8),
      Math.max(20, base - 10),
      Math.max(25, base + 5),
      Math.max(30, base - 2),
      Math.max(35, base + 7),
      base,
    ]
  }, [subjects, courseAnalysis])

  const courseSparkline = useMemo(() => generateSmoothPath(courseTrendPoints, 200, 34, 3), [courseTrendPoints])

  const filteredSubjects = subjects.filter((subject) =>
    subject.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="subjects-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{
          name: effectiveMember?.display_name || 'Student',
          warrior: `${effectiveMember?.warrior_name || 'WARRIOR'} • ${effectiveMember?.public_user_id || 'NEX-WAR-001'}`,
          sub: `${activeCourse?.name || 'Select Course'}`,
          streak: '14 Day Streak',
        }}
        sections={drawerSections}
        onItemClick={(item) => {
          setDrawerOpen(false)
          if (item.label === 'Dashboard') onNavigateHome()
          else if (item.label === 'Practice') onNavigatePractice()
          else if (item.label === 'Admin') onNavigateAdmin()
        }}
      />

      <MobileLayout
        className="subjects-phone"
        activeTab="Subjects"
        disabledItems={['Profile']}
        onNavigate={(item) => {
          if (item.center) {
            onOpenSubjectDetail('computer-networks')
          } else if (item.label === 'Home') {
            onNavigateHome()
          } else if (item.label === 'Practice') {
            onNavigatePractice()
          }
        }}
      >
        <header className="header subjects-header">
          <div className="header-left">
            <button type="button" className="menu-icon" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <AppIcon name="menu" size={20} />
            </button>
            <div className="header-title">Subjects</div>
          </div>
          <div className="header-right">
            <button
              type="button"
              className="header-icon"
              aria-label="Search"
              onClick={() => searchInputRef.current?.focus()}
            >
              <AppIcon name="search" size={19} />
            </button>
            <button type="button" className="header-icon header-notify" aria-label="Notifications" disabled>
              <AppIcon name="notifications" size={19} />
              <span className="bell-badge">3</span>
            </button>
            <div className="avatar" aria-hidden="true">
              <AppIcon name="profile" size={20} />
            </div>
          </div>
        </header>

        <main className="content subjects-content">
          {/* Pro Dark Course Hero Banner */}
          <section className="course-hero-dark hero-pro-theme">
            <div className="course-hero-main-content">
              {/* Performance Trend Graph Section */}
              <div className="course-hero-perf-card">
                <div className="course-hero-perf-header">
                  <div className="course-hero-badge-wrap">
                    <span className="course-hero-live-dot" />
                    <span className="course-hero-title">
                      {activeCourse?.name?.toUpperCase() || 'BPSC 4.0 COMPUTER SCIENCE'}
                    </span>
                  </div>
                  <span className="course-hero-stat-pill">
                    {courseAnalysis.overallAccuracy > 0 ? `${courseAnalysis.overallAccuracy}% Acc.` : 'Live Prep'}
                  </span>
                </div>

                <div className="course-hero-perf-svg-wrap">
                  <svg viewBox="0 0 200 34" preserveAspectRatio="none" className="course-hero-perf-svg">
                    <defs>
                      <linearGradient id="courseHeroPerfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={courseSparkline.area} fill="url(#courseHeroPerfGrad)" />
                    <path d={courseSparkline.path} fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
                    <circle
                      cx={courseSparkline.lastPoint.x}
                      cy={courseSparkline.lastPoint.y}
                      r="3"
                      fill="#FFFFFF"
                      stroke="#0284C7"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Small Chip UI: Subjects, Chapters, MCQs, Remaining */}
              <div className="course-hero-chips-row">
                <div className="course-hero-chip" title={`${courseAnalysis.totalSubjects} Total Subjects`}>
                  <span className="course-chip-icon subjects-icon">
                    <AppIcon name="subjects" size={11} />
                  </span>
                  <span className="course-chip-text">
                    <strong>{courseAnalysis.totalSubjects}</strong> Subjects
                  </span>
                </div>

                <div className="course-hero-chip" title={`${courseAnalysis.totalChapters} Total Chapters`}>
                  <span className="course-chip-icon chapters-icon">
                    <AppIcon name="chapters" size={11} />
                  </span>
                  <span className="course-chip-text">
                    <strong>{formatInteger(courseAnalysis.totalChapters)}</strong> Chapters
                  </span>
                </div>

                <div className="course-hero-chip" title={`${courseAnalysis.totalMcqs} Total MCQs`}>
                  <span className="course-chip-icon mcqs-icon">
                    <AppIcon name="mcqs" size={11} />
                  </span>
                  <span className="course-chip-text">
                    <strong>{formatInteger(courseAnalysis.totalMcqs)}</strong> MCQs
                  </span>
                </div>

                <div className="course-hero-chip" title="Remaining MCQs">
                  <span className="course-chip-icon rem-icon">
                    <AppIcon name="analytics" size={11} />
                  </span>
                  <span className="course-chip-text">
                    <strong>{formatInteger(courseAnalysis.remainingMcqs)}</strong> Rem
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical divider before Concentric Ring Graph */}
            <div className="course-hero-ring-divider" aria-hidden="true" />

            {/* Concentric Ring Coverage Graph */}
            <div className="course-hero-ring-zone" title="Multi-Layer Ring: Outer=Coverage, Middle=Mastery, Inner=Accuracy">
              <ConcentricRingGraph
                size={90}
                coveragePercent={courseAnalysis.overallCoverage}
                masteryPercent={courseAnalysis.overallAccuracy}
                accuracyPercent={courseAnalysis.overallAccuracy}
                showLegend
                colors={{
                  coverage: '#FFFFFF',
                  mastery: '#FBBF24',
                  accuracy: '#34D399',
                  track: 'rgba(255, 255, 255, 0.18)',
                }}
              />
            </div>
          </section>

          <section className="search-block">
            <div className="search-row">
              <label className="search-box">
                <span className="search-icon" aria-hidden="true">
                  <AppIcon name="search" size={16} />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="search-row split-row">
              <button type="button" className="filter-btn" disabled>
                <AppIcon name="filter" size={14} />
                Filter
              </button>
              <button type="button" className="sort-btn" disabled>
                <AppIcon name="sort" size={14} />
                Sort
              </button>
            </div>
          </section>

          <section className="subjects-grid">
            {filteredSubjects.map((subject) => (
              <SubjectCard key={subject.title} subject={subject} onSelect={onOpenSubjectDetail} />
            ))}
          </section>

          <section className="motivation-banner">
            <div className="motivation-icon">
              <AppIcon name="star" size={20} />
            </div>
            <div className="motivation-text">
              <div className="motivation-title">Keep learning, keep growing!</div>
              <div className="motivation-sub">
                You're on the right path. Consistency today, excellence tomorrow.
              </div>
            </div>
            <button type="button" className="analytics-btn" disabled>
              <AppIcon name="analytics" size={16} />
              View Analytics
            </button>
          </section>
        </main>
      </MobileLayout>
    </div>
  )
}

export default SubjectsPage
