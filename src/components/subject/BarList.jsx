/**
 * BarList
 * Reusable list of labeled progress bars with meta and value.
 */
function BarList({ title, items = [] }) {
  return (
    <div className="breakdown-section">
      <div className="chart-title">{title}</div>
      {items.map((item) => (
        <div className="breakdown-item" key={item.label}>
          <div className="breakdown-left">
            <div>
              <div className="breakdown-label">{item.label}</div>
              {item.meta ? <div className="breakdown-meta">{item.meta}</div> : null}
            </div>
          </div>
          <div className="breakdown-bar-container">
            <div className="breakdown-bar" style={{ width: `${item.width}%` }} />
          </div>
          <div className="breakdown-right">
            <div className="breakdown-value">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default BarList