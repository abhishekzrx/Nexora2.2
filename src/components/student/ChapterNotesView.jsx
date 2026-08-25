/**
 * ChapterNotesView.jsx
 * Smart, Space-Efficient Student Study Notes Reader component.
 * Features:
 * 1. Compact Single-Row Smart Header Bar (wastes zero vertical space)
 * 2. 1-Tap Quick Prev / Next Arrow Switcher directly in the top bar
 * 3. Horizontal Scrollable Chapter Stepper Strip for instant one-click switching
 * 4. Searchable Chapter Quick-Picker Modal / Drawer for birds-eye selection
 * 5. Reading time & word count metadata chips
 * 6. Distraction-Free Focus Mode
 * 7. High-contrast typography optimized for both mobile and desktop
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import AppIcon from '../ui/AppIcon'
import RichContentRenderer from '../ui/RichContentRenderer'
import { noteService } from '../../services/noteService'

export default function ChapterNotesView({
  courseId = '',
  subject = null,
  initialChapterId = '',
  onBack = null,
}) {
  const chapters = useMemo(() => subject?.chapters || [], [subject])
  
  const [selectedChapterId, setSelectedChapterId] = useState(
    initialChapterId || (chapters.length > 0 ? (chapters[0].id || chapters[0].num) : '')
  )
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const stripRef = useRef(null)
  const searchInputRef = useRef(null)

  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex((c) => String(c.id || c.num) === String(selectedChapterId))
  }, [chapters, selectedChapterId])

  const selectedChapter = useMemo(() => {
    if (currentChapterIndex !== -1) return chapters[currentChapterIndex]
    return chapters[0] || null
  }, [chapters, currentChapterIndex])

  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null
  const nextChapter = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null

  // Auto-scroll active pill into view in the horizontal stepper strip
  useEffect(() => {
    if (stripRef.current && selectedChapterId) {
      const activeEl = stripRef.current.querySelector('.cnv-strip-pill.active')
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        })
      }
    }
  }, [selectedChapterId])

  // Focus search input when picker modal opens
  useEffect(() => {
    if (isPickerOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isPickerOpen])

  // Keyboard navigation: Escape to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (isPickerOpen && e.key === 'Escape') {
        setIsPickerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPickerOpen])

  // Fetch note whenever selected chapter changes
  useEffect(() => {
    let isCancelled = false
    async function fetchChapterNote() {
      if (!selectedChapter) {
        setNote(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await noteService.getNotes({
          courseId,
          subjectId: subject?.id,
          chapterId: selectedChapter.id || selectedChapter.num,
          chapterName: selectedChapter.name || selectedChapter.title || '',
        })

        if (!isCancelled) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const published = res.data.find((n) => n.status === 'published') || res.data[0]
            setNote(published)
          } else {
            // Fallback check matching across course notes
            const allRes = await noteService.getNotes({ courseId })
            if (allRes.success && Array.isArray(allRes.data)) {
              const chapNameLower = String(selectedChapter.name || selectedChapter.title || '').trim().toLowerCase()
              const matched = allRes.data.find(
                (n) =>
                  String(n.chapterId || n.chapter_id) === String(selectedChapter.id || selectedChapter.num) ||
                  (chapNameLower && n.title && n.title.toLowerCase().includes(chapNameLower)) ||
                  (chapNameLower && n.chapterName && n.chapterName.toLowerCase() === chapNameLower)
              )
              setNote(matched || null)
            } else {
              setNote(null)
            }
          }
          setLoading(false)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load chapter notes.')
          setNote(null)
          setLoading(false)
        }
      }
    }

    fetchChapterNote()
    return () => {
      isCancelled = true
    }
  }, [courseId, subject?.id, selectedChapter])

  const wordCount = note?.content ? note.content.trim().split(/\s+/).length : 0
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200))

  // Filtered chapters for the modal picker
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters
    const q = searchQuery.toLowerCase().trim()
    return chapters.filter((ch, idx) => {
      const numStr = String(ch.num || idx + 1)
      const titleStr = String(ch.title || ch.name || '').toLowerCase()
      return numStr.includes(q) || titleStr.includes(q)
    })
  }, [chapters, searchQuery])

  const handleSelectChapter = (ch) => {
    setSelectedChapterId(ch.id || ch.num)
    setIsPickerOpen(false)
  }

  return (
    <div className={`cnv-container${isFocusMode ? ' focus-reader-mode' : ''}`}>
      {/* ── 1. Smart Space-Efficient Nav Bar ────────────────────────── */}
      <div className="cnv-smart-nav">
        <div className="cnv-smart-nav-top">
          <div className="cnv-nav-left-group">
            {/* Main Chapter Selector Button - Only Chapter Number */}
            <button
              type="button"
              className="cnv-main-selector-btn"
              onClick={() => setIsPickerOpen(true)}
              title="Click to view and switch any chapter"
              aria-haspopup="dialog"
              aria-expanded={isPickerOpen}
            >
              <span className="cnv-chapter-tag-badge">
                Ch. {selectedChapter?.num || (currentChapterIndex !== -1 ? currentChapterIndex + 1 : '1')}
              </span>
              <span className="cnv-ch-fraction">
                {currentChapterIndex !== -1 ? `${currentChapterIndex + 1}/${chapters.length}` : ''}
              </span>
              <span className="cnv-selector-arrow">
                <AppIcon name="chevronDown" size={14} />
              </span>
            </button>

            {/* Quick 1-Tap Header Navigation (< > arrows) */}
            <div className="cnv-quick-arrows-group">
              <button
                type="button"
                className="cnv-quick-arrow-btn"
                disabled={!prevChapter}
                onClick={() => prevChapter && setSelectedChapterId(prevChapter.id || prevChapter.num)}
                title={prevChapter ? `Previous: Ch. ${prevChapter.num} ${prevChapter.title || ''}` : 'First chapter'}
                aria-label="Previous Chapter"
              >
                <AppIcon name="back" size={14} />
              </button>
              <button
                type="button"
                className="cnv-quick-arrow-btn"
                disabled={!nextChapter}
                onClick={() => nextChapter && setSelectedChapterId(nextChapter.id || nextChapter.num)}
                title={nextChapter ? `Next: Ch. ${nextChapter.num} ${nextChapter.title || ''}` : 'Last chapter'}
                aria-label="Next Chapter"
              >
                <AppIcon name="chevronRight" size={14} />
              </button>
            </div>
          </div>

          {/* Action Buttons (All Chapters Drawer & Focus Mode) */}
          <div className="cnv-nav-right-actions">
            <button
              type="button"
              className="cnv-picker-trigger-btn"
              onClick={() => setIsPickerOpen(true)}
              title="Browse all chapters"
            >
              <AppIcon name="viewList" size={14} />
              <span className="picker-trigger-text">Chapters ({chapters.length})</span>
            </button>

            <button
              type="button"
              className={`cnv-focus-btn${isFocusMode ? ' active' : ''}`}
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? 'Exit focus mode' : 'Enter distraction-free reading mode'}
            >
              <AppIcon name={isFocusMode ? 'previewOff' : 'preview'} size={14} />
              <span className="focus-btn-text">{isFocusMode ? 'Exit' : 'Focus'}</span>
            </button>
          </div>
        </div>

        {/* ── 2. One-Tap Horizontal Chapter Stepper Strip ───────────── */}
        {chapters.length > 1 && (
          <div className="cnv-strip-container">
            <div className="cnv-strip-scroll" ref={stripRef}>
              {chapters.map((ch, idx) => {
                const isSelected = String(ch.id || ch.num) === String(selectedChapterId)
                const chNum = ch.num || idx + 1
                return (
                  <button
                    key={ch.id || ch.num || idx}
                    type="button"
                    className={`cnv-strip-pill${isSelected ? ' active' : ''}`}
                    onClick={() => setSelectedChapterId(ch.id || ch.num)}
                    title={`Chapter ${chNum}: ${ch.title || ch.name}`}
                  >
                    <span className="strip-pill-num">{chNum}</span>
                    <span className="strip-pill-title">{ch.title || ch.name}</span>
                    {isSelected && (
                      <span className="strip-pill-active-dot" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Searchable Chapter Quick-Picker Modal / Drawer ───────── */}
      {isPickerOpen && (
        <div className="cnv-picker-overlay" onClick={() => setIsPickerOpen(false)}>
          <div
            className="cnv-picker-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Select Chapter"
          >
            {/* Modal Header */}
            <div className="cnv-modal-header">
              <div className="cnv-modal-header-left">
                <div className="cnv-modal-badge">
                  <AppIcon name="chapters" size={16} />
                </div>
                <div>
                  <h3 className="cnv-modal-title">Select Chapter</h3>
                  <p className="cnv-modal-subtitle">
                    {subject?.title || 'Subject'} • {chapters.length} Chapters
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cnv-modal-close-btn"
                onClick={() => setIsPickerOpen(false)}
                aria-label="Close"
              >
                <AppIcon name="close" size={18} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="cnv-modal-search-wrap">
              <span className="cnv-search-icon">
                <AppIcon name="search" size={16} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="cnv-modal-search-input"
                placeholder="Search chapter name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cnv-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <AppIcon name="close" size={14} />
                </button>
              )}
            </div>

            {/* Chapter Items List */}
            <div className="cnv-modal-list">
              {filteredChapters.length === 0 ? (
                <div className="cnv-modal-no-results">
                  <AppIcon name="search" size={24} />
                  <p>No chapters match &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                filteredChapters.map((ch, idx) => {
                  const isSelected = String(ch.id || ch.num) === String(selectedChapterId)
                  const chNum = ch.num || idx + 1
                  return (
                    <button
                      key={ch.id || ch.num || idx}
                      type="button"
                      className={`cnv-modal-chapter-item${isSelected ? ' active' : ''}`}
                      onClick={() => handleSelectChapter(ch)}
                    >
                      <div className="cnv-item-left">
                        <span className="cnv-item-num-badge">
                          {String(chNum).padStart(2, '0')}
                        </span>
                        <div className="cnv-item-text">
                          <span className="cnv-item-title">{ch.title || ch.name}</span>
                          <span className="cnv-item-sub">
                            {subject?.title || 'Subject'}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="cnv-item-active-tag">
                          <AppIcon name="check" size={14} /> Active
                        </span>
                      ) : (
                        <span className="cnv-item-arrow">
                          <AppIcon name="chevronRight" size={15} />
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Main Note Content Area ───────────────────────────────── */}
      <div className="cnv-content-card">
        {loading ? (
          <div className="cnv-loading-state">
            <div className="cnv-spinner" />
            <p>Loading study notes for {selectedChapter?.title || 'this chapter'}...</p>
          </div>
        ) : error ? (
          <div className="cnv-error-state">
            <AppIcon name="warning" size={30} />
            <h4>Unable to Load Notes</h4>
            <p>{error}</p>
          </div>
        ) : !note ? (
          <div className="cnv-empty-state">
            <div className="cnv-empty-icon-wrap">
              <AppIcon name="document" size={32} />
            </div>
            <h3 className="cnv-empty-title">No notes available for this chapter.</h3>
            <p className="cnv-empty-sub">
              Study notes for <strong>{selectedChapter?.title || 'this chapter'}</strong> are currently being curated by your instructors. Check back soon!
            </p>
          </div>
        ) : (
          <div className="cnv-note-article-wrapper">
            <header className="cnv-note-header">
              <div className="cnv-note-meta-pills">
                <span className="cnv-crumb-chip subject-chip">
                  <AppIcon name={subject?.icon || 'chapters'} size={12} /> {subject?.title || 'Subject'}
                </span>
                <span className="cnv-crumb-chip chapter-chip">
                  Chapter {selectedChapter?.num || currentChapterIndex + 1}
                </span>
                <span className="cnv-crumb-chip reading-time-badge">
                  <AppIcon name="clock" size={11} /> ~{readTimeMin} min read
                </span>
              </div>
              <h1 className="cnv-note-title">{note.title || selectedChapter?.title}</h1>
            </header>

            <div className="cnv-note-body">
              <RichContentRenderer content={note.content} />
            </div>

            <footer className="cnv-note-footer">
              <div className="cnv-footer-check">
                <AppIcon name="check" size={15} />
                <span>You have completed reading this chapter's study notes!</span>
              </div>

              {/* Next/Prev Chapter Fast Navigation */}
              <div className="cnv-chapter-nav-row">
                {prevChapter ? (
                  <button
                    type="button"
                    className="cnv-ch-nav-btn prev"
                    onClick={() => setSelectedChapterId(prevChapter.id || prevChapter.num)}
                  >
                    <AppIcon name="back" size={14} />
                    <div className="cnv-nav-btn-text">
                      <span className="cnv-nav-dir">Previous Chapter</span>
                      <span className="cnv-nav-title">Ch. {prevChapter.num}: {prevChapter.title || prevChapter.name}</span>
                    </div>
                  </button>
                ) : <div />}

                {nextChapter ? (
                  <button
                    type="button"
                    className="cnv-ch-nav-btn next"
                    onClick={() => setSelectedChapterId(nextChapter.id || nextChapter.num)}
                  >
                    <div className="cnv-nav-btn-text text-right">
                      <span className="cnv-nav-dir">Next Chapter</span>
                      <span className="cnv-nav-title">Ch. {nextChapter.num}: {nextChapter.title || nextChapter.name}</span>
                    </div>
                    <AppIcon name="chevronRight" size={14} />
                  </button>
                ) : null}
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  )
}
