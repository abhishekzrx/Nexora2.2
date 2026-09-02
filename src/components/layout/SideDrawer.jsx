/**
 * SideDrawer
 * Reusable slide-in drawer with profile header, grouped menu,
 * and optional logout footer. Fully controlled by parent.
 * Automatically respects Super Admin privileges and Warrior identity.
 */
import AppIcon from '../ui/AppIcon'
import '../../styles/sideDrawer.css'
import { useRoleStore, switchToAdmin, switchToStudent } from '../../data/roleStore'
import { useMemberStore } from '../../data/memberStore'

function SideDrawer({
  open,
  onClose,
  onLogout,
  profile,
  sections,
  onItemClick,
  onSwitchMode,
}) {
  const { isAdmin } = useRoleStore()
  const { isSuperAdmin, isViewingAs } = useMemberStore()

  const handleItemClick = (item) => {
    if (item.disabled) return
    onItemClick?.(item)
  }

  const handleToggleMode = () => {
    onClose?.()
    if (isAdmin) {
      switchToStudent()
      onSwitchMode?.('student')
    } else {
      switchToAdmin()
      onSwitchMode?.('admin')
    }
  }

  // Filter out Admin link if not Super Admin
  const filteredSections = (sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).filter((item) => {
      if (item.label === 'Admin' || item.icon === 'adminDashboard') {
        return isSuperAdmin && !isViewingAs
      }
      return true
    }),
  }))

  return (
    <>
      <div
        className={`drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />

      <aside className={`side-drawer${open ? ' open' : ''}`}>
        {profile ? (
          <div className="drawer-profile">
            <div className="drawer-profile-glow" aria-hidden="true" />
            <button
              type="button"
              className="drawer-close"
              onClick={onClose}
              aria-label="Close menu"
            >
              <AppIcon name="close" size={16} />
            </button>
            {profile.name ? <div className="drawer-name">{profile.name}</div> : null}
            {profile.warrior ? (
              <div className="drawer-warrior-badge">
                <span>⚔️</span>
                <span>{profile.warrior}</span>
              </div>
            ) : null}
            {profile.sub ? (
              <div className="drawer-sub">
                <span>📚</span>
                <span>{profile.sub}</span>
              </div>
            ) : null}
            {profile.streak ? (
              <div className="drawer-streak">
                <AppIcon name="streak" size={13} />
                <span>{profile.streak}</span>
              </div>
            ) : null}

            {/* Quick Mode Switcher ONLY for Super Admin */}
            {isSuperAdmin && !isViewingAs && (
              <div className="drawer-mode-switch-card">
                <div className="mode-switch-left">
                  <span className="mode-role-icon">{isAdmin ? '⚡' : '👑'}</span>
                  <div className="mode-role-text">
                    <span className="mode-role-title">{isAdmin ? 'Admin Studio' : 'Super Admin'}</span>
                    <span className="mode-role-sub">{isAdmin ? 'Content & Syllabus CMS' : 'Student View Active'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mode-switch-btn"
                  onClick={handleToggleMode}
                  title={isAdmin ? 'Switch to Student Learning' : 'Switch to Admin Studio'}
                >
                  {isAdmin ? 'Student Mode ➔' : 'Admin Mode ➔'}
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className="drawer-menu">
          {filteredSections.map((section) => (
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
                </button>
              ))}
              <div className="drawer-divider" />
            </div>
          ))}
        </div>

        <div className="drawer-footer">
          <button type="button" className="drawer-logout" onClick={onLogout}>
            <span className="d-icon" aria-hidden="true">
              <AppIcon name="logout" size={18} />
            </span>
            Log Out
          </button>
        </div>
      </aside>
    </>
  )
}

export default SideDrawer