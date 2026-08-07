/**
 * AdminDashboard
 * Overview screen: Course Control Center with premium summary cards,
 * course switcher, quick actions, and recent activity.
 * Store-driven so counters update live.
 * All icons go through the global AppIcon system.
 */
import { useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { AdminSectionCard } from './AdminShared'
import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { workspaceHighlights, quickActions, recentActivity } from '../../data/adminData'

function AdminDashboard({ onOpenModal, onNavigate }) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { subjects, chapters, mcqs, flashcards } = useAdminStore()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null
  const iconStyle = activeWorkspace?.themeColor ? { '--ws-icon-color': activeWorkspace.themeColor } : {}

  // Live metrics from admin store (scoped to active course)
  const liveMetrics = useMemo(() => [
    { icon: 'subjects', value: subjects.length, label: 'Subjects', tone: 'blue' },
    { icon: 'document', value: chapters.length, label: 'Chapters', tone: 'purple' },
    { icon: 'mcqs', value: mcqs.length, label: 'MCQs', tone: 'orange' },
    { icon: 'flashcardsTab', value: flashcards.length, label: 'Flashcards', tone: 'purple' },
  ], [subjects, chapters, mcqs, flashcards])

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Dashboard</div>
      </div>

      {/* ── Course Switcher (remains on Dashboard) ──────────────── */}
      <div className="admin-course-switcher">
        <button
          type="button"
          className="admin-course-switcher-btn"
          onClick={() => setShowSwitcher((cur) => !cur)}
        >
          <span className="admin-course-switcher-icon" style={iconStyle}>
            <AppIcon name={activeWorkspace?.icon || 'adminDashboard'} size={18} />
          </span>
          <span className="admin-course-switcher-body">
            <span className="admin-course-switcher-label">Active Course</span>
            <span className="admin-course-switcher-name">
              {activeWorkspace?.name || 'No course selected'}
            </span>
          </span>
          <span className="admin-course-switcher-chevron">
            <AppIcon name="chevronDown" size={18} />
          </span>
        </button>

        {showSwitcher ? (
          <div className="admin-course-switcher-dropdown">
            <div className="admin-course-switcher-head">
              <span className="admin-course-switcher-title">Switch Course</span>
              <button
                type="button"
                className="admin-course-switcher-close"
                onClick={() => setShowSwitcher(false)}
                aria-label="Close course switcher"
              >
                <AppIcon name="close" size={14} />
              </button>
            </div>
            <div className="admin-course-list">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className={`admin-course-item${ws.id === activeWorkspaceId ? ' current' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-course-item-main"
                    onClick={() => {
                      setActiveWorkspace(ws.id)
                      setShowSwitcher(false)
                    }}
                  >
                    <span className="admin-course-item-icon" style={ws.themeColor ? { '--ws-icon-color': ws.themeColor } : {}}>
                      <AppIcon name={ws.icon} size={15} />
                    </span>
                    <span className="admin-course-item-body">
                      <span className="admin-course-item-name">{ws.name}</span>
                      <span className={`admin-course-item-status tone-${ws.status === 'active' ? 'green' : ws.status === 'archived' ? 'red' : ws.status === 'draft' ? 'orange' : 'gray'}`}>
                        {ws.status}
                      </span>
                    </span>
                    {ws.id === activeWorkspaceId ? (
                      <span className="admin-course-item-check">
                        <AppIcon name="check" size={14} />
                      </span>
                    ) : null}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Live Workspace Metrics ──────────────────────────────── */}
      <div className="admin-summary-grid">
        {liveMetrics.map((metric) => (
          <div className="admin-summary-card" key={metric.label}>
            <div className="admin-summary-card-inner">
              <span className={`admin-summary-icon tone-${metric.tone}`}>
                <AppIcon name={metric.icon} size={18} />
              </span>
              <div className="admin-summary-body">
                <div className="admin-summary-value">{metric.value}</div>
                <div className="admin-summary-label">{metric.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminSectionCard title="Workspace Highlights">
        <div className="admin-highlights-list">
          {workspaceHighlights.map((highlight) => (
            <div className="admin-highlight-item" key={highlight.label}>
              <span className={`admin-highlight-icon tone-${highlight.tone}`} aria-hidden="true">
                <AppIcon name={highlight.icon} size={15} />
              </span>
              <div className="admin-highlight-body">
                <div className="admin-highlight-label">{highlight.label}</div>
                {highlight.progress !== undefined ? (
                  <div className="admin-highlight-bar-track">
                    <div className="admin-highlight-bar-fill" style={{ width: `${highlight.progress}%` }} />
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
          <Button variant="primary" onClick={() => onNavigate('courseManager')}>
            <AppIcon name="adminDashboard" size={16} />
            Course Management
          </Button>
          <Button variant="primary" onClick={() => onNavigate('subjectManager')}>
            <AppIcon name="chapters" size={16} />
            Subject Management
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