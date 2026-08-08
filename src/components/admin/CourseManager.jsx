/**
 * CourseManager
 * Mobile-first Course management module.
 * Uses centralized workspaceStore — same data for desktop and mobile.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useWorkspaceStore,
  createWorkspace,
  renameWorkspace,
  duplicateWorkspace,
  archiveWorkspace,
  activateWorkspace,
  publishWorkspace,
  unpublishWorkspace,
  deleteWorkspace,
  getWorkspaces,
  setActiveWorkspace,
} from '../../data/workspaceStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'

const STATUS_OPTIONS = ['draft', 'published', 'archived', 'private', 'active']

const STATUS_MAP = {
  draft: { label: 'Draft', tone: 'orange' },
  published: { label: 'Published', tone: 'green' },
  archived: { label: 'Archived', tone: 'gray' },
  private: { label: 'Private', tone: 'purple' },
  active: { label: 'Active', tone: 'blue' },
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'status', label: 'By Status' },
]

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.draft
  return <span className={`course-status-badge tone-${cfg.tone}`}>{cfg.label}</span>
}

function InlineForm({ fields, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.default || ''])))
  return (
    <div className="course-create-card">
      <div className="course-create-title">Create New Course</div>
      <div className="course-create-form">
        {fields.map((field) => (
          <div key={field.key} className="course-form-field">
            <label className="course-form-label">{field.label}</label>
            {field.type === 'select' ? (
              <select className="course-form-select" value={values[field.key]} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>
                {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="text"
                className="course-form-input"
                placeholder={field.placeholder || ''}
                value={values[field.key]}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            )}
          </div>
        ))}
        <div className="course-form-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSubmit(values)}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  )
}

function CourseCard({ course, isActive, onSelect, onRename, onDuplicate, onArchive, onActivate, onPublish, onUnpublish, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState(course.name)
  const actionRef = useRef(null)

  const handleRename = () => {
    if (renameValue.trim()) {
      onRename(course.id, renameValue.trim())
      showToast({ type: 'success', title: 'Course Updated', message: `Renamed to "${renameValue.trim()}"` })
    }
    setShowRename(false)
  }

  const handleDelete = () => {
    showConfirm({
      title: 'Delete Course?',
      message: `This will permanently delete "${course.name}" and all its content. This action cannot be undone.`,
      impact: [
        { icon: 'chapters', label: 'Subjects', value: 'All' },
        { icon: 'document', label: 'Chapters', value: 'All' },
        { icon: 'mcqs', label: 'MCQs', value: 'All' },
        { icon: 'flashcardsTab', label: 'Flashcards', value: 'All' },
      ],
      onConfirm: () => {
        onDelete(course.id)
        showToast({ type: 'success', title: 'Course Deleted', message: `"${course.name}" has been deleted` })
        dismissConfirm()
      },
      onCancel: dismissConfirm,
    })
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setShowActions(false)
      }
    }
    if (showActions) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showActions])

  return (
    <div className={`course-card${isActive ? ' active' : ''}`} style={{ '--course-accent': course.themeColor || '#F1621B' }}>
      <div className="course-card-main">
        <div className="course-card-left">
          <div className="course-icon-dot" style={{ background: course.themeColor || '#F1621B' }}>
            <AppIcon name={course.icon || 'adminDashboard'} size={16} />
          </div>
          <div className="course-card-info">
            {showRename ? (
              <input
                type="text"
                className="course-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setShowRename(false) }}
                autoFocus
              />
            ) : (
              <>
                <div className="course-name">{course.name}</div>
                <div className="course-desc">{course.description || 'No description'}</div>
              </>
            )}
          </div>
        </div>
        <div className="course-card-right">
          <StatusBadge status={course.status || (course.published ? 'published' : 'draft')} />
          <div className="course-card-actions" ref={actionRef}>
            <button
              type="button"
              className="course-action-btn"
              onClick={() => setShowActions(!showActions)}
              aria-label="More actions"
            >
              <AppIcon name="moreVert" size={18} />
            </button>
            {showActions && (
              <div className="course-action-menu">
                <button type="button" onClick={() => { setShowRename(true); setShowActions(false) }}>
                  <AppIcon name="edit" size={14} /> Rename
                </button>
                <button type="button" onClick={() => { onDuplicate(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Duplicated', message: `Copy of "${course.name}" created` }) }}>
                  <AppIcon name="copy" size={14} /> Duplicate
                </button>
                {course.published ? (
                  <button type="button" onClick={() => { onUnpublish(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Unpublished', message: `"${course.name}" is now a draft` }) }}>
                    <AppIcon name="close" size={14} /> Unpublish
                  </button>
                ) : (
                  <button type="button" onClick={() => { onPublish(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Published', message: `"${course.name}" is now visible to students` }) }}>
                    <AppIcon name="check" size={14} /> Publish
                  </button>
                )}
                {course.status !== 'archived' ? (
                  <button type="button" onClick={() => { onArchive(course.id); setShowActions(false); showToast({ type: 'warning', title: 'Course Archived', message: `"${course.name}" moved to archive` }) }}>
                    <AppIcon name="folder" size={14} /> Archive
                  </button>
                ) : (
                  <button type="button" onClick={() => { onActivate(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Activated', message: `"${course.name}" restored from archive` }) }}>
                    <AppIcon name="arrowUp" size={14} /> Activate
                  </button>
                )}
                <button type="button" className="danger" onClick={() => { handleDelete(); setShowActions(false) }}>
                  <AppIcon name="delete" size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="course-card-footer">
        <div className="course-stat">
          <AppIcon name="document" size={13} />
          <span className="course-stat-value">{course.metadata?.chapters || 0}</span>
          <span className="course-stat-label">Chapters</span>
        </div>
        <div className="course-stat">
          <AppIcon name="mcqs" size={13} />
          <span className="course-stat-value">{course.metadata?.mcqs || 0}</span>
          <span className="course-stat-label">MCQs</span>
        </div>
        <div className="course-stat">
          <AppIcon name="flashcardsTab" size={13} />
          <span className="course-stat-value">{course.metadata?.flashcards || 0}</span>
          <span className="course-stat-label">Flashcards</span>
        </div>
        <button
          type="button"
          className={`course-select-btn${isActive ? ' active' : ''}`}
          onClick={() => onSelect(course.id)}
        >
          {isActive ? 'Active' : 'Select'}
        </button>
      </div>
    </div>
  )
}

function CourseManager(_courseName) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createStatus, setCreateStatus] = useState('draft')

  const filtered = useMemo(() => {
    let list = [...getWorkspaces()]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })
    return list
  }, [search, sortBy])

  const handleCreate = () => {
    if (!createName.trim()) return
    const course = createWorkspace({ name: createName.trim(), description: createDesc.trim(), status: createStatus })
    setActiveWorkspace(course.id)
    setShowCreate(false)
    setCreateName('')
    setCreateDesc('')
    setCreateStatus('draft')
    showToast({ type: 'success', title: 'Course Created', message: `"${course.name}" is ready` })
  }

  const handleSelect = (id) => {
    setActiveWorkspace(id)
    showToast({ type: 'success', title: 'Workspace Switched', message: `Now editing: ${workspaces.find((w) => w.id === id)?.name}` })
  }

  return (
    <div className="course-manager">
      <div className="course-manager-header">
        <div className="course-manager-title">
          <AppIcon name="folder" size={20} />
          <div>
            <div className="course-manager-heading">Course Manager</div>
            <div className="course-manager-sub">Manage courses and their learning content</div>
          </div>
        </div>
      </div>

      <div className="course-manager-toolbar">
        <div className="course-search">
          <AppIcon name="search" size={16} />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="course-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Button variant="primary" className="course-create-cta" onClick={() => setShowCreate(!showCreate)}>
        <AppIcon name="add" size={16} />
        {showCreate ? 'Cancel' : 'Create Course'}
      </Button>

      {showCreate && (
        <InlineForm
          fields={[
            { key: 'name', label: 'Course Name', placeholder: 'e.g., GATE 2026 – Mechanical' },
            { key: 'description', label: 'Description', placeholder: 'Brief course description' },
            { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, default: 'draft' },
          ]}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreateStatus('draft') }}
          submitLabel="Create"
        />
      )}

      <div className="course-list">
        {filtered.length === 0 ? (
          <div className="course-empty">
            <AppIcon name="adminDashboard" size={28} />
            <p>No courses found</p>
            <span>Try another search or create a new course.</span>
          </div>
        ) : (
          filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isActive={course.id === activeWorkspaceId}
              onSelect={handleSelect}
              onRename={renameWorkspace}
              onDuplicate={duplicateWorkspace}
              onArchive={archiveWorkspace}
              onActivate={activateWorkspace}
              onPublish={publishWorkspace}
              onUnpublish={unpublishWorkspace}
              onDelete={deleteWorkspace}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default CourseManager
