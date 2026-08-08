/**
 * ChapterManager
 * Chapter lifecycle management inside the active Course.
 * Chapters always belong to a Subject within the Course.
 */

import { useState, useMemo, useEffect } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useAdminStore,
  addChapter,
  updateChapter,
  deleteChapter,
  duplicateChapter,
  setChapterStatus,
  toggleChapterLock,
  getDeleteChapterImpact,
} from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'

const STATUS_OPTIONS = ['active', 'draft', 'disabled', 'published']

const STATUS_MAP = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'orange' },
  disabled: { label: 'Disabled', tone: 'gray' },
  published: { label: 'Published', tone: 'green' },
  locked: { label: 'Locked', tone: 'red' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.active
  return <span className={`chapter-status-badge tone-${cfg.tone}`}>{cfg.label}</span>
}

function ChapterCard({ chapter, subjectName, onRename, onDuplicate, onDelete, onToggleLock, onSetStatus }) {
  const [showActions, setShowActions] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState(chapter.name)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const handleRename = () => {
    if (renameValue.trim()) {
      onRename(chapter.id, { name: renameValue.trim() })
      showToast({ type: 'success', title: 'Chapter Updated', message: `Renamed to "${renameValue.trim()}"` })
    }
    setShowRename(false)
  }

  const handleDelete = () => {
    const impact = getDeleteChapterImpact(chapter.id)
    showConfirm({
      title: 'Delete Chapter?',
      message: `This will permanently delete "${chapter.name}" and all its MCQs and flashcards.`,
      impact: [
        { icon: 'mcqs', label: 'MCQs', value: impact.mcqs },
        { icon: 'flashcardsTab', label: 'Flashcards', value: impact.flashcards },
      ],
      onConfirm: () => {
        onDelete(chapter.id)
        showToast({ type: 'success', title: 'Chapter Deleted', message: `"${chapter.name}" has been deleted` })
        dismissConfirm()
      },
      onCancel: dismissConfirm,
    })
  }

  const handleStatusChange = (newStatus) => {
    onSetStatus(chapter.id, newStatus)
    setShowStatusMenu(false)
    showToast({ type: 'success', title: 'Status Updated', message: `Chapter is now ${STATUS_MAP[newStatus]?.label || newStatus}` })
  }

  return (
    <div className="chapter-card">
      <div className="chapter-card-top">
        <div className="chapter-number">#{String(chapter.number || 0).padStart(2, '0')}</div>
        <div className="chapter-card-info">
          {showRename ? (
            <input type="text" className="admin-form-input chapter-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRename} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setShowRename(false) }} autoFocus />
          ) : (
            <div className="chapter-name">{chapter.name}</div>
          )}
          <div className="chapter-desc">{chapter.desc || 'No description'}</div>
          <div className="chapter-meta-row">
            <StatusBadge status={chapter.locked ? 'locked' : chapter.status} />
            <span className="chapter-subject">{subjectName}</span>
          </div>
        </div>
        <div className="chapter-card-actions">
          <button type="button" className="chapter-action-btn" onClick={() => setShowActions(!showActions)} aria-label="More">
            <AppIcon name="moreVert" size={18} />
          </button>
          {showActions && (
            <div className="chapter-action-menu">
              <button type="button" onClick={() => { setShowRename(true); setShowActions(false) }}><AppIcon name="edit" size={14} /> Rename</button>
              <button type="button" onClick={() => { onDuplicate(chapter.id); setShowActions(false); showToast({ type: 'success', title: 'Chapter Duplicated', message: `Copy of "${chapter.name}" created` }) }}><AppIcon name="copy" size={14} /> Duplicate</button>
              <button type="button" onClick={() => { setShowStatusMenu(!showStatusMenu); setShowActions(false) }}><AppIcon name="settings" size={14} /> Change Status</button>
              <button type="button" onClick={() => { onToggleLock(chapter.id); setShowActions(false); showToast({ type: 'success', title: chapter.locked ? 'Chapter Unlocked' : 'Chapter Locked', message: chapter.locked ? `"${chapter.name}" is now unlocked` : `"${chapter.name}" is now locked` }) }}><AppIcon name={chapter.locked ? 'lockOpen' : 'lock'} size={14} /> {chapter.locked ? 'Unlock' : 'Lock'}</button>
              <button type="button" className="danger" onClick={() => { handleDelete(); setShowActions(false) }}><AppIcon name="delete" size={14} /> Delete</button>
            </div>
          )}
          {showStatusMenu && (
            <div className="chapter-status-menu">
              {STATUS_OPTIONS.filter((s) => s !== 'locked').map((s) => (
                <button key={s} type="button" onClick={() => handleStatusChange(s)}>
                  <span className={`status-dot tone-${STATUS_MAP[s]?.tone || 'gray'}`} />
                  {STATUS_MAP[s]?.label || s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="chapter-card-footer">
        <div className="chapter-stat"><AppIcon name="mcqs" size={14} /> {chapter.mcqs || 0} MCQs</div>
        <div className="chapter-stat"><AppIcon name="flashcardsTab" size={14} /> {chapter.flashcards || 0} Flashcards</div>
        <div className="chapter-stat"><AppIcon name="notes" size={14} /> {chapter.notes || 0} Notes</div>
        <StatusBadge status={chapter.locked ? 'locked' : chapter.status} />
      </div>
    </div>
  )
}

function ChapterManager(courseName, selectedSubject) {
  const { activeCourseId } = useWorkspaceStore()
  const { subjects, chapters } = useAdminStore()
  const [search, setSearch] = useState('')
  const [sortBy, _setSortBy] = useState('number')
  const [filterStatus, _setFilterStatus] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createNumber, setCreateNumber] = useState('')
  const [createStatus, setCreateStatus] = useState('active')
  const [subjectFilter, setSubjectFilter] = useState(selectedSubject || '')

  const courseSubjects = useMemo(() => {
    if (!activeCourseId) return []
    return subjects.filter((s) => s.courseId === activeCourseId)
  }, [activeCourseId, subjects])

  // When opening the create form, default subject to first available if none selected
  useEffect(() => {
    if (showCreate && !subjectFilter && courseSubjects.length > 0) {
      setSubjectFilter(courseSubjects[0].name)
    }
  }, [showCreate, subjectFilter, courseSubjects])

  const filtered = useMemo(() => {
    let list = chapters.filter((c) => c.courseId === activeCourseId)
    if (subjectFilter) {
      list = list.filter((c) => c.subject === subjectFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q))
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'locked') list = list.filter((c) => c.locked)
      else list = list.filter((c) => c.status === filterStatus)
    }
    list.sort((a, b) => {
      if (sortBy === 'number') return (a.number || 0) - (b.number || 0)
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })
    return list
  }, [chapters, activeCourseId, subjectFilter, search, sortBy, filterStatus])

  const handleCreate = () => {
    if (!createName.trim() || !activeCourseId) return
    if (!subjectFilter) {
      showToast({ type: 'warning', title: 'Select a Subject', message: 'Please select a subject before creating a chapter.' })
      return
    }
    addChapter({
      subject: subjectFilter,
      name: createName.trim(),
      desc: createDesc.trim(),
      number: createNumber ? Number(createNumber) : undefined,
    })
    setShowCreate(false)
    setCreateName('')
    setCreateDesc('')
    setCreateNumber('')
    setCreateStatus('active')
    showToast({ type: 'success', title: 'Chapter Created', message: `"${createName.trim()}" added to ${subjectFilter}` })
  }

  if (!activeCourseId) {
    return (
      <div className="chapter-manager">
        <div className="acad-empty">
          <AppIcon name="adminDashboard" size={28} />
          <p>Select a Course to manage Chapters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chapter-manager">
      <div className="chapter-manager-header">
        <div className="chapter-manager-title">
          <AppIcon name="document" size={20} />
          <div>
            <div className="chapter-manager-heading">Chapter Manager</div>
            <div className="chapter-manager-context">
              {courseName && <span>{courseName}</span>}
              {subjectFilter && <span>• {subjectFilter}</span>}
            </div>
          </div>
        </div>
        <div className="chapter-manager-actions">
          <div className="course-search">
            <AppIcon name="search" size={15} />
            <input type="text" placeholder="Search chapters..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="admin-form-select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">All Subjects</option>
            {courseSubjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
            <AppIcon name="add" size={15} /> Add Chapter
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="chapter-create-card">
          <div className="chapter-create-title">Add New Chapter</div>
          <div className="acad-inline-form">
            <div className="acad-inline-field">
              <label className="admin-form-label">Subject</label>
              <select className="admin-form-select" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="">Select Subject</option>
                {courseSubjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Chapter Name</label>
              <input type="text" className="admin-form-input" placeholder="e.g., OSI Model" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Description</label>
              <input type="text" className="admin-form-input" placeholder="Brief description" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Chapter Number</label>
              <input type="text" className="admin-form-input" placeholder="e.g., 1" value={createNumber} onChange={(e) => setCreateNumber(e.target.value)} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Status</label>
              <select className="admin-form-select" value={createStatus} onChange={(e) => setCreateStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{STATUS_MAP[o]?.label || o}</option>)}
              </select>
            </div>
            <div className="acad-inline-actions">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate}>Create Chapter</Button>
            </div>
          </div>
        </div>
      )}

      <div className="chapter-list">
        {filtered.length === 0 ? (
          <div className="acad-empty">
            <AppIcon name="document" size={28} />
            <p>No Chapters created yet</p>
            <Button variant="primary" onClick={() => setShowCreate(true)}><AppIcon name="add" size={14} /> Create Chapter</Button>
          </div>
        ) : (
          filtered.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              subjectName={chapter.subject}
              onRename={updateChapter}
              onDuplicate={duplicateChapter}
              onDelete={deleteChapter}
              onToggleLock={toggleChapterLock}
              onSetStatus={setChapterStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ChapterManager
