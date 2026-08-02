/**
 * Achievements
 * Reusable horizontal scroll of achievement badges.
 */
function Achievements({ items = [] }) {
  return (
    <div>
      <div className="chart-title" style={{ marginBottom: 12 }}>Achievements Unlocked</div>
      <div className="achievements">
        {items.map((badge) => (
          <div className="achievement-badge" key={badge.name}>
            <div className="achievement-icon">{badge.icon}</div>
            <div className="achievement-name">{badge.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Achievements