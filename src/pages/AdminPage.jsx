/**
 * AdminPage
 * Sprint 6 — Admin Dashboard route.
 */
import { useState } from 'react'
import '../styles/admin.css'
import AdminDashboard from '../components/admin/AdminDashboard'

function AdminPage({ onBackHome, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard')

  const handleNavigate = (section) => {
    setActiveSection(section)
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
