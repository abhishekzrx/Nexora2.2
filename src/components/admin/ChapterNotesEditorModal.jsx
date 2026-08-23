/**
 * ChapterNotesEditorModal.jsx
 * Full-featured Rich Notes Editor Modal for Course → Subject → Chapter.
 * Supabase is the source of truth; supports headings, bold, italic, underline,
 * bullet lists, numbered lists, callouts, tables, links, and direct Supabase image uploads.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import RichContentRenderer from '../ui/RichContentRenderer'
import { noteService } from '../../services/noteService'

export default function ChapterNotesEditorModal({
  isOpen = false,
  onClose = () => {},
  courseId = '',
  courseName = '',
  subjectId = '',
  subjectName = '',
  chapterId = '',
  chapterName = '',
  chapterNumber = 1,
  initialNote = null,
  onSaved = () => {},
}) {
  const [noteId, setNoteId] = useState(initialNote?.id || null)
  const [title, setTitle] = useState(initialNote?.title || '')
  const [content, setContent] = useState(initialNote?.content || '')
  const [status, setStatus] = useState(initialNote?.status || 'published')
  const [viewMode, setViewMode] = useState('split') // 'edit' | 'split' | 'preview'
  
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [feedback, setFeedback] = useState({ type: null, message: '', timestamp: null })
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkData, setLinkData] = useState({ text: '', url: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Initialize or reload note when modal opens or note changes
  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setNoteId(initialNote.id || null)
        setTitle(initialNote.title || '')
        setContent(initialNote.content || '')
        setStatus(initialNote.status || 'published')
      } else {
        // Load existing note from Supabase if any
        loadExistingChapterNote()
      }
      setFeedback({ type: null, message: '', timestamp: null })
      setViewMode('split')
    }
  }, [isOpen, initialNote, courseId, subjectId, chapterId])

  const loadExistingChapterNote = async () => {
    if (!chapterId) return
    try {
      const res = await noteService.getNotes({ courseId, subjectId, chapterId })
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const existing = res.data[0]
        setNoteId(existing.id)
        setTitle(existing.title || `${chapterName} Study Notes`)
        setContent(existing.content || '')
        setStatus(existing.status || 'published')
      } else {
        setNoteId(null)
        setTitle(`${chapterName} Study Notes`)
        setContent(
`# ${chapterName} — Core Study Notes

## 1. Overview & Key Concepts
Write a brief introduction to this chapter here. Highlight the fundamental concepts that students need to master.

- **Key Point 1**: Enter the primary conceptual takeaway.
- **Key Point 2**: Describe the core mechanism or factual information.
- **Key Point 3**: Explain practical applications or exam significance.

> [!NOTE]
> Add essential tips, formula reminders, or common exam traps for this topic.

## 2. Detailed Topic Breakdown
1. **Topic Phase A**: Step-by-step explanation.
2. **Topic Phase B**: Important milestones or classifications.

| Concept | Description | Exam Relevance |
|---|---|---|
| Item A | Primary definition | High |
| Item B | Supporting detail | Medium |
`
        )
        setStatus('published')
      }
    } catch (err) {
      console.warn('Error loading chapter note:', err)
    }
  }

  // Formatting Helper: Inserts or wraps text around selection
  const insertFormatting = useCallback((prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${defaultText}${suffix}`

    const newContent = content.substring(0, start) + replacement + content.substring(end)
    setContent(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursor = start + prefix.length + (selectedText ? selectedText.length : defaultText.length)
      textarea.setSelectionRange(newCursor, newCursor)
    }, 0)
  }, [content])

  // Image Upload Handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    setUploadProgressText(`Uploading ${file.name}...`)
    setFeedback({ type: null, message: '', timestamp: null })

    try {
      const res = await noteService.uploadNoteImage(file, { courseId, chapterId })
      if (res.success && res.url) {
        insertFormatting(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${res.url})\n`, '')
        setFeedback({
          type: 'success',
          message: `Image uploaded successfully and added to note.`,
          timestamp: new Date().toLocaleTimeString(),
        })
      } else {
        // Fallback: Ask user for public image URL if storage bucket fails
        setFeedback({
          type: 'error',
          message: `Image upload notice: ${res.error || 'Unable to upload to storage'}. You can also insert image URLs directly.`,
          timestamp: new Date().toLocaleTimeString(),
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Upload error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setIsUploadingImage(false)
      setUploadProgressText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Insert Link Handler
  const handleApplyLink = () => {
    if (!linkData.url) return
    const label = linkData.text || linkData.url
    insertFormatting(`[${label}](${linkData.url})`, '')
    setLinkData({ text: '', url: '' })
    setShowLinkDialog(false)
  }

  // Save Note (Admin → Supabase)
  const handleSave = async () => {
    // 1. Validation
    if (!courseId) {
      setFeedback({ type: 'error', message: 'Course is missing. Please select a valid course.', timestamp: new Date().toLocaleTimeString() })
      return
    }
    if (!subjectId) {
      setFeedback({ type: 'error', message: 'Subject is missing. Please select a valid subject.', timestamp: new Date().toLocaleTimeString() })
      return
    }
    if (!chapterId) {
      setFeedback({ type: 'error', message: 'Chapter is missing. Please select a valid chapter.', timestamp: new Date().toLocaleTimeString() })
      return
    }
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a note title.', timestamp: new Date().toLocaleTimeString() })
      return
    }
    if (!content.trim()) {
      setFeedback({ type: 'error', message: 'Note content cannot be empty.', timestamp: new Date().toLocaleTimeString() })
      return
    }

    setIsSaving(true)
    setFeedback({ type: null, message: '', timestamp: null })

    try {
      if (noteId) {
        // Update existing record
        const res = await noteService.updateNote(noteId, { title, content, status })
        if (res.success && res.data) {
          setFeedback({
            type: 'success',
            message: res.message || `✓ Note updated successfully at ${new Date().toLocaleTimeString()}`,
            timestamp: new Date().toLocaleTimeString(),
          })
          onSaved?.(res.data)
        } else {
          setFeedback({
            type: 'error',
            message: `⚠️ Save Failed: ${res.error || 'Database rejected update request'}`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }
      } else {
        // Create new record
        const res = await noteService.createNote({
          courseId,
          subjectId,
          chapterId,
          title,
          content,
          status,
        })
        if (res.success && res.data) {
          setNoteId(res.data.id)
          setFeedback({
            type: 'success',
            message: res.message || `✓ Note created and saved successfully at ${new Date().toLocaleTimeString()}`,
            timestamp: new Date().toLocaleTimeString(),
          })
          onSaved?.(res.data)
        } else {
          setFeedback({
            type: 'error',
            message: `⚠️ Save Failed: ${res.error || 'Database rejected insert request'}`,
            timestamp: new Date().toLocaleTimeString(),
          })
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `⚠️ Error saving note: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Note Handler
  const handleDeleteNote = async () => {
    if (!noteId) return
    setIsDeleting(true)
    try {
      const res = await noteService.deleteNote(noteId)
      if (res.success) {
        onSaved?.({ id: noteId, deleted: true })
        onClose()
      } else {
        setFeedback({
          type: 'error',
          message: `Delete failed: ${res.error}`,
          timestamp: new Date().toLocaleTimeString(),
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Delete error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Keyboard shortcut Ctrl+S
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  if (!isOpen) return null

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="cne-modal-overlay" onClick={onClose}>
      <div className="cne-modal-container" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* ── 1. Modal Header ──────────────────────────────────────── */}
        <div className="cne-modal-header">
          <div className="cne-header-left">
            <div className="cne-breadcrumb">
              <span className="cne-crumb-course">{courseName || 'Course'}</span>
              <span className="cne-crumb-sep">›</span>
              <span className="cne-crumb-subject">{subjectName || 'Subject'}</span>
              <span className="cne-crumb-sep">›</span>
              <span className="cne-crumb-chapter">Ch. {chapterNumber}: {chapterName || 'Chapter'}</span>
            </div>
            <div className="cne-title-row">
              <span className="cne-header-badge">
                <AppIcon name="notesTab" size={16} /> Notes Editor
              </span>
              {noteId && <span className="cne-id-pill" title={`Note ID: ${noteId}`}>ID: {noteId.slice(0, 8)}...</span>}
            </div>
          </div>

          <div className="cne-header-right">
            {/* View Mode Switcher */}
            <div className="cne-view-toggle-group">
              <button
                type="button"
                className={`cne-toggle-btn${viewMode === 'edit' ? ' active' : ''}`}
                onClick={() => setViewMode('edit')}
                title="Editor only"
              >
                <AppIcon name="edit" size={14} /> Edit
              </button>
              <button
                type="button"
                className={`cne-toggle-btn${viewMode === 'split' ? ' active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Side-by-side editor and live preview"
              >
                <AppIcon name="splitScreen" size={14} /> Split
              </button>
              <button
                type="button"
                className={`cne-toggle-btn${viewMode === 'preview' ? ' active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Full Preview"
              >
                <AppIcon name="preview" size={14} /> Preview
              </button>
            </div>

            <button type="button" className="cne-close-btn" onClick={onClose} aria-label="Close modal">
              <AppIcon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* ── 2. Note Metadata Row (Title & Status) ───────────────── */}
        <div className="cne-meta-bar">
          <div className="cne-title-input-wrap">
            <label className="cne-label">Note Title *</label>
            <input
              type="text"
              className="cne-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter Summary, Formulas & Core Concepts..."
            />
          </div>

          <div className="cne-status-select-wrap">
            <label className="cne-label">Status</label>
            <select
              className="cne-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="published">🟢 Published (Visible to Students)</option>
              <option value="draft">🟡 Draft (Admin Only)</option>
            </select>
          </div>
        </div>

        {/* ── 3. Rich Formatting Toolbar (Visible in Edit/Split mode) ─ */}
        {viewMode !== 'preview' && (
          <div className="cne-toolbar">
            <div className="cne-toolbar-group">
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('# ', '\n', 'Heading 1')}
                title="Heading 1 (#)"
              >
                <strong>H1</strong>
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('## ', '\n', 'Heading 2')}
                title="Heading 2 (##)"
              >
                <strong>H2</strong>
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('### ', '\n', 'Heading 3')}
                title="Heading 3 (###)"
              >
                <strong>H3</strong>
              </button>
            </div>

            <div className="cne-toolbar-divider" />

            <div className="cne-toolbar-group">
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                title="Bold (Ctrl+B)"
              >
                <AppIcon name="formatBold" size={15} />
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                title="Italic (Ctrl+I)"
              >
                <AppIcon name="formatItalic" size={15} />
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
                title="Underline"
              >
                <AppIcon name="formatUnderline" size={15} />
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                title="Strikethrough"
              >
                <AppIcon name="formatStrikethrough" size={15} />
              </button>
            </div>

            <div className="cne-toolbar-divider" />

            <div className="cne-toolbar-group">
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('- ', '\n', 'List item')}
                title="Bullet List"
              >
                <AppIcon name="formatListBulleted" size={15} />
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('1. ', '\n', 'Numbered item')}
                title="Numbered List"
              >
                <AppIcon name="formatListNumbered" size={15} />
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('> [!NOTE]\n> ', '\n', 'Important note content')}
                title="Callout Note Box"
              >
                <AppIcon name="formatQuote" size={15} /> Note Box
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('> [!IMPORTANT]\n> ', '\n', 'Crucial exam concept')}
                title="Important Warning Box"
              >
                <AppIcon name="warning" size={15} /> Important
              </button>
            </div>

            <div className="cne-toolbar-divider" />

            <div className="cne-toolbar-group">
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('```js\n', '\n```\n', '// code snippet here')}
                title="Code Block"
              >
                <AppIcon name="code" size={15} /> Code
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('\n| Header 1 | Header 2 |\n|---|---|\n| Item 1 | Value 1 |\n', '')}
                title="Insert Markdown Table"
              >
                <AppIcon name="tableChart" size={15} /> Table
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => setShowLinkDialog(true)}
                title="Insert Link"
              >
                <AppIcon name="link" size={15} /> Link
              </button>
            </div>

            <div className="cne-toolbar-divider" />

            {/* Image Upload Action */}
            <div className="cne-toolbar-group">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageFileChange}
              />
              <button
                type="button"
                className="cne-tool-btn cne-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                title="Upload image to Supabase Storage"
              >
                <AppIcon name="upload" size={15} />
                {isUploadingImage ? uploadProgressText || 'Uploading...' : 'Upload Image'}
              </button>
              <button
                type="button"
                className="cne-tool-btn"
                onClick={() => insertFormatting('![Caption](https://images.unsplash.com/photo-...)\n', '')}
                title="Insert External Image URL"
              >
                <AppIcon name="image" size={15} /> Image URL
              </button>
            </div>
          </div>
        )}

        {/* ── 4. Main Body (Edit / Split / Preview) ────────────────── */}
        <div className={`cne-body-content mode-${viewMode}`}>
          {/* Editor Pane */}
          {viewMode !== 'preview' && (
            <div className="cne-editor-pane">
              <textarea
                ref={textareaRef}
                className="cne-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing rich chapter notes in Markdown or formatted text..."
                spellCheck="false"
              />
            </div>
          )}

          {/* Live Preview Pane */}
          {viewMode !== 'edit' && (
            <div className="cne-preview-pane">
              <div className="cne-preview-header">
                <span className="cne-preview-badge">
                  <AppIcon name="preview" size={14} /> Student View Preview
                </span>
                <span className="cne-preview-title-preview">{title || 'Untitled Note'}</span>
              </div>
              <div className="cne-preview-scroll">
                <RichContentRenderer content={content} />
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Feedback Notification Banner ──────────────────────── */}
        {feedback.message && (
          <div className={`cne-feedback-banner ${feedback.type}`}>
            <AppIcon name={feedback.type === 'success' ? 'check' : 'warning'} size={16} />
            <span className="cne-feedback-text">{feedback.message}</span>
            <button
              type="button"
              className="cne-feedback-dismiss"
              onClick={() => setFeedback({ type: null, message: '', timestamp: null })}
            >
              <AppIcon name="close" size={13} />
            </button>
          </div>
        )}

        {/* ── 6. Modal Footer ──────────────────────────────────────── */}
        <div className="cne-modal-footer">
          <div className="cne-footer-stats">
            <span className="cne-stat-item">
              <AppIcon name="document" size={13} /> {wordCount} words
            </span>
            <span className="cne-stat-item">
              <AppIcon name="clock" size={13} /> ~{readTimeMin} min read
            </span>
            <span className="cne-stat-item">
              {charCount} characters
            </span>
          </div>

          <div className="cne-footer-actions">
            {noteId && !showDeleteConfirm && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isDeleting}
              >
                <AppIcon name="delete" size={14} /> Delete Note
              </Button>
            )}

            {showDeleteConfirm && (
              <div className="cne-delete-confirm-bar">
                <span className="cne-delete-msg">Delete this chapter note permanently?</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteNote}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isUploadingImage}
            >
              <AppIcon name="save" size={15} />
              {isSaving ? 'Saving to Supabase...' : noteId ? 'Save & Update Note' : 'Create & Save Note'}
            </Button>
          </div>
        </div>

        {/* ── 7. Insert Link Dialog Modal ──────────────────────────── */}
        {showLinkDialog && (
          <div className="cne-dialog-backdrop" onClick={() => setShowLinkDialog(false)}>
            <div className="cne-dialog-box" onClick={(e) => e.stopPropagation()}>
              <h4 className="cne-dialog-title">Insert Hyperlink</h4>
              <div className="cne-dialog-field">
                <label>Display Text</label>
                <input
                  type="text"
                  placeholder="e.g. Reference Documentation"
                  value={linkData.text}
                  onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="cne-dialog-field">
                <label>Link URL *</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkData.url}
                  onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                />
              </div>
              <div className="cne-dialog-actions">
                <Button variant="secondary" size="sm" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleApplyLink} disabled={!linkData.url}>
                  Insert Link
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
