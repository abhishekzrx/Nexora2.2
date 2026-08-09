/**
 * AdminSidebar
 * Sidebar navigation for the Admin Panel.
 */
import AppIcon from '../ui/AppIcon'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'DASHBOARD', icon: 'adminDashboard' },
  { key: 'courses', label: 'COURSE MANAGER', icon: 'folder' },
  { key: 'subjects', label: 'SUBJECTS', icon: 'chapters' },
  { key: 'mcq-injection', label: 'CHAPTER MCQS INJECTION', icon: 'document' },
  { key: 'analytics', label: 'ANALYTICS', icon: 'analyticsTab', disabled: true },
  { key: 'settings', label: 'SETTINGS', icon: 'settings', disabled: true },
]

function AdminSidebar({ activeSection, onNavigate, courseName }) {
  return (
    <nav className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span className="admin-sidebar-logo">
          <AppIcon name="adminDashboard" size={22} />
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

      <div className="admin-sidebar-user">
        <div className="admin-user-avatar">
          <AppIcon name="profile" size={20} />
        </div>
        <div className="admin-user-info">
          <div className="admin-user-name">Abhi</div>
          <div className="admin-user-role">Administrator</div>
        </div>
        <AppIcon name="chevronDown" size={14} className="admin-user-chevron" />
      </div>
    </nav>
  )
}


export default AdminSidebar
