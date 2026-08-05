/**
 * AdminChaptersTab
 * Chapters & Ordering tab: reorder list + chapters table.
 * Store-driven: reads from adminStore, persists reorder, opens modals with target id.
 * All icons go through the global AppIcon system.
 */
import { useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminSearchBox, AdminTable, AdminIconBtn } from './AdminShared'
import { useAdminStore, saveChapterOrder } from '../../data/adminStore'

function AdminReorderItem({ chapter, index, onDragStart, onDragEnd, onDragOver }) {
  return (
    <div
      className="admin-reorder-item"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <span className="admin-reorder-handle" aria-hidden="true">
        <AppIcon name="dragHandle" size={18} />
      </span>
      <span className="admin-reorder-number">{index + 1}</span>
      <div className="admin-reorder-info">
        <div className="admin-reorder-name">{chapter.name}</div>
        <div className="admin-reorder-sub">{chapter.desc}</div>
      </div>
    </div>
  )
}

function AdminChaptersTab({ onOpenModal }) {
  const { subjects, chapters } = useAdminStore()
  const [reorderSubject, setReorderSubject] = useState('')
  const [reorderChapters, setReorderChapters] = useState([])
  const [draggingId, setDraggingId] = useState(null)
  const [search, setSearch] = useState('')

  const filteredChapters = chapters.filter((chapter) =>
    chapter.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleReorderSubjectChange = (value) => {
    setReorderSubject(value)
    setReorderChapters(value ? chapters.filter((c) => c.subject === value) : [])
  }

  const handleDragStart = (id) => setDraggingId(id)

  const handleDragEnd = () => setDraggingId(null)

  const handleDragOver = (targetId) => {
    if (!draggingId || draggingId === targetId) return
    setReorderChapters((current) => {
      const from = current.findIndex((chapter) => chapter.id === draggingId)
      const to = current.findIndex((chapter) => chapter.id === targetId)
      if (from === -1 || to === -1) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleSaveOrder = () => {
    saveChapterOrder(reorderSubject, reorderChapters)
    // eslint-disable-next-line no-alert
    alert('✓ Chapter order saved successfully! The new sequence has been updated.')
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Button variant="primary" onClick={() => onOpenModal('addChapter')}>
          <AppIcon name="add" size={16} />
          Add Chapter
        </Button>
      </div>

      <div className="admin-reorder-section">
        <div className="admin-reorder-title">
          <AppIcon name="document" size={16} />
          Reorder Chapters
        </div>

        <div className="admin-reorder-subject-selector">
          <label className="admin-form-label" htmlFor="reorderSubject">Select Subject to Reorder</label>
          <select
            id="reorderSubject"
            className="admin-form-select"
            value={reorderSubject}
            onChange={(event) => handleReorderSubjectChange(event.target.value)}
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.name}>{subject.name}</option>
            ))}
          </select>
        </div>

        {reorderSubject ? (
          <>
            <div className="admin-reorder-hint">
              <AppIcon name="arrowUp" size={12} />
              Drag to reorder chapters • Numbers update automatically
            </div>
            <div className="admin-reorder-container">
              {reorderChapters.map((chapter, index) => (
                <AdminReorderItem
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  onDragStart={() => handleDragStart(chapter.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={() => handleDragOver(chapter.id)}
                />
              ))}
            </div>
            <button
              type="button"
              className="admin-save-order-btn"
              onClick={handleSaveOrder}
            >
              <AppIcon name="check" size={14} />
              Save Chapter Order
            </button>
          </>
        ) : null}
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="admin-section-title">All Chapters</div>
        <AdminSearchBox placeholder="Search chapters..." value={search} onChange={setSearch} />

        <AdminTable
          columns={[
            { key: 'name', label: 'Chapter' },
            { key: 'subject', label: 'Subject' },
            { key: 'desc', label: 'Description' },
            { key: 'mcqs', label: 'MCQs' },
            { key: 'flashcards', label: 'Flashcards' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={filteredChapters}
          renderCell={(row, columnKey) => {
            if (columnKey === 'name') return <strong>{row.name}</strong>
            if (columnKey === 'status') {
              return (
                <AdminBadge variant={row.status}>
                  <AppIcon name="check" size={10} />
                  {row.statusText}
                </AdminBadge>
              )
            }
            if (columnKey === 'actions') {
              return (
                <>
                  <AdminIconBtn
                    icon="edit"
                    size={12}
                    onClick={() => onOpenModal('editChapter', row.id)}
                    ariaLabel={`Edit ${row.name}`}
                  />
                  <AdminIconBtn
                    icon="delete"
                    size={12}
                    danger
                    onClick={() => onOpenModal('deleteChapter', row.id)}
                    ariaLabel={`Delete ${row.name}`}
                  />
                </>
              )
            }
            return row[columnKey]
          }}
        />
      </div>
    </>
  )
}

export default AdminChaptersTab