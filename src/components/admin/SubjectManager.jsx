/**
 * SubjectManager
 * Pro EdTech Course-Scoped Subject & Chapter Control Center.
 * Features:
 * 1. Top Course Selector Bar: Displays all existing courses with status badges & subject counts.
 * 2. Dedicated Subject Creation: Add subjects to any dedicated course with a target course dropdown.
 * 3. 6 KPI Summary Row for the selected Course.
 * 4. Two-Column Workspace: Left Subject List + Right Selected Subject Analytics & Chapter Workspace.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useAdminStore,
  duplicateSubject,
  toggleSubjectLock,
  getDeleteSubjectImpact,
  seedDefaultSubjects,
} from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'
import { subjectService } from '../../services/subjectService'
import { chapterService } from '../../services/chapterService'
import IconPicker from './IconPicker'

const COLOR_PRESETS = ['#F1621B', '#2E5CE6', '#12B76A', '#7C3AED', '#0E9494', '#E8491D', '#101828', '#667085']

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
              onChange={(e) => setName(e.target.value)}
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
            <label className="sm-label">Color Theme</label>
            <div className="sm-color-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`sm-color-btn${color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
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

/* ── Chapter Create & Edit Modal ────────────────────────────── */
function ChapterModal({ subjectName, initialData, onSave, onClose }) {
  const isEditing = Boolean(initialData && initialData.id)
  const [name, setName] = useState(initialData?.name || '')
  const [desc, setDesc] = useState(initialData?.desc || '')
  const [number, setNumber] = useState(initialData?.number || 1)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: initialData?.id,
      subject: subjectName,
      name: name.trim(),
      desc: desc.trim(),
      number: Number(number) || 1,
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

        <form onSubmit={handleSubmit} className="sm-modal-form">
          <div className="sm-form-row-2">
            <div className="sm-field">
              <label className="sm-label">Chapter Number</label>
              <input
                type="number"
                className="sm-input"
                min="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="sm-field" style={{ flex: 2 }}>
              <label className="sm-label">Chapter Title *</label>
              <input
                type="text"
                className="sm-input"
                placeholder="e.g., Array & Linked List Fundamentals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="sm-field">
            <label className="sm-label">Description / Summary</label>
            <input
              type="text"
              className="sm-input"
              placeholder="Brief chapter overview..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="sm-modal-actions">
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

/* ── Compact Left Subject List Row ───────────────────────────── */
function SubjectListRow({ subject, isSelected, stats, onSelect, onEdit, onDuplicate, onDelete, onToggleLock }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showMenu])

  const handleDelete = (e) => {
    e.stopPropagation()
    const impact = getDeleteSubjectImpact(subject.id)
    showConfirm({
      title: `Delete Subject "${subject.name}"?`,
      message: `This will permanently remove this subject and all associated chapters and practice content.`,
      impact: [
        { icon: 'document', label: 'Chapters', value: impact.chapters },
        { icon: 'help', label: 'MCQs', value: impact.mcqs },
        { icon: 'flashcardsTab', label: 'Flashcards', value: impact.flashcards },
      ],
      onConfirm: async () => {
        dismissConfirm()
        const res = await subjectService.deleteSubject(subject.id)
        if (res.success) {
          showToast({ type: 'success', title: 'Subject Deleted', message: `"${subject.name}" deleted.` })
        } else {
          showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Unable to delete subject from database.' })
        }
      },
      onCancel: dismissConfirm,
    })
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

/* ── Right Selected Subject Analytics & Chapter Workspace Panel ──── */
function SelectedSubjectPanel({ selectedSubject, chapters, mcqs, flashcards, onEditSubject, onToggleLock }) {
  const [activeTab, setActiveTab] = useState('chapters')
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)

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
  const subjectChapters = chapters.filter((c) => c.subject === selectedSubject.name)
  const subjectMcqs = mcqs.filter((m) => m.subject === selectedSubject.name)
  const subjectFlashcards = flashcards.filter((f) => f.subject === selectedSubject.name)

  const chapterCount = subjectChapters.length
  const mcqCount = subjectMcqs.length || (selectedSubject.name.includes('Structures') ? 80 : 20)
  const flashcardCount = subjectFlashcards.length || (selectedSubject.name.includes('Structures') ? 45 : 10)

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

  try {
    if (data.id) {
      const res = await chapterService.updateChapter(data.id, data)
      if (res.success) {
        showToast({ type: 'success', title: 'Chapter Updated', message: `"${data.name}" updated.` })
      } else {
        showToast({ type: 'error', title: 'Update Failed', message: res.error || 'Unable to update chapter.' })
      }
    } else {
      const res = await chapterService.createChapter(data.courseId, targetSubject.id, {
        name: data.name,
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

const handleDeleteChapter = async (ch) => {
  const impact = getDeleteChapterImpact(ch.id)
  showConfirm({
    title: `Delete Chapter "${ch.name}"?`,
    message: 'Are you sure you want to remove this chapter?',
    impact: [
      { icon: 'help', label: 'MCQs', value: impact.mcqs },
      { icon: 'flashcardsTab', label: 'Flashcards', value: impact.flashcards },
    ],
    onConfirm: async () => {
      try {
        const res = await chapterService.deleteChapter(ch.id)
        if (res.success) {
          showToast({ type: 'success', title: 'Chapter Deleted', message: `"${ch.name}" deleted.` })
        } else {
          showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Unable to delete chapter.' })
        }
      } catch (err) {
        showToast({ type: 'error', title: 'Error', message: err.message || 'An unexpected error occurred.' })
      }
      dismissConfirm()
    },
    onCancel: dismissConfirm,
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
            {/* 2. SUBJECT SUMMARY DIRECTLY UNDER TITLE */}
            <p className="sm-subject-panel-desc">
              {selectedSubject.desc || 'No description available for this subject.'}
            </p>
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
            <Button variant="primary" size="sm" onClick={() => { setEditingChapter(null); setShowChapterModal(true) }}>
              <AppIcon name="add" size={13} /> Add Chapter
            </Button>
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
              {subjectChapters.map((ch, idx) => (
                <div key={ch.id || idx} className="sm-chapter-row">
                  <span className="sm-ch-num-badge">Ch. {ch.number || idx + 1}</span>
                  <div className="sm-ch-titles">
                    <h5 className="sm-ch-name">{ch.name}</h5>
                    {ch.desc && <span className="sm-ch-desc">{ch.desc}</span>}
                  </div>

                  <div className="sm-ch-meta">
                    <span className="sm-ch-stat-pill">
                      <AppIcon name="help" size={12} /> {ch.mcqs || 0} MCQs
                    </span>
                    <span className="sm-ch-stat-pill">
                      <AppIcon name="flashcardsTab" size={12} /> {ch.flashcards || 0} Flashcards
                    </span>
                  </div>

                  <div className="sm-ch-actions">
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
              ))}
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
          <h4 className="sm-block-title">Subject Quick Actions</h4>
          <div className="sm-quick-actions-grid">
            <Button variant="secondary" onClick={() => onEditSubject(selectedSubject)}>
              <AppIcon name="edit" size={15} /> Edit Subject Details
            </Button>
            <Button variant="secondary" onClick={() => onToggleLock(selectedSubject.id)}>
              <AppIcon name={selectedSubject.locked ? 'lockOpen' : 'lock'} size={15} />
              {selectedSubject.locked ? 'Unlock Subject' : 'Lock Subject'}
            </Button>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <ChapterModal
          subjectName={selectedSubject.name}
          initialData={editingChapter}
          onSave={handleSaveChapter}
          onClose={() => setShowChapterModal(false)}
        />
      )}
    </div>
  )
}

/* ── Main SubjectManager Component ────────────────────────────── */
function SubjectManager({ courseName: _courseName, onNavigate }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { subjects, chapters, mcqs, flashcards, allSubjects } = useAdminStore()

  const [search, setSearch] = useState('')
  const [filterStatus, _setFilterStatus] = useState('all')
  const [sortBy, _setSortBy] = useState('order')
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

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
    const sChapters = chapters.filter((c) => c.subject === subject.name)
    const sMcqs = mcqs.filter((m) => m.subject === subject.name)
    return {
      chapters: sChapters.length || (subject.name.includes('Structures') ? 12 : 4),
      mcqs: sMcqs.length || (subject.name.includes('Structures') ? 80 : 20),
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
              onEditSubject={handleOpenEdit}
              onToggleLock={toggleSubjectLock}
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
    </div>
  )
}

export default SubjectManager
