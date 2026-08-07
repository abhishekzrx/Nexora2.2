/**
 * LearningWorkspaceManager
 * Complete Course Management System — the foundation of Nexora's LMS.
 * Each Course represents one complete and independent learning
 * ecosystem with fully isolated containers.
 *
 * All CRUD operations update local state immediately via the
 * centralized workspaceStore. Ready for Sprint 2 Supabase
 * integration without UI changes.
 */
import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useWorkspaceStore,
  createWorkspace,
  editWorkspace,
  renameWorkspace,
  duplicateWorkspace,
  archiveWorkspace,
  activateWorkspace,
  deactivateWorkspace,
  publishWorkspace,
  unpublishWorkspace,
  deleteWorkspace,
  reorderWorkspaces,
  setActiveWorkspace,
} from '../../data/workspaceStore'

// ── Status meta ───────────────────────────────────────────────────
const STATUS_META = {
  active: { label: 'Active', tone: 'green', icon: 'check' },
  inactive: { label: 'Inactive', tone: 'gray', icon: 'pause' },
  draft: { label: 'Draft', tone: 'orange', icon: 'edit' },
  archived: { label: 'Archived', tone: 'red', icon: 'lock' },
}

// ── Health tone ───────────────────────────────────────────────────
function healthTone(score) {
  if (score >= 80) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

// ── Theme color presets ───────────────────────────────────────────
const THEME_COLORS = [
  { value: '#F1621B', label: 'Orange' },
  { value: '#2E5CE6', label: 'Blue' },
  { value: '#12B76A', label: 'Green' },
  { value: '#7C3AED', label: 'Purple' },
  { value: '#F04438', label: 'Red' },
  { value: '#0E9494', label: 'Teal' },
]

// ── Icon presets ──────────────────────────────────────────────────
const ICON_OPTIONS = [
  { value: 'adminDashboard', label: 'Dashboard' },
  { value: 'computer', label: 'Computer' },
  { value: 'computerNetworks', label: 'Networks' },
  { value: 'physics', label: 'Physics' },
  { value: 'target', label: 'Target' },
  { value: 'school', label: 'School' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'bookmark', label: 'Bookmark' },
]

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span className={`ws-status-badge tone-${meta.tone}`}>
      <AppIcon name={meta.icon} size={10} />
      {meta.label}
    </span>
  )
}

// ── Version Badge ─────────────────────────────────────────────────
function VersionBadge({ version }) {
  return (
    <span className="ws-version-badge">
      <AppIcon name="refresh" size={10} />
      {version || 'v1.0'}
    </span>
  )
}

// ── Health Badge ──────────────────────────────────────────────────
function HealthBadge({ score }) {
  const tone = healthTone(score)
  return (
    <span className={`ws-health-badge tone-${tone}`}>
      <AppIcon name="check" size={10} />
      {score}%
    </span>
  )
}

// ── Stat Tile ─────────────────────────────────────────────────────
function StatTile({ icon, label, value, tone = 'orange' }) {
  return (
    <div className="ws-stat-tile">
      <span className={`ws-stat-icon tone-${tone}`}>
        <AppIcon name={icon} size={13} />
      </span>
      <div className="ws-stat-body">
        <span className="ws-stat-value">{value}</span>
        <span className="ws-stat-label">{label}</span>
      </div>
    </div>
  )
}

