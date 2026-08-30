/**
 * AdminMobileLayout
 * Mobile shell for the Admin Panel.
 * Wraps admin content with a compact header, sliding SideDrawer, and bottom navigation.
 */
import { useState } from 'react'
import BottomNav from '../layout/BottomNav'
import SideDrawer from '../layout/SideDrawer'
import AppIcon from '../ui/AppIcon'

const ADMIN_NAV_ITEMS = [
  { icon: 'adminDashboard', label: 'Dashboard' },
  { icon: 'folder', label: 'Courses' },
  { icon: 'chapters', label: 'Subjects' },
  { icon: 'notesTab', label: 'Notes' },
  { icon: 'moreVert', label: 'More' },
]

function AdminMobileLayout({ children, activeTab, onNavigate, courseName, onBackHome, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const items = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    active: item.label === activeTab,
  }))

  const drawerSections = [
    {
      label: 'ADMIN MANAGEMENT',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: 'adminDashboard', active: activeTab === 'Dashboard' },
        { key: 'courses', label: 'Course Manager', icon: 'folder', active: activeTab === 'Courses' },
        { key: 'subjects', label: 'Subjects & Chapters', icon: 'chapters', active: activeTab === 'Subjects' },
        { key: 'notes', label: 'Notes Editor', icon: 'notesTab', active: activeTab === 'Notes Editor' || activeTab === 'Notes' },
        { key: 'mcq-injection', label: 'Chapter MCQs Injection', icon: 'document', active: activeTab === 'Chapter MCQs Injection' },
        { key: 'mcq-manager', label: 'MCQ Manager', icon: 'mcqs', active: activeTab === 'MCQ Manager' },
      ],
    },
    {
      label: 'APPLICATION',
      items: [
        { key: 'exit', label: 'Exit to Student View', icon: 'home' },
      ],
    },
  ]

  const handleDrawerItemClick = (item) => {
    setDrawerOpen(false)
    if (item.key === 'exit') {
      onBackHome?.()
    } else if (item.key) {
      onNavigate?.(item.key)
    }
  }

  const handleBottomNavClick = (item) => {
    if (item.label === 'More') {
      setDrawerOpen(true)
    } else if (item.label === 'Notes') {
      onNavigate?.('notes')
    } else {
      onNavigate?.(item.label.toLowerCase())
    }
  }

  return (
    <div className="phone admin-phone">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{
          name: 'Administrator',
          sub: courseName || 'Nexora Studio',
          streak: 'Admin Mode',
        }}
        sections={drawerSections}
        onItemClick={handleDrawerItemClick}
        onLogout={onLogout}
        onSwitchMode={() => onBackHome?.()}
      />

      <header className="admin-mobile-header">
        <div className="admin-mobile-header-left">
          <button
            type="button"
            className="admin-mobile-icon-btn"
            aria-label="Open Admin Menu"
            onClick={() => setDrawerOpen(true)}
          >
            <AppIcon name="menu" size={20} />
          </button>
          <div className="admin-mobile-header-text">
            <div className="admin-mobile-title">Admin Panel</div>
            {courseName && <div className="admin-mobile-course">{courseName}</div>}
          </div>
        </div>
        <div className="admin-mobile-header-right">
          <button
            type="button"
            className="admin-mobile-icon-btn"
            aria-label="Exit to Student App"
            title="Exit to Student App"
            onClick={onBackHome}
          >
            <AppIcon name="home" size={18} />
          </button>
        </div>
      </header>

      <main className="admin-mobile-main">
        {children}
      </main>

      <BottomNav items={items} onNavigate={handleBottomNavClick} />
    </div>
  )
}

export default AdminMobileLayout
