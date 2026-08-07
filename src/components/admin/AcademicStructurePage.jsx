/**
 * AcademicStructurePage
 * Academic Structure Management — the core CMS for Nexora.
 * Left: collapsible hierarchy tree (Exam → Class → Subject → Chapter)
 * Right: context workspace with management tools for the selected node.
 * Local/mock only. All icons go through AppIcon.
 */
import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import {
  useAcademicStore,
  computeHealth,
  computeStats,
  addExamination,
  updateExamination,
  deleteExamination,
  duplicateExamination,
  addClass,
  updateClass,
  deleteClass,
  duplicateClass,
  addSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject,
  addChapter,
  updateChapter,
  deleteChapter,
  duplicateChapter,
  bulkUpdateClasses,
  bulkUpdateSubjects,
  bulkUpdateChapters,
  getChapterContext,
} from '../../data/academicStore'

// ── Small shared UI ───────────────────────────────────────────────
function HealthBadge({ score }) {
  const tone = score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red'
  return <span className={`acad-health-badge tone-${tone}`}><AppIcon name="check" size={11} />{score}%</span>
}

function StatusPill({ status }) {
  const map = {
    active: { label: 'Active', tone: 'green' },
    inactive: { label: 'Inactive', tone: 'gray' },
    draft: { label: 'Draft', tone: 'orange' },
    published: { label: 'Published', tone: 'green' },
    locked: { label: 'Locked', tone: 'red' },
    archived: { label: 'Archived', tone: 'gray' },
  }
  const cfg = map[status] || map.active
  return <span className={`acad-status-pill tone-${cfg.tone}`}>{cfg.label}</span>
}

function SectionHeader({ icon, title, action }) {
  return (
    <div className="acad-section-header">
      <span className="acad-section-title">
        <AppIcon name={icon} size={15} />
        {title}
      </span>
      {action}
    </div>
  )
}

function EmptyState({ icon, title, actionLabel, onAction }) {
  return (
    <div className="acad-empty">
      <AppIcon name={icon} size={28} />
      <p>{title}</p>
      {actionLabel ? (
        <Button variant="primary" onClick={onAction}><AppIcon name="add" size={14} />{actionLabel}</Button>
      ) : null}
    </div>
  )
}

function StatTile({ icon, label, value, tone = 'orange' }) {
  return (
    <div className="acad-stat-tile">
      <span className={`acad-stat-icon tone-${tone}`}><AppIcon name={icon} size={15} /></span>
      <div className="acad-stat-body">
        <span className="acad-stat-value">{value}</span>
        <span className="acad-stat-label">{label}</span>
      </div>
    </div>
  )
}

