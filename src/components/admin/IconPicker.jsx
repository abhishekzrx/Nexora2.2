/**
 * IconPicker
 * Reusable icon selector using ONLY the centralized AppIcon system.
 * Displays a grid of available icons from the iconRegistry.
 * No custom SVG, Lucide, Heroicons, Font Awesome, or Emoji.
 */

import AppIcon from '../ui/AppIcon'
import { iconRegistry } from '../ui/iconRegistry'

const ICON_NAMES = Object.keys(iconRegistry).filter((name) => {
  const lower = name.toLowerCase()
  return !lower.includes('rounded') && !lower.includes('arrow') && !lower.includes('close') && !lower.includes('logout') && !lower.includes('menu') && !lower.includes('search') && !lower.includes('back') && !lower.includes('chevron') && !lower.includes('more') && !lower.includes('expand') && !lower.includes('bookmark')
})

function IconPicker({ value, onChange, label = 'Select Icon' }) {
  return (
    <div className="icon-picker">
      <label className="admin-form-label">{label}</label>
      <div className="icon-picker-grid">
        {ICON_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            className={`icon-picker-item${value === name ? ' active' : ''}`}
            onClick={() => onChange(name)}
            title={name}
          >
            <AppIcon name={name} size={20} />
          </button>
        ))}
      </div>
      {value && (
        <div className="icon-picker-preview">
          <AppIcon name={value} size={24} />
          <span>{value}</span>
        </div>
      )}
    </div>
  )
}

export default IconPicker
