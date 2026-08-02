/**
 * ProgressRing
 * Reusable circular progress indicator with SVG.
 * Renders a track circle + progress circle with rounded caps.
 */
function ProgressRing({
  size = 70,
  radius,
  strokeWidth = 7,
  progress = 0,
  trackColor = '#EEF0F2',
  fillColor = '#F1621B',
  children,
  className = '',
}) {
  const r = radius ?? (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, progress))
  const dashOffset = circumference - (clamped / 100) * circumference

  return (
    <div className={`progress-ring${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      {children ? <div className="progress-ring-value">{children}</div> : null}
    </div>
  )
}

export default ProgressRing