/**
 * SideDrawer
 * Reusable slide-in drawer with profile header, grouped menu,
 * and optional logout footer. Fully controlled by parent.
 * Items may include `disabled: true` to render a muted, non-interactive row.
 */
import AppIcon from '../ui/AppIcon'

function SideDrawer({
  open,
  onClose,
  onLogout,
  profile,
  sections,
  onItemClick,
}) {
  const handleItemClick = (item) => {
    if (item.disabled) return
    onItemClick?.(item)
  }

  return (
    <>
      <div
        className={`drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />

      <aside className={`side-drawer${open ? ' open' : ''}`}>
        {profile ? (
          <div className="drawer-profile">
            <button
              type="button"
              className="drawer-close"
              onClick={onClose}
              aria-label="Close menu"
            >
              <AppIcon name="close" size={18} />
            </button>
            {profile.name ? <div className="drawer-name">{profile.name}</div> : null}
            {profile.sub ? <div className="drawer-sub">{profile.sub}</div> : null}
            {profile.streak ? (
              <div className="drawer-streak">
                <AppIcon name="streak" size={14} />
                {profile.streak}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="drawer-menu">
          {sections.map((section) => (
            <div key={section.label}>
              {section.label ? <div className="drawer-section-label">{section.label}</div> : null}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`drawer-item${item.active ? ' active' : ''}${item.disabled ? ' disabled' : ''}`}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                >
                  <span className="d-icon" aria-hidden="true">
                    <AppIcon name={item.icon} size={18} />
                  </span>
                  {item.label}
                  {item.badge ? <span className="d-badge">{item.badge}</span> : null}
                  {item.active ? <span className="d-badge d-dot" /> : null}
                </button>
              ))}
            </div>
          ))}
        </div>

        {onLogout ? (
          <div className="drawer-footer">
            <button type="button" className="drawer-logout" onClick={onLogout}>
              <span className="d-icon" aria-hidden="true">
                <AppIcon name="logout" size={18} />
              </span>
              Log Out
            </button>
          </div>
        ) : null}
      </aside>
    </>
  )
}

export default SideDrawer