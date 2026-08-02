/**
 * StudyStats
 * Reusable 2-column grid of study statistics boxes.
 */
function StudyStats({ items = [] }) {
  return (
    <div className="study-stats">
      {items.map((item) => (
        <div className="stat-box" key={item.label}>
          <div className="stat-box-value">{item.value}</div>
          <div className="stat-box-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export default StudyStats