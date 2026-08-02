/**
 * MobileLayout
 * Shared mobile phone frame that renders the shared Premium BottomNav.
 * activeTab: label of the currently active nav item (e.g. 'Home', 'Subjects').
 * onNavigate: callback receiving the clicked nav item.
 */
import BottomNav from './BottomNav'

const defaultNavItems = [
  { icon: 'home', label: 'Home' },
  { icon: 'subjects', label: 'Subjects' },
  { icon: 'centerBook', label: 'center', center: true },
  { icon: 'practice', label: 'Practice' },
  { icon: 'profile', label: 'Profile' },
]

function MobileLayout({ children, activeTab, onNavigate, className = '' }) {
  const items = defaultNavItems.map((item) => ({
    ...item,
    active: !item.center && item.label === activeTab,
  }))

  return (
    <div className={`phone ${className}`.trim()}>
      {children}
      <BottomNav items={items} onNavigate={onNavigate} />
    </div>
  )
}

export default MobileLayout