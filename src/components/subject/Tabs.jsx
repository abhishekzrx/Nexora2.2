/**
 * Tabs
 * Reusable tab navigation with icon + label + underline indicator.
 */
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
              {item.icon}
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