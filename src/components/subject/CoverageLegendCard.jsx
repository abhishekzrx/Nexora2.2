/**
 * CoverageLegendCard
 * Informational card displayed at the end of the chapter list
 * explaining the 4-color circular indicator coverage levels.
 */
import AppIcon from '../ui/AppIcon'
import { COVERAGE_LEVELS } from '../../services/mcqAnalyticsService'

function CoverageLegendCard() {
  return (
    <div className="coverage-legend-card">
      <div className="coverage-legend-header">
        <div className="coverage-legend-icon" aria-hidden="true">
          <AppIcon name="analyticsTab" size={14} />
        </div>
        <span className="coverage-legend-title">Question Coverage</span>
      </div>
      <div className="coverage-legend-grid">
        {COVERAGE_LEVELS.map((lvl) => (
          <div key={lvl.level} className="coverage-legend-item">
            <span
              className="coverage-legend-dot"
              style={{ backgroundColor: lvl.color }}
            />
            <span className="coverage-legend-range">{lvl.rangeLabel}</span>
            <span className="coverage-legend-label">{lvl.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CoverageLegendCard