// ── Container Overview ────────────────────────────────────────────
function ContainerOverview({ course }) {
  const containers = [
    { icon: 'chapters', label: 'Subjects', value: course.metadata?.subjects || 0 },
    { icon: 'document', label: 'Chapters', value: course.metadata?.chapters || 0 },
    { icon: 'quiz', label: 'MCQs', value: course.metadata?.mcqs || 0 },
    { icon: 'flashcardsTab', label: 'Flashcards', value: course.metadata?.flashcards || 0 },
    { icon: 'notes', label: 'Notes', value: course.metadata?.notes || 0 },
    { icon: 'target', label: 'Mock Tests', value: course.mockTests?.length || 0 },
    { icon: 'trendingUp', label: 'Analytics', value: course.analytics?.totalAttempts || 0 },
    { icon: 'bookmark', label: 'Bookmarks', value: course.bookmarks?.length || 0 },
    { icon: 'folder', label: 'Downloads', value: course.downloads?.length || 0 },
    { icon: 'aiCoach', label: 'AI Plan', value: course.aiStudyPlan?.generated ? 'Ready' : '—' },
    { icon: 'school', label: 'Enrolled', value: course.studentProgress?.enrolled || 0 },
  ]

  return (
    <div className="ws-containers">
      {containers.map((c) => (
        <div key={c.label} className="ws-container-chip">
          <span className="ws-container-icon">
            <AppIcon name={c.icon} size={13} />
          </span>
          <span className="ws-container-label">{c.label}</span>
          <span className="ws-container-value">{c.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Workspace Summary Card ────────────────────────────────────────
function WorkspaceCard({ workspace, isActive, onEdit, onRename, onDuplicate, onArchive, onActivate, onDeactivate, onPublish, onUnpublish, onDelete, onReorderUp, onReorderDown }) {
  const iconStyle = workspace.themeColor ? { '--ws-icon-color': workspace.themeColor } : {}

  return (
    <div className={`ws-card${isActive ? ' ws-card-active' : ''}`}>
      {/* Reorder handles */}
      <div className="ws-card-reorder">
        <button type="button" className="ws-reorder-btn" onClick={onReorderUp} aria-label="Move up">
          <AppIcon name="arrowUp" size={14} />
        </button>
        <button type="button" className="ws-reorder-btn" onClick={onReorderDown} aria-label="Move down">
          <AppIcon name="arrowDown" size={14} />
        </button>
      </div>

      {/* Card header */}
      <div className="ws-card-header">
        <div className="ws-card-icon-wrap" style={iconStyle}>
          <AppIcon name={workspace.icon} size={20} />
        </div>
        <div className="ws-card-titles">
          <div className="ws-card-name">{workspace.name}</div>
          <div className="ws-card-badges">
            <StatusBadge status={workspace.status} />
            {workspace.published ? (
              <span className="ws-published-badge">
                <AppIcon name="check" size={10} />
                Published
              </span>
            ) : null}
            <VersionBadge version={workspace.version} />
          </div>
          <div className="ws-card-desc">{workspace.description}</div>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="ws-card-meta">
        <StatTile icon="chapters" label="Subjects" value={workspace.metadata?.subjects ?? 0} tone="blue" />
        <StatTile icon="document" label="Chapters" value={workspace.metadata?.chapters ?? 0} tone="purple" />
        <StatTile icon="quiz" label="MCQs" value={workspace.metadata?.mcqs ?? 0} tone="orange" />
        <StatTile icon="flashcardsTab" label="Flashcards" value={workspace.metadata?.flashcards ?? 0} tone="purple" />
        <StatTile icon="notes" label="Notes" value={workspace.metadata?.notes ?? 0} tone="blue" />
        <StatTile icon="clock" label="Completion" value={`${workspace.metadata?.completion ?? 0}%`} tone="green" />
      </div>

      {/* Isolated Containers Overview */}
      <div className="ws-containers-section">
        <div className="ws-containers-title">
          <AppIcon name="folder" size={12} />
          Isolated Course Containers
        </div>
        <ContainerOverview course={workspace} />
      </div>

      {/* Health bar */}
      <div className="ws-card-health">
        <div className="ws-card-health-head">
          <span className="ws-card-health-label">Content Health</span>
          <HealthBadge score={workspace.metadata?.health ?? 0} />
        </div>
        <div className="ws-card-health-track">
          <div
            className="ws-card-health-fill"
            style={{ width: `${workspace.metadata?.health ?? 0}%`, background: workspace.themeColor || '#F1621B' }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="ws-card-dates">
        <span>Created {workspace.createdAt}</span>
        <span>Rev {workspace.audit?.revision || 1}</span>
        <span>Updated {workspace.lastUpdated}</span>
      </div>

      {/* Actions */}
      <div className="ws-card-actions">
        <div className="ws-card-actions-left">
          <button type="button" className="ws-action-btn soft" onClick={onEdit} aria-label="Edit course">
            <AppIcon name="edit" size={14} />
            Edit
          </button>
          <button type="button" className="ws-action-btn soft" onClick={onDuplicate} aria-label="Duplicate">
            <AppIcon name="copy" size={14} />
            Duplicate
          </button>
          <button type="button" className="ws-action-btn soft" onClick={onRename} aria-label="Rename">
            <AppIcon name="bookmark" size={14} />
            Rename
          </button>
        </div>
        <div className="ws-card-actions-right">
          {!workspace.published && workspace.status !== 'archived' ? (
            <button type="button" className="ws-action-btn success" onClick={onPublish} aria-label="Publish course">
              <AppIcon name="check" size={14} />
              Publish
            </button>
          ) : null}
          {workspace.published ? (
            <button type="button" className="ws-action-btn warn" onClick={onUnpublish} aria-label="Unpublish course">
              <AppIcon name="pause" size={14} />
              Unpublish
            </button>
          ) : null}
          {workspace.status === 'active' ? (
            <button type="button" className="ws-action-btn warn" onClick={onDeactivate} aria-label="Deactivate">
              <AppIcon name="pause" size={14} />
              Deactivate
            </button>
          ) : null}
          {workspace.status === 'inactive' || workspace.status === 'draft' ? (
            <button type="button" className="ws-action-btn success" onClick={onActivate} aria-label="Activate">
              <AppIcon name="check" size={14} />
              Activate
            </button>
          ) : null}
          {workspace.status !== 'archived' ? (
            <button type="button" className="ws-action-btn warn" onClick={onArchive} aria-label="Archive">
              <AppIcon name="lock" size={14} />
              Archive
            </button>
          ) : null}
          <button type="button" className="ws-action-btn danger" onClick={onDelete} aria-label="Delete">
            <AppIcon name="delete" size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Workspace Explorer Item ───────────────────────────────────────
function ExplorerItem({ workspace, isSelected, onSelect, onSetActive }) {
  const meta = STATUS_META[workspace.status] || STATUS_META.draft
  const iconStyle = workspace.themeColor ? { '--ws-icon-color': workspace.themeColor } : {}

  return (
    <div
      className={`ws-explorer-item${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(workspace)}
    >
      <div className="ws-explorer-icon-wrap" style={iconStyle}>
        <AppIcon name={workspace.icon} size={16} />
      </div>
      <div className="ws-explorer-body">
        <div className="ws-explorer-name">
          {workspace.name}
          {workspace.published ? (
            <span className="ws-explorer-published">
              <AppIcon name="check" size={9} />
            </span>
          ) : null}
        </div>
        <div className="ws-explorer-meta">
          <span className={`ws-explorer-status tone-${meta.tone}`}>
            <AppIcon name={meta.icon} size={9} />
            {meta.label}
          </span>
          <span className="ws-explorer-count">{workspace.metadata?.subjects ?? 0} subjects</span>
        </div>
      </div>
      <button
        type="button"
        className={`ws-explorer-set-active${isSelected ? ' is-active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSetActive(workspace.id) }}
        aria-label={isSelected ? 'Active course' : 'Set as active'}
        title={isSelected ? 'Active course' : 'Set as active course'}
      >
        <AppIcon name={isSelected ? 'check' : 'target'} size={14} />
      </button>
    </div>
  )
}

// ── Create/Edit Course Form (Bootstrap Engine) ────────────────────
function CourseForm({ initial, onSubmit, onCancel, title, submitLabel }) {
  const [values, setValues] = useState({
    name: initial?.name || '',
    icon: initial?.icon || 'adminDashboard',
    themeColor: initial?.themeColor || '#F1621B',
    description: initial?.description || '',
    status: initial?.status || 'draft',
  })

  const set = (key) => (e) => setValues({ ...values, [key]: e.target.value })

  const handleSubmit = () => {
    if (!values.name.trim()) return
    onSubmit(values)
  }

  return (
    <div className="ws-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="ws-form-card">
        <div className="ws-form-title">{title}</div>

        <div className="ws-form-field">
          <label className="ws-form-label">Course Name</label>
          <input
            type="text"
            className="ws-form-input"
            placeholder="e.g., BPSC TRE 4.0 – Computer Science"
            value={values.name}
            onChange={set('name')}
            autoFocus
          />
        </div>

        <div className="ws-form-field">
          <label className="ws-form-label">Description</label>
          <input
            type="text"
            className="ws-form-input"
            placeholder="Brief description of this course"
            value={values.description}
            onChange={set('description')}
          />
        </div>

        <div className="ws-form-row">
          <div className="ws-form-field">
            <label className="ws-form-label">Icon</label>
            <select className="ws-form-select" value={values.icon} onChange={set('icon')}>
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="ws-form-field">
            <label className="ws-form-label">Theme Color</label>
            <div className="ws-form-colors">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`ws-form-color-btn${values.themeColor === c.value ? ' selected' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setValues({ ...values, themeColor: c.value })}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="ws-form-field">
          <label className="ws-form-label">Status</label>
          <select className="ws-form-select" value={values.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="ws-form-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!values.name.trim()}>
            <AppIcon name="add" size={14} />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Rename Dialog ─────────────────────────────────────────────────
function RenameDialog({ currentName, onSubmit, onCancel }) {
  const [name, setName] = useState(currentName || '')

  return (
    <div className="ws-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="ws-form-card ws-form-card-sm">
        <div className="ws-form-title">Rename Course</div>
        <div className="ws-form-field">
          <label className="ws-form-label">Course Name</label>
          <input
            type="text"
            className="ws-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="ws-form-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSubmit(name)} disabled={!name.trim()}>
            Rename
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="ws-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="ws-form-card ws-form-card-sm">
        <div className="ws-form-title">{title}</div>
        <p className="ws-confirm-message">{message}</p>
        <div className="ws-form-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────
function EmptyCourseState({ onCreate }) {
  return (
    <div className="ws-empty">
      <div className="ws-empty-art" aria-hidden="true">
        <AppIcon name="adminDashboard" size={38} />
        <span className="ws-empty-spark">✦</span>
      </div>
      <div className="ws-empty-title">No Courses Created</div>
      <div className="ws-empty-sub">
        Create your first course and Nexora will automatically generate a complete isolated learning workspace.
      </div>
      <Button variant="primary" onClick={onCreate}>
        <AppIcon name="add" size={16} />
        Create Your First Course
      </Button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
function LearningWorkspaceManager({ onBack }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const [selectedId, setSelectedId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')

  // Sort by order
  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => a.order - b.order),
    [workspaces],
  )

  // Filter by search
  const filteredWorkspaces = useMemo(() => {
    if (!search.trim()) return sortedWorkspaces
    const q = search.toLowerCase()
    return sortedWorkspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.status.includes(q),
    )
  }, [sortedWorkspaces, search])

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId) || null

  // ── Handlers ────────────────────────────────────────────────────
  const handleCreate = (values) => {
    createWorkspace(values)
    setShowCreateForm(false)
  }

  const handleEdit = (values) => {
    if (editTarget) {
      editWorkspace(editTarget.id, values)
      setEditTarget(null)
    }
  }

  const handleRename = (name) => {
    if (renameTarget) {
      renameWorkspace(renameTarget.id, name)
      setRenameTarget(null)
    }
  }

  const handleDelete = () => {
    if (confirmDelete) {
      deleteWorkspace(confirmDelete.id)
      setConfirmDelete(null)
      if (selectedId === confirmDelete.id) setSelectedId(null)
    }
  }

  const handleReorder = (id, direction) => {
    const sorted = sortedWorkspaces
    const idx = sorted.findIndex((w) => w.id === id)
    if (direction === 'up' && idx > 0) {
      const ids = sorted.map((w) => w.id)
      ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
      reorderWorkspaces(ids)
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const ids = sorted.map((w) => w.id)
      ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
      reorderWorkspaces(ids)
    }
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="ws-header">
        <div className="ws-header-left">
          <button type="button" className="ws-back-btn" onClick={onBack} aria-label="Go back">
            <AppIcon name="back" size={20} />
          </button>
          <div className="ws-header-title">Course Manager</div>
        </div>
        <div className="ws-header-right">
          <div className="avatar" aria-hidden="true">
            <AppIcon name="profile" size={20} />
          </div>
        </div>
      </div>

      {/* ── Active Course Banner ────────────────────────────────── */}
      <div className="ws-active-banner">
        <span className="ws-active-label">Active Course</span>
        <span className="ws-active-name">
          {workspaces.find((w) => w.id === activeWorkspaceId)?.name || 'None selected'}
        </span>
        <span className="ws-active-hint">Workspace</span>
      </div>

      {/* ── Search + Create ─────────────────────────────────────── */}
      <div className="ws-toolbar">
        <div className="ws-search">
          <AppIcon name="search" size={15} />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" className="ws-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <AppIcon name="close" size={14} />
            </button>
          ) : null}
        </div>
        <button type="button" className="ws-create-btn" onClick={() => setShowCreateForm(true)}>
          <AppIcon name="add" size={16} />
          Create Course
        </button>
      </div>

      {/* ── Course Explorer ─────────────────────────────────────── */}
      {filteredWorkspaces.length > 0 ? (
        <div className="ws-explorer">
          <div className="ws-explorer-head">
            <span className="ws-explorer-title">
              <AppIcon name="adminDashboard" size={14} />
              Courses ({filteredWorkspaces.length})
            </span>
          </div>
          <div className="ws-explorer-list">
            {filteredWorkspaces.map((ws) => (
              <ExplorerItem
                key={ws.id}
                workspace={ws}
                isSelected={ws.id === activeWorkspaceId}
                onSelect={(w) => setSelectedId(w.id === selectedId ? null : w.id)}
                onSetActive={setActiveWorkspace}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyCourseState onCreate={() => setShowCreateForm(true)} />
      )}

      {/* ── Selected Course Card ────────────────────────────────── */}
      {selectedWorkspace ? (
        <div className="ws-detail">
          <div className="ws-detail-head">
            <span className="ws-detail-title">
              <AppIcon name="adminDashboard" size={14} />
              Course Summary
            </span>
          </div>
          <WorkspaceCard
            workspace={selectedWorkspace}
            isActive={selectedWorkspace.id === activeWorkspaceId}
            onEdit={() => setEditTarget(selectedWorkspace)}
            onRename={() => setRenameTarget(selectedWorkspace)}
            onDuplicate={() => duplicateWorkspace(selectedWorkspace.id)}
            onArchive={() => archiveWorkspace(selectedWorkspace.id)}
            onActivate={() => activateWorkspace(selectedWorkspace.id)}
            onDeactivate={() => deactivateWorkspace(selectedWorkspace.id)}
            onPublish={() => publishWorkspace(selectedWorkspace.id)}
            onUnpublish={() => unpublishWorkspace(selectedWorkspace.id)}
            onDelete={() => setConfirmDelete(selectedWorkspace)}
            onReorderUp={() => handleReorder(selectedWorkspace.id, 'up')}
            onReorderDown={() => handleReorder(selectedWorkspace.id, 'down')}
          />

          {/* ── Empty Course Workspace Guidance ─────────────────── */}
          {(selectedWorkspace.metadata?.subjects ?? 0) === 0 ? (
            <div className="ws-empty-guidance">
              <button type="button" className="ws-guidance-btn">
                <span className="ws-guidance-icon">
                  <AppIcon name="chapters" size={13} />
                </span>
                Create Subject
              </button>
              <button type="button" className="ws-guidance-btn">
                <span className="ws-guidance-icon">
                  <AppIcon name="quiz" size={13} />
                </span>
                Generate MCQs
              </button>
              <button type="button" className="ws-guidance-btn">
                <span className="ws-guidance-icon">
                  <AppIcon name="upload" size={13} />
                </span>
                Import Content
              </button>
              <button type="button" className="ws-guidance-btn">
                <span className="ws-guidance-icon">
                  <AppIcon name="flashcardsTab" size={13} />
                </span>
                Create Flashcards
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Create Course Form ──────────────────────────────────── */}
      {showCreateForm ? (
        <CourseForm
          title="Create Course"
          submitLabel="Create Course"
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : null}

      {/* ── Edit Course Form ────────────────────────────────────── */}
      {editTarget ? (
        <CourseForm
          title="Edit Course"
          submitLabel="Save Changes"
          initial={editTarget}
          onSubmit={handleEdit}
          onCancel={() => setEditTarget(null)}
        />
      ) : null}

      {/* ── Rename Dialog ───────────────────────────────────────── */}
      {renameTarget ? (
        <RenameDialog
          currentName={renameTarget.name}
          onSubmit={handleRename}
          onCancel={() => setRenameTarget(null)}
        />
      ) : null}

      {/* ── Confirm Delete Dialog ───────────────────────────────── */}
      {confirmDelete ? (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          message="This action cannot be undone. All content associated with this course will be removed."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </>
  )
}

export default LearningWorkspaceManager