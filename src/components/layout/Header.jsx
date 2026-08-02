/**
 * Header
 * Shared header supporting multiple variants:
 * - greeting: menu + greeting/subtitle + bell + avatar + chevron
 * - title: menu + title + right icons
 * - back: back button + title + right icons
 */
import Avatar from '../ui/Avatar'
import BellIcon from '../ui/BellIcon'

function Header({
  variant = 'title',
  title,
  subtitle,
  greeting,
  onMenuClick,
  onBackClick,
  right,
  showSearch = false,
  showBell = true,
  showAvatar = true,
  showChevron = false,
  notificationCount = 3,
}) {
  const renderLeft = () => {
    if (variant === 'back') {
      return (
        <>
          <button type="button" className="back-btn" onClick={onBackClick} aria-label="Go back">
            ←
          </button>
          <div className="header-title-sm">{title}</div>
        </>
      )
    }

    if (variant === 'greeting') {
      return (
        <>
          <button type="button" className="menu-icon" onClick={onMenuClick} aria-label="Open menu">
            ☰
          </button>
          <div>
            <div className="greeting-title">{greeting}</div>
            <div className="greeting-sub">{subtitle}</div>
          </div>
        </>
      )
    }

    return (
      <>
        <button type="button" className="menu-icon" onClick={onMenuClick} aria-label="Open menu">
          ☰
        </button>
        <div className="header-title">{title}</div>
      </>
    )
  }

  const renderRight = () => {
    if (right) return right

    return (
      <>
        {showSearch ? (
          <button type="button" className="header-icon" aria-label="Search">
            🔍
          </button>
        ) : null}
        {showBell ? <BellIcon count={notificationCount} /> : null}
        {showAvatar ? <Avatar /> : null}
        {showChevron ? <span className="chevron-down">▾</span> : null}
      </>
    )
  }

  return (
    <header className="header">
      <div className="header-left">{renderLeft()}</div>
      <div className="header-right">{renderRight()}</div>
    </header>
  )
}

export default Header