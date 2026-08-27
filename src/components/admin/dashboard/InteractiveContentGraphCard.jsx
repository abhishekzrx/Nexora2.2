/**
 * InteractiveContentGraphCard.jsx
 * Single interactive graph view allowing admins to switch between:
 * 1. Chapters per Subject
 * 2. MCQs per Chapter
 * 3. Total Content Volume per Subject
 * Header reorganized into 2 rows: Top row (Title & Total count justify-between), 2nd row (Type Tabs).
 */
import { useState } from 'react'
import AppIcon from '../../ui/AppIcon'

export default function InteractiveContentGraphCard({ analytics }) {
  const [activeTab, setActiveTab] = useState('chapters-per-subject')
  const [chartStyle, setChartStyle] = useState('bar') // 'bar' | 'donut' | 'proportion'

  const { subjectBreakdown = [], chapterDetails = [] } = analytics

  // 1. Data mode: Chapters per Subject
  const chaptersPerSubjectData = subjectBreakdown.map((s) => ({
    id: s.id,
    label: s.name,
    subText: `${s.mcqsCount} MCQs · ${s.flashcardsCount} Flashcards`,
    value: s.chaptersCount,
    unit: 'Chapters',
    color: s.color || '#2E5CE6',
  }))

  // 2. Data mode: MCQs per Chapter
  const mcqsPerChapterData = [...chapterDetails]
    .sort((a, b) => b.realMcqCount - a.realMcqCount)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      label: c.name || c.title,
      subText: `${c.subjectName || c.subject || 'General'}`,
      value: c.realMcqCount,
      unit: 'MCQs',
      color: c.realMcqCount >= 20 ? '#12B76A' : c.realMcqCount >= 5 ? '#F59E0B' : '#EF4444',
    }))

  // 3. Data mode: Total MCQs per Subject
  const mcqsPerSubjectData = subjectBreakdown.map((s) => ({
    id: s.id,
    label: s.name,
    subText: `${s.chaptersCount} Chapters`,
    value: s.mcqsCount,
    unit: 'MCQs',
    color: s.color || '#F1621B',
  }))

  let currentGraphData = chaptersPerSubjectData
  let currentUnit = 'Chapters'
  let currentTitle = 'Chapters Distribution per Subject'

  if (activeTab === 'mcqs-per-chapter') {
    currentGraphData = mcqsPerChapterData
    currentUnit = 'MCQs'
    currentTitle = 'Top Chapter Question Bank'
  } else if (activeTab === 'mcqs-per-subject') {
    currentGraphData = mcqsPerSubjectData
    currentUnit = 'MCQs'
    currentTitle = 'Total Question Volume per Subject'
  }

  const maxValue = Math.max(...currentGraphData.map((d) => d.value), 1)
  const totalCount = currentGraphData.reduce((a, b) => a + b.value, 0)

  // Donut SVG Calculations
  const donutArcs = () => {
    if (totalCount === 0) return []
    let accumulatedAngle = 0
    return currentGraphData.map((item) => {
      const pct = item.value / totalCount
      const dashLength = pct * 282.74 // 2 * PI * 45
      const dashOffset = -accumulatedAngle * 282.74
      accumulatedAngle += pct
      return {
        ...item,
        pct: Math.round(pct * 100),
        dashLength,
        dashOffset,
      }
    })
  }

  return (
    <div className="interactive-graph-card">
      {/* 1st Row: Title on Left, Total Count & Chart Style Toggle on Right */}
      <div className="graph-top-row">
        <div className="graph-title-wrap">
          <AppIcon name="analyticsTab" size={18} className="graph-header-icon" />
          <h3 className="dashboard-section-title">Content Analytics Studio</h3>
        </div>

        <div className="graph-top-right-controls">
          {/* Chart Style Switcher (Bar, Donut, Stacked) */}
          <div className="chart-style-switcher">
            <button
              type="button"
              className={`chart-style-btn ${chartStyle === 'bar' ? 'active' : ''}`}
              onClick={() => setChartStyle('bar')}
              title="Horizontal Bar View"
            >
              <AppIcon name="viewList" size={14} />
            </button>
            <button
              type="button"
              className={`chart-style-btn ${chartStyle === 'donut' ? 'active' : ''}`}
              onClick={() => setChartStyle('donut')}
              title="Donut Chart View"
            >
              <AppIcon name="target" size={14} />
            </button>
            <button
              type="button"
              className={`chart-style-btn ${chartStyle === 'proportion' ? 'active' : ''}`}
              onClick={() => setChartStyle('proportion')}
              title="Segment Proportion View"
            >
              <AppIcon name="analyticsTab" size={14} />
            </button>
          </div>

          <div className="graph-summary-badge">
            <span className="summary-lbl">Total {currentUnit}:</span>
            <span className="summary-num">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* 2nd Row: Full-width Type Selector Tabs */}
      <div className="graph-tabs-row">
        <div className="graph-type-tabs-full">
          <button
            type="button"
            className={`graph-tab-btn ${activeTab === 'chapters-per-subject' ? 'active' : ''}`}
            onClick={() => setActiveTab('chapters-per-subject')}
          >
            <AppIcon name="document" size={13} />
            <span>Chapters / Subject</span>
          </button>
          <button
            type="button"
            className={`graph-tab-btn ${activeTab === 'mcqs-per-chapter' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcqs-per-chapter')}
          >
            <AppIcon name="help" size={13} />
            <span>MCQs / Chapter</span>
          </button>
          <button
            type="button"
            className={`graph-tab-btn ${activeTab === 'mcqs-per-subject' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcqs-per-subject')}
          >
            <AppIcon name="mcqs" size={13} />
            <span>MCQs / Subject</span>
          </button>
        </div>
      </div>

      {/* Dynamic Graph Rendering Container */}
      <div className="graph-view-container">
        <div className="graph-meta-header">
          <span className="graph-view-title">{currentTitle}</span>
        </div>

        {currentGraphData.length === 0 ? (
          <div className="graph-empty-state">No content items available for this course view.</div>
        ) : chartStyle === 'donut' ? (
          /* DONUT CHART MODE */
          <div className="donut-chart-layout">
            <div className="donut-svg-wrap">
              <svg viewBox="0 0 120 120" className="donut-chart-svg">
                <circle cx="60" cy="60" r="45" fill="none" stroke="#F1F5F9" strokeWidth="16" />
                {donutArcs().map((arc) => (
                  <circle
                    key={arc.id}
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="16"
                    strokeDasharray={`${arc.dashLength} 282.74`}
                    strokeDashoffset={arc.dashOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'all 0.4s ease' }}
                  />
                ))}
              </svg>
              <div className="donut-center-info">
                <span className="donut-total-val">{totalCount}</span>
                <span className="donut-total-lbl">{currentUnit}</span>
              </div>
            </div>

            <div className="donut-legend-grid">
              {donutArcs().map((arc) => (
                <div key={arc.id} className="donut-legend-item">
                  <span className="legend-dot" style={{ background: arc.color }} />
                  <div className="legend-texts">
                    <span className="legend-name">{arc.label}</span>
                    <span className="legend-val">
                      {arc.value} {arc.unit} ({arc.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : chartStyle === 'proportion' ? (
          /* STACKED PROPORTION SEGMENT MODE */
          <div className="proportion-chart-layout">
            <div className="proportion-bar-track">
              {donutArcs().map((arc) => (
                <div
                  key={arc.id}
                  className="proportion-bar-segment"
                  style={{
                    width: `${arc.pct}%`,
                    background: arc.color,
                  }}
                  title={`${arc.label}: ${arc.value} ${arc.unit} (${arc.pct}%)`}
                >
                  {arc.pct > 8 && <span className="segment-label">{arc.pct}%</span>}
                </div>
              ))}
            </div>

            <div className="proportion-cards-list">
              {currentGraphData.map((item) => {
                const pct = Math.round((item.value / (totalCount || 1)) * 100)
                return (
                  <div key={item.id} className="prop-card">
                    <span className="prop-card-dot" style={{ background: item.color }} />
                    <div className="prop-card-main">
                      <span className="prop-card-name">{item.label}</span>
                      <span className="prop-card-sub">{item.subText}</span>
                    </div>
                    <div className="prop-card-val-group">
                      <span className="prop-card-num">{item.value}</span>
                      <span className="prop-card-pct">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* DEFAULT DYNAMIC BAR CHART MODE */
          <div className="graph-bars-wrapper">
            {currentGraphData.map((item) => {
              const barPct = Math.max(6, Math.round((item.value / maxValue) * 100))

              return (
                <div key={item.id} className="graph-bar-row">
                  <div className="graph-bar-info">
                    <span className="graph-bar-label" title={item.label}>
                      {item.label}
                    </span>
                    <span className="graph-bar-sub">{item.subText}</span>
                  </div>

                  <div className="graph-bar-track-wrap">
                    <div className="graph-bar-track">
                      <div
                        className="graph-bar-fill"
                        style={{
                          width: `${barPct}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                    <span className="graph-bar-val">
                      {item.value} {item.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
