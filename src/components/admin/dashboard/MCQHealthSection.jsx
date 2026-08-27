/**
 * MCQHealthSection.jsx
 * Dedicated MCQ Database Health Insights panel.
 * Dynamically computed for any question bank scale.
 */
import AppIcon from '../../ui/AppIcon'

export default function MCQHealthSection({ analytics, onNavigate }) {
  const {
    totalMcqs,
    chaptersWithMcqs,
    chaptersWithoutMcqs,
    averageMcqsPerChapter,
    largestMcqChapter,
    smallestMcqChapter,
    totalChapters,
  } = analytics

  const coveragePct = totalChapters > 0 ? Math.round((chaptersWithMcqs / totalChapters) * 100) : 0

  return (
    <div className="mcq-health-card">
      <div className="card-header-row">
        <div>
          <div className="mcq-health-title-wrap">
            <AppIcon name="mcqs" size={18} className="mcq-title-icon" />
            <h3 className="dashboard-section-title">MCQ Database Health</h3>
          </div>
        </div>

        <button
          type="button"
          className="card-link-btn"
          onClick={() => onNavigate('mcq-manager')}
        >
          Open MCQ Studio &rsaquo;
        </button>
      </div>

      <div className="mcq-health-main-layout">
        {/* Visual Health Gauge Ring */}
        <div className="mcq-health-gauge-box">
          <div className="mcq-gauge-svg-wrap">
            <svg viewBox="0 0 100 100" className="mcq-gauge-svg">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={coveragePct >= 80 ? '#12B76A' : coveragePct >= 50 ? '#F59E0B' : '#EF4444'}
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 - (coveragePct / 100) * (2 * Math.PI * 40)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="mcq-gauge-center">
              <span className="mcq-gauge-pct">{coveragePct}%</span>
              <span className="mcq-gauge-lbl">Coverage</span>
            </div>
          </div>
          <span className="mcq-gauge-sub">{chaptersWithMcqs} of {totalChapters} Chapters</span>
        </div>

        <div className="mcq-health-metrics-grid">
          {/* Metric 1: Total Bank */}
          <div className="mcq-metric-box">
            <span className="metric-lbl">Total Question Bank</span>
            <div className="metric-val">{totalMcqs}</div>
            <span className="metric-sub">Active questions</span>
          </div>

          {/* Metric 2: Coverage Ratio */}
          <div className="mcq-metric-box">
            <span className="metric-lbl">Chapter Coverage</span>
            <div className="metric-val">
              {chaptersWithMcqs} <span className="denom">/ {totalChapters}</span>
            </div>
            <span className="metric-sub">
              {chaptersWithoutMcqs > 0 ? `${chaptersWithoutMcqs} Pending` : 'Full Coverage'}
            </span>
          </div>

          {/* Metric 3: Average per Chapter */}
          <div className="mcq-metric-box">
            <span className="metric-lbl">Avg / Chapter</span>
            <div className="metric-val">{averageMcqsPerChapter}</div>
            <span className="metric-sub">Questions ratio</span>
          </div>

          {/* Metric 4: Largest Chapter */}
          <div className="mcq-metric-box highlight-largest">
            <span className="metric-lbl">Top Question Chapter</span>
            <div className="metric-val text-sm">
              {largestMcqChapter ? (
                <>
                  <strong>{largestMcqChapter.count} MCQs</strong>
                  <span className="chap-sub-text">{largestMcqChapter.name}</span>
                </>
              ) : (
                'None'
              )}
            </div>
          </div>

          {/* Metric 5: Smallest Chapter */}
          <div className="mcq-metric-box highlight-smallest">
            <span className="metric-lbl">Lowest Question Chapter</span>
            <div className="metric-val text-sm">
              {smallestMcqChapter ? (
                <>
                  <strong>{smallestMcqChapter.count} MCQs</strong>
                  <span className="chap-sub-text">{smallestMcqChapter.name}</span>
                </>
              ) : (
                'None'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
