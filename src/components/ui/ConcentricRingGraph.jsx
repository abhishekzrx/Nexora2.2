/**
 * ConcentricRingGraph.jsx
 * Concentric multi-layer ring graph component for Subject analytics.
 * Renders 3 concentric rings:
 * - Outer Ring: Coverage %
 * - Middle Ring: Mastery %
 * - Inner Ring: Accuracy %
 *
 * Dynamically reacts to selected active metric (Readiness, Accuracy, Coverage, Mastery).
 */

import { useState } from 'react'

export function ConcentricRingGraph({
  size = 92,
  focusMetric = 'readiness', // 'readiness' | 'coverage' | 'mastery' | 'accuracy'
  readinessPercent = 0,
  coveragePercent = 0,
  masteryPercent = 0,
  accuracyPercent = 0,
  colors = {
    readiness: '#F1621B',
    coverage: '#FFFFFF',
    mastery: '#FBBF24',
    accuracy: '#34D399',
    track: 'rgba(255, 255, 255, 0.22)',
  },
  showLegend = false,
  className = '',
}) {
  const [hoveredLayer, setHoveredLayer] = useState(null)
  const activeLayer = (hoveredLayer || focusMetric || 'readiness').toLowerCase()

  const center = size / 2
  const strokeWidth = Math.max(3, Math.round(size * 0.052))
  const gap = strokeWidth + 3

  const rOuter = center - strokeWidth - 1 // Layer 1: Coverage
  const rMid = rOuter - gap // Layer 2: Mastery
  const rInner = rMid - gap // Layer 3: Accuracy

  const redPct = Math.max(0, Math.min(100, Number(readinessPercent) || 0))
  const covPct = Math.max(0, Math.min(100, Number(coveragePercent) || 0))
  const masPct = Math.max(0, Math.min(100, Number(masteryPercent) || 0))
  const accPct = Math.max(0, Math.min(100, Number(accuracyPercent) || 0))

  const getRingData = (r, pct) => {
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    return { circ, offset }
  }

  const outerRing = getRingData(rOuter, covPct)
  const midRing = getRingData(rMid, masPct)
  const innerRing = getRingData(rInner, accPct)

  const activeValue =
    activeLayer === 'readiness'
      ? redPct
      : activeLayer === 'mastery'
      ? masPct
      : activeLayer === 'accuracy'
      ? accPct
      : covPct

  const activeLabel =
    activeLayer === 'readiness'
      ? 'Readiness'
      : activeLayer === 'mastery'
      ? 'Mastery'
      : activeLayer === 'accuracy'
      ? 'Accuracy'
      : 'Coverage'

  const activeColor =
    activeLayer === 'readiness'
      ? colors.readiness || '#F1621B'
      : activeLayer === 'mastery'
      ? colors.mastery
      : activeLayer === 'accuracy'
      ? colors.accuracy
      : colors.coverage

  return (
    <div
      className={`concentric-ring-wrapper ${className}`.trim()}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
    >
      <div className="concentric-ring-container" style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Layer 1: Coverage (Outer Ring) */}
          <circle
            cx={center}
            cy={center}
            r={rOuter}
            stroke={colors.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={rOuter}
            stroke={colors.coverage}
            strokeWidth={strokeWidth + (activeLayer === 'coverage' ? 1.8 : 0)}
            opacity={activeLayer === 'readiness' || activeLayer === 'coverage' ? 1 : 0.35}
            fill="none"
            strokeDasharray={outerRing.circ}
            strokeDashoffset={outerRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease, opacity 0.2s ease', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredLayer('coverage')}
            onMouseLeave={() => setHoveredLayer(null)}
          />

          {/* Layer 2: Mastery (Middle Ring) */}
          <circle
            cx={center}
            cy={center}
            r={rMid}
            stroke={colors.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={rMid}
            stroke={colors.mastery}
            strokeWidth={strokeWidth + (activeLayer === 'mastery' ? 1.8 : 0)}
            opacity={activeLayer === 'readiness' || activeLayer === 'mastery' ? 1 : 0.35}
            fill="none"
            strokeDasharray={midRing.circ}
            strokeDashoffset={midRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease, opacity 0.2s ease', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredLayer('mastery')}
            onMouseLeave={() => setHoveredLayer(null)}
          />

          {/* Layer 3: Accuracy (Inner Ring) */}
          <circle
            cx={center}
            cy={center}
            r={rInner}
            stroke={colors.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={rInner}
            stroke={colors.accuracy}
            strokeWidth={strokeWidth + (activeLayer === 'accuracy' ? 1.8 : 0)}
            opacity={activeLayer === 'readiness' || activeLayer === 'accuracy' ? 1 : 0.35}
            fill="none"
            strokeDasharray={innerRing.circ}
            strokeDashoffset={innerRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease, opacity 0.2s ease', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredLayer('accuracy')}
            onMouseLeave={() => setHoveredLayer(null)}
          />
        </svg>

        {/* Center Text Display */}
        <div
          className="concentric-ring-center"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            className="concentric-val"
            style={{
              fontSize: size >= 90 ? '16px' : '12px',
              fontWeight: 800,
              lineHeight: 1,
              color: activeColor,
              transition: 'color 0.2s ease',
            }}
          >
            {Math.round(activeValue)}%
          </span>
          <span
            className="concentric-lbl"
            style={{
              fontSize: size >= 90 ? '8px' : '7px',
              fontWeight: 750,
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {activeLabel}
          </span>
        </div>
      </div>

      {showLegend && (
        <div
          className="concentric-legend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '9.5px',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              fontWeight: activeLayer === 'coverage' ? 800 : 500,
              opacity: activeLayer !== 'readiness' && activeLayer !== 'coverage' ? 0.45 : 1,
              transition: 'opacity 0.2s ease, font-weight 0.15s ease',
            }}
            onMouseEnter={() => setHoveredLayer('coverage')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.coverage }} />
            Cov {Math.round(covPct)}%
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              fontWeight: activeLayer === 'mastery' ? 800 : 500,
              opacity: activeLayer !== 'readiness' && activeLayer !== 'mastery' ? 0.45 : 1,
              transition: 'opacity 0.2s ease, font-weight 0.15s ease',
            }}
            onMouseEnter={() => setHoveredLayer('mastery')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.mastery }} />
            Mas {Math.round(masPct)}%
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              fontWeight: activeLayer === 'accuracy' ? 800 : 500,
              opacity: activeLayer !== 'readiness' && activeLayer !== 'accuracy' ? 0.45 : 1,
              transition: 'opacity 0.2s ease, font-weight 0.15s ease',
            }}
            onMouseEnter={() => setHoveredLayer('accuracy')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accuracy }} />
            Acc {Math.round(accPct)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default ConcentricRingGraph
