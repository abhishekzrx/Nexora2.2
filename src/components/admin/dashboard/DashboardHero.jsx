/**
 * DashboardHero.jsx
 * Elite Visual EdTech Course Overview Header with Theme Badge, High-Readability Readiness Ring & Live Exam Tracking.
 */
import AppIcon from '../../ui/AppIcon'
import { calculateExamCountdown } from '../../../utils/dateUtils'

export default function DashboardHero({ analytics, activeCourse }) {
  const readiness = analytics?.overallReadiness || 0
  const isCountdownVisible = activeCourse?.showExamCountdown !== false
  const examCountdown = calculateExamCountdown(isCountdownVisible ? activeCourse?.examDate : null)

  const themeColor = activeCourse?.themeColor || '#F1621B'
  const status = activeCourse?.status || 'active'
  const isLocked = activeCourse?.locked || false

  return (
    <div className="dashboard-hero-card edutech-hero-card">
      <div className="hero-main-info">
        {/* Top Badges Line */}
        <div className="hero-top-badges-line">
          <div className="hero-course-tag">
            <span className="live-pulse-dot" />
            <span className="course-status-lbl">Active Workspace</span>
          </div>

          <span
            className={`hero-status-pill ${status}${isLocked ? ' locked' : ''}`}
          >
            {isLocked ? '🔒 LOCKED' : status.toUpperCase()}
          </span>

          {isCountdownVisible && examCountdown.daysRemaining !== null && (
            <span
              className="hero-countdown-pill"
              style={{
                background: '#FFF7ED',
                color: '#EA580C',
                border: '1px solid #FED7AA',
              }}
            >
              📅 {examCountdown.formattedDate} • <strong>{examCountdown.statusText}</strong>
            </span>
          )}
        </div>

        {/* Course Identity Line */}
        <div className="hero-identity-row">
          <span className="hero-theme-icon-badge" style={{ background: themeColor }}>
            <AppIcon name={activeCourse?.icon || 'folder'} size={22} />
          </span>
          <div>
            <h1 className="hero-course-name">{analytics?.courseName || activeCourse?.name || 'Active Course'}</h1>
            <div className="hero-meta-row">
              <span className="hero-meta-item">
                <AppIcon name="folder" size={13} /> Code: <strong>{activeCourse?.id || 'DEFAULT'}</strong>
              </span>
              <span className="hero-meta-divider">•</span>
              <span className="hero-meta-item">
                <AppIcon name="analyticsTab" size={13} /> System Readiness: <strong style={{ color: readiness >= 75 ? '#059669' : '#EA580C' }}>{readiness}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Intelligence Ring & Micro Stat Grid */}
      <div className="hero-readiness-block">
        <div className="readiness-gauge-wrap">
          <svg viewBox="0 0 120 120" className="readiness-ring-svg">
            <defs>
              <linearGradient id="heroScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F1621B" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="url(#heroScoreGrad)"
              strokeWidth="9"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 - (readiness / 100) * (2 * Math.PI * 48)}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div className="readiness-center-label">
            <span className="readiness-number">{readiness}%</span>
            <span className="readiness-text">Readiness</span>
          </div>
        </div>

        <div className="hero-stats-chips">
          <div className="hero-stat-chip highlight-sub">
            <span className="chip-val">{analytics?.totalSubjects || 0}</span>
            <span className="chip-lbl">Subjects</span>
          </div>
          <div className="hero-stat-chip highlight-chap">
            <span className="chip-val">{analytics?.totalChapters || 0}</span>
            <span className="chip-lbl">Chapters</span>
          </div>
          <div className="hero-stat-chip highlight-mcq">
            <span className="chip-val">{analytics?.totalMcqs || 0}</span>
            <span className="chip-lbl">MCQs</span>
          </div>
          <div className="hero-stat-chip highlight-flash">
            <span className="chip-val">{analytics?.totalFlashcards || 0}</span>
            <span className="chip-lbl">Flashcards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
