/**
 * AdminSubjectsTab
 * Subject cards grid for the Content Manager.
 * Store-driven: reads from adminStore and opens modals with the target id.
 * All icons go through the global AppIcon system.
 */
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminIconBtn } from './AdminShared'
import { useAdminStore } from '../../data/adminStore'

function AdminSubjectsTab({ onOpenModal }) {
  const { subjects } = useAdminStore()

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Button variant="primary" onClick={() => onOpenModal('addSubject')}>
          <AppIcon name="add" size={16} />
          Add Subject
        </Button>
      </div>

      <div className="admin-subjects-grid">
        {subjects.map((subject) => (
          <div className="admin-subject-card" key={subject.id}>
            <div className="admin-subject-header">
              <div className="admin-subject-icon" aria-hidden="true">
                <AppIcon name={subject.icon} size={26} />
              </div>
              <div className="admin-subject-actions">
                <AdminIconBtn
                  icon="edit"
                  size={13}
                  onClick={() => onOpenModal('editSubject', subject.id)}
                  ariaLabel={`Edit ${subject.name}`}
                />
                <AdminIconBtn
                  icon="delete"
                  size={13}
                  danger
                  onClick={() => onOpenModal('deleteSubject', subject.id)}
                  ariaLabel={`Delete ${subject.name}`}
                />
              </div>
            </div>
            <div className="admin-subject-name">{subject.name}</div>
            <div className="admin-subject-desc">{subject.desc}</div>
            <div className="admin-subject-stats">
              {subject.stats.map((stat) => (
                <div className="admin-stat-item" key={stat.label}>
                  <div className="admin-stat-item-value">{stat.value}</div>
                  <div className="admin-stat-item-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default AdminSubjectsTab