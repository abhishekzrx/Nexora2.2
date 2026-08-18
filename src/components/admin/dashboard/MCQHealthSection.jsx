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

  return (
    <div className="mcq-health-card">
      <div className="card-header-row">
        <div>
          <div className="mcq-health-title-wrap">
            <AppIcon name="mcqs" size={18} className="mcq-title-icon" />
            <h3 className="dashboard-section-title">MCQ Database Health</h3>
          </div>
          <p className="dashboard-section-sub">Question bank coverage & chapter distribution insights</p>
        </div>

        <button
          type="button"
          className="card-link-btn"
          onClick={() => onNavigate('mcq-manager')}
        >
          Open MCQ Studio &rsaquo;
        </button>
      </div>

      <div className="mcq-health-metrics-grid">
        {/* Metric 1: Total Bank */}
        <div className="mcq-metric-box">
          <span className="metric-lbl">Total Question Bank</span>
          <div className="metric-val">{totalMcqs}</div>
          <span className="metric-sub">Active questions in DB</span>
        </div>

        {/* Metric 2: Coverage Ratio */}
        <div className="mcq-metric-box">
          <span className="metric-lbl">Chapters with MCQs</span>
          <div className="metric-val">
            {chaptersWithMcqs} <span className="denom">/ {totalChapters}</span>
          </div>
          <span className="metric-sub">
            {chaptersWithoutMcqs > 0 ? `${chaptersWithoutMcqs} chapters pending questions` : 'Full chapter coverage'}
          </span>
        </div>

        {/* Metric 3: Average per Chapter */}
        <div className="mcq-metric-box">
          <span className="metric-lbl">Average per Chapter</span>
          <div className="metric-val">{averageMcqsPerChapter}</div>
          <span className="metric-sub">MCQs / chapter ratio</span>
        </div>

        {/* Metric 4: Largest Chapter */}
        <div className="mcq-metric-box highlight-largest">
          <span className="metric-lbl">Largest Question Chapter</span>
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
          <span className="metric-lbl">Smallest Question Chapter</span>
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
  )
}
