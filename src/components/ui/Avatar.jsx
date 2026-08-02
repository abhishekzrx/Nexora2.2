/**
 * Avatar
 * Circular user avatar rendered with a Material UI profile icon.
 */
import AppIcon from './AppIcon'

function Avatar({ size = 36, className = '' }) {
  return (
    <div
      className={`avatar${className ? ` ${className}` : ''}`}
      style={size !== 36 ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <AppIcon name="profile" size={Math.round(size * 0.56)} />
    </div>
  )
}

export default Avatar
