/**
 * TimeSpent
 * Reusable time-spent breakdown with labeled progress bars.
 */
function TimeSpent({ title = 'Time Spent by Topic (This Week)', items = [] }) {
  return (
    <div className="time-bar">
      <div className="chart-title">{title}</div>
      {items.map((item) => (
        <div className="time-row" key={item.name}>
          <div className="time-name">{item.name}</div>
          <div className="time-progress">
            <div className="time-fill" style={{ width: `${item.width}%` }} />
          </div>
          <div className="time-hours">{item.hours}</div>
        </div>
      ))}
    </div>
  )
}

export default TimeSpent