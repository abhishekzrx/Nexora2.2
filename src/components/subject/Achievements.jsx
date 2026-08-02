/**
 * Achievements
 * Reusable horizontal scroll of achievement badges.
 */
import AppIcon from '../ui/AppIcon'

function Achievements({ items = [] }) {
  return (
    <div>
      <div className="chart-title" style={{ marginBottom: 12 }}>Achievements Unlocked</div>
      <div className="achievements">
        {items.map((badge) => (
          <div className="achievement-badge" key={badge.name}>
            <div className="achievement-icon">
              <AppIcon name={badge.icon} size={24} />
            </div>
            <div className="achievement-name">{badge.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Achievements