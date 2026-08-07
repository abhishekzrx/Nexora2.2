/**
 * SubjectManagementPage
 * Dedicated Subject Management workspace scoped to the active Course.
 * Supports: Create, Rename, Delete, Duplicate, Reorder, Lock/Unlock,
 * Enable/Disable, Search, Sort, Filter.
 * All icons go through the global AppIcon system.
 */
import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import AdminModal, { AdminModalFooter } from './AdminModal'
import { SubjectForm } from './AdminModalForms'
import { AdminSearchBox } from './AdminShared'
import { useAdminFeedback } from './AdminFeedback'
import {
  useAdminStore,
  addSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject,
  reorderSubjects,
  setSubjectStatus,
  toggleSubjectLock,
  getDeleteSubjectImpact,
} from '../../data/adminStore'

const STATUS_META = {
  active: { label: 'Active', tone: 'green', icon: 'check' },
  disabled: { label: 'Disabled', tone: 'gray', icon: 'pause' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.active
  return (
    <span className={`sm-status-badge tone-${meta.tone}`}>
      <AppIcon name={meta.icon} size={10} />
      {meta.label}
    </span>
  )
}

function SubjectManagementPage({ onBack, onOpenChapters }) {
  const feedback = useAdminFeedback()
  const { subjects } = useAdminStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('order')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Sort + filter
  const processed = useMemo(() => {
    let list = [...subjects]
    if (filterStatus !== 'all') {
      list = list.filter((s) => s.status === filterStatus)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q))
    }
    switch (sortBy) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'status': list.sort((a, b) => (a.status || 'active').localeCompare(b.status || 'active')); break
      default: list.sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    return list
  }, [subjects, search, sortBy, filterStatus])

  const openCreateForm = () => {
    setForm({})
    setEditTarget(null)
    setShowForm(true)
  }

  const openEditForm = (subject) => {
    setForm({ ...subject })
    setEditTarget(subject)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm({})
  }

  const handleSubmit = () => {
    if (!form.name?.trim()) return
    if (editTarget) {
      updateSubject(editTarget.id, form)
      feedback.success(`Subject "${form.name}" updated successfully`)
    } else {
      addSubject(form)
      feedback.success(`Subject "${form.name}" created successfully`)
    }
    closeForm()
  }

  const handleReorder = (id, direction) => {
    const sorted = [...subjects].sort((a, b) => (a.order || 0) - (b.order || 0))
    const idx = sorted.findIndex((s) => s.id === id)
    if (direction === 'up' && idx > 0) {
      const ids = sorted.map((s) => s.id)
      ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
      reorderSubjects(ids)
      feedback.success('Subject reordered successfully')
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const ids = sorted.map((s) => s.id)
      ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
      reorderSubjects(ids)
      feedback.success('Subject reordered successfully')
    }
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    const impacted = deleteSubject(confirmDelete.id)
    feedback.success(`Subject "${impacted.name}" deleted successfully`)
    setConfirmDelete(null)
  }

  const handleToggleStatus = (subject) => {
    const next = subject.status === 'active' ? 'disabled' : 'active'
    setSubjectStatus(subject.id, next)
    feedback.success(`Subject "${subject.name}" ${next === 'active' ? 'enabled' : 'disabled'} successfully`)
  }

  const handleToggleLock = (subject) => {
    toggleSubjectLock(subject.id)
    feedback.success(`Subject "${subject.name}" ${subject.locked ? 'unlocked' : 'locked'} successfully`)
  }

  const handleDuplicate = (subject) => {
    duplicateSubject(subject.id)
    feedback.success(`Subject "${subject.name}" duplicated successfully`)
  }

  const confirmImpact = confirmDelete ? getDeleteSubjectImpact(confirmDelete.id) : null

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Subject Management</div>
        <button type="button" className="admin-back-link" onClick={onBack}>
          <AppIcon name="back" size={16} />
          Back
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="sm-toolbar">
        <AdminSearchBox placeholder="Search subjects..." value={search} onChange={setSearch} />
        <div className="sm-toolbar-actions">
          <select className="admin-form-select sm-toolbar-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort subjects">
            <option value="order">Sort: Order</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
          </select>
          <select className="admin-form-select sm-toolbar-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter subjects">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" size={16} />
            Add Subject
          </Button>
        </div>
      </div>

      {/* ── Subject Cards ───────────────────────────────────────── */}
      {processed.length === 0 ? (
        <div className="sm-empty">
          <AppIcon name="chapters" size={32} />
          <p>No subjects found</p>
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" size={14} />
            Add Subject
          </Button>
        </div>
      ) : (
        <div className="sm-subjects-grid">
          {processed.map((subject) => (
            <div key={subject.id} className="sm-subject-card">
              <div className="sm-subject-top">
                <div
                  className="sm-subject-icon"
                  style={subject.color ? { '--sm-subject-color': subject.color } : {}}
                >
                  <AppIcon name={subject.icon} size={22} />
                </div>
                <div className="sm-subject-head">
                  <div className="sm-subject-name">{subject.name}</div>
                  <div className="sm-subject-meta">
                    <StatusBadge status={subject.status} />
                    {subject.locked ? (
                      <span className="sm-lock-badge">
                        <AppIcon name="lock" size={10} />
                        Locked
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="sm-subject-desc">{subject.desc || 'No description'}</div>
              <div className="sm-subject-stats">
                <span>{subject.stats?.[0]?.value || 0} Chapters</span>
                <span>{subject.stats?.[1]?.value || 0} MCQs</span>
                <span>{subject.stats?.[2]?.value || 0} Cards</span>
              </div>
              <div className="sm-subject-actions">
                <button
                  type="button"
                  className="sm-action-btn primary"
                  onClick={() => onOpenChapters(subject.name)}
                  aria-label="Open chapters"
                >
                  <AppIcon name="document" size={13} />
                  Chapters
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => handleReorder(subject.id, 'up')} aria-label="Move up">
                  <AppIcon name="arrowUp" size={13} />
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => handleReorder(subject.id, 'down')} aria-label="Move down">
                  <AppIcon name="arrowDown" size={13} />
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => openEditForm(subject)} aria-label="Edit subject">
                  <AppIcon name="edit" size={13} />
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => handleDuplicate(subject)} aria-label="Duplicate subject">
                  <AppIcon name="copy" size={13} />
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => handleToggleStatus(subject)} aria-label={subject.status === 'active' ? 'Disable subject' : 'Enable subject'}>
                  <AppIcon name={subject.status === 'active' ? 'pause' : 'check'} size={13} />
                </button>
                <button type="button" className="sm-action-btn soft" onClick={() => handleToggleLock(subject)} aria-label={subject.locked ? 'Unlock subject' : 'Lock subject'}>
                  <AppIcon name={subject.locked ? 'lockOpen' : 'lock'} size={13} />
                </button>
                <button type="button" className="sm-action-btn danger" onClick={() => setConfirmDelete(subject)} aria-label="Delete subject">
                  <AppIcon name="delete" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Subject Modal ──────────────────────────── */}
      <AdminModal
        title={editTarget ? 'Edit Subject' : 'Add New Subject'}
        open={showForm}
        onClose={closeForm}
      >
        <SubjectForm value={form} onChange={setForm} />
        <AdminModalFooter
          submitLabel={editTarget ? 'Update Subject' : 'Add Subject'}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </AdminModal>

      {/* ── Delete Confirm Dialog ───────────────────────────────── */}
      <AdminModal
        title="Delete Subject?"
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      >
        <div className="admin-confirm-delete-message">
          Delete "{confirmDelete?.name}"?
        </div>
        <div className="admin-confirm-delete-detail">
          This action cannot be undone. All content under this subject will also be removed.
        </div>
        {confirmImpact ? (
          <div className="admin-delete-impact">
            <div className="admin-delete-impact-title">
              <AppIcon name="warning" size={13} />
              This will permanently remove
            </div>
            <div className="admin-delete-impact-grid">
              <div className="admin-impact-chip tone-blue">
                <AppIcon name="chapters" size={13} />
                <span className="admin-impact-chip-label">Chapters</span>
                <span className="admin-impact-chip-count">{confirmImpact.chapters}</span>
              </div>
              <div className="admin-impact-chip tone-orange">
                <AppIcon name="mcqs" size={13} />
                <span className="admin-impact-chip-label">MCQs</span>
                <span className="admin-impact-chip-count">{confirmImpact.mcqs}</span>
              </div>
              <div className="admin-impact-chip tone-purple">
                <AppIcon name="flashcardsTab" size={13} />
                <span className="admin-impact-chip-label">Flashcards</span>
                <span className="admin-impact-chip-count">{confirmImpact.flashcards}</span>
              </div>
            </div>
          </div>
        ) : null}
        <AdminModalFooter
          submitLabel="Delete Subject"
          submitVariant="danger"
          onCancel={() => setConfirmDelete(null)}
          onSubmit={handleDelete}
        />
      </AdminModal>
    </>
  )
}

export default SubjectManagementPage