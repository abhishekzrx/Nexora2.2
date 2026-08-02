/**
 * SideDrawer
 * Shared navigation drawer with profile header, menu sections, and footer.
 * Props:
 * - open: boolean
 * - onClose: function
 * - profile: { name, sub, streak, avatar }
 * - sections: array of { label, items: [{ icon, label, badge, active }] }
 * - onItemClick: function(item)
 */
function SideDrawer({ open = false, onClose, profile, sections = [], onItemClick }) {
  return (
    <>
      <div
        className={`drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`side-drawer${open ? ' open' : ''}`}>
        <div className="drawer-profile">
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
          <div className="drawer-avatar" aria-hidden="true">
            {profile?.avatar || '🧑‍💼'}
          </div>
          <div className="drawer-name">{profile?.name || 'User'}</div>
          <div className="drawer-sub">{profile?.sub}</div>
          {profile?.streak ? <div className="drawer-streak">🔥 {profile.streak}</div> : null}
        </div>

        <div className="drawer-menu">
          {sections.map((section, sectionIndex) => (
            <div key={section.label || `section-${sectionIndex}`}>
              {sectionIndex > 0 ? <div className="drawer-divider" /> : null}
              {section.label ? <div className="drawer-section-label">{section.label}</div> : null}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`drawer-item${item.active ? ' active' : ''}`}
                  onClick={() => onItemClick?.(item)}
                >
                  <span className="d-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge ? <span className="d-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="drawer-footer">
          <button type="button" className="drawer-logout" onClick={() => onItemClick?.({ label: 'Log Out' })}>
            <span className="d-icon" aria-hidden="true">
              ↪
            </span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  )
}

export default SideDrawer