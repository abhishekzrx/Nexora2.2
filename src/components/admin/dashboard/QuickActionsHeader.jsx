/**
 * QuickActionsHeader.jsx
 * Compact, high-efficiency action bar for administrative tasks.
 */
import AppIcon from '../../ui/AppIcon'

export default function QuickActionsHeader({ onNavigate }) {
  const actions = [
    { id: 'add-subject', label: '+ Add Subject', section: 'subjects', icon: 'add', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
    { id: 'add-chapter', label: '+ Add Chapter', section: 'subjects', icon: 'document', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    { id: 'inject-mcqs', label: '⚡ Inject MCQs', section: 'mcq-injection', icon: 'help', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    { id: 'manage-mcqs', label: '🎯 MCQ Studio', section: 'mcq-manager', icon: 'mcqs', color: '#7C3AED', bg: '#FAF5FF', border: '#DDD6FE' },
    { id: 'notes-manager', label: '📖 Notes Editor', section: 'notes', icon: 'chapters', color: '#0E9494', bg: '#E6F7F7', border: '#B2EBF2' },
  ]

  return (
    <div className="quick-actions-bar">
      <div className="actions-bar-label">
        <AppIcon name="edit" size={13} />
        <span>Quick Management Shortcuts:</span>
      </div>
      <div className="actions-buttons-group">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className="action-btn-chip"
            style={{
              color: act.color,
              background: act.bg,
              borderColor: act.border,
            }}
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
