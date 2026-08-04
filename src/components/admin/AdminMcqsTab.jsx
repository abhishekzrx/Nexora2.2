/**
 * AdminMcqsTab
 * MCQs management tab: toolbar, search, question table.
 * All icons go through the global AppIcon system.
 */
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminSearchBox, AdminTable, AdminIconBtn, AdminToolbar } from './AdminShared'
import { mcqRows } from '../../data/adminData'

function AdminMcqsTab({ onOpenModal, onNavigate }) {
  return (
    <>
      <AdminToolbar>
        <Button variant="primary" onClick={() => onNavigate('injectMcqs')}>
          <AppIcon name="add" size={16} />
          Inject MCQs
        </Button>
        <Button variant="secondary" onClick={() => onOpenModal('bulkDeleteMcqs')}>
          <AppIcon name="delete" size={16} />
          Bulk Delete
        </Button>
      </AdminToolbar>

      <AdminSearchBox placeholder="Search MCQs..." />

      <AdminTable
        columns={[
          { key: 'question', label: 'Question' },
          { key: 'chapter', label: 'Chapter' },
          { key: 'subject', label: 'Subject' },
          { key: 'difficulty', label: 'Difficulty' },
          { key: 'attempts', label: 'Attempts' },
          { key: 'accuracy', label: 'Accuracy' },
          { key: 'actions', label: 'Actions' },
        ]}
        rows={mcqRows}
        renderCell={(row, columnKey) => {
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
                  onClick={() => onOpenModal('editMcq')}
                  ariaLabel={`Edit ${row.question}`}
                />
                <AdminIconBtn
                  icon="delete"
                  size={12}
                  danger
                  onClick={() => onOpenModal('deleteMcq')}
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