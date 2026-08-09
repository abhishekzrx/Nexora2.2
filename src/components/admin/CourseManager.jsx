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
  createWorkspace,
  renameWorkspace,
  duplicateWorkspace,
  archiveWorkspace,
  activateWorkspace,
  publishWorkspace,
  unpublishWorkspace,
  deleteWorkspace,
  setActiveWorkspace,
} from '../../data/workspaceStore'
import { useAdminStore, addSubject } from '../../data/adminStore'
import { showToast, showConfirm, dismissConfirm } from '../../data/feedbackStore'
import { courseService } from '../../services/courseService'
import { subjectService } from '../../services/subjectService'
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
  const [status, setStatus] = useState('draft')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name, description, status })
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
          <label className="cm-label">Course Name</label>
          <input
            type="text"
            className="cm-input"
            placeholder="e.g., GATE 2026 – Mechanical Engineering"
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
          <label className="cm-label">Publishing Status</label>
          <select className="cm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="cm-form-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Create Course
          </Button>
        </div>
      </form>
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), desc: desc.trim(), icon, color, status })
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

/* ── Compact Name-Only Course List Row ─────────────────────────── */
function CourseListItem({
  course,
  isSelected,
  onSelect,
  onRename,
  onDuplicate,
  onArchive,
  onActivate,
  onPublish,
  onUnpublish,
  onDelete,
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

  const handleRename = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    const newName = prompt('Enter new course name:', course.name)
    if (newName && newName.trim() && newName.trim() !== course.name) {
      onRename(course.id, newName.trim())
      showToast({ type: 'success', title: 'Renamed', message: `Course renamed to "${newName.trim()}".` })
    }
  }

  const handleDuplicate = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    onDuplicate(course.id)
    showToast({ type: 'success', title: 'Duplicated', message: `Copy of "${course.name}" created.` })
  }

  const handleToggleArchive = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    if (course.status === 'archived') {
      onActivate(course.id)
      showToast({ type: 'success', title: 'Activated', message: `"${course.name}" activated.` })
    } else {
      onArchive(course.id)
      showToast({ type: 'info', title: 'Archived', message: `"${course.name}" archived.` })
    }
  }

  const handleTogglePublish = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    if (course.published || course.status === 'published') {
      onUnpublish(course.id)
      showToast({ type: 'info', title: 'Unpublished', message: `"${course.name}" set to draft.` })
    } else {
      onPublish(course.id)
      showToast({ type: 'success', title: 'Published', message: `"${course.name}" published.` })
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    showConfirm({
      title: `Delete Course "${course.name}"?`,
      message: 'This will permanently remove this course workspace.',
      onConfirm: () => {
        onDelete(course.id)
        showToast({ type: 'success', title: 'Deleted', message: `"${course.name}" deleted.` })
        dismissConfirm()
      },
      onCancel: dismissConfirm,
    })
  }

  return (
    <div
      className={`cm-course-list-row${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(course.id)}
    >
      <div className="cm-row-left">
        <span
          className="cm-row-icon-badge"
          style={{ background: course.themeColor || (course.status === 'draft' ? '#7C3AED' : '#F1621B') }}
        >
          <AppIcon name={course.icon || 'folder'} size={15} />
        </span>
        <span className="cm-row-title" title={course.name}>
          {course.name}
        </span>
      </div>

      <div className="cm-row-right" onClick={(e) => e.stopPropagation()}>
        <StatusBadge status={course.status || 'draft'} />

        <div className="cm-action-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="cm-three-dots-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Course Actions"
          >
            <AppIcon name="moreVert" size={15} />
          </button>

          {showMenu && (
            <div className="cm-dropdown">
              <button type="button" onClick={handleRename}>
                <AppIcon name="edit" size={14} /> Rename
              </button>
              <button type="button" onClick={handleDuplicate}>
                <AppIcon name="copy" size={14} /> Duplicate
              </button>
              <button type="button" onClick={handleTogglePublish}>
                <AppIcon name={course.published ? 'unpublish' : 'publish'} size={14} />
                {course.published || course.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" onClick={handleToggleArchive}>
                <AppIcon name={course.status === 'archived' ? 'check' : 'lock'} size={14} />
                {course.status === 'archived' ? 'Activate' : 'Archive'}
              </button>
              <button type="button" className="danger" onClick={handleDelete}>
                <AppIcon name="delete" size={14} /> Delete
              </button>
            </div>
          )}
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
            <div className="cm-panel-sub">
              Updated {selectedCourse.updatedAt ? new Date(selectedCourse.updatedAt).toISOString().split('T')[0] : '2025-07-28'}
            </div>
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

          {/* Content Breakdown Graph */}
          <div className="cm-chart-block">
            <h4 className="cm-block-title">Content Breakdown Graph</h4>
            <div className="cm-bar-chart-container">
              <svg viewBox="0 0 340 140" className="cm-bar-svg">
                <line x1="30" y1="15" x2="330" y2="15" stroke="#EAECF0" strokeDasharray="3 3" />
                <text x="22" y="18" textAnchor="end" className="cm-axis-text">100</text>
                <line x1="30" y1="65" x2="330" y2="65" stroke="#EAECF0" strokeDasharray="3 3" />
                <text x="22" y="68" textAnchor="end" className="cm-axis-text">50</text>
                <line x1="30" y1="115" x2="330" y2="115" stroke="#EAECF0" />
                <text x="22" y="118" textAnchor="end" className="cm-axis-text">0</text>

                {/* Bars */}
                {[
                  { label: 'Subjects', val: stats.subjects, color: '#F1621B', x: 55 },
                  { label: 'Chapters', val: stats.chapters, color: '#2E5CE6', x: 125 },
                  { label: 'MCQs', val: stats.mcqs, color: '#12B76A', x: 195 },
                  { label: 'Flashcards', val: stats.flashcards, color: '#7C3AED', x: 265 },
                ].map((b) => {
                  const h = Math.max(5, Math.round((b.val / Math.max(maxVal, 150)) * barMaxH))
                  const y = 115 - h
                  return (
                    <g key={b.label}>
                      <rect x={b.x} y={y} width="28" height={h} rx="4" fill={b.color} />
                      <text x={b.x + 14} y={y - 5} textAnchor="middle" className="cm-val-badge">
                        {b.val}
                      </text>
                      <text x={b.x + 14} y="132" textAnchor="middle" className="cm-label-text">
                        {b.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Distribution */}
      {activeTab === 'distribution' && (
        <div className="cm-tab-content">
          <div className="cm-donut-wrapper">
            <div className="cm-donut-svg-block">
              <svg viewBox="0 0 120 120" className="cm-donut-svg">
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="transparent"
                  stroke="#12B76A"
                  strokeWidth="12"
                  strokeDasharray={`${chStroke} ${c - chStroke}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="transparent"
                  stroke="#2E5CE6"
                  strokeWidth="12"
                  strokeDasharray={`${mcqStroke} ${c - mcqStroke}`}
                  strokeDashoffset={`-${chStroke}`}
                />
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="transparent"
                  stroke="#7C3AED"
                  strokeWidth="12"
                  strokeDasharray={`${flashStroke} ${c - flashStroke}`}
                  strokeDashoffset={`-${chStroke + mcqStroke}`}
                />
              </svg>
              <div className="cm-donut-center">
                <span className="cm-donut-num">{totalContent}</span>
                <span className="cm-donut-label">Total Content</span>
              </div>
            </div>

            <div className="cm-donut-legend-list">
              <div className="cm-legend-row">
                <span className="cm-legend-dot" style={{ background: '#12B76A' }} />
                <span className="cm-legend-name">Chapters</span>
                <span className="cm-legend-count">{stats.chapters}</span>
                <span className="cm-legend-pct">{chapterPct}%</span>
              </div>
              <div className="cm-legend-row">
                <span className="cm-legend-dot" style={{ background: '#2E5CE6' }} />
                <span className="cm-legend-name">MCQs</span>
                <span className="cm-legend-count">{stats.mcqs}</span>
                <span className="cm-legend-pct">{mcqPct}%</span>
              </div>
              <div className="cm-legend-row">
                <span className="cm-legend-dot" style={{ background: '#7C3AED' }} />
                <span className="cm-legend-name">Flashcards</span>
                <span className="cm-legend-count">{stats.flashcards}</span>
                <span className="cm-legend-pct">{flashcardPct}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Activity */}
      {activeTab === 'activity' && (
        <div className="cm-tab-content">
          <div className="cm-activity-list">
            <div className="cm-activity-item">
              <span className="cm-act-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                <AppIcon name="help" size={13} />
              </span>
              <div>
                <div className="cm-act-title">{stats.mcqs} MCQs active</div>
                <div className="cm-act-sub">Available in question repository</div>
              </div>
            </div>
            <div className="cm-activity-item">
              <span className="cm-act-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                <AppIcon name="document" size={13} />
              </span>
              <div>
                <div className="cm-act-title">{stats.chapters} Chapters published</div>
                <div className="cm-act-sub">Organized across {stats.subjects} subjects</div>
              </div>
            </div>
            <div className="cm-activity-item">
              <span className="cm-act-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="flashcardsTab" size={13} />
              </span>
              <div>
                <div className="cm-act-title">{stats.flashcards} Flashcards generated</div>
                <div className="cm-act-sub">Ready for review</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Readiness */}
      <div className="cm-readiness-section">
        <h4 className="cm-block-title">Content Readiness</h4>
        <div className="cm-readiness-body">
          <div className="cm-gauge-box">
            <svg viewBox="0 0 140 75" className="cm-readiness-gauge-svg">
              <path d="M 12 70 A 58 58 0 0 1 128 70" fill="none" stroke="#EAECF0" strokeWidth="12" strokeLinecap="round" />
              <path
                d="M 12 70 A 58 58 0 0 1 128 70"
                fill="none"
                stroke="url(#cmGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="182"
                strokeDashoffset={182 - (readinessScore / 100) * 182}
              />
              <defs>
                <linearGradient id="cmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F1621B" />
                  <stop offset="100%" stopColor="#12B76A" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cm-gauge-center">
              <span className="cm-gauge-num">{readinessScore}%</span>
              <span className="cm-gauge-label">Ready</span>
            </div>
          </div>

          <div className="cm-readiness-checklist">
            <div className="cm-check-row">
              <span className="cm-check-mark">✓</span>
              <span className="cm-check-name">Subjects</span>
              <span className="cm-check-val">{stats.subjects}/4</span>
            </div>
            <div className="cm-check-row">
              <span className="cm-check-mark">✓</span>
              <span className="cm-check-name">Chapters</span>
              <span className="cm-check-val">{stats.chapters}/25</span>
            </div>
            <div className="cm-check-row">
              <span className="cm-check-mark alert">⚠</span>
              <span className="cm-check-name">MCQs</span>
              <span className="cm-check-val">{stats.mcqs}/500</span>
            </div>
            <div className="cm-check-row">
              <span className="cm-check-mark">✓</span>
              <span className="cm-check-name">Flashcards</span>
              <span className="cm-check-val">{stats.flashcards}/200</span>
            </div>
          </div>
        </div>

        <div className="cm-readiness-banner">
          <AppIcon name="target" size={14} />
          <span>⚡ Great progress! Course is {readinessScore}% ready.</span>
        </div>
      </div>

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

  // Handlers
  const handleCreateCourse = async (values) => {
    try {
      const res = await courseService.createCourse({ name: values.name.trim(), description: values.description.trim(), status: values.status })
      if (res.success && res.data) {
        const course = res.data
        setActiveWorkspace(course.id)
        setSelectedCourseId(course.id)
        setShowCreate(false)
        showToast({ type: 'success', title: 'Course Created', message: `Workspace "${course.name}" created.` })
      } else {
        showToast({ type: 'error', title: 'Error', message: res.error || 'Unable to create course.' })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Unable to create course.' })
    }
  }

  const handleCreateSubjectUnderSelected = async (data) => {
    if (!selectedCourse) return
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
      } else {
        showToast({ type: 'error', title: 'Error', message: res.error || 'Unable to add subject.' })
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message || 'Unable to add subject.' })
    }
  }

  const handleSelectCourse = (id) => {
    setSelectedCourseId(id)
    setActiveWorkspace(id)
  }

  return (
    <div className="cm-workspace-shell">
      {/* Two-Column Main Workspace Grid (Left 60%, Right 40%) */}
      <div className="cm-main-workspace-grid">
        {/* LEFT WORKSPACE (60% width): 8 Stat Cards + Search/Filter Toolbar + Course List */}
        <div className="cm-course-list-col">
          {/* 8 Stat Cards Grid (2 rows x 4 columns) */}
          <div className="cm-stats-grid-8">
            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                <AppIcon name="folder" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.totalCourses}</div>
              <div className="cm-stat-mini-lbl">Total</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                <AppIcon name="check" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.published}</div>
              <div className="cm-stat-mini-lbl">Published</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                <AppIcon name="edit" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.draft}</div>
              <div className="cm-stat-mini-lbl">Draft</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="lock" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.archived}</div>
              <div className="cm-stat-mini-lbl">Archived</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                <AppIcon name="chapters" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.subjects}</div>
              <div className="cm-stat-mini-lbl">Subjects</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#E6F7F7', color: '#0E9494' }}>
                <AppIcon name="document" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.chapters}</div>
              <div className="cm-stat-mini-lbl">Chapters</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                <AppIcon name="help" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.mcqs}</div>
              <div className="cm-stat-mini-lbl">MCQs</div>
            </div>

            <div className="cm-stat-card-compact">
              <span className="cm-stat-mini-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                <AppIcon name="flashcardsTab" size={14} />
              </span>
              <div className="cm-stat-val-bold">{globalKpis.flashcards}</div>
              <div className="cm-stat-mini-lbl">Flashcards</div>
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
                  onRename={renameWorkspace}
                  onDuplicate={duplicateWorkspace}
                  onArchive={archiveWorkspace}
                  onActivate={activateWorkspace}
                  onPublish={publishWorkspace}
                  onUnpublish={unpublishWorkspace}
                  onDelete={deleteWorkspace}
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
                  Manage all learning courses, their content and publishing status
                </p>
              </div>
            </div>

            <Button variant="primary" size="sm" className="cm-create-course-btn" onClick={() => setShowCreate(!showCreate)}>
              <AppIcon name="add" size={14} /> + Create Course
            </Button>
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
