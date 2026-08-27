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

  const chapCoveragePct = totalChapters > 0 ? Math.round((chaptersWithMcqs / totalChapters) * 100) : 0

  return (
    <div className="content-health-container">
      <div className="section-header-row">
        <div>
          <h3 className="dashboard-section-title">Core Content Health</h3>
        </div>
      </div>

      <div className="content-health-grid">
        {/* Card 1: Subjects */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge sub">
              <AppIcon name="chapters" size={16} />
            </span>
            <span className="health-lbl">Subjects</span>
          </div>
          <div className="health-card-value">{totalSubjects}</div>
          <div className="health-card-meta">
            {subjectsWithoutChapters > 0 ? (
              <span className="meta-alert warning">
                ⚠️ {subjectsWithoutChapters} Pending Chapter setup
              </span>
            ) : (
              <span className="meta-alert success">✓ Structure Complete</span>
            )}
          </div>
        </div>

        {/* Card 2: Chapters */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge chap">
              <AppIcon name="document" size={16} />
            </span>
            <span className="health-lbl">Chapters</span>
          </div>
          <div className="health-card-value">{totalChapters}</div>
          <div className="health-card-meta">
            <div className="mini-health-progress-wrap">
              <div className="mini-health-bar">
                <div className="mini-health-fill" style={{ width: `${chapCoveragePct}%`, background: '#2E5CE6' }} />
              </div>
              <span className="mini-health-pct">{chapCoveragePct}% Has MCQs</span>
            </div>
          </div>
        </div>

        {/* Card 3: MCQs */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge mcq">
              <AppIcon name="mcqs" size={16} />
            </span>
            <span className="health-lbl">MCQs Bank</span>
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
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge flash">
              <AppIcon name="flashcardsTab" size={16} />
            </span>
            <span className="health-lbl">Flashcards Deck</span>
          </div>
          <div className="health-card-value">{totalFlashcards}</div>
          <div className="health-card-meta">
            <span className="meta-info">Revision Study Cards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
