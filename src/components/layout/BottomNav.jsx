/**
 * BottomNav
 * Shared bottom navigation bar with optional center action button.
 * Items: array of { icon, label, active, center, disabled }
 * icon: semantic icon name from the icon registry.
 * disabled: renders a non-interactive item with a muted style.
 */
import AppIcon from '../ui/AppIcon'

function BottomNav({ items = [], onNavigate, centerIcon = 'practice', centerDark = false }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        if (item.center) {
          return (
            <button
              key={item.label || 'center'}
              type="button"
              className={`nav-center${centerDark ? ' nav-center-dark' : ''}${item.disabled ? ' disabled' : ''}`}
              aria-label={item.label || 'Center action'}
              disabled={item.disabled}
              onClick={() => onNavigate?.(item)}
            >
              <AppIcon name={item.icon || centerIcon} size={22} />
            </button>
          )
        }

        return (
          <button
            key={item.label}
            type="button"
            className={`nav-item${item.active ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
            onClick={() => onNavigate?.(item)}
            aria-current={item.active ? 'page' : undefined}
            disabled={item.disabled}
          >
            <span className="nav-icon" aria-hidden="true">
              <AppIcon name={item.icon} size={19} />
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav