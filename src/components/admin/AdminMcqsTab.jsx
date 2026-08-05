/**
 * AdminMcqsTab
 * MCQs management tab: toolbar, search, question table with multi-select.
 * Store-driven: reads from adminStore, opens modals with target id.
 * All icons go through the global AppIcon system.
 */
import { useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminSearchBox, AdminTable, AdminIconBtn, AdminToolbar } from './AdminShared'
import { useAdminStore } from '../../data/adminStore'

function AdminMcqsTab({ onOpenModal }) {
  const { mcqs } = useAdminStore()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])

  const filteredMcqs = mcqs.filter((mcq) =>
    mcq.question.toLowerCase().includes(search.toLowerCase()),
  )

  const allVisibleSelected = filteredMcqs.length > 0 && filteredMcqs.every((mcq) => selected.includes(mcq.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected((current) => current.filter((id) => !filteredMcqs.some((mcq) => mcq.id === id)))
    } else {
      const visibleIds = filteredMcqs.map((mcq) => mcq.id)
      setSelected((current) => Array.from(new Set([...current, ...visibleIds])))
    }
  }

  const toggleSelect = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  const handleDeleteSelected = () => {
    if (selected.length === 0) return
    onOpenModal('deleteSelectedMcqs', selected)
  }

  return (
    <>
      <AdminToolbar>
        <Button variant="primary" onClick={() => onOpenModal('addMcq')}>
          <AppIcon name="add" size={16} />
          Add MCQ
        </Button>
        <Button variant="secondary" onClick={() => onOpenModal('bulkDeleteMcqs')}>
          <AppIcon name="delete" size={16} />
          Bulk Delete
        </Button>
        {selected.length > 0 ? (
          <Button variant="danger" onClick={handleDeleteSelected}>
            <AppIcon name="delete" size={16} />
            Delete Selected ({selected.length})
          </Button>
        ) : null}
      </AdminToolbar>

      <AdminSearchBox placeholder="Search MCQs..." value={search} onChange={setSearch} />

      <div className="admin-selection-bar" style={{ opacity: selected.length > 0 ? 1 : 0 }}>
        <span className="admin-selection-count">
          <AppIcon name="check" size={13} />
          {selected.length} selected
        </span>
        {selected.length > 0 ? (
          <button type="button" className="admin-selection-clear" onClick={() => setSelected([])}>
            Clear selection
          </button>
        ) : null}
      </div>

      <AdminTable
        columns={[
          { key: 'select', label: (
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              aria-label="Select all visible MCQs"
            />
          ) },
          { key: 'question', label: 'Question' },
          { key: 'chapter', label: 'Chapter' },
          { key: 'subject', label: 'Subject' },
          { key: 'difficulty', label: 'Difficulty' },
          { key: 'attempts', label: 'Attempts' },
          { key: 'accuracy', label: 'Accuracy' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={filteredMcqs}
        renderCell={(row, columnKey) => {
          if (columnKey === 'select') {
            return (
              <input
                type="checkbox"
                className="admin-checkbox"
                checked={selected.includes(row.id)}
                onChange={() => toggleSelect(row.id)}
                aria-label={`Select ${row.question}`}
              />
            )
          }
          if (columnKey === 'question') return <strong>{row.question}</strong>
          if (columnKey === 'difficulty') {
            return <AdminBadge variant={row.difficulty}>{row.difficultyText}</AdminBadge>
          }
          if (columnKey === 'actions') {
            return (
              <>
                <AdminIconBtn
                  icon="edit"
                  size={12}
                  onClick={() => onOpenModal('editMcq', row.id)}
                  ariaLabel={`Edit ${row.question}`}
                />
                <AdminIconBtn
                  icon="delete"
                  size={12}
                  danger
                  onClick={() => onOpenModal('deleteMcq', row.id)}
                  ariaLabel={`Delete ${row.question}`}
                />
              </>
            )
          }
          return row[columnKey]
        }}
      />
    </>
  )
}

export default AdminMcqsTab