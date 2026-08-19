/**
 * SubjectCard.jsx
 * Redesigned Smart Student Dashboard Subject Card.
 * Clean, spacious, non-overlapping layout:
 * - Top Row: Subject Icon (Left) + Progress Ring (Right)
 * - Title Row: Full Subject Name + Grade Badge
 * - Summary Grid: Top Labels "CH" and "MCQS" ABOVE, full values INSIDE boxes (e.g. 0/1,000 with no truncation)
 * - Progress Bar & Contextual CTA Button
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

  // Dynamic Content Counts (Robust multi-layer fallback calculation)
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

  const totalFlashcards = Number(
    subject.counts?.flashcards ?? subject.totalFlashcards ?? subject.flashcards ?? 0
  )

  const totalNotes = Number(
    subject.counts?.notes ?? subject.totalNotes ?? subject.notes ?? 0
  )

  // Student Progress & Attempted (Covered) MCQs
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
  const themeColor = subject.coverageLevel?.color || gradeInfo.color || '#12B76A'
  const themeBg = subject.coverageLevel?.bg || gradeInfo.bg || 'rgba(18, 183, 106, 0.1)'
  const ringTrack = subject.coverageLevel?.ringTrack || 'rgba(0, 0, 0, 0.06)'

  // Contextual CTA
  let ctaText = 'Start Learning →'
  if (totalChapters === 0 && totalMcqs === 0) {
    ctaText = 'Content Preparing'
  } else if (masteryPercent === 100 && coveragePercent === 100) {
    ctaText = 'Review Mastery →'
  } else if (hasAttempts) {
    ctaText = 'Continue Learning →'
  }

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
      className={`smart-subject-card ${className}`.trim()}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick(e)
        }
      }}
    >
      {/* ROW 1: TOP ICON & PROGRESS RING */}
      <div className="smart-card-top flex-between">
        <div
          className="smart-subject-icon"
          style={{ backgroundColor: subject.accentBg || themeBg }}
        >
          <AppIcon name={subject.icon || 'chapters'} size={20} color={subject.accent || themeColor} />
        </div>

        <div className="smart-ring-wrapper" title={`Progress: ${hasAttempts ? masteryPercent : coveragePercent}%`}>
          <ProgressRing
            size={42}
            radius={16.5}
            strokeWidth={4}
            progress={hasAttempts ? masteryPercent : coveragePercent}
            trackColor={ringTrack}
            fillColor={themeColor}
          >
            <span className="smart-ring-val" style={{ color: themeColor }}>
              {hasAttempts ? `${masteryPercent}%` : `${coveragePercent}%`}
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* ROW 2: SUBJECT TITLE & GRADE BADGE */}
      <div className="smart-card-middle">
        <h3 className="smart-subject-title" title={title}>{title}</h3>
        <div className="smart-badge-wrap">
          <span
            className="smart-grade-badge"
            style={{ backgroundColor: themeBg, color: themeColor }}
          >
            <span className="dot" style={{ backgroundColor: themeColor }} />
            {hasAttempts ? `${masteryPercent}% MASTERY` : gradeInfo.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ROW 3: CONTENT SUMMARY (Top Labels: "CH", "MCQS", "CARDS", "NOTES") */}
      <div className="smart-content-box">
        <div className="smart-content-grid">
          {/* Column 1: Chapters */}
          <div className="smart-stat-col col-ch" title={`${totalChapters} Chapters`}>
            <span className="smart-stat-lbl">CH</span>
            <div className="smart-stat-val-box">
              <AppIcon name="chapters" size={12} />
              <span className="smart-stat-num">{totalChapters}</span>
            </div>
          </div>

          {/* Column 2: MCQs (Covered / Total) */}
          <div className="smart-stat-col col-mcq" title={`Covered: ${formatInteger(attemptedMcqs)} / Total: ${formatInteger(totalMcqs)} MCQs`}>
            <span className="smart-stat-lbl">MCQS</span>
            <div className="smart-stat-val-box highlight-box">
              <AppIcon name="mcqs" size={12} />
              <span className="smart-stat-num">{formatInteger(attemptedMcqs)}/{formatInteger(totalMcqs)}</span>
            </div>
          </div>

          {totalFlashcards > 0 && (
            <div className="smart-stat-col col-cards" title={`${totalFlashcards} Flashcards`}>
              <span className="smart-stat-lbl">CARDS</span>
              <div className="smart-stat-val-box">
                <AppIcon name="flashcardsTab" size={12} />
                <span className="smart-stat-num">{formatInteger(totalFlashcards)}</span>
              </div>
            </div>
          )}

          {totalNotes > 0 && (
            <div className="smart-stat-col col-notes" title={`${totalNotes} Notes`}>
              <span className="smart-stat-lbl">NOTES</span>
              <div className="smart-stat-val-box">
                <AppIcon name="notesTab" size={12} />
                <span className="smart-stat-num">{formatInteger(totalNotes)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 4: PROGRESS BAR */}
      <div className="smart-progress-section">
        <div className="smart-progress-meta flex-between">
          <span className="smart-progress-label">Learning Progress</span>
          <span className="smart-progress-val" style={{ color: themeColor }}>
            {hasAttempts ? `${masteryPercent}% Mastery` : `${coveragePercent}% Coverage`}
          </span>
        </div>
        <div className="smart-progress-track">
          <div
            className="smart-progress-fill"
            style={{
              width: `${hasAttempts ? masteryPercent : coveragePercent}%`,
              backgroundColor: themeColor,
            }}
          />
        </div>
      </div>

      {/* ROW 5: CONTEXTUAL CTA BUTTON */}
      <div className="smart-card-footer">
        <button
          type="button"
          className="smart-cta-btn"
          disabled={totalChapters === 0 && totalMcqs === 0}
          onClick={handleCardClick}
        >
          <span>{ctaText}</span>
        </button>
      </div>
    </div>
  )
}

export default SubjectCard
