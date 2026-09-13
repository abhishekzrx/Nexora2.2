/**
 * ChapterPracticeModeModal.jsx
 * Dedicated Practice Mode Selection Modal for Chapter-Wise Practice.
 * Allows choosing between Adaptive 20 Qs, Targeted Concept, Rapid Revision, High-Difficulty, and Flashcards.
 */

import { useState, useMemo } from 'react'
import '../../styles/chapterMaster.css'
import AppIcon from '../ui/AppIcon'
import { PRACTICE_MODES } from '../../services/adaptivePracticeEngine'
import { getFlatConceptsForChapter } from '../../services/knowledgeHierarchyService'

export default function ChapterPracticeModeModal({
  chapter,
  subjectTitle = '',
  isOpen = false,
  onClose = () => {},
  onLaunchPractice = () => {},
  onOpenFlashcards = () => {},
  onOpenMasterView = () => {},
}) {
  const [selectedModeKey, setSelectedModeKey] = useState('adaptive')
  const [selectedConceptId, setSelectedConceptId] = useState('')

  const flatConcepts = useMemo(() => {
    return getFlatConceptsForChapter(chapter, subjectTitle)
  }, [chapter, subjectTitle])

  if (!isOpen || !chapter) return null

  const handleLaunch = () => {
    onClose()
    if (selectedModeKey === 'flashcards') {
      onOpenFlashcards(chapter)
    } else {
      onLaunchPractice(selectedModeKey, {
        selectedConceptId: selectedModeKey === 'targeted' ? selectedConceptId : null,
      })
    }
  }

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div
        className="cm-modal-card"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cm-modal-header">
          <div className="cm-title-area">
            <div className="cm-chap-badge-row">
              <span className="cm-chap-num-badge">Ch {chapter.number || chapter.num || '01'}</span>
              <span className="cm-modal-subtitle">{subjectTitle || chapter.subject || 'Subject'}</span>
            </div>
            <h2 className="cm-modal-title" style={{ fontSize: 18 }}>Select Practice Mode</h2>
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close modal">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {/* Body: Mode Selection List */}
        <div className="cm-modal-body" style={{ gap: 12 }}>
          {Object.values(PRACTICE_MODES).map((mode) => {
            const isSelected = selectedModeKey === mode.id
            return (
              <div
                key={mode.id}
                onClick={() => setSelectedModeKey(mode.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(19, 27, 38, 0.6)',
                  border: `1px solid ${isSelected ? '#f97316' : 'rgba(255, 255, 255, 0.08)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isSelected ? '#f97316' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#ffffff' : '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AppIcon name={mode.icon} size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                      {mode.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#f97316' : '#94a3b8',
                      }}
                    >
                      {mode.badge}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                    {mode.description}
                  </p>

                  {/* Concept dropdown if targeted mode is selected */}
                  {isSelected && mode.id === 'targeted' && flatConcepts.length > 0 && (
                    <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#f97316', display: 'block', marginBottom: 4 }}>
                        Select Target Concept:
                      </label>
                      <select
                        value={selectedConceptId}
                        onChange={(e) => setSelectedConceptId(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0b111a',
                          border: '1px solid rgba(249, 115, 22, 0.4)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#ffffff',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      >
                        <option value="">All Chapter Concepts (Balanced)</option>
                        {flatConcepts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.topicName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="cm-modal-footer">
          <button
            type="button"
            className="cm-btn-secondary"
            onClick={() => {
              onClose()
              onOpenMasterView(chapter)
            }}
          >
            <AppIcon name="analyticsTab" size={14} />
            View Concept Master View
          </button>

          <button
            type="button"
            className="cm-btn-primary"
            onClick={handleLaunch}
          >
            <AppIcon name="play" size={15} />
            Launch Practice
          </button>
        </div>
      </div>
    </div>
  )
}