// ── Premium Summary Card ──────────────────────────────────────────
function SummaryCard({ type, label, meta, healthScore, onAdd }) {
  const toneMap = { exam: 'orange', class: 'blue', subject: 'green', chapter: 'purple' }
  const iconMap = { exam: 'adminDashboard', class: 'school', subject: 'chapters', chapter: 'document' }
  const addLabelMap = { exam: 'Class', class: 'Subject', subject: 'Chapter', chapter: 'Content' }
  return (
    <div className="acad-summary-card">
      <div className="acad-summary-top">
        <span className={`acad-summary-icon tone-${toneMap[type] || 'orange'}`}>
          <AppIcon name={iconMap[type] || 'adminDashboard'} size={18} />
        </span>
        <div className="acad-summary-head">
          <span className="acad-summary-type">{type}</span>
          <span className="acad-summary-name">{label}</span>
        </div>
        <div className="acad-summary-health">
          <span className="acad-summary-health-label">Health</span>
          <span className={`acad-summary-health-value tone-${healthScore >= 80 ? 'green' : healthScore >= 50 ? 'orange' : 'red'}`}>{healthScore}%</span>
        </div>
      </div>
      <div className="acad-summary-meta">
        {meta.map((m) => (
          <div key={m.label} className="acad-summary-meta-item">
            <AppIcon name={m.icon} size={13} />
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
      {onAdd ? (
        <div className="acad-summary-add">
          <Button variant="soft" onClick={onAdd}><AppIcon name="add" size={14} />Add {addLabelMap[type] || 'Item'}</Button>
        </div>
      ) : null}
    </div>
  )
}

// ── Health Status Cards ───────────────────────────────────────────
function HealthStatusCard({ icon, label, count, status }) {
  const tone = status === 'ok' ? 'green' : status === 'warn' ? 'orange' : 'red'
  const iconName = status === 'ok' ? 'check' : 'warning'
  return (
    <div className={`acad-health-card tone-${tone}`}>
      <span className="acad-health-card-icon"><AppIcon name={icon} size={15} /></span>
      <div className="acad-health-card-body">
        <span className="acad-health-card-label">{label}</span>
        <span className="acad-health-card-detail">{count > 0 ? `${count} available` : 'None'}</span>
      </div>
      <span className="acad-health-card-status"><AppIcon name={iconName} size={13} /></span>
    </div>
  )
}

// ── Management Action Buttons ─────────────────────────────────────
function ActionButton({ variant = 'secondary', icon, label, onClick }) {
  return (
    <button type="button" className={`acad-action-btn btn-${variant}`} onClick={onClick}>
      <AppIcon name={icon} size={15} />
      <span>{label}</span>
    </button>
  )
}

function ConfirmDialog({ title, message, impact, onConfirm, onCancel }) {
  return (
    <div className="acad-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="acad-confirm">
        <div className="acad-confirm-title">{title}</div>
        <p className="acad-confirm-message">{message}</p>
        {impact && impact.length > 0 ? (
          <div className="acad-confirm-impact">
            {impact.map((item) => (
              <span key={item.label} className="acad-confirm-chip">
                <AppIcon name={item.icon} size={12} />
                {item.label}: <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        ) : null}
        <div className="acad-confirm-actions">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
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

// ── Tree Node ─────────────────────────────────────────────────────
function TreeNode({ node, depth, selectedId, onSelect, onToggle, expandedIds }) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id
  return (
    <div>
      <div
        className={`acad-tree-node${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 16 }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button type="button" className="acad-tree-toggle" onClick={(e) => { e.stopPropagation(); onToggle(node.id) }} aria-label={expandedIds[node.id] ? 'Collapse' : 'Expand'}>
            <AppIcon name={expandedIds[node.id] ? 'arrowDown' : 'chevronRight'} size={14} />
          </button>
        ) : <span className="acad-tree-toggle acad-tree-toggle-empty" />}
        <span className={`acad-tree-icon tone-${node.tone}`}><AppIcon name={node.icon} size={14} /></span>
        <span className="acad-tree-label">{node.label}</span>
        {node.badge ? <span className="acad-tree-badge">{node.badge}</span> : null}
      </div>
      {hasChildren && expandedIds[node.id] ? (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} expandedIds={expandedIds} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
function AcademicStructurePage({ onBack, onNavigate }) {
  const { examinations } = useAcademicStore()
  const [selected, setSelected] = useState(null) // { type, examId, classId, subjectId, chapterId }
  const [expandedIds, setExpandedIds] = useState({})
  const [showForm, setShowForm] = useState(null) // { type, parent }
  const [confirm, setConfirm] = useState(null)
  const [bulkSelected, setBulkSelected] = useState([])
  const [search, setSearch] = useState('')

  const toggleExpand = (id) => setExpandedIds((cur) => ({ ...cur, [id]: !cur[id] }))

  const getSelectedNodeId = () => {
    if (!selected) return ''
    if (selected.chapterId) return selected.chapterId
    if (selected.subjectId) return selected.subjectId
    if (selected.classId) return selected.classId
    return selected.examId
  }

  // Build tree data
  const treeData = useMemo(() => examinations
    .filter((e) => !e.archived)
    .sort((a, b) => a.order - b.order)
    .map((exam) => {
      const stats = computeStats(exam)
      return {
        id: exam.id,
        label: exam.name,
        icon: 'adminDashboard',
        tone: 'orange',
        badge: String(stats.classes),
        type: 'exam',
        examId: exam.id,
        children: exam.classes
          .filter((c) => !c.archived)
          .sort((a, b) => a.order - b.order)
          .map((cls) => ({
            id: cls.id,
            label: cls.name,
            icon: 'school',
            tone: 'blue',
            badge: String(cls.subjects.length),
            type: 'class',
            examId: exam.id,
            classId: cls.id,
            children: cls.subjects
              .filter((s) => !s.archived)
              .sort((a, b) => a.order - b.order)
              .map((sub) => ({
                id: sub.id,
                label: sub.name,
                icon: sub.icon || 'chapters',
                tone: 'green',
                badge: String(sub.chapters.length),
                type: 'subject',
                examId: exam.id,
                classId: cls.id,
                subjectId: sub.id,
                children: sub.chapters
                  .sort((a, b) => a.number - b.number)
                  .map((ch) => ({
                    id: ch.id,
                    label: ch.name,
                    icon: 'document',
                    tone: 'purple',
                    type: 'chapter',
                    examId: exam.id,
                    classId: cls.id,
                    subjectId: sub.id,
                    chapterId: ch.id,
                  })),
              })),
          })),
      }
    }), [examinations])

  // Resolve selected node context
  const context = useMemo(() => {
    if (!selected) return null
    const exam = examinations.find((e) => e.id === selected.examId)
    if (!exam) return null
    const cls = exam.classes.find((c) => c.id === selected.classId)
    const sub = cls?.subjects.find((s) => s.id === selected.subjectId)
    const ch = sub?.chapters.find((c) => c.id === selected.chapterId)
    return { exam, cls, sub, ch, type: selected.type }
  }, [selected, examinations])

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    if (!context) return []
    const parts = [{ label: context.exam.name, type: 'exam' }]
    if (context.cls) parts.push({ label: context.cls.name, type: 'class' })
    if (context.sub) parts.push({ label: context.sub.name, type: 'subject' })
    if (context.ch) parts.push({ label: context.ch.name, type: 'chapter' })
    return parts
  }, [context])

  // ── Handlers ────────────────────────────────────────────────────
  const handleSelect = (node) => {
    setSelected({ type: node.type, examId: node.examId, classId: node.classId, subjectId: node.subjectId, chapterId: node.chapterId })
    setBulkSelected([])
    // Auto-expand ancestors when selecting a child
    if (node.examId) setExpandedIds((cur) => ({ ...cur, [node.examId]: true }))
    if (node.classId) setExpandedIds((cur) => ({ ...cur, [node.classId]: true }))
    if (node.subjectId) setExpandedIds((cur) => ({ ...cur, [node.subjectId]: true }))
  }

  const handleAdd = (values) => {
    if (!showForm) return
    const { type, parent } = showForm
    if (type === 'exam') addExamination(values)
    if (type === 'class') addClass(parent.examId, values)
    if (type === 'subject') addSubject(parent.examId, parent.classId, values)
    if (type === 'chapter') addChapter(parent.examId, parent.classId, parent.subjectId, values)
    setShowForm(null)
  }

  const handleDelete = () => {
    if (!confirm) return
    const { type, target } = confirm
    if (type === 'exam') deleteExamination(target.examId)
    if (type === 'class') deleteClass(target.examId, target.classId)
    if (type === 'subject') deleteSubject(target.examId, target.classId, target.subjectId)
    if (type === 'chapter') deleteChapter(target.examId, target.classId, target.subjectId, target.chapterId)
    setConfirm(null)
    setSelected(null)
  }

  const handleDuplicate = (type, target) => {
    if (type === 'exam') duplicateExamination(target.examId)
    if (type === 'class') duplicateClass(target.examId, target.classId)
    if (type === 'subject') duplicateSubject(target.examId, target.classId, target.subjectId)
    if (type === 'chapter') duplicateChapter(target.examId, target.classId, target.subjectId, target.chapterId)
  }

  const handleToggleLock = (type, target) => {
    const patch = { locked: !(target.locked || false) }
    if (type === 'exam') updateExamination(target.examId, patch)
    if (type === 'class') updateClass(target.examId, target.classId, patch)
    if (type === 'subject') updateSubject(target.examId, target.classId, target.subjectId, patch)
    if (type === 'chapter') updateChapter(target.examId, target.classId, target.subjectId, target.chapterId, patch)
  }

  const handleBulk = (patch) => {
    if (!context || bulkSelected.length === 0) return
    if (context.type === 'class') bulkUpdateClasses(context.exam.id, bulkSelected, patch)
    if (context.type === 'subject') bulkUpdateSubjects(context.exam.id, context.cls.id, bulkSelected, patch)
    if (context.type === 'chapter') bulkUpdateChapters(context.exam.id, context.cls.id, context.sub.id, bulkSelected, patch)
    setBulkSelected([])
  }

  const handleGenerateContent = () => {
    if (!context?.ch) return
    const ctx = getChapterContext(context.exam.id, context.cls.id, context.sub.id, context.ch.id)
    onNavigate('aiGenerator', ctx)
  }

  // ── Summary helpers ─────────────────────────────────────────────
  const getSummaryLabel = (type) => {
    if (!context) return ''
    const { exam, cls, sub, ch } = context
    if (type === 'exam') return exam.name
    if (type === 'class') return cls.name
    if (type === 'subject') return sub.name
    if (type === 'chapter') return `#${ch.number} ${ch.name}`
    return ''
  }

  const getSummaryMeta = (type) => {
    if (!context) return []
    const { exam, cls, sub, ch } = context
    if (type === 'exam') {
      const stats = computeStats(exam)
      return [
        { icon: 'school', label: 'Classes', value: stats.classes },
        { icon: 'chapters', label: 'Subjects', value: stats.subjects },
        { icon: 'document', label: 'Chapters', value: stats.chapters },
        { icon: 'clock', label: 'Status', value: exam.locked ? 'Locked' : exam.status },
      ]
    }
    if (type === 'class') {
      const allChapters = cls.subjects.flatMap((s) => s.chapters)
      return [
        { icon: 'chapters', label: 'Subjects', value: cls.subjects.length },
        { icon: 'document', label: 'Chapters', value: allChapters.length },
        { icon: 'mcqs', label: 'MCQs', value: allChapters.reduce((n, c) => n + c.mcqs, 0) },
        { icon: 'clock', label: 'Status', value: cls.locked ? 'Locked' : cls.status },
      ]
    }
    if (type === 'subject') {
      return [
        { icon: 'document', label: 'Chapters', value: sub.chapters.length },
        { icon: 'mcqs', label: 'MCQs', value: sub.chapters.reduce((n, c) => n + c.mcqs, 0) },
        { icon: 'flashcardsTab', label: 'Flashcards', value: sub.chapters.reduce((n, c) => n + c.flashcards, 0) },
        { icon: 'clock', label: 'Status', value: sub.locked ? 'Locked' : sub.status },
      ]
    }
    if (type === 'chapter') {
      return [
        { icon: 'mcqs', label: 'MCQs', value: ch.mcqs },
        { icon: 'flashcardsTab', label: 'Flashcards', value: ch.flashcards },
        { icon: 'notes', label: 'Notes', value: ch.notes },
        { icon: 'clock', label: 'Updated', value: ch.lastUpdated },
      ]
    }
    return []
  }

  const getHealthScore = (type) => {
    if (!context) return 0
    const { exam, cls, sub, ch } = context
    if (type === 'exam') return computeHealth(exam.classes.flatMap((c) => c.subjects.flatMap((s) => s.chapters))).score
    if (type === 'class') return computeHealth(cls.subjects.flatMap((s) => s.chapters)).score
    if (type === 'subject') return computeHealth(sub.chapters).score
    if (type === 'chapter') return computeHealth([ch]).score
    return 0
  }

  // ── Render stacked workspace ─────────────────────────────────────
  const renderWorkspace = () => {
    if (!context) {
      return (
        <EmptyState
          icon="adminDashboard"
          title="Select a node from the hierarchy to manage it"
          actionLabel="Add Examination"
          onAction={() => setShowForm({ type: 'exam' })}
        />
      )
    }

    const { exam, cls, sub, ch, type } = context

    // Build action buttons by type
    const actions = []
    if (type === 'exam') {
      actions.push({ key: 'add', variant: 'primary', icon: 'add', label: 'Add Class', onClick: () => setShowForm({ type: 'class', parent: { examId: exam.id } }) })
      actions.push({ key: 'dup', variant: 'secondary', icon: 'copy', label: 'Duplicate', onClick: () => handleDuplicate('exam', { examId: exam.id }) })
      actions.push({ key: 'lock', variant: 'secondary', icon: exam.locked ? 'lockOpen' : 'lock', label: exam.locked ? 'Unlock' : 'Lock', onClick: () => handleToggleLock('exam', { examId: exam.id }) })
      actions.push({ key: 'del', variant: 'danger', icon: 'delete', label: 'Delete', onClick: () => setConfirm({ type: 'exam', target: { examId: exam.id } }) })
    } else if (type === 'class') {
      actions.push({ key: 'add', variant: 'primary', icon: 'add', label: 'Add Subject', onClick: () => setShowForm({ type: 'subject', parent: { examId: exam.id, classId: cls.id } }) })
      actions.push({ key: 'dup', variant: 'secondary', icon: 'copy', label: 'Duplicate', onClick: () => handleDuplicate('class', { examId: exam.id, classId: cls.id }) })
      actions.push({ key: 'lock', variant: 'secondary', icon: cls.locked ? 'lockOpen' : 'lock', label: cls.locked ? 'Unlock' : 'Lock', onClick: () => handleToggleLock('class', { examId: exam.id, classId: cls.id }) })
      actions.push({ key: 'del', variant: 'danger', icon: 'delete', label: 'Delete', onClick: () => setConfirm({ type: 'class', target: { examId: exam.id, classId: cls.id } }) })
    } else if (type === 'subject') {
      actions.push({ key: 'add', variant: 'primary', icon: 'add', label: 'Add Chapter', onClick: () => setShowForm({ type: 'chapter', parent: { examId: exam.id, classId: cls.id, subjectId: sub.id } }) })
      actions.push({ key: 'dup', variant: 'secondary', icon: 'copy', label: 'Duplicate', onClick: () => handleDuplicate('subject', { examId: exam.id, classId: cls.id, subjectId: sub.id }) })
      actions.push({ key: 'lock', variant: 'secondary', icon: sub.locked ? 'lockOpen' : 'lock', label: sub.locked ? 'Unlock' : 'Lock', onClick: () => handleToggleLock('subject', { examId: exam.id, classId: cls.id, subjectId: sub.id }) })
      actions.push({ key: 'del', variant: 'danger', icon: 'delete', label: 'Delete', onClick: () => setConfirm({ type: 'subject', target: { examId: exam.id, classId: cls.id, subjectId: sub.id } }) })
    } else if (type === 'chapter') {
      actions.push({ key: 'ai', variant: 'primary', icon: 'aiCoach', label: 'Generate Content', onClick: handleGenerateContent })
      actions.push({ key: 'dup', variant: 'secondary', icon: 'copy', label: 'Duplicate', onClick: () => handleDuplicate('chapter', { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id }) })
      actions.push({ key: 'lock', variant: 'secondary', icon: ch.locked ? 'lockOpen' : 'lock', label: ch.locked ? 'Unlock' : 'Lock', onClick: () => handleToggleLock('chapter', { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id }) })
      actions.push({ key: 'del', variant: 'danger', icon: 'delete', label: 'Delete', onClick: () => setConfirm({ type: 'chapter', target: { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id } }) })
    }

    // Build stat tiles by type
    const statTiles = []
    if (type === 'exam') {
      const stats = computeStats(exam)
      statTiles.push({ icon: 'school', label: 'Classes', value: stats.classes, tone: 'blue' })
      statTiles.push({ icon: 'chapters', label: 'Subjects', value: stats.subjects, tone: 'green' })
      statTiles.push({ icon: 'document', label: 'Chapters', value: stats.chapters, tone: 'purple' })
      statTiles.push({ icon: 'mcqs', label: 'MCQs', value: stats.mcqs, tone: 'orange' })
      statTiles.push({ icon: 'flashcardsTab', label: 'Flashcards', value: stats.flashcards, tone: 'purple' })
      statTiles.push({ icon: 'notes', label: 'Notes', value: stats.notes, tone: 'blue' })
    } else if (type === 'class') {
      const allChapters = cls.subjects.flatMap((s) => s.chapters)
      const health = computeHealth(allChapters)
      const totalMcqs = allChapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = allChapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = allChapters.reduce((n, c) => n + c.notes, 0)
      statTiles.push({ icon: 'chapters', label: 'Subjects', value: cls.subjects.length, tone: 'green' })
      statTiles.push({ icon: 'document', label: 'Chapters', value: allChapters.length, tone: 'purple' })
      statTiles.push({ icon: 'mcqs', label: 'MCQs', value: totalMcqs, tone: 'orange' })
      statTiles.push({ icon: 'flashcardsTab', label: 'Flashcards', value: totalFlash, tone: 'purple' })
      statTiles.push({ icon: 'notes', label: 'Notes', value: totalNotes, tone: 'blue' })
      statTiles.push({ icon: 'check', label: 'Completion', value: `${health.score}%`, tone: 'green' })
    } else if (type === 'subject') {
      const health = computeHealth(sub.chapters)
      const totalMcqs = sub.chapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = sub.chapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = sub.chapters.reduce((n, c) => n + c.notes, 0)
      statTiles.push({ icon: 'document', label: 'Chapters', value: sub.chapters.length, tone: 'purple' })
      statTiles.push({ icon: 'mcqs', label: 'MCQs', value: totalMcqs, tone: 'orange' })
      statTiles.push({ icon: 'flashcardsTab', label: 'Flashcards', value: totalFlash, tone: 'purple' })
      statTiles.push({ icon: 'notes', label: 'Notes', value: totalNotes, tone: 'blue' })
      statTiles.push({ icon: 'check', label: 'Completion', value: `${health.score}%`, tone: 'green' })
    } else if (type === 'chapter') {
      const health = computeHealth([ch])
      statTiles.push({ icon: 'mcqs', label: 'MCQs', value: ch.mcqs, tone: 'orange' })
      statTiles.push({ icon: 'flashcardsTab', label: 'Flashcards', value: ch.flashcards, tone: 'purple' })
      statTiles.push({ icon: 'notes', label: 'Notes', value: ch.notes, tone: 'blue' })
      statTiles.push({ icon: 'clock', label: 'Last Updated', value: ch.lastUpdated, tone: 'green' })
      statTiles.push({ icon: 'check', label: 'Completion', value: `${health.score}%`, tone: 'green' })
    }

    // Build health cards by type
    const healthCards = []
    if (type === 'exam') {
      const allChapters = exam.classes.flatMap((c) => c.subjects.flatMap((s) => s.chapters))
      const totalMcqs = allChapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = allChapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = allChapters.reduce((n, c) => n + c.notes, 0)
      healthCards.push({ icon: 'mcqs', label: 'MCQ Coverage', count: totalMcqs, status: totalMcqs > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'flashcardsTab', label: 'Flashcards', count: totalFlash, status: totalFlash > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'notes', label: 'Notes', count: totalNotes, status: totalNotes > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'check', label: 'Content Health', count: getHealthScore('exam'), status: getHealthScore('exam') >= 50 ? 'ok' : 'warn' })
    } else if (type === 'class') {
      const allChapters = cls.subjects.flatMap((s) => s.chapters)
      const totalMcqs = allChapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = allChapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = allChapters.reduce((n, c) => n + c.notes, 0)
      healthCards.push({ icon: 'mcqs', label: 'MCQ Coverage', count: totalMcqs, status: totalMcqs > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'flashcardsTab', label: 'Flashcards', count: totalFlash, status: totalFlash > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'notes', label: 'Notes', count: totalNotes, status: totalNotes > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'check', label: 'Completion', count: `${getHealthScore('class')}%`, status: getHealthScore('class') >= 50 ? 'ok' : 'warn' })
    } else if (type === 'subject') {
      healthCards.push({ icon: 'mcqs', label: 'MCQ Coverage', count: getSummaryMeta('subject')[1]?.value || 0, status: getSummaryMeta('subject')[1]?.value > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'flashcardsTab', label: 'Flashcards', count: getSummaryMeta('subject')[2]?.value || 0, status: getSummaryMeta('subject')[2]?.value > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'notes', label: 'Notes', count: getSummaryMeta('subject')[1]?.value || 0, status: getSummaryMeta('subject')[2]?.value > 0 ? 'ok' : 'warn' })
      healthCards.push({ icon: 'check', label: 'Completion', count: `${getHealthScore('subject')}%`, status: getHealthScore('subject') >= 50 ? 'ok' : 'warn' })
    } else if (type === 'chapter') {
      healthCards.push({ icon: 'mcqs', label: 'MCQs', count: ch.mcqs, status: ch.mcqs > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'flashcardsTab', label: 'Flashcards', count: ch.flashcards, status: ch.flashcards > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'notes', label: 'Notes', count: ch.notes, status: ch.notes > 0 ? 'ok' : 'missing' })
      healthCards.push({ icon: 'document', label: 'Difficulty', count: ch.difficulty, status: ch.difficulty ? 'ok' : 'warn' })
    }

    // Build health issues
    const healthIssues = []
    if (type === 'exam') healthIssues.push(...computeHealth(exam.classes.flatMap((c) => c.subjects.flatMap((s) => s.chapters))).issues)
    if (type === 'class') healthIssues.push(...computeHealth(cls.subjects.flatMap((s) => s.chapters)).issues)
    if (type === 'subject') healthIssues.push(...computeHealth(sub.chapters).issues)
    if (type === 'chapter') healthIssues.push(...computeHealth([ch]).issues)

    return (
      <div className="acad-workspace">
        {/* Premium Summary Card */}
        <SummaryCard
          type={type}
          label={getSummaryLabel(type)}
          meta={getSummaryMeta(type)}
          healthScore={getHealthScore(type)}
          onAdd={type !== 'chapter' ? () => setShowForm({
            type: type === 'exam' ? 'class' : type === 'class' ? 'subject' : 'chapter',
            parent: type === 'exam' ? { examId: exam.id } : type === 'class' ? { examId: exam.id, classId: cls.id } : { examId: exam.id, classId: cls.id, subjectId: sub.id },
          }) : null}
        />

        {/* Management Actions */}
        <div className="acad-section">
          <SectionHeader icon="settings" title="Management Actions" />
          <div className="acad-actions-grid">
            {actions.map((a) => (
              <ActionButton key={a.key} variant={a.variant} icon={a.icon} label={a.label} onClick={a.onClick} />
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="acad-section">
          <SectionHeader icon="analytics" title="Statistics" />
          <div className="acad-stats-grid">
            {statTiles.map((s) => (
              <StatTile key={`${s.label}-${s.value}`} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
            ))}
          </div>
        </div>

        {/* Content Health */}
        <div className="acad-section">
          <SectionHeader icon="check" title="Content Health" />
          <div className="acad-health-grid">
            {healthCards.map((h) => (
              <HealthStatusCard key={h.label} icon={h.icon} label={h.label} count={h.count} status={h.status} />
            ))}
          </div>
          {healthIssues.length > 0 ? (
            <div className="acad-health-issues">
              {healthIssues.map((issue) => (
                <div key={issue} className="acad-health-issue"><AppIcon name="warning" size={13} />{issue}</div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Empty states */}
        {type === 'exam' && exam.classes.length === 0 ? (
          <EmptyState icon="school" title="No Classes Created" actionLabel="Create First Class" onAction={() => setShowForm({ type: 'class', parent: { examId: exam.id } })} />
        ) : null}
        {type === 'class' && cls.subjects.length === 0 ? (
          <EmptyState icon="chapters" title="No Subjects Available" actionLabel="Add Subject" onAction={() => setShowForm({ type: 'subject', parent: { examId: exam.id, classId: cls.id } })} />
        ) : null}
        {type === 'subject' && sub.chapters.length === 0 ? (
          <EmptyState icon="document" title="No Chapters Yet" actionLabel="Create Chapter" onAction={() => setShowForm({ type: 'chapter', parent: { examId: exam.id, classId: cls.id, subjectId: sub.id } })} />
        ) : null}

        {/* Chapter quick actions */}
        {type === 'chapter' ? (
          <div className="acad-chapter-actions">
            <Button variant="secondary" onClick={() => onNavigate('aiGenerator', getChapterContext(exam.id, cls.id, sub.id, ch.id))}><AppIcon name="aiCoach" size={14} />Open AI Studio</Button>
          </div>
        ) : null}
      </div>
    )
  }


  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Academic Structure</div>
        <button type="button" className="admin-back-link" onClick={onBack}><AppIcon name="back" size={16} />Back</button>
      </div>

      {/* ── Breadcrumb ────────────────────────────────────────────── */}
      {breadcrumb.length > 0 ? (
        <div className="acad-breadcrumb">
          {breadcrumb.map((part, i) => (
            <span key={i} className="acad-breadcrumb-item">
              {i > 0 ? <AppIcon name="chevronRight" size={12} /> : null}
              <span>{part.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* ── Global Search ─────────────────────────────────────────── */}
      <div className="acad-search">
        <AppIcon name="search" size={15} />
        <input type="text" placeholder="Search classes, subjects, chapters..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {search ? (
          <button type="button" className="acad-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
            <AppIcon name="close" size={14} />
          </button>
        ) : null}
      </div>

      {/* ── Stacked Mobile Workflow ───────────────────────────────── */}
      <div className="acad-mobile-layout">
        <div className="acad-tree-panel">
          <div className="acad-tree-head">
            <span className="acad-tree-title"><AppIcon name="adminDashboard" size={14} />Hierarchy</span>
            <button type="button" className="acad-tree-add" onClick={() => setShowForm({ type: 'exam' })} aria-label="Add Examination"><AppIcon name="add" size={16} /></button>
          </div>
          <div className="acad-tree-scroll">
            {treeData.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} selectedId={getSelectedNodeId()} onSelect={handleSelect} onToggle={toggleExpand} expandedIds={expandedIds} />
            ))}
          </div>
        </div>

        <div className="acad-workspace-panel">
          {renderWorkspace()}
        </div>
      </div>

      {/* ── Inline Forms ──────────────────────────────────────────── */}
      {showForm ? (
        <div className="acad-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(null) }}>
          <div className="acad-form-card">
            <div className="acad-form-title">
              {showForm.type === 'exam' ? 'Add Examination' : showForm.type === 'class' ? 'Add Class' : showForm.type === 'subject' ? 'Add Subject' : 'Add Chapter'}
            </div>
            <InlineForm
              fields={
                showForm.type === 'exam' ? [
                  { key: 'name', label: 'Examination Name', placeholder: 'e.g., BPSC TRE 4.0' },
                  { key: 'shortCode', label: 'Short Code', placeholder: 'e.g., BPSC' },
                ] : showForm.type === 'class' ? [
                  { key: 'name', label: 'Class Name', placeholder: 'e.g., Class 11' },
                ] : showForm.type === 'subject' ? [
                  { key: 'name', label: 'Subject Name', placeholder: 'e.g., Computer Networks' },
                  { key: 'shortCode', label: 'Short Code', placeholder: 'e.g., CN' },
                ] : [
                  { key: 'name', label: 'Chapter Name', placeholder: 'e.g., OSI Model' },
                  { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
                  { key: 'estMinutes', label: 'Est. Study Time (min)', placeholder: 'e.g., 45' },
                ]
              }
              onSubmit={handleAdd}
              onCancel={() => setShowForm(null)}
            />
          </div>
        </div>
      ) : null}

      {/* ── Confirm Dialog ────────────────────────────────────────── */}
      {confirm ? (
        <ConfirmDialog
          title={`Delete ${confirm.type}?`}
          message="This action cannot be undone. All child content will be removed."
          impact={[
            { icon: 'chapters', label: 'Chapters', value: 'All' },
            { icon: 'mcqs', label: 'MCQs', value: 'All' },
            { icon: 'flashcardsTab', label: 'Flashcards', value: 'All' },
          ]}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </>
  )
}

export default AcademicStructurePage