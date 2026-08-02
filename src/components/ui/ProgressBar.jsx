/**
 * ProgressBar
 * Reusable horizontal progress bar with track + fill.
 */
function ProgressBar({
  progress = 0,
  className = '',
  fillClassName = '',
  trackClassName = '',
  height,
}) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div
      className={`progress-track${trackClassName ? ` ${trackClassName}` : ''}${className ? ` ${className}` : ''}`}
      style={height ? { height } : undefined}
    >
      <div
        className={`progress-fill${fillClassName ? ` ${fillClassName}` : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default ProgressBar