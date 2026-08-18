/**
 * ChapterMcqAnalytics
 * Component for SubjectDetailPage showing:
 * 1. Aggregate MCQ metrics at top (Total MCQs, Attempted, Mastered, Coverage %, Mastery %).
 * 2. Chapter-wise Total MCQs Bar Chart with numerical values and performance breakdown.
 */
import AppIcon from '../ui/AppIcon'
import { formatCompactNumber, formatInteger } from '../../services/mcqAnalyticsService'

export function AggregateMcqSummaryCard({ subject }) {
  const chapters = subject.chapters || []
  const totalMcqs = subject.totalMcqs ?? chapters.reduce((s, c) => s + (c.totalMcqs || 0), 0)
  const attemptedMcqs = subject.attemptedMcqs ?? chapters.reduce((s, c) => s + (c.attemptedMcqs || 0), 0)
  const masteredMcqs = subject.masteredMcqs ?? chapters.reduce((s, c) => s + (c.masteredMcqs || 0), 0)

  const coveragePercent = subject.coveragePercent ?? (totalMcqs > 0 ? Math.round((attemptedMcqs / totalMcqs) * 100) : 0)
  const masteryPercent = subject.masteryPercent ?? (attemptedMcqs > 0 ? Math.round((masteredMcqs / attemptedMcqs) * 100) : 0)
  const coverageLevel = subject.coverageLevel

  return (
    <div className="aggregate-mcq-summary-card">
      <div className="agg-card-header">
        <div className="agg-title-group">
          <div className="agg-icon-badge">
            <AppIcon name="mcqs" size={20} />
          </div>
          <div>
            <h3 className="agg-card-title">{subject.title} — MCQ Analytics Summary</h3>
            <div className="agg-card-subtitle">
              {chapters.length} Chapters • {formatInteger(totalMcqs)} Total MCQs in Pool
            </div>
          </div>
        </div>
        <div
          className="agg-coverage-pill"
          style={{
            backgroundColor: coverageLevel?.bg || 'rgba(18, 183, 106, 0.1)',
            color: coverageLevel?.color || '#12B76A',
          }}
        >
          {coverageLevel?.label || 'Coverage Level'}
        </div>
      </div>

      <div className="agg-metrics-grid">
        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Total MCQs</span>
          <span className="agg-metric-val">{formatInteger(totalMcqs)}</span>
          <span className="agg-metric-sub">Question Pool Size</span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Attempted</span>
          <span className="agg-metric-val" style={{ color: '#2E5CE6' }}>
            {formatInteger(attemptedMcqs)}
          </span>
          <span className="agg-metric-sub">
            {totalMcqs > 0 ? `${Math.round((attemptedMcqs / totalMcqs) * 100)}% Coverage` : '0% Coverage'}
          </span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Mastered</span>
          <span className="agg-metric-val" style={{ color: '#12B76A' }}>
            {formatInteger(masteredMcqs)}
          </span>
          <span className="agg-metric-sub">
            {attemptedMcqs > 0 ? `${Math.round((masteredMcqs / attemptedMcqs) * 100)}% Mastery` : '0% Mastery'}
          </span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Unseen Questions</span>
          <span className="agg-metric-val" style={{ color: '#F1621B' }}>
            {formatInteger(Math.max(0, totalMcqs - attemptedMcqs))}
          </span>
          <span className="agg-metric-sub">Pending Practice</span>
        </div>
      </div>

      <div className="agg-progress-bars">
        <div className="agg-bar-item">
          <div className="agg-bar-labels">
            <span>Overall Question Coverage</span>
            <span style={{ color: '#2E5CE6', fontWeight: 700 }}>{coveragePercent}%</span>
          </div>
          <div className="agg-bar-track">
            <div
              className="agg-bar-fill"
              style={{
                width: `${coveragePercent}%`,
                backgroundColor: '#2E5CE6',
              }}
            />
          </div>
        </div>

        <div className="agg-bar-item">
          <div className="agg-bar-labels">
            <span>Overall Attempt Mastery</span>
            <span style={{ color: '#12B76A', fontWeight: 700 }}>{masteryPercent}%</span>
          </div>
          <div className="agg-bar-track">
            <div
              className="agg-bar-fill"
              style={{
                width: `${masteryPercent}%`,
                backgroundColor: '#12B76A',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChapterMcqsBarChart({ subject }) {
  const chapters = subject.chapters || []
  const maxMcqs = Math.max(...chapters.map((c) => c.totalMcqs || 0), 1)

  return (
    <div className="chapter-mcqs-barchart-card">
      <div className="barchart-header">
        <div>
          <h3 className="barchart-title">Chapter-wise Total MCQs Distribution</h3>
          <p className="barchart-subtitle">Total question pool size and student attempt breakdown per chapter</p>
        </div>
        <div className="barchart-legend-row">
          <span className="legend-chip legend-total">
            <span className="legend-dot dot-total" /> Total MCQs
          </span>
          <span className="legend-chip legend-attempted">
            <span className="legend-dot dot-attempted" /> Attempted
          </span>
        </div>
      </div>

      {chapters.length === 0 ? (
        <div className="empty-chapters-card">
          <div className="empty-chapters-icon-badge">
            <AppIcon name="document" size={32} />
          </div>
          <h3 className="empty-chapters-title">No Chapters Found</h3>
          <p className="empty-chapters-sub">
            There are no chapters created for <strong>{subject.title || 'this subject'}</strong> yet.
          </p>
        </div>
      ) : (
        <div className="barchart-list">
          {chapters.map((ch, idx) => {
            const total = ch.totalMcqs || 0
            const attempted = ch.attemptedMcqs || 0
            const color = ch.coverageLevel?.color || '#12B76A'

            const relativeWidth = Math.max(8, Math.round((total / maxMcqs) * 100))

            return (
              <div key={ch.id || idx} className="barchart-item">
                <div className="barchart-item-header">
                  <div className="barchart-chap-info">
                    <span className="barchart-chap-num">Ch. {idx + 1}</span>
                    <span className="barchart-chap-title">{ch.name || ch.title}</span>
                  </div>
                  <div className="barchart-chap-values">
                    <span className="barchart-val-badge main-val-badge">
                      {attempted}/{total} MCQs
                    </span>
                  </div>
                </div>

                {/* Stacked relative visual bar */}
                <div className="barchart-track-wrap">
                  <div
                    className="barchart-total-track"
                    style={{ width: `${relativeWidth}%` }}
                  >
                    <div
                      className="barchart-attempted-fill"
                      style={{
                        width: `${total > 0 ? Math.round((attempted / total) * 100) : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="barchart-bar-count-label">{total} MCQs</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ChapterMcqAnalytics({ subject }) {
  if (!subject) return null

  return (
    <div className="chapter-mcq-analytics-wrapper">
      <AggregateMcqSummaryCard subject={subject} />
      <ChapterMcqsBarChart subject={subject} />
    </div>
  )
}
