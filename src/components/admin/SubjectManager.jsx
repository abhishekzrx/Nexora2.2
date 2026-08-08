/**
 * SubjectManager
 * Subject lifecycle management inside the active Course.
 * Uses centralized AppIcon system — no custom SVG, Lucide, etc.
 */

import { useState, useMemo } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useAdminStore,
  addSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject,
  setSubjectStatus,
  toggleSubjectLock,
  getDeleteSubjectImpact,
  getChaptersBySubject,
} from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'
import IconPicker from './IconPicker'

const STATUS_OPTIONS = ['active', 'draft', 'disabled', 'published']
const SORT_OPTIONS = ['name-asc', 'name-desc', 'order', 'status']
const COLOR_PRESETS = ['#F1621B', '#2E5CE6', '#12B76A', '#7C3AED', '#0E9494', '#E8491D', '#101828', '#667085']

const STATUS_MAP = {
  active: { label: 'Active', tone: 'green' },
  draft: { label: 'Draft', tone: 'orange' },
  disabled: { label: 'Disabled', tone: 'gray' },
  published: { label: 'Published', tone: 'green' },
  locked: { label: 'Locked', tone: 'red' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.active
  return <span className={`subject-status-badge tone-${cfg.tone}`}>{cfg.label}</span>
}

function SubjectCard({ subject, onRename, onDuplicate, onDelete, onToggleLock, onSetStatus }) {
  const [showActions, setShowActions] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState(subject.name)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const chapters = getChaptersBySubject(subject.name)

  const handleRename = () => {
    if (renameValue.trim()) {
      onRename(subject.id, renameValue.trim())
      showToast({ type: 'success', title: 'Subject Updated', message: `Renamed to "${renameValue.trim()}"` })
    }
    setShowRename(false)
  }

  const handleDelete = () => {
    const impact = getDeleteSubjectImpact(subject.id)
    showConfirm({
      title: 'Delete Subject?',
      message: `This will permanently delete "${subject.name}" and all its chapters, MCQs, and flashcards.`,
      impact: [
        { icon: 'document', label: 'Chapters', value: impact.chapters },
        { icon: 'mcqs', label: 'MCQs', value: impact.mcqs },
        { icon: 'flashcardsTab', label: 'Flashcards', value: impact.flashcards },
      ],
      onConfirm: () => {
        onDelete(subject.id)
        showToast({ type: 'success', title: 'Subject Deleted', message: `"${subject.name}" has been deleted` })
        dismissConfirm()
      },
      onCancel: dismissConfirm,
    })
  }

  const handleStatusChange = (newStatus) => {
    onSetStatus(subject.id, newStatus)
    setShowStatusMenu(false)
    showToast({ type: 'success', title: 'Status Updated', message: `Subject is now ${STATUS_MAP[newStatus]?.label || newStatus}` })
  }

  return (
    <div className="subject-card" style={{ '--subject-accent': subject.color || '#F1621B' }}>
      <div className="subject-card-top">
        <div className="subject-icon" style={{ background: subject.color || '#F1621B' }}>
          <AppIcon name={subject.icon || 'chapters'} size={18} />
        </div>
        <div className="subject-card-info">
          {showRename ? (
            <input type="text" className="admin-form-input subject-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRename} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setShowRename(false) }} autoFocus />
          ) : (
            <div className="subject-name">{subject.name}</div>
          )}
          <div className="subject-desc">{subject.desc || 'No description'}</div>
          <div className="subject-meta-row">
            <StatusBadge status={subject.locked ? 'locked' : subject.status} />
            <span className="subject-counts">{chapters.length} Chapters</span>
          </div>
        </div>
        <div className="subject-card-actions">
          <button type="button" className="subject-action-btn" onClick={() => setShowActions(!showActions)} aria-label="More">
            <AppIcon name="moreVert" size={18} />
          </button>
          {showActions && (
            <div className="subject-action-menu">
              <button type="button" onClick={() => { setShowRename(true); setShowActions(false) }}><AppIcon name="edit" size={14} /> Rename</button>
              <button type="button" onClick={() => { onDuplicate(subject.id); setShowActions(false); showToast({ type: 'success', title: 'Subject Duplicated', message: `Copy of "${subject.name}" created` }) }}><AppIcon name="copy" size={14} /> Duplicate</button>
              <button type="button" onClick={() => { setShowStatusMenu(!showStatusMenu); setShowActions(false) }}><AppIcon name="settings" size={14} /> Change Status</button>
              <button type="button" onClick={() => { onToggleLock(subject.id); setShowActions(false); showToast({ type: 'success', title: subject.locked ? 'Subject Unlocked' : 'Subject Locked', message: subject.locked ? `"${subject.name}" is now unlocked` : `"${subject.name}" is now locked` }) }}><AppIcon name={subject.locked ? 'lockOpen' : 'lock'} size={14} /> {subject.locked ? 'Unlock' : 'Lock'}</button>
              <button type="button" className="danger" onClick={() => { handleDelete(); setShowActions(false) }}><AppIcon name="delete" size={14} /> Delete</button>
            </div>
          )}
          {showStatusMenu && (
            <div className="subject-status-menu">
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
      <div className="subject-card-footer">
        <div className="subject-stat"><AppIcon name="document" size={14} /> {chapters.length} Chapters</div>
        <div className="subject-stat"><AppIcon name="mcqs" size={14} /> {subject.stats?.[1]?.value || 0} MCQs</div>
        <div className="subject-stat"><AppIcon name="flashcardsTab" size={14} /> {subject.stats?.[2]?.value || 0} Flashcards</div>
        <StatusBadge status={subject.locked ? 'locked' : subject.status} />
      </div>
    </div>
  )
}

function SubjectManager(_courseName) {
  const { activeCourseId } = useWorkspaceStore()
  const { subjects } = useAdminStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('order')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createIcon, setCreateIcon] = useState('chapters')
  const [createColor, setCreateColor] = useState('#F1621B')
  const [createStatus, setCreateStatus] = useState('active')

  const courseSubjects = useMemo(() => {
    if (!activeCourseId) return []
    return subjects.filter((s) => s.courseId === activeCourseId)
  }, [activeCourseId, subjects])

  const filtered = useMemo(() => {
    let list = [...courseSubjects]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q))
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'locked') list = list.filter((s) => s.locked)
      else list = list.filter((s) => s.status === filterStatus)
    }
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'order') return (a.order || 0) - (b.order || 0)
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      return 0
    })
    return list
  }, [courseSubjects, search, sortBy, filterStatus])

  const handleCreate = () => {
    if (!createName.trim() || !activeCourseId) return
    addSubject({ name: createName.trim(), desc: createDesc.trim(), icon: createIcon, color: createColor, status: createStatus })
    setShowCreate(false)
    setCreateName('')
    setCreateDesc('')
    setCreateIcon('chapters')
    setCreateColor('#F1621B')
    setCreateStatus('active')
    showToast({ type: 'success', title: 'Subject Created', message: `"${createName.trim()}" added to course` })
  }

  if (!activeCourseId) {
    return (
      <div className="subject-manager">
        <div className="acad-empty">
          <AppIcon name="adminDashboard" size={28} />
          <p>Select a Course to manage Subjects</p>
        </div>
      </div>
    )
  }

  return (
    <div className="subject-manager">
      <div className="subject-manager-header">
        <div className="subject-manager-title">
          <AppIcon name="chapters" size={20} />
          Subject Manager
        </div>
        <div className="subject-manager-actions">
          <div className="course-search">
            <AppIcon name="search" size={15} />
            <input type="text" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="admin-form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="admin-form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="locked">Locked</option>
            <option value="published">Published</option>
          </select>
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
            <AppIcon name="add" size={15} /> Add Subject
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="subject-create-card">
          <div className="subject-create-title">Add New Subject</div>
          <div className="subject-create-form">
            <div className="acad-inline-field">
              <label className="admin-form-label">Subject Name</label>
              <input type="text" className="admin-form-input" placeholder="e.g., Computer Networks" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Description</label>
              <input type="text" className="admin-form-input" placeholder="Brief description" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Icon</label>
              <IconPicker value={createIcon} onChange={setCreateIcon} />
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Color</label>
              <div className="color-picker">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} type="button" className={`color-swatch${createColor === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setCreateColor(c)} />
                ))}
              </div>
            </div>
            <div className="acad-inline-field">
              <label className="admin-form-label">Status</label>
              <select className="admin-form-select" value={createStatus} onChange={(e) => setCreateStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{STATUS_MAP[o]?.label || o}</option>)}
              </select>
            </div>
            <div className="acad-inline-actions">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate}>Create Subject</Button>
            </div>
          </div>
        </div>
      )}

      <div className="subject-list">
        {filtered.length === 0 ? (
          <div className="acad-empty">
            <AppIcon name="chapters" size={28} />
            <p>No Subjects have been created for this Course yet.</p>
            <Button variant="primary" onClick={() => setShowCreate(true)}><AppIcon name="add" size={14} /> Create Subject</Button>
          </div>
        ) : (
          filtered.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onRename={updateSubject}
              onDuplicate={duplicateSubject}
              onDelete={deleteSubject}
              onToggleLock={toggleSubjectLock}
              onSetStatus={setSubjectStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SubjectManager
