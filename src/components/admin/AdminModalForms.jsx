/**
 * AdminModalForms
 * Reusable form bodies for admin modals.
 */
import AppIcon from '../ui/AppIcon'
import { AdminFormField } from './AdminModal'

export function SubjectForm({ mode }) {
  const isEdit = mode === 'edit'
  return (
    <>
      <AdminFormField label="Subject Name" required htmlFor="subjectName">
        <input
          id="subjectName"
          type="text"
          className="admin-form-input"
          placeholder="e.g., Physics"
          defaultValue={isEdit ? 'Computer Networks' : undefined}
          required
        />
      </AdminFormField>
      <AdminFormField label="Subject Icon" required htmlFor="subjectIcon">
        <input
          id="subjectIcon"
          type="text"
          className="admin-form-input"
          placeholder="e.g., ⚛️"
          defaultValue={isEdit ? '🕸️' : undefined}
          required
        />
      </AdminFormField>
      <AdminFormField label="Description" htmlFor="subjectDesc">
        <textarea
          id="subjectDesc"
          className="admin-form-textarea"
          placeholder="Enter subject description..."
          defaultValue={isEdit ? 'Comprehensive guide to network protocols, architectures and systems' : undefined}
        />
      </AdminFormField>
      <AdminFormField label="Status" htmlFor="subjectStatus">
        <select id="subjectStatus" className="admin-form-select" defaultValue="Active">
          <option>Active</option>
          <option>Draft</option>
          <option>Inactive</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function ChapterForm({ mode }) {
  const isEdit = mode === 'edit'
  return (
    <>
      <AdminFormField label="Select Subject" required htmlFor="chapterSubject">
        <select id="chapterSubject" className="admin-form-select" defaultValue={isEdit ? 'Computer Networks' : ''} required>
          {!isEdit ? <option value="">-- Select Subject --</option> : null}
          <option>Computer Networks</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Chapter Name" required htmlFor="chapterName">
        <input
          id="chapterName"
          type="text"
          className="admin-form-input"
          placeholder="e.g., Introduction to Networks"
          defaultValue={isEdit ? 'Introduction to Networks' : undefined}
          required
        />
      </AdminFormField>
      <AdminFormField label="Chapter Description" required htmlFor="chapterDesc">
        <textarea
          id="chapterDesc"
          className="admin-form-textarea"
          placeholder="Detailed description of chapter content..."
          defaultValue={isEdit ? 'Network basics and fundamentals' : undefined}
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
          defaultValue={isEdit ? '1' : undefined}
        />
      </AdminFormField>
      <AdminFormField label="Status" htmlFor="chapterStatus">
        <select id="chapterStatus" className="admin-form-select" defaultValue="Active">
          <option>Draft</option>
          <option>Active</option>
          <option>Archive</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function McqForm() {
  return (
    <>
      <AdminFormField label="Question" required htmlFor="mcqQuestion">
        <textarea id="mcqQuestion" className="admin-form-textarea" defaultValue="What is a subnet mask?" required />
      </AdminFormField>
      <AdminFormField label="Option A" required htmlFor="mcqOptionA">
        <input id="mcqOptionA" type="text" className="admin-form-input" defaultValue="A network security protocol" required />
      </AdminFormField>
      <AdminFormField label="Option B" required htmlFor="mcqOptionB">
        <input id="mcqOptionB" type="text" className="admin-form-input" defaultValue="A 32-bit identifier for IP addresses" required />
      </AdminFormField>
      <AdminFormField label="Option C" required htmlFor="mcqOptionC">
        <input id="mcqOptionC" type="text" className="admin-form-input" defaultValue="Used to divide IP networks" required />
      </AdminFormField>
      <AdminFormField label="Option D" required htmlFor="mcqOptionD">
        <input id="mcqOptionD" type="text" className="admin-form-input" defaultValue="A routing algorithm" required />
      </AdminFormField>
      <AdminFormField label="Correct Answer" required htmlFor="mcqCorrect">
        <select id="mcqCorrect" className="admin-form-select" defaultValue="B" required>
          <option>A</option>
          <option>B</option>
          <option>C</option>
          <option>D</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Difficulty Level" htmlFor="mcqDifficulty">
        <select id="mcqDifficulty" className="admin-form-select" defaultValue="Easy">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function FlashcardForm({ mode }) {
  const isEdit = mode === 'edit'
  return (
    <>
      <AdminFormField label="Select Subject" required htmlFor="flashcardSubject">
        <select id="flashcardSubject" className="admin-form-select" defaultValue={isEdit ? 'Computer Networks' : ''} required>
          {!isEdit ? <option value="">-- Select Subject --</option> : null}
          <option>Computer Networks</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Biology</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Select Chapter" required htmlFor="flashcardChapter">
        <select id="flashcardChapter" className="admin-form-select" defaultValue={isEdit ? 'Intro to Networks' : ''} required>
          {!isEdit ? <option value="">-- Select Chapter --</option> : null}
          <option>Intro to Networks</option>
          <option>OSI Model</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Front (Question)" required htmlFor="flashcardFront">
        <textarea
          id="flashcardFront"
          className="admin-form-textarea"
          placeholder="What is bandwidth?"
          defaultValue={isEdit ? 'What is bandwidth?' : undefined}
          required
        />
      </AdminFormField>
      <AdminFormField label="Back (Answer)" required htmlFor="flashcardBack">
        <textarea
          id="flashcardBack"
          className="admin-form-textarea"
          placeholder="The maximum rate of data transfer..."
          defaultValue={isEdit ? 'The maximum rate of data transfer across a network path' : undefined}
          required
        />
      </AdminFormField>
      <AdminFormField label="Status" htmlFor="flashcardStatus">
        <select id="flashcardStatus" className="admin-form-select" defaultValue="Active">
          <option>Active</option>
          <option>Review</option>
          <option>Inactive</option>
        </select>
      </AdminFormField>
    </>
  )
}

export function BulkDeleteMcqsForm() {
  return (
    <>
      <AdminFormField label="Filter by Chapter" htmlFor="bulkMcqChapter">
        <select id="bulkMcqChapter" className="admin-form-select" defaultValue="-- All Chapters --">
          <option>-- All Chapters --</option>
          <option>Intro to Networks</option>
          <option>OSI Model</option>
          <option>Thermodynamics</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Filter by Difficulty" htmlFor="bulkMcqDifficulty">
        <select id="bulkMcqDifficulty" className="admin-form-select" defaultValue="-- All Difficulties --">
          <option>-- All Difficulties --</option>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </AdminFormField>
      <div className="admin-modal-warning">
        <AppIcon name="warning" size={16} />
        <span>Warning: This will delete approximately <strong>45 MCQs</strong> matching your criteria. This action cannot be undone.</span>
      </div>
    </>
  )
}

export function BulkDeleteFlashcardsForm() {
  return (
    <>
      <AdminFormField label="Filter by Chapter" htmlFor="bulkFlashcardChapter">
        <select id="bulkFlashcardChapter" className="admin-form-select" defaultValue="-- All Chapters --">
          <option>-- All Chapters --</option>
          <option>Intro to Networks</option>
          <option>OSI Model</option>
          <option>Thermodynamics</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Filter by Status" htmlFor="bulkFlashcardStatus">
        <select id="bulkFlashcardStatus" className="admin-form-select" defaultValue="-- All Status --">
          <option>-- All Status --</option>
          <option>Active</option>
          <option>Review</option>
          <option>Inactive</option>
        </select>
      </AdminFormField>
      <div className="admin-modal-warning">
        <AppIcon name="warning" size={16} />
        <span>Warning: This will delete approximately <strong>32 Flashcards</strong> matching your criteria. This action cannot be undone.</span>
      </div>
    </>
  )
}

export function ConfirmDelete({ message }) {
  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{ fontSize: 14, color: 'var(--dark-2)', lineHeight: 1.6 }}>{message}</div>
    </div>
  )
}