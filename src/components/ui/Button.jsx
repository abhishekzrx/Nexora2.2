/**
 * Button
 * Reusable button with variants:
 * - primary: orange filled
 * - secondary: white with border
 * - ghost: transparent
 * - soft: orange background tint
 */
function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button