/**
 * StatGrid
 * Reusable 2-column grid of metric cards with optional streak card.
 */
import AppIcon from '../ui/AppIcon'

function StatGrid({ metrics = [], streakIndex = -1 }) {
  return (
    <div className="analytics-grid">
      {metrics.map((metric, index) => {
        if (index === streakIndex) {
          return (
            <div key={metric.label} className="streak-card">
              <div className="streak-icon">
                <AppIcon name="streak" size={14} />
              </div>
              <div className="streak-value">{metric.value}</div>
              <div className="streak-label">{metric.label}</div>
            </div>
          )
        }

        return (
          <div key={metric.label} className="metric-card">
            <div className="metric-value">{metric.value}</div>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-subtitle">{metric.subtitle}</div>
          </div>
        )
      })}
    </div>
  )
}

export default StatGrid