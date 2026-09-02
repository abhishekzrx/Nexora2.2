/**
 * SubjectCard.jsx
 * Highly structured, aesthetic & robust EdTech Subject Card.
 * Clean, structured cards with zero text overlap:
 * - Top Row: Subject Icon Box (Left) + Circular Progress Ring (Right)
 * - Title & Status Badge
 * - 2-Column Structured Stat Boxes (Chapters & MCQs)
 * - Progress Bar with Percentage
 * - Full-Width Interactive CTA Action
 */

import AppIcon from '../ui/AppIcon'
import ProgressRing from '../ui/ProgressRing'
import { getBatteryGrade } from '../ui/BatteryCoverageRing'
import { formatInteger } from '../../services/mcqAnalyticsService'

export function SubjectCard({ subject, onSelect, className = '' }) {
  if (!subject) return null

  const subjectKey = subject.subjectKey || subject.id || subject.key
  const title = subject.title || subject.name || 'Subject'
  const chaptersList = subject.chapters || []

  // Dynamic Content Counts
  const totalChapters = Number(
    subject.totalChapters ||
    subject.counts?.chapters ||
    subject.chaptersCount ||
    (chaptersList.length > 0 ? chaptersList.length : 10)
  )

  const calculatedChapterMcqs = chaptersList.length > 0
    ? chaptersList.reduce((sum, ch) => sum + (Number(ch.totalMcqs || ch.mcqs?.length || ch.mcqs || 0) || 0), 0)
    : 0

  const totalMcqs = Number(
    subject.totalMcqs ||
    subject.counts?.mcqs ||
    subject.mcqsCount ||
    subject.mcqs ||
    (calculatedChapterMcqs > 0 ? calculatedChapterMcqs : totalChapters * 100)
  )

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

  // Color grade
  const gradeInfo = getBatteryGrade(coveragePercent)
  const themeColor = subject.coverageLevel?.color || gradeInfo.color || '#10B981'
  const ringTrack = 'rgba(255, 255, 255, 0.08)'

  // Status badge logic
  let statusBadgeText = 'NOT STARTED'
  let ctaText = 'Start Practice'
  let cardAccent = '#EA580C'
  let badgeClass = 'starting'

  if (totalChapters === 0 && totalMcqs === 0) {
    statusBadgeText = 'PREPARING'
    ctaText = 'Coming Soon'
    cardAccent = '#64748B'
    badgeClass = 'preparing'
  } else if (masteryPercent === 100 && coveragePercent === 100) {
    statusBadgeText = 'MASTERED'
    ctaText = 'Revise Subject'
    cardAccent = '#10B981'
    badgeClass = 'mastered'
  } else if (masteryPercent >= 75 || coveragePercent >= 75) {
    statusBadgeText = `${masteryPercent}% MASTERY`
    ctaText = 'Keep Practicing'
    cardAccent = '#10B981'
    badgeClass = 'proficient'
  } else if (hasAttempts || coveragePercent > 0) {
    statusBadgeText = `${masteryPercent}% ACCURACY`
    ctaText = 'Continue Practice'
    cardAccent = '#EA580C'
    badgeClass = 'improving'
  } else {
    statusBadgeText = 'GETTING STARTED'
    ctaText = 'Begin Practice'
    cardAccent = '#3B82F6'
    badgeClass = 'starting'
  }

  const formattedChapters = String(totalChapters).padStart(2, '0')
  const formattedMcqs = `${formatInteger(attemptedMcqs)} / ${formatInteger(totalMcqs)}`
  const displayProgress = hasAttempts ? masteryPercent : coveragePercent

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
      className={`modern-subject-card ${className}`.trim()}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick(e)
        }
      }}
    >
      {/* ROW 1: Top Bar with Icon & Circular Gauge */}
      <div className="modern-card-header">
        <div className="modern-icon-wrap" style={{ color: cardAccent }}>
          <AppIcon name={subject.icon || 'chapters'} size={20} />
        </div>

        <div className="modern-ring-wrap" title={`Overall Mastery: ${displayProgress}%`}>
          <ProgressRing
            size={42}
            radius={16}
            strokeWidth={4}
            progress={displayProgress}
            trackColor={ringTrack}
            fillColor={cardAccent}
          >
            <span className="modern-ring-val" style={{ color: cardAccent }}>
              {displayProgress}%
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* ROW 2: Subject Title & Status Badge */}
      <div className="modern-card-body">
        <h3 className="modern-subject-title" title={title}>
          {title}
        </h3>

        <div className="modern-badge-row">
          <span className={`modern-status-badge ${badgeClass}`}>
            <span className="modern-badge-dot" />
            <span>{statusBadgeText}</span>
          </span>
        </div>
      </div>

      {/* ROW 3: Structured 2-Column Stat Boxes */}
      <div className="modern-stats-grid">
        <div className="modern-stat-box">
          <span className="modern-stat-box-lbl">CHAPTERS</span>
          <div className="modern-stat-box-val">
            <span>📖</span>
            <b>{formattedChapters}</b>
          </div>
        </div>

        <div className="modern-stat-box">
          <span className="modern-stat-box-lbl">MCQS SOLVED</span>
          <div className="modern-stat-box-val">
            <span>🎯</span>
            <b>{formattedMcqs}</b>
          </div>
        </div>
      </div>

      {/* ROW 4: Progress Bar Track */}
      <div className="modern-progress-section">
        <div className="modern-progress-meta">
          <span className="modern-progress-lbl">Syllabus Progress</span>
          <span className="modern-progress-pct" style={{ color: cardAccent }}>
            {displayProgress}%
          </span>
        </div>
        <div className="modern-progress-track">
          <div
            className="modern-progress-fill"
            style={{
              width: `${displayProgress}%`,
              backgroundColor: cardAccent,
            }}
          />
        </div>
      </div>

      {/* ROW 5: Full-Width Interactive CTA Action */}
      <div className="modern-card-footer">
        <button
          type="button"
          className="modern-cta-btn"
          disabled={totalChapters === 0 && totalMcqs === 0}
          onClick={handleCardClick}
        >
          <span>{ctaText}</span>
          <span className="modern-cta-arrow">→</span>
        </button>
      </div>
    </div>
  )
}

export default SubjectCard
