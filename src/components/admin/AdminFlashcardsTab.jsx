/**
 * AdminFlashcardsTab
 * Flashcards management tab: toolbar, search, flashcard cards.
 * All icons go through the global AppIcon system.
 */
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminSearchBox, AdminIconBtn, AdminToolbar } from './AdminShared'
import { flashcardCards } from '../../data/adminData'

function AdminFlashcardsTab({ onOpenModal }) {
  return (
    <>
      <AdminToolbar>
        <Button variant="primary" onClick={() => onOpenModal('addFlashcard')}>
          <AppIcon name="add" size={16} />
          Add Flashcard
        </Button>
        <Button variant="secondary" onClick={() => onOpenModal('bulkDeleteFlashcards')}>
          <AppIcon name="delete" size={16} />
          Bulk Delete
        </Button>
      </AdminToolbar>

      <AdminSearchBox placeholder="Search flashcards..." />

      <div className="admin-flashcards-grid">
        {flashcardCards.map((card, index) => (
          <div className="admin-flashcard-card" key={`${card.front}-${index}`}>
            <div className="admin-flashcard-actions">
              <AdminIconBtn
                icon="edit"
                size={13}
                onClick={() => onOpenModal('editFlashcard')}
                ariaLabel="Edit flashcard"
              />
              <AdminIconBtn
                icon="delete"
                size={13}
                danger
                onClick={() => onOpenModal('deleteFlashcard')}
                ariaLabel="Delete flashcard"
              />
            </div>
            <div className="admin-flashcard-meta">{card.subject} • {card.chapter}</div>
            <div className="admin-flashcard-front">{card.front}</div>
            <div className="admin-flashcard-back">{card.back}</div>
            <div className="admin-flashcard-footer">
              <AdminBadge variant="success">
                <AppIcon name="check" size={10} />
                Active
              </AdminBadge>
              <span className="admin-flashcard-views">{card.views}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default AdminFlashcardsTab