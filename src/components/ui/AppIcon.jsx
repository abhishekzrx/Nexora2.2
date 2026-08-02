/**
 * AppIcon
 * Single source of truth for every UI icon.
 * Renders a Material UI icon from the centralized registry.
 *
 * Props:
 * - name: logical icon name (see iconRegistry)
 * - size: base size in px (default 20). Optical correction is applied automatically.
 * - color: CSS color string or 'inherit' (default 'inherit')
 * - className: additional CSS class
 * - ariaLabel: accessibility label for interactive icons
 * - title: tooltip text
 * - style: additional inline styles
 */
import { memo } from 'react'
import { iconRegistry } from './iconRegistry'

const AppIcon = memo(function AppIcon({
  name,
  size = 20,
  color = 'inherit',
  className = '',
  ariaLabel,
  title,
  style,
}) {
  const entry = iconRegistry[name]
  if (!entry) return null

  const { component: IconComponent, optical = 0 } = entry
  const opticalSize = size + optical

  return (
    <IconComponent
      className={className}
      sx={{
        fontSize: opticalSize,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
      aria-label={ariaLabel}
      title={title}
      aria-hidden={ariaLabel ? undefined : true}
    />
  )
})

export default AppIcon