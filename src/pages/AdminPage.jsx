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
import AiContentStudio from '../components/admin/AiContentStudio'
import SubjectManagementPage from '../components/admin/SubjectManagementPage'
import ChapterManagementPage from '../components/admin/ChapterManagementPage'
import LearningWorkspaceManager from '../components/admin/LearningWorkspaceManager'
import AdminModals from '../components/admin/AdminModals'
import AdminFeedbackProvider from '../components/admin/AdminFeedback'

const drawerSections = [
  {
    label: 'ADMIN',
    items: [
      { icon: 'adminDashboard', label: 'Dashboard' },
      { icon: 'adminDashboard', label: 'Course Management' },
      { icon: 'chapters', label: 'Subject Management' },
      { icon: 'aiCoach', label: 'AI Content Studio' },
    ],
  },
]

function AdminPage({ onBackHome = () => {} }) {
  const [page, setPage] = useState('dashboard')
  const [activeModal, setActiveModal] = useState(null)
  const [modalTarget, setModalTarget] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [aiPreload, setAiPreload] = useState(null)
  const [chapterSubject, setChapterSubject] = useState(null)

  const openModal = (modal, target) => {
    setModalTarget(target || null)
    setActiveModal(modal)
  }
  const closeModal = () => {
    setModalTarget(null)
    setActiveModal(null)
  }
  const handleSuccess = (message) => {
    closeModal()
    // eslint-disable-next-line no-alert
    alert(message)
  }

  const navigate = (target, preload) => {
    if (target === 'aiGenerator') {
      setAiPreload(preload || null)
      setPage('aiGenerator')
    } else if (target === 'courseManager') {
      setPage('courseManager')
    } else if (target === 'subjectManager') {
      setPage('subjectManager')
    } else if (target === 'chapterManager') {
      setChapterSubject(preload || null)
      setPage('chapterManager')
    } else setPage('dashboard')
  }

  const handleBackToDashboard = () => setPage('dashboard')

  return (
    <AdminFeedbackProvider>
    <div className="admin-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={{ name: 'Abhi Kumar', sub: 'BPSC TRE 4.0 • Computer Science', streak: '14 Day Streak' }}
        sections={drawerSections}
        onItemClick={(item) => {
          setDrawerOpen(false)
          if (item.label === 'Dashboard') navigate('dashboard')
          else if (item.label === 'Course Management') navigate('courseManager')
          else if (item.label === 'Subject Management') navigate('subjectManager')
          else if (item.label === 'AI Content Studio') navigate('aiGenerator')
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
          {page === 'courseManager' ? (
            <LearningWorkspaceManager onBack={handleBackToDashboard} />
          ) : null}
          {page === 'subjectManager' ? (
            <SubjectManagementPage onBack={handleBackToDashboard} onOpenChapters={(subjectName) => navigate('chapterManager', subjectName)} />
          ) : null}
          {page === 'chapterManager' ? (
            <ChapterManagementPage onBack={() => navigate('subjectManager')} subjectName={chapterSubject} />
          ) : null}
          {page === 'aiGenerator' ? (
            <AiContentStudio onBack={handleBackToDashboard} onNavigate={navigate} preload={aiPreload} />
          ) : null}
        </main>
      </MobileLayout>

      <AdminModals
        activeModal={activeModal}
        onClose={closeModal}
        onSuccess={handleSuccess}
        target={modalTarget}
        onTargetChange={setModalTarget}
      />
    </div>
    </AdminFeedbackProvider>
  )
}

export default AdminPage
