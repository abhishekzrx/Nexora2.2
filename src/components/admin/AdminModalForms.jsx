/**
 * AdminModalForms
 * Reusable controlled form bodies for admin modals.
 * Each form receives `value` (the item being edited) and `onChange`
 * so the parent can collect real data and perform actual CRUD.
 */
import AppIcon from '../ui/AppIcon'
import { AdminFormField } from './AdminModal'
import { useAdminStore } from '../../data/adminStore'

// ── Subject icon options (centralized AppIcon system) ─────────────
// Uses ONLY the existing centralized AppIcon registry names.
// All icons render via the global AppIcon component.
const SUBJECT_ICON_OPTIONS = [
  { name: 'computerNetworks', label: 'Networks' },
  { name: 'operatingSystems', label: 'OS' },
  { name: 'dbms', label: 'Database' },
  { name: 'digitalElectronics', label: 'Digital' },
  { name: 'dataStructures', label: 'DSA' },
  { name: 'computerOrganization', label: 'COA' },
  { name: 'physics', label: 'Physics' },
  { name: 'chemistry', label: 'Chemistry' },
  { name: 'biology', label: 'Biology' },
  { name: 'computer', label: 'Computer' },
  { name: 'chapters', label: 'Book' },
  { name: 'document', label: 'Document' },
  { name: 'quiz', label: 'Quiz' },
  { name: 'flashcardsTab', label: 'Cards' },
  { name: 'target', label: 'Target' },
  { name: 'rocket', label: 'Rocket' },
  { name: 'medal', label: 'Medal' },
  { name: 'trophy', label: 'Trophy' },
  { name: 'star', label: 'Star' },
  { name: 'lightbulb', label: 'Idea' },
]

// ── Subject color presets ─────────────────────────────────────────
const SUBJECT_COLOR_OPTIONS = [
  '#F1621B', '#2E5CE6', '#12B76A', '#7C3AED',
  '#F04438', '#0E9494', '#F79009', '#EE46BC',
]

