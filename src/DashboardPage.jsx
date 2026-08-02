import { useEffect, useState } from 'react'
import './Dashboard.css'

const strongAreas = ['DBMS', 'Operating System', 'Computer Networks']
const weakAreas = ['COA', 'Digital Electronics']

const miniCards = [
  {
    theme: 'mini-green',
    icon: '💻',
    title: "Today's Revision",
    value: '45',
    tone: 'green',
    sub: 'Flashcards Due',
    action: 'Review Now →',
  },
  {
    theme: 'mini-red',
    icon: '❌',
    title: 'Incorrect Qs',
    value: '12',
    tone: 'red',
    sub: 'Questions',
    action: 'Review Now →',
  },
  {
    theme: 'mini-purple',
    icon: '🔖',
    title: 'Forgotten Topics',
    value: '6',
    tone: 'purple',
    sub: 'Topics',
    action: 'Review Now →',
  },
]

const missionItems = [
  { label: 'MCQs', value: '65%', width: 65, done: true },
  { label: 'Flashcards', value: '75%', width: 75, done: true },
  { label: 'Mock Test', value: '0%', width: 0, done: false },
]

const subjectCards = [
  {
    subjectKey: 'computer-networks',
    title: 'Computer Networks',
    icon: '🔗',
    iconClass: 'icon-blue',
    ringTrack: '#E7EDFD',
    ringColor: '#2E5CE6',
    progress: 72,
    ringLabel: '72%',
    stats: '12 / 16 Chapters\n120 / 200 MCQs\n15 / 18 Flashcards',
    continueClass: 'cont-blue',
    highlight: true,
  },
  {
    subjectKey: 'operating-systems',
    title: 'Operating Systems',
    icon: '⚙️',
    iconClass: 'icon-green',
    ringTrack: '#DFF7EA',
    ringColor: '#12B76A',
    progress: 68,
    ringLabel: '68%',
    stats: '10 / 14 Chapters\n98 / 150 MCQs\n12 / 16 Flashcards',
    continueClass: 'cont-green',
  },
  {
    subjectKey: 'dbms',
    title: 'DBMS',
    icon: '📊',
    iconClass: 'icon-purple',
    ringTrack: '#EFE6FC',
    ringColor: '#7C3AED',
    progress: 80,
    ringLabel: '80%',
    stats: '9 / 12 Chapters\n140 / 175 MCQs\n18 / 20 Flashcards',
    continueClass: 'cont-purple',
  },
  {
    subjectKey: 'digital-electronics',
    title: 'Digital Electronics',
    icon: '💾',
    iconClass: 'icon-orange',
    ringTrack: '#FFE9D9',
    ringColor: '#F1621B',
    progress: 45,
    ringLabel: '45%',
    stats: '6 / 14 Chapters\n65 / 150 MCQs\n8 / 15 Flashcards',
    continueClass: 'cont-orange',
  },
]

const activityItems = [
  { icon: '✓', iconClass: 'ai-green', text: 'Solved 20 MCQs in OS', time: '2h ago' },
  { icon: '▤', iconClass: 'ai-orange', text: 'Reviewed 15 Flashcards', time: '4h ago' },
  { icon: '📄', iconClass: 'ai-purple', text: 'Attempted Mock Test – 013', time: 'Yesterday' },
  { icon: '📄', iconClass: 'ai-purple', text: 'Viewed Notes – DBMS', time: 'Yesterday' },
]

const drawerPrimaryItems = [
  { icon: '🏠', label: 'Dashboard', active: true },
  { icon: '📚', label: 'Subjects' },
  { icon: '🎯', label: 'Practice' },
  { icon: '📇', label: 'Flashcards' },
  { icon: '📝', label: 'Mock Tests' },
]

const drawerProgressItems = [
  { icon: '📊', label: 'Analytics' },
  { icon: '🗓️', label: 'Study Planner' },
  { icon: '🏆', label: 'Leaderboard' },
]

const drawerMoreItems = [
  { icon: '📄', label: 'Notes' },
  { icon: '🔔', label: 'Notifications', badge: '3' },
  { icon: '⚙️', label: 'Settings' },
  { icon: '❓', label: 'Help & Support' },
]

const navItems = [
  { icon: '🏠', label: 'Dashboard', active: true },
  { icon: '📚', label: 'Subjects' },
  { icon: '📇', label: 'Flashcards' },
  { icon: '⋯', label: 'More' },
]

function ProgressRing({ size, radius, strokeWidth, progress, trackColor, fillColor, children }) {
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

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
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="progress-ring-value">{children}</div>
    </div>
  )
}

function SectionHeader({ title, actionLabel = 'View All ›', onAction }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      <button type="button" className="view-all" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}

