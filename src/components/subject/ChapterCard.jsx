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

function ChapterCard({ chapter, showTrends = false, onClick }) {
  const readinessPercent = Math.round(Number(chapter.readinessScore ?? chapter.progress ?? 0))
  const coveragePercent = Math.round(Number(chapter.coveragePercent ?? 0))
  const masteryPercent = Math.round(Number(chapter.masteryPercent ?? chapter.masteryPercentage ?? 0))
  const accuracyPercent = Math.round(Number(chapter.accuracyPercent ?? chapter.accuracyPercentage ?? 0))

  const coverageLevel = chapter.coverageLevel || getAttemptCoverageLevel(coveragePercent)
  const levelColor = coverageLevel.color || '#12B76A'

  const totalMcqs = chapter.totalMcqs ?? (typeof chapter.mcqs === 'number' ? chapter.mcqs : 0)

  const prioMeta = formatPriority(chapter.priority || 'M')
  const priorityCode = prioMeta.code
  const priorityLabel = prioMeta.label

  const trendSymbol = chapter.trendSymbol || (chapter.trendDirection === 'improving' ? '↑' : chapter.trendDirection === 'declining' ? '↓' : '→')
  const trendDir = chapter.trendDirection || 'stable'

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
            {showTrends && (
              <span className="chapter-mcq-tag">{totalMcqs} MCQs</span>
            )}
          </div>

          {/* Expanded Trends Details */}
          {showTrends && (
            <div className="chapter-metrics-chips">
              <span className="chap-chip chip-cov" style={{ color: levelColor }}>
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

          {/* Progress bar reflects Readiness */}
          <div className="chapter-progress-track">
            <div
              className="chapter-progress-fill"
              style={{
                width: `${readinessPercent}%`,
                backgroundColor: readinessPercent >= 60 ? '#10B981' : readinessPercent >= 35 ? '#F1621B' : '#64748B',
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
                color: readinessPercent >= 60 ? '#10B981' : readinessPercent >= 35 ? '#F1621B' : '#64748B',
              }}
              title="Chapter Readiness Score"
            >
              {readinessPercent}%
            </span>
            <CircularCoverageRing
              percent={readinessPercent}
              color={readinessPercent >= 60 ? '#10B981' : readinessPercent >= 35 ? '#F1621B' : '#64748B'}
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