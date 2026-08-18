/**
 * CoverageLegendCard
 * Informational card explaining coverage levels + Aggregate Overall Subject Coverage.
 */
import AppIcon from '../ui/AppIcon'
import { COVERAGE_LEVELS } from '../../services/mcqAnalyticsService'

function CoverageLegendCard({ subject }) {
  const chapters = subject?.chapters || []

  // Calculate total MCQs and completed/attempted MCQs across all chapters
  const totalMcqs = chapters.reduce((sum, ch) => sum + (typeof ch.mcqs === 'number' ? ch.mcqs : ch.mcqCount || 0), 0)
  const completedMcqs = chapters.reduce((sum, ch) => sum + (typeof ch.attempted === 'number' ? ch.attempted : ch.completedMcqs || 0), 0)

  // Overall aggregate coverage percentage taking all chapters MCQs as 100%
  const overallPct = totalMcqs > 0 ? Math.min(100, Math.round((completedMcqs / totalMcqs) * 100)) : 0

  return (
    <div className="coverage-legend-card">
      {/* 1. Aggregate Coverage of All Chapters (Taking 100% total MCQs) */}
      <div className="aggregate-coverage-section">
        <div className="agg-header-row">
          <div className="agg-title-wrap">
            <AppIcon name="target" size={16} className="agg-icon" />
            <div>
              <h4 className="agg-title">Overall Subject Coverage</h4>
              <p className="agg-sub">All {chapters.length || 0} chapters combined (100% question pool)</p>
            </div>
          </div>
          <span className="agg-pct-badge">{overallPct}% Covered</span>
        </div>

        {/* Overall Aggregate Progress Bar */}
        <div className="agg-progress-wrapper">
          <div className="agg-progress-track">
            <div
              className="agg-progress-fill"
              style={{
                width: `${overallPct}%`,
                background: overallPct >= 75 ? '#12B76A' : overallPct >= 50 ? '#2E5CE6' : overallPct >= 25 ? '#F1621B' : '#F04438',
              }}
            />
          </div>
          <div className="agg-progress-meta">
            <span><strong>{completedMcqs}</strong> / {totalMcqs} MCQs Completed</span>
            <span>{Math.max(0, totalMcqs - completedMcqs)} MCQs Remaining</span>
          </div>
        </div>
      </div>

      <div className="legend-divider" />

      {/* 2. Question Coverage Tiers Guide */}
      <div className="coverage-legend-header">
        <div className="coverage-legend-title-wrap">
          <div className="coverage-legend-icon" aria-hidden="true">
            <AppIcon name="analyticsTab" size={15} />
          </div>
          <div>
            <h4 className="coverage-legend-title">Question Coverage Tiers</h4>
            <p className="coverage-legend-sub">Chapter progress indicators guide</p>
          </div>
        </div>
        <span className="coverage-legend-badge">4 Tiers</span>
      </div>

      <div className="coverage-legend-grid">
        {COVERAGE_LEVELS.map((lvl) => (
          <div key={lvl.level} className="coverage-legend-item">
            <div className="coverage-legend-left">
              <span
                className="coverage-legend-dot"
                style={{ backgroundColor: lvl.color, boxShadow: `0 0 6px ${lvl.color}40` }}
              />
              <span className="coverage-legend-range" style={{ color: lvl.color, background: lvl.bg }}>
                {lvl.rangeLabel}
              </span>
            </div>
            <span className="coverage-legend-label">{lvl.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CoverageLegendCard
