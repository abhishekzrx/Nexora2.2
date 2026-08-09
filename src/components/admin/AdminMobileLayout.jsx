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
  { icon: 'analyticsTab', label: 'Analytics' },
  { icon: 'moreVert', label: 'More' },
]

function AdminMobileLayout({ children, activeTab, onNavigate, courseName: _courseName }) {
  const items = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    active: item.label === activeTab,
  }))

  return (
    <div className="phone admin-phone">
      <header className="admin-mobile-header">
        <div className="admin-mobile-header-left">
          <button type="button" className="admin-mobile-icon-btn" aria-label="Menu">
            <AppIcon name="menu" size={20} />
          </button>
          <div className="admin-mobile-title">Admin Panel</div>
        </div>
        <div className="admin-mobile-header-right">
          <button type="button" className="admin-mobile-icon-btn admin-mobile-notify" aria-label="Notifications">
            <AppIcon name="notifications" size={20} />
            <span className="bell-badge">3</span>
          </button>
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
