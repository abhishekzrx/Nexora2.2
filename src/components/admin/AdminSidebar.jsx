/**
 * AdminSidebar
 * Sidebar navigation for the Admin Panel.
 */
import AppIcon from '../ui/AppIcon'
import { useMemberStore } from '../../data/memberStore'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'DASHBOARD', icon: 'adminDashboard' },
  { key: 'members', label: 'MEMBER MANAGEMENT', icon: 'profile' },
  { key: 'courses', label: 'COURSE MANAGER', icon: 'folder' },
  { key: 'subjects', label: 'SUBJECTS', icon: 'chapters' },
  { key: 'notes', label: 'NOTES EDITOR', icon: 'notesTab' },
  { key: 'mcq-injection', label: 'CHAPTER MCQS INJECTION', icon: 'document' },
  { key: 'mcq-manager', label: 'MCQ MANAGER', icon: 'mcqs' },
  { key: 'settings', label: 'SETTINGS', icon: 'settings' },
]

function AdminSidebar({ activeSection, onNavigate, courseName, onBackHome, onLogout }) {
  const { activeMember } = useMemberStore()

  return (
    <nav className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span className="admin-sidebar-logo">
          <AppIcon name="centerBook" size={22} />
        </span>
        <div className="admin-sidebar-title-block">
          <span className="admin-sidebar-title">Admin Panel</span>
          {courseName ? <span className="admin-sidebar-course">{courseName}</span> : null}
        </div>
      </div>

      <div className="admin-sidebar-menu">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.key
          const isDisabled = item.disabled

          return (
            <button
              key={item.key}
              type="button"
              className={`admin-sidebar-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => !isDisabled && onNavigate?.(item.key)}
              disabled={isDisabled}
              title={item.label}
            >
              <span className="admin-sidebar-icon">
                <AppIcon name={item.icon} size={18} />
              </span>
              <span className="admin-sidebar-label">{item.label}</span>
              {isActive ? <span className="admin-sidebar-active-bar" /> : null}
            </button>
          )
        })}
      </div>

      {/* Quick Mode Switcher & Logout Controls */}
      <div className="admin-sidebar-footer-actions">
        <button
          type="button"
          className="admin-switch-mode-btn"
          onClick={onBackHome}
          title="Switch to Student Learning Mode"
        >
          <span className="mode-btn-icon">🎓</span>
          <span>Switch to Student</span>
        </button>

        <button
          type="button"
          className="admin-sidebar-logout-btn"
          onClick={onLogout}
          title="Log Out"
        >
          <AppIcon name="logout" size={16} />
          <span>Log Out</span>
        </button>
      </div>

      <div className="admin-sidebar-user">
        <div className="admin-user-avatar">
          <AppIcon name="profile" size={20} />
        </div>
        <div className="admin-user-info">
          <div className="admin-user-name">{activeMember?.display_name || 'adminalpha'}</div>
          <div className="admin-user-role">Super Admin</div>
        </div>
      </div>
    </nav>
  )
}

export default AdminSidebar
