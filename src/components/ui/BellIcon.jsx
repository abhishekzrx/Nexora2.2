/**
 * BellIcon
 * Notification bell with badge count.
 */
function BellIcon({ count = 3 }) {
  return (
    <div className="bell-wrap" aria-hidden="true">
      🔔
      {count > 0 ? <span className="bell-badge">{count}</span> : null}
    </div>
  )
}

export default BellIcon