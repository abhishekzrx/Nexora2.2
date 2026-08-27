/**
 * SubjectOverviewSection.jsx
 * Spacious, high-information-density Subject Performance & Overview cards/rows.
 */
import AppIcon from '../../ui/AppIcon'

export default function SubjectOverviewSection({ subjectBreakdown = [], onNavigate }) {
  if (subjectBreakdown.length === 0) {
    return (
      <div className="subject-overview-card empty-subjects">
        <h3 className="dashboard-section-title">Subject Performance Overview</h3>
        <button type="button" className="card-link-btn" onClick={() => onNavigate('subjects')}>
          + Create First Subject
        </button>
      </div>
    )
  }

  return (
    <div className="subject-overview-card">
      <div className="card-header-row">
        <div>
          <h3 className="dashboard-section-title">Subject Performance Overview</h3>
        </div>
        <button type="button" className="card-link-btn" onClick={() => onNavigate('subjects')}>
          View All Subjects ({subjectBreakdown.length}) &rsaquo;
        </button>
      </div>

      <div className="subject-rows-container">
        {subjectBreakdown.map((sub) => (
          <div key={sub.id} className="subject-overview-row">
            <div className="sub-row-main">
              <span className="sub-row-icon" style={{ background: `${sub.color}15`, color: sub.color }}>
                <AppIcon name={sub.icon || 'chapters'} size={18} />
              </span>
              <div>
                <h4 className="sub-row-name">{sub.name}</h4>
                <div className="sub-row-meta">
                  <span>{sub.chaptersCount} C</span>
                  <span className="dot-sep">•</span>
                  <span>{sub.mcqsCount} MCQs</span>
                  <span className="dot-sep">•</span>
                  <span>{sub.flashcardsCount} FC</span>
                  <span className="dot-sep">•</span>
                  <span>{sub.notesCount || 0} N</span>
                </div>
              </div>
            </div>

            <div className="sub-row-coverage">
              <div className="coverage-text-wrap">
                <span className="coverage-lbl">Coverage</span>
                <span className={`coverage-pct ${sub.coveragePct >= 70 ? 'high' : sub.coveragePct >= 40 ? 'med' : 'low'}`}>
                  {sub.coveragePct}%
                </span>
              </div>
              <div className="coverage-track">
                <div
                  className={`coverage-fill ${sub.coveragePct >= 70 ? 'high' : sub.coveragePct >= 40 ? 'med' : 'low'}`}
                  style={{ width: `${sub.coveragePct}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
