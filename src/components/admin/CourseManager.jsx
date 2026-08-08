/**
 * CourseManager
 * Dedicated Course management module for the Admin Panel.
 * Operates on the centralized workspaceStore (single source of truth).
 *
 * Supported operations:
 * - Create
 * - Rename
 * - Duplicate
 * - Archive / Activate
 * - Delete
 * - Publish / Unpublish
 * - Change Status (Draft, Published, Archived, Private)
 * - Search
 * - Sort
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
  makePrivateWorkspace,
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
    <div className="acad-inline-form">
      {fields.map((field) => (
        <div key={field.key} className="acad-inline-field">
          <label className="admin-form-label">{field.label}</label>
          {field.type === 'select' ? (
            <select className="admin-form-select" value={values[field.key]} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input type="text" className="admin-form-input" placeholder={field.placeholder || ''} value={values[field.key]} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
          )}
        </div>
      ))}
      <div className="acad-inline-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onSubmit(values)}>{submitLabel}</Button>
      </div>
    </div>
  )
}

function CourseCard({ course, isActive, onSelect, onRename, onDuplicate, onArchive, onActivate, onPublish, onUnpublish, onMakePrivate, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState(course.name)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

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

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'published') onPublish(course.id)
    else if (newStatus === 'archived') onArchive(course.id)
    else if (newStatus === 'private') onMakePrivate(course.id)
    else if (newStatus === 'active') onActivate(course.id)
    else if (newStatus === 'draft') unpublishWorkspace(course.id)
    setShowStatusMenu(false)
    showToast({ type: 'success', title: 'Status Updated', message: `Course is now ${STATUS_MAP[newStatus]?.label || newStatus}` })
  }

  return (
    <div className={`course-card${isActive ? ' active' : ''}`} style={{ '--course-accent': course.themeColor || '#F1621B' }}>
      <div className="course-card-top">
        <div className="course-icon-dot" style={{ background: course.themeColor || '#F1621B' }}>
          <AppIcon name={course.icon || 'adminDashboard'} size={18} />
        </div>
        <div className="course-card-info">
          {showRename ? (
            <div className="course-rename-row">
              <input
                type="text"
                className="admin-form-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setShowRename(false) }}
                autoFocus
              />
            </div>
          ) : (
            <div className="course-name">{course.name}</div>
          )}
          <div className="course-meta">{course.description || 'No description'}</div>
          <div className="course-meta-row">
            <StatusBadge status={course.status || course.published ? 'published' : 'draft'} />
            <span className="course-version">v{course.version || '1.0'}</span>
            <span className="course-date">{course.lastUpdated || course.createdAt}</span>
          </div>
        </div>
        <div className="course-card-actions">
          <button type="button" className="course-action-btn" onClick={() => setShowActions(!showActions)} aria-label="More actions">
            <AppIcon name="moreVert" size={18} />
          </button>
          {showActions && (
            <div className="course-action-menu">
              <button type="button" onClick={() => { setShowRename(true); setShowActions(false) }}><AppIcon name="edit" size={14} /> Rename</button>
              <button type="button" onClick={() => { onDuplicate(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Duplicated', message: `Copy of "${course.name}" created` }) }}><AppIcon name="copy" size={14} /> Duplicate</button>
              <button type="button" onClick={() => { setShowStatusMenu(!showStatusMenu); setShowActions(false) }}><AppIcon name="settings" size={14} /> Change Status</button>
              {course.published ? (
                <button type="button" onClick={() => { onUnpublish(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Unpublished', message: `"${course.name}" is now a draft` }) }}><AppIcon name="close" size={14} /> Unpublish</button>
              ) : (
                <button type="button" onClick={() => { onPublish(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Published', message: `"${course.name}" is now visible to students` }) }}><AppIcon name="check" size={14} /> Publish</button>
              )}
              {course.status !== 'archived' ? (
                <button type="button" onClick={() => { onArchive(course.id); setShowActions(false); showToast({ type: 'warning', title: 'Course Archived', message: `"${course.name}" moved to archive` }) }}><AppIcon name="folder" size={14} /> Archive</button>
              ) : (
                <button type="button" onClick={() => { onActivate(course.id); setShowActions(false); showToast({ type: 'success', title: 'Course Activated', message: `"${course.name}" restored from archive` }) }}><AppIcon name="arrowUp" size={14} /> Activate</button>
              )}
              <button type="button" className="danger" onClick={() => { handleDelete(); setShowActions(false) }}><AppIcon name="delete" size={14} /> Delete</button>
            </div>
          )}
          {showStatusMenu && (
            <div className="course-status-menu">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => handleStatusChange(s)}>
                  <span className={`status-dot tone-${STATUS_MAP[s]?.tone || 'gray'}`} />
                  {STATUS_MAP[s]?.label || s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="course-card-footer">
        <div className="course-stat"><AppIcon name="subjects" size={14} /> {course.metadata?.subjects || 0} Subjects</div>
        <div className="course-stat"><AppIcon name="document" size={14} /> {course.metadata?.chapters || 0} Chapters</div>
        <div className="course-stat"><AppIcon name="mcqs" size={14} /> {course.metadata?.mcqs || 0} MCQs</div>
        <div className="course-stat"><AppIcon name="flashcardsTab" size={14} /> {course.metadata?.flashcards || 0} Flashcards</div>
        <button type="button" className={`course-select-btn${isActive ? ' active' : ''}`} onClick={() => onSelect(course.id)}>
          {isActive ? 'Selected' : 'Select'} <AppIcon name="arrowForward" size={14} />
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
  const actionRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        // Close any open action menus handled per-card
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
          <AppIcon name="adminDashboard" size={20} />
          Course Manager
        </div>
        <div className="course-manager-actions">
          <div className="course-search">
            <AppIcon name="search" size={15} />
            <input type="text" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="admin-form-select course-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
            <AppIcon name="add" size={15} /> Create Course
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="course-create-card">
          <div className="course-create-title">Create New Course</div>
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
        </div>
      )}

      <div className="course-list">
        {filtered.length === 0 ? (
          <div className="acad-empty">
            <AppIcon name="adminDashboard" size={28} />
            <p>No Courses found</p>
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
              onMakePrivate={makePrivateWorkspace}
              onDelete={deleteWorkspace}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default CourseManager
