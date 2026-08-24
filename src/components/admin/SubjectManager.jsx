/**
 * SubjectManager
 * Pro EdTech Course-Scoped Subject & Chapter Control Center.
 * Features:
 * 1. Top Course Selector Bar: Displays all existing courses with status badges & subject counts.
 * 2. Dedicated Subject Creation: Add subjects to any dedicated course with a target course dropdown.
 * 3. 6 KPI Summary Row for the selected Course.
 * 4. Two-Column Workspace: Left Subject List + Right Selected Subject Analytics & Chapter Workspace.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useAdminStore,
  duplicateSubject,
  toggleSubjectLock,
  getDeleteSubjectImpact,
  getDeleteChapterImpact,
  seedDefaultSubjects,
  hydrateAdminStoreFromSupabase,
} from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'
import { subjectService, getSubjectIconByName } from '../../services/subjectService'
import { chapterService } from '../../services/chapterService'
import { mcqService } from '../../services/mcqService'
import IconPicker from './IconPicker'
import ChapterNotesEditorModal from './ChapterNotesEditorModal'
import { formatPriority, BPSC_PRIORITY_MAP, getBpscChapterMeta } from '../../data/bpscPrelimsChapters'

const COLOR_PRESETS = [
  '#F1621B',
  '#2E5CE6',
  '#12B76A',
  '#7C3AED',
  '#0E9494',
  '#E8491D',
  '#D92D20',
  '#4F46E5',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#84CC16',
  '#0284C7',
  '#475569',
  '#101828',
]

const SUBJECT_DOMAINS = {
  'digital electronics': [
    { name: 'Number Systems & Boolean Algebra' },
    { name: 'Logic Gates & Minimization (K-Maps)' },
    { name: 'Combinational Logic Circuits' },
    { name: 'Sequential Logic Circuits & Flip-Flops' },
  ],
  'computer organization & architecture (coa)': [
    { name: 'Machine Instructions & Addressing Modes' },
    { name: 'ALU, Data Path & Control Unit Design' },
    { name: 'Memory Hierarchy & Cache Mapping' },
    { name: 'Pipelining & I/O Interface' },
  ],
  'operating systems': [
    { name: 'Processes, Threads & CPU Scheduling' },
    { name: 'Process Synchronization & Deadlocks' },
    { name: 'Memory Management & Virtual Memory' },
    { name: 'File Systems & I/O Protection' },
  ],
  'database management systems (dbms)': [
    { name: 'ER Modeling & Relational Algebra' },
    { name: 'SQL Queries, Joins & Subqueries' },
    { name: 'Normalization & Functional Dependencies' },
    { name: 'Transaction Processing & Concurrency' },
  ],
  'computer networks': [
    { name: 'Network Fundamentals & Architecture' },
    { name: 'Physical & Data Link Layer' },
    { name: 'Network Layer & IP Addressing' },
    { name: 'Transport & Application Layer' },
  ],
  'python programming': [
    { name: 'Data Types, Control Flow & Loops' },
    { name: 'Functions, Modules & Recursion' },
    { name: 'File Handling & Exception Management' },
    { name: 'Object-Oriented Programming (OOP)' },
  ],
  'physics': [
    { name: 'Physical World, Units & Measurements' },
    { name: 'Kinematics & Laws of Motion' },
    { name: 'Work, Energy & Power' },
    { name: 'Gravitation & Fluid Mechanics' },
  ],
  'chemistry': [
    { name: 'Some Basic Concepts & Atomic Structure' },
    { name: 'Chemical Bonding & Molecular Structure' },
    { name: 'States of Matter & Thermodynamics' },
    { name: 'Equilibrium & Redox Reactions' },
  ],
}

const STATUS_MAP = {
  active: { label: 'ACTIVE', tone: 'green' },
  disabled: { label: 'DISABLED', tone: 'gray' },
  draft: { label: 'DRAFT', tone: 'orange' },
  published: { label: 'PUBLISHED', tone: 'blue' },
  locked: { label: 'LOCKED', tone: 'red' },
}

function StatusBadge({ status, locked }) {
  if (locked) {
    return (
      <span className="sm-badge sm-badge-locked">
        <AppIcon name="lock" size={11} /> Locked
      </span>
    )
  }
  const cfg = STATUS_MAP[status] || STATUS_MAP.active
  return <span className={`sm-badge sm-badge-${cfg.tone}`}>{cfg.label}</span>
}

/* ── Course Selector Bar Component ───────────────────────────── */
function CourseSelectorBar({ workspaces, activeCourseId, allSubjects, onSelectCourse, onAddSubject }) {
  return (
    <div className="sm-course-selector-bar">
      <div className="sm-course-bar-header">
        <div className="sm-course-bar-title-wrap">
          <AppIcon name="folder" size={16} />
          <h4 className="sm-course-bar-title">Select Working Course ({workspaces.length})</h4>
        </div>
        <Button variant="primary" size="sm" onClick={onAddSubject}>
          <AppIcon name="add" size={14} /> Add Subject to Course
        </Button>
      </div>

      <div className="sm-course-pills-grid">
        {workspaces.map((course) => {
          const isSelected = course.id === activeCourseId
          const subjectCount = (allSubjects || []).filter((s) => s.courseId === course.id).length
          const isDraft = course.status === 'draft'

          return (
            <div
              key={course.id}
              className={`sm-course-pill-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectCourse(course.id)}
            >
              <div className="sm-pill-top">
                <span
                  className="sm-pill-icon"
                  style={{ background: course.themeColor || (isDraft ? '#F59E0B' : '#F1621B') }}
                >
                  <AppIcon name={course.icon || 'folder'} size={15} />
                </span>
                <span className={`sm-pill-status ${isDraft ? 'draft' : 'active'}`}>
                  {course.status ? course.status.toUpperCase() : 'ACTIVE'}
                </span>
              </div>

              <div className="sm-pill-name" title={course.name}>
                {course.name}
              </div>

              <div className="sm-pill-bottom">
                <span className="sm-pill-count-badge">
                  <AppIcon name="chapters" size={12} /> {subjectCount} {subjectCount === 1 ? 'Subject' : 'Subjects'}
                </span>
                {isSelected && <span className="sm-pill-active-check">✓ Active</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Subject Modal (Create & Edit) ───────────────────────────── */
function SubjectModal({ initialData, workspaces, activeCourseId, isSaving, onSave, onClose }) {
  const isEditing = Boolean(initialData && initialData.id)
  const [courseId, setCourseId] = useState(initialData?.courseId || activeCourseId)
  const [name, setName] = useState(initialData?.name || '')
  const [desc, setDesc] = useState(initialData?.desc || '')
  const [icon, setIcon] = useState(initialData?.icon || 'chapters')
  const [color, setColor] = useState(initialData?.color || '#F1621B')
  const [status, setStatus] = useState(initialData?.status || 'active')
  const [locked, setLocked] = useState(initialData?.locked || false)
  const [creationError, setCreationError] = useState('')

  const selectedCourse = workspaces.find((w) => w.id === courseId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreationError('')
    if (!name.trim() || !courseId || isSaving) return
    const result = await onSave({
      id: initialData?.id,
      courseId,
      name: name.trim(),
      desc: desc.trim(),
      icon,
      color,
      status,
      locked,
    })
    if (!result?.success) {
      setCreationError(result?.error || 'Failed to save subject.')
    }
  }

  const handleNameChange = (val) => {
    setName(val)
    if (!isEditing || icon === 'chapters') {
      const suggestedIcon = getSubjectIconByName(val, icon)
      setIcon(suggestedIcon)
    }
  }

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sm-modal-header">
          <div className="sm-modal-title-wrap">
            <AppIcon name={isEditing ? 'edit' : 'add'} size={18} />
            <h3 className="sm-modal-title">{isEditing ? 'Edit Subject' : 'Add Subject to Course'}</h3>
          </div>
          <button type="button" className="sm-close-btn" onClick={onClose}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sm-modal-form">
          {/* Target Course Selector */}
          <div className="sm-field">
            <label className="sm-label">Dedicated Course *</label>
            <select
              className="sm-select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isEditing}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.status || 'Active'})
                </option>
              ))}
            </select>
            {selectedCourse && (
              <span className="sm-context-hint">
                Adding Subject under: <strong>{selectedCourse.name}</strong>
              </span>
            )}
          </div>

          <div className="sm-field">
            <label className="sm-label">Subject Name *</label>
            <input
              type="text"
              className="sm-input"
              placeholder="e.g., Data Structures & Algorithms"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="sm-field">
            <label className="sm-label">Description</label>
            <input
              type="text"
              className="sm-input"
              placeholder="Brief summary of topics covered..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="sm-field">
            <IconPicker value={icon} onChange={setIcon} label="Subject Icon *" />
          </div>

          <div className="sm-field">
            <label className="sm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Color Theme</span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                Selected: <strong style={{ color }}>{color}</strong>
              </span>
            </label>
            <div className="sm-color-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`sm-color-btn${color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>

            {/* Custom Color Input Controls for 100% flexibility */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                <input
                  type="color"
                  value={color || '#F1621B'}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
                <span>Custom Color Picker</span>
              </label>
              <input
                type="text"
                className="sm-input"
                style={{ width: '110px', padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}
                value={color || ''}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#F1621B"
              />
            </div>
          </div>

          <div className="sm-form-row-2">
            <div className="sm-field">
              <label className="sm-label">Status</label>
              <select className="sm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="sm-field sm-checkbox-field">
              <label className="sm-checkbox-label">
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                />
                <span>Lock Subject</span>
              </label>
            </div>
          </div>

          {creationError && (
            <div className="sm-modal-error">
              <AppIcon name="error" size={14} />
              <span>{creationError}</span>
            </div>
          )}

          <div className="sm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Subject')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatChapterDate(dateVal) {
  if (!dateVal) return 'Recently added'
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return 'Recently added'
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recently added'
  }
}

/* ── Chapter Create & Edit Modal ────────────────────────────── */
function ChapterModal({ subjectName, initialData, existingChapters = [], onSave, onClose }) {
  const isEditing = Boolean(initialData && initialData.id)

  // Last added chapter for this subject
  const lastAddedChapter = useMemo(() => {
    if (!existingChapters || existingChapters.length === 0) return null
    const sorted = [...existingChapters].sort((a, b) => {
      const timeA = a.createdAt || a.created_at ? new Date(a.createdAt || a.created_at).getTime() : 0
      const timeB = b.createdAt || b.created_at ? new Date(b.createdAt || b.created_at).getTime() : 0
      if (timeA !== timeB && timeA > 0 && timeB > 0) return timeB - timeA
      return (Number(b.number) || 0) - (Number(a.number) || 0)
    })
    return sorted[0]
  }, [existingChapters])

  // Default auto-incremented chapter number
  const defaultNextNumber = useMemo(() => {
    if (isEditing && initialData?.number) return initialData.number
    if (!existingChapters || existingChapters.length === 0) return 1
    const maxNum = Math.max(...existingChapters.map((c) => Number(c.number) || 0), 0)
    return maxNum + 1
  }, [existingChapters, isEditing, initialData])

  const [name, setName] = useState(initialData?.name || '')
  const [code, setCode] = useState(initialData?.code || '')
  const [priority, setPriority] = useState(initialData?.priority || 'M')
  const [desc, setDesc] = useState(initialData?.desc || initialData?.description || '')
  const [number, setNumber] = useState(initialData?.number ?? defaultNextNumber)

  useEffect(() => {
    if (!isEditing) {
      setNumber(defaultNextNumber)
    }
  }, [defaultNextNumber, isEditing])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: initialData?.id,
      subject: subjectName,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      priority: priority || 'M',
      desc: desc.trim(),
      number: Number(number) || defaultNextNumber,
    })
  }

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sm-modal-header">
          <div className="sm-modal-title-wrap">
            <AppIcon name={isEditing ? 'edit' : 'add'} size={18} />
            <h3 className="sm-modal-title">{isEditing ? 'Edit Chapter' : 'Add New Chapter'}</h3>
          </div>
          <button type="button" className="sm-close-btn" onClick={onClose}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div className="sm-course-context-box">
          <AppIcon name="chapters" size={14} />
          <span>Subject: <strong>{subjectName}</strong></span>
        </div>

        {!isEditing && (
          <div
            className="sm-last-added-info-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(46, 92, 230, 0.05)',
              border: '1px solid rgba(46, 92, 230, 0.15)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '12px',
              fontSize: '12px',
              color: '#334155',
            }}
          >
            <AppIcon name="clock" size={15} style={{ color: '#2E5CE6', flexShrink: 0 }} />
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Last Added Chapter: </span>
              {lastAddedChapter ? (
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  Chapter {lastAddedChapter.number}: {lastAddedChapter.name}{' '}
                  <span style={{ fontWeight: 500, color: '#64748B', fontSize: '11px', marginLeft: '4px' }}>
                    ({formatChapterDate(lastAddedChapter.createdAt || lastAddedChapter.created_at)})
                  </span>
                </span>
              ) : (
                <span style={{ fontStyle: 'italic', color: '#64748B' }}>No chapters added yet (Next will be Chapter 1)</span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sm-modal-form">
          <div className="sm-form-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px' }}>
            <div className="sm-field">
              <label className="sm-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Chapter #</span>
                {!isEditing && (
                  <span style={{ fontSize: '10px', color: '#12B76A', fontWeight: 600, backgroundColor: 'rgba(18, 183, 106, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    Auto
                  </span>
                )}
              </label>
              <input
                type="number"
                className="sm-input"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            <div className="sm-field">
              <label className="sm-label">Chapter Code</label>
              <input
                type="text"
                className="sm-input"
                placeholder="e.g. HIST-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              />
            </div>

            <div className="sm-field">
              <label className="sm-label">Priority</label>
              <select
                className="sm-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="VH">Very High (VH)</option>
                <option value="H">High (H)</option>
                <option value="H/M">High / Medium (H/M)</option>
                <option value="M">Medium (M)</option>
                <option value="L/M">Low / Medium (L/M)</option>
                <option value="L">Low (L)</option>
              </select>
            </div>
          </div>

          <div className="sm-field" style={{ marginTop: '10px' }}>
            <label className="sm-label">Chapter Title *</label>
            <input
              type="text"
              className="sm-input"
              placeholder="e.g., Gandhian Era & Freedom Movements (1917–1947)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="sm-field" style={{ marginTop: '10px' }}>
            <label className="sm-label">Description / Summary (Detailed Topics for Item Generation)</label>
            <textarea
              className="sm-input"
              rows={3}
              placeholder="Detailed content description from syllabus..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="sm-modal-actions" style={{ marginTop: '16px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? 'Save Chapter' : 'Add Chapter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Subject Delete Security Modal ─────────────────────────────── */
function DeleteSubjectSecurityModal({
  isOpen,
  subject,
  impact,
  securityCode,
  onSecurityCodeChange,
  error,
  onConfirm,
  onClose,
}) {
  if (!isOpen || !subject) return null

  return (
    <div className="cm-security-modal-overlay" onClick={onClose}>
      <div className="cm-security-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-security-header">
          <div className="cm-security-badge-icon" style={{ background: '#FEF3F2', color: '#D92D20' }}>
            <AppIcon name="delete" size={20} />
          </div>
          <div>
            <h3 className="cm-security-title">Delete Subject "{subject.name}"?</h3>
            <p className="cm-security-sub">Security verification code required to confirm this deletion.</p>
          </div>
        </div>

        {impact && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#991B1B' }}>
            <strong>Impact Warning:</strong> Deleting this subject will permanently remove <strong>{impact.chapters || 0} Chapters</strong>, <strong>{impact.mcqs || 0} MCQs</strong>, and <strong>{impact.flashcards || 0} Flashcards</strong>.
          </div>
        )}

        <div className="cm-security-code-field">
          <label className="cm-label" style={{ fontWeight: 700, color: '#0F172A' }}>
            Enter Change Code *
          </label>
          <input
            type="password"
            className="cm-security-input"
            value={securityCode}
            onChange={(e) => onSecurityCodeChange(e.target.value)}
            placeholder="Enter change code (e.g. Abhisheka)..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm()
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            🔒 Enter security passcode "Abhisheka" to confirm deletion.
          </span>
        </div>

        {error && (
          <div className="cm-security-error">
            <AppIcon name="help" size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="cm-form-actions" style={{ marginTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm}>
            Confirm & Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Subject Row Item ─────────────────────────────────────────── */
function SubjectListRow({
  subject,
  isSelected,
  stats,
  onSelect,
  onEdit,
  onDuplicate,
  onToggleLock,
  onOpenDeleteModal,
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClick)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showMenu])

  const handleDelete = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    onOpenDeleteModal(subject)
  }

  return (
    <div
      className={`sm-subject-row-item${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(subject.id)}
    >
      <div className="sm-row-left">
        <span className="sm-row-icon-badge" style={{ background: subject.color || '#F1621B' }}>
          <AppIcon name={subject.icon || 'chapters'} size={16} />
        </span>
        <div className="sm-row-titles">
          <h4 className="sm-row-subject-name">{subject.name}</h4>
          <span className="sm-row-sub-text">
            {stats.chapters} Chapters · {stats.mcqs} MCQs
          </span>
        </div>
      </div>

      <div className="sm-row-right" onClick={(e) => e.stopPropagation()}>
        <StatusBadge status={subject.status} locked={subject.locked} />

        <div className="sm-action-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sm-three-dots-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Actions"
          >
            <AppIcon name="moreVert" size={15} />
          </button>

          {showMenu && (
            <div className="sm-dropdown">
              <button type="button" onClick={() => { onEdit(subject); setShowMenu(false) }}>
                <AppIcon name="edit" size={14} /> Edit Subject
              </button>
              <button type="button" onClick={() => { onDuplicate(subject.id); setShowMenu(false); showToast({ type: 'success', title: 'Duplicated', message: `Copy of "${subject.name}" created` }) }}>
                <AppIcon name="copy" size={14} /> Duplicate
              </button>
              <button type="button" onClick={() => { onToggleLock(subject.id); setShowMenu(false); showToast({ type: 'success', title: subject.locked ? 'Unlocked' : 'Locked', message: `Subject "${subject.name}" updated` }) }}>
                <AppIcon name={subject.locked ? 'lockOpen' : 'lock'} size={14} />
                {subject.locked ? 'Unlock' : 'Lock'}
              </button>
              <button type="button" className="danger" onClick={handleDelete}>
                <AppIcon name="delete" size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        <span className="sm-row-chevron">&rsaquo;</span>
      </div>
    </div>
  )
}

/* ── Chapter Delete Security Modal ─────────────────────────────── */
function DeleteChapterSecurityModal({
  isOpen,
  chapter,
  impact,
  securityCode,
  onSecurityCodeChange,
  error,
  onConfirm,
  onClose,
}) {
  if (!isOpen || !chapter) return null

  return (
    <div className="cm-security-modal-overlay" onClick={onClose}>
      <div className="cm-security-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-security-header">
          <div className="cm-security-badge-icon" style={{ background: '#FEF3F2', color: '#D92D20' }}>
            <AppIcon name="delete" size={20} />
          </div>
          <div>
            <h3 className="cm-security-title">Delete Chapter "{chapter.name}"?</h3>
            <p className="cm-security-sub">Security verification code required to confirm this deletion.</p>
          </div>
        </div>

        {impact && (impact.mcqs > 0 || impact.flashcards > 0) && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#991B1B' }}>
            <strong>Impact Warning:</strong> Deleting this chapter will also remove <strong>{impact.mcqs || 0} MCQs</strong> and <strong>{impact.flashcards || 0} Flashcards</strong>.
          </div>
        )}

        <div className="cm-security-code-field">
          <label className="cm-label" style={{ fontWeight: 700, color: '#0F172A' }}>
            Enter Change Code *
          </label>
          <input
            type="password"
            className="cm-security-input"
            value={securityCode}
            onChange={(e) => onSecurityCodeChange(e.target.value)}
            placeholder="Enter change code (e.g. Abhisheka)..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm()
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            🔒 Enter security passcode "Abhisheka" to confirm deletion.
          </span>
        </div>

        {error && (
          <div className="cm-security-error">
            <AppIcon name="help" size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="cm-form-actions" style={{ marginTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm}>
            Confirm & Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Right Selected Subject Analytics & Chapter Workspace Panel ──── */
function SelectedSubjectPanel({ selectedSubject, chapters, mcqs, flashcards, notes = [], onEditSubject, onToggleLock, activeCourseId }) {
  const [activeTab, setActiveTab] = useState('chapters')
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [notesEditorModal, setNotesEditorModal] = useState({ open: false, chapter: null })

  // Chapter Delete Security Modal State
  const [deleteSecurityModal, setDeleteSecurityModal] = useState({
    open: false,
    chapter: null,
    impact: null,
    securityCode: '',
    error: '',
  })

  if (!selectedSubject) {
    return (
      <div className="sm-analytics-empty">
        <AppIcon name="chapters" size={32} />
        <h4>No Subject Selected</h4>
        <p>Select a subject from the left list to view and manage its chapters and content.</p>
      </div>
    )
  }

  // Chapter content for this specific subject (Returns ONLY actual created/stored chapters from DB)
  const subjectChapters = useMemo(() => {
    if (!selectedSubject) return []
    return chapters.filter(
      (c) =>
        (c.subjectId && c.subjectId === selectedSubject.id) ||
        (c.subject_id && c.subject_id === selectedSubject.id) ||
        (c.subject && String(c.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase()) ||
        (c.subjectName && String(c.subjectName).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())
    )
  }, [chapters, selectedSubject])

  // Helper to compute EXACT chapter content counts (MCQs, Flashcards, Notes) directly from DB store
  const getChapterContentCounts = useCallback(
    (ch) => {
      if (!ch) return { mcqs: 0, flashcards: 0, notes: 0 }

      // 1. Exact matching questions from mcqs store
      const matchingM = mcqs.filter((m) => {
        const matchesSubject =
          !selectedSubject ||
          m.subjectId === selectedSubject.id ||
          m.subject_id === selectedSubject.id ||
          (m.subject && String(m.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())

        const matchesChapter =
          m.chapterId === ch.id ||
          m.chapter_id === ch.id ||
          (m.chapter && String(m.chapter).trim().toLowerCase() === String(ch.name).trim().toLowerCase())

        return matchesSubject && matchesChapter
      })

      // 2. Exact matching cards from flashcards store
      const matchingF = flashcards.filter((f) => {
        const matchesSubject =
          !selectedSubject ||
          f.subjectId === selectedSubject.id ||
          f.subject_id === selectedSubject.id ||
          (f.subject && String(f.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())

        const matchesChapter =
          f.chapterId === ch.id ||
          f.chapter_id === ch.id ||
          (f.chapter && String(f.chapter).trim().toLowerCase() === String(ch.name).trim().toLowerCase())

        return matchesSubject && matchesChapter
      })

      // 3. Exact matching notes from notes store
      const matchingN = (notes || []).filter((n) => {
        const matchesSubject =
          !selectedSubject ||
          n.subjectId === selectedSubject.id ||
          n.subject_id === selectedSubject.id ||
          (n.subject && String(n.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())

        const matchesChapter =
          String(n.chapterId || n.chapter_id) === String(ch.id) ||
          (n.title && String(ch.name) && n.title.toLowerCase().includes(String(ch.name).toLowerCase())) ||
          (n.chapter && String(n.chapter).trim().toLowerCase() === String(ch.name).trim().toLowerCase())

        return matchesSubject && matchesChapter
      })

      const mCount = matchingM.length > 0 ? matchingM.length : (typeof ch.mcqs === 'number' ? ch.mcqs : 0)
      const fCount = matchingF.length > 0 ? matchingF.length : (typeof ch.flashcards === 'number' ? ch.flashcards : 0)
      const nCount = matchingN.length > 0 ? matchingN.length : (typeof ch.notes === 'number' ? ch.notes : 0)

      return { mcqs: mCount, flashcards: fCount, notes: nCount }
    },
    [mcqs, flashcards, notes, selectedSubject],
  )

  const chapterCount = subjectChapters.length

  const mcqCount = useMemo(() => {
    const directMcqs = mcqs.filter(
      (m) =>
        (m.subjectId && m.subjectId === selectedSubject.id) ||
        (m.subject_id && m.subject_id === selectedSubject.id) ||
        (m.subject && String(m.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())
    )
    if (directMcqs.length > 0) return directMcqs.length
    return subjectChapters.reduce((sum, ch) => sum + getChapterContentCounts(ch).mcqs, 0)
  }, [mcqs, selectedSubject, subjectChapters, getChapterContentCounts])

  const flashcardCount = useMemo(() => {
    const directFlash = flashcards.filter(
      (f) =>
        (f.subjectId && f.subjectId === selectedSubject.id) ||
        (f.subject_id && f.subject_id === selectedSubject.id) ||
        (f.subject && String(f.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())
    )
    if (directFlash.length > 0) return directFlash.length
    return subjectChapters.reduce((sum, ch) => sum + getChapterContentCounts(ch).flashcards, 0)
  }, [flashcards, selectedSubject, subjectChapters, getChapterContentCounts])

  const readinessScore = Math.min(
    100,
    Math.round(
      (Math.min(100, (chapterCount / 10) * 100) +
        Math.min(100, (mcqCount / 100) * 100) +
        Math.min(100, (flashcardCount / 50) * 100)) /
        3,
    ) || 75,
  )

  const handleSaveChapter = async (data) => {
    const targetSubject = selectedSubject || subjects.find((s) => s.id === data.subjectId) || subjects[0]
    if (!targetSubject) return

    if (!activeCourseId) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a course.' })
      return
    }
    if (!targetSubject?.id) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a subject.' })
      return
    }

    try {
      if (data.id) {
        const res = await chapterService.updateChapter(data.id, {
          name: data.name,
          number: data.number,
          code: data.code,
          priority: data.priority,
          desc: data.desc,
          courseId: activeCourseId,
        })
        if (res.success) {
          showToast({ type: 'success', title: 'Chapter Updated', message: `"${data.name}" updated.` })
        } else {
          showToast({ type: 'error', title: 'Update Failed', message: res.error || 'Unable to update chapter.' })
        }
      } else {
        const res = await chapterService.createChapter(activeCourseId, targetSubject.id, {
          name: data.name,
          code: data.code,
          priority: data.priority,
          desc: data.desc,
          subjectName: targetSubject.name,
          number: data.number,
          status: data.status || 'active',
        })
        if (res.success && res.data) {
          showToast({ type: 'success', title: 'Chapter Added', message: `"${data.name}" added to ${targetSubject.name}.` })
        } else {
          showToast({ type: 'error', title: 'Creation Failed', message: res.error || 'Unable to create chapter.' })
        }
      }
      setShowChapterModal(false)
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'An unexpected error occurred.' })
    }
  }

  const handleDeleteChapter = (ch) => {
    if (!ch || !ch.id) {
      showToast({ type: 'error', title: 'Error', message: 'Selected chapter is invalid.' })
      return
    }
    const impact = typeof getDeleteChapterImpact === 'function' ? getDeleteChapterImpact(ch.id) : getChapterContentCounts(ch)
    setDeleteSecurityModal({
      open: true,
      chapter: ch,
      impact,
      securityCode: '',
      error: '',
    })
  }

  const handleExecuteChapterDelete = async () => {
    if (deleteSecurityModal.securityCode.trim() !== 'Abhisheka') {
      setDeleteSecurityModal((prev) => ({
        ...prev,
        error: 'Invalid Security Code! Enter "Abhisheka" to confirm.',
      }))
      showToast({ type: 'error', title: 'Security Check Failed', message: 'Invalid change code entered.' })
      return
    }

    const ch = deleteSecurityModal.chapter
    if (!ch) return

    try {
      const res = await chapterService.deleteChapter(ch.id)
      if (res.success) {
        showToast({ type: 'success', title: 'Chapter Deleted', message: `Chapter "${ch.name}" deleted successfully.` })
      } else {
        showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Unable to delete chapter.' })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'An unexpected error occurred.' })
    } finally {
      setDeleteSecurityModal({ open: false, chapter: null, impact: null, securityCode: '', error: '' })
    }
  }

  const handleResetChapterState = (ch) => {
    if (!ch || !ch.id) return
    showConfirm({
      title: `Reset Readiness & Accuracy for "${ch.name}"?`,
      message: `This will clear all student attempt metrics, readiness score %, accuracy, and mastery progress for Chapter "${ch.name}". Chapter content and questions will remain safe.`,
      confirmLabel: 'Reset State',
      confirmVariant: 'warning',
      onConfirm: async () => {
        const res = await mcqService.resetChapterProgress(ch.id)
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Chapter State Reset',
            message: `Cleared readiness score, accuracy %, and student metrics for "${ch.name}".`,
            duration: 4000,
          })
        } else {
          showToast({
            type: 'error',
            title: 'Reset Failed',
            message: res.error || 'Unable to reset chapter state.',
          })
        }
      },
    })
  }

  const handleResetSubjectState = () => {
    if (!selectedSubject || !selectedSubject.id) return
    const chapIds = subjectChapters.map((c) => c.id).filter(Boolean)
    showConfirm({
      title: `Reset All Chapter States for "${selectedSubject.name}"?`,
      message: `This will clear student attempt metrics, readiness score %, accuracy, and mastery progress across all ${chapIds.length} chapters in "${selectedSubject.name}". All question bank content remains safe.`,
      confirmLabel: 'Reset All Chapter States',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const res = await mcqService.resetSubjectProgress(selectedSubject.id, chapIds)
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Subject Progress Reset',
            message: `Cleared readiness & accuracy metrics across all chapters in "${selectedSubject.name}".`,
            duration: 4000,
          })
        } else {
          showToast({
            type: 'error',
            title: 'Reset Failed',
            message: res.error || 'Unable to reset subject progress.',
          })
        }
      },
    })
  }

  return (
    <div className="sm-analytics-panel sm-subject-card-panel">
      {/* 1. SUBJECT TITLE AS PRIMARY PANEL HEADER */}
      <div className="sm-subject-panel-header">
        <div className="sm-subject-title-wrap">
          <span className="sm-subject-icon-badge" style={{ background: selectedSubject.color || '#F1621B' }}>
            <AppIcon name={selectedSubject.icon || 'chapters'} size={20} />
          </span>
          <div>
            <div className="sm-subject-heading-row">
              <h3 className="sm-subject-panel-title">{selectedSubject.name}</h3>
              <StatusBadge status={selectedSubject.status} locked={selectedSubject.locked} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC SUBJECT SUMMARY METRICS ROW */}
      <div className="sm-four-grid sm-subject-metrics-grid">
        <div className="sm-four-card">
          <span className="sm-four-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
            <AppIcon name="document" size={16} />
          </span>
          <div>
            <div className="sm-four-val">{chapterCount}</div>
            <div className="sm-four-label">Chapters</div>
          </div>
        </div>

        <div className="sm-four-card">
          <span className="sm-four-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
            <AppIcon name="help" size={16} />
          </span>
          <div>
            <div className="sm-four-val">{mcqCount}</div>
            <div className="sm-four-label">MCQs</div>
          </div>
        </div>

        <div className="sm-four-card">
          <span className="sm-four-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
            <AppIcon name="flashcardsTab" size={16} />
          </span>
          <div>
            <div className="sm-four-val">{flashcardCount}</div>
            <div className="sm-four-label">Flashcards</div>
          </div>
        </div>

        <div className="sm-four-card">
          <span className="sm-four-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
            <AppIcon name="target" size={16} />
          </span>
          <div>
            <div className="sm-four-val">{readinessScore}%</div>
            <div className="sm-four-label">Readiness</div>
          </div>
        </div>
      </div>

      {/* Tabs inside Selected Subject */}
      <div className="sm-analytics-tabs">
        <button
          type="button"
          className={`sm-tab-btn${activeTab === 'chapters' ? ' active' : ''}`}
          onClick={() => setActiveTab('chapters')}
        >
          Chapter Management ({chapterCount})
        </button>
        <button
          type="button"
          className={`sm-tab-btn${activeTab === 'graph' ? ' active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Content Graph
        </button>
        <button
          type="button"
          className={`sm-tab-btn${activeTab === 'settings' ? ' active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Subject Actions
        </button>
      </div>

      {/* Tab 1: Chapter Management */}
      {activeTab === 'chapters' && (
        <div className="sm-tab-content">
          <div className="sm-chapter-section-header">
            <h4 className="sm-block-title">Chapters</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetSubjectState}
                disabled={subjectChapters.length === 0}
                title="Reset readiness score, accuracy %, and student progress across all chapters in this subject"
              >
                <AppIcon name="timer" size={13} /> Reset All Chapter States
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setEditingChapter(null); setShowChapterModal(true) }}>
                <AppIcon name="add" size={13} /> Add Chapter
              </Button>
            </div>
          </div>

          {subjectChapters.length === 0 ? (
            <div className="sm-empty-chapters">
              <AppIcon name="document" size={24} />
              <p>No chapters created yet.</p>
              <Button variant="primary" size="sm" onClick={() => { setEditingChapter(null); setShowChapterModal(true) }}>
                <AppIcon name="add" size={14} /> Add Chapter
              </Button>
            </div>
          ) : (
            <div className="sm-chapters-list">
              {subjectChapters.map((ch, idx) => {
                const counts = getChapterContentCounts(ch, idx)
                const chNum = ch.number || idx + 1
                const meta = getBpscChapterMeta(ch.name, ch.code)
                const displayCode = ch.code || (meta ? meta.code : '')
                const displayPriority = ch.priority || (meta ? meta.priority : '')
                const prioMeta = formatPriority(displayPriority)
                const displayDesc = ch.desc || ch.description || (meta ? meta.description : '')

                return (
                  <div key={ch.id || idx} className="sm-chapter-row">
                    <span className="sm-ch-num-badge">Ch. {chNum}</span>
                    {displayCode && <span className="sm-ch-code-badge">{displayCode}</span>}

                    <div className="sm-ch-titles">
                      <div className="sm-ch-name-row">
                        <h5 className="sm-ch-name">{ch.name}</h5>
                        {displayPriority && (
                          <span className={`sm-ch-prio-badge prio-${displayPriority.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                            {prioMeta.label || displayPriority}
                          </span>
                        )}
                      </div>
                      {displayDesc && <p className="sm-ch-desc-snippet">{displayDesc}</p>}
                    </div>

                    <div className="sm-ch-meta">
                      <span className="sm-ch-stat-pill">
                        <AppIcon name="help" size={12} /> {counts.mcqs} MCQs
                      </span>
                      <span className="sm-ch-stat-pill">
                        <AppIcon name="flashcardsTab" size={12} /> {counts.flashcards} Flashcards
                      </span>
                      <span className="sm-ch-stat-pill">
                        <AppIcon name="notesTab" size={12} /> {counts.notes} Notes
                      </span>
                    </div>

                    <div className="sm-ch-actions">
                      <button
                        type="button"
                        className="sm-icon-action-btn notes"
                        onClick={() => setNotesEditorModal({ open: true, chapter: ch })}
                        title="Author / Edit Chapter Notes"
                      >
                        <AppIcon name="notesTab" size={14} />
                      </button>
                      <button
                        type="button"
                        className="sm-icon-action-btn"
                        onClick={() => handleResetChapterState(ch)}
                        title="Reset Readiness & Accuracy State for this Chapter"
                      >
                        <AppIcon name="timer" size={14} />
                      </button>
                      <button
                        type="button"
                        className="sm-icon-action-btn"
                        onClick={() => { setEditingChapter(ch); setShowChapterModal(true) }}
                        title="Edit Chapter"
                      >
                        <AppIcon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="sm-icon-action-btn danger"
                        onClick={() => handleDeleteChapter(ch)}
                        title="Delete Chapter"
                      >
                        <AppIcon name="delete" size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}


      {/* Tab 2: Content Breakdown Graph */}
      {activeTab === 'graph' && (
        <div className="sm-tab-content">
          <h4 className="sm-block-title">Subject Content Distribution</h4>
          <div className="sm-bar-chart-container">
            <svg viewBox="0 0 360 140" className="sm-bar-svg">
              <line x1="35" y1="15" x2="340" y2="15" stroke="#EAECF0" strokeDasharray="3 3" />
              <text x="25" y="18" textAnchor="end" className="sm-axis-text">100</text>
              <line x1="35" y1="55" x2="340" y2="55" stroke="#EAECF0" strokeDasharray="3 3" />
              <text x="25" y="58" textAnchor="end" className="sm-axis-text">50</text>
              <line x1="35" y1="115" x2="340" y2="115" stroke="#EAECF0" />
              <text x="25" y="118" textAnchor="end" className="sm-axis-text">0</text>

              {[
                { label: 'Chapters', val: chapterCount, color: '#2E5CE6', x: 80 },
                { label: 'MCQs', val: mcqCount, color: '#12B76A', x: 170 },
                { label: 'Flashcards', val: flashcardCount, color: '#7C3AED', x: 260 },
              ].map((b) => {
                const h = Math.max(8, Math.round((b.val / 100) * 100))
                const y = 115 - h
                return (
                  <g key={b.label}>
                    <rect x={b.x} y={y} width="34" height={h} rx="5" fill={b.color} />
                    <text x={b.x + 17} y={y - 5} textAnchor="middle" className="sm-val-badge">
                      {b.val}
                    </text>
                    <text x={b.x + 17} y="132" textAnchor="middle" className="sm-label-text">
                      {b.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Tab 3: Subject Actions */}
      {activeTab === 'settings' && (
        <div className="sm-tab-content">
          <h4 className="sm-block-title">Subject Configuration</h4>
          <div className="sm-settings-grid">
            <div className="sm-setting-card">
              <div>
                <h5>Edit Subject Details</h5>
                <p>Change name, description, icon, and accent color.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onEditSubject(selectedSubject)}>
                <AppIcon name="edit" size={13} /> Edit
              </Button>
            </div>

            <div className="sm-setting-card">
              <div>
                <h5>Lock / Unlock Subject</h5>
                <p>Prevent or allow student access to this subject's content.</p>
              </div>
              <Button
                variant={selectedSubject.locked ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onToggleLock(selectedSubject.id)}
              >
                <AppIcon name={selectedSubject.locked ? 'lockOpen' : 'lock'} size={13} />
                {selectedSubject.locked ? 'Unlock' : 'Lock'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <ChapterModal
          subjectName={selectedSubject.name}
          initialData={editingChapter}
          existingChapters={subjectChapters}
          onSave={handleSaveChapter}
          onClose={() => setShowChapterModal(false)}
        />
      )}

      {/* Chapter Notes Editor Modal */}
      {notesEditorModal.open && notesEditorModal.chapter && (
        <ChapterNotesEditorModal
          isOpen={notesEditorModal.open}
          onClose={() => setNotesEditorModal({ open: false, chapter: null })}
          courseId={activeCourseId}
          subjectId={selectedSubject?.id}
          subjectName={selectedSubject?.name}
          chapterId={notesEditorModal.chapter?.id}
          chapterName={notesEditorModal.chapter?.name}
          chapterNumber={notesEditorModal.chapter?.number || 1}
          initialNote={(notes || []).find((n) => String(n.chapterId || n.chapter_id) === String(notesEditorModal.chapter?.id))}
          onSaved={() => {
            showToast({
              type: 'success',
              title: 'Note Saved',
              message: `Notes for "${notesEditorModal.chapter?.name}" updated successfully.`,
            })
          }}
        />
      )}

      {/* Delete Chapter Security Code Modal */}
      <DeleteChapterSecurityModal
        isOpen={deleteSecurityModal.open}
        chapter={deleteSecurityModal.chapter}
        impact={deleteSecurityModal.impact}
        securityCode={deleteSecurityModal.securityCode}
        onSecurityCodeChange={(val) => setDeleteSecurityModal((prev) => ({ ...prev, securityCode: val, error: '' }))}
        error={deleteSecurityModal.error}
        onConfirm={handleExecuteChapterDelete}
        onClose={() => setDeleteSecurityModal({ open: false, chapter: null, impact: null, securityCode: '', error: '' })}
      />
    </div>
  )
}

/* ── Main SubjectManager Component ────────────────────────────── */
function SubjectManager({ courseName: _courseName, onNavigate }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { subjects, chapters, mcqs, flashcards, notes, allSubjects } = useAdminStore()

  const [search, setSearch] = useState('')
  const [filterStatus, _setFilterStatus] = useState('all')
  const [sortBy, _setSortBy] = useState('order')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  // Subject Delete Security Modal State
  const [deleteSubjectModal, setDeleteSubjectModal] = useState({
    open: false,
    subject: null,
    impact: null,
    securityCode: '',
    error: '',
  })

  const handleOpenDeleteSubject = (subject) => {
    const impact = typeof getDeleteSubjectImpact === 'function' ? getDeleteSubjectImpact(subject.id) : { name: subject.name, chapters: 0, mcqs: 0, flashcards: 0 }
    setDeleteSubjectModal({
      open: true,
      subject,
      impact,
      securityCode: '',
      error: '',
    })
  }

  const handleExecuteSubjectDelete = async () => {
    if (deleteSubjectModal.securityCode.trim() !== 'Abhisheka') {
      setDeleteSubjectModal((prev) => ({
        ...prev,
        error: 'Invalid Security Code! Enter "Abhisheka" to confirm.',
      }))
      showToast({ type: 'error', title: 'Security Check Failed', message: 'Invalid change code entered.' })
      return
    }

    const subject = deleteSubjectModal.subject
    if (!subject) return

    try {
      const res = await subjectService.deleteSubject(subject.id)
      if (res.success) {
        showToast({ type: 'success', title: 'Subject Deleted', message: `Subject "${subject.name}" and all associated chapters deleted successfully.` })
      } else {
        showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Unable to delete subject.' })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'An unexpected error occurred.' })
    } finally {
      setDeleteSubjectModal({ open: false, subject: null, impact: null, securityCode: '', error: '' })
    }
  }

  // Current active workspace
  const activeCourse = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null
  }, [workspaces, activeWorkspaceId])

  // Subjects belonging strictly to the active course
  const courseSubjects = useMemo(() => {
    if (!activeCourse) return []
    return subjects.filter((s) => s.courseId === activeCourse.id)
  }, [subjects, activeCourse])

  useEffect(() => {
    hydrateAdminStoreFromSupabase()
  }, [activeWorkspaceId])

  useEffect(() => {
    if (courseSubjects.length > 0 && !courseSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(courseSubjects[0].id)
    }
  }, [courseSubjects, selectedSubjectId])

  // Calculate Summary Metrics
  const summaryKpis = useMemo(() => {
    const totalSubjects = courseSubjects.length
    const activeSubjects = courseSubjects.filter((s) => s.status === 'active' && !s.locked).length
    const lockedSubjects = courseSubjects.filter((s) => s.locked).length
    const totalChapters = chapters.length
    const totalMcqs = mcqs.length
    const totalFlashcards = flashcards.length

    return {
      totalSubjects,
      activeSubjects,
      lockedSubjects,
      totalChapters,
      totalMcqs,
      totalFlashcards,
    }
  }, [courseSubjects, chapters, mcqs, flashcards])

  // Helper stats for subject list
  const getSubjectContentStats = (subject) => {
    const sChapters = chapters.filter(
      (c) =>
        (c.subjectId && c.subjectId === subject.id) ||
        (c.subject_id && c.subject_id === subject.id) ||
        (c.subject && String(c.subject).trim().toLowerCase() === String(subject.name).trim().toLowerCase())
    )
    const sMcqs = mcqs.filter(
      (m) =>
        (m.subjectId && m.subjectId === subject.id) ||
        (m.subject_id && m.subject_id === subject.id) ||
        (m.subject && String(m.subject).trim().toLowerCase() === String(subject.name).trim().toLowerCase())
    )
    return {
      chapters: sChapters.length,
      mcqs: sMcqs.length,
    }
  }

  // Currently selected subject object
  const selectedSubject = useMemo(() => {
    return courseSubjects.find((s) => s.id === selectedSubjectId) || courseSubjects[0] || null
  }, [courseSubjects, selectedSubjectId])

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    let list = [...courseSubjects]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q))
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'locked') list = list.filter((s) => s.locked)
      else if (filterStatus === 'active') list = list.filter((s) => s.status === 'active' && !s.locked)
      else if (filterStatus === 'disabled') list = list.filter((s) => s.status === 'disabled')
    }

    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      return (a.order || 0) - (b.order || 0)
    })

    return list
  }, [courseSubjects, search, filterStatus, sortBy])

  // Handlers
  const handleSelectCourse = (courseId) => {
    setActiveWorkspace(courseId)
  }

  const handleOpenCreate = () => {
    setEditingSubject(null)
    setShowSubjectModal(true)
  }

  const handleOpenEdit = (subject) => {
    setEditingSubject(subject)
    setShowSubjectModal(true)
  }

  const [isSavingSubject, setIsSavingSubject] = useState(false)

  const handleSaveSubject = async (data) => {
    const targetCourse = workspaces.find((w) => w.id === data.courseId)
    setIsSavingSubject(true)
    try {
      if (data.id) {
        const res = await subjectService.updateSubject(data.id, data)
        if (res.success) {
          showToast({ type: 'success', title: 'Subject Updated', message: `"${data.name}" updated successfully.` })
          setShowSubjectModal(false)
          return { success: true }
        }
        return { success: false, error: res.error || 'Unable to update subject.' }
      } else {
        const res = await subjectService.createSubject(data.courseId, data)
        if (res.success && res.data) {
          if (data.courseId !== activeWorkspaceId) {
            setActiveWorkspace(data.courseId)
          }
          setSelectedSubjectId(res.data.id)
          showToast({
            type: 'success',
            title: 'Subject Created',
            message: `"${data.name}" created under "${targetCourse?.name || 'Course'}" successfully.`,
          })
          setShowSubjectModal(false)
          return { success: true }
        }
        return { success: false, error: res.error || 'Unable to create subject.' }
      }
    } catch (err) {
      return { success: false, error: err.message || 'An unexpected error occurred.' }
    } finally {
      setIsSavingSubject(false)
    }
  }

  const handleImportStarter = () => {
    if (!activeCourse) return
    seedDefaultSubjects(activeCourse.id)
    showToast({
      type: 'success',
      title: 'Starter Subjects Loaded',
      message: `Physics, Chemistry, Mathematics, & Computer Science added to ${activeCourse.name}.`,
    })
  }

  // 1. NO COURSES IN SYSTEM
  if (workspaces.length === 0 || !activeCourse) {
    return (
      <div className="sm-workspace-shell">
        <div className="sm-empty-state">
          <span className="sm-empty-icon">
            <AppIcon name="folder" size={32} />
          </span>
          <h3>No Course Selected</h3>
          <p>Create a course first before adding subjects.</p>
          <Button variant="primary" onClick={() => onNavigate?.('courses')}>
            <AppIcon name="add" size={15} /> Manage Courses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sm-workspace-shell">
      {/* ── COURSE SELECTOR BAR (List of Existing Courses with Status & Subject Counts) ── */}
      <CourseSelectorBar
        workspaces={workspaces}
        activeCourseId={activeCourse.id}
        allSubjects={allSubjects}
        onSelectCourse={handleSelectCourse}
        onAddSubject={handleOpenCreate}
      />

      {/* Compact 6 KPI Summary Row */}
      <div className="sm-summary-row">
        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
              <AppIcon name="chapters" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.totalSubjects}</span>
          </div>
          <div className="sm-summary-label">Total Subjects</div>
        </div>

        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
              <AppIcon name="check" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.activeSubjects}</span>
          </div>
          <div className="sm-summary-label">Active Subjects</div>
        </div>

        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
              <AppIcon name="lock" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.lockedSubjects}</span>
          </div>
          <div className="sm-summary-label">Locked Subjects</div>
        </div>

        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
              <AppIcon name="document" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.totalChapters}</span>
          </div>
          <div className="sm-summary-label">Total Chapters</div>
        </div>

        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
              <AppIcon name="help" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.totalMcqs}</span>
          </div>
          <div className="sm-summary-label">Total MCQs</div>
        </div>

        <div className="sm-summary-card">
          <div className="sm-summary-top">
            <span className="sm-summary-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
              <AppIcon name="flashcardsTab" size={14} />
            </span>
            <span className="sm-summary-num">{summaryKpis.totalFlashcards}</span>
          </div>
          <div className="sm-summary-label">Total Flashcards</div>
        </div>
      </div>

      {/* TWO-COLUMN WORKSPACE GRID */}
      {courseSubjects.length === 0 ? (
        <div className="sm-empty-state">
          <span className="sm-empty-icon">
            <AppIcon name="chapters" size={32} />
          </span>
          <h3>No subjects in {activeCourse.name} yet</h3>
          <p>
            Create your first subject or import starter subjects to build the learning structure for {activeCourse.name}.
          </p>
          <div className="sm-empty-actions">
            <Button variant="primary" onClick={handleOpenCreate}>
              <AppIcon name="add" size={15} /> Add Subject to {activeCourse.name}
            </Button>
            <Button variant="secondary" onClick={handleImportStarter}>
              <AppIcon name="copy" size={15} /> Import Starter Subjects
            </Button>
          </div>
        </div>
      ) : (
        <div className="cm-main-workspace-grid">
          {/* Left Column: Subject List */}
          <div className="cm-course-list-col">
            {/* Search Subjects Field Aligned with Left Subject List */}
            <div className="sm-search-box-compact">
              <AppIcon name="search" size={15} />
              <input
                type="text"
                placeholder="Search subjects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="cm-list-header">
              <h4 className="cm-list-title">Subjects ({filteredSubjects.length})</h4>
            </div>

            <div className="cm-cards-stack">
              {filteredSubjects.map((subject) => (
                <SubjectListRow
                  key={subject.id}
                  subject={subject}
                  isSelected={subject.id === selectedSubjectId}
                  stats={getSubjectContentStats(subject)}
                  onSelect={(id) => setSelectedSubjectId(id)}
                  onEdit={handleOpenEdit}
                  onDuplicate={duplicateSubject}
                  onToggleLock={toggleSubjectLock}
                  onOpenDeleteModal={handleOpenDeleteSubject}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Selected Subject Analytics & Chapter Workspace Panel */}
          <div className="cm-analytics-col">
            <SelectedSubjectPanel
              selectedSubject={selectedSubject}
              chapters={chapters}
              mcqs={mcqs}
              flashcards={flashcards}
              notes={notes}
              onEditSubject={handleOpenEdit}
              onToggleLock={toggleSubjectLock}
              activeCourseId={activeCourse?.id}
            />
          </div>
        </div>
      )}


      {/* Subject Modal */}
      {showSubjectModal && (
        <SubjectModal
          initialData={editingSubject}
          workspaces={workspaces}
          activeCourseId={activeCourse.id}
          isSaving={isSavingSubject}
          onSave={handleSaveSubject}
          onClose={() => setShowSubjectModal(false)}
        />
      )}

      {/* Delete Subject Security Code Modal */}
      <DeleteSubjectSecurityModal
        isOpen={deleteSubjectModal.open}
        subject={deleteSubjectModal.subject}
        impact={deleteSubjectModal.impact}
        securityCode={deleteSubjectModal.securityCode}
        onSecurityCodeChange={(val) => setDeleteSubjectModal((prev) => ({ ...prev, securityCode: val, error: '' }))}
        error={deleteSubjectModal.error}
        onConfirm={handleExecuteSubjectDelete}
        onClose={() => setDeleteSubjectModal({ open: false, subject: null, impact: null, securityCode: '', error: '' })}
      />
    </div>
  )
}

export default SubjectManager
