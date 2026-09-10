/**
 * ChapterCard.jsx
 * Reusable clickable chapter row with Performance Intelligence integration.
 *
 * Implements Phase 4 Requirements:
 * - Default View: Ultra-clean layout: Chapter #, Title, Priority Chip, Overall Readiness % + Circular Ring.
 * - Expanded View (controlled by Subject Header's "Show Trends" toggle):
 *     Displays Coverage %, Mastery %, Accuracy %, and Trend Direction chip (↑ / → / ↓).
 */

import AppIcon from '../ui/AppIcon'
import { getAttemptCoverageLevel } from '../../services/mcqAnalyticsService'
import { formatPriority } from '../../data/bpscPrelimsChapters.js'

export function CircularCoverageRing({ percent = 0, color = '#12B76A', size = 20, strokeWidth = 2.5 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (p / 100) * circumference

  return (
    <div
      className="coverage-ring-wrap"
      title={`Readiness / Progress: ${Math.round(p)}%`}
      aria-label={`Readiness ${Math.round(p)}%`}
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

function getCoverageColor(coveragePct) {
  if (coveragePct >= 75) return '#10B981' // High Coverage (Emerald)
  if (coveragePct >= 50) return '#FB923C' // Strong Coverage (Orange)
  if (coveragePct >= 25) return '#38BDF8' // Building Coverage (Sky Blue)
  return '#94A3B8' // Getting Started (Slate)
}

function ChapterCard({ chapter, showTrends = false, onClick }) {
  const totalMcqs = Number(chapter.totalMcqs ?? (typeof chapter.mcqs === 'number' ? chapter.mcqs : 0)) || 0
  const attemptedMcqs = Number(chapter.attemptedMcqs ?? chapter.uniqueAttempted ?? 0) || 0

  const coveragePercent = totalMcqs > 0 ? Math.min(100, Math.round((attemptedMcqs / totalMcqs) * 100)) : Math.round(Number(chapter.coveragePercent ?? 0))
  const masteryPercent = Math.round(Number(chapter.masteryPercent ?? chapter.masteryPercentage ?? 0))
  const accuracyPercent = Math.round(Number(chapter.accuracyPercent ?? chapter.accuracyPercentage ?? 0))
  const readinessPercent = Math.round(Number(chapter.readinessScore ?? chapter.progress ?? 0))

  const coverageColor = getCoverageColor(coveragePercent)

  const prioMeta = formatPriority(chapter.priority || 'M')
  const priorityCode = prioMeta.code
  const priorityLabel = prioMeta.label

  const trendSymbol = chapter.trendSymbol || (chapter.trendDirection === 'improving' ? '↑' : chapter.trendDirection === 'declining' ? '↓' : '→')
  const trendDir = chapter.trendDirection || 'stable'

  const mcqLabel = attemptedMcqs > 0 ? `${attemptedMcqs} / ${totalMcqs} MCQs` : `${totalMcqs} MCQs`

  return (
    <button
      type="button"
      className={`chapter-item${showTrends ? ' trends-expanded' : ' clean-view'}`}
      onClick={() => onClick?.(chapter)}
    >
      <div className="chapter-row-inner">
        <div className="chapter-num">{chapter.num || '01'}</div>

        <div className="chapter-body">
          <div className="chapter-title-row">
            <span className="chapter-title">{chapter.title || chapter.name}</span>
            <span className="chapter-mcq-tag" style={{ color: attemptedMcqs > 0 ? '#FB923C' : '#94A3B8' }}>
              {mcqLabel}
            </span>
          </div>
          <div className="chapter-sub">
            {chapter.sub || chapter.meta || (attemptedMcqs > 0 ? `${attemptedMcqs} of ${totalMcqs} questions practiced` : `${totalMcqs} MCQs available`)}
          </div>

          {/* Expanded Trends Details */}
          {showTrends && (
            <div className="chapter-metrics-chips">
              <span className="chap-chip chip-cov" style={{ color: coverageColor }}>
                Cov {coveragePercent}%
              </span>
              <span className="chap-chip chip-mast">
                Mast {masteryPercent}%
              </span>
              <span className="chap-chip chip-acc">
                Acc {accuracyPercent}%
              </span>
              <span className={`chap-chip chip-trend dir-${trendDir}`}>
                {trendSymbol} {chapter.trendLabel || (trendDir === 'improving' ? 'Improving' : trendDir === 'declining' ? 'Declining' : 'Stable')}
              </span>
            </div>
          )}

          {/* Progress bar reflects Question Coverage */}
          <div className="chapter-progress-track">
            <div
              className="chapter-progress-fill"
              style={{
                width: `${coveragePercent}%`,
                backgroundColor: coverageColor,
              }}
            />
          </div>
        </div>

        <div className="chapter-right">
          {priorityCode && (
            <div className="chapter-prio-col">
              <span
                className={`chapter-priority-chip prio-${priorityCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                title={`Exam Priority: ${priorityLabel}`}
              >
                {priorityLabel}
              </span>
            </div>
          )}

          <div className="chapter-status">
            <span
              className="chapter-pct"
              style={{
                color: masteryPercent >= 60 ? '#10B981' : masteryPercent >= 35 ? '#FB923C' : '#94A3B8',
              }}
              title={`Mastery: ${masteryPercent}%`}
            >
              {masteryPercent}%
            </span>
            <CircularCoverageRing
              percent={coveragePercent}
              color={coverageColor}
            />
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