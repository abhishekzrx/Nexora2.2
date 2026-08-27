/**
 * DashboardHero.jsx
 * Premium EdTech Course Overview Header with high-readability Readiness Ring & Course Meta.
 */
import AppIcon from '../../ui/AppIcon'

export default function DashboardHero({ analytics, activeCourse }) {
  const readiness = analytics?.overallReadiness || 0

  return (
    <div className="dashboard-hero-card edutech-hero-card">
      <div className="hero-main-info">
        <div className="hero-course-tag">
          <span className="live-pulse-dot" />
          <span className="course-status-lbl">Active Workspace</span>
        </div>
        <h1 className="hero-course-name">{analytics?.courseName || 'Active Course'}</h1>

        <div className="hero-meta-row">
          <span className="hero-meta-item">
            <AppIcon name="folder" size={13} /> Code: <strong>{activeCourse?.id || 'DEFAULT'}</strong>
          </span>
          <span className="hero-meta-divider">•</span>
          <span className="hero-meta-item">
            <AppIcon name="document" size={13} /> Status: <strong>{readiness >= 75 ? 'Production Ready' : 'In Development'}</strong>
          </span>
        </div>
      </div>

      <div className="hero-readiness-block">
        <div className="readiness-gauge-wrap">
          <svg viewBox="0 0 120 120" className="readiness-ring-svg">
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke={readiness >= 75 ? '#12B76A' : readiness >= 40 ? '#F59E0B' : '#EF4444'}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 - (readiness / 100) * (2 * Math.PI * 48)}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="readiness-center-label">
            <span className="readiness-number">{readiness}%</span>
            <span className="readiness-text">Readiness</span>
          </div>
        </div>

        <div className="hero-stats-chips">
          <div className="hero-stat-chip">
            <span className="chip-val">{analytics?.totalSubjects || 0}</span>
            <span className="chip-lbl">Subjects</span>
          </div>
          <div className="hero-stat-chip">
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