function DrawerItem({ icon, label, badge, active, onClick }) {
  return (
    <button
      type="button"
      className={`drawer-item${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <span className="d-icon" aria-hidden="true">
        {icon}
      </span>
      {label}
      {badge ? <span className="d-badge">{badge}</span> : null}
    </button>
  )
}

function MiniMissionItem({ label, value, width, done }) {
  return (
    <div className="mission-item">
      <span className={`mission-check${done ? '' : ' empty'}`}>{done ? '✓' : ''}</span>
      <div className="mission-body">
        <div className="mission-row">
          <span>{label}</span>
          <span>{value}</span>
        </div>
        <div className="mission-track">
          <div
            className={`mission-fill${done ? ' fill-green' : ' fill-gray'}`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function MiniCard({ theme, icon, title, value, tone, sub, action, children }) {
  return (
    <div className={`mini-card ${theme}`}>
      <div className="mini-top">
        <span className="mini-icon" aria-hidden="true">
          {icon}
        </span>
        {title}
      </div>
      {value ? <div className={`mini-num ${tone}`}>{value}</div> : null}
      {sub ? <div className="mini-sub">{sub}</div> : null}
      {action ? <div className={`mini-review ${tone}`}>{action}</div> : null}
      {children}
    </div>
  )
}

function SubjectCard({ subject, onSelect }) {
  return (
    <button
      type="button"
      className={`subject-card${subject.highlight ? ' highlight' : ''}`}
      onClick={() => onSelect(subject.subjectKey)}
    >
      <div className="subject-top">
        <div className={`subject-icon ${subject.iconClass}`}>{subject.icon}</div>
        <div className="subject-name">{subject.title}</div>
      </div>
      <ProgressRing
        size={70}
        radius={29}
        strokeWidth={7}
        progress={subject.progress}
        trackColor={subject.ringTrack}
        fillColor={subject.ringColor}
      >
        {subject.ringLabel}
      </ProgressRing>
      <div className="subject-stats">{subject.stats}</div>
      <div className={`subject-continue ${subject.continueClass}`}>Continue →</div>
    </button>
  )
}

function ActivityItem({ icon, iconClass, text, time }) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${iconClass}`}>{icon}</div>
      <div className="activity-text">{text}</div>
      <div className="activity-time">{time}</div>
      <div className="activity-chevron">›</div>
    </div>
  )
}

