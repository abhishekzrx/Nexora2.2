/**
 * BellIcon
 * Notification bell with badge count.
 */
import AppIcon from './AppIcon'

function BellIcon({ count = 3 }) {
  return (
    <div className="bell-wrap" aria-hidden="true">
      <AppIcon name="notifications" size={19} />
      {count > 0 ? <span className="bell-badge">{count}</span> : null}
    </div>
  )
}

export default BellIcon