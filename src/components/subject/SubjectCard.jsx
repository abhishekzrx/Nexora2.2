/**
 * SubjectCard.jsx
 * Forest Green 2-Column Mobile Subject Card matching htmlresource design.
 * Fixed height, auto-clamping, zero overflow, responsive layout.
 */

import AppIcon from '../ui/AppIcon'
import { formatInteger } from '../../services/mcqAnalyticsService'

export function SubjectCard({ subject, onSelect, className = '' }) {
  if (!subject) return null

  const subjectKey = subject.subjectKey || subject.id || subject.key
  const title = subject.title || subject.name || 'Subject'
  const chaptersList = subject.chapters || []

  // Dynamic Content Counts strictly from real hierarchy
  const totalChapters = Number(
    subject.totalChapters ??
    subject.counts?.chapters ??
    subject.chaptersCount ??
    chaptersList.length
  ) || 0

  const calculatedChapterMcqs = chaptersList.length > 0
    ? chaptersList.reduce((sum, ch) => sum + (Number(ch.totalMcqs || ch.mcqs?.length || ch.mcqs || 0) || 0), 0)
    : 0

  const totalMcqs = Number(
    subject.totalMcqs ??
    subject.counts?.mcqs ??
    subject.mcqsCount ??
    subject.mcqs ??
    calculatedChapterMcqs
  ) || 0

  // Student Progress & Attempted MCQs
  const attemptedMcqs = Number(subject.attemptedMcqs ?? subject.coveredMcqs ?? 0)
  const masteredMcqs = Number(subject.masteredMcqs ?? 0)
  const hasAttempts = Boolean(subject.hasAttempts || attemptedMcqs > 0)

  const coveragePercent = Math.max(0, Math.min(100, Math.round(
    subject.coveragePercent ?? subject.progress ?? (totalMcqs > 0 ? (attemptedMcqs / totalMcqs) * 100 : 0)
  )))

  const masteryPercent = Math.max(0, Math.min(100, Math.round(
    subject.masteryPercent ?? subject.accuracy ?? (attemptedMcqs > 0 ? (masteredMcqs / attemptedMcqs) * 100 : 0)
  )))

  const displayProgress = hasAttempts ? masteryPercent : coveragePercent

  // Status badge logic matching theme
  let statusBadgeText = 'Getting Started'
  let ctaText = 'Start'
  let themeVariant = 'forest' // 'forest' | 'amber' | 'rose' | 'gray'

  if (totalChapters === 0 && totalMcqs === 0) {
    statusBadgeText = 'Preparing'
    ctaText = 'Coming Soon'
    themeVariant = 'gray'
  } else if (masteryPercent >= 75 || coveragePercent >= 75) {
    statusBadgeText = 'Strong'
    ctaText = 'Revise'
    themeVariant = 'forest'
  } else if (hasAttempts && masteryPercent < 40) {
    statusBadgeText = 'Weak Area'
    ctaText = 'Start'
    themeVariant = 'rose'
  } else if (hasAttempts || coveragePercent > 0) {
    statusBadgeText = 'In Progress'
    ctaText = 'Resume'
    themeVariant = 'forest'
  } else if (coveragePercent < 20) {
    statusBadgeText = 'Needs Focus'
    ctaText = 'Practice'
    themeVariant = 'amber'
  }

  const formattedChapters = String(totalChapters).padStart(2, '0')
  const formattedMcqs = `${formatInteger(attemptedMcqs)}/${formatInteger(totalMcqs)}`

  const handleCardClick = (e) => {
    e.preventDefault()
    if (typeof onSelect === 'function') {
      onSelect(subjectKey)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`sub-card-container theme-${themeVariant} ${className}`.trim()}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick(e)
        }
      }}
    >
      <div className="sub-card-top-content">
        {/* Row 1: Icon box + Circular Radial Gauge */}
        <div className="sub-card-header-row">
          <div className="sub-card-icon-box">
            <AppIcon name={subject.icon || 'chapters'} size={18} />
          </div>

          <div className="sub-card-gauge-wrap" title={`Progress: ${displayProgress}%`}>
            <svg className="sub-gauge-svg" viewBox="0 0 36 36">
              <path
                className="sub-gauge-bg"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="sub-gauge-fill"
                strokeWidth="3.5"
                strokeDasharray={`${displayProgress}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="sub-gauge-pct-text">{displayProgress}%</span>
          </div>
        </div>

        {/* Row 2: Title (Strictly clamped to 2 lines max with uniform height) */}
        <h4 className="sub-card-title" title={title}>
          {title}
        </h4>

        {/* Row 3: Status Badge */}
        <div className="sub-card-badge-row">
          <span className={`sub-status-pill ${themeVariant}`}>
            <span className="sub-status-dot" />
            {statusBadgeText}
          </span>
        </div>

        {/* Row 4: Stats & Mini Progress Track */}
        <div className="sub-card-meta-row">
          <div className="sub-meta-counts">
            <span className="sub-meta-ch">📖 {formattedChapters} Ch</span>
            <span className="sub-meta-mcq">{formattedMcqs}</span>
          </div>
          <div className="sub-mini-track">
            <div
              className="sub-mini-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Row 5: Bottom CTA Action */}
      <button
        type="button"
        className="sub-card-cta-btn"
        disabled={totalChapters === 0 && totalMcqs === 0}
        onClick={handleCardClick}
      >
        <span>{ctaText}</span>
        <span className="sub-cta-arrow">→</span>
      </button>
    </div>
  )
}

export default SubjectCard
