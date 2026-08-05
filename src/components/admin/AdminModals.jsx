/**
 * AdminModals
 * Maps active modal key to the correct modal dialog and performs
 * real CRUD operations against the in-memory admin store.
 */
import { useState } from 'react'
import AdminModal, { AdminModalFooter } from './AdminModal'
import {
  SubjectForm,
  ChapterForm,
  McqForm,
  FlashcardForm,
  BulkDeleteMcqsForm,
  BulkDeleteFlashcardsForm,
  ConfirmDelete,
} from './AdminModalForms'
import {
  addSubject,
  updateSubject,
  deleteSubject,
  getDeleteSubjectImpact,
  addChapter,
  updateChapter,
  deleteChapter,
  getDeleteChapterImpact,
  addMcq,
  updateMcq,
  deleteMcq,
  deleteSelectedMcqs,
  deleteMcqsByChapter,
  deleteMcqsBySubject,
  deleteAllMcqs,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  deleteFlashcardsByChapter,
  deleteFlashcardsBySubject,
  deleteAllFlashcards,
  useAdminStore,
} from '../../data/adminStore'

function AdminModals({ activeModal, onClose, onSuccess, target, onTargetChange }) {
  const { subjects, chapters, mcqs, flashcards } = useAdminStore()
  const [form, setForm] = useState({})

  // Resolve the item being edited/deleted from the store by id.
  const resolveTarget = () => {
    if (!target) return null
    if (activeModal?.startsWith('editSubject') || activeModal?.startsWith('deleteSubject')) {
      return subjects.find((s) => s.id === target) || null
    }
    if (activeModal?.startsWith('editChapter') || activeModal?.startsWith('deleteChapter')) {
      return chapters.find((c) => c.id === target) || null
    }
    if (activeModal?.startsWith('editMcq') || activeModal?.startsWith('deleteMcq')) {
      return mcqs.find((m) => m.id === target) || null
    }
    if (activeModal?.startsWith('editFlashcard') || activeModal?.startsWith('deleteFlashcard')) {
      return flashcards.find((f) => f.id === target) || null
    }
    return null
  }

  const item = resolveTarget()
  // For deleteSelectedMcqs, target carries the array of IDs to delete.
  const selectedIds = activeModal === 'deleteSelectedMcqs' && Array.isArray(target) ? target : []

  const handleSubmit = (event) => {
    if (event) event.preventDefault()

    switch (activeModal) {
      case 'addSubject':
        addSubject(form)
        onSuccess('Subject added successfully!')
        break
      case 'editSubject':
        updateSubject(item.id, form)
        onSuccess('Subject updated successfully!')
        break
      case 'deleteSubject': {
        const impacted = deleteSubject(item.id)
        onSuccess(
          `Subject "${impacted.name}" deleted! Removed ${impacted.chapters} chapters, ${impacted.mcqs} MCQs and ${impacted.flashcards} flashcards.`,
        )
        break
      }
      case 'addChapter':
        addChapter(form)
        onSuccess('Chapter added successfully!')
        break
      case 'editChapter':
        updateChapter(item.id, form)
        onSuccess('Chapter updated successfully!')
        break
      case 'deleteChapter': {
        const impacted = deleteChapter(item.id)
        onSuccess(
          `Chapter "${impacted.name}" deleted! Removed ${impacted.mcqs} MCQs and ${impacted.flashcards} flashcards.`,
        )
        break
      }
      case 'addMcq':
        addMcq(form)
        onSuccess('MCQ added!')
        break
      case 'editMcq':
        updateMcq(item.id, form)
        onSuccess('MCQ updated!')
        break
      case 'deleteMcq':
        deleteMcq(item.id)
        onSuccess('MCQ deleted!')
        break
      case 'addFlashcard':
        addFlashcard(form)
        onSuccess('Flashcard added!')
        break
      case 'editFlashcard':
        updateFlashcard(item.id, form)
        onSuccess('Flashcard updated!')
        break
      case 'deleteFlashcard':
        deleteFlashcard(item.id)
        onSuccess('Flashcard deleted!')
        break
      case 'bulkDeleteMcqs': {
        let count = 0
        if (form.chapter) count = deleteMcqsByChapter(form.chapter)
        else if (form.subject) count = deleteMcqsBySubject(form.subject)
        else count = deleteAllMcqs()
        onSuccess(`${count} MCQs deleted!`)
        break
      }
      case 'deleteSelectedMcqs': {
        const count = deleteSelectedMcqs(selectedIds)
        onSuccess(`${count} selected MCQs deleted!`)
        break
      }
      case 'bulkDeleteFlashcards': {
        let count = 0
        if (form.chapter) count = deleteFlashcardsByChapter(form.chapter)
        else if (form.subject) count = deleteFlashcardsBySubject(form.subject)
        else count = deleteAllFlashcards()
        onSuccess(`${count} Flashcards deleted!`)
        break
      }
      default:
        break
    }
    setForm({})
    onTargetChange?.(null)
  }

  const handleCancel = () => {
    setForm({})
    onTargetChange?.(null)
    onClose()
  }

  const renderBody = () => {
    switch (activeModal) {
      case 'addSubject':
        return <SubjectForm value={form} onChange={setForm} />
      case 'editSubject':
        return <SubjectForm value={item || form} onChange={setForm} />
      case 'deleteSubject': {
        const impact = item ? getDeleteSubjectImpact(item.id) : null
        return (
          <ConfirmDelete
            message={`Delete "${item?.name}"?`}
            detail="This action cannot be undone. All content under this subject will also be removed."
            impact={[
              { icon: 'chapters', label: 'Chapters', count: impact?.chapters || 0, tone: 'blue' },
              { icon: 'mcqs', label: 'MCQs', count: impact?.mcqs || 0, tone: 'orange' },
              { icon: 'flashcardsTab', label: 'Flashcards', count: impact?.flashcards || 0, tone: 'purple' },
            ]}
          />
        )
      }
      case 'addChapter':
        return <ChapterForm value={form} onChange={setForm} />
      case 'editChapter':
        return <ChapterForm value={item || form} onChange={setForm} />
      case 'deleteChapter': {
        const impact = item ? getDeleteChapterImpact(item.id) : null
        return (
          <ConfirmDelete
            message={`Delete "${item?.name}"?`}
            detail="This action cannot be undone. All content under this chapter will also be removed."
            impact={[
              { icon: 'mcqs', label: 'MCQs', count: impact?.mcqs || 0, tone: 'orange' },
              { icon: 'flashcardsTab', label: 'Flashcards', count: impact?.flashcards || 0, tone: 'purple' },
            ]}
          />
        )
      }
      case 'addMcq':
        return <McqForm value={form} onChange={setForm} />
      case 'editMcq':
        return <McqForm value={item || form} onChange={setForm} />
      case 'deleteMcq':
        return (
          <ConfirmDelete
            message="Delete this MCQ?"
            detail="This question will be permanently removed from the question bank."
            impact={[
              { icon: 'mcqs', label: 'MCQ', count: 1, tone: 'orange' },
            ]}
          />
        )
      case 'deleteSelectedMcqs':
        return (
          <ConfirmDelete
            message={`Delete ${selectedIds.length} selected MCQs?`}
            detail="The selected questions will be permanently removed from the question bank."
            impact={[
              { icon: 'mcqs', label: 'MCQs', count: selectedIds.length, tone: 'orange' },
            ]}
          />
        )
      case 'addFlashcard':
        return <FlashcardForm value={form} onChange={setForm} />
      case 'editFlashcard':
        return <FlashcardForm value={item || form} onChange={setForm} />
      case 'deleteFlashcard':
        return <ConfirmDelete message="Delete this flashcard?" detail="This card will be permanently removed from the deck." />
      case 'bulkDeleteMcqs':
        return <BulkDeleteMcqsForm value={form} onChange={setForm} />
      case 'bulkDeleteFlashcards':
        return <BulkDeleteFlashcardsForm value={form} onChange={setForm} />
      default:
        return null
    }
  }

  const getConfig = () => {
    switch (activeModal) {
      case 'addSubject': return { title: 'Add New Subject', submitLabel: 'Add Subject' }
      case 'editSubject': return { title: 'Edit Subject', submitLabel: 'Update Subject' }
      case 'deleteSubject': return { title: 'Delete Subject', submitLabel: 'Delete Subject', danger: true }
      case 'addChapter': return { title: 'Add New Chapter', submitLabel: 'Add Chapter' }
      case 'editChapter': return { title: 'Edit Chapter', submitLabel: 'Update Chapter' }
      case 'deleteChapter': return { title: 'Delete Chapter', submitLabel: 'Delete Chapter', danger: true }
      case 'addMcq': return { title: 'Add MCQ', submitLabel: 'Add MCQ' }
      case 'editMcq': return { title: 'Edit MCQ', submitLabel: 'Update MCQ' }
      case 'deleteMcq': return { title: 'Delete MCQ', submitLabel: 'Delete MCQ', danger: true }
      case 'deleteSelectedMcqs': return { title: 'Delete Selected MCQs', submitLabel: 'Delete MCQs', danger: true }
      case 'addFlashcard': return { title: 'Add Flashcard', submitLabel: 'Add Flashcard' }
      case 'editFlashcard': return { title: 'Edit Flashcard', submitLabel: 'Update Flashcard' }
      case 'deleteFlashcard': return { title: 'Delete Flashcard', submitLabel: 'Delete Flashcard', danger: true }
      case 'bulkDeleteMcqs': return { title: 'Bulk Delete MCQs', submitLabel: 'Delete MCQs', danger: true }
      case 'bulkDeleteFlashcards': return { title: 'Bulk Delete Flashcards', submitLabel: 'Delete Flashcards', danger: true }
      default: return null
    }
  }

  const config = getConfig()
  if (!config) return null

  return (
    <AdminModal title={config.title} open onClose={handleCancel}>
      <form onSubmit={handleSubmit}>
        {renderBody()}
        <AdminModalFooter
          submitLabel={config.submitLabel}
          submitVariant={config.danger ? 'danger' : 'primary'}
          onCancel={handleCancel}
        />
      </form>
    </AdminModal>
  )
}

export default AdminModals