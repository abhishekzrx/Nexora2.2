import { useState } from 'react'
import './Subjects.css'

const heroStats = [
  { icon: '📖', value: '5', label: 'Subjects' },
  { icon: '📄', value: '2', label: 'Chapters' },
  { icon: '🎯', value: '200', label: 'MCQs' },
]

const subjects = [
  {
    subjectKey: 'computer-networks',
    title: 'Computer Networks',
    icon: '🔗',
    iconClass: 'icon-orange',
    pillClass: 'pill-orange',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 200 MCQs • 80 Flashcards',
    progress: 72,
    progressClass: 'fill-orange',
    percentClass: 'pct-orange',
    arrowClass: 'arrow-orange',
  },
  {
    subjectKey: 'operating-systems',
    title: 'Operating Systems',
    icon: '🖥️',
    iconClass: 'icon-blue',
    pillClass: 'pill-blue',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 0 MCQs • 0 Flashcards',
    progress: 45,
    progressClass: 'fill-blue',
    percentClass: 'pct-blue',
    arrowClass: 'arrow-blue',
  },
  {
    subjectKey: 'dbms',
    title: 'Database Management System',
    icon: '🗄️',
    iconClass: 'icon-green',
    pillClass: 'pill-green',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 0 MCQs • 0 Flashcards',
    progress: 30,
    progressClass: 'fill-green',
    percentClass: 'pct-green',
    arrowClass: 'arrow-green',
  },
  {
    subjectKey: 'digital-electronics',
    title: 'Digital Electronics',
    icon: '🔲',
    iconClass: 'icon-red',
    pillClass: 'pill-red',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 0 MCQs • 0 Flashcards',
    progress: 15,
    progressClass: 'fill-red',
    percentClass: 'pct-red',
    arrowClass: 'arrow-red',
  },
  {
    subjectKey: 'data-structures',
    title: 'Data Structures & Algorithms',
    icon: '{ }',
    iconClass: 'icon-purple',
    pillClass: 'pill-purple',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 0 MCQs • 0 Flashcards',
    progress: 20,
    progressClass: 'fill-purple',
    percentClass: 'pct-purple',
    arrowClass: 'arrow-purple',
  },
  {
    subjectKey: 'computer-organization',
    title: 'Computer Organization & Architecture',
    icon: '🔲',
    iconClass: 'icon-teal',
    pillClass: 'pill-teal',
    pillLabel: 'MEDIUM',
    meta: '10 Chapters • 0 MCQs • 0 Flashcards',
    progress: 10,
    progressClass: 'fill-teal',
    percentClass: 'pct-teal',
    arrowClass: 'arrow-teal',
  },
]

const bottomNavItems = [
  { icon: '🏠', label: 'Home' },
  { icon: '▦', label: 'Subjects', active: true },
  { icon: '📘', label: 'center', center: true },
  { icon: '📝', label: 'Practice' },
  { icon: '👤', label: 'Profile' },
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
        <div className={`subj-icon ${subject.iconClass}`}>{subject.icon}</div>
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
        <div className={`subj-arrow ${subject.arrowClass}`}>→</div>
      </div>
    </button>
  )
}

function SubjectsPage({ onNavigateHome = () => {}, onOpenSubjectDetail = () => {} }) {
  const [search, setSearch] = useState('')
  const filteredSubjects = subjects.filter((subject) =>
    subject.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="subjects-shell">
      <div className="phone subjects-phone">
        <header className="header subjects-header">
          <div className="header-left">
            <button type="button" className="menu-icon" aria-label="Open menu">
              ☰
            </button>
            <div className="header-title">Subjects</div>
          </div>
          <div className="header-right">
            <button type="button" className="header-icon" aria-label="Search">
              🔍
            </button>
            <button type="button" className="header-icon header-notify" aria-label="Notifications">
              🔔<span className="bell-badge">3</span>
            </button>
            <div className="avatar">🧑‍💼</div>
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
                    {stat.icon}
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
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="search-row split-row">
              <button type="button" className="filter-btn">
                ▽ Filter
              </button>
              <button type="button" className="sort-btn">
                ⇅ Sort
              </button>
            </div>
          </section>

          <section className="subjects-grid">
            {filteredSubjects.map((subject) => (
              <SubjectCard key={subject.title} subject={subject} onSelect={onOpenSubjectDetail} />
            ))}
          </section>

          <section className="motivation-banner">
            <div className="motivation-icon">⭐</div>
            <div className="motivation-text">
              <div className="motivation-title">Keep learning, keep growing!</div>
              <div className="motivation-sub">
                You're on the right path. Consistency today, excellence tomorrow.
              </div>
            </div>
            <button type="button" className="analytics-btn">
              📊 View Analytics
            </button>
          </section>
        </main>

        <nav className="bottom-nav subjects-bottom-nav" aria-label="Primary">
          {bottomNavItems.map((item) => {
            if (item.center) {
              return (
                <button key={item.label} type="button" className="nav-center" aria-label="Practice">
                  {item.icon}
                </button>
              )
            }

            return (
              <button
                key={item.label}
                type="button"
                className={`nav-item${item.active ? ' active' : ''}`}
                onClick={() => {
                  if (item.label === 'Home') {
                    onNavigateHome()
                  }
                }}
                aria-current={item.active ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default SubjectsPage

