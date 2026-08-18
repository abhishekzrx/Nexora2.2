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

  return (
    <div className="content-health-container">
      <div className="section-header-row">
        <div>
          <h3 className="dashboard-section-title">Core Content Health</h3>
          <p className="dashboard-section-sub">Course inventory breakdown & question coverage</p>
        </div>
      </div>

      <div className="content-health-grid">
        {/* Card 1: Subjects */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge sub">
              <AppIcon name="chapters" size={18} />
            </span>
            <span className="health-lbl">Subjects Inventory</span>
          </div>
          <div className="health-card-value">{totalSubjects}</div>
          <div className="health-card-meta">
            {subjectsWithoutChapters > 0 ? (
              <span className="meta-alert warning">
                ⚠️ {subjectsWithoutChapters} subject(s) without chapters
              </span>
            ) : (
              <span className="meta-alert success">✓ All subjects have chapters</span>
            )}
          </div>
        </div>

        {/* Card 2: Chapters */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge chap">
              <AppIcon name="document" size={18} />
            </span>
            <span className="health-lbl">Chapters Created</span>
          </div>
          <div className="health-card-value">{totalChapters}</div>
          <div className="health-card-meta">
            <span className="meta-info">
              {chaptersWithMcqs} of {totalChapters} chapters have questions
            </span>
          </div>
        </div>

        {/* Card 3: MCQs */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge mcq">
              <AppIcon name="mcqs" size={18} />
            </span>
            <span className="health-lbl">Available MCQs</span>
          </div>
          <div className="health-card-value">{totalMcqs}</div>
          <div className="health-card-meta">
            {chaptersWithoutMcqs > 0 ? (
              <span className="meta-alert danger">
                🚨 {chaptersWithoutMcqs} chapter(s) needing MCQs
              </span>
            ) : (
              <span className="meta-alert success">✓ 100% chapter question coverage</span>
            )}
          </div>
        </div>

        {/* Card 4: Flashcards */}
        <div className="health-card">
          <div className="health-card-header">
            <span className="health-icon-badge flash">
              <AppIcon name="flashcardsTab" size={18} />
            </span>
            <span className="health-lbl">Flashcards Deck</span>
          </div>
          <div className="health-card-value">{totalFlashcards}</div>
          <div className="health-card-meta">
            <span className="meta-info">Active revision study cards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
