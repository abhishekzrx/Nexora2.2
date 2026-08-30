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
import QuickAddChapterModal from './QuickAddChapterModal'
import RichContentRenderer from '../ui/RichContentRenderer'
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
      <span className="sm-live-chip locked">
        <AppIcon name="lock" size={11} />
        <span>LOCKED</span>
      </span>
    )
  }

  const s = String(status || 'active').toLowerCase()

  if (s === 'active') {
    return (
      <span className="sm-live-chip active">
        <span className="sm-live-dot" />
        <span>ACTIVE</span>
      </span>
    )
  }

  if (s === 'draft') {
    return (
      <span className="sm-live-chip draft">
        <span className="sm-draft-dot" />
        <span>DRAFT</span>
      </span>
    )
  }

  if (s === 'disabled') {
    return (
      <span className="sm-live-chip disabled">
        <span className="sm-disabled-dot" />
        <span>DISABLED</span>
      </span>
    )
  }

  return (
    <span className="sm-live-chip active">
      <span className="sm-live-dot" />
      <span>{s.toUpperCase()}</span>
    </span>
  )
}

/* ── Course Dashboard Banner (Ultra-Compact Orange Header) ── */
function CourseDashboardBanner({
  activeCourse,
  workspaces,
  onSelectCourse,
  onAddSubject,
  onQuickAiChapters,
  summaryKpis,
  search,
  onSearchChange,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
}) {
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const courseDropdownRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target)) {
        setShowCourseDropdown(false)
      }
    }
    if (showCourseDropdown) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showCourseDropdown])

  return (
    <div className="sm-orange-banner">
      {/* 6 KPI Stat Pills in a single sleek compact row */}
      <div className="sm-banner-kpi-row">
        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
            <AppIcon name="chapters" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.totalSubjects}</span>
            <span className="sm-kpi-lbl">Total Subjects</span>
          </div>
        </div>

        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
            <AppIcon name="check" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.activeSubjects}</span>
            <span className="sm-kpi-lbl">Active Subjects</span>
          </div>
        </div>

        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
            <AppIcon name="lock" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.lockedSubjects}</span>
            <span className="sm-kpi-lbl">Locked Subjects</span>
          </div>
        </div>

        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
            <AppIcon name="document" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.totalChapters}</span>
            <span className="sm-kpi-lbl">Total Chapters</span>
          </div>
        </div>

        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
            <AppIcon name="help" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.totalMcqs}</span>
            <span className="sm-kpi-lbl">Total MCQs</span>
          </div>
        </div>

        <div className="sm-kpi-pill">
          <span className="sm-kpi-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
            <AppIcon name="flashcardsTab" size={13} />
          </span>
          <div className="sm-kpi-texts">
            <span className="sm-kpi-val">{summaryKpis.totalFlashcards}</span>
            <span className="sm-kpi-lbl">Total Flashcards</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Search, Course Switcher, Filters & Add Subject */}
      <div className="sm-banner-toolbar">
        <div className="sm-banner-search-box">
          <AppIcon name="search" size={14} />
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="sm-clear-search-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              <AppIcon name="close" size={12} />
            </button>
          )}
        </div>

        <div className="sm-banner-filter-group">
          {/* Quick Course Switcher Dropdown */}
          {workspaces.length > 1 && (
            <div className="sm-course-switcher-wrap" ref={courseDropdownRef}>
              <button
                type="button"
                className="sm-course-switcher-btn"
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                title="Switch Working Course"
              >
                <AppIcon name="folder" size={13} />
                <span className="sm-switcher-name">{activeCourse?.name || 'Select Course'}</span>
                <AppIcon name="expandMore" size={13} />
              </button>

              {showCourseDropdown && (
                <div className="sm-course-dropdown-menu">
                  <div className="sm-dropdown-heading">Switch Course</div>
                  {workspaces.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      className={`sm-course-option${course.id === activeCourse?.id ? ' selected' : ''}`}
                      onClick={() => {
                        onSelectCourse(course.id)
                        setShowCourseDropdown(false)
                      }}
                    >
                      <span className="sm-course-opt-name">{course.name}</span>
                      {course.id === activeCourse?.id && <span className="sm-opt-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <select
            className="sm-banner-select"
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            title="Filter by status"
          >
            <option value="all">All Subjects</option>
            <option value="active">Active Only</option>
            <option value="locked">Locked Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          <select
            className="sm-banner-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            title="Sort subjects"
          >
            <option value="order">⇅ Sort: Default</option>
            <option value="name-asc">⇅ Sort: A-Z</option>
            <option value="name-desc">⇅ Sort: Z-A</option>
            <option value="newest">⇅ Sort: Newest</option>
          </select>

          <button
            type="button"
            className="sm-banner-quick-ai-btn"
            onClick={onQuickAiChapters}
            title="Quick Add Chapters with AI Decomposer"
          >
            <AppIcon name="aiCoach" size={13} />
            <span>⚡ Quick AI Chapters</span>
          </button>

          <button
            type="button"
            className="sm-banner-add-btn"
            onClick={onAddSubject}
            title="Add Subject to Course"
          >
            <AppIcon name="add" size={14} />
            <span>Add Subject</span>
          </button>
        </div>
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

/* ── Chapter Studio & Details Modal (Universal Supabase-Synced Control Center) ─ */
function ChapterStudioModal({
  subject,
  courseName = '',
  activeCourseId = '',
  initialData = null,
  initialTab = 'overview',
  existingChapters = [],
  allMcqs = [],
  allFlashcards = [],
  allNotes = [],
  onSave,
  onOpenNotesEditor,
  onOpenQuickAiChapters,
  onResetChapterState,
  onDeleteChapter,
  onNavigate,
  onClose,
}) {
  const isEditing = Boolean(initialData && initialData.id)
  const [activeTab, setActiveTab] = useState(() => (isEditing ? initialTab : 'edit'))

  // Default auto-incremented chapter number
  const defaultNextNumber = useMemo(() => {
    if (isEditing && initialData?.number) return initialData.number
    if (!existingChapters || existingChapters.length === 0) return 1
    const maxNum = Math.max(...existingChapters.map((c) => Number(c.number) || 0), 0)
    return maxNum + 1
  }, [existingChapters, isEditing, initialData])

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

  // Editable Form States
  const [name, setName] = useState(initialData?.name || initialData?.title || '')
  const [code, setCode] = useState(initialData?.code || '')
  const [priority, setPriority] = useState(initialData?.priority || 'M')
  const [desc, setDesc] = useState(initialData?.desc || initialData?.description || '')
  const [number, setNumber] = useState(initialData?.number ?? defaultNextNumber)
  const [status, setStatus] = useState(initialData?.status || 'active')
  const [locked, setLocked] = useState(initialData?.locked || false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [mcqSearch, setMcqSearch] = useState('')

  useEffect(() => {
    if (!isEditing) {
      setNumber(defaultNextNumber)
    }
  }, [defaultNextNumber, isEditing])

  // Current chapter representation for matching
  const currentChapterObj = useMemo(() => {
    if (initialData) return initialData
    return {
      id: 'temp',
      name,
      code,
      number,
      subject: subject?.name,
      subjectId: subject?.id,
    }
  }, [initialData, name, code, number, subject])

  // Matching Chapter MCQs
  const chapterMcqs = useMemo(() => {
    if (!isEditing || !initialData) return []
    return allMcqs.filter((m) => {
      const matchesSubject =
        !subject ||
        m.subjectId === subject.id ||
        m.subject_id === subject.id ||
        (m.subject && String(m.subject).trim().toLowerCase() === String(subject.name).trim().toLowerCase())

      const matchesChapter =
        m.chapterId === initialData.id ||
        m.chapter_id === initialData.id ||
        (m.chapter && String(m.chapter).trim().toLowerCase() === String(initialData.name).trim().toLowerCase())

      return matchesSubject && matchesChapter
    })
  }, [allMcqs, initialData, subject, isEditing])

  // Filtered MCQs inside modal
  const filteredMcqs = useMemo(() => {
    if (!mcqSearch.trim()) return chapterMcqs
    const q = mcqSearch.toLowerCase()
    return chapterMcqs.filter(
      (m) =>
        (m.question || m.text || '').toLowerCase().includes(q) ||
        (m.explanation || '').toLowerCase().includes(q)
    )
  }, [chapterMcqs, mcqSearch])

  // Matching Chapter Flashcards
  const chapterFlashcards = useMemo(() => {
    if (!isEditing || !initialData) return []
    return allFlashcards.filter((f) => {
      const matchesSubject =
        !subject ||
        f.subjectId === subject.id ||
        f.subject_id === subject.id ||
        (f.subject && String(f.subject).trim().toLowerCase() === String(subject.name).trim().toLowerCase())

      const matchesChapter =
        f.chapterId === initialData.id ||
        f.chapter_id === initialData.id ||
        (f.chapter && String(f.chapter).trim().toLowerCase() === String(initialData.name).trim().toLowerCase())

      return matchesSubject && matchesChapter
    })
  }, [allFlashcards, initialData, subject, isEditing])

  // Matching Chapter Note
  const chapterNote = useMemo(() => {
    if (!isEditing || !initialData) return null
    return (
      allNotes.find(
        (n) =>
          String(n.chapterId || n.chapter_id) === String(initialData.id) ||
          (n.title && initialData.name && n.title.toLowerCase().includes(initialData.name.toLowerCase()))
      ) || null
    )
  }, [allNotes, initialData, isEditing])

  // Computed Readiness Score %
  const mcqCount = chapterMcqs.length > 0 ? chapterMcqs.length : (typeof initialData?.mcqs === 'number' ? initialData.mcqs : 0)
  const flashcardCount = chapterFlashcards.length > 0 ? chapterFlashcards.length : (typeof initialData?.flashcards === 'number' ? initialData.flashcards : 0)
  const hasNotes = Boolean(chapterNote || (initialData?.notes && initialData.notes > 0))

  const readinessScore = Math.min(
    100,
    Math.round(
      (Math.min(100, (mcqCount / 20) * 100) * 0.5) +
      (Math.min(100, (flashcardCount / 15) * 100) * 0.3) +
      (hasNotes ? 20 : 0)
    )
  )

  const bpscMeta = getBpscChapterMeta(name, code)
  const displayCode = code || (bpscMeta ? bpscMeta.code : '')
  const displayPriority = priority || (bpscMeta ? bpscMeta.priority : 'M')
  const prioMeta = formatPriority(displayPriority)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Chapter Title is required.')
      return
    }
    setIsSaving(true)
    setErrorMsg('')
    try {
      const res = await onSave({
        id: initialData?.id,
        subject: subject?.name,
        subjectId: subject?.id,
        courseId: activeCourseId,
        name: name.trim(),
        code: (code || displayCode).trim().toUpperCase(),
        priority: priority || 'M',
        desc: desc.trim(),
        description: desc.trim(),
        number: Number(number) || defaultNextNumber,
        status,
        locked,
      })
      if (res?.success) {
        if (res.data) {
          setName(res.data.name || name)
          setCode(res.data.code || code)
          setPriority(res.data.priority || priority)
          setDesc(res.data.desc || res.data.description || desc)
          setNumber(res.data.number !== undefined ? res.data.number : number)
          setStatus(res.data.status || status)
          setLocked(Boolean(res.data.locked))
        }
        if (!isEditing) {
          onClose()
        } else {
          setActiveTab('overview')
        }
      } else if (res?.error) {
        setErrorMsg(res.error)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save chapter.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-chapter-studio-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Studio Modal Top Hero Header ── */}
        <div className="sm-studio-hero">
          <div className="sm-studio-hero-top">
            <div className="sm-studio-breadcrumbs">
              <span className="sm-crumb-course">{courseName || 'Course'}</span>
              <span className="sm-crumb-sep">›</span>
              <span className="sm-crumb-subj" style={{ color: subject?.color || '#F1621B' }}>
                {subject?.name || 'Subject'}
              </span>
              <span className="sm-crumb-sep">›</span>
              <span className="sm-crumb-ch">
                {isEditing ? `Chapter ${String(number).padStart(2, '0')}` : 'New Chapter'}
              </span>
            </div>
            <button
              type="button"
              className="sm-studio-close-btn"
              onClick={onClose}
              title="Close Chapter Studio (Esc)"
              aria-label="Close Chapter Studio"
            >
              <AppIcon name="close" size={16} />
            </button>
          </div>

          <div className="sm-studio-title-row">
            <div className="sm-studio-ch-badge" style={{ background: subject?.color || '#F1621B' }}>
              <span>Ch. {String(number).padStart(2, '0')}</span>
            </div>

            <div className="sm-studio-title-info">
              <h2 className="sm-studio-title">{name || 'Untitled Chapter'}</h2>
              <div className="sm-studio-badges-line">
                {displayCode && <span className="sm-ch-code-pill">{displayCode}</span>}
                <span className={`sm-ch-prio-mini prio-${displayPriority.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                  {prioMeta.label || displayPriority} Priority
                </span>
                <StatusBadge status={status} locked={locked} />
              </div>
            </div>
          </div>

          {/* ── Studio Navigation Tab Bar ── */}
          <div className="sm-studio-tab-bar">
            <div className="sm-studio-tabs-left">
              {isEditing && (
                <button
                  type="button"
                  className={`sm-studio-tab-btn${activeTab === 'overview' ? ' active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <AppIcon name="analyticsTab" size={14} />
                  <span>Overview & Health</span>
                </button>
              )}
              <button
                type="button"
                className={`sm-studio-tab-btn${activeTab === 'edit' ? ' active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                <AppIcon name="edit" size={14} />
                <span>{isEditing ? 'Edit & Sync Database' : 'Chapter Configuration'}</span>
              </button>
              {isEditing && (
                <button
                  type="button"
                  className={`sm-studio-tab-btn${activeTab === 'mcqs' ? ' active' : ''}`}
                  onClick={() => setActiveTab('mcqs')}
                >
                  <AppIcon name="help" size={14} />
                  <span>MCQ Bank ({chapterMcqs.length})</span>
                </button>
              )}
              {isEditing && (
                <button
                  type="button"
                  className={`sm-studio-tab-btn${activeTab === 'notes' ? ' active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  <AppIcon name="notesTab" size={14} />
                  <span>Study Notes {chapterNote ? '✓' : ''}</span>
                </button>
              )}
            </div>

            {isEditing && (
              <div className="sm-studio-tabs-right">
                <button
                  type="button"
                  className="sm-studio-quick-action-btn"
                  onClick={() => {
                    onClose()
                    onOpenNotesEditor?.(initialData)
                  }}
                  title="Open Rich Notes Authoring Studio"
                >
                  <AppIcon name="notesTab" size={13} />
                  <span>Notes Editor</span>
                </button>
                <button
                  type="button"
                  className="sm-studio-quick-action-btn danger"
                  onClick={() => {
                    onClose()
                    onDeleteChapter?.(initialData)
                  }}
                  title="Delete Chapter"
                >
                  <AppIcon name="delete" size={13} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Studio Body Content ── */}
        <div className="sm-studio-body">
          {/* ════ TAB 1: OVERVIEW & CONTENT HEALTH ════ */}
          {activeTab === 'overview' && isEditing && (
            <div className="sm-studio-pane sm-pane-overview">
              {/* 4 Rich Metric Cards Grid */}
              <div className="sm-studio-kpi-grid">
                {/* 1. MCQ Health Card */}
                <div className="sm-studio-kpi-card">
                  <div className="sm-kpi-card-header">
                    <span className="sm-kpi-card-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
                      <AppIcon name="help" size={16} />
                    </span>
                    <span className="sm-kpi-tag">Question Bank</span>
                  </div>
                  <div className="sm-kpi-main-val">{mcqCount} <span className="sm-kpi-unit">MCQs</span></div>
                  <div className="sm-kpi-sub-breakdown">
                    <span className="sm-sub-badge easy">Easy: {chapterMcqs.filter(m => (m.difficulty || '').toLowerCase() === 'easy').length}</span>
                    <span className="sm-sub-badge med">Med: {chapterMcqs.filter(m => !m.difficulty || (m.difficulty || '').toLowerCase() === 'medium').length}</span>
                    <span className="sm-sub-badge hard">Hard: {chapterMcqs.filter(m => (m.difficulty || '').toLowerCase() === 'hard').length}</span>
                  </div>
                  <button
                    type="button"
                    className="sm-kpi-cta-btn"
                    onClick={() => setActiveTab('mcqs')}
                  >
                    <span>View Chapter Questions →</span>
                  </button>
                </div>

                {/* 2. Flashcards Health Card */}
                <div className="sm-studio-kpi-card">
                  <div className="sm-kpi-card-header">
                    <span className="sm-kpi-card-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                      <AppIcon name="flashcardsTab" size={16} />
                    </span>
                    <span className="sm-kpi-tag">Flashcards</span>
                  </div>
                  <div className="sm-kpi-main-val">{flashcardCount} <span className="sm-kpi-unit">Cards</span></div>
                  <p className="sm-kpi-sub-text">
                    {flashcardCount > 0 ? 'Active flashcards ready for spaced repetition review.' : 'No flashcards generated yet.'}
                  </p>
                  <button
                    type="button"
                    className="sm-kpi-cta-btn"
                    onClick={() => {
                      onClose()
                      onNavigate?.('flashcards')
                    }}
                  >
                    <span>Manage Flashcards →</span>
                  </button>
                </div>

                {/* 3. Study Notes Card */}
                <div className="sm-studio-kpi-card">
                  <div className="sm-kpi-card-header">
                    <span className="sm-kpi-card-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                      <AppIcon name="notesTab" size={16} />
                    </span>
                    <span className="sm-kpi-tag">Curated Notes</span>
                  </div>
                  <div className="sm-kpi-main-val">
                    {hasNotes ? <span style={{ color: '#12B76A' }}>Available</span> : <span style={{ color: '#F59E0B' }}>Missing</span>}
                  </div>
                  <p className="sm-kpi-sub-text">
                    {chapterNote
                      ? `${chapterNote.title || 'Rich study notes'} (${chapterNote.type || 'TEXT'})`
                      : 'Author chapter notes to help students grasp high-yield concepts.'}
                  </p>
                  <button
                    type="button"
                    className="sm-kpi-cta-btn"
                    onClick={() => {
                      onClose()
                      onOpenNotesEditor?.(initialData)
                    }}
                  >
                    <span>{hasNotes ? 'Edit Study Notes →' : 'Write Study Notes →'}</span>
                  </button>
                </div>

                {/* 4. Readiness & Mastery Card */}
                <div className="sm-studio-kpi-card sm-readiness-hero-card">
                  <div className="sm-kpi-card-header">
                    <span className="sm-kpi-card-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                      <AppIcon name="target" size={16} />
                    </span>
                    <span className="sm-kpi-tag">Content Health</span>
                  </div>
                  <div className="sm-readiness-row">
                    <div className="sm-readiness-left">
                      <div className="sm-kpi-main-val" style={{ color: '#F1621B' }}>{readinessScore}%</div>
                      <span className="sm-readiness-status">
                        {readinessScore >= 80 ? '🌟 Exam Ready' : readinessScore >= 40 ? '⚡ In Progress' : '⚠️ Gaps Detected'}
                      </span>
                    </div>
                    <svg width="48" height="48" viewBox="0 0 36 36" className="sm-readiness-gauge">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#F1621B"
                        strokeWidth="3.5"
                        strokeDasharray={`${readinessScore}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    className="sm-kpi-cta-btn"
                    onClick={() => onResetChapterState?.(initialData)}
                    title="Reset student progress metrics for this chapter"
                  >
                    <span>Reset Student Progress</span>
                  </button>
                </div>
              </div>

              {/* Syllabus & Topics Scope Box */}
              <div className="sm-studio-syllabus-card">
                <div className="sm-syllabus-card-header">
                  <div className="sm-syllabus-title-wrap">
                    <AppIcon name="document" size={16} />
                    <h4>Chapter Syllabus & Topics Scope</h4>
                  </div>
                  <button
                    type="button"
                    className="sm-syllabus-edit-link"
                    onClick={() => setActiveTab('edit')}
                  >
                    <AppIcon name="edit" size={12} /> Edit Syllabus
                  </button>
                </div>
                <div className="sm-syllabus-content">
                  {desc ? (
                    <p className="sm-syllabus-desc-text">{desc}</p>
                  ) : (
                    <div className="sm-syllabus-empty-hint">
                      <p>No detailed syllabus topics added yet. Adding syllabus topics helps generate targeted MCQs and structured notes for students.</p>
                      <button
                        type="button"
                        className="sm-ghost-action-btn"
                        onClick={() => setActiveTab('edit')}
                      >
                        + Add Syllabus Topics
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Dock */}
              <div className="sm-studio-action-dock">
                <div className="sm-dock-label">Quick Management Shortcuts:</div>
                <div className="sm-dock-buttons">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onClose()
                      onNavigate?.('mcq-injection')
                    }}
                  >
                    <AppIcon name="help" size={14} /> Inject / Author MCQs
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onClose()
                      onOpenNotesEditor?.(initialData)
                    }}
                  >
                    <AppIcon name="notesTab" size={14} /> Open Rich Notes Studio
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('edit')}
                  >
                    <AppIcon name="edit" size={14} /> Edit Chapter Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 2: EDIT & CONFIGURE (SUPABASE SYNC) ════ */}
          {activeTab === 'edit' && (
            <div className="sm-studio-pane sm-pane-edit">
              <form onSubmit={handleSubmit} className="sm-studio-form">
                {!isEditing && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                      border: '1px solid #FDBA74',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AppIcon name="aiCoach" size={16} style={{ color: '#EA580C', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#9A3412' }}>
                        Need to generate the full syllabus chapter breakdown with AI?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenQuickAiChapters?.()
                      }}
                      style={{
                        background: '#EA580C',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⚡ Launch Quick AI Generator
                    </button>
                  </div>
                )}

                {!isEditing && lastAddedChapter && (
                  <div className="sm-last-added-info-box">
                    <AppIcon name="clock" size={15} style={{ color: '#2E5CE6', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>Last Added Chapter: </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        Chapter {lastAddedChapter.number}: {lastAddedChapter.name}{' '}
                        <span style={{ fontWeight: 500, color: '#64748B', fontSize: '11px', marginLeft: '4px' }}>
                          ({formatChapterDate(lastAddedChapter.createdAt || lastAddedChapter.created_at)})
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="sm-form-grid-3">
                  <div className="sm-field">
                    <label className="sm-label">
                      <span>Chapter Order # *</span>
                      {!isEditing && <span className="sm-auto-tag">Auto</span>}
                    </label>
                    <input
                      type="number"
                      className="sm-input"
                      min="1"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      required
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
                    <label className="sm-label">Exam Priority</label>
                    <select
                      className="sm-select"
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

                <div className="sm-field">
                  <label className="sm-label">Chapter Title *</label>
                  <input
                    type="text"
                    className="sm-input sm-input-lg"
                    placeholder="e.g., Gandhian Era & Freedom Movements (1917–1947)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus={!isEditing}
                  />
                </div>

                <div className="sm-form-grid-2">
                  <div className="sm-field">
                    <label className="sm-label">Publish Status</label>
                    <select className="sm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="active">Active (Visible to Students)</option>
                      <option value="draft">Draft (Admin Only)</option>
                      <option value="disabled">Disabled (Hidden)</option>
                    </select>
                  </div>

                  <div className="sm-field sm-checkbox-field" style={{ alignSelf: 'flex-end', height: '40px' }}>
                    <label className="sm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={locked}
                        onChange={(e) => setLocked(e.target.checked)}
                      />
                      <span>Lock Chapter (Require unlock key)</span>
                    </label>
                  </div>
                </div>

                <div className="sm-field">
                  <label className="sm-label">Detailed Syllabus Topics & Summary</label>
                  <textarea
                    className="sm-input sm-textarea"
                    rows={4}
                    placeholder="Enter detailed topics, key eras, learning goals, and subtopics for this chapter..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                  <span className="sm-input-hint">
                    Topics listed here power the automated MCQ generator and help students understand what this chapter covers.
                  </span>
                </div>

                {errorMsg && (
                  <div className="sm-modal-error">
                    <AppIcon name="error" size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="sm-studio-form-actions">
                  <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={isSaving}>
                    <AppIcon name="check" size={14} />
                    <span>
                      {isSaving
                        ? (isEditing ? 'Saving & Syncing...' : 'Creating Chapter...')
                        : (isEditing ? 'Save & Sync to Supabase' : 'Create Chapter')}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ════ TAB 3: MCQ BANK QUICK PREVIEW ════ */}
          {activeTab === 'mcqs' && isEditing && (
            <div className="sm-studio-pane sm-pane-mcqs">
              <div className="sm-mcq-tab-toolbar">
                <div className="sm-chapter-search-box" style={{ maxWidth: '320px' }}>
                  <AppIcon name="search" size={13} />
                  <input
                    type="text"
                    placeholder="Search chapter questions..."
                    value={mcqSearch}
                    onChange={(e) => setMcqSearch(e.target.value)}
                  />
                  {mcqSearch && (
                    <button type="button" className="sm-clear-search-btn" onClick={() => setMcqSearch('')}>
                      <AppIcon name="close" size={12} />
                    </button>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onNavigate?.('mcq-injection')
                  }}
                >
                  <AppIcon name="add" size={13} /> Inject More MCQs
                </Button>
              </div>

              {filteredMcqs.length === 0 ? (
                <div className="sm-empty-chapters" style={{ minHeight: '220px' }}>
                  <AppIcon name="help" size={28} />
                  <p>
                    {chapterMcqs.length === 0
                      ? `No MCQs created for "${name}" yet.`
                      : 'No MCQs match your search filter.'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onNavigate?.('mcq-injection')
                    }}
                  >
                    <AppIcon name="add" size={13} /> Add First MCQ to Chapter
                  </Button>
                </div>
              ) : (
                <div className="sm-studio-mcq-scroll-list">
                  {filteredMcqs.map((mcq, idx) => {
                    const options = mcq.options || []
                    const correctIdx = typeof mcq.correctOption === 'number' ? mcq.correctOption : (typeof mcq.correct === 'number' ? mcq.correct : 0)
                    const diff = mcq.difficulty || 'Medium'

                    return (
                      <div key={mcq.id || idx} className="sm-studio-mcq-item">
                        <div className="sm-mcq-item-header">
                          <span className="sm-mcq-num-pill">Q{idx + 1}</span>
                          <span className={`sm-sub-badge ${diff.toLowerCase()}`}>{diff}</span>
                          {mcq.year && <span className="sm-mcq-year-tag">PYQ {mcq.year}</span>}
                        </div>

                        <div className="sm-mcq-question-text">{mcq.question || mcq.text || 'Question text'}</div>

                        <div className="sm-mcq-options-grid">
                          {options.map((opt, optIdx) => {
                            const isCorrect = optIdx === correctIdx
                            return (
                              <div
                                key={optIdx}
                                className={`sm-mcq-option-row${isCorrect ? ' correct' : ''}`}
                              >
                                <span className="sm-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                <span className="sm-opt-text">{typeof opt === 'string' ? opt : opt.text}</span>
                                {isCorrect && <span className="sm-correct-check">✓ Correct</span>}
                              </div>
                            )
                          })}
                        </div>

                        {mcq.explanation && (
                          <div className="sm-mcq-explanation-box">
                            <strong>Explanation:</strong> {mcq.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 4: STUDY NOTES PREVIEW ════ */}
          {activeTab === 'notes' && isEditing && (
            <div className="sm-studio-pane sm-pane-notes">
              <div className="sm-notes-tab-header">
                <div>
                  <h4 className="sm-notes-heading">
                    {chapterNote?.title || `${name} Study Notes`}
                  </h4>
                  <span className="sm-notes-meta">
                    Type: {chapterNote?.type || 'RICH TEXT'} • Status: {chapterNote?.status || 'Published'} •{' '}
                    {chapterNote?.fileUrl ? 'Has File Asset' : 'Text Content'}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose()
                    onOpenNotesEditor?.(initialData)
                  }}
                >
                  <AppIcon name="edit" size={13} /> Open Full Notes Editor
                </Button>
              </div>

              <div className="sm-notes-preview-scroll">
                {chapterNote?.content ? (
                  <div className="sm-notes-markdown-wrap">
                    <RichContentRenderer content={chapterNote.content} />
                  </div>
                ) : (
                  <div className="sm-empty-chapters" style={{ minHeight: '220px' }}>
                    <AppIcon name="notesTab" size={28} />
                    <p>No formatted notes available for this chapter yet.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onClose()
                        onOpenNotesEditor?.(initialData)
                      }}
                    >
                      <AppIcon name="add" size={13} /> Author Chapter Notes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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

/* ── Subject List Row Item (Mini Chip Design) ───────────────────── */
function SubjectListRow({
  subject,
  isSelected,
  stats,
  onSelect,
  onEdit,
  onDuplicate,
  onToggleLock,
  onUpdateStatus,
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

  const handleStatusClick = (e, newStatus) => {
    e.stopPropagation()
    if (onUpdateStatus) {
      onUpdateStatus(subject.id, newStatus)
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Subject "${subject.name}" set to ${newStatus.toUpperCase()}`,
      })
    }
  }

  return (
    <div
      className={`sm-subject-card-item${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(subject.id)}
      title={subject.name}
    >
      <div className="sm-subject-card-left">
        <span className="sm-subject-card-icon" style={{ background: subject.color || '#F1621B' }}>
          <AppIcon name={subject.icon || 'chapters'} size={15} />
        </span>
        <div className="sm-subject-card-info">
          <h4 className="sm-subject-card-name" title={subject.name}>{subject.name}</h4>
        </div>
      </div>

      <div className="sm-subject-card-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sm-mini-status-chip-btn"
          onClick={(e) => {
            if (subject.locked) {
              onToggleLock(subject.id)
            } else {
              const nextStatus = subject.status === 'active' ? 'draft' : subject.status === 'draft' ? 'disabled' : 'active'
              handleStatusClick(e, nextStatus)
            }
          }}
          title="Click to toggle status"
        >
          <StatusBadge status={subject.status} locked={subject.locked} />
        </button>

        <div className="sm-action-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sm-three-dots-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Subject Actions"
            title="Subject Actions"
          >
            <AppIcon name="moreVert" size={14} />
          </button>

          {showMenu && (
            <div className="sm-dropdown">
              <button type="button" onClick={() => { onEdit(subject); setShowMenu(false) }}>
                <AppIcon name="edit" size={13} /> Edit Subject
              </button>
              <button type="button" onClick={() => { onDuplicate(subject.id); setShowMenu(false); showToast({ type: 'success', title: 'Duplicated', message: `Copy of "${subject.name}" created` }) }}>
                <AppIcon name="copy" size={13} /> Duplicate
              </button>
              <div className="sm-dropdown-divider" />
              <div className="sm-dropdown-label">Set Status:</div>
              <button
                type="button"
                className={subject.status === 'active' && !subject.locked ? 'active-opt' : ''}
                onClick={(e) => { handleStatusClick(e, 'active'); setShowMenu(false) }}
              >
                <span className="sm-dot green" /> Active
              </button>
              <button
                type="button"
                className={subject.status === 'draft' ? 'active-opt' : ''}
                onClick={(e) => { handleStatusClick(e, 'draft'); setShowMenu(false) }}
              >
                <span className="sm-dot orange" /> Draft
              </button>
              <button
                type="button"
                className={subject.status === 'disabled' ? 'active-opt' : ''}
                onClick={(e) => { handleStatusClick(e, 'disabled'); setShowMenu(false) }}
              >
                <span className="sm-dot gray" /> Disabled
              </button>
              <button type="button" onClick={() => { onToggleLock(subject.id); setShowMenu(false); showToast({ type: 'success', title: subject.locked ? 'Unlocked' : 'Locked', message: `Subject "${subject.name}" updated` }) }}>
                <AppIcon name={subject.locked ? 'lockOpen' : 'lock'} size={13} />
                {subject.locked ? 'Unlock Subject' : 'Lock Subject'}
              </button>
              <div className="sm-dropdown-divider" />
              <button type="button" className="danger" onClick={handleDelete}>
                <AppIcon name="delete" size={13} /> Delete Subject
              </button>
            </div>
          )}
        </div>
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

/* ── Right Selected Subject Workspace Panel (Mockup Aligned) ──── */
function SelectedSubjectPanel({
  selectedSubject,
  chapters,
  mcqs,
  flashcards,
  notes = [],
  onEditSubject,
  onToggleLock,
  onQuickAiChapters,
  activeCourseId,
  courseName,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('chapters')
  const [chapterStudioModal, setChapterStudioModal] = useState({ open: false, chapter: null, tab: 'overview' })
  const [notesEditorModal, setNotesEditorModal] = useState({ open: false, chapter: null })
  const [chapterSearch, setChapterSearch] = useState('')
  const [chapterPriority, setChapterPriority] = useState('all')

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

  // Chapter content for this specific subject
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

  // Filtered chapters for right side workspace
  const filteredSubjectChapters = useMemo(() => {
    let list = [...subjectChapters]
    if (chapterSearch.trim()) {
      const q = chapterSearch.toLowerCase()
      list = list.filter(
        (ch) =>
          (ch.name || '').toLowerCase().includes(q) ||
          (ch.code || '').toLowerCase().includes(q) ||
          (ch.desc || ch.description || '').toLowerCase().includes(q)
      )
    }
    if (chapterPriority !== 'all') {
      list = list.filter((ch) => {
        const meta = getBpscChapterMeta(ch.name, ch.code)
        const prio = (ch.priority || (meta ? meta.priority : '') || '').toUpperCase()
        return prio === chapterPriority.toUpperCase()
      })
    }
    return list
  }, [subjectChapters, chapterSearch, chapterPriority])

  // Helper to compute EXACT chapter content counts
  const getChapterContentCounts = useCallback(
    (ch) => {
      if (!ch) return { mcqs: 0, flashcards: 0, notes: 0 }

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
    ) || 33,
  )

  const handleSaveChapter = async (data) => {
    const targetSubject = selectedSubject || subjects.find((s) => s.id === data.subjectId) || subjects[0]
    if (!targetSubject) return { success: false, error: 'Target subject not found' }

    if (!activeCourseId) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a course.' })
      return { success: false, error: 'No active course' }
    }
    if (!targetSubject?.id) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a subject.' })
      return { success: false, error: 'No active subject' }
    }

    try {
      if (data.id) {
        const res = await chapterService.updateChapter(data.id, {
          name: data.name,
          title: data.name,
          number: data.number,
          code: data.code,
          priority: data.priority,
          desc: data.desc,
          description: data.desc,
          status: data.status,
          locked: Boolean(data.locked),
          courseId: activeCourseId,
          subjectId: targetSubject.id,
          subject: targetSubject.name,
          subjectName: targetSubject.name,
        })
        if (res.success) {
          setChapterStudioModal((prev) => ({
            ...prev,
            chapter: res.data || prev.chapter,
          }))
          showToast({
            type: 'success',
            title: 'Chapter Synced',
            message: res.isCloud
              ? `"${data.name}" updated in Supabase and locally.`
              : `"${data.name}" updated successfully.`,
          })
          return { success: true, data: res.data }
        } else {
          showToast({ type: 'error', title: 'Update Failed', message: res.error || 'Unable to update chapter.' })
          return { success: false, error: res.error }
        }
      } else {
        const res = await chapterService.createChapter(activeCourseId, targetSubject.id, {
          name: data.name,
          title: data.name,
          code: data.code,
          priority: data.priority,
          desc: data.desc,
          description: data.desc,
          subject: targetSubject.name,
          subjectName: targetSubject.name,
          number: data.number,
          status: data.status || 'active',
          locked: Boolean(data.locked),
        })
        if (res.success && res.data) {
          showToast({
            type: 'success',
            title: 'Chapter Created',
            message: res.isCloud
              ? `"${data.name}" added to ${targetSubject.name} & saved to Supabase.`
              : `"${data.name}" added to ${targetSubject.name}.`,
          })
          return { success: true, data: res.data }
        } else {
          showToast({ type: 'error', title: 'Creation Failed', message: res.error || 'Unable to create chapter.' })
          return { success: false, error: res.error }
        }
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'An unexpected error occurred.' })
      return { success: false, error: err.message }
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
    <div className="sm-selected-workspace-panel">
      {/* 1. Subject Header: Large Icon + Title + Status */}
      <div className="sm-subj-panel-top">
        <div className="sm-subj-title-group">
          <span className="sm-subj-large-icon" style={{ background: selectedSubject.color || '#F1621B' }}>
            <AppIcon name={selectedSubject.icon || 'chapters'} size={24} />
          </span>
          <div className="sm-subj-title-row">
            <h3 className="sm-subj-heading">{selectedSubject.name}</h3>
            <StatusBadge status={selectedSubject.status} locked={selectedSubject.locked} />
          </div>
        </div>
      </div>

      {/* 2. 4 Compact Stat Cards in a row */}
      <div className="sm-subj-stat-cards-grid">
        <div className="sm-subj-stat-card">
          <span className="sm-subj-stat-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
            <AppIcon name="document" size={16} />
          </span>
          <div className="sm-subj-stat-texts">
            <div className="sm-subj-stat-num">{chapterCount}</div>
            <div className="sm-subj-stat-label">Chapters</div>
          </div>
        </div>

        <div className="sm-subj-stat-card">
          <span className="sm-subj-stat-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
            <AppIcon name="help" size={16} />
          </span>
          <div className="sm-subj-stat-texts">
            <div className="sm-subj-stat-num">{mcqCount}</div>
            <div className="sm-subj-stat-label">MCQs</div>
          </div>
        </div>

        <div className="sm-subj-stat-card">
          <span className="sm-subj-stat-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
            <AppIcon name="flashcardsTab" size={16} />
          </span>
          <div className="sm-subj-stat-texts">
            <div className="sm-subj-stat-num">{flashcardCount}</div>
            <div className="sm-subj-stat-label">Flashcards</div>
          </div>
        </div>

        <div className="sm-subj-stat-card sm-readiness-stat-card">
          <div className="sm-readiness-card-left">
            <span className="sm-subj-stat-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
              <AppIcon name="target" size={16} />
            </span>
            <div className="sm-subj-stat-texts">
              <div className="sm-subj-stat-num">{readinessScore}%</div>
              <div className="sm-subj-stat-label">Readiness</div>
            </div>
          </div>
          <div className="sm-readiness-gauge-wrap">
            <svg width="34" height="34" viewBox="0 0 36 36" className="sm-readiness-gauge">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F1621B"
                strokeWidth="3.5"
                strokeDasharray={`${readinessScore}, 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Subheader: Tab Bar on Left, Action Buttons on Right */}
      <div className="sm-tabs-action-bar">
        <div className="sm-nav-tabs">
          <button
            type="button"
            className={`sm-tab-button${activeTab === 'chapters' ? ' active' : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            Chapters ({subjectChapters.length})
          </button>
          <button
            type="button"
            className={`sm-tab-button${activeTab === 'graph' ? ' active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            Content Graph
          </button>
          <button
            type="button"
            className={`sm-tab-button${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Subject Actions
          </button>
        </div>

        <div className="sm-tab-right-actions">
          <button
            type="button"
            className="sm-ghost-action-btn"
            onClick={handleResetSubjectState}
            disabled={subjectChapters.length === 0}
            title="Reset student progress across all chapters in this subject"
          >
            <AppIcon name="timer" size={14} />
            <span>Reset All Progress</span>
          </button>
          <button
            type="button"
            className="sm-quick-ai-action-btn"
            onClick={() => onQuickAiChapters?.(selectedSubject?.id)}
            title="Quick Add Chapters with AI Decomposer"
          >
            <AppIcon name="aiCoach" size={14} />
            <span>⚡ Quick AI Chapters</span>
          </button>
          <button
            type="button"
            className="sm-primary-action-btn"
            onClick={() => setChapterStudioModal({ open: true, chapter: null, tab: 'edit' })}
            title="Add Chapter to Subject"
          >
            <AppIcon name="add" size={15} />
            <span>Add Chapter</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Content Area */}
      {activeTab === 'chapters' && (
        <div className="sm-tab-pane">
          {/* Chapter Filter Toolbar */}
          <div className="sm-chapter-toolbar">
            <div className="sm-chapter-search-box">
              <AppIcon name="search" size={13} />
              <input
                type="text"
                placeholder="Search chapters by name or code..."
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
              />
              {chapterSearch && (
                <button
                  type="button"
                  className="sm-clear-search-btn"
                  onClick={() => setChapterSearch('')}
                >
                  <AppIcon name="close" size={12} />
                </button>
              )}
            </div>

            <select
              className="sm-chapter-prio-select"
              value={chapterPriority}
              onChange={(e) => setChapterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="VH">Very High (VH)</option>
              <option value="H">High (H)</option>
              <option value="M">Medium (M)</option>
              <option value="L">Low (L)</option>
            </select>
          </div>

          {filteredSubjectChapters.length === 0 ? (
            <div className="sm-empty-chapters">
              <AppIcon name="document" size={28} />
              <p>
                {subjectChapters.length === 0
                  ? `No chapters created for ${selectedSubject.name} yet.`
                  : 'No chapters match your search or priority filter.'}
              </p>
              {subjectChapters.length === 0 ? (
                <div className="sm-empty-chapter-btns" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="sm-quick-ai-action-btn"
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                    onClick={() => onQuickAiChapters?.(selectedSubject?.id)}
                  >
                    <AppIcon name="aiCoach" size={14} /> ⚡ Quick Add with AI
                  </button>
                  <button
                    type="button"
                    className="sm-primary-action-btn"
                    onClick={() => setChapterStudioModal({ open: true, chapter: null, tab: 'edit' })}
                  >
                    <AppIcon name="add" size={14} /> Add First Chapter
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="sm-ghost-action-btn"
                  onClick={() => { setChapterSearch(''); setChapterPriority('all') }}
                >
                  Reset Chapter Filters
                </button>
              )}
            </div>
          ) : (
            <div className="sm-chapters-scroll-area">
              {filteredSubjectChapters.map((ch, idx) => {
                const counts = getChapterContentCounts(ch, idx)
                const chNum = String(ch.number || idx + 1).padStart(2, '0')
                const meta = getBpscChapterMeta(ch.name, ch.code)
                const displayCode = ch.code || (meta ? meta.code : '')
                const displayPriority = ch.priority || (meta ? meta.priority : '')
                const prioMeta = formatPriority(displayPriority)
                const chapterName = ch.name || ch.title || 'Untitled Chapter'

                return (
                  <div
                    key={ch.id || idx}
                    className="sm-chapter-aligned-card sm-clickable-chapter-card"
                    onClick={() => setChapterStudioModal({ open: true, chapter: ch, tab: 'overview' })}
                    title={`Click to open ${chapterName} Studio & Overview`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setChapterStudioModal({ open: true, chapter: ch, tab: 'overview' })
                      }
                    }}
                  >
                    {/* 1. Chapter Order Number & Monospace Code Pill */}
                    <div className="sm-ch-index-group">
                      <span className="sm-ch-order-num">{chNum}</span>
                      {displayCode && <span className="sm-ch-code-pill">{displayCode}</span>}
                    </div>

                    {/* 2. Full Chapter Name & Description */}
                    <div className="sm-ch-main-info">
                      <div className="sm-ch-title-inline">
                        <h5 className="sm-ch-main-title" title={chapterName}>{chapterName}</h5>
                        <span className="sm-ch-inspect-hint">Click to inspect</span>
                      </div>
                      {ch.desc && <p className="sm-ch-desc-sub">{ch.desc}</p>}
                    </div>

                    {/* 3. Priority Mini Badge */}
                    {displayPriority && (
                      <span className={`sm-ch-prio-mini prio-${displayPriority.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                        {prioMeta.label || displayPriority}
                      </span>
                    )}

                    {/* 4. Content Stats Counter Chips */}
                    <div className="sm-ch-stats-row" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="sm-ch-stat-badge-btn"
                        onClick={() => setChapterStudioModal({ open: true, chapter: ch, tab: 'mcqs' })}
                        title={`${counts.mcqs} MCQs - Click to inspect`}
                      >
                        <AppIcon name="help" size={12} /> {counts.mcqs}
                      </button>
                      <button
                        type="button"
                        className="sm-ch-stat-badge-btn"
                        onClick={() => setChapterStudioModal({ open: true, chapter: ch, tab: 'overview' })}
                        title={`${counts.flashcards} Flashcards`}
                      >
                        <AppIcon name="flashcardsTab" size={12} /> {counts.flashcards}
                      </button>
                      <button
                        type="button"
                        className={`sm-ch-stat-badge-btn ${counts.notes > 0 ? 'active-note' : 'empty-note'}`}
                        onClick={() => setNotesEditorModal({ open: true, chapter: ch })}
                        title={counts.notes > 0 ? 'Notes available - Click to edit' : 'No notes - Click to create'}
                      >
                        <AppIcon name="notesTab" size={12} /> {counts.notes > 0 ? 'Notes' : 'No Notes'}
                      </button>
                    </div>

                    {/* 5. Aligned Action Buttons */}
                    <div className="sm-ch-action-buttons" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="sm-ch-act-btn"
                        onClick={() => setNotesEditorModal({ open: true, chapter: ch })}
                        title="View / Author Chapter Notes"
                        aria-label="View / Author Chapter Notes"
                      >
                        <AppIcon name="notesTab" size={13} />
                      </button>
                      <button
                        type="button"
                        className="sm-ch-act-btn"
                        onClick={() => handleResetChapterState(ch)}
                        title="Reset Chapter Progress & Accuracy"
                        aria-label="Reset Chapter Progress & Accuracy"
                      >
                        <AppIcon name="analyticsTab" size={13} />
                      </button>
                      <button
                        type="button"
                        className="sm-ch-act-btn"
                        onClick={() => setChapterStudioModal({ open: true, chapter: ch, tab: 'edit' })}
                        title="Edit Chapter Details & Sync"
                        aria-label="Edit Chapter Details & Sync"
                      >
                        <AppIcon name="edit" size={13} />
                      </button>
                      <button
                        type="button"
                        className="sm-ch-act-btn danger"
                        onClick={() => handleDeleteChapter(ch)}
                        title="Delete Chapter"
                        aria-label="Delete Chapter"
                      >
                        <AppIcon name="delete" size={13} />
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
        <div className="sm-tab-pane">
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
        <div className="sm-tab-pane">
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

      {/* Chapter Studio Modal (Details / Inspector / Editor) */}
      {chapterStudioModal.open && (
        <ChapterStudioModal
          subject={selectedSubject}
          courseName={courseName}
          activeCourseId={activeCourseId}
          initialData={chapterStudioModal.chapter}
          initialTab={chapterStudioModal.tab}
          existingChapters={subjectChapters}
          allMcqs={mcqs}
          allFlashcards={flashcards}
          allNotes={notes}
          onSave={handleSaveChapter}
          onOpenNotesEditor={(ch) => setNotesEditorModal({ open: true, chapter: ch })}
          onOpenQuickAiChapters={() => onQuickAiChapters?.(selectedSubject?.id)}
          onResetChapterState={handleResetChapterState}
          onDeleteChapter={handleDeleteChapter}
          onNavigate={onNavigate}
          onClose={() => setChapterStudioModal({ open: false, chapter: null, tab: 'overview' })}
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
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('order')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  // Quick Add Chapter AI Modal State
  const [quickChapterModal, setQuickChapterModal] = useState({
    open: false,
    subjectId: '',
  })

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

  const handleUpdateStatus = async (subjectId, newStatus) => {
    try {
      await subjectService.updateSubject(subjectId, { status: newStatus })
    } catch (err) {
      console.error('Failed to update subject status:', err)
    }
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
      {/* ── COURSE DASHBOARD BANNER (Compact Orange Header matching Mockup) ── */}
      <CourseDashboardBanner
        activeCourse={activeCourse}
        workspaces={workspaces}
        onSelectCourse={handleSelectCourse}
        onAddSubject={handleOpenCreate}
        onQuickAiChapters={() => setQuickChapterModal({ open: true, subjectId: selectedSubjectId || courseSubjects[0]?.id || '' })}
        summaryKpis={summaryKpis}
        search={search}
        onSearchChange={setSearch}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* ── TWO-COLUMN WORKSPACE: LEFT (Subjects) / RIGHT (Selected Subject + Chapters) ── */}
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
        <div className="sm-workspace-grid">
          {/* Left Column: Subjects Panel (~28% width) */}
          <div className="sm-subjects-column">
            <div className="sm-subjects-header">
              <h3 className="sm-subjects-title">
                Subjects <span className="sm-count-badge">({filteredSubjects.length})</span>
              </h3>
            </div>

            <div className="sm-subjects-scroll-stack">
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
                  onUpdateStatus={handleUpdateStatus}
                  onOpenDeleteModal={handleOpenDeleteSubject}
                />
              ))}
              {filteredSubjects.length === 0 && (
                <div className="sm-no-results-box">
                  <p>No subjects match your filter criteria.</p>
                  <button
                    type="button"
                    className="sm-reset-filter-btn"
                    onClick={() => {
                      setSearch('')
                      setFilterStatus('all')
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Subject + Chapters Workspace (~72% width) */}
          <div className="sm-chapters-column">
            <SelectedSubjectPanel
              selectedSubject={selectedSubject}
              chapters={chapters}
              mcqs={mcqs}
              flashcards={flashcards}
              notes={notes}
              onEditSubject={handleOpenEdit}
              onToggleLock={toggleSubjectLock}
              onQuickAiChapters={(subjId) =>
                setQuickChapterModal({ open: true, subjectId: subjId || selectedSubjectId || courseSubjects[0]?.id || '' })
              }
              activeCourseId={activeCourse?.id}
              courseName={activeCourse?.name}
              onNavigate={onNavigate}
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

      {/* Quick Add Chapter AI Modal */}
      <QuickAddChapterModal
        isOpen={quickChapterModal.open}
        onClose={() => setQuickChapterModal({ open: false, subjectId: '' })}
        activeCourseId={activeCourse?.id}
        courseName={activeCourse?.name}
        subjects={courseSubjects}
        chapters={chapters}
        preselectedSubjectId={quickChapterModal.subjectId || selectedSubjectId || courseSubjects[0]?.id || ''}
        onChaptersAdded={(newChapters) => {
          hydrateAdminStoreFromSupabase()
        }}
        onNavigate={onNavigate}
      />

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
