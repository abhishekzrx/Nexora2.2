/**
 * Tabs
 * Reusable tab navigation with icon + label + underline indicator.
 * Optimized compact styling with refined icon and typography.
 */
import AppIcon from '../ui/AppIcon'

function Tabs({ items = [], activeKey, onChange }) {
  return (
    <div className="tabs-card">
      {items.map((item) => {
        const isActive = activeKey === item.key
        return (
          <button
            key={item.key}
            type="button"
            className={`tab${isActive ? ' active' : ''}`}
            onClick={() => onChange?.(item.key)}
          >
            <span className="tab-icon" aria-hidden="true">
              <AppIcon name={item.icon} size={16} />
            </span>
            <span className="tab-label">{item.label}</span>
            {isActive ? <span className="tab-underline" /> : null}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs