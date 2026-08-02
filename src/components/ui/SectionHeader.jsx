/**
 * SectionHeader
 * Reusable section title with optional action button.
 */
function SectionHeader({ title, actionLabel = 'View All ›', onAction }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      {actionLabel ? (
        <button type="button" className="view-all" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export default SectionHeader