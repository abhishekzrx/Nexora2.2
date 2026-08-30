/**
 * SubjectHero.jsx
 * Redesigned Subject Hero Performance Intelligence Card.
 *
 * Implements Phase 2 Requirements (Task 7 & 8):
 * - Primary Metric Selector: [ Readiness | Accuracy | Coverage | Mastery ].
 * - Meaningful historical Subject Trend Line Graph using actual stored snapshots.
 * - Dynamic Trend Direction badge (↑ 8% Improving, etc.) & Contextual AI Insight text.
 * - Zero fake trend generation: displays "Continue practicing to unlock performance trends" when history < 2 points.
 * - Multi-layer concentric ring coverage & metadata chips.
 */

import { useState, useMemo } from 'react'
import ConcentricRingGraph from '../ui/ConcentricRingGraph'
import AppIcon from '../ui/AppIcon'
import { formatInteger } from '../../services/mcqAnalyticsService'
import { METRIC_TYPES, METRIC_META } from '../../config/performanceConfig'
import { getSubjectSnapshots, calculateTrendDirection } from '../../services/trendService'

function generateSmoothPath(points, width = 200, height = 36, padding = 4) {
  if (!points || points.length === 0) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min === 0 ? 1 : max - min

  const coords = points.map((val, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y }
  })

  let d = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]
    const next = coords[i + 1]
    const cp1x = curr.x + (next.x - curr.x) / 2
    const cp1y = curr.y
    const cp2x = curr.x + (next.x - curr.x) / 2
    const cp2y = next.y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`
  }

  const last = coords[coords.length - 1]
  const first = coords[0]
  const area = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`

  return { path: d, area, lastPoint: last, coords }
}

