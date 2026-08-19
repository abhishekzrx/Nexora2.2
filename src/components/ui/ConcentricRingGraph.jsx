/**
 * ConcentricRingGraph.jsx
 * Concentric multi-layer ring graph component for Subject analytics.
 * Renders 3 concentric rings:
 * - Outer Ring: Coverage %
 * - Middle Ring: Mastery %
 * - Inner Ring: Accuracy %
 */

import { useState } from 'react'

export function ConcentricRingGraph({
  size = 92,
  coveragePercent = 0,
  masteryPercent = 0,
  accuracyPercent = 0,
  colors = {
    coverage: '#FFFFFF',
    mastery: '#FFD700',
    accuracy: '#34D399',
    track: 'rgba(255, 255, 255, 0.22)',
  },
  showLegend = false,
  className = '',
}) {
  const [hoveredLayer, setHoveredLayer] = useState(null) // 'coverage' | 'mastery' | 'accuracy' | null
  const activeLayer = hoveredLayer || 'coverage'

  const center = size / 2
  const strokeWidth = Math.max(3, Math.round(size * 0.052)) // ~4.8 for size 92
  const gap = strokeWidth + 3

  const rOuter = center - strokeWidth - 1 // Layer 1: Coverage
  const rMid = rOuter - gap // Layer 2: Mastery
  const rInner = rMid - gap // Layer 3: Accuracy

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
    activeLayer === 'mastery'
      ? masPct
      : activeLayer === 'accuracy'
        ? accPct
        : covPct

  const activeLabel =
    activeLayer === 'mastery'
      ? 'Mastery'
      : activeLayer === 'accuracy'
        ? 'Accuracy'
        : 'Coverage'

  const activeColor =
    activeLayer === 'mastery'
      ? colors.mastery
      : activeLayer === 'accuracy'
        ? colors.accuracy
        : colors.coverage

  return (
    <div className={`concentric-ring-wrapper ${className}`.trim()} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
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
            strokeWidth={strokeWidth + (hoveredLayer === 'coverage' ? 1.5 : 0)}
            fill="none"
            strokeDasharray={outerRing.circ}
            strokeDashoffset={outerRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease', cursor: 'pointer' }}
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
            strokeWidth={strokeWidth + (hoveredLayer === 'mastery' ? 1.5 : 0)}
            fill="none"
            strokeDasharray={midRing.circ}
            strokeDashoffset={midRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease', cursor: 'pointer' }}
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
            strokeWidth={strokeWidth + (hoveredLayer === 'accuracy' ? 1.5 : 0)}
            fill="none"
            strokeDasharray={innerRing.circ}
            strokeDashoffset={innerRing.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s ease', cursor: 'pointer' }}
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
              fontSize: size >= 90 ? '8.5px' : '7.5px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: '2px',
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
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: hoveredLayer && hoveredLayer !== 'coverage' ? 0.5 : 1 }}
            onMouseEnter={() => setHoveredLayer('coverage')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.coverage }} />
            Cov {Math.round(covPct)}%
          </span>
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: hoveredLayer && hoveredLayer !== 'mastery' ? 0.5 : 1 }}
            onMouseEnter={() => setHoveredLayer('mastery')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.mastery }} />
            Mas {Math.round(masPct)}%
          </span>
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', opacity: hoveredLayer && hoveredLayer !== 'accuracy' ? 0.5 : 1 }}
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
