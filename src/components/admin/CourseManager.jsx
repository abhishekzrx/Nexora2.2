/**
 * CourseManager.jsx
 * World-Class Mobile-First & Responsive Course Management Studio.
 * Designed for High-Productivity Admin on Mobile, Tablet, and Desktop.
 * 
 * Features:
 * - Mobile/Tablet Segmented Navigation: Workspaces Directory, Active Course Intelligence, Global KPIs.
 * - Unified 2-in-1 Master Visual Intelligence Graph (Radial Readiness Gauge + Content Scale Bars & Proportion).
 * - Mobile Bottom Action Sheet for frictionless 1-thumb course management.
 * - 1-Tap Live Exam Countdown Lock/Unlock toggle for enrolled members.
 * - Direct Launchpad deep-linking to Subjects, Chapters, Notes, and MCQ Bank.
 * - High-security passcode confirmation ("Abhisheka") for destructive operations.
 * - Real-time Supabase root database synchronization.
 */

import { useState, useMemo, useEffect } from 'react'
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
import { showToast } from '../../data/feedbackStore'
import { courseService } from '../../services/courseService'
import { subjectService } from '../../services/subjectService'
import { calculateExamCountdown } from '../../utils/dateUtils'
import IconPicker from './IconPicker'

const COLOR_PRESETS = [
  '#F1621B', // Nexora Core Orange
  '#2E5CE6', // Sapphire Blue
  '#12B76A', // Emerald Green
  '#7C3AED', // Royal Violet
  '#0E9494', // Teal Cyan
  '#E8491D', // Coral Red
  '#101828', // Obsidian Black
  '#667085', // Slate Slate
]

const STATUS_MAP = {
  draft: { label: 'DRAFT', tone: 'orange' },
  published: { label: 'PUBLISHED', tone: 'blue' },
  archived: { label: 'ARCHIVED', tone: 'gray' },
  private: { label: 'PRIVATE', tone: 'purple' },
  active: { label: 'ACTIVE', tone: 'green' },
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
]

function StatusBadge({ status, locked }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.draft
  return (
    <span className={`cm-status-badge cm-badge-${cfg.tone}${locked ? ' locked' : ''}`}>
      {locked ? '🔒 LOCKED' : cfg.label}
    </span>
  )
}

/* ── Modal / Sheet: Create Course ─────────────────────────────── */
function CreateCourseModal({ isOpen, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('adminDashboard')
  const [themeColor, setThemeColor] = useState('#F1621B')
  const [status, setStatus] = useState('active')
  const [examDate, setExamDate] = useState('')
  const [showExamCountdown, setShowExamCountdown] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

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
    })
    setIsSubmitting(false)
    if (res && !res.success) {
      setError(res.error || 'Failed to create course in database.')
    }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card cm-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-handle" />
        
        <div className="cm-modal-header">
          <div className="cm-modal-title-wrap">
            <span className="cm-modal-icon-badge" style={{ background: '#FFF1E6', color: '#F1621B' }}>
              <AppIcon name="add" size={18} />
            </span>
            <div>
              <h3 className="cm-modal-title">Create Course Workspace</h3>
              <p className="cm-modal-sub">Initialize curriculum, exam target & database workspace</p>
            </div>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close dialog">
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cm-modal-form">
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
            <label className="cm-label">Description / Subtitle</label>
            <input
              type="text"
              className="cm-input"
              placeholder="Brief course overview for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">Target Exam Date 📅</label>
            <input
              type="date"
              className="cm-input"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <span className="cm-field-hint">
              Used to calculate live countdown shown on student dashboards.
            </span>
          </div>

          <div className="cm-field cm-toggle-card">
            <label className="cm-toggle-label">
              <input
                type="checkbox"
                checked={showExamCountdown}
                onChange={(e) => setShowExamCountdown(e.target.checked)}
                className="cm-checkbox"
              />
              <div className="cm-toggle-text">
                <span className="cm-toggle-title">
                  {showExamCountdown ? '🔓 Show Exam Countdown to Members' : '🔒 Hide / Lock Exam Countdown'}
                </span>
                <span className="cm-toggle-sub">
                  {showExamCountdown
                    ? 'Students will see live remaining days on their app dashboard.'
                    : 'Countdown is hidden from students until unlocked.'}
                </span>
              </div>
            </label>
          </div>

          <div className="cm-field">
            <IconPicker value={icon} onChange={setIcon} label="Course Icon *" />
          </div>

          <div className="cm-field">
            <label className="cm-label">Theme Color Accent</label>
            <div className="cm-color-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cm-color-btn${themeColor === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setThemeColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="cm-field">
            <label className="cm-label">Initial Publishing Status</label>
            <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active (Visible in Curriculum)</option>
              <option value="published">Published</option>
              <option value="draft">Draft (Admin Only)</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <div className="cm-modal-error">
              <AppIcon name="help" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="cm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Modal / Sheet: Edit Existing Course ───────────────────────── */
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
      <div className="cm-modal-card cm-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-handle" />

        <div className="cm-modal-header">
          <div className="cm-modal-title-wrap">
            <span className="cm-modal-icon-badge" style={{ background: themeColor || '#FFF1E6', color: '#fff' }}>
              <AppIcon name={icon || 'edit'} size={18} />
            </span>
            <div>
              <h3 className="cm-modal-title">Edit Course Workspace</h3>
              <p className="cm-modal-sub">Modify details, exam dates, icon, and publishing status</p>
            </div>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close dialog">
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
            <label className="cm-label">Target Exam Date 📅</label>
            <input
              type="date"
              className="cm-input"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <span className="cm-field-hint">
              Updates live exam countdown for enrolled students.
            </span>
          </div>

          <div className="cm-field cm-toggle-card">
            <label className="cm-toggle-label">
              <input
                type="checkbox"
                checked={showExamCountdown}
                onChange={(e) => setShowExamCountdown(e.target.checked)}
                className="cm-checkbox"
              />
              <div className="cm-toggle-text">
                <span className="cm-toggle-title">
                  {showExamCountdown ? '🔓 Show Countdown to Students' : '🔒 Hide / Lock Countdown from Students'}
                </span>
                <span className="cm-toggle-sub">
                  {showExamCountdown
                    ? 'Countdown is visible across student dashboard & practice hubs.'
                    : 'Countdown is locked and hidden from student section.'}
                </span>
              </div>
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
                  aria-label={`Select color ${c}`}
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
              <AppIcon name="help" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="cm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Modal / Sheet: Add Subject under Selected Course ──────────── */
