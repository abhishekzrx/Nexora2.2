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

  // 2. Data mode: MCQs per Chapter (top chapters sorted by MCQs)
  const mcqsPerChapterData = [...chapterDetails]
    .sort((a, b) => b.realMcqCount - a.realMcqCount)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      label: c.name || c.title,
      subText: `Subject: ${c.subjectName || c.subject || 'General'}`,
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
  let currentTitle = 'Chapters per Subject'

  if (activeTab === 'mcqs-per-chapter') {
    currentGraphData = mcqsPerChapterData
    currentUnit = 'MCQs'
    currentTitle = 'MCQ Question Bank per Chapter'
  } else if (activeTab === 'mcqs-per-subject') {
    currentGraphData = mcqsPerSubjectData
    currentUnit = 'MCQs'
    currentTitle = 'Total MCQs per Subject'
  }

  const maxValue = Math.max(...currentGraphData.map((d) => d.value), 1)
  const totalCount = currentGraphData.reduce((a, b) => a + b.value, 0)

  return (
    <div className="interactive-graph-card">
      {/* 1st Row: Card Title on Left, Total Count Badge on Right (justify-content: space-between) */}
      <div className="graph-top-row">
        <div className="graph-title-wrap">
          <AppIcon name="analyticsTab" size={20} className="graph-header-icon" />
          <div>
            <h3 className="dashboard-section-title">Content Hierarchy Graph</h3>
            <p className="dashboard-section-sub">
              Interactive breakdown of Subjects, Chapters, and MCQ Question Banks
            </p>
          </div>
        </div>

        <div className="graph-summary-badge">
          <span className="summary-lbl">Total {currentUnit}:</span>
          <span className="summary-num">{totalCount}</span>
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
            <AppIcon name="document" size={14} />
            <span>Chapters / Subject</span>
          </button>
          <button
            type="button"
            className={`graph-tab-btn ${activeTab === 'mcqs-per-chapter' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcqs-per-chapter')}
          >
            <AppIcon name="help" size={14} />
            <span>MCQs / Chapter</span>
          </button>
          <button
            type="button"
            className={`graph-tab-btn ${activeTab === 'mcqs-per-subject' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcqs-per-subject')}
          >
            <AppIcon name="mcqs" size={14} />
            <span>MCQs / Subject</span>
          </button>
        </div>
      </div>

      {/* Dynamic Interactive Bar Chart View */}
      <div className="graph-view-container">
        <div className="graph-meta-header">
          <span className="graph-view-title">{currentTitle}</span>
        </div>

        {currentGraphData.length === 0 ? (
          <div className="graph-empty-state">No content items found for this view.</div>
        ) : (
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
