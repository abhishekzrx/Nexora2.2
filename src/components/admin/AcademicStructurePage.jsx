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
      <span className={`acad-stat-icon tone-${tone}`}><AppIcon name={icon} size={14} /></span>
      <div className="acad-stat-body">
        <span className="acad-stat-value">{value}</span>
        <span className="acad-stat-label">{label}</span>
      </div>
    </div>
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

  // ── Render workspace by type ─────────────────────────────────────
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

    if (type === 'exam') {
      const stats = computeStats(exam)
      const health = computeHealth(exam.classes.flatMap((c) => c.subjects.flatMap((s) => s.chapters)))
      return (
        <div className="acad-workspace">
          <div className="acad-workspace-head">
            <div>
              <h3 className="acad-workspace-title">{exam.name}</h3>
              <div className="acad-workspace-meta">
                <StatusPill status={exam.locked ? 'locked' : exam.status} />
                <HealthBadge score={health.score} />
              </div>
            </div>
            <div className="acad-workspace-actions">
              <Button variant="secondary" onClick={() => setShowForm({ type: 'class', parent: { examId: exam.id } })}><AppIcon name="add" size={14} />Add Class</Button>
              <Button variant="secondary" onClick={() => handleDuplicate('exam', { examId: exam.id })}><AppIcon name="copy" size={14} />Duplicate</Button>
              <Button variant="secondary" onClick={() => handleToggleLock('exam', { examId: exam.id })}><AppIcon name={exam.locked ? 'lockOpen' : 'lock'} size={14} />{exam.locked ? 'Unlock' : 'Lock'}</Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'exam', target: { examId: exam.id } })}><AppIcon name="delete" size={14} />Delete</Button>
            </div>
          </div>
          <div className="acad-stats-grid">
            <StatTile icon="school" label="Classes" value={stats.classes} tone="blue" />
            <StatTile icon="chapters" label="Subjects" value={stats.subjects} tone="green" />
            <StatTile icon="document" label="Chapters" value={stats.chapters} tone="purple" />
            <StatTile icon="mcqs" label="MCQs" value={stats.mcqs} tone="orange" />
            <StatTile icon="flashcardsTab" label="Flashcards" value={stats.flashcards} tone="purple" />
            <StatTile icon="notes" label="Notes" value={stats.notes} tone="blue" />
          </div>
          {health.issues.length > 0 ? (
            <div className="acad-health-issues">
              {health.issues.map((issue) => (
                <div key={issue} className="acad-health-issue"><AppIcon name="warning" size={13} />{issue}</div>
              ))}
            </div>
          ) : null}
          {exam.classes.length === 0 ? (
            <EmptyState icon="school" title="No Classes Created" actionLabel="Create First Class" onAction={() => setShowForm({ type: 'class', parent: { examId: exam.id } })} />
          ) : null}
        </div>
      )
    }

    if (type === 'class') {
      const allChapters = cls.subjects.flatMap((s) => s.chapters)
      const health = computeHealth(allChapters)
      const totalMcqs = allChapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = allChapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = allChapters.reduce((n, c) => n + c.notes, 0)
      return (
        <div className="acad-workspace">
          <div className="acad-workspace-head">
            <div>
              <h3 className="acad-workspace-title">{cls.name}</h3>
              <div className="acad-workspace-meta">
                <StatusPill status={cls.locked ? 'locked' : cls.status} />
                <HealthBadge score={health.score} />
              </div>
            </div>
            <div className="acad-workspace-actions">
              <Button variant="secondary" onClick={() => setShowForm({ type: 'subject', parent: { examId: exam.id, classId: cls.id } })}><AppIcon name="add" size={14} />Add Subject</Button>
              <Button variant="secondary" onClick={() => handleDuplicate('class', { examId: exam.id, classId: cls.id })}><AppIcon name="copy" size={14} />Duplicate</Button>
              <Button variant="secondary" onClick={() => handleToggleLock('class', { examId: exam.id, classId: cls.id })}><AppIcon name={cls.locked ? 'lockOpen' : 'lock'} size={14} />{cls.locked ? 'Unlock' : 'Lock'}</Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'class', target: { examId: exam.id, classId: cls.id } })}><AppIcon name="delete" size={14} />Delete</Button>
            </div>
          </div>
          <div className="acad-stats-grid">
            <StatTile icon="chapters" label="Subjects" value={cls.subjects.length} tone="green" />
            <StatTile icon="document" label="Chapters" value={allChapters.length} tone="purple" />
            <StatTile icon="mcqs" label="MCQs" value={totalMcqs} tone="orange" />
            <StatTile icon="flashcardsTab" label="Flashcards" value={totalFlash} tone="purple" />
            <StatTile icon="notes" label="Notes" value={totalNotes} tone="blue" />
            <StatTile icon="check" label="Completion" value={`${health.score}%`} tone="green" />
          </div>
          {health.issues.length > 0 ? (
            <div className="acad-health-issues">
              {health.issues.map((issue) => (
                <div key={issue} className="acad-health-issue"><AppIcon name="warning" size={13} />{issue}</div>
              ))}
            </div>
          ) : null}
          {cls.subjects.length === 0 ? (
            <EmptyState icon="chapters" title="No Subjects Available" actionLabel="Add Subject" onAction={() => setShowForm({ type: 'subject', parent: { examId: exam.id, classId: cls.id } })} />
          ) : null}
        </div>
      )
    }

    if (type === 'subject') {
      const health = computeHealth(sub.chapters)
      const totalMcqs = sub.chapters.reduce((n, c) => n + c.mcqs, 0)
      const totalFlash = sub.chapters.reduce((n, c) => n + c.flashcards, 0)
      const totalNotes = sub.chapters.reduce((n, c) => n + c.notes, 0)
      return (
        <div className="acad-workspace">
          <div className="acad-workspace-head">
            <div>
              <h3 className="acad-workspace-title">{sub.name}</h3>
              <div className="acad-workspace-meta">
                <span className="acad-short-code">{sub.shortCode}</span>
                <StatusPill status={sub.locked ? 'locked' : sub.status} />
                <HealthBadge score={health.score} />
              </div>
            </div>
            <div className="acad-workspace-actions">
              <Button variant="secondary" onClick={() => setShowForm({ type: 'chapter', parent: { examId: exam.id, classId: cls.id, subjectId: sub.id } })}><AppIcon name="add" size={14} />Add Chapter</Button>
              <Button variant="secondary" onClick={() => handleDuplicate('subject', { examId: exam.id, classId: cls.id, subjectId: sub.id })}><AppIcon name="copy" size={14} />Duplicate</Button>
              <Button variant="secondary" onClick={() => handleToggleLock('subject', { examId: exam.id, classId: cls.id, subjectId: sub.id })}><AppIcon name={sub.locked ? 'lockOpen' : 'lock'} size={14} />{sub.locked ? 'Unlock' : 'Lock'}</Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'subject', target: { examId: exam.id, classId: cls.id, subjectId: sub.id } })}><AppIcon name="delete" size={14} />Delete</Button>
            </div>
          </div>
          <div className="acad-stats-grid">
            <StatTile icon="document" label="Chapters" value={sub.chapters.length} tone="purple" />
            <StatTile icon="mcqs" label="MCQs" value={totalMcqs} tone="orange" />
            <StatTile icon="flashcardsTab" label="Flashcards" value={totalFlash} tone="purple" />
            <StatTile icon="notes" label="Notes" value={totalNotes} tone="blue" />
            <StatTile icon="check" label="Completion" value={`${health.score}%`} tone="green" />
          </div>
          {health.issues.length > 0 ? (
            <div className="acad-health-issues">
              {health.issues.map((issue) => (
                <div key={issue} className="acad-health-issue"><AppIcon name="warning" size={13} />{issue}</div>
              ))}
            </div>
          ) : null}
          {sub.chapters.length === 0 ? (
            <EmptyState icon="document" title="No Chapters Yet" actionLabel="Create Chapter" onAction={() => setShowForm({ type: 'chapter', parent: { examId: exam.id, classId: cls.id, subjectId: sub.id } })} />
          ) : null}
        </div>
      )
    }

    if (type === 'chapter') {
      return (
        <div className="acad-workspace">
          <div className="acad-workspace-head">
            <div>
              <h3 className="acad-workspace-title">#{ch.number} {ch.name}</h3>
              <div className="acad-workspace-meta">
                <StatusPill status={ch.locked ? 'locked' : ch.status} />
                <span className="acad-difficulty">{ch.difficulty}</span>
                <span className="acad-est-time"><AppIcon name="clock" size={12} />{ch.estMinutes} min</span>
              </div>
            </div>
            <div className="acad-workspace-actions">
              <Button variant="primary" onClick={handleGenerateContent}><AppIcon name="aiCoach" size={14} />Generate Content</Button>
              <Button variant="secondary" onClick={() => handleDuplicate('chapter', { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id })}><AppIcon name="copy" size={14} />Duplicate</Button>
              <Button variant="secondary" onClick={() => handleToggleLock('chapter', { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id })}><AppIcon name={ch.locked ? 'lockOpen' : 'lock'} size={14} />{ch.locked ? 'Unlock' : 'Lock'}</Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'chapter', target: { examId: exam.id, classId: cls.id, subjectId: sub.id, chapterId: ch.id } })}><AppIcon name="delete" size={14} />Delete</Button>
            </div>
          </div>
          <div className="acad-stats-grid">
            <StatTile icon="mcqs" label="MCQs" value={ch.mcqs} tone="orange" />
            <StatTile icon="flashcardsTab" label="Flashcards" value={ch.flashcards} tone="purple" />
            <StatTile icon="notes" label="Notes" value={ch.notes} tone="blue" />
            <StatTile icon="clock" label="Last Updated" value={ch.lastUpdated} tone="green" />
          </div>
          <div className="acad-chapter-actions">
            <Button variant="secondary" onClick={() => onNavigate('aiGenerator', getChapterContext(exam.id, cls.id, sub.id, ch.id))}><AppIcon name="aiCoach" size={14} />Open AI Studio</Button>
            <Button variant="secondary" onClick={() => onNavigate('contentManager')}><AppIcon name="folder" size={14} />View Library</Button>
          </div>
        </div>
      )
    }

    return null
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
      </div>

      {/* ── Layout: Tree + Workspace ──────────────────────────────── */}
      <div className="acad-layout">
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