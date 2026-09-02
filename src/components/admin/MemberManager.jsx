/**
 * MemberManager.jsx
 * Clean, calm & fully responsive Super Admin Member Management & Access Control.
 * Calms vibrating colors to an elegant slate & neutral dark palette.
 */

import { useState, useEffect, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import { memberService } from '../../services/memberService'
import { identityService } from '../../services/identityService'
import { permissionService } from '../../services/permissionService'
import { auditService } from '../../services/auditService'
import { useMemberStore, setViewAsMember, hydrateMemberStore } from '../../data/memberStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { userAnalyticsService } from '../../services/userAnalyticsService'
import { showToast } from '../../data/feedbackStore'
import '../../styles/memberManager.css'

export default function MemberManager({ onNavigateStudentView = () => {} }) {
  const { membersList } = useMemberStore()
  const { workspaces } = useWorkspaceStore()
  const [members, setMembers] = useState(membersList)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL') // 'ALL' | courseId | 'UNASSIGNED'
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' | 'grid'

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [accessModalMember, setAccessModalMember] = useState(null)
  const [identityModalMember, setIdentityModalMember] = useState(null)
  const [intelligenceModalMember, setIntelligenceModalMember] = useState(null)
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

  // Course Member Counts
  const courseMemberCounts = useMemo(() => {
    const counts = {}
    workspaces.forEach((w) => {
      counts[w.id] = members.filter((m) =>
        m.assigned_courses?.includes('*') || m.assigned_courses?.includes(w.id)
      ).length
    })
    counts['UNASSIGNED'] = members.filter(
      (m) => !m.assigned_courses || m.assigned_courses.length === 0
    ).length
    return counts
  }, [members, workspaces])

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterStatus === 'ACTIVE' && m.status !== 'ACTIVE') return false
      if (filterStatus === 'DISABLED' && m.status !== 'DISABLED') return false
      if (filterStatus === 'ARCHIVED' && m.status !== 'ARCHIVED') return false

      if (selectedCourseFilter !== 'ALL') {
        if (selectedCourseFilter === 'UNASSIGNED') {
          if (m.assigned_courses && m.assigned_courses.length > 0) return false
        } else {
          const hasAccess =
            m.assigned_courses?.includes('*') || m.assigned_courses?.includes(selectedCourseFilter)
          if (!hasAccess) return false
        }
      }

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        m.display_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.warrior_name?.toLowerCase().includes(q) ||
        m.public_user_id?.toLowerCase().includes(q)
      )
    })
  }, [members, filterStatus, selectedCourseFilter, searchQuery])

  // Stats
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length
  const disabledCount = members.filter((m) => m.status === 'DISABLED').length
  const archivedCount = members.filter((m) => m.status === 'ARCHIVED').length

  // Handlers
  const handleOpenAdd = (presetCourseId = null) => {
    setNewUsername(`MEMBER${String(members.length + 1).padStart(2, '0')}`)
    setNewDisplayName('')
    setNewEmail('')
    if (presetCourseId) {
      setNewAssignedCourses([presetCourseId])
    } else if (selectedCourseFilter !== 'ALL' && selectedCourseFilter !== 'UNASSIGNED') {
      setNewAssignedCourses([selectedCourseFilter])
    } else {
      setNewAssignedCourses(workspaces.length > 0 ? [workspaces[0].id] : ['bpsc_prelims'])
    }
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
        message: `${member.display_name} has been archived. All records preserved.`,
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
        message: `Updated identity to ${res.data.warrior_name} (${res.data.public_user_id}). Historical test data preserved.`,
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
      title: '👁️ Read-Only View Active',
      message: `Viewing student dashboard as ${member.warrior_name} (${member.display_name}).`,
    })
    onNavigateStudentView()
  }

  const handleOpenAuditLogs = async () => {
    setAuditModalOpen(true)
    const logs = await auditService.getAuditLogs()
    setAllAuditLogs(logs)
  }

  // Render individual member card
  const renderMemberCard = (m) => {
    const isSuper = m.role === 'SUPER_ADMIN' || m.username === 'adminalpha'
    const isArchived = m.status === 'ARCHIVED'
    const isDisabled = m.status === 'DISABLED'

    return (
      <div
        key={m.id}
        className={`mm-card${isSuper ? ' super-admin' : ''}${isArchived ? ' archived' : ''}`}
      >
        <div>
          {/* Header Row */}
          <div className="mm-card-header">
            <div className="mm-card-name-block">
              <div className="mm-card-name" title={m.display_name || m.username}>
                <span>{m.display_name || m.username}</span>
                {isSuper && <span className="mm-role-badge">SUPER ADMIN</span>}
              </div>
              <div className="mm-card-meta">
                @{m.username} {m.email ? `• ${m.email}` : ''}
              </div>
            </div>

            <span className={`mm-status-pill ${m.status.toLowerCase()}`}>
              {m.status}
            </span>
          </div>

          {/* Warrior Badge */}
          <div className="mm-warrior-row">
            <div className="mm-warrior-title">
              <span>⚔️</span>
              <span>{m.warrior_name}</span>
            </div>
            <span className="mm-public-id">{m.public_user_id}</span>
          </div>

          {/* Course Allotment Badges */}
          <div className="mm-allotment-block">
            <div className="mm-allotment-header">
              <span className="mm-allotment-label">
                Allotted ({m.assigned_courses?.includes('*') ? 'All Courses' : m.assigned_courses?.length || 0}):
              </span>
              <button
                type="button"
                className="mm-allotment-edit-btn"
                onClick={() => handleOpenAccessModal(m)}
              >
                + Edit Allotment
              </button>
            </div>

            <div className="mm-allotment-list">
              {m.assigned_courses?.includes('*') ? (
                <span className="mm-course-chip global">
                  🌐 Global (All Courses)
                </span>
              ) : !m.assigned_courses || m.assigned_courses.length === 0 ? (
                <span className="mm-course-chip none">
                  ⚠️ No Course Allotted
                </span>
              ) : (
                (m.assigned_courses || []).map((cid) => {
                  const course = workspaces.find((w) => w.id === cid)
                  return (
                    <span key={cid} className="mm-course-chip">
                      <span>📚</span>
                      <span>{course?.name || cid}</span>
                    </span>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mm-card-actions">
          <button
            type="button"
            className="mm-action-btn view-as"
            onClick={() => handleViewAsMember(m)}
            title="Simulate student dashboard in read-only mode"
          >
            👁️ View
          </button>

          <button
            type="button"
            className="mm-action-btn access"
            onClick={() => handleOpenAccessModal(m)}
            title="Edit course allotments & permissions"
          >
            🔐 Access
          </button>

          <button
            type="button"
            className="mm-action-btn"
            onClick={() => handleOpenIdentityModal(m)}
            title="Reassign warrior title or public ID"
          >
            ⚔️ Identity
          </button>

          <button
            type="button"
            className="mm-action-btn"
            onClick={() => handleOpenIntelligence(m)}
            title="View learning stats & attempts"
          >
            📊 Stats
          </button>

          {isArchived ? (
            <button
              type="button"
              className="mm-action-btn success"
              onClick={() => handleRestoreMember(m)}
              title="Restore archived member"
            >
              ♻️ Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSuper}
                className={`mm-action-btn ${isDisabled ? 'success' : 'danger'}`}
                onClick={() => handleToggleStatus(m)}
                title={isSuper ? 'Super Admin cannot be disabled' : isDisabled ? 'Reactivate member' : 'Deactivate member'}
              >
                {isDisabled ? 'Enable' : 'Disable'}
              </button>

              <button
                type="button"
                disabled={isSuper}
                className="mm-action-btn"
                onClick={() => handleArchiveMember(m)}
                title={isSuper ? 'Super Admin cannot be archived' : 'Archive member'}
              >
                📦 Archive
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mm-container">
      {/* Header */}
      <div className="mm-header">
        <div>
          <h1 className="mm-header-title">
            Member Management & Access Control
          </h1>
          <p className="mm-header-sub">
            Manage student course allotments, granular permissions, and Warrior identities.
          </p>
        </div>

        <div className="mm-header-actions">
          <button
            type="button"
            className="mm-btn-secondary"
            onClick={handleOpenAuditLogs}
          >
            <span>📜</span>
            <span>Audit Logs</span>
          </button>

          <button
            type="button"
            className="mm-btn-secondary"
            onClick={refreshList}
            disabled={loading}
            title="Refresh member directory"
          >
            <span>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="mm-btn-primary"
            onClick={() => handleOpenAdd()}
          >
            <span>+</span>
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mm-metrics-grid">
        <div className="mm-metric-card">
          <div className="mm-metric-label">Total Profiles</div>
          <div className="mm-metric-val">{members.length}</div>
        </div>
        <div className="mm-metric-card">
          <div className="mm-metric-label">Active Members</div>
          <div className="mm-metric-val active">{activeCount}</div>
        </div>
        <div className="mm-metric-card">
          <div className="mm-metric-label">Disabled</div>
          <div className="mm-metric-val disabled">{disabledCount}</div>
        </div>
        <div className="mm-metric-card">
          <div className="mm-metric-label">Archived</div>
          <div className="mm-metric-val archived">{archivedCount}</div>
        </div>
      </div>

      {/* Course Allotment Filter Bar */}
      <div className="mm-course-bar">
        <div className="mm-course-bar-top">
          <div className="mm-course-bar-title">
            <span>📚</span>
            <span>Filter by Allotted Course:</span>
          </div>

          <div className="mm-view-toggle">
            <button
              type="button"
              className={`mm-view-btn${viewMode === 'grouped' ? ' active' : ''}`}
              onClick={() => setViewMode('grouped')}
            >
              <span>📑</span>
              <span>Grouped</span>
            </button>
            <button
              type="button"
              className={`mm-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <span>▦</span>
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Course Filter Pills */}
        <div className="mm-course-pills">
          <button
            type="button"
            className={`mm-pill${selectedCourseFilter === 'ALL' ? ' active' : ''}`}
            onClick={() => setSelectedCourseFilter('ALL')}
          >
            <span>🌐 All Courses</span>
            <span className="mm-pill-count">{members.length}</span>
          </button>

          {workspaces.map((w) => {
            const count = courseMemberCounts[w.id] || 0
            const isSelected = selectedCourseFilter === w.id
            return (
              <button
                key={w.id}
                type="button"
                className={`mm-pill${isSelected ? ' active' : ''}`}
                onClick={() => setSelectedCourseFilter(w.id)}
              >
                <span>📚</span>
                <span>{w.name}</span>
                <span className="mm-pill-count">{count}</span>
              </button>
            )
          })}

          {courseMemberCounts['UNASSIGNED'] > 0 && (
            <button
              type="button"
              className={`mm-pill${selectedCourseFilter === 'UNASSIGNED' ? ' active' : ''}`}
              onClick={() => setSelectedCourseFilter('UNASSIGNED')}
            >
              <span>⚠️ Unassigned</span>
              <span className="mm-pill-count">{courseMemberCounts['UNASSIGNED']}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mm-toolbar">
        <div className="mm-status-pills">
          {['ALL', 'ACTIVE', 'DISABLED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`mm-status-btn${filterStatus === st ? ' active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="mm-search-box">
          <input
            type="text"
            className="mm-search-input"
            placeholder="Search by name, warrior title, ID..."
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
      </div>

      {/* ── VIEW MODE 1: GROUPED BY COURSE ──────────────────────────── */}
      {viewMode === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {workspaces
            .filter((w) => selectedCourseFilter === 'ALL' || selectedCourseFilter === w.id)
            .map((w) => {
              const courseMembers = filteredMembers.filter(
                (m) => m.assigned_courses?.includes('*') || m.assigned_courses?.includes(w.id)
              )

              return (
                <div key={w.id} className="mm-course-group">
                  {/* Course Header Banner */}
                  <div className="mm-course-group-header">
                    <div className="mm-course-group-left">
                      <div className="mm-course-group-icon">
                        📚
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 className="mm-course-group-title">{w.name}</h2>
                          <span className="mm-course-group-badge">
                            {courseMembers.length} {courseMembers.length === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                        <div className="mm-course-group-sub">
                          {w.level || 'Course'} • Exam: {w.examProfile || 'Standard'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mm-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleOpenAdd(w.id)}
                    >
                      <span>+</span>
                      <span>Enroll in {w.name.split(' ')[0]}</span>
                    </button>
                  </div>

                  {/* Course Members Grid */}
                  {courseMembers.length > 0 ? (
                    <div className="mm-grid">
                      {courseMembers.map((m) => renderMemberCard(m))}
                    </div>
                  ) : (
                    <div className="mm-empty-state">
                      <div className="mm-empty-icon">👥</div>
                      <div className="mm-empty-title">
                        No members currently allotted to {w.name}
                      </div>
                      <p className="mm-empty-sub">
                        Add a new member directly to this course or use Access controls to assign existing students.
                      </p>
                      <button
                        type="button"
                        className="mm-btn-primary"
                        onClick={() => handleOpenAdd(w.id)}
                      >
                        + Enroll First Member
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

          {/* Unassigned Section */}
          {(selectedCourseFilter === 'ALL' || selectedCourseFilter === 'UNASSIGNED') && (
            (() => {
              const unassignedMembers = filteredMembers.filter(
                (m) => !m.assigned_courses || m.assigned_courses.length === 0
              )
              if (unassignedMembers.length === 0 && selectedCourseFilter !== 'UNASSIGNED') return null

              return (
                <div className="mm-course-group" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <div className="mm-course-group-header">
                    <div className="mm-course-group-left">
                      <div className="mm-course-group-icon" style={{ color: '#F87171' }}>
                        ⚠️
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h2 className="mm-course-group-title" style={{ color: '#F87171' }}>Unassigned Members</h2>
                          <span className="mm-course-group-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5' }}>
                            {unassignedMembers.length} Members
                          </span>
                        </div>
                        <div className="mm-course-group-sub">
                          These members currently do not have any courses allotted to them.
                        </div>
                      </div>
                    </div>
                  </div>

                  {unassignedMembers.length > 0 ? (
                    <div className="mm-grid">
                      {unassignedMembers.map((m) => renderMemberCard(m))}
                    </div>
                  ) : (
                    <div className="mm-empty-state" style={{ padding: '20px' }}>
                      🎉 All members have been allotted to at least one course!
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>
      ) : (
        /* ── VIEW MODE 2: FILTERED GRID ─────────────────────────────── */
        <div>
          <div style={{ marginBottom: '14px', fontSize: '0.84rem', color: '#94A3B8', fontWeight: 600 }}>
            Showing {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
            {selectedCourseFilter !== 'ALL' && (
              <span style={{ color: '#FB923C', marginLeft: '6px' }}>
                • Course: {workspaces.find((w) => w.id === selectedCourseFilter)?.name || selectedCourseFilter}
              </span>
            )}
          </div>

          {filteredMembers.length > 0 ? (
            <div className="mm-grid">
              {filteredMembers.map((m) => renderMemberCard(m))}
            </div>
          ) : (
            <div className="mm-empty-state">
              <div className="mm-empty-icon">🔍</div>
              <div className="mm-empty-title">No Members Found</div>
              <p className="mm-empty-sub">No members match the selected course filter and search criteria.</p>
              <button
                type="button"
                className="mm-btn-primary"
                onClick={() => {
                  setSelectedCourseFilter('ALL')
                  setSearchQuery('')
                  setFilterStatus('ALL')
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: ADD MEMBER ────────────────────────────────────────── */}
      {addModalOpen && (
        <div className="mm-modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Add New Member</h2>
            <p className="mm-modal-sub">Create a new student or admin profile and allot course access.</p>
            <form onSubmit={handleCreateMember}>
              <div className="mm-form-group">
                <label className="mm-form-label">Username *</label>
                <input
                  type="text"
                  className="mm-form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Display Name</label>
                <input
                  type="text"
                  className="mm-form-input"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="mm-form-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Warrior Title (Auto-Generated)</label>
                <input
                  type="text"
                  className="mm-form-input"
                  value={newWarriorName}
                  onChange={(e) => setNewWarriorName(e.target.value)}
                  style={{ color: '#FB923C', fontWeight: 700 }}
                />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Public User ID</label>
                <input
                  type="text"
                  className="mm-form-input"
                  value={newPublicId}
                  onChange={(e) => setNewPublicId(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Allot Courses</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0B0F17', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {workspaces.map((w) => (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', cursor: 'pointer', color: '#E2E8F0' }}>
                      <input
                        type="checkbox"
                        checked={newAssignedCourses.includes(w.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewAssignedCourses([...newAssignedCourses, w.id])
                          else setNewAssignedCourses(newAssignedCourses.filter((id) => id !== w.id))
                        }}
                      />
                      <span>{w.name}</span>
                    </label>
                  ))}
                </div>
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
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ACCESS & GRANULAR PERMISSIONS ───────────────────────── */}
      {accessModalMember && (
        <div className="mm-modal-overlay" onClick={() => setAccessModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Manage Access: {accessModalMember.display_name}</h2>
            <p className="mm-modal-sub">Check the courses this student is permitted to access and practice.</p>
            <div className="mm-form-group">
              <label className="mm-form-label">Assigned Courses</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0B0F17', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                {workspaces.map((w) => {
                  const isAssigned = accessModalMember.assigned_courses?.includes(w.id) || accessModalMember.assigned_courses?.includes('*')
                  return (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer', color: '#E2E8F0' }}>
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
            <div className="mm-modal-actions">
              <button
                type="button"
                className="mm-btn-secondary"
                onClick={() => setAccessModalMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mm-btn-primary"
                onClick={handleSaveAccess}
              >
                Save Allotment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: IDENTITY REASSIGNMENT & AUDIT ────────────────────────── */}
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
              <div style={{ marginBottom: '16px', background: '#0B0F17', borderRadius: '8px', padding: '10px 12px', maxHeight: '130px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                type="button"
                className="mm-btn-primary"
                onClick={handleSaveIdentity}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PERFORMANCE INTELLIGENCE ────────────────────────────── */}
      {intelligenceModalMember && (
        <div className="mm-modal-overlay" onClick={() => setIntelligenceModalMember(null)}>
          <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="mm-modal-title">Learning Stats: {intelligenceModalMember.warrior_name}</h2>
            <p className="mm-modal-sub">Student test accuracy, readiness metrics, and recent practice sessions.</p>
            {memberAnalytics ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ background: '#0B0F17', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>READINESS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FB923C', marginTop: '3px' }}>{memberAnalytics.readinessScore}%</div>
                  </div>
                  <div style={{ background: '#0B0F17', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>ACCURACY</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: '3px' }}>{memberAnalytics.accuracy}%</div>
                  </div>
                  <div style={{ background: '#0B0F17', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>SOLVED</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', marginTop: '3px' }}>{memberAnalytics.totalQuestionsAttempted}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>Strong Areas:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {memberAnalytics.strongAreas?.length > 0 ? (
                      memberAnalytics.strongAreas.map((s) => (
                        <span key={s} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', padding: '2px 7px', borderRadius: '5px', fontSize: '0.74rem' }}>✓ {s}</span>
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
                        <span key={w} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', padding: '2px 7px', borderRadius: '5px', fontSize: '0.74rem' }}>⚠ {w}</span>
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
                      <div key={att.id} style={{ background: '#0B0F17', padding: '7px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', border: '1px solid rgba(255,255,255,0.06)' }}>
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

      {/* ── MODAL 5: COMPLETE ADMIN AUDIT LOG VIEWER ────────────────────────── */}
      {auditModalOpen && (
        <div className="mm-modal-overlay" onClick={() => setAuditModalOpen(false)}>
          <div className="mm-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 className="mm-modal-title">📜 Admin Audit Trail</h2>
                <p className="mm-modal-sub" style={{ margin: 0 }}>Immutable record of all administrative operations, allotments, and identity updates.</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                style={{ background: 'transparent', color: '#94A3B8', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Filter Row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <select
                className="mm-form-select"
                style={{ width: 'auto', minWidth: '160px' }}
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
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
                className="mm-form-input"
                style={{ flex: 1, minWidth: '180px' }}
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>

            {/* Logs List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px' }}>
              {allAuditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '0.84rem' }}>No audit records found.</div>
              ) : allAuditLogs
                .filter((l) => auditFilterType === 'ALL' || l.action_type === auditFilterType)
                .filter((l) => !auditSearch.trim() || JSON.stringify(l).toLowerCase().includes(auditSearch.toLowerCase()))
                .map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: '#0B0F17',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#FB923C', padding: '1px 6px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {log.action_type}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E2E8F0' }}>
                          Admin: {log.admin_user_id || 'adminalpha'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '2px' }}>
                      {log.old_value && log.new_value ? (
                        <span>
                          <span style={{ color: '#94A3B8' }}>From:</span> <b>{String(log.old_value)}</b> ➔ <span style={{ color: '#94A3B8' }}>To:</span> <b style={{ color: '#34D399' }}>{String(log.new_value)}</b>
                        </span>
                      ) : log.new_value ? (
                        <span><b style={{ color: '#34D399' }}>{String(log.new_value)}</b></span>
                      ) : (
                        <span>{log.reason || 'Administrative action executed'}</span>
                      )}
                    </div>

                    {log.reason && (
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="mm-modal-actions">
              <button
                type="button"
                className="mm-btn-primary"
                onClick={() => setAuditModalOpen(false)}
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
