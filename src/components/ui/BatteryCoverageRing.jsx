/**
 * BatteryCoverageRing.jsx / BatteryIndicator.jsx
 * Clean Battery Coverage Indicator with value displayed right after battery.
 * No outer ring or border — Battery icon rendered with 50% transparency.
 *
 * 4 Grade Levels:
 * - Grade 1 (0–24%): Red (#F04438) — 1 bar
 * - Grade 2 (25–49%): Orange (#F79009) — 2 bars
 * - Grade 3 (50–74%): Yellow (#EAAA08) — 3 bars
 * - Grade 4 (75–100%): Green (#12B76A) — 4 bars
 */

export function getBatteryGrade(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  if (p < 25) {
    return {
      grade: 1,
      bars: 1,
      color: '#F04438',
      label: 'Getting Started',
    }
  }
  if (p < 50) {
    return {
      grade: 2,
      bars: 2,
      color: '#F79009',
      label: 'Developing',
    }
  }
  if (p < 75) {
    return {
      grade: 3,
      bars: 3,
      color: '#EAAA08',
      label: 'Good',
    }
  }
  return {
    grade: 4,
    bars: 4,
    color: '#12B76A',
    label: 'Mastered',
  }
}

export function BatteryCoverageRing({
  progress = 0,
  className = '',
}) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)))
  const gradeInfo = getBatteryGrade(pct)

  return (
    <div
      className={`battery-coverage-inline ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'transparent',
        border: 'none',
        padding: '2px 0',
      }}
      title={`Coverage: ${pct}% (${gradeInfo.label} - Grade ${gradeInfo.grade}/4)`}
    >
      {/* 20% Larger Battery SVG Icon (No outer ring, 50% Transparency) */}
      <svg
        width="32"
        height="18"
        viewBox="0 0 32 18"
        fill="none"
        style={{
          flexShrink: 0,
          opacity: 0.5,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Battery Outer Shell */}
        <rect
          x="1"
          y="1"
          width="25"
          height="16"
          rx="3.5"
          stroke={gradeInfo.color}
          strokeWidth="2"
        />
        {/* Battery Right Terminal Tip */}
        <path
          d="M27.5 6V12C28.6 11.4 29.5 10.2 29.5 9C29.5 7.8 28.6 6.6 27.5 6Z"
          fill={gradeInfo.color}
        />
        {/* Battery Inner Bars (1 to 4 bars) */}
        {gradeInfo.bars >= 1 && <rect x="3.5" y="3.5" width="4.5" height="11" rx="1.5" fill={gradeInfo.color} />}
        {gradeInfo.bars >= 2 && <rect x="9.5" y="3.5" width="4.5" height="11" rx="1.5" fill={gradeInfo.color} />}
        {gradeInfo.bars >= 3 && <rect x="15.5" y="3.5" width="4.5" height="11" rx="1.5" fill={gradeInfo.color} />}
        {gradeInfo.bars >= 4 && <rect x="21.5" y="3.5" width="4.5" height="11" rx="1.5" fill={gradeInfo.color} />}
      </svg>

      {/* Percentage Value Just After Battery */}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 800,
          color: gradeInfo.color,
          lineHeight: 1,
          letterSpacing: '-0.2px',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export default BatteryCoverageRing
