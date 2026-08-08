/**
 * AdminMobileLayout
 * Mobile shell for the Admin Panel.
 * Wraps admin content with a compact header and bottom navigation.
 */
import BottomNav from '../layout/BottomNav'
import AppIcon from '../ui/AppIcon'

const ADMIN_NAV_ITEMS = [
  { icon: 'adminDashboard', label: 'Dashboard' },
  { icon: 'folder', label: 'Courses' },
  { icon: 'chapters', label: 'Subjects' },
  { icon: 'document', label: 'Chapters' },
  { icon: 'profile', label: 'More' },
]

function AdminMobileLayout({ children, activeTab, onNavigate, courseName }) {
  const items = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    active: item.label === activeTab,
  }))

  return (
    <div className="phone admin-phone">
      <header className="admin-mobile-header">
        <div className="admin-mobile-header-left">
          <span className="admin-mobile-logo">
            <AppIcon name="adminDashboard" size={20} />
          </span>
          <div>
            <div className="admin-mobile-title">Admin</div>
            {courseName && <div className="admin-mobile-course">{courseName}</div>}
          </div>
        </div>
        <div className="admin-mobile-header-right">
          <span className="admin-mobile-avatar" aria-hidden="true">
            <AppIcon name="profile" size={18} />
          </span>
        </div>
      </header>
      <main className="admin-mobile-main">
        {children}
      </main>
      <BottomNav items={items} onNavigate={onNavigate} />
    </div>
  )
}

export default AdminMobileLayout
