/**
 * ContentHealthSection.jsx
 * Core Content Inventory & Health metrics breakdown.
 */
import AppIcon from '../../ui/AppIcon'

export default function ContentHealthSection({ analytics }) {
  const {
    totalSubjects,
    totalChapters,
    totalMcqs,
    totalFlashcards,
    chaptersWithMcqs,
    chaptersWithoutMcqs,
    subjectsWithoutChapters,
  } = analytics

  const totalItems = totalSubjects + totalChapters + totalMcqs + totalFlashcards
  const chapCoveragePct = totalChapters > 0 ? Math.round((chaptersWithMcqs / totalChapters) * 100) : 0

  return (
    <div className="content-health-container">
      <div className="section-header-row">
        <div className="health-section-title-wrap">
          <AppIcon name="analyticsTab" size={16} style={{ color: '#F1621B' }} />
          <h3 className="dashboard-section-title">Core Content Inventory & Health</h3>
        </div>
        <span className="health-section-total-badge">
          {totalItems.toLocaleString()} Total Items
        </span>
      </div>

      <div className="content-health-grid">
        {/* Card 1: Subjects */}
        <div className="health-card sub-card">
          <div className="health-card-header">
            <span className="health-icon-badge sub">
              <AppIcon name="chapters" size={16} />
            </span>
            <span className="health-lbl">Subjects Architecture</span>
          </div>
          <div className="health-card-value">{totalSubjects}</div>
          <div className="health-card-meta">
            {subjectsWithoutChapters > 0 ? (
              <span className="meta-alert warning">
                ⚠️ {subjectsWithoutChapters} Pending Chapters
              </span>
            ) : (
              <span className="meta-alert success">✓ Structure 100% Ready</span>
            )}
          </div>
        </div>

        {/* Card 2: Chapters */}
        <div className="health-card chap-card">
          <div className="health-card-header">
            <span className="health-icon-badge chap">
              <AppIcon name="document" size={16} />
            </span>
            <span className="health-lbl">Chapters & Notes</span>
          </div>
          <div className="health-card-value">{totalChapters}</div>
          <div className="health-card-meta">
            <div className="mini-health-progress-wrap">
              <div className="mini-health-bar">
                <div className="mini-health-fill" style={{ width: `${chapCoveragePct}%`, background: '#2563EB' }} />
              </div>
              <span className="mini-health-pct">{chapCoveragePct}% Has Question Bank</span>
            </div>
          </div>
        </div>

        {/* Card 3: MCQs */}
        <div className="health-card mcq-card">
          <div className="health-card-header">
            <span className="health-icon-badge mcq">
              <AppIcon name="help" size={16} />
            </span>
            <span className="health-lbl">MCQs Question Pool</span>
          </div>
          <div className="health-card-value">{totalMcqs}</div>
          <div className="health-card-meta">
            {chaptersWithoutMcqs > 0 ? (
              <span className="meta-alert danger">
                🚨 {chaptersWithoutMcqs} Chapter(s) Empty
              </span>
            ) : (
              <span className="meta-alert success">✓ 100% Chapter Coverage</span>
            )}
          </div>
        </div>

        {/* Card 4: Flashcards */}
        <div className="health-card flash-card">
          <div className="health-card-header">
            <span className="health-icon-badge flash">
              <AppIcon name="flashcardsTab" size={16} />
            </span>
            <span className="health-lbl">Flashcards Deck</span>
          </div>
          <div className="health-card-value">{totalFlashcards}</div>
          <div className="health-card-meta">
            <span className="meta-info">⚡ Active Study Revision Cards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
