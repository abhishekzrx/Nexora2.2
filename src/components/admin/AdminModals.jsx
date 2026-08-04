/**
 * AdminModals
 * Maps active modal key to the correct modal dialog.
 */
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

const modalConfig = {
  addSubject: {
    title: 'Add New Subject',
    submitLabel: 'Add Subject',
    success: 'Subject added successfully!',
    body: <SubjectForm mode="add" />,
  },
  editSubject: {
    title: 'Edit Subject',
    submitLabel: 'Update Subject',
    success: 'Subject updated successfully!',
    body: <SubjectForm mode="edit" />,
  },
  addChapter: {
    title: 'Add New Chapter',
    submitLabel: 'Add Chapter',
    success: 'Chapter added successfully!',
    body: <ChapterForm mode="add" />,
  },
  editChapter: {
    title: 'Edit Chapter',
    submitLabel: 'Update Chapter',
    success: 'Chapter updated successfully!',
    body: <ChapterForm mode="edit" />,
  },
  editMcq: {
    title: 'Edit MCQ',
    submitLabel: 'Update MCQ',
    success: 'MCQ updated!',
    body: <McqForm />,
  },
  addFlashcard: {
    title: 'Add Flashcard',
    submitLabel: 'Add Flashcard',
    success: 'Flashcard added!',
    body: <FlashcardForm mode="add" />,
  },
  editFlashcard: {
    title: 'Edit Flashcard',
    submitLabel: 'Update Flashcard',
    success: 'Flashcard updated!',
    body: <FlashcardForm mode="edit" />,
  },
  bulkDeleteMcqs: {
    title: 'Bulk Delete MCQs',
    submitLabel: 'Delete MCQs',
    submitVariant: 'danger',
    success: '45 MCQs deleted!',
    body: <BulkDeleteMcqsForm />,
  },
  bulkDeleteFlashcards: {
    title: 'Bulk Delete Flashcards',
    submitLabel: 'Delete Flashcards',
    submitVariant: 'danger',
    success: '32 Flashcards deleted!',
    body: <BulkDeleteFlashcardsForm />,
  },
  deleteSubject: {
    title: 'Delete Subject',
    submitLabel: 'Delete Subject',
    submitVariant: 'danger',
    success: 'Subject deleted!',
    body: <ConfirmDelete message="Delete this subject? All chapters and content will be removed." />,
  },
  deleteChapter: {
    title: 'Delete Chapter',
    submitLabel: 'Delete Chapter',
    submitVariant: 'danger',
    success: 'Chapter deleted!',
    body: <ConfirmDelete message="Delete this chapter? All MCQs and flashcards will be removed." />,
  },
  deleteMcq: {
    title: 'Delete MCQ',
    submitLabel: 'Delete MCQ',
    submitVariant: 'danger',
    success: 'MCQ deleted!',
    body: <ConfirmDelete message="Delete this MCQ?" />,
  },
  deleteFlashcard: {
    title: 'Delete Flashcard',
    submitLabel: 'Delete Flashcard',
    submitVariant: 'danger',
    success: 'Flashcard deleted!',
    body: <ConfirmDelete message="Delete this flashcard?" />,
  },
}

function AdminModals({ activeModal, onClose, onSuccess }) {
  const config = activeModal ? modalConfig[activeModal] : null
  if (!config) return null

  const handleSubmit = (event) => {
    if (event) event.preventDefault()
    onSuccess(config.success)
  }

  return (
    <AdminModal title={config.title} open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {config.body}
        <AdminModalFooter
          submitLabel={config.submitLabel}
          submitVariant={config.submitVariant}
          onCancel={onClose}
        />
      </form>
    </AdminModal>
  )
}

export default AdminModals