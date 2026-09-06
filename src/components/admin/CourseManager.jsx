/**
 * CourseManager
 * Premium Course Management Workspace matching visual reference design.
 * Structure:
 * LEFT WORKSPACE (60% width): 8 KPI Stat Cards (2x4 grid) + Search & Filter Toolbar + Compact Name-Only Course List.
 * RIGHT WORKSPACE (40% width): Top Course Manager Header Card (+ Create Course CTA) + Selected Course Analytics & Overview Panel.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useWorkspaceStore,
  renameWorkspace,
  duplicateWorkspace,
  archiveWorkspace,
  activateWorkspace,
  publishWorkspace,
  unpublishWorkspace,
  deleteWorkspace,
  toggleLockWorkspace,
  setActiveWorkspace,
  refreshWorkspaces,
} from '../../data/workspaceStore'
import { useAdminStore } from '../../data/adminStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'
import { courseService } from '../../services/courseService'
import { subjectService } from '../../services/subjectService'
import { calculateExamCountdown } from '../../utils/dateUtils'
import IconPicker from './IconPicker'

const COLOR_PRESETS = ['#F1621B', '#2E5CE6', '#12B76A', '#7C3AED', '#0E9494', '#E8491D', '#101828', '#667085']

const STATUS_MAP = {
  draft: { label: 'DRAFT', tone: 'orange' },
  published: { label: 'PUBLISHED', tone: 'blue' },
  archived: { label: 'ARCHIVED', tone: 'gray' },
  private: { label: 'PRIVATE', tone: 'purple' },
  active: { label: 'ACTIVE', tone: 'orange' },
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
]

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.draft
  return <span className={`cm-status-badge cm-badge-${cfg.tone}`}>{cfg.label}</span>
}

function InlineForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('adminDashboard')
  const [themeColor, setThemeColor] = useState('#F1621B')
  const [status, setStatus] = useState('active')
  const [examDate, setExamDate] = useState('')
  const [showExamCountdown, setShowExamCountdown] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    setError('')
    const res = await onSubmit({ name: name.trim(), description: description.trim(), icon, themeColor, status, examDate, showExamCountdown })
    setIsSubmitting(false)
    if (res && !res.success) {
      setError(res.error || 'Failed to create course in database.')
    }
  }

  return (
    <div className="cm-create-modal-card">
      <div className="cm-create-header">
        <h3 className="cm-create-title">Create New Course Workspace</h3>
        <button type="button" className="cm-close-btn" onClick={onCancel}>
          <AppIcon name="close" size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="cm-create-form">
        <div className="cm-field">
          <label className="cm-label">Course Name *</label>
          <input
            type="text"
            className="cm-input"
            placeholder="e.g., GATE 2026 – Computer Science"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="cm-field">
          <label className="cm-label">Description</label>
          <input
            type="text"
            className="cm-input"
            placeholder="Brief course overview..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="cm-field">
          <label className="cm-label">Exam Target Date 📅</label>
          <input
            type="date"
            className="cm-input"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Used to calculate the live remaining days countdown shown to enrolled members.
          </span>
        </div>

        <div className="cm-field" style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <label className="cm-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={showExamCountdown}
              onChange={(e) => setShowExamCountdown(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#EA580C', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '700', fontSize: '12px', color: '#1E293B' }}>
              {showExamCountdown ? '🔓 Show Exam Countdown to Enrolled Members' : '🔒 Lock / Hide Exam Countdown in Member Section'}
            </span>
          </label>
        </div>

        <div className="cm-field">
          <IconPicker value={icon} onChange={setIcon} label="Course Icon *" />
        </div>

        <div className="cm-field">
          <label className="cm-label">Theme Color</label>
          <div className="cm-color-swatches">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`cm-color-btn${themeColor === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setThemeColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="cm-field">
          <label className="cm-label">Publishing Status</label>
          <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {error && (
          <div className="cm-modal-error">
            <AppIcon name="error" size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="cm-form-actions">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Course...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ── Modal: Edit Existing Course ───────────────────────────────── */
