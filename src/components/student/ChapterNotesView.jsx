/**
 * ChapterNotesView.jsx
 * Responsive Student Study Notes Reader component.
 * Features:
 * 1. Compact, zero-overflow mobile-responsive chapter selector with icon & chevron
 * 2. Reading time & word count metadata chips
 * 3. Next / Previous chapter study navigation
 * 4. Focus / Clean reading mode
 * 5. High-contrast typography optimized for both mobile and desktop
 */
import { useState, useEffect, useMemo } from 'react'
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

  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex((c) => String(c.id || c.num) === String(selectedChapterId))
  }, [chapters, selectedChapterId])

  const selectedChapter = useMemo(() => {
    if (currentChapterIndex !== -1) return chapters[currentChapterIndex]
    return chapters[0] || null
  }, [chapters, currentChapterIndex])

  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null
  const nextChapter = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null

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
        })

        if (!isCancelled) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const published = res.data.find((n) => n.status === 'published') || res.data[0]
            setNote(published)
          } else {
            setNote(null)
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

  return (
    <div className={`cnv-container${isFocusMode ? ' focus-reader-mode' : ''}`}>
      {/* ── 1. Top Chapter Selector Bar ─────────────────────────────── */}
      <div className="cnv-nav-bar">
        <div className="cnv-select-row">
          <div className="cnv-select-icon-badge">
            <AppIcon name="chapters" size={15} />
          </div>
          <div className="cnv-select-inner-wrap">
            <label className="cnv-select-label">SELECT CHAPTER</label>
            <div className="cnv-custom-select-box">
              <select
                className="cnv-chapter-select"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                aria-label="Select chapter notes"
              >
                {chapters.map((ch, idx) => (
                  <option key={ch.id || ch.num || idx} value={ch.id || ch.num}>
                    Ch. {ch.num || idx + 1}: {ch.title || ch.name}
                  </option>
                ))}
              </select>
              <div className="cnv-select-chevron">
                <AppIcon name="chevronDown" size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="cnv-actions-row">
          <div className="cnv-meta-chips-group">
            {note && (
              <span className="cnv-chip read-time-chip" title="Estimated reading time">
                <AppIcon name="clock" size={12} /> ~{readTimeMin} min read
              </span>
            )}
            {note && (
              <span className="cnv-chip word-count-chip">
                {wordCount} words
              </span>
            )}
          </div>

          <button
            type="button"
            className={`cnv-focus-btn${isFocusMode ? ' active' : ''}`}
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? 'Exit focus mode' : 'Enter distraction-free reading mode'}
          >
            <AppIcon name={isFocusMode ? 'previewOff' : 'preview'} size={14} />
            <span>{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Content Area ─────────────────────────────────────────── */}
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