function SubjectHero({ subject }) {
  const [activeMetric, setActiveMetric] = useState(METRIC_TYPES.READINESS)

  const counts = subject?.counts || {}
  const chapters = subject?.chapters || []
  const chapterCount = counts.chapters ?? chapters.length

  const totalMcqCount = subject?.totalMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.totalMcqs || ch.mcqs || 0) || 0), 0)
  const attemptedMcqCount = subject?.attemptedMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.attemptedMcqs || 0) || 0), 0)
  const flashCount = counts.flashcards ?? 0
  const notesCount = counts.notes ?? chapterCount ?? 0

  const coveragePercent = Math.round(Number(subject?.coveragePercent ?? subject?.coverage ?? 0))
  const masteryPercent = Math.round(Number(subject?.masteryPercent ?? subject?.mastery ?? 0))
  const accuracyPercent = Math.round(Number(subject?.accuracyPercent ?? subject?.accuracy ?? 0))
  const readinessPercent = Math.round(Number(subject?.readinessScore ?? subject?.readiness ?? subject?.progress ?? 0))

  // Retrieve actual historical snapshots
  const subjectId = subject?.id || subject?.subjectId || subject?.subjectKey
  const snapshots = useMemo(() => {
    if (subject?.snapshots?.all?.length) return subject.snapshots.all
    return subjectId ? getSubjectSnapshots(subjectId, 'all') : []
  }, [subject, subjectId])

  // Trend analysis for active metric
  const trendInfo = useMemo(() => {
    return calculateTrendDirection(snapshots, activeMetric)
  }, [snapshots, activeMetric])

  // Current metric value
  const currentMetricValue = useMemo(() => {
    switch (activeMetric) {
      case METRIC_TYPES.ACCURACY:
        return accuracyPercent
      case METRIC_TYPES.COVERAGE:
        return coveragePercent
      case METRIC_TYPES.MASTERY:
        return masteryPercent
      case METRIC_TYPES.READINESS:
      default:
        return readinessPercent
    }
  }, [activeMetric, accuracyPercent, coveragePercent, masteryPercent, readinessPercent])

  // Trend points from actual history
  const trendPoints = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return null
    return snapshots.map((s) => Number(s[activeMetric] || 0))
  }, [snapshots, activeMetric])

  const sparkline = useMemo(() => {
    if (!trendPoints || trendPoints.length < 2) return null
    return generateSmoothPath(trendPoints, 210, 36, 4)
  }, [trendPoints])

  const metricMeta = METRIC_META[activeMetric] || METRIC_META[METRIC_TYPES.READINESS]

  return (
    <section className="hero-card compact-hero hero-pro-theme hero-intelligence-redesign">
      {/* ── Left Side: Performance Intelligence & Metric Switcher ───── */}
      <div className="hero-main-content">
        {/* Metric Selector Tabs */}
        <div className="hero-metric-selector-row">
          {Object.values(METRIC_TYPES).map((mKey) => {
            const m = METRIC_META[mKey]
            const isSelected = activeMetric === mKey
            return (
              <button
                key={mKey}
                type="button"
                className={`hero-metric-tab-pill${isSelected ? ' active' : ''}`}
                onClick={() => setActiveMetric(mKey)}
                style={{
                  '--pill-accent': m.color,
                }}
              >
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Performance Metric Header & Sparkline */}
        <div className="hero-perf-graph-card">
          <div className="hero-perf-header">
            <div className="hero-perf-title-wrap">
              <span className="hero-perf-live-dot" style={{ backgroundColor: metricMeta.color, boxShadow: `0 0 8px ${metricMeta.color}` }} />
              <span className="hero-perf-title">{metricMeta.label} Trend</span>
            </div>

            <div className="hero-perf-badges-group">
              {trendInfo.hasHistory && (
                <span
                  className={`hero-trend-dir-badge dir-${trendInfo.direction}`}
                  title={`${trendInfo.label} over recorded practice sessions`}
                >
                  {trendInfo.symbol} {trendInfo.delta}%
                </span>
              )}
              <span
                className="hero-perf-stat-pill"
                style={{
                  color: metricMeta.color,
                  borderColor: `${metricMeta.color}40`,
                  backgroundColor: `${metricMeta.color}15`,
                }}
              >
                {currentMetricValue}% {metricMeta.shortLabel}
              </span>
            </div>
          </div>

          {/* Real-Time Historical Sparkline Graph or Minimal Baseline */}
          <div className="hero-perf-svg-wrap">
            {sparkline ? (
              <svg viewBox="0 0 210 34" preserveAspectRatio="none" className="hero-perf-svg">
                <defs>
                  <linearGradient id="heroMetricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricMeta.color} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={metricMeta.color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparkline.area} fill="url(#heroMetricGrad)" />
                <path d={sparkline.path} fill="none" stroke={metricMeta.color} strokeWidth="2.2" strokeLinecap="round" />
                <circle
                  cx={sparkline.lastPoint.x}
                  cy={sparkline.lastPoint.y}
                  r="3"
                  fill="#FFFFFF"
                  stroke={metricMeta.color}
                  strokeWidth="2"
                />
              </svg>
            ) : (
              <div className="hero-perf-empty-trend">
                <svg viewBox="0 0 210 24" preserveAspectRatio="none" className="hero-perf-svg-placeholder">
                  <line
                    x1="4"
                    y1="12"
                    x2="206"
                    y2="12"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <circle cx="202" cy="12" r="2.5" fill="rgba(255, 255, 255, 0.3)" />
                </svg>
                <span className="hero-placeholder-label">Practice to unlock trend</span>
              </div>
            )}
          </div>
        </div>

        {/* Small Chip UI: Chapters, MCQs, Notes, Flashcards */}
        <div className="hero-pro-chips-row">
          <div className="hero-pro-chip" title={`${chapterCount} Total Chapters`}>
            <span className="hero-pro-chip-icon chapters-icon">
              <AppIcon name="chapters" size={11} />
            </span>
            <span className="hero-pro-chip-text">
              <strong>{chapterCount}</strong> Chapters
            </span>
          </div>

          <div className="hero-pro-chip" title={`${totalMcqCount} MCQs in Pool`}>
            <span className="hero-pro-chip-icon mcqs-icon">
              <AppIcon name="mcqs" size={11} />
            </span>
            <span className="hero-pro-chip-text">
              <strong>{formatInteger(totalMcqCount)}</strong> MCQs
            </span>
          </div>

          <div className="hero-pro-chip" title={`${notesCount} Study Notes`}>
            <span className="hero-pro-chip-icon notes-icon">
              <AppIcon name="notesTab" size={11} />
            </span>
            <span className="hero-pro-chip-text">
              <strong>{notesCount}</strong> Notes
            </span>
          </div>

          {flashCount > 0 && (
            <div className="hero-pro-chip" title={`${flashCount} Flashcards`}>
              <span className="hero-pro-chip-icon flash-icon">
                <AppIcon name="flashcardsTab" size={11} />
              </span>
              <span className="hero-pro-chip-text">
                <strong>{flashCount}</strong> Cards
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Divider Line ────────────────────────────────────────────── */}
      <div className="hero-ring-divider" aria-hidden="true" />

      {/* ── Right Side: Concentric Ring Graph (Synced with Selected Metric) ── */}
      <div className="hero-ring-zone" title={`Multi-Layer Ring: Focusing on ${metricMeta.label}`}>
        <ConcentricRingGraph
          size={94}
          focusMetric={activeMetric}
          readinessPercent={readinessPercent}
          coveragePercent={coveragePercent}
          masteryPercent={masteryPercent}
          accuracyPercent={accuracyPercent}
          showLegend
          colors={{
            readiness: '#F1621B',
            coverage: '#FFFFFF',
            mastery: '#FBBF24',
            accuracy: '#34D399',
            track: 'rgba(255, 255, 255, 0.18)',
          }}
        />
      </div>
    </section>
  )
}

export default SubjectHero