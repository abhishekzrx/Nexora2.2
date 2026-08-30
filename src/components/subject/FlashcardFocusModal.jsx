/**
 * FlashcardFocusModal.jsx
 * Fullscreen Distraction-Free Focus Mode for Flashcard Practice.
 *
 * Implements:
 * - Fullscreen immersive study environment with exit trigger
 * - Smooth 3D card flip with question front & answer back
 * - Spaced Repetition response buttons (Again, Hard, Good, Easy)
 * - Keyboard navigation (Space to Flip, 1-4 to Rate, Esc to Exit)
 * - Completion celebration and deck mastery summary
 */

import { useState, useEffect, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import { recordCardRating, getDeckProgress } from '../../services/flashcardService'

export default function FlashcardFocusModal({ chapter, cards = [], onClose, onDeckCompleted }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [ratings, setRatings] = useState({})
  const [streak, setStreak] = useState(0)

  const currentCard = cards[currentIndex] || {}
  const totalCards = cards.length
  const progressPct = totalCards > 0 ? Math.round(((currentIndex) / totalCards) * 100) : 0

  // Reset flip when navigating to new card
  useEffect(() => {
    setIsFlipped(false)
  }, [currentIndex])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleRate = useCallback(
    (rating) => {
      if (!currentCard.id) return

      // Save to persistence
      recordCardRating(chapter?.id || chapter?.number, currentCard.id, rating)

      setRatings((prev) => ({ ...prev, [currentCard.id]: rating }))
      if (rating === 'good' || rating === 'easy') {
        setStreak((s) => s + 1)
      } else {
        setStreak(0)
      }

      if (currentIndex + 1 < totalCards) {
        setCurrentIndex((idx) => idx + 1)
      } else {
        setCompleted(true)
        onDeckCompleted?.()
      }
    },
    [currentCard.id, chapter, currentIndex, totalCards, onDeckCompleted]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      if (completed) return

      if (e.code === 'Space') {
        e.preventDefault()
        handleFlip()
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again')
        else if (e.key === '2') handleRate('hard')
        else if (e.key === '3') handleRate('good')
        else if (e.key === '4') handleRate('easy')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleFlip, handleRate, isFlipped, completed, onClose])

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setCompleted(false)
    setRatings({})
  }

  const masteredCount = Object.values(ratings).filter((r) => r === 'good' || r === 'easy').length

  return (
    <div className="flashcard-focus-modal-backdrop">
      <div className="flashcard-focus-modal-container">
        {/* Top Header Bar */}
        <header className="focus-modal-header">
          <div className="focus-header-left">
            <div className="focus-mode-badge">
              <span className="focus-pulse-dot" />
              <span>FOCUS MODE</span>
            </div>
            <div className="focus-deck-info">
              <span className="focus-deck-num">Ch. {chapter?.number || chapter?.num || 1}</span>
              <h2 className="focus-deck-title">{chapter?.name || chapter?.title || 'Flashcards Deck'}</h2>
            </div>
          </div>

          <div className="focus-header-center">
            <span className="focus-counter-text">
              Card <strong>{Math.min(currentIndex + 1, totalCards)}</strong> of {totalCards}
            </span>
          </div>

          <div className="focus-header-right">
            {streak > 1 && (
              <span className="focus-streak-pill">
                🔥 {streak} Streak
              </span>
            )}
            <button
              type="button"
              className="focus-exit-btn"
              onClick={onClose}
              title="Exit Focus Mode (Esc)"
            >
              <span>Exit Focus Mode</span>
              <span className="exit-icon">✕</span>
            </button>
          </div>
        </header>

        {/* Top Linear Progress Indicator */}
        <div className="focus-progress-track">
          <div
            className="focus-progress-fill"
            style={{ width: `${completed ? 100 : progressPct}%` }}
          />
        </div>

        {/* Main Content Area */}
        <main className="focus-stage">
          {completed ? (
            <div className="focus-completion-card">
              <div className="completion-trophy-icon">🎉</div>
              <h3 className="completion-title">Deck Completed!</h3>
              <p className="completion-subtitle">
                Great job reviewing <strong>{chapter?.name || chapter?.title}</strong>
              </p>

              <div className="completion-stats-grid">
                <div className="completion-stat-box">
                  <span className="comp-stat-val" style={{ color: '#10B981' }}>{masteredCount}</span>
                  <span className="comp-stat-lbl">Mastered Cards</span>
                </div>
                <div className="completion-stat-box">
                  <span className="comp-stat-val" style={{ color: '#2E5CE6' }}>{totalCards}</span>
                  <span className="comp-stat-lbl">Total Cards Reviewed</span>
                </div>
                <div className="completion-stat-box">
                  <span className="comp-stat-val" style={{ color: '#F1621B' }}>
                    {totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0}%
                  </span>
                  <span className="comp-stat-lbl">Retention Score</span>
                </div>
              </div>

              <div className="completion-actions-row">
                <button
                  type="button"
                  className="completion-btn secondary"
                  onClick={handleRestart}
                >
                  🔄 Practice Again
                </button>
                <button
                  type="button"
                  className="completion-btn primary"
                  onClick={onClose}
                >
                  Done & Exit
                </button>
              </div>
            </div>
          ) : (
            <div className="focus-card-wrapper">
              {/* 3D Flip Card */}
              <div
                className={`focus-flip-card ${isFlipped ? 'flipped' : ''}`}
                onClick={handleFlip}
              >
                <div className="focus-flip-inner">
                  {/* Front Side */}
                  <div className="focus-card-face focus-card-front">
                    <div className="face-top-row">
                      <span className="face-tag-pill">{currentCard.tag || 'Question Prompt'}</span>
                      <span className="face-hint-pill">Tap card or Spacebar to flip</span>
                    </div>

                    <div className="face-content">
                      <h3 className="face-prompt-text">{currentCard.front}</h3>
                    </div>

                    <div className="face-bottom-row">
                      <span className="flip-prompt-indicator">
                        <span className="flip-icon">🔄</span> Click to Reveal Answer
                      </span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="focus-card-face focus-card-back">
                    <div className="face-top-row">
                      <span className="face-tag-pill back-tag">Answer & Key Takeaways</span>
                      <span className="face-hint-pill">Rate retention below</span>
                    </div>

                    <div className="face-content">
                      <p className="face-answer-text">{currentCard.back}</p>
                    </div>

                    <div className="face-bottom-row">
                      <span className="flip-prompt-indicator">
                        <span className="flip-icon">🔄</span> Click to Flip Back
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spaced Repetition Response Controls */}
              <div className="focus-rating-bar">
                {!isFlipped ? (
                  <button
                    type="button"
                    className="focus-reveal-answer-btn"
                    onClick={handleFlip}
                  >
                    <span>Show Answer</span>
                    <span className="key-hint-chip">Space</span>
                  </button>
                ) : (
                  <div className="spaced-repetition-buttons">
                    <button
                      type="button"
                      className="srs-btn btn-again"
                      onClick={() => handleRate('again')}
                    >
                      <span className="srs-label">🔴 Again</span>
                      <span className="srs-sub">&lt; 1m</span>
                      <span className="srs-key">1</span>
                    </button>

                    <button
                      type="button"
                      className="srs-btn btn-hard"
                      onClick={() => handleRate('hard')}
                    >
                      <span className="srs-label">🟡 Hard</span>
                      <span className="srs-sub">&lt; 10m</span>
                      <span className="srs-key">2</span>
                    </button>

                    <button
                      type="button"
                      className="srs-btn btn-good"
                      onClick={() => handleRate('good')}
                    >
                      <span className="srs-label">🟢 Good</span>
                      <span className="srs-sub">1 day</span>
                      <span className="srs-key">3</span>
                    </button>

                    <button
                      type="button"
                      className="srs-btn btn-easy"
                      onClick={() => handleRate('easy')}
                    >
                      <span className="srs-label">🔵 Easy</span>
                      <span className="srs-sub">4 days</span>
                      <span className="srs-key">4</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
