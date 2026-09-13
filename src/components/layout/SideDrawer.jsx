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

  // Filter out Admin links if not Super Admin & add Member Management for Super Admin
  const filteredSections = (sections || []).map((sec) => {
    let items = (sec.items || []).filter((item) => {
      if (item.label === 'Admin' || item.icon === 'adminDashboard') {
        return isSuperAdmin && !isViewingAs
      }
      return true
    })

    if (sec.label === 'SYSTEM' && isSuperAdmin && !isViewingAs) {
      const hasMembers = items.some((it) => it.label === 'Member Management' || it.key === 'members')
      if (!hasMembers) {
        const adminIndex = items.findIndex((it) => it.label === 'Admin')
        const memberItem = { icon: 'profile', label: 'Member Management', key: 'members' }
        if (adminIndex !== -1) {
          items = [
            ...items.slice(0, adminIndex + 1),
            memberItem,
            ...items.slice(adminIndex + 1),
          ]
        } else {
          items = [memberItem, ...items]
        }
      }
    }

    return {
      ...sec,
      items,
    }
  })

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
            
            {/* Top User Info Bar */}
            <div className="drawer-profile-header">
              <div className="drawer-avatar-wrap">
                <div className="drawer-avatar">
                  {isSuperAdmin ? '👑' : (profile.name ? profile.name.charAt(0).toUpperCase() : '⚡')}
                </div>
                <div className="drawer-avatar-status" title="Active" />
              </div>

              <div className="drawer-user-info">
                <div className="drawer-name">{profile.name || 'Scholar'}</div>
                <div className="drawer-role-tag">
                  {isSuperAdmin ? (isAdmin ? 'Admin Console' : 'Super Admin') : 'Nexora Warrior'}
                </div>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={onClose}
                aria-label="Close menu"
              >
                <AppIcon name="close" size={15} />
              </button>
            </div>

            {/* Badges / Status Chips Row */}
            <div className="drawer-chips-wrap">
              {profile.warrior ? (
                <div className="drawer-chip drawer-chip-warrior">
                  <span className="drawer-chip-icon">⚔️</span>
                  <span>{profile.warrior}</span>
                </div>
              ) : null}

              {profile.sub ? (
                <div className="drawer-chip drawer-chip-sub">
                  <span className="drawer-chip-icon">📚</span>
                  <span>{profile.sub}</span>
                </div>
              ) : null}

              {profile.streak ? (
                <div className="drawer-chip drawer-chip-streak">
                  <span className="drawer-chip-icon">🔥</span>
                  <span>{profile.streak}</span>
                </div>
              ) : null}
            </div>

            {/* Quick Mode Switcher ONLY for Super Admin */}
            {isSuperAdmin && !isViewingAs && (
              <div className="drawer-mode-switch-card">
                <div className="mode-switch-left">
                  <div className="mode-role-icon-box">
                    <span>{isAdmin ? '⚡' : '👑'}</span>
                  </div>
                  <div className="mode-role-text">
                    <span className="mode-role-title">{isAdmin ? 'Admin Studio' : 'Super Admin'}</span>
                    <span className="mode-role-sub">{isAdmin ? 'Content CMS' : 'Student View Active'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mode-switch-btn"
                  onClick={handleToggleMode}
                  title={isAdmin ? 'Switch to Student Learning' : 'Switch to Admin Studio'}
                >
                  <span>{isAdmin ? 'Student Mode' : 'Admin Mode'}</span>
                  <span className="mode-btn-arrow">➔</span>
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