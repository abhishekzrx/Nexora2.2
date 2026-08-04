/**
 * AdminPage
 * Admin module screen. Reuses the shared MobileLayout, SideDrawer,
 * Header, Button and AppIcon components. All icons go through AppIcon.
 */
import { useState } from 'react'
import '../styles/admin.css'
import AppIcon from '../components/ui/AppIcon'
import MobileLayout from '../components/layout/MobileLayout'
import SideDrawer from '../components/layout/SideDrawer'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminInjectMcqs from '../components/admin/AdminInjectMcqs'
import AdminContentManager from '../components/admin/AdminContentManager'
import AdminModals from '../components/admin/AdminModals'

const drawerSections = [
  {
    label: 'ADMIN',
    items: [
      { icon: 'adminDashboard', label: 'Dashboard' },
      { icon: 'upload', label: 'Inject MCQs' },
      { icon: 'folder', label: 'Content Manager' },
    ],
  },
]

function AdminPage({ onBackHome = () => {} }) {
  const [page, setPage] = useState('dashboard')
  const [activeModal, setActiveModal] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openModal = (modal) => setActiveModal(modal)
  const closeModal = () => setActiveModal(null)
  const handleSuccess = (message) => {
    closeModal()
    // eslint-disable-next-line no-alert
    alert(message)
  }

  const navigate = (target) => {
    if (target === 'injectMcqs') setPage('injectMcqs')
    else if (target === 'contentManager') setPage('contentManager')
    else setPage('dashboard')
  }

  return (
    <div className="admin-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{ name: 'Abhi Kumar', sub: 'BPSC TRE 4.0 • Computer Science', streak: '14 Day Streak' }}
        sections={drawerSections}
        onItemClick={(item) => {
          setDrawerOpen(false)
          if (item.label === 'Dashboard') navigate('dashboard')
          else if (item.label === 'Inject MCQs') navigate('injectMcqs')
          else if (item.label === 'Content Manager') navigate('contentManager')
        }}
      />

      <MobileLayout
        className="admin-phone"
        activeTab="Home"
        onNavigate={(item) => {
          if (item.label === 'Home') onBackHome()
        }}
      >
        <header className="header admin-header">
          <div className="header-left">
            <button type="button" className="menu-icon" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <AppIcon name="menu" size={20} />
            </button>
            <div className="header-title">Admin</div>
          </div>
          <div className="header-right">
            <div className="avatar" aria-hidden="true">
              <AppIcon name="profile" size={20} />
            </div>
          </div>
        </header>

        <main className="admin-main">
          {page === 'dashboard' ? (
            <AdminDashboard onOpenModal={openModal} onNavigate={navigate} />
          ) : null}
          {page === 'injectMcqs' ? (
            <AdminInjectMcqs
              onCancel={() => navigate('dashboard')}
              onSuccess={handleSuccess}
            />
          ) : null}
          {page === 'contentManager' ? (
            <AdminContentManager onOpenModal={openModal} onNavigate={navigate} />
          ) : null}
        </main>
      </MobileLayout>

      <AdminModals activeModal={activeModal} onClose={closeModal} onSuccess={handleSuccess} />
    </div>
  )
}

export default AdminPage