function DashboardPage({ onNavigateSubjects = () => {}, onOpenSubjectDetail = () => {} }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

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
            ✕
          </button>
          <div className="drawer-avatar">🧑‍💼</div>
          <div className="drawer-name">Abhi Kumar</div>
          <div className="drawer-sub">BPSC TRE 4.0 • Computer Science</div>
          <div className="drawer-streak">🔥 14 Day Streak</div>
        </div>

        <div className="drawer-menu">
          {drawerPrimaryItems.map((item) => (
            <DrawerItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={item.active}
              onClick={() => {
                if (item.label === 'Subjects') {
                  onNavigateSubjects()
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
              onClick={() => setDrawerOpen(false)}
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
              ↪
            </span>
            Log Out
          </button>
        </div>
      </aside>

      <div className="phone">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="menu-icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div>
              <div className="greeting-title">Good Evening, Abhi 👋</div>
              <div className="greeting-sub">BPSC TRE 4.0 • Computer Science</div>
            </div>
          </div>

          <div className="header-right">
            <div className="bell-wrap" aria-hidden="true">
              🔔<span className="bell-badge">3</span>
            </div>
            <div className="avatar" aria-hidden="true">
              🧑‍💼
            </div>
            <span className="chevron-down" aria-hidden="true">
              ▾
            </span>
          </div>
        </header>

        <main className="content">
          <div className="stats-bar">
            <div className="stat-block">
              <div className="stat-icon" aria-hidden="true">
                📅
              </div>
              <div>
                <div className="stat-label">Exam in</div>
                <div className="stat-value">84</div>
                <div className="stat-sub">Days Remaining</div>
              </div>
            </div>

            <div className="stat-divider" />

            <div className="stat-block goal-block">
              <div className="stat-icon" aria-hidden="true">
                🎯
              </div>
              <div className="goal-copy">
                <div className="stat-label">Today's Goal</div>
                <div className="stat-value goal-line">
                  120 <span>MCQs</span>
                </div>
                <div className="stat-value goal-line">
                  20 <span>Flashcards</span>
                </div>
              </div>
            </div>

            <div className="stat-divider" />

            <div className="stat-block">
              <div className="stat-icon" aria-hidden="true">
                🔥
              </div>
              <div>
                <div className="stat-label">Study Streak</div>
                <div className="stat-value">14</div>
                <div className="stat-sub">Days</div>
              </div>
            </div>
          </div>

          <div className="goal-progress-wrap">
            <div className="goal-progress-track">
              <div className="goal-progress-fill" />
            </div>
            <div className="goal-pct">
              <b>72%</b> Completed
            </div>
          </div>

          <section className="readiness-card">
            <div className="readiness-title">EXAM READINESS</div>
            <div className="readiness-top">
              <ProgressRing
                size={118}
                radius={50}
                strokeWidth={11}
                progress={72}
                trackColor="#2A2E38"
                fillColor="#F1621B"
              >
                <div className="readiness-pct">72%</div>
                <div className="readiness-ready-label">Ready</div>
              </ProgressRing>
              <div className="readiness-msg-wrap">
                <div className="readiness-msg">You're doing great! 💪</div>
                <div className="readiness-msg2">
                  Keep consistent and focus on weak areas.
                </div>
              </div>
            </div>

            <div className="readiness-divider">
              <div>
                <div className="predicted-label">Predicted Score</div>
                <div className="predicted-score">
                  82<span> / 100</span>
                </div>
              </div>
              <div className="improving-pill">↗ Improving</div>
            </div>

            <div className="areas-row">
              <div className="areas-col">
                <div className="areas-title areas-strong">Strong Areas</div>
                {strongAreas.map((area) => (
                  <div className="area-item" key={area}>
                    <span className="area-dot dot-good">✓</span>
                    {area}
                  </div>
                ))}
              </div>

              <div className="areas-col">
                <div className="areas-title areas-weak">Weak Areas</div>
                {weakAreas.map((area) => (
                  <div className="area-item" key={area}>
                    <span className="area-dot dot-bad">✕</span>
                    {area}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="continue-card">
            <div className="continue-header">🎯 Continue Today's Study</div>
            <div className="continue-body">
              <div className="continue-icon" aria-hidden="true">
                🦊
              </div>
              <div className="continue-copy">
                <div className="continue-subject">Computer Networks</div>
                <div className="continue-chapter">Routing Algorithms</div>
                <div className="continue-progress-track">
                  <div className="continue-progress-fill" />
                </div>
                <div className="continue-pct">72% Completed</div>
              </div>
            </div>
            <div className="continue-meta-row">
              <div>
                <div className="continue-meta-label">Remaining</div>
                <div className="continue-meta-value">18 MCQs • 12 Flashcards</div>
              </div>
              <div>
                <div className="continue-meta-label">Est. Time</div>
                <div className="continue-meta-value with-icon">🕐 14 min</div>
              </div>
            </div>
            <button type="button" className="continue-btn">
              Continue Study →
            </button>
          </section>

          <section className="mini-grid">
            {miniCards.map((card) => (
              <MiniCard
                key={card.title}
                theme={card.theme}
                icon={card.icon}
                title={card.title}
                value={card.value}
                tone={card.tone}
                sub={card.sub}
                action={card.action}
              />
            ))}

            <MiniCard theme="mini-blue" icon="🎯" title="Daily Mission">
              {missionItems.map((item) => (
                <MiniMissionItem
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  width={item.width}
                  done={item.done}
                />
              ))}
            </MiniCard>
          </section>

          <SectionHeader title="Your Subjects" onAction={onNavigateSubjects} />

          <section className="subjects-grid">
            {subjectCards.map((subject) => (
              <SubjectCard key={subject.title} subject={subject} onSelect={onOpenSubjectDetail} />
            ))}
          </section>

          <section className="bottom-row">
            <div className="coach-card">
              <div className="coach-avatar" aria-hidden="true">
                🤖
              </div>
              <div className="coach-copy">
                <div className="coach-name">AI Study Coach – NEXA</div>
                <div className="coach-msg">
                  Focus on COA today. You are making more errors in this subject.
                </div>
                <div className="coach-bottom">
                  <div className="coach-readiness">
                    Expected Readiness
                    <b>↗ 74%</b>
                  </div>
                  <button type="button" className="coach-btn">
                    Start Study Plan →
                  </button>
                </div>
              </div>
            </div>

            <div className="activity-card">
              <SectionHeader title="Recent Activity" />
              {activityItems.map((item) => (
                <ActivityItem key={`${item.text}-${item.time}`} {...item} />
              ))}
            </div>
          </section>
        </main>

        <nav className="bottom-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item${item.active ? ' active' : ''}`}
              onClick={() => {
                if (item.label === 'Subjects') {
                  onNavigateSubjects()
                  return
                }
                setDrawerOpen(false)
              }}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default DashboardPage

