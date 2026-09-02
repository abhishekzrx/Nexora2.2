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

            {/* Quick Mode Switcher & Member Management ONLY for Super Admin */}
            {isSuperAdmin && !isViewingAs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', width: '100%' }}>
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

                <button
                  type="button"
                  className="drawer-members-quick-btn"
                  onClick={() => {
                    onClose?.()
                    onItemClick?.({ label: 'Member Management', key: 'members' })
                  }}
                  title="Open Super Admin Member Management"
                >
                  <div className="drawer-members-btn-left">
                    <span className="drawer-members-btn-icon">👥</span>
                    <span>Member Management</span>
                  </div>
                  <span className="drawer-members-btn-arrow">➔</span>
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