/**
 * Avatar
 * Circular user avatar with emoji content.
 */
function Avatar({ emoji = '🧑‍💼', size = 36, className = '' }) {
  return (
    <div
      className={`avatar${className ? ` ${className}` : ''}`}
      style={size !== 36 ? { width: size, height: size, fontSize: size / 2 } : undefined}
      aria-hidden="true"
    >
      {emoji}
    </div>
  )
}

export default Avatar