/**
 * FlashcardPractice
 * Shows subject flashcards with:
 * - Recent cards section
 * - In-tab practice with flip animation
 * - Focus mode (fullscreen) with exit button
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'

const STORAGE_KEY = 'nexora_recent_flashcards'

function loadRecentFlashcards() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveRecentFlashcards(recent) {
  try {
    const trimmed = recent.slice(0, 20)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore
  }
}

function FlashcardPractice({ subject, courseId, allFlashcards = [] }) {
  const [activeDeck, setActiveDeck] = useState('all')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [recentFlashcards, setRecentFlashcards] = useState(() => loadRecentFlashcards())
  const [isFocusMode, setIsFocusMode] = useState(false)

  const subjectFlashcards = useMemo(() => {
    if (!subject || !allFlashcards.length) return []
    const subjectKey = String(subject.title || subject.name || '').toLowerCase()
    return allFlashcards.filter((f) => {
      const fSubject = String(f.subject || '').toLowerCase()
      const fSubjectId = String(f.subjectId || f.subject_id || '').toLowerCase()
      const subjectKeyLower = String(subject.subjectKey || '').toLowerCase()
      return (
        fSubject === subjectKey ||
        fSubjectId === subjectKey ||
        fSubjectId === subjectKeyLower ||
        fSubject === subjectKey
      )
    })
  }, [subject, allFlashcards])

  const decks = useMemo(() => {
    const deckMap = new Map()
    subjectFlashcards.forEach((card) => {
      const chapter = String(card.chapter || 'Other')
      if (!deckMap.has(chapter)) {
        deckMap.set(chapter, [])
      }
      deckMap.get(chapter).push(card)
    })
    return [
      { key: 'all', label: 'All Cards', count: subjectFlashcards.length, cards: subjectFlashcards },
      ...Array.from(deckMap.entries()).map(([key, cards]) => ({
        key,
        label: key,
        count: cards.length,
        cards,
      })),
    ]
  }, [subjectFlashcards])

  const activeDeckData = useMemo(() => {
    return decks.find((d) => d.key === activeDeck) || decks[0] || { cards: [] }
  }, [decks, activeDeck])

  const currentCard = useMemo(() => {
    const cards = activeDeckData.cards || []
    if (cards.length === 0) return null
    return cards[currentIndex] || cards[0]
  }, [activeDeckData, currentIndex])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleNext = useCallback(() => {
    const cards = activeDeckData.cards || []
    if (cards.length === 0) return
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % cards.length)
  }, [activeDeckData])

  const handlePrev = useCallback(() => {
    const cards = activeDeckData.cards || []
    if (cards.length === 0) return
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
  }, [activeDeckData])

  const handleOpenCard = useCallback((card) => {
    setRecentFlashcards((prev) => {
      const next = [card, ...prev.filter((c) => c.id !== card.id)].slice(0, 20)
      saveRecentFlashcards(next)
      return next
    })
    setCurrentIndex(0)
    setIsFlipped(false)
    setActiveDeck('recent')
  }, [])

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev)
  }, [])

  const handleExitFocus = useCallback(() => {
    setIsFocusMode(false)
  }, [])

  useEffect(() => {
    if (activeDeck !== 'recent') {
      setCurrentIndex(0)
      setIsFlipped(false)
    }
  }, [activeDeck])

  if (!subject) {
    return (
      <div className="flashcard-empty">
        <AppIcon name="flashcardsTab" size={28} />
        <p>Select a subject to view flashcards.</p>
      </div>
    )
  }

  if (subjectFlashcards.length === 0) {
    return (
      <div className="flashcard-empty">
        <AppIcon name="flashcardsTab" size={28} />
        <h3>No Flashcards Yet</h3>
        <p>Flashcards for <strong>{subject.title || subject.name}</strong> will appear here once added.</p>
      </div>
    )
  }

  const recentCards = recentFlashcards.filter((c) => {
    const cardSubject = String(c.subject || '').toLowerCase()
    const subjectTitle = String(subject.title || subject.name || '').toLowerCase()
    return cardSubject === subjectTitle
  })

  return (
    <div className="flashcard-practice-shell">
      {/* Deck Selector */}
      <div className="flashcard-deck-selector">
        <select
          className="admin-select-sm"
          value={activeDeck}
          onChange={(e) => setActiveDeck(e.target.value)}
        >
          {decks.map((deck) => (
            <option key={deck.key} value={deck.key}>
              {deck.label} ({deck.count})
            </option>
          ))}
          {recentCards.length > 0 && (
            <option value="recent">Recently Opened ({recentCards.length})</option>
          )}
        </select>

        <button
          type="button"
          className="focus-mode-btn"
          onClick={toggleFocusMode}
          title="Open in focus mode"
        >
          <AppIcon name="fullscreen" size={16} />
          Focus Mode
        </button>
      </div>

      {/* Recent Cards Section */}
      {activeDeck !== 'recent' && recentCards.length > 0 && (
        <div className="recent-flashcards-section">
          <div className="recent-flashcards-header">
            <AppIcon name="history" size={14} />
            <span>Recently Opened</span>
          </div>
          <div className="recent-flashcards-list">
            {recentCards.slice(0, 5).map((card, idx) => (
              <button
                key={card.id || idx}
                type="button"
                className="recent-flashcard-item"
                onClick={() => handleOpenCard(card)}
              >
                <span className="recent-flashcard-front">{card.front}</span>
                <span className="recent-flashcard-meta">{card.chapter || ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Practice Area */}
      <div className="flashcard-practice-area">
        {currentCard ? (
          <>
            <div className="flashcard-counter">
              Card {currentIndex + 1} of {activeDeckData.cards?.length || 0}
            </div>

            <div
              className={`flashcard-flip-container ${isFlipped ? 'flipped' : ''}`}
              onClick={handleFlip}
            >
              <div className="flashcard-flip-inner">
                <div className="flashcard-face flashcard-front">
                  <div className="flashcard-face-label">Question</div>
                  <div className="flashcard-face-content">{currentCard.front}</div>
                  <div className="flashcard-flip-hint">Tap to flip</div>
                </div>
                <div className="flashcard-face flashcard-back">
                  <div className="flashcard-face-label">Answer</div>
                  <div className="flashcard-face-content">{currentCard.back}</div>
                  <div className="flashcard-flip-hint">Tap to flip back</div>
                </div>
              </div>
            </div>

            <div className="flashcard-controls">
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handlePrev}
                disabled={activeDeckData.cards?.length <= 1}
              >
                <AppIcon name="chevronLeft" size={18} />
                Prev
              </button>
              <button
                type="button"
                className="flashcard-flip-btn"
                onClick={handleFlip}
              >
                <AppIcon name="flip" size={18} />
                Flip
              </button>
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handleNext}
                disabled={activeDeckData.cards?.length <= 1}
              >
                Next
                <AppIcon name="chevronRight" size={18} />
              </button>
            </div>

            <div className="flashcard-meta">
              {currentCard.chapter && <span>Chapter: {currentCard.chapter}</span>}
              {currentCard.views && <span>{currentCard.views}</span>}
            </div>
          </>
        ) : (
          <div className="flashcard-empty">
            <p>No cards in this deck.</p>
          </div>
        )}
      </div>

      {/* Focus Mode Overlay */}
      {isFocusMode && currentCard && (
        <div className="flashcard-focus-overlay">
          <div className="flashcard-focus-header">
            <div className="flashcard-focus-title">
              <AppIcon name="flashcardsTab" size={18} />
              <span>Focus Mode — {subject.title || subject.name}</span>
            </div>
            <button
              type="button"
              className="flashcard-focus-exit"
              onClick={handleExitFocus}
            >
              <AppIcon name="close" size={18} />
              Exit
            </button>
          </div>

          <div className="flashcard-focus-body">
            <div
              className={`flashcard-flip-container flashcard-focus-card ${isFlipped ? 'flipped' : ''}`}
              onClick={handleFlip}
            >
              <div className="flashcard-flip-inner">
                <div className="flashcard-face flashcard-front">
                  <div className="flashcard-face-label">Question</div>
                  <div className="flashcard-face-content">{currentCard.front}</div>
                </div>
                <div className="flashcard-face flashcard-back">
                  <div className="flashcard-face-label">Answer</div>
                  <div className="flashcard-face-content">{currentCard.back}</div>
                </div>
              </div>
            </div>

            <div className="flashcard-focus-controls">
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handlePrev}
                disabled={activeDeckData.cards?.length <= 1}
              >
                <AppIcon name="chevronLeft" size={20} />
                Prev
              </button>
              <button
                type="button"
                className="flashcard-flip-btn"
                onClick={handleFlip}
              >
                <AppIcon name="flip" size={20} />
                Flip
              </button>
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handleNext}
                disabled={activeDeckData.cards?.length <= 1}
              >
                Next
                <AppIcon name="chevronRight" size={20} />
              </button>
            </div>

            <div className="flashcard-focus-counter">
              Card {currentIndex + 1} of {activeDeckData.cards?.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FlashcardPractice
