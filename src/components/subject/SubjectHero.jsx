import { useMemo } from 'react'
import ConcentricRingGraph from '../ui/ConcentricRingGraph'
import AppIcon from '../ui/AppIcon'
import { formatInteger } from '../../services/mcqAnalyticsService'

function generateSmoothPath(points, width = 200, height = 36, padding = 4) {
  if (!points || points.length === 0) {
    points = [40, 55, 50, 68, 75, 82, 88]
  }
  
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = (max - min) === 0 ? 1 : (max - min)
  
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
  const counts = subject?.counts || {}
  const chapters = subject?.chapters || []
  const chapterCount = counts.chapters ?? chapters.length

  // Dynamically sum the exact count of MCQs present across all chapters of this subject
  const totalMcqCount = chapters.reduce((sum, ch) => sum + (Number(ch.totalMcqs || ch.mcqs || 0) || 0), 0)
  const attemptedMcqCount = subject?.attemptedMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.attemptedMcqs || 0) || 0), 0)
  const masteredMcqCount = subject?.masteredMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.masteredMcqs || 0) || 0), 0)
  const flashCount = counts.flashcards ?? 0
  const notesCount = counts.notes ?? chapterCount ?? 0

  const coveragePercent = subject?.coveragePercent ?? (totalMcqCount > 0 ? Math.round((attemptedMcqCount / totalMcqCount) * 100) : 0)
  const masteryPercent = subject?.masteryPercent ?? (attemptedMcqCount > 0 ? Math.round((masteredMcqCount / attemptedMcqCount) * 100) : 0)
  const accuracyPercent = subject?.accuracyPercent ?? subject?.accuracy ?? (masteryPercent > 0 ? masteryPercent : 78)

  // Generate trend points from chapters or accuracy progression
  const trendPoints = useMemo(() => {
    if (chapters.length >= 3) {
      const pts = chapters.map((c) => Number(c.progress || c.accuracyPercent || 50))
      return pts.length > 7 ? pts.slice(-7) : pts
    }
    const base = accuracyPercent || 65
    return [
      Math.max(10, base - 18),
      Math.max(15, base - 10),
      Math.max(20, base - 12),
      Math.max(25, base + 4),
      Math.max(30, base - 2),
      Math.max(35, base + 8),
      base,
    ]
  }, [chapters, accuracyPercent])

  const sparkline = useMemo(() => generateSmoothPath(trendPoints, 200, 34, 3), [trendPoints])

  return (
    <section className="hero-card compact-hero hero-pro-theme">
      {/* ── Left Side: Performance Line Graph & Info Chips ────────── */}
      <div className="hero-main-content">
        {/* Performance Line Graph Container */}
        <div className="hero-perf-graph-card">
          <div className="hero-perf-header">
            <div className="hero-perf-title-wrap">
              <span className="hero-perf-live-dot" />
              <span className="hero-perf-title">Performance Trend</span>
            </div>
            <span className="hero-perf-stat-pill">
              {accuracyPercent}% Acc.
            </span>
          </div>

          <div className="hero-perf-svg-wrap">
            <svg viewBox="0 0 200 34" preserveAspectRatio="none" className="hero-perf-svg">
              <defs>
                <linearGradient id="heroPerfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={sparkline.area} fill="url(#heroPerfGrad)" />
              <path d={sparkline.path} fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
              <circle
                cx={sparkline.lastPoint.x}
                cy={sparkline.lastPoint.y}
                r="3"
                fill="#FFFFFF"
                stroke="#0284C7"
                strokeWidth="1.5"
              />
            </svg>
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

          <div className="hero-pro-chip" title={`${totalMcqCount} MCQs Available`}>
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

      {/* ── Right Side: Concentric Ring Coverage Graph ──────────────── */}
      <div className="hero-ring-zone" title="Multi-Layer Ring: Outer=Coverage, Middle=Mastery, Inner=Accuracy">
        <ConcentricRingGraph
          size={90}
          coveragePercent={coveragePercent}
          masteryPercent={masteryPercent}
          accuracyPercent={accuracyPercent}
          showLegend
          colors={{
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