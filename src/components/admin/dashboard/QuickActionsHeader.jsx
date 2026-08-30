/**
 * QuickActionsHeader.jsx
 * Compact, high-efficiency action bar for administrative tasks.
 */
import AppIcon from '../../ui/AppIcon'

export default function QuickActionsHeader({ onNavigate }) {
  const actions = [
    { id: 'quick-ai-chapters', label: '⚡ Quick AI Chapters', section: 'subjects', icon: 'aiCoach', variant: 'primary' },
    { id: 'add-subject', label: 'Add Subject', section: 'subjects', icon: 'add', variant: 'secondary' },
    { id: 'add-chapter', label: 'Add Chapter', section: 'subjects', icon: 'document', variant: 'secondary' },
    { id: 'inject-mcqs', label: 'Inject Content', section: 'mcq-injection', icon: 'help', variant: 'secondary' },
    { id: 'manage-mcqs', label: 'MCQ Studio', section: 'mcq-manager', icon: 'mcqs', variant: 'secondary' },
  ]

  return (
    <div className="quick-actions-bar">
      <div className="actions-bar-label">
        <AppIcon name="edit" size={14} /> Quick Management Shortcuts:
      </div>
      <div className="actions-buttons-group">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className={`action-btn-chip ${act.variant}`}
            onClick={() => onNavigate(act.section)}
          >
            <AppIcon name={act.icon} size={13} />
            <span>{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
