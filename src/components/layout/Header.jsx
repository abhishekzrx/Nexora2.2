/**
 * Header
 * Shared header supporting multiple variants:
 * - greeting: menu + greeting/subtitle + bell + avatar + chevron
 * - title: menu + title + right icons
 * - back: back button + title + right icons
 */
import Avatar from '../ui/Avatar'
import BellIcon from '../ui/BellIcon'
import AppIcon from '../ui/AppIcon'

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
            <AppIcon name="back" size={20} />
          </button>
          <div className="header-title-sm">{title}</div>
        </>
      )
    }

    if (variant === 'greeting') {
      return (
        <>
          <button type="button" className="menu-icon" onClick={onMenuClick} aria-label="Open menu">
            <AppIcon name="menu" size={20} />
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
          <AppIcon name="menu" size={20} />
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
            <AppIcon name="search" size={19} />
          </button>
        ) : null}
        {showBell ? <BellIcon count={notificationCount} /> : null}
        {showAvatar ? <Avatar /> : null}
        {showChevron ? (
          <span className="chevron-down" aria-hidden="true">
            <AppIcon name="chevronDown" size={12} />
          </span>
        ) : null}
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