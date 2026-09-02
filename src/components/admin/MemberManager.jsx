/**
 * MemberManager.jsx
 * Comprehensive Super Admin Member Management, Access Control & Audit Center.
 *
 * Implements:
 * 1. Member Directory with Warrior Identities & Public User IDs.
 * 2. Unlimited Member Creation & Scalability.
 * 3. Course-Wise Access & Granular Subject/Content-Type Permissions.
 * 4. Production Identity Manipulation (with audit logging & confirmation).
 * 5. [ View as Member ] Read-Only Experience Mode.
 * 6. Member Performance Intelligence Inspection.
 * 7. Active / Disabled / Archived Status Controls (Soft Delete).
 * 8. Super Admin Lockout Protection (adminalpha cannot be disabled/archived/deleted).
 * 9. Comprehensive Admin Audit Log Viewer Modal.
 */

import { useState, useEffect, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import { memberService } from '../../services/memberService'
import { identityService, WARRIOR_TITLES } from '../../services/identityService'
import { permissionService, CONTENT_TYPES } from '../../services/permissionService'
import { auditService } from '../../services/auditService'
import { useMemberStore, setViewAsMember, hydrateMemberStore } from '../../data/memberStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { userAnalyticsService } from '../../services/userAnalyticsService'
import { showToast } from '../../data/feedbackStore'

export default function MemberManager({ onNavigateStudentView = () => {} }) {
  const { membersList } = useMemberStore()
  const { workspaces } = useWorkspaceStore()
  const [members, setMembers] = useState(membersList)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [accessModalMember, setAccessModalMember] = useState(null)
  const [identityModalMember, setIdentityModalMember] = useState(null)
  const [intelligenceModalMember, setIntelligenceModalMember] = useState(null)
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null)
  const [auditModalOpen, setAuditModalOpen] = useState(false)

  // Add Member Form
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newAssignedCourses, setNewAssignedCourses] = useState([])
  const [newWarriorName, setNewWarriorName] = useState('')
  const [newPublicId, setNewPublicId] = useState('')

  // Identity Modal Form
  const [targetPublicId, setTargetPublicId] = useState('')
  const [targetWarriorName, setTargetWarriorName] = useState('')
  const [identityReason, setIdentityReason] = useState('')
  const [identityAuditLogs, setIdentityAuditLogs] = useState([])

  // Intelligence State
  const [memberAnalytics, setMemberAnalytics] = useState(null)
  const [memberAttempts, setMemberAttempts] = useState([])

  // Comprehensive Audit Log Viewer State
  const [allAuditLogs, setAllAuditLogs] = useState([])
  const [auditFilterType, setAuditFilterType] = useState('ALL')
  const [auditSearch, setAuditSearch] = useState('')

  useEffect(() => {
    setMembers(membersList)
  }, [membersList])

  const refreshList = async () => {
    setLoading(true)
    await hydrateMemberStore()
    const res = await memberService.getAllMembers(true)
    if (res.success) setMembers(res.data)
    setLoading(false)
  }

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterStatus === 'ACTIVE' && m.status !== 'ACTIVE') return false
      if (filterStatus === 'DISABLED' && m.status !== 'DISABLED') return false
      if (filterStatus === 'ARCHIVED' && m.status !== 'ARCHIVED') return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        m.display_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.warrior_name?.toLowerCase().includes(q) ||
        m.public_user_id?.toLowerCase().includes(q)
      )
    })
  }, [members, filterStatus, searchQuery])

  // Stats
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length
  const disabledCount = members.filter((m) => m.status === 'DISABLED').length
  const archivedCount = members.filter((m) => m.status === 'ARCHIVED').length

  // Handlers
  const handleOpenAdd = () => {
    setNewUsername(`MEMBER${String(members.length + 1).padStart(2, '0')}`)
    setNewDisplayName('')
    setNewEmail('')
    setNewAssignedCourses(workspaces.length > 0 ? [workspaces[0].id] : ['bpsc_prelims'])
    setNewWarriorName(identityService.generateWarriorName(members))
    setNewPublicId(identityService.generatePublicId(members))
    setAddModalOpen(true)
  }

  const handleCreateMember = async (e) => {
    e.preventDefault()
    if (!newUsername.trim()) {
      showToast({ type: 'warning', title: 'Username Required', message: 'Please provide a username.' })
      return
    }

    const res = await memberService.createMember({
      username: newUsername,
      display_name: newDisplayName || newUsername,
      email: newEmail,
      assigned_courses: newAssignedCourses,
      custom_public_id: newPublicId,
      custom_warrior_name: newWarriorName,
    })

    if (res.success) {
      showToast({ type: 'success', title: 'Member Created', message: `Created ${res.data.display_name} (${res.data.warrior_name}).` })
      setAddModalOpen(false)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Creation Failed', message: res.error })
    }
  }

  const handleToggleStatus = async (member) => {
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

  const handleArchiveMember = async (member) => {
    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      showToast({ type: 'warning', title: 'Protected Account', message: 'Super Admin cannot be archived.' })
      return
    }
    const res = await memberService.archiveMember(member.id)
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Member Archived',
        message: `${member.display_name} has been archived (soft-deleted). All data is preserved.`,
      })
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Failed to Archive', message: res.error })
    }
  }

  const handleRestoreMember = async (member) => {
    const res = await memberService.restoreMember(member.id)
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Member Restored',
        message: `${member.display_name} has been restored to ACTIVE status.`,
      })
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Failed to Restore', message: res.error })
    }
  }

  const handleOpenIdentityModal = async (member) => {
    setIdentityModalMember(member)
    setTargetPublicId(member.public_user_id)
    setTargetWarriorName(member.warrior_name)
    setIdentityReason('Super Admin Reassignment')
    const logs = await identityService.getIdentityAuditLogs(member.id)
    setIdentityAuditLogs(logs)
  }

  const handleSaveIdentity = async () => {
    if (!identityModalMember) return

    const res = await memberService.updatePublicIdentity({
      memberId: identityModalMember.id,
      newPublicId: targetPublicId,
      newWarriorName: targetWarriorName,
      changedBy: 'adminalpha',
      reason: identityReason,
    })

    if (res.success) {
      showToast({
        type: 'success',
        title: 'Identity Reassigned',
        message: `Updated identity to ${res.data.warrior_name} (${res.data.public_user_id}). Historical data remains preserved.`,
      })
      setIdentityModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Identity Update Failed', message: res.error })
    }
  }

  const handleOpenAccessModal = (member) => {
    setAccessModalMember({ ...member })
  }

  const handleSaveAccess = async () => {
    if (!accessModalMember) return
    const res = await memberService.updateMember(accessModalMember.id, {
      assigned_courses: accessModalMember.assigned_courses,
      permissions: accessModalMember.permissions,
    })
    if (res.success) {
      showToast({ type: 'success', title: 'Access Updated', message: `Permissions saved for ${accessModalMember.display_name}.` })
      setAccessModalMember(null)
      refreshList()
    } else {
      showToast({ type: 'error', title: 'Failed to Save Access', message: res.error })
    }
  }

  const handleOpenIntelligence = async (member) => {
    setIntelligenceModalMember(member)
    setMemberAnalytics(null)
    const firstCourse = member.assigned_courses?.[0] || 'course_default'
    const [analytics, attempts] = await Promise.all([
      userAnalyticsService.computeCourseAnalytics(member.id, firstCourse),
      userAnalyticsService.getUserAttempts(member.id, firstCourse),
    ])
    setMemberAnalytics(analytics)
    setMemberAttempts(attempts)
  }

  const handleViewAsMember = (member) => {
    setViewAsMember(member)
    showToast({
      type: 'info',
      title: '👁️ Read-Only View Mode Active',
      message: `Now viewing student dashboard as ${member.warrior_name} (${member.display_name}). Actions will not alter student data.`,
    })
    onNavigateStudentView()
  }

  const handleOpenAuditLogs = async () => {
    setAuditModalOpen(true)
    const logs = await auditService.getAuditLogs()
    setAllAuditLogs(logs)
  }

  return (
    <div className="admin-page-container" style={{ padding: '24px', color: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Member Management & Access Control
          </h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.94rem' }}>
            Manage course access, granular subject/content permissions, and Warrior identities for all members.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleOpenAuditLogs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.06)',
              color: '#F8FAFC',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>📜</span>
            Audit Logs
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #F1621B 0%, #D9480F 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(241, 98, 27, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <span>+</span>
            Add Member
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Total Profiles</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF' }}>{members.length}</div>
        </div>
        <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#12B76A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Active Members</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#12B76A' }}>{activeCount}</div>
        </div>
        <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#F04438', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Disabled</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F04438' }}>{disabledCount}</div>
        </div>
        <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: '#E2E8F0', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Archived</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94A3B8' }}>{archivedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'ACTIVE', 'DISABLED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                background: filterStatus === st ? '#F1621B' : '#181716',
                color: filterStatus === st ? '#FFF' : '#94A3B8',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by name, warrior title, public ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: '#181716',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            width: '320px',
            outline: 'none',
          }}
        />
      </div>

      {/* Member Directory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredMembers.map((m) => {
          const isSuper = m.role === 'SUPER_ADMIN' || m.username === 'adminalpha'
          const isArchived = m.status === 'ARCHIVED'
          const isDisabled = m.status === 'DISABLED'

          return (
            <div
              key={m.id}
              style={{
                background: isArchived ? 'rgba(24, 23, 22, 0.4)' : '#181716',
                border: isSuper ? '1px solid rgba(241, 98, 27, 0.5)' : isArchived ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                opacity: isArchived ? 0.75 : 1,
              }}
            >
              <div>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {m.display_name || m.username}
                      {isSuper && (
                        <span style={{ background: 'linear-gradient(90deg, #F1621B, #D9480F)', color: '#FFF', fontSize: '0.66rem', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                          👑 SUPER ADMIN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                      @{m.username} • {m.email}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: m.status === 'ACTIVE' ? 'rgba(18, 183, 106, 0.15)' : isArchived ? 'rgba(148, 163, 184, 0.15)' : 'rgba(240, 68, 56, 0.15)',
                      color: m.status === 'ACTIVE' ? '#12B76A' : isArchived ? '#94A3B8' : '#F04438',
                    }}
                  >
                    {m.status}
                  </span>
                </div>

                {/* Warrior Badge */}
                <div
                  style={{
                    background: 'rgba(241, 98, 27, 0.08)',
                    border: '1px solid rgba(241, 98, 27, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem' }}>⚔️</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F1621B', letterSpacing: '0.04em' }}>
                      {m.warrior_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#CBD5E1', fontFamily: 'monospace', fontWeight: 700 }}>
                    {m.public_user_id}
                  </span>
                </div>

                {/* Course Access Badges */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    Assigned Courses ({m.assigned_courses?.includes('*') ? 'All Courses' : m.assigned_courses?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.assigned_courses?.includes('*') ? (
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: '#F8FAFC', fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px' }}>
                        🌐 Global Access (All Courses)
                      </span>
                    ) : (m.assigned_courses || []).map((cid) => {
                      const course = workspaces.find((w) => w.id === cid)
                      return (
                        <span key={cid} style={{ background: 'rgba(255,255,255,0.06)', color: '#E2E8F0', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px' }}>
                          📚 {course?.name || cid}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleViewAsMember(m)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  👁️ View As
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAccessModal(m)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔐 Access
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenIdentityModal(m)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚔️ Identity
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenIntelligence(m)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F8FAFC',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📊 Stats
                </button>

                {/* Archival / Restore Controls (Soft Delete) */}
                {isArchived ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreMember(m)}
                    style={{
                      background: 'rgba(18, 183, 106, 0.15)',
                      color: '#12B76A',
                      border: '1px solid rgba(18, 183, 106, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ♻️ Restore
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isSuper}
                      onClick={() => handleToggleStatus(m)}
                      style={{
                        background: isDisabled ? 'rgba(18, 183, 106, 0.15)' : 'rgba(240, 68, 56, 0.15)',
                        color: isDisabled ? '#12B76A' : '#F04438',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: isSuper ? 'not-allowed' : 'pointer',
                        opacity: isSuper ? 0.4 : 1,
                      }}
                      title={isSuper ? 'Super Admin cannot be disabled' : isDisabled ? 'Reactivate account' : 'Deactivate account'}
                    >
                      {isDisabled ? 'Enable' : 'Disable'}
                    </button>

                    <button
                      type="button"
                      disabled={isSuper}
                      onClick={() => handleArchiveMember(m)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#94A3B8',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: isSuper ? 'not-allowed' : 'pointer',
                        opacity: isSuper ? 0.4 : 1,
                      }}
                      title={isSuper ? 'Super Admin cannot be archived' : 'Archive member (Soft Delete)'}
                    >
                      📦 Archive
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── MODAL 1: ADD MEMBER ────────────────────────────────────────── */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px', color: '#FFF' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem', fontWeight: 800 }}>Add New Member</h2>
            <form onSubmit={handleCreateMember}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Username</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#FFF', fontSize: '0.9rem' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Display Name</label>
                <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#FFF', fontSize: '0.9rem' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Warrior Title (Auto-Generated)</label>
                <input type="text" value={newWarriorName} onChange={(e) => setNewWarriorName(e.target.value)} style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1621B', fontWeight: 800, fontSize: '0.9rem' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Public User ID</label>
                <input type="text" value={newPublicId} onChange={(e) => setNewPublicId(e.target.value)} style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#FFF', fontSize: '0.9rem', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Assign Courses</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {workspaces.map((w) => (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newAssignedCourses.includes(w.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewAssignedCourses([...newAssignedCourses, w.id])
                          else setNewAssignedCourses(newAssignedCourses.filter((id) => id !== w.id))
                        }}
                      />
                      {w.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setAddModalOpen(false)} style={{ background: 'transparent', color: '#94A3B8', border: 'none', padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#F1621B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer' }}>Create Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ACCESS & GRANULAR PERMISSIONS ───────────────────────── */}
      {accessModalMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '560px', color: '#FFF' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800 }}>Manage Access: {accessModalMember.display_name}</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.86rem', marginBottom: '20px' }}>Select assigned courses. Default inheritance allows all subjects and content types.</p>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#F1621B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>Assigned Courses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workspaces.map((w) => {
                  const isAssigned = accessModalMember.assigned_courses?.includes(w.id) || accessModalMember.assigned_courses?.includes('*')
                  return (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={(e) => {
                          const current = accessModalMember.assigned_courses?.filter((c) => c !== '*') || []
                          const updated = e.target.checked ? [...current, w.id] : current.filter((id) => id !== w.id)
                          setAccessModalMember({ ...accessModalMember, assigned_courses: updated })
                        }}
                      />
                      <span>{w.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setAccessModalMember(null)} style={{ background: 'transparent', color: '#94A3B8', border: 'none', padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSaveAccess} style={{ background: '#F1621B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer' }}>Save Permissions</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: IDENTITY REASSIGNMENT & AUDIT ────────────────────────── */}
      {identityModalMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '540px', color: '#FFF' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800 }}>Reassign Warrior Identity</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.84rem', marginBottom: '18px' }}>Internal immutable UUID is preserved. Historical question attempts remain permanently intact.</p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Warrior Name</label>
              <input type="text" value={targetWarriorName} onChange={(e) => setTargetWarriorName(e.target.value)} style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#F1621B', fontWeight: 800, fontSize: '0.9rem' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Public User ID</label>
              <input type="text" value={targetPublicId} onChange={(e) => setTargetPublicId(e.target.value)} style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#FFF', fontSize: '0.9rem', fontFamily: 'monospace' }} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>Reason for Reassignment (Audit Log)</label>
              <input type="text" value={identityReason} onChange={(e) => setIdentityReason(e.target.value)} style={{ width: '100%', background: '#0F0E0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#FFF', fontSize: '0.88rem' }} />
            </div>
            {identityAuditLogs.length > 0 && (
              <div style={{ marginBottom: '18px', background: '#0F0E0D', borderRadius: '8px', padding: '10px 14px', maxHeight: '140px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Past Identity Audit Trail:</div>
                {identityAuditLogs.map((log) => (
                  <div key={log.id} style={{ fontSize: '0.74rem', color: '#CBD5E1', marginBottom: '4px' }}>
                    • {new Date(log.created_at).toLocaleDateString()}: <b>{log.old_warrior_name}</b> ➔ <b>{log.new_warrior_name}</b> ({log.reason})
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIdentityModalMember(null)} style={{ background: 'transparent', color: '#94A3B8', border: 'none', padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSaveIdentity} style={{ background: '#F1621B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer' }}>Confirm Change</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PERFORMANCE INTELLIGENCE ────────────────────────────── */}
      {intelligenceModalMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '620px', color: '#FFF', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800 }}>Intelligence: {intelligenceModalMember.warrior_name} ({intelligenceModalMember.display_name})</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.84rem', marginBottom: '20px' }}>Persistent learning performance loaded from Supabase pipeline.</p>
            {memberAnalytics ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: '#0F0E0D', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700 }}>EXAM READINESS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F1621B', marginTop: '4px' }}>{memberAnalytics.readinessScore}%</div>
                  </div>
                  <div style={{ background: '#0F0E0D', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700 }}>ACCURACY</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#12B76A', marginTop: '4px' }}>{memberAnalytics.accuracy}%</div>
                  </div>
                  <div style={{ background: '#0F0E0D', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700 }}>QUESTIONS SOLVED</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0EA5E9', marginTop: '4px' }}>{memberAnalytics.totalQuestionsAttempted}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Strong Areas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberAnalytics.strongAreas?.map((s) => (
                      <span key={s} style={{ background: 'rgba(18, 183, 106, 0.15)', color: '#12B76A', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem' }}>✓ {s}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Focus Areas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberAnalytics.weakAreas?.map((w) => (
                      <span key={w} style={{ background: 'rgba(240, 68, 56, 0.15)', color: '#F04438', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem' }}>⚠ {w}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, marginBottom: '8px' }}>Recent Attempts ({memberAttempts.length}):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {memberAttempts.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: '#64748B' }}>No practice tests recorded yet.</div>
                    ) : memberAttempts.slice(-5).reverse().map((att) => (
                      <div key={att.id} style={{ background: '#0F0E0D', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>{att.chapter_title || att.subject_title || 'Practice Set'}</span>
                        <span style={{ fontWeight: 700, color: (att.accuracy || 0) >= 60 ? '#12B76A' : '#F04438' }}>{att.accuracy || 0}% ({att.correct_count || 0}/{att.attempted_count || 0})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading metrics...</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" onClick={() => setIntelligenceModalMember(null)} style={{ background: '#F1621B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: COMPLETE ADMIN AUDIT LOG VIEWER ────────────────────────── */}
      {auditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#181716', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '780px', color: '#FFF', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 800 }}>📜 Admin Audit Log Trail</h2>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.84rem' }}>Immutable record of all administrative operations, permission changes, and identity updates.</p>
              </div>
              <button type="button" onClick={() => setAuditModalOpen(false)} style={{ background: 'transparent', color: '#94A3B8', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Filter Row */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                style={{
                  background: '#0F0E0D',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Actions</option>
                <option value="IDENTITY_CHANGE">Identity Changes</option>
                <option value="COURSE_ACCESS_CHANGED">Course Access</option>
                <option value="MEMBER_CREATED">Member Created</option>
                <option value="MEMBER_ACTIVATED">Member Activated</option>
                <option value="MEMBER_DISABLED">Member Disabled</option>
                <option value="MEMBER_ARCHIVED">Member Archived</option>
                <option value="MEMBER_RESTORED">Member Restored</option>
              </select>

              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0F0E0D',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Logs List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allAuditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No audit records found.</div>
              ) : allAuditLogs
                .filter((l) => auditFilterType === 'ALL' || l.action_type === auditFilterType)
                .filter((l) => !auditSearch.trim() || JSON.stringify(l).toLowerCase().includes(auditSearch.toLowerCase()))
                .map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: '#0F0E0D',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(241, 98, 27, 0.15)', color: '#F1621B', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          {log.action_type}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                          Admin: {log.admin_user_id || 'adminalpha'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '2px' }}>
                      {log.old_value && log.new_value ? (
                        <span>
                          <span style={{ color: '#94A3B8' }}>Changed from:</span> <b>{String(log.old_value)}</b> ➔ <span style={{ color: '#94A3B8' }}>To:</span> <b style={{ color: '#12B76A' }}>{String(log.new_value)}</b>
                        </span>
                      ) : log.new_value ? (
                        <span><b style={{ color: '#12B76A' }}>{String(log.new_value)}</b></span>
                      ) : (
                        <span>{log.reason || 'Administrative action executed'}</span>
                      )}
                    </div>

                    {log.reason && (
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setAuditModalOpen(false)} style={{ background: '#F1621B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 800, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
