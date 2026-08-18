import { useMemo, useRef, useState } from 'react'
import './Subjects.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import SideDrawer from './components/layout/SideDrawer'
import { useCourseRegistry } from './data/courseRegistry'
import { useWorkspaceStore } from './data/workspaceStore'

import ProgressRing from './components/ui/ProgressRing'
import { testSession } from './utils/navigation'
import { formatCompactNumber, formatSubjectDisplay } from './services/mcqAnalyticsService'

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

function SubjectCard({ subject, onSelect }) {
  const ringColor = subject.coverageLevel?.color || '#12B76A'
  const coveragePct = Math.round(subject.coveragePercent || subject.progress || 0)

  return (
    <button type="button" className="subj-card" onClick={() => onSelect(subject.subjectKey)}>
      <div className="subj-top">
        <div className={`subj-icon ${subject.iconClass}`}>
          <AppIcon name={subject.icon} size={20} />
        </div>
        <div
          className={`difficulty-pill ${subject.pillClass}`}
          style={subject.hasAttempts ? { backgroundColor: subject.coverageLevel?.bg || 'rgba(18, 183, 106, 0.1)', color: ringColor } : {}}
        >
          {subject.pillLabel}
        </div>
      </div>
      <div className="subj-name">{subject.title}</div>
      <div className="subj-meta">{subject.meta}</div>
      <div className="subj-bottom">
        <div className="subj-coverage-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '42px' }}>
          <span className="subj-cov-label" style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Coverage</span>
          <span className="subj-pct" style={{ color: ringColor }}>{coveragePct}%</span>
        </div>
        <div className="subj-track">
          <div
            className={`subj-fill ${subject.progressClass}`}
            style={{ width: `${coveragePct}%`, backgroundColor: ringColor }}
          />
        </div>
        <div className={`subj-arrow ${subject.arrowClass}`}>
          <AppIcon name="arrowForward" size={15} />
        </div>
      </div>
    </button>
  )
}

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

      const metaStr = hasAttempts
        ? `${s.counts.chapters} Chapters • ${s.attemptedMcqs}/${s.counts.mcqs} MCQs (${masteryPercent}% Mastery)`
        : `${s.counts.chapters} Chapters • ${s.counts.mcqs} MCQs • ${s.counts.flashcards} Flashcards`

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

  const overallProgress = useMemo(() => {
    if (!registry.subjectsList || registry.subjectsList.length === 0) return 0
    const total = registry.subjectsList.reduce((s, sub) => s + (sub.progress || 0), 0)
    return Math.round(total / registry.subjectsList.length)
  }, [registry.subjectsList])

  const heroStats = useMemo(() => [
    { icon: 'chapters', value: String(registry.subjectCount), label: 'Subjects' },
    { icon: 'document', value: String(registry.chapterCount), label: 'Chapters' },
    { icon: 'target', value: formatCompactNumber(registry.mcqCount), label: 'MCQs' },
  ], [registry])

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
          <section className="hero-card">
            <div className="active-pill">
              <span className="live-dot" />
              {activeCourse?.name?.toUpperCase() || 'COURSE ACTIVE'}
            </div>
            <div className="hero-top">
              <div className="hero-text">
                <div className="hero-title">{activeCourse?.name || 'Computer Science Prep Hub'} 🚀</div>
              </div>
              <div className="hero-ring-wrap">
                <ProgressRing
                  size={64}
                  radius={24}
                  strokeWidth={5}
                  progress={overallProgress}
                  trackColor="rgba(255, 255, 255, 0.18)"
                  fillColor="#F1621B"
                >
                  <div className="hero-ring-content">
                    <span className="hero-ring-pct">{overallProgress}%</span>
                  </div>
                </ProgressRing>
                <div className="hero-ring-label">Overall Progress</div>
              </div>
            </div>

            <div className="hero-stats">
              {heroStats.map((stat) => (
                <div className="hero-stat" key={stat.label}>
                  <span className="hero-stat-icon" aria-hidden="true">
                    <AppIcon name={stat.icon} size={17} />
                  </span>
                  <div>
                    <div className="hero-stat-num">{stat.value}</div>
                    <div className="hero-stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
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
