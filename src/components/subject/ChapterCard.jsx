/**
 * ChapterCard
 * Reusable clickable chapter row showing number, title, subtitle,
 * progress bar, meta counts, completion status, and chevron.
 * Clicking navigates to the MCQ Response page for that chapter.
 */
import AppIcon from '../ui/AppIcon'

function ChapterCard({ chapter, onClick }) {
  const statusClass = chapter.complete
    ? 'pct-complete'
    : chapter.progress === 0
      ? 'pct-none'
      : 'pct-progress'

  return (
    <button type="button" className="chapter-item" onClick={() => onClick?.(chapter)}>
      <div className="chapter-row-inner">
        <div className="chapter-num">{chapter.num}</div>
        <div className="chapter-body">
          <div className="chapter-title">{chapter.title}</div>
          <div className="chapter-sub">{chapter.sub}</div>
          <div className="chapter-progress-track">
            <div className="chapter-progress-fill" style={{ width: `${chapter.progress}%` }} />
          </div>
        </div>
        <div className="chapter-right">
          <div className="chapter-meta">{chapter.meta}</div>
          <div className="chapter-status">
            <span className={`chapter-pct ${statusClass}`}>{chapter.pct}</span>
            {chapter.complete ? (
              <span className="status-check">
                <AppIcon name="check" size={11} />
              </span>
            ) : (
              <span className={`status-ring${chapter.progress === 0 ? ' empty' : ''}`} />
            )}
            <span className="chevron">
              <AppIcon name="chevronRight" size={16} />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default ChapterCard