function EditCourseModal({ course, onSubmit, onClose }) {
  const [name, setName] = useState(course?.name || '')
  const [description, setDescription] = useState(course?.description || '')
  const [icon, setIcon] = useState(course?.icon || 'adminDashboard')
  const [themeColor, setThemeColor] = useState(course?.themeColor || '#F1621B')
  const [status, setStatus] = useState(course?.status || 'active')
  const [examDate, setExamDate] = useState(course?.examDate || '')
  const [showExamCountdown, setShowExamCountdown] = useState(course?.showExamCountdown !== false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    setError('')
    const res = await onSubmit({
      name: name.trim(),
      description: description.trim(),
      icon,
      themeColor,
      status,
      examDate,
      showExamCountdown,
      published: status !== 'draft' && status !== 'archived',
    })
    setIsSubmitting(false)
    if (res && !res.success) {
      setError(res.error || 'Failed to update course in database.')
    }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal-header">
          <div className="cm-modal-title-wrap">
            <AppIcon name="edit" size={18} />
            <h3 className="cm-modal-title">Edit Course Workspace</h3>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cm-modal-form">
          <div className="cm-field">
            <label className="cm-label">Course Name *</label>
            <input
              type="text"
              className="cm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Description</label>
            <input
              type="text"
              className="cm-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course overview..."
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Exam Target Date 📅</label>
            <input
              type="date"
              className="cm-input"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
              Used to calculate remaining date countdown from present day for members.
            </span>
          </div>

          <div className="cm-field" style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <label className="cm-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={showExamCountdown}
                onChange={(e) => setShowExamCountdown(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#EA580C', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '700', fontSize: '12px', color: '#1E293B' }}>
                {showExamCountdown ? '🔓 Show Exam Countdown to Enrolled Members' : '🔒 Lock / Hide Exam Countdown in Member Section'}
              </span>
            </label>
            <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block', paddingLeft: '24px' }}>
              {showExamCountdown
                ? 'Members will see remaining days countdown on their dashboard & practice hub.'
                : 'Countdown UI is locked and hidden from members until unlocked from Admin Panel.'}
            </span>
          </div>

          <div className="cm-field">
            <IconPicker value={icon} onChange={setIcon} label="Course Icon *" />
          </div>

          <div className="cm-field">
            <label className="cm-label">Theme Color</label>
            <div className="cm-color-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cm-color-btn${themeColor === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setThemeColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="cm-field">
            <label className="cm-label">Publishing Status</label>
            <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <div className="cm-modal-error">
              <AppIcon name="error" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="cm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Modal: Add Subject under Selected Course ──────────────────── */
function AddSubjectUnderCourseModal({ course, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState('chapters')
  const [color, setColor] = useState('#F1621B')
  const [status, setStatus] = useState('active')
  const [creationError, setCreationError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreationError('')
    if (!name.trim()) return
    const result = await onSubmit({ name: name.trim(), desc: desc.trim(), icon, color, status })
    if (!result?.success) {
      setCreationError(result?.error || 'Failed to add subject.')
    }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal-header">
          <div className="cm-modal-title-wrap">
            <AppIcon name="add" size={18} />
            <h3 className="cm-modal-title">Add Subject to {course.name}</h3>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose}>
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div className="cm-course-context-badge">
          <AppIcon name="folder" size={14} />
          <span>Creating under: <strong>{course.name}</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="cm-modal-form">
          <div className="cm-field">
            <label className="cm-label">Subject Name *</label>
            <input
              type="text"
              className="cm-input"
              placeholder="e.g., Operating Systems & Architecture"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Description</label>
            <input
              type="text"
              className="cm-input"
              placeholder="Brief overview of subject content..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="cm-field">
            <IconPicker value={icon} onChange={setIcon} label="Subject Icon *" />
          </div>

          <div className="cm-field">
            <label className="cm-label">Color Theme</label>
            <div className="cm-color-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cm-color-btn${color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="cm-field">
            <label className="cm-label">Status</label>
            <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {creationError && (
            <div className="cm-modal-error">
              <AppIcon name="error" size={14} />
              <span>{creationError}</span>
            </div>
          )}

          <div className="cm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Subject
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Security Passcode Confirmation Modal ───────────────────────── */
function SecurityCodeConfirmModal({
  isOpen,
  actionType,
  course,
  newName,
  onNewNameChange,
  securityCode,
  onSecurityCodeChange,
  error,
  onConfirm,
  onClose,
}) {
  if (!isOpen || !course) return null

  const getTitle = () => {
    switch (actionType) {
      case 'rename':
        return `Rename Course "${course.name}"`
      case 'delete':
        return `Delete Course "${course.name}"`
      case 'lock':
        return `Lock Course "${course.name}"`
      case 'unlock':
        return `Unlock Course "${course.name}"`
      case 'publish':
        return `Publish Course "${course.name}"`
      case 'unpublish':
        return `Unpublish Course "${course.name}"`
      case 'archive':
        return `Archive Course "${course.name}"`
      case 'activate':
        return `Activate Course "${course.name}"`
      case 'duplicate':
        return `Duplicate Course "${course.name}"`
      default:
        return `Modify Course "${course.name}"`
    }
  }

  const getActionBadgeColor = () => {
    if (actionType === 'delete') return { bg: '#FEF3F2', color: '#D92D20' }
    if (actionType === 'lock' || actionType === 'unlock') return { bg: '#F1EDFC', color: '#7C3AED' }
    if (actionType === 'publish') return { bg: '#E9F9F1', color: '#12B76A' }
    return { bg: '#FFF1E6', color: '#F1621B' }
  }

  const badgeStyle = getActionBadgeColor()

  return (
    <div className="cm-security-modal-overlay" onClick={onClose}>
      <div className="cm-security-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-security-header">
          <div className="cm-security-badge-icon" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
            <AppIcon name={actionType === 'delete' ? 'delete' : actionType === 'lock' || actionType === 'unlock' ? 'lock' : 'key'} size={20} />
          </div>
          <div>
            <h3 className="cm-security-title">{getTitle()}</h3>
            <p className="cm-security-sub">Security verification code required to confirm this change.</p>
          </div>
        </div>

        {actionType === 'rename' && (
          <div className="cm-field" style={{ marginTop: '4px' }}>
            <label className="cm-label">New Course Name *</label>
            <input
              type="text"
              className="cm-input"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              placeholder="Enter new course name..."
              required
              autoFocus
            />
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
            autoFocus={actionType !== 'rename'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm()
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            🔒 Action will only execute if valid security code is entered.
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
          <Button
            variant={actionType === 'delete' ? 'danger' : 'primary'}
            type="button"
            onClick={onConfirm}
          >
            Confirm & Execute
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Compact Name-Only Course List Row ─────────────────────────── */
function CourseListItem({
  course,
  isSelected,
  onSelect,
  onEditCourse,
  onOpenActionModal,
}) {
  const triggerAction = (e, actionType) => {
    e.stopPropagation()
    onOpenActionModal(course, actionType)
  }

  const examInfo = calculateExamCountdown(course.examDate)

  return (
    <div
      className={`cm-course-row-item${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(course.id)}
    >
      <div className="cm-row-left">
        <span
          className="cm-row-icon-badge"
          style={{ background: course.themeColor || (course.status === 'draft' ? '#7C3AED' : '#F1621B') }}
        >
          <AppIcon name={course.icon || 'folder'} size={15} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <span className="cm-row-course-name" title={course.name}>
            {course.name}
          </span>
          <span
            className="cm-row-exam-badge"
            style={{
              fontSize: '11px',
              color: course.examDate ? '#EA580C' : '#94A3B8',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📅 {course.examDate ? `${examInfo.formattedDate} (${examInfo.statusText})` : 'null'}</span>
            {course.showExamCountdown === false && (
              <span
                style={{
                  background: '#FEF2F2',
                  color: '#EF4444',
                  padding: '0px 5px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  border: '1px solid #FCA5A5',
                }}
                title="Exam countdown is locked and hidden from student section"
              >
                🔒 Hidden
              </span>
            )}
          </span>
        </div>
      </div>


      <div className="cm-row-right" onClick={(e) => e.stopPropagation()}>
        <StatusBadge status={course.status || 'draft'} locked={course.locked} />

        {/* Embedded Action Icon Toolbar matching design reference */}
        <div className="cm-row-embedded-actions">
          {/* Edit Course Settings */}
          <button
            type="button"
            className="cm-row-action-icon-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEditCourse(course)
            }}
            title="Edit Course Workspace"
            aria-label="Edit Course Workspace"
          >
            <AppIcon name="edit" size={14} />
          </button>

          {/* Lock / Unlock */}
          <button
            type="button"
            className={`cm-row-action-icon-btn${course.locked ? ' active-lock' : ''}`}
            onClick={(e) => triggerAction(e, course.locked ? 'unlock' : 'lock')}
            title={course.locked ? 'Unlock Course' : 'Lock Course'}
            aria-label={course.locked ? 'Unlock Course' : 'Lock Course'}
          >
            <AppIcon name={course.locked ? 'lockOpen' : 'lock'} size={14} />
          </button>

          {/* Activate / Disable */}
          <button
            type="button"
            className={`cm-row-action-icon-btn${course.status === 'active' || course.published ? ' active-status' : ''}`}
            onClick={(e) => triggerAction(e, course.status === 'archived' || course.status === 'draft' ? 'activate' : 'archive')}
            title={course.status === 'archived' || course.status === 'draft' ? 'Activate Course' : 'Disable / Archive Course'}
            aria-label={course.status === 'archived' || course.status === 'draft' ? 'Activate Course' : 'Disable / Archive Course'}
          >
            <AppIcon name={course.status === 'archived' || course.status === 'draft' ? 'check' : 'unpublish'} size={14} />
          </button>

          {/* Duplicate */}
          <button
            type="button"
            className="cm-row-action-icon-btn"
            onClick={(e) => triggerAction(e, 'duplicate')}
            title="Duplicate Course in Database"
            aria-label="Duplicate Course in Database"
          >
            <AppIcon name="copy" size={14} />
          </button>

          {/* Delete (Red) */}
          <button
            type="button"
            className="cm-row-action-icon-btn danger"
            onClick={(e) => triggerAction(e, 'delete')}
            title="Permanently Delete Course"
            aria-label="Permanently Delete Course"
          >
            <AppIcon name="delete" size={14} />
          </button>
        </div>

        <span className="cm-row-chevron">&rsaquo;</span>
      </div>
    </div>
  )
}

/* ── Selected Course Analytics & Content Overview Panel ─────────── */
function SelectedCourseAnalyticsPanel({ selectedCourse, stats, onSelectCourse, onAddSubject }) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!selectedCourse) {
    return (
      <div className="cm-analytics-empty">
        <AppIcon name="folder" size={32} />
        <h4>No Course Selected</h4>
        <p>Select a course workspace from the left list to view its analytics and content breakdown.</p>
      </div>
    )
  }

  // Calculate readiness score for selected course
  const readinessScore = Math.min(
    100,
    Math.round(
      (Math.min(100, (stats.subjects / 4) * 100) +
        Math.min(100, (stats.chapters / 25) * 100) +
        Math.min(100, (stats.mcqs / 500) * 100) +
        Math.min(100, (stats.flashcards / 200) * 100)) /
        4,
    ) || 51,
  )

  const maxVal = Math.max(stats.subjects, stats.chapters, stats.mcqs, stats.flashcards, 1)
  const barMaxH = 75

  // Donut chart stroke calculations
  const totalContent = stats.chapters + stats.mcqs + stats.flashcards
  const r = 42
  const c = 2 * Math.PI * r
  const chapterPct = totalContent ? Math.round((stats.chapters / totalContent) * 100) : 30
  const mcqPct = totalContent ? Math.round((stats.mcqs / totalContent) * 100) : 50
  const flashcardPct = totalContent ? Math.round((stats.flashcards / totalContent) * 100) : 20

  const chStroke = (chapterPct / 100) * c
  const mcqStroke = (mcqPct / 100) * c
  const flashStroke = (flashcardPct / 100) * c

  const examCountdown = calculateExamCountdown(selectedCourse.examDate)

  return (
    <div className="cm-analytics-panel">
      {/* Selected Course Header */}
      <div className="cm-panel-header">
        <div className="cm-panel-title-block">
          <span
            className="cm-panel-icon-badge"
            style={{ background: selectedCourse.themeColor || (selectedCourse.status === 'draft' ? '#7C3AED' : '#F1621B') }}
          >
            <AppIcon name={selectedCourse.icon || 'folder'} size={18} />
          </span>
          <div>
            <div className="cm-panel-heading-row">
              <h3 className="cm-panel-title">{selectedCourse.name}</h3>
              <StatusBadge status={selectedCourse.status || 'draft'} />
            </div>
              <span
                className="cm-exam-countdown-pill"
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: selectedCourse.showExamCountdown !== false ? '#FFF7ED' : '#F1F5F9',
                  color: selectedCourse.showExamCountdown !== false ? examCountdown.badgeColor : '#64748B',
                  border: `1px solid ${selectedCourse.showExamCountdown !== false ? '#FED7AA' : '#CBD5E1'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📅 Exam: <strong>{examCountdown.formattedDate}</strong> ({examCountdown.statusText})</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = selectedCourse.showExamCountdown === false ? true : false
                    courseService.updateCourse(selectedCourse.id, { showExamCountdown: nextVal })
                    showToast(nextVal ? '🔓 Exam Countdown is now VISIBLE to members!' : '🔒 Exam Countdown is now LOCKED / HIDDEN from members.')
                  }}
                  style={{
                    border: 'none',
                    background: selectedCourse.showExamCountdown !== false ? '#FED7AA' : '#CBD5E1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 6px',
                    color: '#1E293B',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title={selectedCourse.showExamCountdown !== false ? 'Lock/Hide Countdown in Member Section' : 'Unlock/Show Countdown in Member Section'}
                >
                  {selectedCourse.showExamCountdown !== false ? '🔓 Member View: ON' : '🔒 Member View: LOCKED'}
                </button>
              </span>
          </div>
        </div>

        <button type="button" className="cm-add-subject-link-btn" onClick={onAddSubject}>
          + Add Subject
        </button>
      </div>

      {/* Tabs */}
      <div className="cm-analytics-tabs">
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Content Overview
        </button>
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'distribution' ? ' active' : ''}`}
          onClick={() => setActiveTab('distribution')}
        >
          Content Distribution
        </button>
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'activity' ? ' active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity Summary
        </button>
      </div>

      {/* Tab 1: Content Overview */}
      {activeTab === 'overview' && (
        <div className="cm-tab-content">
          {/* 4 Stat Cards for Selected Course */}
          <div className="cm-mini-stats-grid">
            <div className="cm-mini-stat-card">
              <div className="cm-mini-stat-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                <AppIcon name="chapters" size={14} />
              </div>
              <div>
                <div className="cm-mini-stat-val">{stats.subjects}</div>
                <div className="cm-mini-stat-label">Subjects</div>
              </div>
            </div>

            <div className="cm-mini-stat-card">
              <div className="cm-mini-stat-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                <AppIcon name="document" size={14} />
              </div>
              <div>
                <div className="cm-mini-stat-val">{stats.chapters}</div>
                <div className="cm-mini-stat-label">Chapters</div>
              </div>
            </div>

            <div className="cm-mini-stat-card">
              <div className="cm-mini-stat-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                <AppIcon name="help" size={14} />
              </div>
              <div>
                <div className="cm-mini-stat-val">{stats.mcqs}</div>
                <div className="cm-mini-stat-label">MCQs</div>
              </div>
            </div>

            <div className="cm-mini-stat-card">
              <div className="cm-mini-stat-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="flashcardsTab" size={14} />
              </div>
              <div>
                <div className="cm-mini-stat-val">{stats.flashcards}</div>
                <div className="cm-mini-stat-label">Flashcards</div>
              </div>
            </div>
          </div>

          {/* Dual Graphs: Content Breakdown & Scale (Left) + Content Readiness & Health (Right) */}
          <div className="cm-dual-graphs-grid">
            {/* Graph 1: Content Breakdown & Scale */}
            <div className="cm-graph-card">
              <div className="cm-chart-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="cm-chart-icon-pill" style={{ background: '#FFF1E6', color: '#F1621B', width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="analyticsTab" size={12} />
                  </span>
                  <h4 className="cm-block-title" style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Content Breakdown & Scale</h4>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, background: '#F1F5F9', padding: '2px 7px', borderRadius: '6px' }}>
                  Total: {stats.subjects + stats.chapters + stats.mcqs + stats.flashcards} Items
                </span>
              </div>

              <div className="cm-bar-chart-container" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 12px' }}>
                <svg viewBox="0 0 360 145" className="cm-bar-svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
                  <defs>
                    <linearGradient id="gradSub" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F1621B" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                    <linearGradient id="gradChap" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                    <linearGradient id="gradMcq" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                    <linearGradient id="gradFlash" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                  </defs>

                  {/* Clean Subtle Reference Gridline */}
                  <line x1="15" y1="115" x2="345" y2="115" stroke="#CBD5E1" strokeWidth="1" />

                  {/* Bars */}
                  {[
                    { label: 'Subjects', val: stats.subjects, fill: 'url(#gradSub)', x: 25 },
                    { label: 'Chapters', val: stats.chapters, fill: 'url(#gradChap)', x: 110 },
                    { label: 'MCQs', val: stats.mcqs, fill: 'url(#gradMcq)', x: 195 },
                    { label: 'Flashcards', val: stats.flashcards, fill: 'url(#gradFlash)', x: 280 },
                  ].map((b) => {
                    const h = Math.max(8, Math.round((b.val / Math.max(maxVal, 100)) * 80))
                    const y = 115 - h
                    return (
                      <g key={b.label}>
                        <rect x={b.x} y={y} width="52" height={h} rx="6" fill={b.fill} />
                        <text x={b.x + 26} y={y - 6} textAnchor="middle" fill="#0F172A" fontSize="12.5" fontWeight="800">
                          {b.val}
                        </text>
                        <text x={b.x + 26} y="132" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700">
                          {b.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Graph 2: Content Readiness & Health Index (High Visibility & Premium) */}
            <div className="cm-graph-card cm-readiness-card-premium">
              <div className="cm-chart-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="cm-chart-icon-pill" style={{ background: '#ECFDF5', color: '#10B981', width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="target" size={12} />
                  </span>
                  <h4 className="cm-block-title" style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Content Readiness</h4>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: readinessScore >= 75 ? '#ECFDF5' : readinessScore >= 40 ? '#FFF7ED' : '#F1F5F9',
                    color: readinessScore >= 75 ? '#059669' : readinessScore >= 40 ? '#EA580C' : '#64748B',
                    border: `1px solid ${readinessScore >= 75 ? '#A7F3D0' : readinessScore >= 40 ? '#FED7AA' : '#CBD5E1'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {readinessScore >= 75 ? '🟢 Ready for Exam' : readinessScore >= 40 ? '⚡ Steady Progress' : '🛠️ In Progress'}
                </span>
              </div>

              <div className="cm-readiness-split-body">
                {/* Left Side: Radial Gauge */}
                <div className="cm-readiness-gauge-side">
                  <div className="cm-gauge-box">
                    <svg viewBox="0 0 140 80" className="cm-readiness-gauge-svg">
                      <path d="M 15 72 A 55 55 0 0 1 125 72" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />
                      <path
                        d="M 15 72 A 55 55 0 0 1 125 72"
                        fill="none"
                        stroke="url(#cmGradScore)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="172"
                        strokeDashoffset={172 - (readinessScore / 100) * 172}
                      />
                      <defs>
                        <linearGradient id="cmGradScore" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#F1621B" />
                          <stop offset="60%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="cm-gauge-center">
                      <span className="cm-gauge-num">{readinessScore}%</span>
                      <span className="cm-gauge-label">Score</span>
                    </div>
                  </div>
                  <span className="cm-gauge-status-sub">
                    {readinessScore >= 75 ? 'Optimal Coverage' : readinessScore >= 40 ? 'Moderate Health' : 'Building Content'}
                  </span>
                </div>

                {/* Right Side: Milestone Checklist */}
                <div className="cm-readiness-checklist-compact">
                  {[
                    { label: 'Subjects', val: stats.subjects, target: 4, pct: Math.min(100, Math.round((stats.subjects / 4) * 100)), color: '#F1621B' },
                    { label: 'Chapters', val: stats.chapters, target: 25, pct: Math.min(100, Math.round((stats.chapters / 25) * 100)), color: '#3B82F6' },
                    { label: 'MCQs', val: stats.mcqs, target: 500, pct: Math.min(100, Math.round((stats.mcqs / 500) * 100)), color: '#10B981' },
                    { label: 'Flashcards', val: stats.flashcards, target: 200, pct: Math.min(100, Math.round((stats.flashcards / 200) * 100)), color: '#8B5CF6' },
                  ].map((row) => (
                    <div key={row.label} className="cm-prog-check-row">
                      <div className="cm-prog-check-info">
                        <span className="cm-prog-check-lbl">{row.label}</span>
                        <span className="cm-prog-check-val"><strong>{row.val}</strong>/{row.target}</span>
                      </div>
                      <div className="cm-prog-track">
                        <div
                          className="cm-prog-fill"
                          style={{
                            width: `${row.pct}%`,
                            background: row.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Insight Callout */}
              <div className="cm-readiness-banner-clean">
                <AppIcon name="target" size={13} />
                <span>
                  {readinessScore >= 75
                    ? `🎯 High Coverage: ${stats.subjects} subjects & ${stats.mcqs} MCQs ready for student practice.`
                    : `⚡ Active Progress: Course is ${readinessScore}% ready with ${stats.chapters} chapters mapped.`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="cm-panel-footer">
        <Button variant="secondary" size="sm" onClick={onAddSubject}>
          <AppIcon name="add" size={14} /> + Add Subject to Course
        </Button>
        <Button variant="primary" size="sm" onClick={() => onSelectCourse(selectedCourse.id)}>
          View Course Details &rsaquo;
        </Button>
      </div>
    </div>
  )
}

function CourseManager({ courseName: _courseName }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { allSubjects, allChapters, allMcqs, allFlashcards } = useAdminStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(activeWorkspaceId || workspaces[0]?.id)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Edit Course Modal State
  const [editModal, setEditModal] = useState({
    open: false,
    course: null,
  })

  // Security Passcode Modal State
  const [securityModal, setSecurityModal] = useState({
    open: false,
    actionType: '',
    course: null,
    newName: '',
    securityCode: '',
    error: '',
  })

  useEffect(() => {
    if (activeWorkspaceId && workspaces.some((w) => w.id === activeWorkspaceId)) {
      setSelectedCourseId(activeWorkspaceId)
    } else if (workspaces.length > 0 && !workspaces.some((w) => w.id === selectedCourseId)) {
      setSelectedCourseId(workspaces[0].id)
    }
  }, [activeWorkspaceId, workspaces, selectedCourseId])

  // 1. Calculate Global 8 KPI Metrics
  const globalKpis = useMemo(() => {
    const totalCourses = workspaces.length
    const published = workspaces.filter((w) => w.published || w.status === 'published' || w.status === 'active').length
    const draft = workspaces.filter((w) => w.status === 'draft').length
    const archived = workspaces.filter((w) => w.status === 'archived').length

    return {
      totalCourses,
      published,
      draft,
      archived,
      subjects: allSubjects?.length || 0,
      chapters: allChapters?.length || 0,
      mcqs: allMcqs?.length || 0,
      flashcards: allFlashcards?.length || 0,
    }
  }, [workspaces, allSubjects, allChapters, allMcqs, allFlashcards])

  // 2. Filter & Sort Course List
  const filteredCourses = useMemo(() => {
    let list = [...workspaces]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      list = list.filter((c) => (c.status || 'draft') === statusFilter)
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
      return 0
    })

    return list
  }, [workspaces, search, statusFilter, sortBy])

  // 3. Helper to get stats for a course (100% data-bound)
  const getCourseStats = (courseId) => {
    const sCount = (allSubjects || []).filter((s) => s.courseId === courseId).length
    const cCount = (allChapters || []).filter((c) => c.courseId === courseId).length
    const mCount = (allMcqs || []).filter((m) => m.courseId === courseId).length
    const fCount = (allFlashcards || []).filter((f) => f.courseId === courseId).length

    return {
      subjects: sCount,
      chapters: cCount,
      mcqs: mCount,
      flashcards: fCount,
    }
  }

  const selectedCourse = useMemo(() => {
    return workspaces.find((w) => w.id === selectedCourseId) || workspaces[0] || null
  }, [workspaces, selectedCourseId])

  const selectedCourseStats = useMemo(() => {
    if (!selectedCourse) return { subjects: 0, chapters: 0, mcqs: 0, flashcards: 0 }
    return getCourseStats(selectedCourse.id)
  }, [selectedCourse, allSubjects, allChapters, allMcqs, allFlashcards])

  // Security Action Handlers
  const handleOpenActionModal = (course, actionType) => {
    setSecurityModal({
      open: true,
      actionType,
      course,
      newName: course.name,
      securityCode: '',
      error: '',
    })
  }

  const handleOpenEditModal = (course) => {
    setEditModal({
      open: true,
      course,
    })
  }

  const handleSaveCourseEdit = async (data) => {
    if (!editModal.course) return { success: false, error: 'No course selected.' }
    try {
      const res = await courseService.updateCourse(editModal.course.id, data)
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Course Updated',
          message: `Course "${data.name}" updated in root database.`,
        })
        setEditModal({ open: false, course: null })
        return { success: true }
      }
      return { success: false, error: res.error || 'Failed to update course in database.' }
    } catch (err) {
      return { success: false, error: err.message || 'Error updating course.' }
    }
  }

  const handleRefreshDatabase = async () => {
    setIsRefreshing(true)
    try {
      const res = await refreshWorkspaces()
      if (res?.success) {
        showToast({
          type: 'success',
          title: 'Database Synchronized',
          message: `Loaded ${res.data?.length || 0} active courses from Supabase.`,
        })
      } else {
        showToast({
          type: 'error',
          title: 'Sync Warning',
          message: res?.error || 'Could not reach database.',
        })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Sync Failed', message: err.message })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExecuteSecurityAction = async () => {
    if (securityModal.securityCode.trim() !== 'Abhisheka') {
      setSecurityModal((prev) => ({
        ...prev,
        error: 'Invalid Security Code! Enter "Abhisheka" to confirm.',
      }))
      showToast({ type: 'error', title: 'Security Check Failed', message: 'Invalid change code entered.' })
      return
    }

    const { course, actionType, newName } = securityModal
    if (!course) return

    try {
      if (actionType === 'rename') {
        if (!newName.trim()) return
        const res = await courseService.updateCourse(course.id, { name: newName.trim() })
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to rename course in database.' }))
          showToast({ type: 'error', title: 'Rename Failed', message: res.error || 'Failed to rename course.' })
          return
        }
        showToast({ type: 'success', title: 'Renamed', message: `Course renamed to "${newName.trim()}".` })
      } else if (actionType === 'delete') {
        const res = await courseService.deleteCourse(course.id)
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to delete course from database.' }))
          showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Failed to delete from database.' })
          return
        }
        showToast({ type: 'success', title: 'Permanently Deleted', message: `Course "${course.name}" deleted from root database.` })
      } else if (actionType === 'lock' || actionType === 'unlock') {
        toggleLockWorkspace(course.id)
        await courseService.updateCourse(course.id, { status: course.locked ? 'active' : 'locked' })
        showToast({ type: 'success', title: course.locked ? 'Unlocked' : 'Locked', message: `Course "${course.name}" status updated.` })
      } else if (actionType === 'publish') {
        publishWorkspace(course.id)
        const res = await courseService.updateCourse(course.id, { status: 'published', published: true })
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to publish course.' }))
          return
        }
        showToast({ type: 'success', title: 'Published', message: `Course "${course.name}" published.` })
      } else if (actionType === 'unpublish') {
        unpublishWorkspace(course.id)
        const res = await courseService.updateCourse(course.id, { status: 'draft', published: false })
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to unpublish course.' }))
          return
        }
        showToast({ type: 'info', title: 'Unpublished', message: `Course "${course.name}" set to draft.` })
      } else if (actionType === 'archive') {
        archiveWorkspace(course.id)
        const res = await courseService.updateCourse(course.id, { status: 'archived', published: false })
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to archive course.' }))
          return
        }
        showToast({ type: 'info', title: 'Archived', message: `Course "${course.name}" archived.` })
      } else if (actionType === 'activate') {
        activateWorkspace(course.id)
        const res = await courseService.updateCourse(course.id, { status: 'active', published: true })
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to activate course.' }))
          return
        }
        showToast({ type: 'success', title: 'Activated', message: `Course "${course.name}" activated.` })
      } else if (actionType === 'duplicate') {
        const res = await courseService.duplicateCourse(course.id)
        if (!res.success) {
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to duplicate course in database.' }))
          showToast({ type: 'error', title: 'Duplicate Failed', message: res.error || 'Failed to duplicate course.' })
          return
        }
        if (res.data?.id) {
          setSelectedCourseId(res.data.id)
          setActiveWorkspace(res.data.id)
        }
        showToast({ type: 'success', title: 'Duplicated', message: `Copy of "${course.name}" created in database.` })
      }
      setSecurityModal({ open: false, actionType: '', course: null, newName: '', securityCode: '', error: '' })
    } catch (err) {
      showToast({ type: 'error', title: 'Action Failed', message: err.message || 'An error occurred.' })
    }
  }

  // Handlers
  const handleCreateCourse = async (values) => {
    try {
      const res = await courseService.createCourse({
        name: values.name.trim(),
        description: values.description.trim(),
        icon: values.icon,
        themeColor: values.themeColor,
        status: values.status,
        published: values.status !== 'draft' && values.status !== 'archived',
      })
      if (res.success && res.data) {
        const course = res.data
        setActiveWorkspace(course.id)
        setSelectedCourseId(course.id)
        setShowCreate(false)
        showToast({ type: 'success', title: 'Course Created', message: `Course "${course.name}" saved to database.` })
        return { success: true }
      } else {
        showToast({ type: 'error', title: 'Error', message: res.error || 'Unable to create course in database.' })
        return { success: false, error: res.error }
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Unable to create course.' })
      return { success: false, error: err.message }
    }
  }

  const handleCreateSubjectUnderSelected = async (data) => {
    if (!selectedCourse) return { success: false, error: 'No course selected.' }
    try {
      const res = await subjectService.createSubject(selectedCourse.id, {
        name: data.name,
        desc: data.desc,
        icon: data.icon,
        color: data.color,
        status: data.status,
      })
      if (res.success) {
        setShowAddSubjectModal(false)
        showToast({
          type: 'success',
          title: 'Subject Added',
          message: `"${data.name}" added to "${selectedCourse.name}" successfully.`,
        })
        return { success: true }
      }
      return { success: false, error: res.error || 'Unable to add subject.' }
    } catch (err) {
      return { success: false, error: err.message || 'Unable to add subject.' }
    }
  }

  const handleSelectCourse = (id) => {
    setSelectedCourseId(id)
    setActiveWorkspace(id)
  }

  return (
    <div className="cm-workspace-shell">
      {/* Two-Column Main Workspace Grid (Left 36%, Right 64%) */}
      <div className="cm-main-workspace-grid">
        {/* LEFT WORKSPACE (36% width): Header + 8 Stat Cards + Search/Filter Toolbar + Course List */}
        <div className="cm-course-list-col">
          {/* Top Left Header (Course Dashboard & Courses Management title matching 36% column width) */}
          <div className="cm-left-col-header">
            <h2 className="cm-left-greeting">
              Course Dashboard: {selectedCourse?.name || _courseName || 'CLASS 10 ENG'}
            </h2>
            <div className="cm-left-sub">
              Courses Management
            </div>
          </div>

          {/* 8 Stat Cards Grid (2 rows x 4 columns) */}
          <div className="cm-stats-grid-8">
            <div className="cm-stat-card-compact" style={{ '--card-accent': '#F1621B' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                  <AppIcon name="folder" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Total</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.totalCourses}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#12B76A' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                  <AppIcon name="check" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Published</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.published}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#F59E0B' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                  <AppIcon name="edit" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Draft</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.draft}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#7C3AED' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                  <AppIcon name="lock" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Archived</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.archived}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#2E5CE6' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                  <AppIcon name="chapters" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Subjects</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.subjects}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#0E9494' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
                  <AppIcon name="document" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Chapters</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.chapters}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#F1621B' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                  <AppIcon name="help" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">MCQs</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.mcqs}</div>
            </div>

            <div className="cm-stat-card-compact" style={{ '--card-accent': '#7C3AED' }}>
              <div className="cm-stat-mini-header">
                <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                  <AppIcon name="flashcardsTab" size={14} />
                </span>
                <span className="cm-stat-mini-lbl">Flashcards</span>
              </div>
              <div className="cm-stat-val-bold">{globalKpis.flashcards}</div>
            </div>
          </div>

          {/* Search & Filters Row */}
          <div className="cm-toolbar-compact">
            <div className="cm-search-box">
              <AppIcon name="search" size={14} />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className="cm-toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select className="cm-toolbar-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              type="button"
              className="cm-refresh-db-btn"
              onClick={handleRefreshDatabase}
              title="Refresh and sync from root database"
              disabled={isRefreshing}
            >
              <AppIcon name="analyticsTab" size={14} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
            </button>
          </div>

          {/* Course List Header & Items */}
          <div className="cm-list-header-row">
            <h4 className="cm-list-title">Courses ({filteredCourses.length})</h4>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="cm-list-empty">
              <AppIcon name="folder" size={28} />
              <p>No courses found</p>
              <span>Try another search query or status filter.</span>
            </div>
          ) : (
            <div className="cm-cards-stack">
              {filteredCourses.map((c) => (
                <CourseListItem
                  key={c.id}
                  course={c}
                  isSelected={c.id === selectedCourseId}
                  onSelect={handleSelectCourse}
                  onEditCourse={handleOpenEditModal}
                  onOpenActionModal={handleOpenActionModal}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT WORKSPACE (40% width): Top Header Card + Selected Course Analytics Panel */}
        <div className="cm-analytics-col">
          {/* Top Course Manager Header Card (+ Create Course CTA) */}
          <div className="cm-top-header-card">
            <div className="cm-top-header-left">
              <span className="cm-top-header-icon">
                <AppIcon name="folder" size={18} />
              </span>
              <div>
                <h3 className="cm-top-header-title">Course Manager</h3>
                <p className="cm-top-header-sub">
                  Root database course management, publishing status & content hierarchy
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={handleRefreshDatabase} disabled={isRefreshing} title="Sync with Database">
                <AppIcon name="analyticsTab" size={14} /> {isRefreshing ? 'Syncing...' : 'Sync DB'}
              </Button>
              <Button variant="primary" size="sm" className="cm-create-course-btn" onClick={() => setShowCreate(!showCreate)}>
                <AppIcon name="add" size={14} /> + Create Course
              </Button>
            </div>
          </div>

          {showCreate && (
            <InlineForm
              onSubmit={handleCreateCourse}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {/* Selected Course Analytics Panel */}
          <SelectedCourseAnalyticsPanel
            selectedCourse={selectedCourse}
            stats={selectedCourseStats}
            onSelectCourse={handleSelectCourse}
            onAddSubject={() => setShowAddSubjectModal(true)}
          />
        </div>
      </div>

      {/* Edit Course Modal */}
      {editModal.open && editModal.course && (
        <EditCourseModal
          course={editModal.course}
          onSubmit={handleSaveCourseEdit}
          onClose={() => setEditModal({ open: false, course: null })}
        />
      )}

      {/* Security Passcode Confirmation Modal */}
      <SecurityCodeConfirmModal
        isOpen={securityModal.open}
        actionType={securityModal.actionType}
        course={securityModal.course}
        newName={securityModal.newName}
        onNewNameChange={(val) => setSecurityModal((prev) => ({ ...prev, newName: val, error: '' }))}
        securityCode={securityModal.securityCode}
        onSecurityCodeChange={(val) => setSecurityModal((prev) => ({ ...prev, securityCode: val, error: '' }))}
        error={securityModal.error}
        onConfirm={handleExecuteSecurityAction}
        onClose={() => setSecurityModal({ open: false, actionType: '', course: null, newName: '', securityCode: '', error: '' })}
      />

      {/* Add Subject Modal under Selected Course */}
      {showAddSubjectModal && selectedCourse && (
        <AddSubjectUnderCourseModal
          course={selectedCourse}
          onSubmit={handleCreateSubjectUnderSelected}
          onClose={() => setShowAddSubjectModal(false)}
        />
      )}
    </div>
  )
}

export default CourseManager
