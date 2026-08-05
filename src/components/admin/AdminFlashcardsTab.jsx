/**
 * AdminFlashcardsTab
 * Flashcards management tab: toolbar, search, flashcard cards.
 * Store-driven: reads from adminStore, opens modals with target id.
 * All icons go through the global AppIcon system.
 */
import { useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminSearchBox, AdminIconBtn, AdminToolbar } from './AdminShared'
import { useAdminStore } from '../../data/adminStore'

function AdminFlashcardsTab({ onOpenModal }) {
  const { flashcards } = useAdminStore()
  const [search, setSearch] = useState('')

  const filteredFlashcards = flashcards.filter((card) =>
    `${card.front} ${card.back}`.toLowerCase().includes(search.toLowerCase()),
  )

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

      <AdminSearchBox placeholder="Search flashcards..." value={search} onChange={setSearch} />

      <div className="admin-flashcards-grid">
        {filteredFlashcards.map((card) => (
          <div className="admin-flashcard-card" key={card.id}>
            <div className="admin-flashcard-actions">
              <AdminIconBtn
                icon="edit"
                size={13}
                onClick={() => onOpenModal('editFlashcard', card.id)}
                ariaLabel="Edit flashcard"
              />
              <AdminIconBtn
                icon="delete"
                size={13}
                danger
                onClick={() => onOpenModal('deleteFlashcard', card.id)}
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