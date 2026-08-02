/**
 * AccuracyChart
 * Reusable bar chart for accuracy trend (last 7 days).
 */
function AccuracyChart({ days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values = [] }) {
  return (
    <div className="chart-section">
      <div className="chart-title">Accuracy Trend (Last 7 days)</div>
      <div className="chart-container">
        <div className="mini-chart">
          {days.map((day, index) => (
            <div className="chart-bar" key={day} style={{ height: `${values[index] || 0}%` }}>
              <span className="chart-label">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AccuracyChart