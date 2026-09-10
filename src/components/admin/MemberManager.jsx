/**
 * MemberManager.jsx
 * Production-Grade Smart & Ultra-Premium USERS Management Studio.
 *
 * Core Features:
 * 1. Smart Student Cards: Premium monogram avatar, warrior rank emblem, 3-metric KPI strip (Accuracy, Solved, Readiness), and live trend bar.
 * 2. High-Density Smart Table: Compact layout with student profile, warrior identity, single course track, live accuracy micro-bar, and grouped actions.
 * 3. Supabase Live Integration: Direct Supabase Auth & user_profiles live synchronization.
 * 4. Single Course Rule: Strict 1-course assignment for students (Super Admin universal access).
 * 5. Super Admin Immunity: Root adminalpha is 100% protected from deletion, deactivation, demotion, or lockout.
 * 6. 1-Click Credential Delivery: Fast auto-generate strong password and copy formatted login details.
 */

import { useState, useEffect, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import { memberService, normalizeMember, PRIMARY_SUPER_ADMIN } from '../../services/memberService'
import { identityService } from '../../services/identityService'
import { auditService } from '../../services/auditService'
import { useMemberStore, setViewAsMember, hydrateMemberStore } from '../../data/memberStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { userAnalyticsService } from '../../services/userAnalyticsService'
import { showToast } from '../../data/feedbackStore'
import '../../styles/memberManager.css'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)', // Indigo Fuchsia
  'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #6366F1 100%)', // Cyan Sky
  'linear-gradient(135deg, #10B981 0%, #059669 50%, #0D9488 100%)', // Emerald Teal
  'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #DC2626 100%)', // Sunset Coral
  'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 50%, #4F46E5 100%)', // Royal Purple
  'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #9333EA 100%)', // Rose Violet
]

function getAvatarGradient(member) {
  if (member.role === 'SUPER_ADMIN' || member.username === 'adminalpha') {
    return 'linear-gradient(135deg, #F59E0B 0%, #EA580C 50%, #DC2626 100%)'
  }
  const str = member.id || member.username || 'user'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

function StudentProfileAvatar({ member, size = 'lg' }) {
  const isSuper = member.role === 'SUPER_ADMIN' || member.username === 'adminalpha'
  const gradient = getAvatarGradient(member)
  const isLarge = size === 'lg'
  const isSmall = size === 'sm'

  return (
    <div className={`mm-student-avatar-container ${size} ${isSuper ? 'super-admin' : ''}`}>
      <div className="mm-student-avatar-halo" style={{ background: gradient }}>
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.display_name} className="mm-student-avatar-img" />
        ) : (
          <div className="mm-student-avatar-inner">
            <AppIcon
              name={isSuper ? 'hundred' : 'face'}
              size={isLarge ? 28 : isSmall ? 18 : 22}
              color="#FFFFFF"
            />
          </div>
        )}
      </div>
      <span className={`mm-student-avatar-status ${member.status.toLowerCase()}`} title={`Status: ${member.status}`} />
    </div>
  )
}

function generateStrongPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