export function SubjectForm({ value, onChange }) {
  const data = value || {}
  return (
    <>
      <AdminFormField label="Subject Name" required htmlFor="subjectName">
        <input
          id="subjectName"
          type="text"
          className="admin-form-input"
          placeholder="e.g., Physics"
          value={data.name || ''}
          onChange={(e) => onChange?.({ ...data, name: e.target.value })}
          required
        />
      </AdminFormField>
      <AdminFormField label="Subject Description" htmlFor="subjectDesc">
        <textarea
          id="subjectDesc"
          className="admin-form-textarea"
          placeholder="Enter subject description..."
          value={data.desc || ''}
          onChange={(e) => onChange?.({ ...data, desc: e.target.value })}
        />
      </AdminFormField>
      <AdminFormField label="Subject Icon" required htmlFor="subjectIcon">
        <div className="admin-icon-picker-grid">
          {SUBJECT_ICON_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              type="button"
              className={`admin-icon-picker-btn${data.icon === opt.name ? ' selected' : ''}`}
              onClick={() => onChange?.({ ...data, icon: opt.name })}
              title={opt.label}
              aria-label={`Select icon ${opt.label}`}
            >
              <AppIcon name={opt.name} size={22} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </AdminFormField>
      <AdminFormField label="Subject Color" htmlFor="subjectColor">
        <div className="admin-color-picker-grid">
          {SUBJECT_COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className={`admin-color-picker-btn${data.color === color ? ' selected' : ''}`}
              style={{ background: color }}
              onClick={() => onChange?.({ ...data, color })}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </AdminFormField>
      <AdminFormField label="Status" htmlFor="subjectStatus">
        <select
          id="subjectStatus"
          className="admin-form-select"
          value={data.status || 'active'}
          onChange={(e) => onChange?.({ ...data, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function ChapterForm({ value, onChange }) {
  const isEdit = Boolean(value)
  const data = value || {}
  const { subjects } = useAdminStore()
  return (
    <>
      <AdminFormField label="Select Subject" required htmlFor="chapterSubject">
        <select
          id="chapterSubject"
          className="admin-form-select"
          value={data.subject || ''}
          onChange={(e) => onChange?.({ ...data, subject: e.target.value })}
          required
        >
          {!isEdit ? <option value="">-- Select Subject --</option> : null}
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Chapter Name" required htmlFor="chapterName">
        <input
          id="chapterName"
          type="text"
          className="admin-form-input"
          placeholder="e.g., Introduction to Networks"
          value={data.name || ''}
          onChange={(e) => onChange?.({ ...data, name: e.target.value })}
          required
        />
      </AdminFormField>
      <AdminFormField label="Chapter Description" required htmlFor="chapterDesc">
        <textarea
          id="chapterDesc"
          className="admin-form-textarea"
          placeholder="Detailed description of chapter content..."
          value={data.desc || ''}
          onChange={(e) => onChange?.({ ...data, desc: e.target.value })}
          required
        />
      </AdminFormField>
      <AdminFormField label="Chapter Number" htmlFor="chapterNumber">
        <input
          id="chapterNumber"
          type="number"
          className="admin-form-input"
          placeholder="e.g., 1"
          min="1"
          value={data.number || ''}
          onChange={(e) => onChange?.({ ...data, number: e.target.value })}
        />
      </AdminFormField>
    </>
  )
}

export function McqForm({ value, onChange }) {
  const data = value || {}
  const { subjects, chapters } = useAdminStore()
  const options = data.options || ['', '', '', '']
  const correctIndex = data.correct !== undefined ? data.correct : 0
  const difficulty = data.difficultyText || 'Easy'

  return (
    <>
      <AdminFormField label="Select Subject" required htmlFor="mcqSubject">
        <select
          id="mcqSubject"
          className="admin-form-select"
          value={data.subject || ''}
          onChange={(e) => onChange?.({ ...data, subject: e.target.value })}
          required
        >
          <option value="">-- Select Subject --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Select Chapter" required htmlFor="mcqChapter">
        <select
          id="mcqChapter"
          className="admin-form-select"
          value={data.chapter || ''}
          onChange={(e) => onChange?.({ ...data, chapter: e.target.value })}
          required
        >
          <option value="">-- Select Chapter --</option>
          {chapters
            .filter((c) => !data.subject || c.subject === data.subject)
            .map((chapter) => (
              <option key={chapter.id} value={chapter.name}>{chapter.name}</option>
            ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Question" required htmlFor="mcqQuestion">
        <textarea
          id="mcqQuestion"
          className="admin-form-textarea"
          value={data.question || ''}
          onChange={(e) => onChange?.({ ...data, question: e.target.value })}
          required
        />
      </AdminFormField>
      {['A', 'B', 'C', 'D'].map((letter, index) => (
        <AdminFormField key={letter} label={`Option ${letter}`} required htmlFor={`mcqOption${letter}`}>
          <input
            id={`mcqOption${letter}`}
            type="text"
            className="admin-form-input"
            value={options[index] || ''}
            onChange={(e) => {
              const next = [...options]
              next[index] = e.target.value
              onChange?.({ ...data, options: next })
            }}
            required
          />
        </AdminFormField>
      ))}
      <AdminFormField label="Correct Answer" required htmlFor="mcqCorrect">
        <select
          id="mcqCorrect"
          className="admin-form-select"
          value={correctIndex}
          onChange={(e) => onChange?.({ ...data, correct: Number(e.target.value) })}
          required
        >
          <option value={0}>A</option>
          <option value={1}>B</option>
          <option value={2}>C</option>
          <option value={3}>D</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Difficulty Level" htmlFor="mcqDifficulty">
        <select
          id="mcqDifficulty"
          className="admin-form-select"
          value={difficulty}
          onChange={(e) => onChange?.({ ...data, difficulty: e.target.value })}
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function FlashcardForm({ value, onChange }) {
  const isEdit = Boolean(value)
  const data = value || {}
  const { subjects, chapters } = useAdminStore()
  return (
    <>
      <AdminFormField label="Select Subject" required htmlFor="flashcardSubject">
        <select
          id="flashcardSubject"
          className="admin-form-select"
          value={data.subject || ''}
          onChange={(e) => onChange?.({ ...data, subject: e.target.value })}
          required
        >
          {!isEdit ? <option value="">-- Select Subject --</option> : null}
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Select Chapter" required htmlFor="flashcardChapter">
        <select
          id="flashcardChapter"
          className="admin-form-select"
          value={data.chapter || ''}
          onChange={(e) => onChange?.({ ...data, chapter: e.target.value })}
          required
        >
          {!isEdit ? <option value="">-- Select Chapter --</option> : null}
          {chapters
            .filter((c) => !data.subject || c.subject === data.subject)
            .map((chapter) => (
              <option key={chapter.id} value={chapter.name}>{chapter.name}</option>
            ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Front (Question)" required htmlFor="flashcardFront">
        <textarea
          id="flashcardFront"
          className="admin-form-textarea"
          placeholder="What is bandwidth?"
          value={data.front || ''}
          onChange={(e) => onChange?.({ ...data, front: e.target.value })}
          required
        />
      </AdminFormField>
      <AdminFormField label="Back (Answer)" required htmlFor="flashcardBack">
        <textarea
          id="flashcardBack"
          className="admin-form-textarea"
          placeholder="The maximum rate of data transfer..."
          value={data.back || ''}
          onChange={(e) => onChange?.({ ...data, back: e.target.value })}
          required
        />
      </AdminFormField>
    </>
  )
}

export function BulkDeleteMcqsForm({ value, onChange }) {
  const data = value || {}
  const { subjects, chapters } = useAdminStore()
  return (
    <>
      <AdminFormField label="Filter by Subject" htmlFor="bulkMcqSubject">
        <select
          id="bulkMcqSubject"
          className="admin-form-select"
          value={data.subject || ''}
          onChange={(e) => onChange?.({ ...data, subject: e.target.value, chapter: '' })}
        >
          <option value="">-- All Subjects --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Filter by Chapter" htmlFor="bulkMcqChapter">
        <select
          id="bulkMcqChapter"
          className="admin-form-select"
          value={data.chapter || ''}
          onChange={(e) => onChange?.({ ...data, chapter: e.target.value })}
        >
          <option value="">-- All Chapters --</option>
          {chapters
            .filter((c) => !data.subject || c.subject === data.subject)
            .map((chapter) => (
              <option key={chapter.id} value={chapter.name}>{chapter.name}</option>
            ))}
        </select>
      </AdminFormField>
      <div className="admin-modal-warning">
        <AppIcon name="warning" size={16} />
        <span>Warning: This will delete all MCQs matching your criteria. This action cannot be undone.</span>
      </div>
    </>
  )
}

export function BulkDeleteFlashcardsForm({ value, onChange }) {
  const data = value || {}
  const { subjects, chapters } = useAdminStore()
  return (
    <>
      <AdminFormField label="Filter by Subject" htmlFor="bulkFlashcardSubject">
        <select
          id="bulkFlashcardSubject"
          className="admin-form-select"
          value={data.subject || ''}
          onChange={(e) => onChange?.({ ...data, subject: e.target.value, chapter: '' })}
        >
          <option value="">-- All Subjects --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Filter by Chapter" htmlFor="bulkFlashcardChapter">
        <select
          id="bulkFlashcardChapter"
          className="admin-form-select"
          value={data.chapter || ''}
          onChange={(e) => onChange?.({ ...data, chapter: e.target.value })}
        >
          <option value="">-- All Chapters --</option>
          {chapters
            .filter((c) => !data.subject || c.subject === data.subject)
            .map((chapter) => (
              <option key={chapter.id} value={chapter.name}>{chapter.name}</option>
            ))}
        </select>
      </AdminFormField>
      <div className="admin-modal-warning">
        <AppIcon name="warning" size={16} />
        <span>Warning: This will delete all flashcards matching your criteria. This action cannot be undone.</span>
      </div>
    </>
  )
}

/**
 * ImpactChip — displays a labelled count chip for delete confirmations.
 */
export function ImpactChip({ icon, label, count, tone = 'orange' }) {
  return (
    <div className={`admin-impact-chip tone-${tone}`}>
      <AppIcon name={icon} size={13} />
      <span className="admin-impact-chip-label">{label}</span>
      <span className="admin-impact-chip-count">{count}</span>
    </div>
  )
}

/**
 * DeleteImpactSummary — grid of ImpactChips showing exactly what will be removed.
 */
export function DeleteImpactSummary({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="admin-delete-impact">
      <div className="admin-delete-impact-title">
        <AppIcon name="warning" size={13} />
        This will permanently remove
      </div>
      <div className="admin-delete-impact-grid">
        {items.map((item) => (
          <ImpactChip
            key={item.label}
            icon={item.icon}
            label={item.label}
            count={item.count}
            tone={item.tone || 'orange'}
          />
        ))}
      </div>
    </div>
  )
}

export function ConfirmDelete({ message, detail, impact }) {
  return (
    <div style={{ paddingBottom: 4 }}>
      <div className="admin-confirm-delete-message">{message}</div>
      {detail ? (
        <div className="admin-confirm-delete-detail">{detail}</div>
      ) : null}
      {impact && impact.length > 0 ? <DeleteImpactSummary items={impact} /> : null}
    </div>
  )
}
