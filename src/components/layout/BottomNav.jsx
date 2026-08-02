/**
 * BottomNav
 * Shared bottom navigation bar with optional center action button.
 * Items: array of { icon, label, active, center }
 */
function BottomNav({ items = [], onNavigate, centerIcon = '🎯', centerDark = false }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        if (item.center) {
          return (
            <button
              key={item.label || 'center'}
              type="button"
              className={`nav-center${centerDark ? ' nav-center-dark' : ''}`}
              aria-label={item.label || 'Center action'}
              onClick={() => onNavigate?.(item)}
            >
              {item.icon || centerIcon}
            </button>
          )
        }

        return (
          <button
            key={item.label}
            type="button"
            className={`nav-item${item.active ? ' active' : ''}`}
            onClick={() => onNavigate?.(item)}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav