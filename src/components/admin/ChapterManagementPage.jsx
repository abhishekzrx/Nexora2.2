/**
 * ChapterManagementPage
 * Dedicated Chapter Management workspace scoped to the active Subject
 * within the active Course. Supports: Create, Rename, Delete, Duplicate,
 * Reorder, Lock/Unlock, Enable/Disable, Search, Sort, Filter.
 * All icons go through the global AppIcon system.
 */
import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import AdminModal, { AdminModalFooter } from './AdminModal'
import { ChapterForm } from './AdminModalForms'
import { AdminSearchBox } from './AdminShared'
import { useAdminFeedback } from './AdminFeedback'
import {
  useAdminStore,
  addChapter,
  updateChapter,
  deleteChapter,
  duplicateChapter,
  reorderChapters,
  setChapterStatus,
  toggleChapterLock,
  getDeleteChapterImpact,
} from '../../data/adminStore'

const STATUS_META = {
  active: { label: 'Active', tone: 'green', icon: 'check' },
  disabled: { label: 'Disabled', tone: 'gray', icon: 'pause' },
}

function StatusBadge({ status }) {
  const meta = status === 'disabled' ? STATUS_META.disabled : STATUS_META.active
  return (
    <span className={`cm-status-badge tone-${meta.tone}`}>
      <AppIcon name={meta.icon} size={10} />
      {meta.label}
    </span>
  )
}

