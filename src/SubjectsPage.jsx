import { useMemo, useRef, useState } from 'react'
import './Subjects.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import SideDrawer from './components/layout/SideDrawer'
import { useContentRegistry } from './data/contentRegistry'

// Color tone mapping for subject cards
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

function ProgressRing({ size, radius, strokeWidth, progress, trackColor, fillColor }) {
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function SubjectCard({ subject, onSelect }) {
  return (
    <button type="button" className="subj-card" onClick={() => onSelect(subject.subjectKey)}>
      <div className="subj-top">
        <div className={`subj-icon ${subject.iconClass}`}>
          <AppIcon name={subject.icon} size={20} />
        </div>
        <div className={`difficulty-pill ${subject.pillClass}`}>{subject.pillLabel}</div>
      </div>
      <div className="subj-name">{subject.title}</div>
      <div className="subj-meta">{subject.meta}</div>
      <div className="subj-bottom">
        <span className={`subj-pct ${subject.percentClass}`}>{subject.progress}%</span>
        <div className="subj-track">
          <div
            className={`subj-fill ${subject.progressClass}`}
            style={{ width: `${subject.progress}%` }}
          />
        </div>
        <div className={`subj-arrow ${subject.arrowClass}`}>
          <AppIcon name="arrowForward" size={15} />
        </div>
      </div>
    </button>
  )
}

function SubjectsPage({ onNavigateHome = () => {}, onOpenSubjectDetail = () => {}, onNavigatePractice = () => {}, onNavigateAdmin = () => {} }) {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const searchInputRef = useRef(null)
  const registry = useContentRegistry()

  // Derive subject cards from the live registry (admin SSOT)
  const subjects = useMemo(() => registry.subjectsList.map((s, i) => {
    const tone = TONE_MAP[i % TONE_MAP.length]
    return {
      subjectKey: s.subjectKey,
      title: s.title,
      icon: s.icon,
      iconClass: tone.iconClass,
      pillClass: tone.pillClass,
      pillLabel: s.badge || 'MEDIUM',
      meta: `${s.counts.chapters} Chapters • ${s.counts.mcqs} MCQs • ${s.counts.flashcards} Flashcards`,
      progress: s.progress,
      progressClass: tone.progressClass,
      percentClass: tone.percentClass,
      arrowClass: tone.arrowClass,
      locked: s.locked,
    }
  }), [registry])

  const heroStats = useMemo(() => [
    { icon: 'chapters', value: String(registry.subjectCount), label: 'Subjects' },
    { icon: 'document', value: String(registry.chapterCount), label: 'Chapters' },
    { icon: 'target', value: String(registry.mcqCount), label: 'MCQs' },
  ], [registry])

  const filteredSubjects = subjects.filter((subject) =>
    subject.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="subjects-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{ name: 'Abhi Kumar', sub: 'BPSC TRE 4.0 • Computer Science', streak: '14 Day Streak' }}
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
              BPSC TRE 4.0 ACTIVE
            </div>
            <div className="hero-top">
              <div className="hero-text">
                <div className="hero-title">Computer Science Prep Hub 🚀</div>
                <div className="hero-sub">
                  Your all-in-one platform to learn, practice and master Computer Science.
                </div>
              </div>
              <div className="hero-ring-wrap">
                <ProgressRing
                  size={96}
                  radius={42}
                  strokeWidth={8}
                  progress={72}
                  trackColor="rgba(255,255,255,0.18)"
                  fillColor="#F1621B"
                />               
                <div className="hero-ring-value">72%</div>
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