/**
 * Badge
 * Reusable pill badge with color variants.
 * Variants: orange, blue, green, red, purple, teal
 */
function Badge({ children, variant = 'orange', className = '' }) {
  return (
    <span className={`badge badge-${variant}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}

export default Badge