function getInitials(name = '') {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function resolveCourseName(cid, workspaces = []) {
  if (!cid || cid === '*') return 'Global (All Courses)'
  const matched = workspaces.find(
    (w) => w.id === cid || w.id.toLowerCase() === cid.toLowerCase()
  )
  if (matched) return matched.name
  const lower = String(cid).toLowerCase()
  if (lower === 'cbse-9' || lower.includes('class-9') || lower.includes('class 9')) return 'Class 9'
  if (lower === 'cbse-10' || lower.includes('class-10') || lower.includes('class 10')) return 'Class 10'
  if (lower === 'cbse-12-cs' || lower.includes('class 12')) return 'Class 12 CS'
  if (lower === 'bpsc-prelims' || lower === 'bpsc_prelims') return 'BPSC Prelims'
  if (lower === 'bpsc-tre-4' || lower === 'bpsc_cs') return 'BPSC 4.0 CS'
  return cid
}

export default function MemberManager({ onNavigateStudentView = () => {} }) {
  const { membersList } = useMemberStore()
  const { workspaces } = useWorkspaceStore()
  const [members, setMembers] = useState(membersList.map(normalizeMember))
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
  const [filterRole, setFilterRole] = useState('ALL') // 'ALL' | 'MEMBER' | 'SUPER_ADMIN' | 'FACULTY'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL') // 'ALL' | courseId | 'UNASSIGNED'
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState(null)
  const [memberMetricsMap, setMemberMetricsMap] = useState({})

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [accessModalMember, setAccessModalMember] = useState(null)
  const [identityModalMember, setIdentityModalMember] = useState(null)
  const [intelligenceModalMember, setIntelligenceModalMember] = useState(null)
  const [resetPasswordModalMember, setResetPasswordModalMember] = useState(null)
  const [editModalMember, setEditModalMember] = useState(null)
  const [deleteModalMember, setDeleteModalMember] = useState(null)

  // Add User Form State
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newConfirmPassword, setNewConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newRole, setNewRole] = useState('MEMBER')
  const [newStatus, setNewStatus] = useState('ACTIVE')
  const [newAssignedCourseId, setNewAssignedCourseId] = useState('')
  const [newWarriorName, setNewWarriorName] = useState('')
  const [newPublicId, setNewPublicId] = useState('')

  // Reset Password State
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetConfirmPasswordValue, setResetConfirmPasswordValue] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Edit User State
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('MEMBER')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editAssignedCourseId, setEditAssignedCourseId] = useState('')

  // Identity Modal Form
  const [targetPublicId, setTargetPublicId] = useState('')
  const [targetWarriorName, setTargetWarriorName] = useState('')
  const [identityReason, setIdentityReason] = useState('')
  const [identityAuditLogs, setIdentityAuditLogs] = useState([])

  // Intelligence State
  const [memberAnalytics, setMemberAnalytics] = useState(null)
  const [memberAttempts, setMemberAttempts] = useState([])

  useEffect(() => {
    setMembers(membersList.map(normalizeMember))
  }, [membersList])

  // Load micro analytics for all visible members
  useEffect(() => {
    let isMounted = true
    async function loadMetrics() {
      const metrics = {}
      for (const m of members) {
        const courseId = m.assigned_course_id || m.assigned_courses?.[0] || 'cbse-10'
        try {
          const stats = await userAnalyticsService.computeCourseAnalytics(m.id, courseId)
          metrics[m.id] = {
            accuracy: stats?.accuracy || 0,
            solved: stats?.totalQuestionsAttempted || 0,
            readiness: stats?.readinessScore || 0,
          }
        } catch {
          metrics[m.id] = { accuracy: 0, solved: 0, readiness: 0 }
        }
      }
      if (isMounted) {
        setMemberMetricsMap(metrics)
      }
    }
    loadMetrics()
    return () => { isMounted = false }
  }, [members])

  // Close dropdown on click outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.mm-action-menu-wrap')) {
        setActiveDropdownMemberId(null)
      }
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  const refreshList = async () => {
    setLoading(true)
    await hydrateMemberStore()
    const res = await memberService.getAllMembers(true)
    if (res.success) setMembers(res.data.map(normalizeMember))
    setLoading(false)
  }

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterStatus === 'ACTIVE' && m.status !== 'ACTIVE') return false
      if (filterStatus === 'DISABLED' && m.status !== 'DISABLED') return false
      if (filterStatus === 'ARCHIVED' && m.status !== 'ARCHIVED') return false

      if (filterRole !== 'ALL' && m.role !== filterRole) return false

      if (selectedCourseFilter !== 'ALL') {
        if (selectedCourseFilter === 'UNASSIGNED') {
          if (m.assigned_courses && m.assigned_courses.length > 0) return false
        } else {
          const hasAccess =
            m.assigned_courses?.includes('*') ||
            m.assigned_courses?.includes(selectedCourseFilter) ||
            m.assigned_course_id === selectedCourseFilter
          if (!hasAccess) return false
        }
      }

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        m.display_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.warrior_name?.toLowerCase().includes(q) ||
        m.public_user_id?.toLowerCase().includes(q)
      )
    })
  }, [members, filterStatus, filterRole, selectedCourseFilter, searchQuery])

  // Stats
  const activeCount = useMemo(() => members.filter((m) => m.status === 'ACTIVE').length, [members])
  const disabledCount = useMemo(() => members.filter((m) => m.status === 'DISABLED').length, [members])
  const archivedCount = useMemo(() => members.filter((m) => m.status === 'ARCHIVED').length, [members])

  // Handlers
  const handleOpenAdd = (presetCourseId = null) => {
    const nextNum = String(members.length + 1).padStart(2, '0')
    setNewUsername(`MEMBER${nextNum}`)
    setNewDisplayName('')
    setNewEmail('')
    setNewPhone('')
    const genPass = generateStrongPassword()
    setNewPassword(genPass)
    setNewConfirmPassword(genPass)
    setNewRole('MEMBER')
    setNewStatus('ACTIVE')

    const defaultCourse = presetCourseId ||
      (selectedCourseFilter !== 'ALL' && selectedCourseFilter !== 'UNASSIGNED' ? selectedCourseFilter : (workspaces[0]?.id || 'cbse-10'))
    setNewAssignedCourseId(defaultCourse)

    setNewWarriorName(identityService.generateWarriorName(members))
    setNewPublicId(identityService.generatePublicId(members))
    setAddModalOpen(true)
  }

  const handleCreateMember = async (e) => {
    e.preventDefault()
    if (!newUsername.trim()) {
      showToast({ type: 'warning', title: 'Username Required', message: 'Please provide a User ID / username.' })
      return
    }

    if (newPassword && newPassword.length < 6) {
      showToast({ type: 'warning', title: 'Password Too Short', message: 'Password must be at least 6 characters.' })
      return
    }

    if (newPassword && newPassword !== newConfirmPassword) {
      showToast({ type: 'warning', title: 'Passwords Mismatch', message: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    const res = await memberService.createMember({
      username: newUsername.trim(),
      display_name: newDisplayName.trim() || newUsername.trim(),
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      password: newPassword.trim() || null,
      role: newRole,
      status: newStatus,
      assigned_course_id: newRole === 'SUPER_ADMIN' ? '*' : (newAssignedCourseId || null),
      assigned_courses: newRole === 'SUPER_ADMIN' ? ['*'] : (newAssignedCourseId ? [newAssignedCourseId] : []),
      custom_public_id: newPublicId,
      custom_warrior_name: newWarriorName,
    })
    setLoading(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: 'User Created in Supabase',
        message: `Registered ${res.data.display_name} (@${res.data.username}).`,
      })
      setAddModalOpen(false)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Creation Failed', message: res.error })
    }
  }

  // Reset Password Modal
  const handleOpenResetPassword = (member) => {
    setResetPasswordModalMember(member)
    const genPass = generateStrongPassword()
    setResetPasswordValue(genPass)
    setResetConfirmPasswordValue(genPass)
    setActiveDropdownMemberId(null)
  }

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault()
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      showToast({ type: 'warning', title: 'Invalid Password', message: 'Password must be at least 6 characters.' })
      return
    }

    if (resetPasswordValue !== resetConfirmPasswordValue) {
      showToast({ type: 'warning', title: 'Passwords Mismatch', message: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    const res = await memberService.adminResetPassword({
      memberId: resetPasswordModalMember.id,
      newPassword: resetPasswordValue,
    })
    setLoading(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: 'Password Updated',
        message: res.message || `Password reset for ${resetPasswordModalMember.display_name}.`,
      })
      setResetPasswordModalMember(null)
    } else {
      showToast({ type: 'error', title: 'Reset Failed', message: res.error })
    }
  }

  // Edit User Modal
  const handleOpenEditModal = (member) => {
    setEditModalMember(member)
    setEditDisplayName(member.display_name || member.username || '')
    setEditPhone(member.phone || '')
    setEditEmail(member.email || '')
    setEditRole(member.role || 'MEMBER')
    setEditStatus(member.status || 'ACTIVE')
    setEditAssignedCourseId(member.assigned_course_id || member.assigned_courses?.[0] || '')
    setActiveDropdownMemberId(null)
  }

  const handleSaveEditUser = async (e) => {
    e.preventDefault()
    if (!editModalMember) return

    setLoading(true)
    const assignedCourse = editRole === 'SUPER_ADMIN' ? '*' : (editAssignedCourseId || null)
    const res = await memberService.updateMember(editModalMember.id, {
      display_name: editDisplayName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      role: editRole,
      status: editStatus,
      assigned_course_id: assignedCourse,
      assigned_courses: editRole === 'SUPER_ADMIN' ? ['*'] : (assignedCourse ? [assignedCourse] : []),
    })
    setLoading(false)

    if (res.success) {
      showToast({ type: 'success', title: 'User Updated', message: `Profile saved for ${editDisplayName}.` })
      setEditModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Update Failed', message: res.error })
    }
  }

  // Delete / Archive confirmation
  const handleConfirmDelete = async (permanent = false) => {
    if (!deleteModalMember) return
    setLoading(true)

    let res
    if (permanent) {
      res = await memberService.hardDeleteMember(deleteModalMember.id)
    } else {
      res = await memberService.archiveMember(deleteModalMember.id)
    }
    setLoading(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: permanent ? 'User Permanently Deleted' : 'User Archived',
        message: permanent ? 'Account removed.' : 'Account archived and access disabled.',
      })
      setDeleteModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Action Failed', message: res.error })
    }
  }

  // Copy Credentials helper
  const handleCopyCredentials = (username, password, courseName) => {
    const text = `🎓 Nexora Learning Credentials\n━━━━━━━━━━━━━━━━━━━━\n👤 User ID / Username: ${username}\n🔑 Password: ${password}\n📚 Assigned Track: ${courseName || 'General'}\n🌐 Login Link: ${window.location.origin}/#/login\n━━━━━━━━━━━━━━━━━━━━`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      showToast({ type: 'success', title: 'Credentials Copied! 📋', message: 'User credentials copied to clipboard for delivery.' })
    }
  }

  const handleToggleStatus = async (member) => {
    setActiveDropdownMemberId(null)
    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      showToast({ type: 'warning', title: 'Protected Account', message: 'Super Admin cannot be disabled.' })
      return
    }
    const res = await memberService.toggleMemberStatus(member.id)
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `${member.display_name} is now ${res.data.status}.`,
      })
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Failed to Update', message: res.error })
    }
  }

  const handleRestoreMember = async (member) => {
    setActiveDropdownMemberId(null)
    const res = await memberService.restoreMember(member.id)
    if (res.success) {
      showToast({ type: 'success', title: 'Member Restored', message: `${member.display_name} is now ACTIVE.` })
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Restore Failed', message: res.error })
    }
  }

  const handleOpenAccessModal = (member) => {
    setAccessModalMember({ ...member })
    setActiveDropdownMemberId(null)
  }

  const handleSaveAccess = async (selectedCid) => {
    if (!accessModalMember) return
    const isSuper = accessModalMember.role === 'SUPER_ADMIN'
    const newCourse = isSuper ? '*' : (selectedCid || null)

    const res = await memberService.updateMember(accessModalMember.id, {
      assigned_course_id: newCourse,
      assigned_courses: isSuper ? ['*'] : (newCourse ? [newCourse] : []),
    })
    if (res.success) {
      showToast({ type: 'success', title: 'Course Track Updated', message: `Course assigned for ${accessModalMember.display_name}.` })
      setAccessModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Failed to Save Course', message: res.error })
    }
  }

  const handleOpenIdentityModal = async (member) => {
    setIdentityModalMember(member)
    setTargetPublicId(member.public_user_id)
    setTargetWarriorName(member.warrior_name)
    setIdentityReason('')
    setActiveDropdownMemberId(null)
    const logs = await identityService.getIdentityAuditLogs(member.id)
    setIdentityAuditLogs(logs)
  }

  const handleSaveIdentity = async () => {
    if (!identityModalMember) return
    const res = await memberService.updatePublicIdentity({
      memberId: identityModalMember.id,
      newPublicId: targetPublicId,
      newWarriorName: targetWarriorName,
      reason: identityReason || 'Admin Update',
    })
    if (res.success) {
      showToast({ type: 'success', title: 'Identity Updated', message: `Assigned ${targetWarriorName} (${targetPublicId}).` })
      setIdentityModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Identity Change Failed', message: res.error })
    }
  }

  const handleOpenIntelligence = async (member) => {
    setIntelligenceModalMember(member)
    setMemberAnalytics(null)
    setActiveDropdownMemberId(null)
    const firstCourse = member.assigned_course_id || member.assigned_courses?.[0] || 'cbse-10'
    const [analytics, attempts] = await Promise.all([
      userAnalyticsService.computeCourseAnalytics(member.id, firstCourse),
      userAnalyticsService.getUserAttempts(member.id, firstCourse),
    ])
    setMemberAnalytics(analytics)
    setMemberAttempts(attempts)
  }

  const handleViewAsMember = (member) => {
    setActiveDropdownMemberId(null)
    setViewAsMember(member)
    showToast({
      type: 'info',
      title: '👁️ Read-Only Student View',
      message: `Viewing dashboard as ${member.warrior_name} (${member.display_name}).`,
    })
    onNavigateStudentView()
  }

  const handleExportUsers = () => {
    const dataStr = JSON.stringify(members, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexora_users_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast({ type: 'success', title: 'Export Complete', message: 'User directory exported to JSON.' })
  }

  // Render single smart course pill
  const renderCourseTrack = (m) => {
    const isSuper = m.role === 'SUPER_ADMIN' || m.username === 'adminalpha'
    if (isSuper) {
      return (
        <span className="mm-single-course-pill global" title="Universal access to all courses">
          <AppIcon name="public" size={13} color="#38BDF8" />
          <span>Global (All Courses)</span>
        </span>
      )
    }

    const cid = m.assigned_course_id || m.assigned_courses?.[0]
    if (!cid) {
      return (
        <span
          className="mm-single-course-pill unassigned"
          onClick={() => handleOpenAccessModal(m)}
          title="Click to assign course"
        >
          <AppIcon name="warningAmber" size={13} color="#F87171" />
          <span>Unassigned</span>
        </span>
      )
    }

    const courseName = resolveCourseName(cid, workspaces)
    return (
      <span
        className="mm-single-course-pill"
        onClick={() => handleOpenAccessModal(m)}
        title="Click to change course track"
      >
        <AppIcon name="school" size={13} color="#FB923C" />
        <span>{courseName}</span>
      </span>
    )
  }

  return (
    <div className="mm-container">
      {/* ── 1. Minimal & Smart Header ───────────────────────────────── */}
      <div className="mm-header">
        <div>
          <div className="mm-header-title-wrap">
            <h1 className="mm-header-title">Users</h1>
            <span className="mm-header-count">{members.length} {members.length === 1 ? 'User' : 'Users'}</span>
            <span style={{ fontSize: '0.74rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 9px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <AppIcon name="hub" size={12} color="#10B981" />
              Supabase Live Directory
            </span>
          </div>
          <p className="mm-header-sub">
            Administer Supabase Auth accounts & user_profiles. Exactly 1 dedicated course allowed per student.
          </p>
        </div>

        <div className="mm-header-actions">
          <button
            type="button"
            className="mm-btn-secondary"
            onClick={handleExportUsers}
            title="Export all users to JSON"
          >
            <AppIcon name="download" size={15} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="mm-btn-primary"
            onClick={() => handleOpenAdd()}
          >
            <AppIcon name="personAdd" size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Filter Toolbar ───────────────────────────────── */}
      <div className="mm-toolbar-unified">
        <div className="mm-toolbar-left">
          {/* Search Box */}
          <div className="mm-search-box">
            <span className="mm-search-icon">
              <AppIcon name="search" size={15} color="#64748B" />
            </span>
            <input
              type="text"
              className="mm-search-input"
              placeholder="Search name, user ID, warrior title, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="mm-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Course Filter Dropdown */}
          <select
            className="mm-select-filter"
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
          >
            <option value="ALL">All Courses ({members.length})</option>
            {workspaces.map((w) => {
              const count = members.filter((m) =>
                m.assigned_courses?.includes('*') ||
                m.assigned_courses?.includes(w.id) ||
                m.assigned_course_id === w.id
              ).length
              return (
                <option key={w.id} value={w.id}>
                  {w.name} ({count})
                </option>
              )
            })}
            <option value="UNASSIGNED">
              Unassigned ({members.filter((m) => !m.assigned_course_id && (!m.assigned_courses || m.assigned_courses.length === 0)).length})
            </option>
          </select>

          {/* Role Filter Dropdown */}
          <select
            className="mm-select-filter"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="MEMBER">Students (MEMBER)</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="FACULTY">Faculty</option>
            <option value="MODERATOR">Moderators</option>
          </select>
        </div>

        <div className="mm-toolbar-right">
          {/* Status Tabs */}
          <div className="mm-status-tabs">
            <button
              type="button"
              className={`mm-status-tab${filterStatus === 'ALL' ? ' active' : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              className={`mm-status-tab${filterStatus === 'ACTIVE' ? ' active' : ''}`}
              onClick={() => setFilterStatus('ACTIVE')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`mm-status-tab${filterStatus === 'DISABLED' ? ' active' : ''}`}
              onClick={() => setFilterStatus('DISABLED')}
            >
              Disabled ({disabledCount})
            </button>
            {archivedCount > 0 && (
              <button
                type="button"
                className={`mm-status-tab${filterStatus === 'ARCHIVED' ? ' active' : ''}`}
                onClick={() => setFilterStatus('ARCHIVED')}
              >
                Archived ({archivedCount})
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="mm-view-toggle">
            <button
              type="button"
              className={`mm-view-btn${viewMode === 'cards' ? ' active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Smart Cards View"
            >
              <AppIcon name="viewGrid" size={13} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`mm-view-btn${viewMode === 'table' ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table View"
            >
              <AppIcon name="viewList" size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Content View (Smart Cards / Table) ────────────────────── */}
      {filteredMembers.length === 0 ? (
        <div className="mm-empty-state">
          <div className="mm-empty-icon">
            <AppIcon name="person" size={38} color="#64748B" />
          </div>
          <div className="mm-empty-title">No Users Found in Supabase</div>
          <p className="mm-empty-sub">
            {searchQuery || selectedCourseFilter !== 'ALL' || filterStatus !== 'ALL'
              ? 'No users match your active filter criteria.'
              : 'No students registered in Supabase yet. Click "+ Add User" to register your first student via Supabase Auth.'}
          </p>
          <button
            type="button"
            className="mm-btn-primary"
            onClick={() => {
              setSelectedCourseFilter('ALL')
              setSearchQuery('')
              setFilterStatus('ALL')
              setFilterRole('ALL')
              if (members.length === 0) handleOpenAdd()
            }}
          >
            {members.length === 0 ? '+ Add First User' : 'Reset Filters'}
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── 🌟 ULTRA-PREMIUM FROSTED GLASSROOM (GLASSMORPHISM) STUDENT CARDS ── */
        <div className="mm-cards-grid">
          {filteredMembers.map((m) => {
            const isSuper = m.role === 'SUPER_ADMIN' || m.username === 'adminalpha'
            const isArchived = m.status === 'ARCHIVED'
            const isDisabled = m.status === 'DISABLED'
            const isDropdownOpen = activeDropdownMemberId === m.id
            const metrics = memberMetricsMap[m.id] || { accuracy: 0, solved: 0, readiness: 0 }

            return (
              <div
                key={m.id}
                className={`mm-card-smart mm-card-glass${isSuper ? ' super-admin' : ''}${isArchived ? ' archived' : ''}`}
              >
                {/* Ambient dynamic radial mesh glow */}
                <div className="mm-card-glass-glow" />

                {/* Top Frosted Rim Reflection */}
                <div className="mm-card-glass-rim" />

                <div className="mm-card-content-wrap">
                  {/* Top Header: Student Profile Avatar + Name + Live Status */}
                  <div className="mm-card-smart-top">
                    <div className="mm-user-cell">
                      <StudentProfileAvatar member={m} size="lg" />

                      <div className="mm-user-details">
                        <div className="mm-user-name-row">
                          <span className="mm-user-display-name">
                            {m.display_name || m.username}
                          </span>
                          {isSuper ? (
                            <span className="mm-role-badge super-admin">
                              <AppIcon name="hundred" size={11} color="#FDBA74" />
                              SUPER ADMIN
                            </span>
                          ) : m.role && m.role !== 'MEMBER' ? (
                            <span className="mm-role-badge role-faculty">
                              <AppIcon name="shield" size={10} />
                              {m.role}
                            </span>
                          ) : (
                            <span className="mm-role-badge student">
                              <AppIcon name="school" size={10} color="#38BDF8" />
                              STUDENT
                            </span>
                          )}
                        </div>
                        <span className="mm-user-username">@{m.username}</span>
                      </div>
                    </div>

                    <span className={`mm-status-indicator ${m.status.toLowerCase()}`}>
                      <span className={`mm-status-dot ${m.status.toLowerCase()}`} />
                      <span>{m.status}</span>
                    </span>
                  </div>

                  {/* Warrior Identity & Public ID Glass Strip */}
                  <div className="mm-warrior-glass-row">
                    <span className="mm-warrior-title-text">
                      <AppIcon name="shield" size={13} color="#FB923C" />
                      <span>{m.warrior_name}</span>
                    </span>
                    <span className="mm-public-id-badge">
                      <AppIcon name="badge" size={11} color="#94A3B8" />
                      <span>{m.public_user_id}</span>
                    </span>
                  </div>

                  {/* Dedicated Single Course Track Glass Capsule */}
                  <div className="mm-course-track-row">
                    {renderCourseTrack(m)}
                  </div>

                  {/* 3 Floating Frosted Glass Micro-KPI Widgets */}
                  <div className="mm-card-stats-strip">
                    <div className="mm-card-stat-box accuracy">
                      <span className="mm-card-stat-label">
                        <AppIcon name="gpsFixed" size={11} color="#34D399" />
                        Accuracy
                      </span>
                      <span className="mm-card-stat-val accuracy">
                        {metrics.accuracy > 0 ? `${metrics.accuracy}%` : '—'}
                      </span>
                    </div>
                    <div className="mm-card-stat-box solved">
                      <span className="mm-card-stat-label">
                        <AppIcon name="solvedCheck" size={11} color="#38BDF8" />
                        Solved
                      </span>
                      <span className="mm-card-stat-val solved">
                        {metrics.solved > 0 ? `${metrics.solved} MCQs` : '0'}
                      </span>
                    </div>
                    <div className="mm-card-stat-box readiness">
                      <span className="mm-card-stat-label">
                        <AppIcon name="speed" size={11} color="#FB923C" />
                        Readiness
                      </span>
                      <span className="mm-card-stat-val streak">
                        {metrics.readiness > 0 ? `${metrics.readiness}%` : (isSuper ? '100%' : '—')}
                      </span>
                    </div>
                  </div>

                  {/* Visual Trend Progress Bar with Neon Glow */}
                  <div className="mm-card-trend-wrap">
                    <div className="mm-card-trend-header">
                      <span className="mm-trend-label">
                        <AppIcon name="trendingUp" size={12} color="#34D399" />
                        <span>Practice Mastery</span>
                      </span>
                      <span className={`mm-trend-badge ${metrics.accuracy >= 70 ? 'high' : metrics.accuracy > 0 ? 'progress' : 'new'}`}>
                        {metrics.accuracy >= 70 ? 'Mastery' : metrics.accuracy > 0 ? 'In Progress' : 'New'}
                      </span>
                    </div>
                    <div className="mm-card-trend-bar-bg">
                      <div
                        className={`mm-card-trend-bar-fill ${metrics.accuracy >= 70 ? 'high' : metrics.accuracy > 0 ? 'progress' : 'default'}`}
                        style={{
                          width: `${Math.max(metrics.accuracy, isSuper ? 100 : 8)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Contact Strip */}
                  {(m.email || m.phone) && (
                    <div className="mm-card-contact-strip">
                      {m.email && (
                        <div className="mm-contact-item">
                          <AppIcon name="mail" size={12} color="#64748B" />
                          <span className="mm-contact-text">{m.email}</span>
                        </div>
                      )}
                      {m.phone && (
                        <div className="mm-contact-item">
                          <AppIcon name="phone" size={12} color="#64748B" />
                          <span className="mm-contact-text">{m.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Smart Footer Actions */}
                <div className="mm-card-smart-footer">
                  <div className="mm-card-actions-left">
                    <button
                      type="button"
                      className="mm-btn-glass pass-btn"
                      onClick={() => handleOpenResetPassword(m)}
                      title="Reset password & copy credentials"
                    >
                      <AppIcon name="key" size={13} color="#FB923C" />
                      <span>Pass</span>
                    </button>
                    <button
                      type="button"
                      className="mm-btn-glass edit-btn"
                      onClick={() => handleOpenEditModal(m)}
                      title="Edit profile"
                    >
                      <AppIcon name="edit" size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="mm-btn-glass icon-btn"
                      onClick={() => handleViewAsMember(m)}
                      title="Simulate student dashboard in read-only mode"
                    >
                      <AppIcon name="visibility" size={15} />
                    </button>
                    <button
                      type="button"
                      className="mm-btn-glass icon-btn"
                      onClick={() => handleOpenIntelligence(m)}
                      title="Learning Analytics & Accuracy"
                    >
                      <AppIcon name="insights" size={15} />
                    </button>
                  </div>

                  {/* Smart Dropdown for Secondary Actions */}
                  <div className="mm-action-menu-wrap">
                    <button
                      type="button"
                      className={`mm-btn-glass icon-btn${isDropdownOpen ? ' active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveDropdownMemberId(isDropdownOpen ? null : m.id)
                      }}
                      title="More options"
                    >
                      <AppIcon name="moreVert" size={15} />
                    </button>

                    {isDropdownOpen && (
                      <div className="mm-action-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="mm-action-menu-item"
                          onClick={() => handleOpenAccessModal(m)}
                        >
                          <AppIcon name="school" size={14} color="#FB923C" />
                          <span>Change Course Track</span>
                        </button>

                        <button
                          type="button"
                          className="mm-action-menu-item"
                          onClick={() => handleOpenIdentityModal(m)}
                        >
                          <AppIcon name="shield" size={14} color="#38BDF8" />
                          <span>Warrior Identity</span>
                        </button>

                        {isArchived ? (
                          <button
                            type="button"
                            className="mm-action-menu-item success"
                            onClick={() => handleRestoreMember(m)}
                          >
                            <AppIcon name="restore" size={14} color="#34D399" />
                            <span>Restore User</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSuper}
                            className={`mm-action-menu-item ${isDisabled ? 'success' : 'danger'}`}
                            onClick={() => handleToggleStatus(m)}
                          >
                            <AppIcon name="power" size={14} color={isDisabled ? '#34D399' : '#F87171'} />
                            <span>{isDisabled ? 'Enable User' : 'Disable User'}</span>
                          </button>
                        )}

                        {!isSuper && (
                          <button
                            type="button"
                            className="mm-action-menu-item danger"
                            onClick={() => {
                              setActiveDropdownMemberId(null)
                              setDeleteModalMember(m)
                            }}
                          >
                            <AppIcon name="delete" size={14} color="#F87171" />
                            <span>Delete User...</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── 📋 HIGH-DENSITY COMPACT TABLE VIEW ──────────────────── */
        <div className="mm-table-wrapper">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Student Profile</th>
                <th>Warrior Rank & ID</th>
                <th>Course Track (1 Allowed)</th>
                <th>Performance & Trends</th>
                <th>Contact</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const isSuper = m.role === 'SUPER_ADMIN' || m.username === 'adminalpha'
                const isArchived = m.status === 'ARCHIVED'
                const isDisabled = m.status === 'DISABLED'
                const isDropdownOpen = activeDropdownMemberId === m.id
                const metrics = memberMetricsMap[m.id] || { accuracy: 0, solved: 0, readiness: 0 }

                return (
                  <tr key={m.id}>
                    {/* Student Profile */}
                    <td>
                      <div className="mm-user-cell">
                        <StudentProfileAvatar member={m} size="sm" />
                        <div className="mm-user-details">
                          <div className="mm-user-name-row">
                            <span className="mm-user-display-name">
                              {m.display_name || m.username}
                            </span>
                            {isSuper ? (
                              <span className="mm-role-badge super-admin">
                                <AppIcon name="hundred" size={10} color="#FDBA74" />
                                ADMIN
                              </span>
                            ) : m.role && m.role !== 'MEMBER' ? (
                              <span
                                className="mm-role-badge"
                                style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
                              >
                                {m.role}
                              </span>
                            ) : null}
                          </div>
                          <span className="mm-user-username">@{m.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Warrior Rank & ID */}
                    <td>
                      <div className="mm-warrior-pill">
                        <span className="mm-warrior-title-text">
                          <AppIcon name="shield" size={12} color="#FB923C" />
                          <span>{m.warrior_name}</span>
                        </span>
                        <span className="mm-public-id-badge">
                          <AppIcon name="badge" size={10} color="#64748B" />
                          <span>{m.public_user_id}</span>
                        </span>
                      </div>
                    </td>

                    {/* Single Course Track */}
                    <td>
                      {renderCourseTrack(m)}
                    </td>

                    {/* Performance & Trends */}
                    <td>
                      <div className="mm-table-stats-cell">
                        <div className="mm-table-stats-row">
                          <span className={`mm-mini-accuracy-chip ${metrics.accuracy >= 70 ? 'high' : metrics.accuracy > 0 ? 'medium' : 'zero'}`}>
                            <AppIcon
                              name="gpsFixed"
                              size={11}
                              color={metrics.accuracy >= 70 ? '#34D399' : metrics.accuracy > 0 ? '#FBBF24' : '#94A3B8'}
                            />
                            <span>{metrics.accuracy > 0 ? `${metrics.accuracy}%` : 'New'}</span>
                          </span>
                          <span style={{ color: '#64748B', fontSize: '0.7rem' }}>
                            {metrics.solved > 0 ? `${metrics.solved} Qs` : '0 Qs'}
                          </span>
                        </div>
                        <div className="mm-mini-bar-bg">
                          <div
                            className={`mm-mini-bar-fill ${metrics.accuracy >= 70 ? 'high' : metrics.accuracy > 0 ? 'medium' : 'zero'}`}
                            style={{ width: `${Math.max(metrics.accuracy, isSuper ? 100 : 10)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td>
                      <div className="mm-contact-cell">
                        {m.email ? (
                          <div className="mm-contact-row" title={m.email}>
                            <span className="mm-contact-icon">
                              <AppIcon name="mail" size={11} color="#94A3B8" />
                            </span>
                            <span>{m.email}</span>
                          </div>
                        ) : null}
                        {m.phone ? (
                          <div className="mm-contact-row" style={{ color: '#94A3B8' }} title={m.phone}>
                            <span className="mm-contact-icon">
                              <AppIcon name="phone" size={11} color="#94A3B8" />
                            </span>
                            <span>{m.phone}</span>
                          </div>
                        ) : null}
                        {!m.email && !m.phone && (
                          <span style={{ color: '#64748B' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`mm-status-indicator ${m.status.toLowerCase()}`}>
                        <span className={`mm-status-dot ${m.status.toLowerCase()}`} />
                        <span>{m.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="mm-table-actions">
                        <button
                          type="button"
                          className="mm-btn-compact primary-tint"
                          onClick={() => handleOpenResetPassword(m)}
                          title="Reset password & copy credentials"
                        >
                          <AppIcon name="key" size={12} />
                          <span>Pass</span>
                        </button>

                        <button
                          type="button"
                          className="mm-btn-compact"
                          onClick={() => handleOpenEditModal(m)}
                          title="Edit profile"
                        >
                          <AppIcon name="edit" size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="mm-btn-compact icon-only"
                          onClick={() => handleViewAsMember(m)}
                          title="Simulate student dashboard in read-only mode"
                        >
                          <AppIcon name="visibility" size={14} />
                        </button>

                        <button
                          type="button"
                          className="mm-btn-compact icon-only"
                          onClick={() => handleOpenIntelligence(m)}
                          title="View student analytics"
                        >
                          <AppIcon name="insights" size={14} />
                        </button>

                        <div className="mm-action-menu-wrap">
                          <button
                            type="button"
                            className={`mm-btn-compact icon-only${isDropdownOpen ? ' active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdownMemberId(isDropdownOpen ? null : m.id)
                            }}
                            title="More options"
                          >
                            <AppIcon name="more" size={14} />
                          </button>

                          {isDropdownOpen && (
                            <div className="mm-action-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="mm-action-menu-item"
                                onClick={() => handleOpenAccessModal(m)}
                              >
                                <AppIcon name="school" size={14} color="#FB923C" />
                                <span>Change Course Track</span>
                              </button>

                              <button
                                type="button"
                                className="mm-action-menu-item"
                                onClick={() => handleOpenIdentityModal(m)}
                              >
                                <AppIcon name="shield" size={14} color="#38BDF8" />
                                <span>Warrior Identity</span>
                              </button>

                              {isArchived ? (
                                <button
                                  type="button"
                                  className="mm-action-menu-item success"
                                  onClick={() => handleRestoreMember(m)}
                                >
                                  <AppIcon name="restore" size={14} color="#34D399" />
                                  <span>Restore User</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isSuper}
                                  className={`mm-action-menu-item ${isDisabled ? 'success' : 'danger'}`}
                                  onClick={() => handleToggleStatus(m)}
                                >
                                  <AppIcon name="power" size={14} color={isDisabled ? '#34D399' : '#F87171'} />
                                  <span>{isDisabled ? 'Enable User' : 'Disable User'}</span>
                                </button>
                              )}

                              {!isSuper && (
                                <button
                                  type="button"
                                  className="mm-action-menu-item danger"
                                  onClick={() => {
                                    setActiveDropdownMemberId(null)
                                    setDeleteModalMember(m)
                                  }}
                                >
                                  <AppIcon name="delete" size={14} color="#F87171" />
                                  <span>Delete User...</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL 1: ADD USER (Single Course Selection) ─────────────── */}
      {addModalOpen && (
        <div className="mm-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="mm-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Create New User</h2>
            <p className="mm-modal-sub">
              Creates credentials in Supabase Auth & registers student in Supabase user_profiles.
            </p>
            <form onSubmit={handleCreateMember}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="mm-form-group">
                  <label className="mm-form-label">Full Name *</label>
                  <input
                    type="text"
                    className="mm-form-input"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>

                <div className="mm-form-group">
                  <label className="mm-form-label">User ID / Username *</label>
                  <input
                    type="text"
                    className="mm-form-input"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toUpperCase())}
                    placeholder="e.g. RAHUL10"
                    required
                  />
                </div>
              </div>

              {/* Password Fields & Auto-Generator */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="mm-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="mm-form-label" style={{ margin: 0 }}>Password *</label>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#FB923C', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        const p = generateStrongPassword()
                        setNewPassword(p)
                        setNewConfirmPassword(p)
                      }}
                    >
                      <AppIcon name="key" size={13} />
                      <span>Generate Password</span>
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="mm-form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      <AppIcon name={showNewPassword ? 'visibilityOff' : 'visibility'} size={16} />
                    </button>
                  </div>
                </div>

                <div className="mm-form-group">
                  <label className="mm-form-label">Confirm Password *</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="mm-form-input"
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="mm-form-group">
                  <label className="mm-form-label">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    className="mm-form-input"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div className="mm-form-group">
                  <label className="mm-form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="mm-form-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="mm-form-group">
                  <label className="mm-form-label">Role</label>
                  <select
                    className="mm-form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="MEMBER">MEMBER (Student - 1 Course)</option>
                    <option value="FACULTY">FACULTY (Instructor)</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN (All Courses)</option>
                  </select>
                </div>

                <div className="mm-form-group">
                  <label className="mm-form-label">Initial Status</label>
                  <select
                    className="mm-form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              {/* Single Academic Course Track Assignment */}
              {newRole !== 'SUPER_ADMIN' ? (
                <div className="mm-form-group">
                  <label className="mm-form-label">
                    Allotted Academic Course Track (1 Course) *
                  </label>
                  <div className="mm-course-radio-group">
                    {workspaces.map((w) => {
                      const isSelected = newAssignedCourseId === w.id
                      return (
                        <div
                          key={w.id}
                          className={`mm-course-radio-card${isSelected ? ' selected' : ''}`}
                          onClick={() => setNewAssignedCourseId(w.id)}
                        >
                          <div className="mm-course-radio-left">
                            <input
                              type="radio"
                              name="add_user_course"
                              checked={isSelected}
                              onChange={() => setNewAssignedCourseId(w.id)}
                            />
                            <div>
                              <div className="mm-course-radio-title">{w.name}</div>
                              <div className="mm-course-radio-sub">{w.level || 'Course'} • Exam: {w.examProfile || 'Standard'}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ color: '#FB923C', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AppIcon name="check" size={13} /> Selected
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '14px', fontSize: '0.82rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AppIcon name="hundred" size={16} color="#38BDF8" />
                  <span><b>Super Admin Role:</b> Automatically granted universal access to all academic courses.</span>
                </div>
              )}

              {/* Quick Copy Credentials Button for Admin Delivery */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '8px 12px', background: 'rgba(234, 88, 12, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
                <span style={{ fontSize: '0.78rem', color: '#FB923C' }}>
                  Temporary credentials can be copied now to send to the student.
                </span>
                <button
                  type="button"
                  className="mm-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  onClick={() => {
                    const cName = resolveCourseName(newAssignedCourseId, workspaces)
                    handleCopyCredentials(newUsername, newPassword, cName)
                  }}
                >
                  <AppIcon name="copy" size={13} />
                  <span>Copy Credentials</span>
                </button>
              </div>

              <div className="mm-modal-actions">
                <button
                  type="button"
                  className="mm-btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RESET PASSWORD ─────────────────────────────────── */}
      {resetPasswordModalMember && (
        <div className="mm-modal-overlay" onClick={() => setResetPasswordModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Reset Password: {resetPasswordModalMember.display_name}</h2>
            <p className="mm-modal-sub">
              Updates password in Supabase Auth for User ID: <b>@{resetPasswordModalMember.username}</b>.
            </p>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="mm-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="mm-form-label" style={{ margin: 0 }}>New Password *</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#FB923C', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const p = generateStrongPassword()
                      setResetPasswordValue(p)
                      setResetConfirmPasswordValue(p)
                    }}
                  >
                    <AppIcon name="key" size={13} />
                    <span>Generate Password</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    className="mm-form-input"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    <AppIcon name={showResetPassword ? 'visibilityOff' : 'visibility'} size={16} />
                  </button>
                </div>
              </div>

              <div className="mm-form-group">
                <label className="mm-form-label">Confirm New Password *</label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  className="mm-form-input"
                  value={resetConfirmPasswordValue}
                  onChange={(e) => setResetConfirmPasswordValue(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(234, 88, 12, 0.08)', borderRadius: '8px', border: '1px solid rgba(234, 88, 12, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#FB923C' }}>
                  Copy to send to student:
                </span>
                <button
                  type="button"
                  className="mm-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  onClick={() => {
                    const cName = resolveCourseName(resetPasswordModalMember.assigned_course_id || resetPasswordModalMember.assigned_courses?.[0], workspaces)
                    handleCopyCredentials(resetPasswordModalMember.username, resetPasswordValue, cName)
                  }}
                >
                  <AppIcon name="copy" size={13} />
                  <span>Copy Credentials</span>
                </button>
              </div>

              <div className="mm-modal-actions">
                <button
                  type="button"
                  className="mm-btn-secondary"
                  onClick={() => setResetPasswordModalMember(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT USER PROFILE ──────────────────────────────── */}
      {editModalMember && (
        <div className="mm-modal-overlay" onClick={() => setEditModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Edit User: {editModalMember.display_name}</h2>
            <p className="mm-modal-sub">Update profile details, role, contact info, and course assignment.</p>
            <form onSubmit={handleSaveEditUser}>
              <div className="mm-form-group">
                <label className="mm-form-label">Full Name</label>
                <input
                  type="text"
                  className="mm-form-input"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="mm-form-group">
                <label className="mm-form-label">Mobile Number</label>
                <input
                  type="tel"
                  className="mm-form-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="mm-form-group">
                <label className="mm-form-label">Email</label>
                <input
                  type="email"
                  className="mm-form-input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mm-form-group">
                  <label className="mm-form-label">Role</label>
                  <select
                    className="mm-form-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={editModalMember.username === 'adminalpha'}
                  >
                    <option value="MEMBER">MEMBER (Student)</option>
                    <option value="FACULTY">FACULTY</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  </select>
                </div>

                <div className="mm-form-group">
                  <label className="mm-form-label">Status</label>
                  <select
                    className="mm-form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={editModalMember.username === 'adminalpha'}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              {editRole !== 'SUPER_ADMIN' && (
                <div className="mm-form-group">
                  <label className="mm-form-label">Allotted Academic Course (1 Course Allowed)</label>
                  <select
                    className="mm-form-select"
                    value={editAssignedCourseId}
                    onChange={(e) => setEditAssignedCourseId(e.target.value)}
                  >
                    <option value="">-- Select Course --</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mm-modal-actions">
                <button
                  type="button"
                  className="mm-btn-secondary"
                  onClick={() => setEditModalMember(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mm-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE CONFIRMATION ────────────────────────────── */}
      {deleteModalMember && (
        <div className="mm-modal-overlay" onClick={() => setDeleteModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title" style={{ color: '#F87171' }}>Delete User Account</h2>
            <p className="mm-modal-sub">
              Are you sure you want to remove <b>{deleteModalMember.display_name}</b> (@{deleteModalMember.username})?
            </p>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '16px', fontSize: '0.82rem', color: '#CBD5E1' }}>
              • <b>Archive (Recommended)</b>: Disables account and preserves question history.<br />
              • <b>Permanent Delete</b>: Completely removes user record from Supabase.
            </div>
            <div className="mm-modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="mm-btn-secondary"
                onClick={() => setDeleteModalMember(null)}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="mm-btn-secondary"
                  onClick={() => handleConfirmDelete(false)}
                >
                  <AppIcon name="folder" size={14} />
                  <span>Archive User</span>
                </button>
                <button
                  type="button"
                  className="mm-btn-primary"
                  style={{ background: '#DC2626', borderColor: '#DC2626' }}
                  onClick={() => handleConfirmDelete(true)}
                >
                  <AppIcon name="delete" size={14} />
                  <span>Permanently Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: SINGLE COURSE ACCESS ALLOTMENT ─────────────────── */}
      {accessModalMember && (
        <div className="mm-modal-overlay" onClick={() => setAccessModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Allot Course Track: {accessModalMember.display_name}</h2>
            <p className="mm-modal-sub">
              Select the <b>single academic course track</b> this student is enrolled in.
            </p>

            <div className="mm-form-group">
              <label className="mm-form-label">Select Course Track (1 Allowed)</label>
              <div className="mm-course-radio-group">
                {workspaces.map((w) => {
                  const currentCourseId = accessModalMember.assigned_course_id || accessModalMember.assigned_courses?.[0]
                  const isSelected = currentCourseId === w.id
                  return (
                    <div
                      key={w.id}
                      className={`mm-course-radio-card${isSelected ? ' selected' : ''}`}
                      onClick={() => handleSaveAccess(w.id)}
                    >
                      <div className="mm-course-radio-left">
                        <input
                          type="radio"
                          name="access_single_course"
                          checked={isSelected}
                          onChange={() => handleSaveAccess(w.id)}
                        />
                        <div>
                          <div className="mm-course-radio-title">{w.name}</div>
                          <div className="mm-course-radio-sub">{w.level || 'Course'} • Exam: {w.examProfile || 'Standard'}</div>
                        </div>
                      </div>
                      {isSelected ? (
                        <span style={{ color: '#FB923C', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AppIcon name="check" size={13} /> Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="mm-btn-compact"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveAccess(w.id)
                          }}
                        >
                          Switch to this
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mm-modal-actions">
              <button
                type="button"
                className="mm-btn-secondary"
                onClick={() => setAccessModalMember(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: IDENTITY REASSIGNMENT & AUDIT ──────────────────── */}
      {identityModalMember && (
        <div className="mm-modal-overlay" onClick={() => setIdentityModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Reassign Warrior Identity</h2>
            <p className="mm-modal-sub">Internal UUID is preserved. Historical question attempts remain permanently intact.</p>
            <div className="mm-form-group">
              <label className="mm-form-label">Warrior Name</label>
              <input
                type="text"
                className="mm-form-input"
                value={targetWarriorName}
                onChange={(e) => setTargetWarriorName(e.target.value)}
                style={{ color: '#FB923C', fontWeight: 700 }}
              />
            </div>
            <div className="mm-form-group">
              <label className="mm-form-label">Public User ID</label>
              <input
                type="text"
                className="mm-form-input"
                value={targetPublicId}
                onChange={(e) => setTargetPublicId(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="mm-form-group">
              <label className="mm-form-label">Reason for Reassignment (Audit Trail)</label>
              <input
                type="text"
                className="mm-form-input"
                value={identityReason}
                onChange={(e) => setIdentityReason(e.target.value)}
                placeholder="e.g. Identity change requested"
              />
            </div>
            {identityAuditLogs.length > 0 && (
              <div style={{ marginBottom: '16px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '10px 12px', maxHeight: '130px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Past Identity Changes:</div>
                {identityAuditLogs.map((log) => (
                  <div key={log.id} style={{ fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '4px' }}>
                    • {new Date(log.created_at).toLocaleDateString()}: <b>{log.old_warrior_name}</b> ➔ <b>{log.new_warrior_name}</b> ({log.reason})
                  </div>
                ))}
              </div>
            )}
            <div className="mm-modal-actions">
              <button
                type="button"
                className="mm-btn-secondary"
                onClick={() => setIdentityModalMember(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="mm-btn-primary"
                onClick={handleSaveIdentity}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 7: PERFORMANCE INTELLIGENCE ──────────────────────── */}
      {intelligenceModalMember && (
        <div className="mm-modal-overlay" onClick={() => setIntelligenceModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Learning Stats: {intelligenceModalMember.warrior_name}</h2>
            <p className="mm-modal-sub">Student test accuracy, readiness metrics, and recent practice sessions.</p>
            {memberAnalytics ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>READINESS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FB923C', marginTop: '3px' }}>{memberAnalytics.readinessScore}%</div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>ACCURACY</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: '3px' }}>{memberAnalytics.accuracy}%</div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>SOLVED</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', marginTop: '3px' }}>{memberAnalytics.totalQuestionsAttempted}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Strong Areas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberAnalytics.strongAreas?.length > 0 ? (
                      memberAnalytics.strongAreas.map((s) => (
                        <span key={s} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', padding: '2px 7px', borderRadius: '5px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AppIcon name="check" size={11} color="#34D399" />
                          <span>{s}</span>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>No strong areas flagged yet.</span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Focus Areas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberAnalytics.weakAreas?.length > 0 ? (
                      memberAnalytics.weakAreas.map((w) => (
                        <span key={w} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', padding: '2px 7px', borderRadius: '5px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AppIcon name="warning" size={11} color="#F87171" />
                          <span>{w}</span>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>No focus areas flagged yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Recent Attempts ({memberAttempts.length}):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {memberAttempts.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>No practice tests recorded yet.</div>
                    ) : memberAttempts.slice(-5).reverse().map((att) => (
                      <div key={att.id} style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '7px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: '#CBD5E1' }}>{att.chapter_title || att.subject_title || 'Practice Set'}</span>
                        <span style={{ fontWeight: 700, color: (att.accuracy || 0) >= 60 ? '#34D399' : '#F87171' }}>
                          {att.accuracy || 0}% ({att.correct_count || 0}/{att.attempted_count || 0})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8', fontSize: '0.86rem' }}>Loading metrics...</div>
            )}
            <div className="mm-modal-actions">
              <button
                type="button"
                className="mm-btn-primary"
                onClick={() => setIntelligenceModalMember(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