function AddSubjectUnderCourseModal({ course, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState('chapters')
  const [color, setColor] = useState('#F1621B')
  const [status, setStatus] = useState('active')
  const [creationError, setCreationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreationError('')
    if (!name.trim()) return
    setIsSubmitting(true)
    const result = await onSubmit({ name: name.trim(), desc: desc.trim(), icon, color, status })
    setIsSubmitting(false)
    if (!result?.success) {
      setCreationError(result?.error || 'Failed to add subject.')
    }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card cm-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-handle" />

        <div className="cm-modal-header">
          <div className="cm-modal-title-wrap">
            <span className="cm-modal-icon-badge" style={{ background: '#E0F2FE', color: '#0284C7' }}>
              <AppIcon name="add" size={18} />
            </span>
            <div>
              <h3 className="cm-modal-title">Add Subject to {course.name}</h3>
              <p className="cm-modal-sub">Create a new subject module under this course</p>
            </div>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close dialog">
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div className="cm-course-context-badge">
          <AppIcon name="folder" size={14} />
          <span>Parent Course: <strong>{course.name}</strong></span>
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
              placeholder="Brief overview of subject syllabus..."
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
                  aria-label={`Select color ${c}`}
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
              <AppIcon name="help" size={14} />
              <span>{creationError}</span>
            </div>
          )}

          <div className="cm-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Subject'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Modal / Sheet: Security Passcode Confirmation ─────────────── */
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
        return `Rename "${course.name}"`
      case 'delete':
        return `Delete "${course.name}"`
      case 'lock':
        return `Lock "${course.name}"`
      case 'unlock':
        return `Unlock "${course.name}"`
      case 'publish':
        return `Publish "${course.name}"`
      case 'unpublish':
        return `Unpublish "${course.name}"`
      case 'archive':
        return `Archive "${course.name}"`
      case 'activate':
        return `Activate "${course.name}"`
      case 'duplicate':
        return `Duplicate "${course.name}"`
      default:
        return `Modify "${course.name}"`
    }
  }

  const getActionBadgeColor = () => {
    if (actionType === 'delete') return { bg: '#FEF2F2', color: '#DC2626', icon: 'delete' }
    if (actionType === 'lock' || actionType === 'unlock') return { bg: '#F1EDFC', color: '#7C3AED', icon: 'lock' }
    if (actionType === 'publish') return { bg: '#E9F9F1', color: '#12B76A', icon: 'check' }
    return { bg: '#FFF1E6', color: '#F1621B', icon: 'key' }
  }

  const badgeStyle = getActionBadgeColor()

  return (
    <div className="cm-security-modal-overlay" onClick={onClose}>
      <div className="cm-security-modal-card cm-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-handle" />

        <div className="cm-security-header">
          <div className="cm-security-badge-icon" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
            <AppIcon name={badgeStyle.icon} size={20} />
          </div>
          <div>
            <h3 className="cm-security-title">{getTitle()}</h3>
            <p className="cm-security-sub">Admin security confirmation code required.</p>
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
            Enter Admin Passcode *
          </label>
          <input
            type="password"
            className="cm-security-input"
            value={securityCode}
            onChange={(e) => onSecurityCodeChange(e.target.value)}
            placeholder='Type "Abhisheka" to confirm...'
            autoFocus={actionType !== 'rename'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm()
            }}
          />
          <span className="cm-security-hint">
            🔒 Action will only execute upon passcode verification.
          </span>
        </div>

        {error && (
          <div className="cm-security-error">
            <AppIcon name="help" size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="cm-modal-actions" style={{ marginTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'delete' ? 'danger' : 'primary'}
            type="button"
            onClick={onConfirm}
          >
            {actionType === 'delete' ? 'Delete Permanently' : 'Confirm Action'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Mobile Action Sheet (Bottom Drawer for Course Quick Actions) ─ */
function CourseActionSheet({
  isOpen,
  course,
  onClose,
  onSelect,
  onEdit,
  onAddSubject,
  onAction,
  onNavigate,
}) {
  if (!isOpen || !course) return null

  const examInfo = calculateExamCountdown(course.examDate)

  return (
    <div className="cm-action-sheet-overlay" onClick={onClose}>
      <div className="cm-action-sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-sheet-handle" />

        {/* Course Card Summary Header */}
        <div className="cm-sheet-course-header">
          <span
            className="cm-sheet-icon"
            style={{ background: course.themeColor || '#F1621B' }}
          >
            <AppIcon name={course.icon || 'folder'} size={18} />
          </span>
          <div className="cm-sheet-title-col">
            <h4 className="cm-sheet-course-name">{course.name}</h4>
            <div className="cm-sheet-meta-row">
              <StatusBadge status={course.status || 'draft'} locked={course.locked} />
              {course.examDate && (
                <span className="cm-sheet-exam-pill">
                  📅 {examInfo.formattedDate} ({examInfo.statusText})
                </span>
              )}
            </div>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close menu">
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Action List Items */}
        <div className="cm-sheet-action-list">
          <button
            type="button"
            className="cm-sheet-item primary"
            onClick={() => {
              onSelect(course.id)
              onClose()
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
              <AppIcon name="adminDashboard" size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>Open Course Intelligence</strong>
              <span>View readiness metrics, curriculum scale & analytics</span>
            </div>
            <span className="cm-sheet-chevron">&rsaquo;</span>
          </button>

          <button
            type="button"
            className="cm-sheet-item"
            onClick={() => {
              onClose()
              onEdit(course)
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <AppIcon name="edit" size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>Edit Course Details</strong>
              <span>Update title, exam target date & theme color</span>
            </div>
          </button>

          <button
            type="button"
            className="cm-sheet-item"
            onClick={() => {
              onClose()
              onAddSubject(course)
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <AppIcon name="add" size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>Add Subject to Course</strong>
              <span>Create a new subject module instantly</span>
            </div>
          </button>

          {onNavigate && (
            <>
              <button
                type="button"
                className="cm-sheet-item"
                onClick={() => {
                  onSelect(course.id)
                  onClose()
                  onNavigate('subjects')
                }}
              >
                <span className="cm-sheet-item-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
                  <AppIcon name="chapters" size={16} />
                </span>
                <div className="cm-sheet-item-text">
                  <strong>Manage Subjects & Chapters</strong>
                  <span>Go to syllabus builder and chapter manager</span>
                </div>
              </button>

              <button
                type="button"
                className="cm-sheet-item"
                onClick={() => {
                  onSelect(course.id)
                  onClose()
                  onNavigate('mcq-manager')
                }}
              >
                <span className="cm-sheet-item-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                  <AppIcon name="mcqs" size={16} />
                </span>
                <div className="cm-sheet-item-text">
                  <strong>MCQ Question Bank</strong>
                  <span>Manage quizzes, explanations & question pools</span>
                </div>
              </button>
            </>
          )}

          <div className="cm-sheet-divider" />

          {/* Quick Status and Security Actions */}
          <button
            type="button"
            className="cm-sheet-item"
            onClick={() => {
              onClose()
              onAction(course, course.locked ? 'unlock' : 'lock')
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
              <AppIcon name={course.locked ? 'lockOpen' : 'lock'} size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>{course.locked ? 'Unlock Course Access' : 'Lock Course Access'}</strong>
              <span>{course.locked ? 'Enable student interactions' : 'Prevent changes and student practice'}</span>
            </div>
          </button>

          <button
            type="button"
            className="cm-sheet-item"
            onClick={() => {
              onClose()
              onAction(course, course.status === 'archived' || course.status === 'draft' ? 'activate' : 'archive')
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <AppIcon name={course.status === 'archived' || course.status === 'draft' ? 'check' : 'unpublish'} size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>{course.status === 'archived' || course.status === 'draft' ? 'Publish & Activate' : 'Archive Course'}</strong>
              <span>{course.status === 'archived' || course.status === 'draft' ? 'Make live for enrolled students' : 'Hide from active catalog'}</span>
            </div>
          </button>

          <button
            type="button"
            className="cm-sheet-item"
            onClick={() => {
              onClose()
              onAction(course, 'duplicate')
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#F8FAFC', color: '#475569' }}>
              <AppIcon name="copy" size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong>Duplicate Workspace</strong>
              <span>Clone course schema and settings in database</span>
            </div>
          </button>

          <button
            type="button"
            className="cm-sheet-item danger"
            onClick={() => {
              onClose()
              onAction(course, 'delete')
            }}
          >
            <span className="cm-sheet-item-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              <AppIcon name="delete" size={16} />
            </span>
            <div className="cm-sheet-item-text">
              <strong style={{ color: '#DC2626' }}>Delete Course Permanently</strong>
              <span>Removes workspace from root database (requires passcode)</span>
            </div>
          </button>
        </div>

        <div className="cm-sheet-footer">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Close Menu
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Compact Course List Row Item ──────────────────────────────── */
function CourseListItem({
  course,
  isSelected,
  onSelect,
  onEditCourse,
  onOpenActionModal,
  onOpenActionSheet,
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
        <div className="cm-row-title-wrap">
          <div className="cm-row-name-line">
            <span className="cm-row-course-name" title={course.name}>
              {course.name}
            </span>
            {isSelected && <span className="cm-active-indicator-dot" title="Active Workspace" />}
          </div>
          
          <div className="cm-row-exam-badge">
            <span>📅 {course.examDate ? `${examInfo.formattedDate} (${examInfo.statusText})` : 'No Target Date'}</span>
            {course.showExamCountdown === false && (
              <span
                className="cm-exam-hidden-pill"
                title="Exam countdown is locked and hidden from student view"
              >
                🔒 Hidden
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="cm-row-right" onClick={(e) => e.stopPropagation()}>
        <StatusBadge status={course.status || 'draft'} locked={course.locked} />

        {/* Mobile Quick More 3-Dots Button */}
        <button
          type="button"
          className="cm-mobile-more-btn"
          onClick={(e) => {
            e.stopPropagation()
            onOpenActionSheet(course)
          }}
          title="Quick Course Actions"
          aria-label="Quick Course Actions"
        >
          <AppIcon name="moreVert" size={16} />
        </button>

        {/* Desktop Embedded Action Icon Toolbar */}
        <div className="cm-row-embedded-actions">
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

          <button
            type="button"
            className={`cm-row-action-icon-btn${course.locked ? ' active-lock' : ''}`}
            onClick={(e) => triggerAction(e, course.locked ? 'unlock' : 'lock')}
            title={course.locked ? 'Unlock Course' : 'Lock Course'}
            aria-label={course.locked ? 'Unlock Course' : 'Lock Course'}
          >
            <AppIcon name={course.locked ? 'lockOpen' : 'lock'} size={14} />
          </button>

          <button
            type="button"
            className={`cm-row-action-icon-btn${course.status === 'active' || course.published ? ' active-status' : ''}`}
            onClick={(e) => triggerAction(e, course.status === 'archived' || course.status === 'draft' ? 'activate' : 'archive')}
            title={course.status === 'archived' || course.status === 'draft' ? 'Activate Course' : 'Disable / Archive Course'}
            aria-label={course.status === 'archived' || course.status === 'draft' ? 'Activate Course' : 'Disable / Archive Course'}
          >
            <AppIcon name={course.status === 'archived' || course.status === 'draft' ? 'check' : 'unpublish'} size={14} />
          </button>

          <button
            type="button"
            className="cm-row-action-icon-btn"
            onClick={(e) => triggerAction(e, 'duplicate')}
            title="Duplicate Course in Database"
            aria-label="Duplicate Course in Database"
          >
            <AppIcon name="copy" size={14} />
          </button>

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

/* ── 2-in-1 Master Visual Intelligence Card (Combined Graph) ──── */
function MasterVisualIntelligenceCard({ stats, readinessScore }) {
  const totalItems = stats.subjects + stats.chapters + stats.mcqs + stats.flashcards
  const maxVal = Math.max(stats.subjects, stats.chapters, stats.mcqs, stats.flashcards, 1)

  // Distribution percentages
  const subPct = totalItems ? Math.round((stats.subjects / totalItems) * 100) : 1
  const chapPct = totalItems ? Math.round((stats.chapters / totalItems) * 100) : 5
  const mcqPct = totalItems ? Math.round((stats.mcqs / totalItems) * 100) : 68
  const flashPct = totalItems ? Math.max(0, 100 - subPct - chapPct - mcqPct) : 26

  // Radius 52 => Arc circumference for 180 deg = Math.PI * 52 = 163.36
  const arcLength = 163.36
  const strokeOffset = arcLength - (Math.min(100, Math.max(0, readinessScore)) / 100) * arcLength

  return (
    <div className="cm-master-graph-card">
      {/* Header */}
      <div className="cm-master-graph-header">
        <div className="cm-master-graph-title-block">
          <span className="cm-master-graph-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
            <AppIcon name="analyticsTab" size={15} />
          </span>
          <div>
            <h4 className="cm-master-graph-title">Curriculum Health & Content Scale</h4>
            <span className="cm-master-graph-sub">Integrated Readiness Score & Multi-Category Volume</span>
          </div>
        </div>

        <div className="cm-master-graph-badges">
          <span className="cm-master-total-badge">{totalItems.toLocaleString()} Total Items</span>
          <span
            className="cm-master-health-badge"
            style={{
              background: readinessScore >= 75 ? '#ECFDF5' : readinessScore >= 40 ? '#FFF7ED' : '#F1F5F9',
              color: readinessScore >= 75 ? '#059669' : readinessScore >= 40 ? '#EA580C' : '#64748B',
              border: `1px solid ${readinessScore >= 75 ? '#A7F3D0' : readinessScore >= 40 ? '#FED7AA' : '#CBD5E1'}`,
            }}
          >
            {readinessScore >= 75 ? '🟢 Exam Ready' : readinessScore >= 40 ? '⚡ Steady' : '🛠️ Building'}
          </span>
        </div>
      </div>

      {/* 2-in-1 Dual Section Body */}
      <div className="cm-master-2in1-body">
        {/* Left Section: Radial Arc Gauge */}
        <div className="cm-master-gauge-section">
          <div className="cm-gauge-box-master">
            <svg viewBox="0 0 140 85" className="cm-gauge-svg-master">
              <defs>
                <linearGradient id="masterGradScore" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F1621B" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path d="M 18 74 A 52 52 0 0 1 122 74" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" />
              {/* Foreground Meter */}
              <path
                d="M 18 74 A 52 52 0 0 1 122 74"
                fill="none"
                stroke="url(#masterGradScore)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div className="cm-gauge-center-master">
              <span className="cm-gauge-num-master">{readinessScore}%</span>
              <span className="cm-gauge-label-master">Readiness</span>
            </div>
          </div>
          <span className="cm-gauge-status-pill">
            {readinessScore >= 75 ? 'Optimal Curriculum' : readinessScore >= 40 ? 'Active Progress' : 'Initial Phase'}
          </span>
        </div>

        {/* Right Section: Content Scale Bar Chart */}
        <div className="cm-master-bars-section">
          <div className="cm-bars-header-row">
            <span className="cm-bars-sub-title">Content Volume Breakdown</span>
            <span className="cm-bars-max-note">Peak: {maxVal}</span>
          </div>

          <div className="cm-master-bar-chart-wrap">
            <svg viewBox="0 0 320 110" className="cm-master-bars-svg">
              <defs>
                <linearGradient id="mGradSub" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FB923C" />
                  <stop offset="100%" stopColor="#EA580C" />
                </linearGradient>
                <linearGradient id="mGradChap" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="mGradMcq" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="mGradFlash" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>

              {/* Baseline */}
              <line x1="10" y1="88" x2="310" y2="88" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />

              {/* 4 Bars */}
              {[
                { label: 'Subjects', val: stats.subjects, fill: 'url(#mGradSub)', x: 18 },
                { label: 'Chapters', val: stats.chapters, fill: 'url(#mGradChap)', x: 94 },
                { label: 'MCQs', val: stats.mcqs, fill: 'url(#mGradMcq)', x: 170 },
                { label: 'Flashcards', val: stats.flashcards, fill: 'url(#mGradFlash)', x: 246 },
              ].map((b) => {
                const barHeight = Math.max(8, Math.round((b.val / Math.max(maxVal, 50)) * 62))
                const y = 88 - barHeight
                return (
                  <g key={b.label}>
                    <rect x={b.x} y={y} width="46" height={barHeight} rx="5" fill={b.fill} />
                    <text x={b.x + 23} y={y - 4} textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="800">
                      {b.val}
                    </text>
                    <text x={b.x + 23} y="104" textAnchor="middle" fill="#64748B" fontSize="9.5" fontWeight="700">
                      {b.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Proportional Split Progress Bar */}
      <div className="cm-prop-split-wrap">
        <div className="cm-prop-split-header">
          <span className="cm-prop-lbl">Volume Proportion Split</span>
          <span className="cm-prop-meta">
            MCQs: <strong>{mcqPct}%</strong> • Flashcards: <strong>{flashPct}%</strong> • Chapters: <strong>{chapPct}%</strong> • Subjects: <strong>{subPct}%</strong>
          </span>
        </div>
        <div className="cm-prop-multi-track">
          <div className="cm-prop-seg" style={{ width: `${Math.max(2, subPct)}%`, background: '#EA580C' }} title={`Subjects: ${subPct}%`} />
          <div className="cm-prop-seg" style={{ width: `${Math.max(2, chapPct)}%`, background: '#2563EB' }} title={`Chapters: ${chapPct}%`} />
          <div className="cm-prop-seg" style={{ width: `${Math.max(2, mcqPct)}%`, background: '#059669' }} title={`MCQs: ${mcqPct}%`} />
          <div className="cm-prop-seg" style={{ width: `${Math.max(2, flashPct)}%`, background: '#7C3AED' }} title={`Flashcards: ${flashPct}%`} />
        </div>
      </div>

      {/* 4-Item Milestone Health Checklist */}
      <div className="cm-master-milestones-grid">
        {[
          { label: 'Subjects', val: stats.subjects, target: 4, pct: Math.min(100, Math.round((stats.subjects / 4) * 100)), color: '#EA580C' },
          { label: 'Chapters', val: stats.chapters, target: 25, pct: Math.min(100, Math.round((stats.chapters / 25) * 100)), color: '#2563EB' },
          { label: 'MCQs', val: stats.mcqs, target: 500, pct: Math.min(100, Math.round((stats.mcqs / 500) * 100)), color: '#059669' },
          { label: 'Flashcards', val: stats.flashcards, target: 200, pct: Math.min(100, Math.round((stats.flashcards / 200) * 100)), color: '#7C3AED' },
        ].map((m) => (
          <div key={m.label} className="cm-master-milestone-tile">
            <div className="cm-milestone-tile-head">
              <span className="cm-milestone-tile-name">{m.label}</span>
              <span className="cm-milestone-tile-ratio"><strong>{m.val}</strong>/{m.target}</span>
            </div>
            <div className="cm-milestone-tile-track">
              <div className="cm-milestone-tile-fill" style={{ width: `${m.pct}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Insight Callout */}
      <div className="cm-master-insight-callout">
        <AppIcon name="target" size={13} />
        <span>
          {readinessScore >= 75
            ? `🎯 High Health: ${stats.subjects} subjects & ${stats.mcqs} MCQs populated for student practice.`
            : `⚡ In Progress: Course is ${readinessScore}% ready with ${stats.chapters} chapters mapped.`}
        </span>
      </div>
    </div>
  )
}

/* ── Selected Course Analytics & Intelligence Hub ──────────────── */
function SelectedCourseAnalyticsPanel({
  selectedCourse,
  stats,
  courseSubjects = [],
  allChapters = [],
  onSelectCourse,
  onAddSubject,
  onEditCourse,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!selectedCourse) {
    return (
      <div className="cm-analytics-empty">
        <div className="cm-empty-icon-wrap">
          <AppIcon name="folder" size={32} />
        </div>
        <h4>No Course Selected</h4>
        <p>Select a course workspace to view curriculum readiness, questions scale, and quick actions.</p>
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

  const examCountdown = calculateExamCountdown(selectedCourse.examDate)

  const toggleExamCountdownLock = async (e) => {
    e?.stopPropagation()
    const nextVal = selectedCourse.showExamCountdown === false
    try {
      const res = await courseService.updateCourse(selectedCourse.id, { showExamCountdown: nextVal })
      if (res.success) {
        showToast({
          type: 'success',
          title: nextVal ? 'Countdown Unlocked' : 'Countdown Locked',
          message: nextVal
            ? '🔓 Exam Countdown is now VISIBLE to enrolled members!'
            : '🔒 Exam Countdown is now LOCKED & HIDDEN from members.',
        })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Update Failed', message: err.message })
    }
  }

  return (
    <div className="cm-analytics-panel">
      {/* 1. Highly Organised Course Hero Header Card */}
      <div className="cm-hero-course-card">
        {/* Top Info & Action Buttons Row */}
        <div className="cm-hero-top-row">
          <div className="cm-hero-identity">
            <span
              className="cm-hero-icon-badge"
              style={{ background: selectedCourse.themeColor || '#F1621B' }}
            >
              <AppIcon name={selectedCourse.icon || 'folder'} size={18} />
            </span>
            <div className="cm-hero-titles">
              <div className="cm-hero-name-badge-row">
                <h3 className="cm-hero-course-title">{selectedCourse.name}</h3>
                <StatusBadge status={selectedCourse.status || 'draft'} locked={selectedCourse.locked} />
              </div>
              <span className="cm-hero-desc">
                {selectedCourse.description || 'Root Curriculum & Content Workspace'}
              </span>
            </div>
          </div>

          <div className="cm-hero-actions-wrap">
            <button
              type="button"
              className="cm-hero-btn-edit"
              onClick={() => onEditCourse?.(selectedCourse)}
              title="Edit Course Workspace"
            >
              <AppIcon name="edit" size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className="cm-hero-btn-add"
              onClick={onAddSubject}
              title="Add Subject Under Course"
            >
              <AppIcon name="add" size={13} />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Bottom Exam Countdown Ribbon & 1-Tap Member Lock Toggle */}
        <div className="cm-hero-exam-ribbon">
          <div className="cm-exam-ribbon-left">
            <span className="cm-exam-ribbon-icon">📅</span>
            <span className="cm-exam-ribbon-text">
              Exam Target: <strong>{examCountdown.formattedDate}</strong>
              <span className="cm-exam-days-tag">({examCountdown.statusText})</span>
            </span>
          </div>

          <button
            type="button"
            onClick={toggleExamCountdownLock}
            className={`cm-exam-lock-pill-btn${selectedCourse.showExamCountdown !== false ? ' unlocked' : ' locked'}`}
            title={selectedCourse.showExamCountdown !== false ? 'Lock/Hide Countdown in Student View' : 'Unlock/Show Countdown in Student View'}
          >
            <AppIcon name={selectedCourse.showExamCountdown !== false ? 'lockOpen' : 'lock'} size={12} />
            <span>{selectedCourse.showExamCountdown !== false ? 'Student View: ON' : 'Student View: LOCKED'}</span>
          </button>
        </div>
      </div>

      {/* 2. Crisp 2x2 Launchpad Grid */}
      <div className="cm-quick-launchpad-grid">
        <div
          className="cm-launchpad-card launchpad-sub"
          onClick={() => onNavigate?.('subjects')}
          title="Go to Subjects & Chapters Builder"
        >
          <div className="cm-launchpad-top">
            <span className="cm-launchpad-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
              <AppIcon name="chapters" size={15} />
            </span>
            <span className="cm-launchpad-count">{stats.subjects}</span>
          </div>
          <div className="cm-launchpad-label">Subjects Module</div>
          <span className="cm-launchpad-action-sub">Manage Syllabus ›</span>
        </div>

        <div
          className="cm-launchpad-card launchpad-chap"
          onClick={() => onNavigate?.('notes')}
          title="Go to Notes Editor"
        >
          <div className="cm-launchpad-top">
            <span className="cm-launchpad-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <AppIcon name="document" size={15} />
            </span>
            <span className="cm-launchpad-count">{stats.chapters}</span>
          </div>
          <div className="cm-launchpad-label">Chapters & Notes</div>
          <span className="cm-launchpad-action-sub">Open Editor ›</span>
        </div>

        <div
          className="cm-launchpad-card launchpad-mcq"
          onClick={() => onNavigate?.('mcq-manager')}
          title="Go to MCQ Question Bank"
        >
          <div className="cm-launchpad-top">
            <span className="cm-launchpad-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <AppIcon name="help" size={15} />
            </span>
            <span className="cm-launchpad-count">{stats.mcqs}</span>
          </div>
          <div className="cm-launchpad-label">MCQ Bank</div>
          <span className="cm-launchpad-action-sub">Manage Questions ›</span>
        </div>

        <div
          className="cm-launchpad-card launchpad-flash"
          onClick={() => onNavigate?.('mcq-injection')}
          title="Chapter MCQs Injection"
        >
          <div className="cm-launchpad-top">
            <span className="cm-launchpad-icon" style={{ background: '#FAF5FF', color: '#7C3AED' }}>
              <AppIcon name="flashcardsTab" size={15} />
            </span>
            <span className="cm-launchpad-count">{stats.flashcards}</span>
          </div>
          <div className="cm-launchpad-label">MCQ Injection</div>
          <span className="cm-launchpad-action-sub">Bulk Inject ›</span>
        </div>
      </div>

      {/* 3. Segmented Navigation Tabs */}
      <div className="cm-analytics-tabs">
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Readiness & Scale
        </button>
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'subjects' ? ' active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          📚 Course Subjects ({courseSubjects.length})
        </button>
        <button
          type="button"
          className={`cm-tab-btn${activeTab === 'activity' ? ' active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab 1: 2-in-1 Master Visual Intelligence Graph */}
      {activeTab === 'overview' && (
        <div className="cm-tab-content">
          <MasterVisualIntelligenceCard
            stats={stats}
            readinessScore={readinessScore}
          />
        </div>
      )}

      {/* Tab 2: Course Subjects Module Roster */}
      {activeTab === 'subjects' && (
        <div className="cm-tab-content">
          <div className="cm-subjects-roster-wrap">
            <div className="cm-roster-header-row">
              <div>
                <h4 className="cm-roster-title">Course Subjects ({courseSubjects.length})</h4>
                <span className="cm-roster-sub">Syllabus modules assigned to {selectedCourse.name}</span>
              </div>
              <Button variant="primary" size="sm" onClick={onAddSubject}>
                <AppIcon name="add" size={13} /> Add Subject
              </Button>
            </div>

            {courseSubjects.length === 0 ? (
              <div className="cm-roster-empty">
                <span className="cm-empty-mini-icon">📚</span>
                <h5>No Subjects Added Yet</h5>
                <p>Add subjects like Programming, DBMS, or Networks to organize chapters and MCQs.</p>
                <Button variant="secondary" size="sm" onClick={onAddSubject}>
                  <AppIcon name="add" size={13} /> Create First Subject
                </Button>
              </div>
            ) : (
              <div className="cm-subjects-cards-list">
                {courseSubjects.map((s, idx) => {
                  const chapCount = (allChapters || []).filter(
                    (c) => (c.subjectId || c.subject_id) === s.id
                  ).length
                  return (
                    <div
                      key={s.id || idx}
                      className="cm-subject-roster-card"
                      onClick={() => onNavigate?.('subjects')}
                    >
                      <div className="cm-sub-roster-left">
                        <span
                          className="cm-sub-roster-icon"
                          style={{ background: s.color || s.themeColor || '#F1621B' }}
                        >
                          <AppIcon name={s.icon || 'chapters'} size={15} />
                        </span>
                        <div className="cm-sub-roster-info">
                          <div className="cm-sub-roster-name-row">
                            <strong className="cm-sub-roster-name">{s.name}</strong>
                            <span className={`cm-sub-status-pill ${s.status || 'active'}`}>
                              {s.status || 'ACTIVE'}
                            </span>
                          </div>
                          <span className="cm-sub-roster-meta">
                            📖 {chapCount} {chapCount === 1 ? 'Chapter' : 'Chapters'} • {s.desc || 'Curriculum Subject'}
                          </span>
                        </div>
                      </div>

                      <div className="cm-sub-roster-right">
                        <button
                          type="button"
                          className="cm-sub-roster-nav-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate?.('subjects')
                          }}
                        >
                          <span>Manage Syllabus</span>
                          <AppIcon name="chevronRight" size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Settings & Metadata */}
      {activeTab === 'activity' && (
        <div className="cm-tab-content">
          <div className="cm-meta-summary-card">
            <div className="cm-meta-row">
              <span className="cm-meta-label">Workspace ID:</span>
              <code className="cm-meta-code">{selectedCourse.id}</code>
            </div>
            <div className="cm-meta-row">
              <span className="cm-meta-label">Status:</span>
              <StatusBadge status={selectedCourse.status || 'draft'} locked={selectedCourse.locked} />
            </div>
            <div className="cm-meta-row">
              <span className="cm-meta-label">Exam Target Date:</span>
              <span>{selectedCourse.examDate ? `${examCountdown.formattedDate} (${examCountdown.daysLeft} days remaining)` : 'No Date Configured'}</span>
            </div>
            <div className="cm-meta-row">
              <span className="cm-meta-label">Student Countdown Visibility:</span>
              <span style={{ fontWeight: 700, color: selectedCourse.showExamCountdown !== false ? '#16A34A' : '#DC2626' }}>
                {selectedCourse.showExamCountdown !== false ? '🔓 Unlocked (Visible in Student App)' : '🔒 Locked (Hidden from Students)'}
              </span>
            </div>
            <div className="cm-meta-row">
              <span className="cm-meta-label">Theme Color Accent:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cm-color-preview-circle" style={{ background: selectedCourse.themeColor || '#F1621B' }} />
                <span>{selectedCourse.themeColor || '#F1621B'}</span>
              </div>
            </div>

            <div className="cm-meta-actions-row">
              <Button variant="secondary" onClick={() => onEditCourse?.(selectedCourse)}>
                <AppIcon name="edit" size={14} /> Edit Course Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="cm-panel-footer">
        <Button variant="secondary" size="sm" onClick={onAddSubject}>
          <AppIcon name="add" size={14} /> Add Subject
        </Button>
        {onNavigate ? (
          <Button variant="primary" size="sm" onClick={() => onNavigate('subjects')}>
            Open Subject Manager ›
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => onSelectCourse(selectedCourse.id)}>
            Select Workspace ›
          </Button>
        )}
      </div>
    </div>
  )
}

/* ── Main CourseManager Component ─────────────────────────────── */
function CourseManager({ courseName: _courseName, onNavigate }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { allSubjects, allChapters, allMcqs, allFlashcards } = useAdminStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(activeWorkspaceId || workspaces[0]?.id)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mobile View Segment State: 'courses' | 'intelligence' | 'kpis'
  const [activeMobileView, setActiveMobileView] = useState('courses')

  // Mobile Action Sheet State
  const [actionSheet, setActionSheet] = useState({
    open: false,
    course: null,
  })

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

  // 3. Helper to get stats for a course
  const getCourseStats = (courseId) => {
    const sCount = (allSubjects || []).filter((s) => (s.courseId || s.course_id) === courseId).length
    const cCount = (allChapters || []).filter((c) => (c.courseId || c.course_id) === courseId).length
    const mCount = (allMcqs || []).filter((m) => (m.courseId || m.course_id) === courseId).length
    const fCount = (allFlashcards || []).filter((f) => (f.courseId || f.course_id) === courseId).length

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

  const selectedCourseSubjects = useMemo(() => {
    if (!selectedCourse) return []
    return (allSubjects || []).filter(
      (s) => (s.courseId || s.course_id) === selectedCourse.id
    )
  }, [selectedCourse, allSubjects])

  // Action Handlers
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

  const handleOpenActionSheet = (course) => {
    setActionSheet({
      open: true,
      course,
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
          message: `Loaded ${res.data?.length || 0} courses from Supabase.`,
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
        showToast({ type: 'success', title: 'Permanently Deleted', message: `Course "${course.name}" deleted.` })
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
          setSecurityModal((prev) => ({ ...prev, error: res.error || 'Failed to duplicate course.' }))
          showToast({ type: 'error', title: 'Duplicate Failed', message: res.error || 'Failed to duplicate course.' })
          return
        }
        if (res.data?.id) {
          setSelectedCourseId(res.data.id)
          setActiveWorkspace(res.data.id)
        }
        showToast({ type: 'success', title: 'Duplicated', message: `Copy of "${course.name}" created.` })
      }
      setSecurityModal({ open: false, actionType: '', course: null, newName: '', securityCode: '', error: '' })
    } catch (err) {
      showToast({ type: 'error', title: 'Action Failed', message: err.message || 'An error occurred.' })
    }
  }

  const handleCreateCourse = async (values) => {
    try {
      const res = await courseService.createCourse({
        name: values.name.trim(),
        description: values.description.trim(),
        icon: values.icon,
        themeColor: values.themeColor,
        status: values.status,
        examDate: values.examDate,
        showExamCountdown: values.showExamCountdown,
        published: values.status !== 'draft' && values.status !== 'archived',
      })
      if (res.success && res.data) {
        const course = res.data
        setActiveWorkspace(course.id)
        setSelectedCourseId(course.id)
        setShowCreateModal(false)
        setActiveMobileView('intelligence')
        showToast({ type: 'success', title: 'Course Created', message: `Course "${course.name}" initialized.` })
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
          message: `"${data.name}" added to "${selectedCourse.name}".`,
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
    setActiveMobileView('intelligence')
  }

  return (
    <div className="cm-workspace-shell">
      {/* Mobile Top Header Banner */}
      <div className="cm-mobile-top-header">
        <div className="cm-mobile-top-left">
          <span className="cm-mobile-top-icon">
            <AppIcon name="folder" size={18} />
          </span>
          <div>
            <h2 className="cm-mobile-top-title">Course Studio</h2>
            <span className="cm-mobile-top-sub">
              {workspaces.length} Workspaces • Active: {selectedCourse?.name || 'None'}
            </span>
          </div>
        </div>

        <div className="cm-mobile-top-actions">
          <button
            type="button"
            className="cm-mobile-sync-btn"
            onClick={handleRefreshDatabase}
            disabled={isRefreshing}
            title="Sync Root DB"
          >
            <AppIcon name="analyticsTab" size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span className="cm-hide-on-compact">{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
          </button>
          
          <button
            type="button"
            className="cm-mobile-create-pill-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create New Course"
          >
            <AppIcon name="add" size={14} />
            <span>Course</span>
          </button>
        </div>
      </div>

      {/* Mobile Segmented View Controller (Workspaces vs Intelligence vs KPIs) */}
      <div className="cm-mobile-segmented-bar">
        <button
          type="button"
          className={`cm-segment-btn${activeMobileView === 'courses' ? ' active' : ''}`}
          onClick={() => setActiveMobileView('courses')}
        >
          <AppIcon name="folder" size={14} />
          <span>Courses ({filteredCourses.length})</span>
        </button>

        <button
          type="button"
          className={`cm-segment-btn${activeMobileView === 'intelligence' ? ' active' : ''}`}
          onClick={() => setActiveMobileView('intelligence')}
        >
          <AppIcon name="analyticsTab" size={14} />
          <span>Active Hub</span>
          {selectedCourse && <span className="cm-segment-dot" style={{ background: selectedCourse.themeColor || '#F1621B' }} />}
        </button>

        <button
          type="button"
          className={`cm-segment-btn${activeMobileView === 'kpis' ? ' active' : ''}`}
          onClick={() => setActiveMobileView('kpis')}
        >
          <AppIcon name="target" size={14} />
          <span>Metrics (8)</span>
        </button>
      </div>

      {/* Global 8 KPI Metrics Row */}
      <div className={`cm-stats-grid-8-wrapper${activeMobileView === 'kpis' ? ' mobile-kpi-force-show' : ''}`}>
        <div className="cm-stats-grid-8">
          <div className="cm-stat-card-compact" style={{ '--card-accent': '#F1621B' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                <AppIcon name="folder" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Courses</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.totalCourses}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#12B76A' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                <AppIcon name="check" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Published</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.published}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#F59E0B' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                <AppIcon name="edit" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Draft</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.draft}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#7C3AED' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="lock" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Archived</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.archived}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#2E5CE6' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                <AppIcon name="chapters" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Subjects</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.subjects}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#0E9494' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
                <AppIcon name="document" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Chapters</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.chapters}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#F1621B' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                <AppIcon name="help" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">MCQs</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.mcqs}</div>
          </div>

          <div className="cm-stat-card-compact" style={{ '--card-accent': '#7C3AED' }}>
            <div className="cm-stat-mini-header">
              <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="flashcardsTab" size={13} />
              </span>
              <span className="cm-stat-mini-lbl">Flashcards</span>
            </div>
            <div className="cm-stat-val-bold">{globalKpis.flashcards}</div>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Master List + Intelligence Panel) */}
      <div className="cm-main-workspace-grid">
        {/* LEFT COLUMN: Course Directory */}
        <div className={`cm-course-list-col${activeMobileView === 'courses' ? ' mobile-view-active' : ''}`}>
          {/* Search & Filters Toolbar */}
          <div className="cm-toolbar-compact">
            <div className="cm-search-box">
              <AppIcon name="search" size={14} />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="cm-clear-search-btn" onClick={() => setSearch('')}>
                  <AppIcon name="close" size={12} />
                </button>
              )}
            </div>

            <select
              className="cm-toolbar-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select
              className="cm-toolbar-select cm-hide-on-compact"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Course List Header */}
          <div className="cm-list-header-row">
            <h4 className="cm-list-title">
              All Courses ({filteredCourses.length})
            </h4>
            <span className="cm-list-hint">Tap card to open hub • ⋯ for actions</span>
          </div>

          {/* Cards Stack */}
          {filteredCourses.length === 0 ? (
            <div className="cm-list-empty">
              <div className="cm-empty-icon-pill">
                <AppIcon name="folder" size={24} />
              </div>
              <p>No courses found</p>
              <span>Try another search query or create a new workspace.</span>
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                <AppIcon name="add" size={14} /> Create Course
              </Button>
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
                  onOpenActionSheet={handleOpenActionSheet}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Selected Course Analytics & Intelligence Panel */}
        <div className={`cm-analytics-col${activeMobileView === 'intelligence' ? ' mobile-view-active' : ''}`}>
          {/* Mobile Back Button when in Intelligence Mode */}
          <div className="cm-mobile-back-row">
            <button
              type="button"
              className="cm-mobile-back-btn"
              onClick={() => setActiveMobileView('courses')}
            >
              &lsaquo; Back to Course List
            </button>
            <span className="cm-mobile-active-lbl">Active Workspace</span>
          </div>

          <SelectedCourseAnalyticsPanel
            selectedCourse={selectedCourse}
            stats={selectedCourseStats}
            courseSubjects={selectedCourseSubjects}
            allChapters={allChapters}
            onSelectCourse={handleSelectCourse}
            onAddSubject={() => setShowAddSubjectModal(true)}
            onEditCourse={handleOpenEditModal}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Floating Action Button (FAB) on Mobile List View */}
      {activeMobileView === 'courses' && (
        <button
          type="button"
          className="cm-mobile-fab"
          onClick={() => setShowCreateModal(true)}
          title="Create New Course Workspace"
          aria-label="Create Course"
        >
          <AppIcon name="add" size={22} />
        </button>
      )}

      {/* Create Course Modal / Bottom Sheet */}
      <CreateCourseModal
        isOpen={showCreateModal}
        onSubmit={handleCreateCourse}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Course Modal / Bottom Sheet */}
      {editModal.open && editModal.course && (
        <EditCourseModal
          course={editModal.course}
          onSubmit={handleSaveCourseEdit}
          onClose={() => setEditModal({ open: false, course: null })}
        />
      )}

      {/* Mobile Course Action Sheet */}
      <CourseActionSheet
        isOpen={actionSheet.open}
        course={actionSheet.course}
        onClose={() => setActionSheet({ open: false, course: null })}
        onSelect={handleSelectCourse}
        onEdit={handleOpenEditModal}
        onAddSubject={() => setShowAddSubjectModal(true)}
        onAction={handleOpenActionModal}
        onNavigate={onNavigate}
      />

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
