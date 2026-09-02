/**
 * AdminPage
 * Sprint 6 — Admin Dashboard route with deep linking support for sections like 'members', 'courses', 'mcq-injection', etc.
 */
import { useState, useEffect } from 'react'
import '../styles/admin.css'
import AdminDashboard from '../components/admin/AdminDashboard'
import { navigate } from '../utils/navigation'

function AdminPage({ initialSection = 'dashboard', onBackHome, onLogout }) {
  const [activeSection, setActiveSection] = useState(initialSection)

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  const handleNavigate = (section) => {
    setActiveSection(section)
    navigate(section ? `admin/${section}` : 'admin')
  }

  return (
    <AdminDashboard
      activeSection={activeSection}
      onNavigate={handleNavigate}
      onBackHome={onBackHome}
      onLogout={onLogout}
    />
  )
}

export default AdminPage
