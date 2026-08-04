/**
 * AdminAnalyticsTab
 * Analytics tab: content summary, subject breakdown, MCQ quality metrics.
 * All icons go through the global AppIcon system.
 */
import AppIcon from '../ui/AppIcon'
import { AdminBadge, AdminTable } from './AdminShared'
import { analyticsSummary, subjectBreakdown, qualityMetrics } from '../../data/adminData'

function AdminAnalyticsTab() {
  return (
    <>
      <div className="admin-analytics-section">
        <div className="admin-analytics-title">
          <AppIcon name="analytics" size={16} />
          Overall Content Summary
        </div>
        <div className="admin-analytics-row">
          {analyticsSummary.map((item) => (
            <div className="admin-analytics-item" key={item.label}>
              <div className="admin-analytics-value">{item.value}</div>
              <div className="admin-analytics-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-analytics-section">
        <div className="admin-analytics-title">
          <AppIcon name="chapters" size={16} />
          Subject-wise Breakdown
        </div>
        <AdminTable
          columns={[
            { key: 'subject', label: 'Subject' },
            { key: 'chapters', label: 'Chapters' },
            { key: 'mcqs', label: 'MCQs' },
            { key: 'flashcards', label: 'Flashcards' },
            { key: 'quality', label: 'Avg Quality Score' },
            { key: 'status', label: 'Status' },
          ]}
          rows={subjectBreakdown}
          renderCell={(row, columnKey) => {
            if (columnKey === 'subject') return <strong>{row.subject}</strong>
            if (columnKey === 'status') {
              return (
                <AdminBadge variant={row.status}>
                  <AppIcon name="check" size={10} />
                  {row.statusText}
                </AdminBadge>
              )
            }
            return row[columnKey]
          }}
        />
      </div>

      <div className="admin-analytics-section">
        <div className="admin-analytics-title">
          <AppIcon name="mcqs" size={16} />
          MCQ Quality Metrics
        </div>
        <div className="admin-analytics-row">
          {qualityMetrics.map((item) => (
            <div className="admin-analytics-item" key={item.label}>
              <div className="admin-analytics-value">{item.value}</div>
              <div className="admin-analytics-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default AdminAnalyticsTab