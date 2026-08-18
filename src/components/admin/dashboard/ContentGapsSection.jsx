/**
 * ContentGapsSection.jsx
 * Identified content gaps requiring admin attention (0 MCQs, Low MCQs, 0 Flashcards).
 */
import AppIcon from '../../ui/AppIcon'

export default function ContentGapsSection({ contentGaps = [], onNavigate }) {
  if (contentGaps.length === 0) {
    return (
      <div className="content-gaps-card empty-gaps">
        <div className="gaps-header">
          <div className="gaps-title-wrap">
            <AppIcon name="target" size={18} className="gaps-icon success" />
            <h3 className="dashboard-section-title">Content Gaps Analysis</h3>
          </div>
          <span className="gap-count-badge zero">0 Issues</span>
        </div>
        <div className="gaps-success-msg">
          <span className="check-mark">✓</span> Excellent! All chapters in this course have sufficient MCQs and flashcards.
        </div>
      </div>
    )
  }

  // Display top 5 most critical gap items
  const visibleGaps = contentGaps.slice(0, 5)

  return (
    <div className="content-gaps-card">
      <div className="gaps-header">
        <div>
          <div className="gaps-title-wrap">
            <AppIcon name="help" size={18} className="gaps-icon" />
            <h3 className="dashboard-section-title">Content Gaps Analysis</h3>
          </div>
          <p className="dashboard-section-sub">Chapters requiring question bank or flashcard additions</p>
        </div>
        <span className="gap-count-badge warning">{contentGaps.length} Gaps Identified</span>
      </div>

      <div className="gaps-list">
        {visibleGaps.map((item) => (
          <div key={item.id} className={`gap-item-card severity-${item.severity}`}>
            <div className="gap-item-left">
              <div className="gap-chap-name">{item.chapterName}</div>
              <div className="gap-chap-sub">
                Subject: <strong>{item.subjectName}</strong>
              </div>
            </div>

            <div className="gap-item-right">
              <span className={`gap-badge badge-${item.severity}`}>{item.badge}</span>
              <span className="gap-rec-text">{item.recommendation}</span>
              <button
                type="button"
                className="gap-action-btn"
                onClick={() => onNavigate('mcq-injection')}
                title="Inject content to resolve gap"
              >
                Inject MCQs &rsaquo;
              </button>
            </div>
          </div>
        ))}
      </div>

      {contentGaps.length > 5 && (
        <div className="gaps-footer-note">
          + {contentGaps.length - 5} more chapters need content. Select a chapter to inject questions.
        </div>
      )}
    </div>
  )
}
