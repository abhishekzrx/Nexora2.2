/**
 * SubjectFlashcardsTab.jsx
 * Complete Flashcard experience for Student Subjects section:
 * - Live 3D card preview with instant practice
 * - Recent deck & chapter selection
 * - Fullscreen Focus Mode integration with exit controls
 * - Chapter Flashcards Directory with mastery progress
 */

import { useState, useMemo, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import FlashcardFocusModal from './FlashcardFocusModal'
import {
  getChapterFlashcards,
  getDeckProgress,
  getRecentDeck,
  setRecentDeck,
} from '../../services/flashcardService'

export default function SubjectFlashcardsTab({
  subject,
  courseId,
  allFlashcards = [],
}) {
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false)
  const [focusModalOpen, setFocusModalOpen] = useState(false)
  const [focusChapter, setFocusChapter] = useState(null)

  const chapters = useMemo(() => {
    return Array.isArray(subject?.chapters) ? subject.chapters : []
  }, [subject])

  // Initialize selected chapter with either recent deck or first chapter
  useEffect(() => {
    if (chapters.length === 0) return

    const recent = getRecentDeck()
    if (recent && recent.subjectKey === subject?.key && chapters.some((c) => c.id === recent.chapterId)) {
      setSelectedChapterId(recent.chapterId)
    } else {
      setSelectedChapterId(chapters[0]?.id || chapters[0]?.number || 'ch-1')
    }
  }, [chapters, subject])

  const selectedChapter = useMemo(() => {
    if (!selectedChapterId) return chapters[0] || null
    return chapters.find((c) => c.id === selectedChapterId || c.number === selectedChapterId) || chapters[0] || null
  }, [chapters, selectedChapterId])

  // Load cards for current selected chapter
  const currentDeckCards = useMemo(() => {
    if (!selectedChapter) return []
    return getChapterFlashcards(selectedChapter, subject?.title)
  }, [selectedChapter, subject])

  const currentPreviewCard = useMemo(() => {
    if (currentDeckCards.length === 0) return null
    return currentDeckCards[activeCardIndex] || currentDeckCards[0]
  }, [currentDeckCards, activeCardIndex])

  // Deck progress
  const deckProgress = useMemo(() => {
    if (!selectedChapter) return { mastered: 0, reviewed: 0, total: 0 }
    const prog = getDeckProgress(selectedChapter.id || selectedChapter.number)
    return {
      ...prog,
      total: currentDeckCards.length,
      pct: currentDeckCards.length > 0 ? Math.round((prog.mastered / currentDeckCards.length) * 100) : 0,
    }
  }, [selectedChapter, currentDeckCards])

  const handleSelectChapter = (ch) => {
    setSelectedChapterId(ch.id || ch.number)
    setActiveCardIndex(0)
    setIsPreviewFlipped(false)
    setRecentDeck(subject?.key, ch.id || ch.number)
  }

  const handleStartFocusMode = (ch = selectedChapter) => {
    if (!ch) return
    setFocusChapter(ch)
    setFocusModalOpen(true)
    setRecentDeck(subject?.key, ch.id || ch.number)
  }

  const handlePrevCard = () => {
    setIsPreviewFlipped(false)
    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : currentDeckCards.length - 1))
  }

  const handleNextCard = () => {
    setIsPreviewFlipped(false)
    setActiveCardIndex((prev) => (prev < currentDeckCards.length - 1 ? prev + 1 : 0))
  }

  if (chapters.length === 0) {
    return (
      <div className="flashcard-empty-state">
        <div className="empty-icon-circle">
          <AppIcon name="flashcardsTab" size={32} />
        </div>
        <h3>No Flashcard Decks Yet</h3>
        <p>Flashcards for {subject?.title || 'this subject'} will be populated shortly.</p>
      </div>
    )
  }

  return (
    <div className="subject-flashcards-container">
      {/* 1. TOP HERO: ACTIVE DECK & 3D INTERACTIVE CARD PREVIEW */}
      <div className="flashcard-deck-hero-card">
        <div className="deck-hero-header">
          <div className="deck-hero-title-group">
            <span className="deck-badge">
              ⚡ ACTIVE DECK • CH. {selectedChapter?.number || selectedChapter?.num || 1}
            </span>
            <h2 className="deck-title">{selectedChapter?.name || selectedChapter?.title || 'Chapter Flashcards'}</h2>
            <div className="deck-meta-row">
              <span className="deck-card-count">
                <AppIcon name="flashcardsTab" size={14} />
                {currentDeckCards.length} Flashcards
              </span>
              <span className="deck-mastery-chip">
                {deckProgress.mastered} / {currentDeckCards.length} Mastered ({deckProgress.pct}%)
              </span>
            </div>
          </div>

          <button
            type="button"
            className="launch-focus-mode-btn"
            onClick={() => handleStartFocusMode(selectedChapter)}
            title="Open distraction-free fullscreen focus mode"
          >
            <span className="btn-pulse-ring" />
            <AppIcon name="fullscreen" size={18} />
            <span>Focus Mode</span>
          </button>
        </div>

        {/* 2. LIVE 3D INTERACTIVE FLIP CARD */}
        {currentPreviewCard ? (
          <div className="card-preview-stage">
            <div
              className={`interactive-flip-card ${isPreviewFlipped ? 'flipped' : ''}`}
              onClick={() => setIsPreviewFlipped((f) => !f)}
            >
              <div className="flip-card-inner">
                {/* Front Side */}
                <div className="flip-card-face card-face-front">
                  <div className="face-header-row">
                    <span className="face-tag">{currentPreviewCard.tag || 'Question'}</span>
                    <span className="card-counter-pill">
                      {activeCardIndex + 1} / {currentDeckCards.length}
                    </span>
                  </div>

                  <div className="face-body">
                    <p className="card-question-text">{currentPreviewCard.front}</p>
                  </div>

                  <div className="face-footer">
                    <span className="tap-flip-hint">
                      <AppIcon name="flip" size={14} /> Tap or click to reveal answer
                    </span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="flip-card-face card-face-back">
                  <div className="face-header-row">
                    <span className="face-tag back">Answer & Key Concepts</span>
                    <span className="card-counter-pill">
                      {activeCardIndex + 1} / {currentDeckCards.length}
                    </span>
                  </div>

                  <div className="face-body">
                    <p className="card-answer-text">{currentPreviewCard.back}</p>
                  </div>

                  <div className="face-footer">
                    <span className="tap-flip-hint">
                      <AppIcon name="flip" size={14} /> Tap to flip back
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Navigation Controls */}
            <div className="card-preview-nav-bar">
              <button
                type="button"
                className="preview-nav-btn"
                onClick={handlePrevCard}
                title="Previous card"
              >
                <AppIcon name="chevronLeft" size={18} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                className="preview-flip-action-btn"
                onClick={() => setIsPreviewFlipped((f) => !f)}
              >
                <AppIcon name="flip" size={18} />
                <span>{isPreviewFlipped ? 'Show Question' : 'Reveal Answer'}</span>
              </button>

              <button
                type="button"
                className="preview-nav-btn"
                onClick={handleNextCard}
                title="Next card"
              >
                <span>Next</span>
                <AppIcon name="chevronRight" size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. ALL CHAPTER DECKS DIRECTORY */}
      <div className="flashcards-directory-section">
        <div className="directory-header">
          <div>
            <h3 className="directory-title">Subject Chapter Decks</h3>
            <p className="directory-subtitle">Select any chapter to preview or launch Focus Mode</p>
          </div>
          <span className="directory-count-badge">{chapters.length} Decks</span>
        </div>

        <div className="chapter-decks-grid">
          {chapters.map((ch, idx) => {
            const isSelected = (ch.id || ch.number) === selectedChapterId
            const cards = getChapterFlashcards(ch, subject?.title)
            const prog = getDeckProgress(ch.id || ch.number)
            const cardCount = cards.length
            const mastered = prog.mastered || 0
            const pct = cardCount > 0 ? Math.round((mastered / cardCount) * 100) : 0

            return (
              <div
                key={ch.id || ch.number || idx}
                className={`chapter-deck-card ${isSelected ? 'active-deck' : ''}`}
                onClick={() => handleSelectChapter(ch)}
              >
                <div className="deck-card-top">
                  <div className="deck-card-info">
                    <span className="deck-card-num">Chapter {ch.number || ch.num || idx + 1}</span>
                    <h4 className="deck-card-name">{ch.name || ch.title}</h4>
                  </div>
                  <span className={`deck-mastery-badge ${pct >= 80 ? 'high' : pct > 0 ? 'med' : 'new'}`}>
                    {pct > 0 ? `${pct}% Mastered` : 'Not Started'}
                  </span>
                </div>

                <div className="deck-card-progress-bar">
                  <div className="deck-progress-fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="deck-card-bottom">
                  <span className="deck-card-total">
                    <AppIcon name="flashcardsTab" size={13} />
                    {cardCount} Cards
                  </span>

                  <button
                    type="button"
                    className="deck-practice-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartFocusMode(ch)
                    }}
                    title="Launch Focus Mode"
                  >
                    <span>Practice Focus</span>
                    <span className="arrow-icon">➔</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. FULLSCREEN FOCUS MODE MODAL */}
      {focusModalOpen && focusChapter && (
        <FlashcardFocusModal
          chapter={focusChapter}
          cards={getChapterFlashcards(focusChapter, subject?.title)}
          onClose={() => setFocusModalOpen(false)}
          onDeckCompleted={() => {
            // refresh progress
          }}
        />
      )}
    </div>
  )
}
