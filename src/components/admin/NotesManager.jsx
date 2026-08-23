/**
 * NotesManager.jsx
 * Dedicated Admin Workspace for Chapter Notes Management.
 * Hierarchy: Course → Subject → Chapter → Notes.
 * Supabase is the source of truth; provides seamless note creation, editing, previewing, and stats.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import ChapterNotesEditorModal from './ChapterNotesEditorModal'
import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { noteService } from '../../services/noteService'

export default function NotesManager({ courseName = '' }) {
  const { subjects, chapters, notes, allSubjects, allChapters, allNotes } = useAdminStore()
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [activeEditorNote, setActiveEditorNote] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'has_notes' | 'no_notes'

  const activeCourse = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]
  }, [workspaces, activeWorkspaceId])

  const courseSubjects = useMemo(() => {
    if (!activeWorkspaceId) return []
    const list = allSubjects && allSubjects.length > 0 ? allSubjects : subjects
    return list.filter((s) => s.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, subjects, allSubjects])

  const courseChapters = useMemo(() => {
    if (!activeWorkspaceId) return []
    const list = allChapters && allChapters.length > 0 ? allChapters : chapters
    return list.filter((c) => c.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, chapters, allChapters])

  const courseNotes = useMemo(() => {
    if (!activeWorkspaceId) return []
    const list = allNotes && allNotes.length > 0 ? allNotes : notes
    return list.filter((n) => n.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, notes, allNotes])

  // Select first subject by default if not set
  useEffect(() => {
    if (courseSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(courseSubjects[0].id)
    }
  }, [courseSubjects, selectedSubjectId])

  // Filtered chapters for current selection
  const visibleChapters = useMemo(() => {
    let list = courseChapters

    if (selectedSubjectId) {
      list = list.filter(
        (c) =>
          c.subjectId === selectedSubjectId ||
          c.subject_id === selectedSubjectId ||
          (c.subject && courseSubjects.find((s) => s.id === selectedSubjectId)?.name === c.subject)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) => c.name?.toLowerCase().includes(q))
    }

    if (statusFilter === 'has_notes') {
      list = list.filter((c) => courseNotes.some((n) => n.chapterId === c.id))
    } else if (statusFilter === 'no_notes') {
      list = list.filter((c) => !courseNotes.some((n) => n.chapterId === c.id))
    }

    return list
  }, [courseChapters, selectedSubjectId, searchQuery, statusFilter, courseNotes, courseSubjects])

  // Helper to get note for a chapter
  const getNoteForChapter = useCallback((chapter) => {
    if (!chapter) return null
    return courseNotes.find(
      (n) =>
        n.chapterId === chapter.id ||
        (n.title && n.title.toLowerCase().includes(chapter.name?.toLowerCase()))
    ) || null
  }, [courseNotes])

  // Open Editor for a chapter
  const handleOpenEditor = (chapter) => {
    const existingNote = getNoteForChapter(chapter)
    const subject = courseSubjects.find((s) => s.id === (chapter.subjectId || selectedSubjectId)) || courseSubjects[0]
    
    setActiveEditorNote({
      chapter,
      subject,
      note: existingNote,
    })
    setIsEditorOpen(true)
  }

  // Analytics stats
  const totalChapters = courseChapters.length
  const chaptersWithNotes = courseChapters.filter((c) => getNoteForChapter(c) !== null).length
  const chaptersMissingNotes = Math.max(0, totalChapters - chaptersWithNotes)
  const noteCoveragePct = totalChapters > 0 ? Math.round((chaptersWithNotes / totalChapters) * 100) : 0

  return (
    <div className="nm-root-container">
      {/* ── 1. Top Header & Stats ─────────────────────────────────── */}
      <div className="nm-header-section">
        <div>
          <h2 className="nm-heading">Chapter Study Notes Studio</h2>
          <p className="nm-subheading">
            Create, format, and publish rich textbook notes and visual study guides for {activeCourse?.name || 'this course'}.
          </p>
        </div>
      </div>

      {/* ── 2. Content Health Stats Grid ─────────────────────────── */}
      <div className="nm-stats-grid">
        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <AppIcon name="notesTab" size={20} />
          </div>
          <div>
            <div className="nm-stat-value">{chaptersWithNotes}</div>
            <div className="nm-stat-label">Published Notes</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#E0F2FE', color: '#0284C7' }}>
            <AppIcon name="chapters" size={20} />
          </div>
          <div>
            <div className="nm-stat-value">{totalChapters}</div>
            <div className="nm-stat-label">Total Chapters</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <AppIcon name="warning" size={20} />
          </div>
          <div>
            <div className="nm-stat-value">{chaptersMissingNotes}</div>
            <div className="nm-stat-label">Chapters Missing Notes</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <AppIcon name="check" size={20} />
          </div>
          <div>
            <div className="nm-stat-value">{noteCoveragePct}%</div>
            <div className="nm-stat-label">Notes Readiness</div>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Controls Row ─────────────────────────────── */}
      <div className="nm-controls-bar">
        {/* Subject Pills */}
        <div className="nm-subject-pills-row">
          {courseSubjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id
            const subChaps = courseChapters.filter((c) => c.subjectId === sub.id || c.subject === sub.name)
            const subNotesCount = subChaps.filter((c) => getNoteForChapter(c) !== null).length

            return (
              <button
                key={sub.id}
                type="button"
                className={`nm-subject-pill${isSelected ? ' active' : ''}`}
                onClick={() => setSelectedSubjectId(sub.id)}
              >
                <AppIcon name={sub.icon || 'chapters'} size={14} />
                <span>{sub.name}</span>
                <span className="nm-pill-count">{subNotesCount}/{subChaps.length}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="nm-search-filter-row">
          <div className="nm-search-input-wrap">
            <AppIcon name="search" size={15} />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nm-search-input"
            />
            {searchQuery && (
              <button type="button" className="nm-clear-btn" onClick={() => setSearchQuery('')}>
                <AppIcon name="close" size={13} />
              </button>
            )}
          </div>

          <select
            className="nm-status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Chapters ({courseChapters.length})</option>
            <option value="has_notes">With Notes ({chaptersWithNotes})</option>
            <option value="no_notes">Missing Notes ({chaptersMissingNotes})</option>
          </select>
        </div>
      </div>

      {/* ── 4. Chapter Notes List ─────────────────────────────────── */}
      <div className="nm-chapters-table-container">
        {visibleChapters.length === 0 ? (
          <div className="nm-empty-state">
            <AppIcon name="document" size={36} />
            <h3>No Chapters Found</h3>
            <p>No chapters match your selected filters. Switch subject or clear search query.</p>
          </div>
        ) : (
          <div className="nm-chapters-grid">
            {visibleChapters.map((chapter, idx) => {
              const note = getNoteForChapter(chapter)
              const hasNote = note !== null
              const subject = courseSubjects.find((s) => s.id === (chapter.subjectId || selectedSubjectId)) || { name: chapter.subject || 'Subject' }
              const wordCount = note?.content ? note.content.trim().split(/\s+/).length : 0
              const readTime = Math.max(1, Math.ceil(wordCount / 200))

              return (
                <div key={chapter.id || idx} className={`nm-chapter-card${hasNote ? ' has-note' : ' missing-note'}`}>
                  <div className="nm-card-top">
                    <span className="nm-ch-badge">Ch. {chapter.number || idx + 1}</span>
                    <span className={`nm-status-badge ${hasNote ? 'published' : 'missing'}`}>
                      {hasNote ? '🟢 Published' : '⚪ No Notes'}
                    </span>
                  </div>

                  <div className="nm-card-main">
                    <h4 className="nm-card-chapter-title">{chapter.name}</h4>
                    <span className="nm-card-subject-tag">{subject.name}</span>

                    {hasNote ? (
                      <div className="nm-note-preview-box">
                        <div className="nm-note-title-line">
                          <AppIcon name="notesTab" size={14} />
                          <strong>{note.title}</strong>
                        </div>
                        <div className="nm-note-stats-line">
                          <span>{wordCount} words</span>
                          <span>•</span>
                          <span>~{readTime} min read</span>
                          {note.updatedAt && (
                            <>
                              <span>•</span>
                              <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="nm-no-note-prompt">
                        <AppIcon name="edit" size={14} />
                        <span>No notes available for this chapter. Click below to author rich notes.</span>
                      </div>
                    )}
                  </div>

                  <div className="nm-card-actions">
                    <Button
                      variant={hasNote ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenEditor(chapter)}
                    >
                      <AppIcon name={hasNote ? 'edit' : 'add'} size={14} />
                      {hasNote ? 'Edit Notes' : 'Create Notes'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 5. Notes Editor Modal ─────────────────────────────────── */}
      {isEditorOpen && activeEditorNote && (
        <ChapterNotesEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          courseId={activeWorkspaceId}
          courseName={activeCourse?.name}
          subjectId={activeEditorNote.subject?.id || selectedSubjectId}
          subjectName={activeEditorNote.subject?.name}
          chapterId={activeEditorNote.chapter?.id}
          chapterName={activeEditorNote.chapter?.name}
          chapterNumber={activeEditorNote.chapter?.number || 1}
          initialNote={activeEditorNote.note}
          onSaved={(savedNote) => {
            // Note store automatically synced via noteService & hydrateAdminStoreFromSupabase
          }}
        />
      )}
    </div>
  )
}
