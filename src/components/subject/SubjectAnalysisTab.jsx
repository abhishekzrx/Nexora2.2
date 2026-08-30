/**
 * SubjectAnalysisTab.jsx
 * Dedicated 6-Section Performance Intelligence Tab for Subject Detail Page.
 *
 * Implements Phase 3 Requirements:
 * - SECTION A: Subject Performance Snapshot with Embedded Mini Area Line Charts per Metric Card.
 * - SECTION B: Interactive Performance Line Graph (Dynamic Chapter Curve & Historical Timeline).
 * - SECTION C: Chapter Comparison Ranking (Priority, Accuracy, Coverage, Readiness, Trend).
 * - SECTION D: 🟢 Strong Chapters (Validated high mastery & coverage).
 * - SECTION E: 🔴 Needs Attention / Weak Chapters (Identified diagnostic root causes).
 * - SECTION F: 🔥 Immediate Focus (High Priority + Low Performance urgent intervention).
 */

import { useState, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import { METRIC_TYPES, METRIC_META } from '../../config/performanceConfig'
import { getSubjectSnapshots, calculateTrendDirection } from '../../services/trendService'
import { formatPriority } from '../../data/bpscPrelimsChapters'

function generateDetailedGraphPath(points, width = 360, height = 110, padding = 14) {
  if (!points || points.length === 0) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min === 0 ? 1 : max - min

  const coords = points.map((val, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y, val }
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

  return { path: d, area, coords }
}

function MiniMetricSparkline({ points = [], color = '#F1621B', height = 20, width = 120 }) {
  const data = points && points.length > 0 ? points : [0, 0, 0, 0, 0]
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min === 0 ? 1 : max - min

  const coords = data.map((val, idx) => {
    const x = 2 + (idx / Math.max(1, data.length - 1)) * (width - 4)
    const y = height - 3 - ((val - min) / range) * (height - 6)
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
  const area = `${d} L ${last.x} ${height} L ${coords[0].x} ${height} Z`
  const gradId = `miniSpark_${color.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <div className="mini-sparkline-container" style={{ width: '100%', height, marginTop: '2px', marginBottom: '2px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx={last.x} cy={last.y} r="2" fill="#FFFFFF" stroke={color} strokeWidth="1.2" />
      </svg>
    </div>
  )
}

export default function SubjectAnalysisTab({ subject, onChapterClick, onStartPractice }) {
  const [selectedMetric, setSelectedMetric] = useState(METRIC_TYPES.READINESS)
  const [selectedTimeframe, setSelectedTimeframe] = useState('all')
  const [activeHoverNode, setActiveHoverNode] = useState(null)

  const subjectId = subject?.id || subject?.subjectId || subject?.subjectKey
  const chapters = subject?.chapters || []

  // Metrics from subject intelligence
  const accuracy = Math.round(Number(subject?.accuracyPercent ?? subject?.accuracy ?? 0))
  const coverage = Math.round(Number(subject?.coveragePercent ?? subject?.coverage ?? 0))
  const mastery = Math.round(Number(subject?.masteryPercent ?? subject?.mastery ?? 0))
  const readiness = Math.round(Number(subject?.readinessScore ?? subject?.readiness ?? subject?.progress ?? 0))

  // Retrieve snapshots for selected timeframe
  const rawSnapshots = useMemo(() => {
    return subjectId ? getSubjectSnapshots(subjectId, selectedTimeframe) : []
  }, [subjectId, selectedTimeframe])

  // Trend directions for all 4 primary metrics
  const accuracyTrend = useMemo(() => calculateTrendDirection(rawSnapshots, METRIC_TYPES.ACCURACY), [rawSnapshots])
  const coverageTrend = useMemo(() => calculateTrendDirection(rawSnapshots, METRIC_TYPES.COVERAGE), [rawSnapshots])
  const masteryTrend = useMemo(() => calculateTrendDirection(rawSnapshots, METRIC_TYPES.MASTERY), [rawSnapshots])
  const readinessTrend = useMemo(() => calculateTrendDirection(rawSnapshots, METRIC_TYPES.READINESS), [rawSnapshots])

  // Mini sparkline data arrays across chapters
  const readinessChapterCurve = useMemo(() => {
    if (!chapters.length) return [0, 0, 0, 0]
    return chapters.map((c) => Number(c.readinessScore || 0))
  }, [chapters])

  const accuracyChapterCurve = useMemo(() => {
    if (!chapters.length) return [0, 0, 0, 0]
    return chapters.map((c) => Number(c.accuracyPercentage || c.accuracyPercent || 0))
  }, [chapters])

  const coverageChapterCurve = useMemo(() => {
    if (!chapters.length) return [0, 0, 0, 0]
    return chapters.map((c) => Number(c.coveragePercent || 0))
  }, [chapters])

  const masteryChapterCurve = useMemo(() => {
    if (!chapters.length) return [0, 0, 0, 0]
    return chapters.map((c) => Number(c.masteryPercentage || c.masteryPercent || 0))
  }, [chapters])

  // Primary chart data: uses timeline snapshots if available (>= 2 points), otherwise plots the chapter progression curve!
  const hasTimelineHistory = rawSnapshots && rawSnapshots.length >= 2

  const graphPoints = useMemo(() => {
    if (hasTimelineHistory) {
      return rawSnapshots.map((s) => Number(s[selectedMetric] || 0))
    }
    // Chapter progression curve fallback so graph is ALWAYS visual and informative
    switch (selectedMetric) {
      case METRIC_TYPES.ACCURACY:
        return accuracyChapterCurve
      case METRIC_TYPES.COVERAGE:
        return coverageChapterCurve
      case METRIC_TYPES.MASTERY:
        return masteryChapterCurve
      case METRIC_TYPES.READINESS:
      default:
        return readinessChapterCurve
    }
  }, [hasTimelineHistory, rawSnapshots, selectedMetric, accuracyChapterCurve, coverageChapterCurve, masteryChapterCurve, readinessChapterCurve])

  const graphPath = useMemo(() => {
    if (!graphPoints || graphPoints.length === 0) return null
    return generateDetailedGraphPath(graphPoints, 360, 110, 14)
  }, [graphPoints])

  const activeMeta = METRIC_META[selectedMetric] || METRIC_META[METRIC_TYPES.READINESS]

  // Chapters classifications
  const strongChapters = subject?.strongChapters || []
  const weakChapters = subject?.weakChapters || []
  const immediateFocusChapters = subject?.immediateFocusChapters || []
  const rankedChapters = subject?.rankedChapters || chapters

  // Strict numerical order (#1, #2, #3, ...) for Chapter Intelligence Comparison table
  const orderedChapters = useMemo(() => {
    const list = [...chapters]
    return list.sort((a, b) => {
      const numA = Number(a.number ?? a.num ?? a.chapter_number ?? 0)
      const numB = Number(b.number ?? b.num ?? b.chapter_number ?? 0)
      return numA - numB
    })
  }, [chapters])

  return (
    <div className="subject-analysis-container">
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION A: SUBJECT PERFORMANCE SNAPSHOT (WITH MINI LINE CHARTS)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="analysis-section-block">
        <div className="analysis-section-header">
          <div className="analysis-title-group">
            <AppIcon name="analyticsTab" size={17} style={{ color: '#F1621B' }} />
            <h3 className="analysis-section-title">Performance Snapshot</h3>
          </div>
          <span className="analysis-badge-sub">Unified Aggregate Intelligence</span>
        </div>

        <div className="snapshot-cards-grid">
          {/* Readiness Card */}
          <div
            className={`snapshot-card snapshot-readiness${selectedMetric === METRIC_TYPES.READINESS ? ' card-active-focus' : ''}`}
            onClick={() => setSelectedMetric(METRIC_TYPES.READINESS)}
            style={{ cursor: 'pointer' }}
          >
            <div className="snap-top">
              <span className="snap-label">Readiness</span>
              <span className={`snap-trend-chip dir-${readinessTrend.direction}`}>
                {readinessTrend.symbol} {readinessTrend.delta}%
              </span>
            </div>
            <div className="snap-value-row">
              <span className="snap-val" style={{ color: '#F1621B' }}>{readiness}%</span>
            </div>
            {/* Embedded Mini Area Line Chart */}
            <MiniMetricSparkline points={readinessChapterCurve} color="#F1621B" />
            <span className="snap-sub-desc">Overall Exam Preparedness</span>
          </div>

          {/* Accuracy Card */}
          <div
            className={`snapshot-card snapshot-accuracy${selectedMetric === METRIC_TYPES.ACCURACY ? ' card-active-focus' : ''}`}
            onClick={() => setSelectedMetric(METRIC_TYPES.ACCURACY)}
            style={{ cursor: 'pointer' }}
          >
            <div className="snap-top">
              <span className="snap-label">Accuracy</span>
              <span className={`snap-trend-chip dir-${accuracyTrend.direction}`}>
                {accuracyTrend.symbol} {accuracyTrend.delta}%
              </span>
            </div>
            <div className="snap-value-row">
              <span className="snap-val" style={{ color: '#10B981' }}>{accuracy}%</span>
            </div>
            {/* Embedded Mini Area Line Chart */}
            <MiniMetricSparkline points={accuracyChapterCurve} color="#10B981" />
            <span className="snap-sub-desc">Correct Responses Ratio</span>
          </div>

          {/* Coverage Card */}
          <div
            className={`snapshot-card snapshot-coverage${selectedMetric === METRIC_TYPES.COVERAGE ? ' card-active-focus' : ''}`}
            onClick={() => setSelectedMetric(METRIC_TYPES.COVERAGE)}
            style={{ cursor: 'pointer' }}
          >
            <div className="snap-top">
              <span className="snap-label">Coverage</span>
              <span className={`snap-trend-chip dir-${coverageTrend.direction}`}>
                {coverageTrend.symbol} {coverageTrend.delta}%
              </span>
            </div>
            <div className="snap-value-row">
              <span className="snap-val" style={{ color: '#38BDF8' }}>{coverage}%</span>
            </div>
            {/* Embedded Mini Area Line Chart */}
            <MiniMetricSparkline points={coverageChapterCurve} color="#38BDF8" />
            <span className="snap-sub-desc">Unique MCQs Attempted</span>
          </div>

          {/* Mastery Card */}
          <div
            className={`snapshot-card snapshot-mastery${selectedMetric === METRIC_TYPES.MASTERY ? ' card-active-focus' : ''}`}
            onClick={() => setSelectedMetric(METRIC_TYPES.MASTERY)}
            style={{ cursor: 'pointer' }}
          >
            <div className="snap-top">
              <span className="snap-label">Mastery</span>
              <span className={`snap-trend-chip dir-${masteryTrend.direction}`}>
                {masteryTrend.symbol} {masteryTrend.delta}%
              </span>
            </div>
            <div className="snap-value-row">
              <span className="snap-val" style={{ color: '#FBBF24' }}>{mastery}%</span>
            </div>
            {/* Embedded Mini Area Line Chart */}
            <MiniMetricSparkline points={masteryChapterCurve} color="#FBBF24" />
            <span className="snap-sub-desc">Retained Concepts</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION B: PERFORMANCE TRENDS GRAPH & FILTERS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="analysis-section-block">
        <div className="analysis-section-header">
          <div className="analysis-title-group">
            <AppIcon name="activity" size={17} style={{ color: activeMeta.color }} />
            <h3 className="analysis-section-title">
              {hasTimelineHistory ? 'Historical Performance Trends' : 'Chapter Performance Progression'}
            </h3>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="timeframe-filters-group">
            {['7d', '30d', 'all'].map((tf) => (
              <button
                key={tf}
                type="button"
                className={`timeframe-pill${selectedTimeframe === tf ? ' active' : ''}`}
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector Tab Row */}
        <div className="analysis-metric-tabs-row">
          {Object.values(METRIC_TYPES).map((mKey) => {
            const m = METRIC_META[mKey]
            const isSelected = selectedMetric === mKey
            return (
              <button
                key={mKey}
                type="button"
                className={`analysis-metric-btn${isSelected ? ' active' : ''}`}
                onClick={() => setSelectedMetric(mKey)}
                style={{
                  '--active-color': m.color,
                }}
              >
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Graph Visualizer */}
        <div className="analysis-trend-chart-card">
          <div className="chart-meta-header">
            <div>
              <span className="chart-meta-name">
                {activeMeta.label} {hasTimelineHistory ? 'Evolution' : 'Distribution Curve'}
              </span>
              <p className="chart-meta-desc">
                {hasTimelineHistory
                  ? activeMeta.description
                  : `Visualizing ${activeMeta.label.toLowerCase()} across all ${chapters.length} chapters in syllabus.`}
              </p>
            </div>
            <span
              className="chart-current-stat-tag"
              style={{
                color: activeMeta.color,
                borderColor: `${activeMeta.color}40`,
                backgroundColor: `${activeMeta.color}15`,
              }}
            >
              {selectedMetric === METRIC_TYPES.ACCURACY
                ? accuracy
                : selectedMetric === METRIC_TYPES.COVERAGE
                ? coverage
                : selectedMetric === METRIC_TYPES.MASTERY
                ? mastery
                : readiness}
              % Current
            </span>
          </div>

          <div className="chart-svg-container">
            {graphPath ? (
              <svg viewBox="0 0 360 110" preserveAspectRatio="none" className="analysis-main-svg">
                <defs>
                  <linearGradient id="analysisMetricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeMeta.color} stopOpacity="0.38" />
                    <stop offset="100%" stopColor={activeMeta.color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Background Grid Lines */}
                <line x1="14" y1="25" x2="346" y2="25" stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                <line x1="14" y1="55" x2="346" y2="55" stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                <line x1="14" y1="85" x2="346" y2="85" stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />

                {/* Area and Line */}
                <path d={graphPath.area} fill="url(#analysisMetricGrad)" />
                <path d={graphPath.path} fill="none" stroke={activeMeta.color} strokeWidth="2.5" strokeLinecap="round" />

                {/* Data Points */}
                {graphPath.coords.map((c, i) => {
                  const isHovered = activeHoverNode === i
                  const isLast = i === graphPath.coords.length - 1
                  const chObj = !hasTimelineHistory && chapters[i] ? chapters[i] : null

                  return (
                    <g key={i} onMouseEnter={() => setActiveHoverNode(i)} onMouseLeave={() => setActiveHoverNode(null)}>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isHovered ? '5.5' : isLast ? '4' : '2.8'}
                        fill={isLast || isHovered ? activeMeta.color : '#FFFFFF'}
                        stroke={activeMeta.color}
                        strokeWidth={isHovered ? '2.5' : '1.8'}
                        style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                      />
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.max(10, Math.min(310, c.x - 30))}
                            y={Math.max(4, c.y - 24)}
                            width="60"
                            height="18"
                            rx="4"
                            fill="#0F172A"
                          />
                          <text
                            x={Math.max(10, Math.min(310, c.x - 30)) + 30}
                            y={Math.max(4, c.y - 24) + 12}
                            fill="#FFFFFF"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {chObj ? `Ch.${chObj.num || i + 1}: ${Math.round(c.val)}%` : `${Math.round(c.val)}%`}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            ) : (
              <div className="analysis-empty-trend-box">
                <AppIcon name="sparkles" size={24} style={{ color: activeMeta.color, opacity: 0.8 }} />
                <span className="empty-trend-title">Continue practicing to unlock trend</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION F: HIGH PRIORITY + LOW PERFORMANCE (🔥 IMMEDIATE FOCUS)
          ═══════════════════════════════════════════════════════════════════ */}
      {immediateFocusChapters.length > 0 && (
        <div className="analysis-section-block section-immediate-focus">
          <div className="analysis-section-header">
            <div className="analysis-title-group">
              <span className="fire-icon-emoji">🔥</span>
              <h3 className="analysis-section-title" style={{ color: '#B42318' }}>
                Immediate Focus Required
              </h3>
            </div>
            <span className="urgent-badge-pill">High Exam Weightage</span>
          </div>

          <div className="focus-cards-stack">
            {immediateFocusChapters.map((ch) => {
              const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'VH')
              const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
              return (
                <div
                  key={ch.id || ch.num}
                  className="immediate-focus-card-single-row"
                  onClick={() => onChapterClick?.(ch)}
                >
                  <div className="focus-row-left">
                    <span className="focus-chap-num">Ch. {ch.number || ch.num}</span>
                    <span className="focus-chap-title" title={ch.title || ch.name}>
                      {ch.title || ch.name}
                    </span>
                    <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                  </div>

                  <div className="focus-row-right">
                    <span className="focus-readiness-val">
                      {Math.round(ch.readinessScore || 0)}% Ready
                    </span>
                    <button
                      type="button"
                      className="focus-action-btn-compact"
                      onClick={(e) => {
                        e.stopPropagation()
                        onChapterClick?.(ch)
                      }}
                    >
                      Practice →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION D & E: STRONG CHAPTERS & NEEDS ATTENTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="analysis-two-col-grid">
        {/* Strong Chapters */}
        <div className="analysis-card-box strong-box">
          <div className="box-header">
            <span className="box-dot green" />
            <h4 className="box-title">🟢 Strong Chapters</h4>
            <span className="box-count-tag">{strongChapters.length}</span>
          </div>

          {strongChapters.length > 0 ? (
            <div className="box-list">
              {strongChapters.map((ch) => {
                const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'M')
                const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                return (
                  <div key={ch.id || ch.num} className="box-item strong-item" onClick={() => onChapterClick?.(ch)}>
                    <div className="box-item-info">
                      <span className="item-check-icon">✓</span>
                      <span className="item-title">{ch.title || ch.name}</span>
                    </div>
                    <div className="box-item-stats">
                      <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                      <span className="item-pct green">{Math.round(ch.readinessScore || 0)}% Ready</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="box-empty-state">
              <span>Continue practicing to build your strong chapter portfolio.</span>
            </div>
          )}
        </div>

        {/* Weak Chapters / Needs Attention */}
        <div className="analysis-card-box weak-box">
          <div className="box-header">
            <span className="box-dot red" />
            <h4 className="box-title">🔴 Needs Attention</h4>
            <span className="box-count-tag">{weakChapters.length}</span>
          </div>

          {weakChapters.length > 0 ? (
            <div className="box-list">
              {weakChapters.map((ch) => {
                const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'M')
                const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                return (
                  <div key={ch.id || ch.num} className="box-item weak-item" onClick={() => onChapterClick?.(ch)}>
                    <div className="box-item-info">
                      <span className="item-cross-icon">✕</span>
                      <div>
                        <span className="item-title">{ch.title || ch.name}</span>
                        <span className="item-diagnosis">{ch.weaknessReason}</span>
                      </div>
                    </div>
                    <div className="box-item-stats">
                      <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                      <span className="item-pct red">{Math.round(ch.readinessScore || 0)}% Ready</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="box-empty-state">
              <span>No severe weaknesses detected in practiced chapters.</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION C: CHAPTER COMPARISON TABLE (NUMERICAL ORDER & MIN HEIGHT)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="analysis-section-block section-comparison-table">
        <div className="analysis-section-header">
          <div className="analysis-title-group">
            <AppIcon name="chapters" size={17} style={{ color: '#2E5CE6' }} />
            <h3 className="analysis-section-title">Chapter Intelligence Comparison</h3>
          </div>
          <span className="analysis-badge-sub">{chapters.length} Chapters Total</span>
        </div>

        <div className="comparison-table-card">
          <div className="comparison-table-header">
            <span className="col-chap">Chapter</span>
            <span className="col-prio">Priority</span>
            <span className="col-num">Accuracy</span>
            <span className="col-num">Coverage</span>
            <span className="col-num">Readiness</span>
            <span className="col-trend">Trend</span>
          </div>

          <div className="comparison-table-rows">
            {orderedChapters.map((ch) => {
              const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'M')
              const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

              return (
                <div
                  key={ch.id || ch.num}
                  className="comparison-table-row"
                  onClick={() => onChapterClick?.(ch)}
                >
                  <div className="col-chap">
                    <span className="comp-num">#{ch.number || ch.num}</span>
                    <span className="comp-title" title={ch.title || ch.name}>
                      {ch.title || ch.name}
                    </span>
                  </div>

                  <div className="col-prio">
                    <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                  </div>

                  <div className="col-num">
                    <span className="comp-val">{Math.round(ch.accuracyPercentage || ch.accuracyPercent || 0)}%</span>
                  </div>

                  <div className="col-num">
                    <span className="comp-val">{Math.round(ch.coveragePercent || 0)}%</span>
                  </div>

                  <div className="col-num">
                    <span className="comp-val readiness-val">
                      {Math.round(ch.readinessScore || 0)}%
                    </span>
                  </div>

                  <div className="col-trend">
                    <span className={`comp-trend-chip dir-${ch.trendDirection || 'stable'}`}>
                      {ch.trendSymbol || '→'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
