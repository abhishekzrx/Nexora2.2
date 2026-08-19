import { useMemo, useRef, useState } from 'react'
import './Subjects.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import SideDrawer from './components/layout/SideDrawer'
import { useCourseRegistry } from './data/courseRegistry'
import { useWorkspaceStore } from './data/workspaceStore'

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

function SubjectsPage({ courseId, onNavigateHome = () => {}, onOpenSubjectDetail = () => {}, onNavigatePractice = () => {}, onNavigateAdmin = () => {} }) {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const searchInputRef = useRef(null)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
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
    const list = [...(registry.subjectsList || [])]
    
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

  const filteredSubjects = subjects.filter((subject) =>
    subject.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="subjects-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{ name: 'Abhi Kumar', sub: `${activeCourse?.name || 'Select Course'}`, streak: '14 Day Streak' }}
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
          {/* Dark EdTech Course Hero Banner — Premium "One Course, One Value" Design */}
          <section className="course-hero-dark">
            <div className="course-hero-top">
              <div className="course-hero-badge">
                <span className="green-dot" />
                {activeCourse?.name?.toUpperCase() || 'BPSC 4.0 COMPUTER SCIENCE'}
              </div>
            </div>

            {/* Grand Course-Level Metric Rings ("One Course, One Value") */}
            <div className="course-grand-rings-grid">
              {/* Grand Metric 1: Overall Coverage */}
              <div className="grand-ring-card" title="Overall Coverage across all subjects in this course">
                <ProgressRing
                  size={58}
                  radius={23}
                  strokeWidth={5}
                  progress={courseAnalysis.overallCoverage}
                  trackColor="rgba(255, 255, 255, 0.12)"
                  fillColor="#38BDF8"
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#38BDF8' }}>
                    {courseAnalysis.overallCoverage}%
                  </span>
                </ProgressRing>
                <div style={{ textAlign: 'center' }}>
                  <div className="grand-ring-title" style={{ color: '#38BDF8' }}>Coverage</div>
                  <div className="grand-ring-subtitle">
                    {courseAnalysis.attemptedMcqs > 0
                      ? `${formatInteger(courseAnalysis.attemptedMcqs)} MCQs`
                      : '0 Attempted'}
                  </div>
                </div>
              </div>

              {/* Grand Metric 2: Overall Mastery */}
              <div className="grand-ring-card" title="Overall Mastery percentage across all subjects">
                <ProgressRing
                  size={58}
                  radius={23}
                  strokeWidth={5}
                  progress={courseAnalysis.overallAccuracy}
                  trackColor="rgba(255, 255, 255, 0.12)"
                  fillColor="#A855F7"
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#A855F7' }}>
                    {courseAnalysis.overallAccuracy}%
                  </span>
                </ProgressRing>
                <div style={{ textAlign: 'center' }}>
                  <div className="grand-ring-title" style={{ color: '#A855F7' }}>Mastery</div>
                  <div className="grand-ring-subtitle">
                    {courseAnalysis.masteredMcqs > 0
                      ? `${formatInteger(courseAnalysis.masteredMcqs)} Mastered`
                      : '0 Mastered'}
                  </div>
                </div>
              </div>

              {/* Grand Metric 3: Overall Accuracy */}
              <div className="grand-ring-card" title="Overall Precision Accuracy rate across all responses">
                <ProgressRing
                  size={58}
                  radius={23}
                  strokeWidth={5}
                  progress={courseAnalysis.overallAccuracy}
                  trackColor="rgba(255, 255, 255, 0.12)"
                  fillColor="#10B981"
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                    {courseAnalysis.overallAccuracy}%
                  </span>
                </ProgressRing>
                <div style={{ textAlign: 'center' }}>
                  <div className="grand-ring-title" style={{ color: '#10B981' }}>Accuracy</div>
                  <div className="grand-ring-subtitle">Precision Score</div>
                </div>
              </div>

              {/* Grand Metric 4: Course Readiness Index (Single Ring) */}
              <div className="grand-ring-card" title="Overall Course Readiness Index">
                <ProgressRing
                  size={58}
                  radius={23}
                  strokeWidth={5}
                  progress={courseAnalysis.overallCoverage}
                  trackColor="rgba(255, 255, 255, 0.12)"
                  fillColor="#F1621B"
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#F1621B' }}>
                    {courseAnalysis.overallCoverage}%
                  </span>
                </ProgressRing>
                <div style={{ textAlign: 'center' }}>
                  <div className="grand-ring-title" style={{ color: '#F1621B' }}>Readiness</div>
                  <div className="grand-ring-subtitle">Course Score</div>
                </div>
              </div>
            </div>

            {/* Dynamic Aggregate Bottom Stat Glass Tiles (Clean Icon-Free Grid, No Overflow) */}
            <div className="course-bottom-stats">
              <div className="course-stat-tile">
                <div className="course-stat-val">{courseAnalysis.totalSubjects}</div>
                <div className="course-stat-lbl">Subjects</div>
              </div>

              <div className="course-stat-tile">
                <div className="course-stat-val">{formatInteger(courseAnalysis.totalChapters)}</div>
                <div className="course-stat-lbl">Chapters</div>
              </div>

              <div className="course-stat-tile">
                <div className="course-stat-val">{formatInteger(courseAnalysis.totalMcqs)}</div>
                <div className="course-stat-lbl">Total MCQs</div>
              </div>

              <div className="course-stat-tile">
                <div className="course-stat-val">
                  {courseAnalysis.attemptedMcqs > 0
                    ? `${formatInteger(courseAnalysis.attemptedMcqs)} / ${formatInteger(courseAnalysis.remainingMcqs)}`
                    : `${formatInteger(courseAnalysis.remainingMcqs)} Rem`}
                </div>
                <div className="course-stat-lbl">
                  {courseAnalysis.attemptedMcqs > 0 ? 'Attempted / Rem' : 'Remaining MCQs'}
                </div>
              </div>
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
