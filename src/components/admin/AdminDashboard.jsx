/**
 * AdminDashboard
 * Overview screen: CMS Workspace overview hero with premium summary cards,
 * quick actions, recent activity. Store-driven so counters update live.
 * All icons go through the global AppIcon system.
 */
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminSectionCard } from './AdminShared'
import ContentAnalyticsCarousel from './ContentAnalyticsCarousel'
import { workspaceHighlights, quickActions, recentActivity } from '../../data/adminData'

function AdminDashboard({ onOpenModal, onNavigate }) {

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Dashboard</div>
      </div>

      {/* ── Content Analytics Hero (auto-playing carousel) ──────── */}
      <ContentAnalyticsCarousel />

      {/* ── Workspace Highlights ────────────────────────────────── */}
      <AdminSectionCard title="Workspace Highlights">
        <div className="admin-highlights-list">
          {workspaceHighlights.map((highlight) => (
            <div className="admin-highlight-item" key={highlight.label}>
              <span
                className={`admin-highlight-icon tone-${highlight.tone}`}
                aria-hidden="true"
              >
                <AppIcon name={highlight.icon} size={15} />
              </span>
              <div className="admin-highlight-body">
                <div className="admin-highlight-label">{highlight.label}</div>
                {highlight.progress !== undefined ? (
                  <div className="admin-highlight-bar-track">
                    <div
                      className="admin-highlight-bar-fill"
                      style={{ width: `${highlight.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="admin-highlight-value">{highlight.value}</div>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Quick Actions">
        <div className="admin-quick-actions">
          <Button variant="primary" onClick={() => onNavigate('aiGenerator')}>
            <AppIcon name="aiCoach" size={16} />
            AI Content Studio
          </Button>
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="primary"
              onClick={() => {
                if (action.modal === 'injectMcqs') {
                  onNavigate('injectMcqs')
                } else {
                  onOpenModal(action.modal)
                }
              }}
            >
              <AppIcon name={action.icon} size={16} />
              {action.label}
            </Button>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Recent Activity">
        <div className="admin-activity-list">
          {recentActivity.map((item, index) => (
            <div className="admin-activity-item" key={`${item.strong}-${index}`}>
              <span className="admin-activity-icon" aria-hidden="true">
                <AppIcon name={item.icon} size={16} />
              </span>
              <div>
                <strong>{item.strong}</strong> {item.text}
              </div>
              <div className="admin-activity-time">{item.time}</div>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </>
  )
}

export default AdminDashboard