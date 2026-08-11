import { useEffect, useMemo, useRef, useState } from 'react'
import './Dashboard.css'
import AppIcon from './components/ui/AppIcon'
import MobileLayout from './components/layout/MobileLayout'
import { useContentRegistry } from './data/contentRegistry'
import { navigate } from './utils/navigation'
import { useRoleStore } from './data/roleStore'
import { useWorkspaceStore } from './data/workspaceStore'
import { useCourseRegistry } from './data/courseRegistry'
import StudentCourseSelector from './components/student/StudentCourseSelector'
import RoleSwitch from './components/student/RoleSwitch'
import EmptyCourseState from './components/admin/EmptyCourseState'

const strongAreas = ['DBMS', 'Operating System', 'Computer Networks']
const weakAreas = ['COA', 'Digital Electronics']

// ── Dynamic Readiness Levels ─────────────────────────────
// Future backend integration only needs to pass a readiness
// percentage — all colors, labels, gradients, badges and
// visual states update automatically from this config.
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
    message: "You're making steady progress.",
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
    message: "You're approaching exam-ready performance.",
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
    message: 'Excellent! Maintain your momentum.',
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

const miniCards = [
  {
    theme: 'mini-green',
    icon: 'computer',
    title: "Today's Revision",
    value: '45',
    tone: 'green',
    sub: 'Flashcards Due',
    action: 'Review Now →',
  },
  {
    theme: 'mini-red',
    icon: 'cross',
    title: 'Incorrect Qs',
    value: '12',
    tone: 'red',
    sub: 'Questions',
    action: 'Review Now →',
  },
  {
    theme: 'mini-purple',
    icon: 'bookmark',
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

// Color tone mapping for dashboard subject cards
const DASH_TONE_MAP = [
  { iconClass: 'icon-blue', ringTrack: '#E7EDFD', ringColor: '#2E5CE6', continueClass: 'cont-blue' },
  { iconClass: 'icon-green', ringTrack: '#DFF7EA', ringColor: '#12B76A', continueClass: 'cont-green' },
  { iconClass: 'icon-purple', ringTrack: '#EFE6FC', ringColor: '#7C3AED', continueClass: 'cont-purple' },
  { iconClass: 'icon-orange', ringTrack: '#FFE9D9', ringColor: '#F1621B', continueClass: 'cont-orange' },
  { iconClass: 'icon-red', ringTrack: '#FDEDEC', ringColor: '#F04438', continueClass: 'cont-red' },
  { iconClass: 'icon-teal', ringTrack: '#E6F7F7', ringColor: '#0E9494', continueClass: 'cont-teal' },
]

const activityItems = [
  { icon: 'check', iconClass: 'ai-green', text: 'Solved 20 MCQs in OS', time: '2h ago' },
  { icon: 'flashcards', iconClass: 'ai-orange', text: 'Reviewed 15 Flashcards', time: '4h ago' },
  { icon: 'document', iconClass: 'ai-purple', text: 'Attempted Mock Test – 013', time: 'Yesterday' },
  { icon: 'document', iconClass: 'ai-purple', text: 'Viewed Notes – DBMS', time: 'Yesterday' },
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

function ReadinessRing({ size, radius, strokeWidth, progress, gradient, glow, trackColor, children }) {
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
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <div className="readiness-ring-value">{children}</div>
    </div>
  )
}

function ReadinessBadge({ level }) {
  return (
    <div className={`readiness-badge ${level.badgeClass}`}>
      <span className="readiness-badge-dot" />
      {level.label}
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

function MiniMissionItem({ label, value, width, done }) {
  return (
    <div className="mission-item">
      <span className={`mission-check${done ? '' : ' empty'}`}>
        {done ? <AppIcon name="check" size={10} /> : null}
      </span>
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

function MiniCard({ theme, icon, title, value, tone, sub, action, onClick, children }) {
  return (
    <div
      className={`mini-card ${theme}${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <div className="mini-top">
        <span className="mini-icon" aria-hidden="true">
          <AppIcon name={icon} size={15} />
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
  const handleCardClick = () => {
    onSelect(subject.subjectKey)
  }

  const handleContinueClick = (e) => {
    e.stopPropagation()
    onSelect(subject.subjectKey)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`subject-card${subject.highlight ? ' highlight' : ''}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      <div className="subject-card-header">
        <div className={`subject-icon ${subject.iconClass}`}>
          <AppIcon name={subject.icon} size={20} />
        </div>
        <div className="subject-progress-ring">
          <ProgressRing
            size={44}
            radius={18}
            strokeWidth={4}
            progress={subject.progress}
            trackColor="#E7EDFD"
            fillColor="#2E5CE6"
          >
            <span className="subject-progress-pct">{subject.progress}%</span>
          </ProgressRing>
        </div>
      </div>
      <div className="subject-name">{subject.title}</div>
      <div className="subject-stats">
        <span className="subject-stat">
          <AppIcon name="document" size={11} />
          {subject.chapters}
        </span>
        <span className="subject-stat">
          <AppIcon name="mcqs" size={11} />
          {subject.mcqs}
        </span>
        <span className="subject-stat">
          <AppIcon name="flashcardsTab" size={11} />
          {subject.flashcards}
        </span>
      </div>
      <button
        type="button"
        className="subject-continue"
        onClick={handleContinueClick}
      >
        Continue <AppIcon name="arrowForward" size={13} />
      </button>
    </div>
  )
}

function ActivityItem({ icon, iconClass, text, time }) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${iconClass}`}>
        <AppIcon name={icon} size={12} />
      </div>
      <div className="activity-text">{text}</div>
      <div className="activity-time">{time}</div>
      <div className="activity-chevron">›</div>
    </div>
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

  // ── Dynamic Course Metrics ─────────────
  const readinessScore = activeCourse?.metadata?.completion || activeCourse?.contentHealth?.score || (courseRegistry.subjectCount > 0 ? 72 : 0)
  const readinessLevel = getReadinessLevel(readinessScore)
  const animatedScore = useAnimatedNumber(readinessScore)
  const totalMcqs = courseRegistry.mcqCount || activeCourse?.metadata?.mcqs || 0
  const totalFlashcards = courseRegistry.flashcardCount || activeCourse?.metadata?.flashcards || 0
  const completionRate = activeCourse?.studentProgress?.completionRate || readinessScore || 0

  // Derive subject cards strictly from courseRegistry for activeWorkspaceId
  const subjectCards = useMemo(() => {
    return courseRegistry.subjectsList.slice(0, 4).map((s, i) => {
      const tone = DASH_TONE_MAP[i % DASH_TONE_MAP.length]
      return {
        subjectKey: s.subjectKey,
        title: s.title,
        icon: s.icon,
        iconClass: tone.iconClass,
        progress: s.progress,
        chapters: s.counts?.chapters || 0,
        mcqs: s.counts?.mcqs || 0,
        flashcards: s.counts?.flashcards || 0,
        highlight: i === 0,
      }
    })
  }, [courseRegistry])

  const handleCourseSelect = (id) => {
    setActiveWorkspace(id)
  }

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
            <AppIcon name="close" size={18} />
          </button>
          <div className="drawer-avatar" aria-hidden="true">
            <AppIcon name="profile" size={26} />
          </div>
          <div className="drawer-name">Abhi Kumar</div>
          <div className="drawer-sub">BPSC TRE 4.0 • Computer Science</div>
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
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="menu-icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <AppIcon name="menu" size={20} />
            </button>
            <div>
              <div className="greeting-title">Good Evening, Abhi 👋</div>
              <div className="greeting-sub">{activeCourse?.name || 'Select a Course'}</div>
              <StudentCourseSelector onSelect={handleCourseSelect} />
              {isAdmin && (
                <div className="dashboard-role-switch">
                  <RoleSwitch onSwitchToAdmin={onNavigateAdmin} onSwitchToStudent={() => navigate('')} />
                </div>
              )}
            </div>
          </div>

          <div className="header-right">
            <div className="bell-wrap" aria-hidden="true">
              <AppIcon name="notifications" size={19} />
              <span className="bell-badge">3</span>
            </div>
            <div className="avatar" aria-hidden="true">
              <AppIcon name="profile" size={20} />
            </div>
            <span className="chevron-down" aria-hidden="true">
              <AppIcon name="chevronDown" size={12} />
            </span>
          </div>
        </header>

        <main className="content">
          <div className="stats-bar">
            <div className="stat-block">
              <div className="stat-icon" aria-hidden="true">
                <AppIcon name="calendar" size={19} />
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
                <AppIcon name="goal" size={19} />
              </div>
              <div className="goal-copy">
                <div className="stat-label">Today's Goal</div>
                <div className="stat-value goal-line">
                  {totalMcqs > 0 ? totalMcqs : 120} <span>MCQs</span>
                </div>
                <div className="stat-value goal-line">
                  {totalFlashcards > 0 ? totalFlashcards : 20} <span>Flashcards</span>
                </div>
              </div>
            </div>

            <div className="stat-divider" />

            <div className="stat-block">
              <div className="stat-icon" aria-hidden="true">
                <AppIcon name="streak" size={19} />
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
              <div className="goal-progress-fill" style={{ width: `${completionRate}%` }} />
            </div>
            <div className="goal-pct">
              <b>{completionRate}%</b> Completed
            </div>
          </div>

          <section
            className="readiness-card"
            style={{
              '--readiness-accent': readinessLevel.accent,
              '--readiness-glow': readinessLevel.glow,
              '--readiness-card-accent': readinessLevel.cardAccent,
            }}
          >
            <div className="readiness-title">EXAM READINESS</div>
            <div className="readiness-top">
              <ReadinessRing
                size={118}
                radius={50}
                strokeWidth={11}
                progress={readinessScore}
                gradient={readinessLevel.ringGradient}
                glow={readinessLevel.glow}
                trackColor="#2A2E38"
              >
                <div className="readiness-ring-label">{readinessLevel.label}</div>
              </ReadinessRing>

              <div className="readiness-score-block">
                <div className="readiness-score-value" style={{ color: readinessLevel.accent }}>
                  {animatedScore}%
                </div>
                <div className="readiness-score-label">Readiness</div>
              </div>

              <div className="readiness-projected">
                <div className="predicted-label">Projected Score</div>
                <div className="predicted-score">
                  82<span> / 100</span>
                </div>
              </div>
            </div>

            <div className="readiness-divider" />

            <div className="areas-row">
              <div className="areas-col">
                <div className="areas-title areas-strong">Strong Areas</div>
                {strongAreas.map((area) => (
                  <div className="area-item" key={area}>
                    <span className="area-dot dot-good">
                      <AppIcon name="check" size={9} />
                    </span>
                    {area}
                  </div>
                ))}
              </div>

              <div className="areas-col">
                <div className="areas-title areas-weak">Weak Areas</div>
                {weakAreas.map((area) => (
                  <div className="area-item" key={area}>
                    <span className="area-dot dot-bad">
                      <AppIcon name="cross" size={9} />
                    </span>
                    {area}
                  </div>
                ))}
              </div>
            </div>

            <div className="readiness-status-row">
              <ReadinessBadge level={readinessLevel} />
              <div className="readiness-message">{readinessLevel.message}</div>
            </div>
          </section>

          <section className="continue-card">
            <div className="continue-header">
              <AppIcon name="practice" size={16} />
              Continue Today's Study
            </div>
            <div className="continue-body">
              <div className="continue-icon" aria-hidden="true">
                <AppIcon name="computerNetworks" size={20} />
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
                <div className="continue-meta-value with-icon">
                  <AppIcon name="clock" size={14} /> 14 min
                </div>
              </div>
            </div>
            <button
              type="button"
              className="continue-btn"
              onClick={() => onOpenSubjectDetail('computer-networks')}
            >
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
                onClick={onNavigateSubjects}
              />
            ))}

            <MiniCard theme="mini-blue" icon="target" title="Daily Mission">
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

          {effectiveCourseId && courseRegistry.subjectsList.length === 0 ? (
            <EmptyCourseState />
          ) : (
            <section className="subjects-grid">
              {subjectCards.map((subject) => (
                <SubjectCard key={subject.title} subject={subject} onSelect={onOpenSubjectDetail} />
              ))}
            </section>
          )}

          <section className="bottom-row">
            <div className="coach-card">
              <div className="coach-avatar" aria-hidden="true">
                <AppIcon name="aiCoach" size={26} />
              </div>
              <div className="coach-copy">
                <div className="coach-name">AI Study Coach – NEXA</div>
                <div className="coach-msg">
                  Focus on COA today. You are making more errors in this subject.
                </div>
                <div className="coach-bottom">
                  <div className="coach-readiness">
                    Expected Readiness
                    <b>
                      <AppIcon name="trendingUp" size={14} />
                      74%
                    </b>
                  </div>
                  <button
                    type="button"
                    className="coach-btn"
                    onClick={onNavigateSubjects}
                  >
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
      </MobileLayout>
    </div>
  )
}

export default DashboardPage