/**
 * ChapterCard
 * Reusable clickable chapter row showing:
 * - Chapter Number & Title
 * - Dynamic Real MCQ Count ("X MCQs" or "Y / X MCQs")
 * - Question Attempt Coverage (Circular SVG progress indicator colored by 4-level system)
 * - Mastery Value (Numeric % indicator calculated from unique student attempts)
 * - Navigation chevron
 */
import AppIcon from '../ui/AppIcon'
import { getAttemptCoverageLevel } from '../../services/mcqAnalyticsService'

export function CircularCoverageRing({ percent = 0, color = '#12B76A', size = 20, strokeWidth = 2.5 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (p / 100) * circumference

  return (
    <div
      className="coverage-ring-wrap"
      title={`Attempt Coverage: ${Math.round(p)}%`}
      aria-label={`Coverage ${Math.round(p)}%`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E4E7EC"
          strokeWidth={strokeWidth}
        />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
          />
        )}
      </svg>
    </div>
  )
}

function ChapterCard({ chapter, onClick }) {
  const coveragePercent = typeof chapter.coveragePercent === 'number' ? chapter.coveragePercent : (chapter.progress || 0)
  const masteryPercent = typeof chapter.masteryPercent === 'number' ? chapter.masteryPercent : (parseInt(chapter.pct, 10) || 0)
  const accuracyPercent = typeof chapter.accuracyPercent === 'number' ? chapter.accuracyPercent : masteryPercent

  const coverageLevel = chapter.coverageLevel || getAttemptCoverageLevel(coveragePercent)
  const levelColor = coverageLevel.color || '#12B76A'

  const totalMcqs = chapter.totalMcqs ?? (typeof chapter.mcqs === 'number' ? chapter.mcqs : 0)
  const attemptedMcqs = chapter.attemptedMcqs ?? 0
  const remainingQuestions = chapter.remainingQuestions ?? Math.max(0, totalMcqs - attemptedMcqs)
  const remainingPercent = totalMcqs > 0 ? Math.round((remainingQuestions / totalMcqs) * 100) : 0

  const subText = attemptedMcqs > 0
    ? `${attemptedMcqs} / ${totalMcqs} MCQs`
    : `${totalMcqs} MCQs`

  return (
    <button type="button" className="chapter-item" onClick={() => onClick?.(chapter)}>
      <div className="chapter-row-inner">
        <div className="chapter-num">{chapter.num}</div>
        <div className="chapter-body">
          <div className="chapter-title-row">
            <span className="chapter-title">{chapter.title}</span>
            <span className="chapter-mcq-tag">{totalMcqs} MCQs</span>
          </div>
          
          <div className="chapter-metrics-chips">
            <span className="chap-chip chip-cov" style={{ color: levelColor }}>
              Cov {Math.round(coveragePercent)}%
            </span>
            <span className="chap-chip chip-mast">
              Mast {Math.round(masteryPercent)}%
            </span>
            <span className="chap-chip chip-rem" title={`${remainingQuestions} remaining out of ${totalMcqs}`}>
              Rem {remainingPercent}% ({remainingQuestions})
            </span>
            <span className="chap-chip chip-acc">
              Acc {Math.round(accuracyPercent)}%
            </span>
          </div>

          <div className="chapter-progress-track">
            <div
              className="chapter-progress-fill"
              style={{
                width: `${coveragePercent}%`,
                backgroundColor: levelColor,
              }}
            />
          </div>
        </div>

        <div className="chapter-right">
          <div className="chapter-status">
            <span className="chapter-pct" style={{ color: levelColor }} title="Mastery %">
              {Math.round(masteryPercent)}%
            </span>
            <CircularCoverageRing percent={coveragePercent} color={levelColor} />
            <span className="chevron">
              <AppIcon name="chevronRight" size={16} />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default ChapterCard