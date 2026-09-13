/**
 * ChapterPracticeModeModal.jsx
 * Dedicated Minimalist MCQ Practice Set Selection Modal for Chapter Practice.
 * Aligned with Nexora's core brand color theme (Flame Orange, Midnight Slate & Glassmorphism).
 */

import { useState, useMemo } from 'react'
import '../../styles/chapterMaster.css'
import AppIcon from '../ui/AppIcon'
import { getFlatConceptsForChapter } from '../../services/knowledgeHierarchyService'

const SET_OPTIONS = [
  { id: 'set_10', count: 10, label: '10 MCQs', time: '~10 mins', icon: 'bolt' },
  { id: 'set_20', count: 20, label: '20 MCQs', time: '~20 mins', icon: 'target', isPopular: true },
  { id: 'set_30', count: 30, label: '30 MCQs', time: '~30 mins', icon: 'trophy' },
  { id: 'set_all', count: 'all', label: 'All MCQs', time: 'Full Pool', icon: 'layers' },
]

export default function ChapterPracticeModeModal({
  chapter,
  subjectTitle = '',
  isOpen = false,
  onClose = () => {},
  onLaunchPractice = () => {},
  onOpenMasterView = () => {},
}) {
  const [selectedSetId, setSelectedSetId] = useState('set_20')
  const [isCustom, setIsCustom] = useState(false)
  const [customCount, setCustomCount] = useState(25)
  const [selectedConceptId, setSelectedConceptId] = useState('')

  const flatConcepts = useMemo(() => {
    return getFlatConceptsForChapter(chapter, subjectTitle)
  }, [chapter, subjectTitle])

  const totalChapterMcqs = useMemo(() => {
    if (!chapter) return 0
    return Number(chapter.totalMcqs ?? (typeof chapter.mcqs === 'number' ? chapter.mcqs : 0)) || 0
  }, [chapter])

  if (!isOpen || !chapter) return null

  const getEffectiveCount = () => {
    if (isCustom) return Math.max(1, Number(customCount) || 10)
    const opt = SET_OPTIONS.find((s) => s.id === selectedSetId)
    if (!opt) return 20
    if (opt.count === 'all') {
      return totalChapterMcqs > 0 ? totalChapterMcqs : 'all'
    }
    return opt.count
  }

  const effectiveCount = getEffectiveCount()
  const displayCountLabel = effectiveCount === 'all'
    ? (totalChapterMcqs > 0 ? `${totalChapterMcqs} MCQs` : 'All MCQs')
    : `${effectiveCount} MCQs`

  const handleSelectOption = (optId) => {
    setIsCustom(false)
    setSelectedSetId(optId)
  }

  const handleLaunch = () => {
    onClose()
    const finalCount = isCustom
      ? Math.max(1, Number(customCount) || 10)
      : (SET_OPTIONS.find((s) => s.id === selectedSetId)?.count || 20)

    onLaunchPractice({
      count: finalCount,
      mode: 'adaptive',
      selectedConceptId: selectedConceptId || null,
      chapter,
    })
  }

  return (
    <div className="ps-modal-overlay" onClick={onClose}>
      <div
        className="ps-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Core-Theme Header */}
        <div className="ps-modal-header">
          <div className="ps-title-area">
            <div className="ps-badge-row">
              <span className="ps-chap-badge">Ch {chapter.number || chapter.num || '01'}</span>
              <span className="ps-subject-badge">{subjectTitle || chapter.subject || 'Subject'}</span>
              {totalChapterMcqs > 0 && (
                <span className="ps-pool-badge">{totalChapterMcqs} Qs Total</span>
              )}
            </div>
            <h2 className="ps-modal-title">Select Practice Set</h2>
          </div>
          <button type="button" className="ps-close-btn" onClick={onClose} aria-label="Close modal">
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Minimal Core-Themed Body */}
        <div className="ps-modal-body">
          {/* 2x2 Grid of Minimalist Set Tiles */}
          <div className="ps-tile-grid">
            {SET_OPTIONS.map((opt) => {
              const isSelected = !isCustom && selectedSetId === opt.id
              const subText = opt.count === 'all' && totalChapterMcqs > 0
                ? `${totalChapterMcqs} Qs`
                : opt.time

              return (
                <div
                  key={opt.id}
                  className={`ps-tile${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectOption(opt.id)}
                >
                  {opt.isPopular && <span className="ps-tile-popular">RECOMMENDED</span>}
                  <div className="ps-tile-icon-box">
                    <AppIcon name={opt.icon} size={18} />
                  </div>
                  <div className="ps-tile-info">
                    <span className="ps-tile-title">{opt.label}</span>
                    <span className="ps-tile-sub">{subText}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Minimal Custom Slider Strip */}
          <div
            className={`ps-custom-strip${isCustom ? ' active' : ''}`}
            onClick={() => setIsCustom(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div className="ps-custom-icon-box">
                <AppIcon name="filter" size={12} />
              </div>
              <span className="ps-custom-label">
                Custom Quantity
              </span>
            </div>

            {isCustom ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="range"
                  min="5"
                  max={Math.max(50, totalChapterMcqs || 50)}
                  step="5"
                  value={customCount}
                  onChange={(e) => setCustomCount(Number(e.target.value))}
                  className="ps-slider"
                />
                <input
                  type="number"
                  min="1"
                  max={Math.max(100, totalChapterMcqs || 100)}
                  value={customCount}
                  onChange={(e) => setCustomCount(Math.max(1, Number(e.target.value) || 1))}
                  className="ps-number-input"
                />
              </div>
            ) : (
              <span className="ps-custom-hint">Choose Qs →</span>
            )}
          </div>

          {/* Optional Concept Filter */}
          {flatConcepts.length > 0 && (
            <div className="ps-concept-filter-row">
              <label className="ps-concept-label">
                Focus:
              </label>
              <select
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                className="ps-concept-select"
              >
                <option value="">All Chapter Concepts (Balanced)</option>
                {flatConcepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Core-Themed Footer */}
        <div className="ps-modal-footer">
          {onOpenMasterView && (
            <button
              type="button"
              className="ps-btn-secondary"
              onClick={() => {
                onClose()
                onOpenMasterView(chapter)
              }}
            >
              <AppIcon name="analyticsTab" size={13} />
              Analytics
            </button>
          )}

          <button
            type="button"
            className="ps-btn-primary"
            onClick={handleLaunch}
          >
            <AppIcon name="play" size={14} />
            Start Practice ({displayCountLabel})
          </button>
        </div>
      </div>
    </div>
  )
}
