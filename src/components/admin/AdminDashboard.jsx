/**
 * AdminDashboard
 * Overview screen: stats grid, quick actions, recent activity.
 * All icons go through the global AppIcon system.
 */
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminStatCard, AdminSectionCard } from './AdminShared'
import { adminStats, quickActions, recentActivity } from '../../data/adminData'

function AdminDashboard({ onOpenModal, onNavigate }) {
  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Dashboard</div>
      </div>

      <div className="admin-stats-grid">
        {adminStats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <AdminSectionCard title="Quick Actions">
        <div className="admin-quick-actions">
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