export default function ChapterManagementPage({ onBack, subjectName }) {
  const feedback = useAdminFeedback()
  const { subjects, chapters } = useAdminStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('number')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const subject = subjects.find((s) => s.name === subjectName) || null

  const subjectChapters = useMemo(
    () => chapters
      .filter((c) => c.subject === subjectName)
      .sort((a, b) => (a.number || 0) - (b.number || 0)),
    [chapters, subjectName],
  )

  const processed = useMemo(() => {
    let list = [...subjectChapters]
    if (filterStatus !== 'all') {
      list = list.filter((c) => (filterStatus === 'disabled' ? c.status === 'disabled' : c.status !== 'disabled'))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q))
    }
    switch (sortBy) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'status': list.sort((a, b) => (a.status || 'active').localeCompare(b.status || 'active')); break
      default: list.sort((a, b) => (a.number || 0) - (b.number || 0))
    }
    return list
  }, [subjectChapters, search, sortBy, filterStatus])

  const openCreateForm = () => {
    setForm({ subject: subjectName })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEditForm = (chapter) => {
    setForm({ ...chapter })
    setEditTarget(chapter)
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
      updateChapter(editTarget.id, form)
      feedback.success(`Chapter "${form.name}" updated successfully`)
    } else {
      addChapter(form)
      feedback.success(`Chapter "${form.name}" created successfully`)
    }
    closeForm()
  }

  const handleReorder = (id, direction) => {
    const idx = subjectChapters.findIndex((c) => c.id === id)
    if (direction === 'up' && idx > 0) {
      const ids = subjectChapters.map((c) => c.id)
      ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
      reorderChapters(subjectName, ids)
      feedback.success('Chapter reordered successfully')
    } else if (direction === 'down' && idx < subjectChapters.length - 1) {
      const ids = subjectChapters.map((c) => c.id)
      ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
      reorderChapters(subjectName, ids)
      feedback.success('Chapter reordered successfully')
    }
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    const impacted = deleteChapter(confirmDelete.id)
    feedback.success(`Chapter "${impacted.name}" deleted successfully`)
    setConfirmDelete(null)
  }

  const handleToggleStatus = (chapter) => {
    const next = chapter.status === 'disabled' ? 'active' : 'disabled'
    setChapterStatus(chapter.id, next)
    feedback.success(`Chapter "${chapter.name}" ${next === 'active' ? 'enabled' : 'disabled'} successfully`)
  }

  const handleToggleLock = (chapter) => {
    toggleChapterLock(chapter.id)
    feedback.success(`Chapter "${chapter.name}" ${chapter.locked ? 'unlocked' : 'locked'} successfully`)
  }

  const handleDuplicate = (chapter) => {
    duplicateChapter(chapter.id)
    feedback.success(`Chapter "${chapter.name}" duplicated successfully`)
  }

  const confirmImpact = confirmDelete ? getDeleteChapterImpact(confirmDelete.id) : null

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Chapter Management</div>
        <button type="button" className="admin-back-link" onClick={onBack}>
          <AppIcon name="back" size={16} />
          Back
        </button>
      </div>

      {subject ? (
        <div className="cm-context-banner">
          <span className="cm-context-icon" style={subject.color ? { '--cm-subject-color': subject.color } : {}}>
            <AppIcon name={subject.icon} size={18} />
          </span>
          <div className="cm-context-body">
            <span className="cm-context-label">Active Subject</span>
            <span className="cm-context-name">{subject.name}</span>
          </div>
          <span className="cm-context-count">{subjectChapters.length} chapters</span>
        </div>
      ) : null}

      <div className="cm-toolbar">
        <AdminSearchBox placeholder="Search chapters..." value={search} onChange={setSearch} />
        <div className="cm-toolbar-actions">
          <select className="admin-form-select cm-toolbar-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort chapters">
            <option value="number">Sort: Number</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
          </select>
          <select className="admin-form-select cm-toolbar-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter chapters">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" size={16} />
            Add Chapter
          </Button>
        </div>
      </div>

      {processed.length === 0 ? (
        <div className="cm-empty">
          <AppIcon name="document" size={32} />
          <p>No chapters found</p>
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" size={14} />
            Add Chapter
          </Button>
        </div>
      ) : (
        <div className="cm-chapters-list">
          {processed.map((chapter) => (
            <div key={chapter.id} className="cm-chapter-item">
              <div className="cm-chapter-number">{chapter.number}</div>
              <div className="cm-chapter-body">
                <div className="cm-chapter-name">{chapter.name}</div>
                <div className="cm-chapter-desc">{chapter.desc || 'No description'}</div>
                <div className="cm-chapter-meta">
                  <StatusBadge status={chapter.status === 'disabled' ? 'disabled' : 'active'} />
                  {chapter.locked ? (
                    <span className="cm-lock-badge">
                      <AppIcon name="lock" size={10} />
                      Locked
                    </span>
                  ) : null}
                  <span>{chapter.mcqs || 0} MCQs</span>
                  <span>{chapter.flashcards || 0} Cards</span>
                </div>
              </div>
              <div className="cm-chapter-actions">
                <button type="button" className="cm-action-btn soft" onClick={() => handleReorder(chapter.id, 'up')} aria-label="Move up">
                  <AppIcon name="arrowUp" size={13} />
                </button>
                <button type="button" className="cm-action-btn soft" onClick={() => handleReorder(chapter.id, 'down')} aria-label="Move down">
                  <AppIcon name="arrowDown" size={13} />
                </button>
                <button type="button" className="cm-action-btn soft" onClick={() => openEditForm(chapter)} aria-label="Edit chapter">
                  <AppIcon name="edit" size={13} />
                </button>
                <button type="button" className="cm-action-btn soft" onClick={() => handleDuplicate(chapter)} aria-label="Duplicate chapter">
                  <AppIcon name="copy" size={13} />
                </button>
                <button type="button" className="cm-action-btn soft" onClick={() => handleToggleStatus(chapter)} aria-label={chapter.status === 'disabled' ? 'Enable chapter' : 'Disable chapter'}>
                  <AppIcon name={chapter.status === 'disabled' ? 'check' : 'pause'} size={13} />
                </button>
                <button type="button" className="cm-action-btn soft" onClick={() => handleToggleLock(chapter)} aria-label={chapter.locked ? 'Unlock chapter' : 'Lock chapter'}>
                  <AppIcon name={chapter.locked ? 'lockOpen' : 'lock'} size={13} />
                </button>
                <button type="button" className="cm-action-btn danger" onClick={() => setConfirmDelete(chapter)} aria-label="Delete chapter">
                  <AppIcon name="delete" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        title={editTarget ? 'Edit Chapter' : 'Add New Chapter'}
        open={showForm}
        onClose={closeForm}
      >
        <ChapterForm value={form} onChange={setForm} />
        <AdminModalFooter
          submitLabel={editTarget ? 'Update Chapter' : 'Add Chapter'}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </AdminModal>

      <AdminModal
        title="Delete Chapter?"
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      >
        <div className="admin-confirm-delete-message">
          Delete "{confirmDelete?.name}"?
        </div>
        <div className="admin-confirm-delete-detail">
          This action cannot be undone. All content under this chapter will also be removed.
        </div>
        {confirmImpact ? (
          <div className="admin-delete-impact">
            <div className="admin-delete-impact-title">
              <AppIcon name="warning" size={13} />
              This will permanently remove
            </div>
            <div className="admin-delete-impact-grid">
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
          submitLabel="Delete Chapter"
          submitVariant="danger"
          onCancel={() => setConfirmDelete(null)}
          onSubmit={handleDelete}
        />
      </AdminModal>
    </>
  )
}
