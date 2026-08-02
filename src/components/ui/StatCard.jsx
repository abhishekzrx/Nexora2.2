/**
 * StatCard
 * Reusable stat display with icon, value, and label.
 */
function StatCard({ icon, value, label, sub, iconClass = '', className = '' }) {
  return (
    <div className={`stat-card${className ? ` ${className}` : ''}`}>
      {icon ? <div className={`stat-card-icon ${iconClass}`}>{icon}</div> : null}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub ? <div className="stat-card-sub">{sub}</div> : null}
    </div>
  )
}

export default StatCard