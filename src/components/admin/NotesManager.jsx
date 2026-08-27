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
import { useAdminStore, hydrateAdminStoreFromSupabase } from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { noteService } from '../../services/noteService'

export default function NotesManager({ courseName = '' }) {
  const { subjects, chapters, notes, allSubjects, allChapters, allNotes } = useAdminStore()
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()

  const [selectedSubjectId, setSelectedSubjectId] = useState('')
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

  // Hydrate store from Supabase when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      hydrateAdminStoreFromSupabase().catch(() => {})
    }
  }, [activeWorkspaceId])

  // Select first subject by default if not set
  useEffect(() => {
    if (courseSubjects.length > 0 && selectedSubjectId && !courseSubjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(courseSubjects[0].id)
    }
  }, [courseSubjects, selectedSubjectId])

  // Helper to get note for a chapter with robust string/title matching
  const getNoteForChapter = useCallback((chapter) => {
    if (!chapter) return null
    const chapIdStr = String(chapter.id || '').trim()
    const chapNameLower = String(chapter.name || chapter.title || '').trim().toLowerCase()
    
    return courseNotes.find((n) => {
      const nChapIdStr = String(n.chapterId || n.chapter_id || '').trim()
      if (nChapIdStr && chapIdStr && nChapIdStr === chapIdStr) return true
      if (n.title && chapNameLower && n.title.toLowerCase().includes(chapNameLower)) return true
      if (n.chapterName && chapNameLower && n.chapterName.toLowerCase() === chapNameLower) return true
      return false
    }) || null
  }, [courseNotes])

  // Helper to determine status: 'completed' | 'in_progress' | 'not_started'
  const getChapterNoteStatus = useCallback((chapter) => {
    const note = getNoteForChapter(chapter)
    if (!note) return 'not_started'
    const status = (note.status || '').toLowerCase()
    if (status === 'completed' || status === 'published') return 'completed'
    if (status === 'in_progress' || status === 'draft') return 'in_progress'
    const len = (note.content || '').trim().length
    if (len >= 300) return 'completed'
    if (len > 0) return 'in_progress'
    return 'not_started'
  }, [getNoteForChapter])

  // Handle status toggle on click
  const handleToggleStatus = async (chapter, e) => {
    if (e) e.stopPropagation()
    const existingNote = getNoteForChapter(chapter)
    const currentStatus = getChapterNoteStatus(chapter)

    let nextStatus = 'in_progress'
    if (currentStatus === 'not_started') nextStatus = 'in_progress'
    else if (currentStatus === 'in_progress') nextStatus = 'completed'
    else if (currentStatus === 'completed') nextStatus = 'not_started'

    const chapSubId = String(chapter.subjectId || chapter.subject_id || selectedSubjectId || '').trim()

    if (existingNote) {
      await noteService.updateNote(existingNote.id, {
        ...existingNote,
        status: nextStatus === 'completed' ? 'published' : nextStatus === 'in_progress' ? 'draft' : 'not_started',
      })
    } else if (nextStatus !== 'not_started') {
      await noteService.createNote({
        courseId: activeWorkspaceId,
        subjectId: chapSubId,
        chapterId: String(chapter.id),
        chapterName: chapter.name || chapter.title || '',
        title: `${chapter.name || 'Chapter'} Notes`,
        content: `# ${chapter.name || 'Chapter'} Notes\n\nStudy notes content in progress.`,
        status: nextStatus === 'completed' ? 'published' : 'draft',
      })
    }
  }

  // Analytics & Status Counts
  const totalChapters = courseChapters.length
  const completedCount = useMemo(() => courseChapters.filter((c) => getChapterNoteStatus(c) === 'completed').length, [courseChapters, getChapterNoteStatus])
  const inProgressCount = useMemo(() => courseChapters.filter((c) => getChapterNoteStatus(c) === 'in_progress').length, [courseChapters, getChapterNoteStatus])
  const notStartedCount = useMemo(() => courseChapters.filter((c) => getChapterNoteStatus(c) === 'not_started').length, [courseChapters, getChapterNoteStatus])
  const chaptersWithNotes = completedCount + inProgressCount
  const chaptersMissingNotes = notStartedCount
  const noteCoveragePct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0

  // Filtered chapters for current selection
  const visibleChapters = useMemo(() => {
    let list = courseChapters

    if (selectedSubjectId) {
      list = list.filter(
        (c) =>
          String(c.subjectId) === String(selectedSubjectId) ||
          String(c.subject_id) === String(selectedSubjectId) ||
          (c.subject && courseSubjects.find((s) => s.id === selectedSubjectId)?.name === c.subject)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) => (c.name || c.title || '').toLowerCase().includes(q))
    }

    if (statusFilter === 'completed') {
      list = list.filter((c) => getChapterNoteStatus(c) === 'completed')
    } else if (statusFilter === 'in_progress') {
      list = list.filter((c) => getChapterNoteStatus(c) === 'in_progress')
    } else if (statusFilter === 'not_started') {
      list = list.filter((c) => getChapterNoteStatus(c) === 'not_started')
    }

    return list
  }, [courseChapters, selectedSubjectId, searchQuery, statusFilter, courseSubjects, getChapterNoteStatus])

  // Open Editor for a chapter
  const handleOpenEditor = (chapter) => {
    const existingNote = getNoteForChapter(chapter)
    const chapSubId = String(chapter.subjectId || chapter.subject_id || '').trim()
    const chapSubName = String(chapter.subject || '').trim().toLowerCase()

    const subject =
      courseSubjects.find(
        (s) =>
          (chapSubId && String(s.id).trim() === chapSubId) ||
          (chapSubName && String(s.name).trim().toLowerCase() === chapSubName) ||
          String(s.id).trim() === String(selectedSubjectId).trim()
      ) ||
      courseSubjects[0] || { id: chapSubId || 'general', name: chapter.subject || 'General' }

    setActiveEditorNote({
      chapter,
      subject,
      note: existingNote,
    })
    setIsEditorOpen(true)
  }

  return (
    <div className="nm-root-container">
      {/* ── 1. Top Header & Course Selector ──────────────────────── */}
      <div className="nm-header-section">
        <div className="nm-heading-wrap">
          <div className="nm-eyebrow">
            <span className="live-pulse-dot" />
            <span>Active Notes Workspace</span>
          </div>
          <h2 className="nm-heading">Chapter Study Notes Studio</h2>
        </div>

        <div className="nm-course-switch-badge" title="Select Course to Manage Notes">
          <span className="nm-course-badge-prefix">
            <AppIcon name="folder" size={13} /> Course:
          </span>
          <select
            className="nm-course-select"
            value={activeWorkspaceId}
            onChange={(e) => setActiveWorkspace(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 2. Content Health Stats Grid ─────────────────────────── */}
      <div className="nm-stats-grid">
        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <AppIcon name="check" size={18} />
          </div>
          <div>
            <div className="nm-stat-value">{completedCount}</div>
            <div className="nm-stat-label">Completed Notes</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <AppIcon name="edit" size={18} />
          </div>
          <div>
            <div className="nm-stat-value">{inProgressCount}</div>
            <div className="nm-stat-label">In Progress</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#F1F5F9', color: '#64748B' }}>
            <AppIcon name="warning" size={18} />
          </div>
          <div>
            <div className="nm-stat-value">{notStartedCount}</div>
            <div className="nm-stat-label">Not Started</div>
          </div>
        </div>

        <div className="nm-stat-card">
          <div className="nm-stat-icon-wrap" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            <AppIcon name="target" size={18} />
          </div>
          <div>
            <div className="nm-stat-value">{noteCoveragePct}%</div>
            <div className="nm-stat-label">Readiness</div>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Controls Row ─────────────────────────────── */}
      <div className="nm-controls-bar">
        {/* Subject Horizontal Pill Scroll Strip */}
        <div className="nm-subject-scroll-container">
          <div className="nm-subject-pills-row">
            <button
              type="button"
              className={`nm-subject-pill${!selectedSubjectId ? ' active' : ''}`}
              onClick={() => setSelectedSubjectId('')}
            >
              <AppIcon name="chapters" size={13} />
              <span>All Subjects</span>
              <span className="nm-pill-count">{chaptersWithNotes}/{totalChapters}</span>
            </button>
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
                  <AppIcon name={sub.icon || 'chapters'} size={13} />
                  <span>{sub.name}</span>
                  <span className="nm-pill-count">{subNotesCount}/{subChaps.length}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search & Status Filter Row */}
        <div className="nm-search-filter-row">
          <div className="nm-search-input-wrap">
            <AppIcon name="search" size={14} />
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nm-search-input"
            />
            {searchQuery && (
              <button type="button" className="nm-clear-btn" onClick={() => setSearchQuery('')}>
                <AppIcon name="close" size={12} />
              </button>
            )}
          </div>

          <select
            className="nm-status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status ({visibleChapters.length})</option>
            <option value="completed">🟢 Completed ({completedCount})</option>
            <option value="in_progress">🟡 In Progress ({inProgressCount})</option>
            <option value="not_started">⚪ Not Started ({notStartedCount})</option>
          </select>
        </div>
      </div>

      {/* ── 4. Smart Mini Chapter Cards Grid ─────────────────────── */}
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
              const statusKey = getChapterNoteStatus(chapter)
              const subject = courseSubjects.find((s) => s.id === (chapter.subjectId || selectedSubjectId)) || { name: chapter.subject || 'Subject' }
              const wordCount = note?.content ? note.content.trim().split(/\s+/).length : 0
              const readTime = Math.max(1, Math.ceil(wordCount / 200))
              const chNum = String(chapter.number || idx + 1).padStart(2, '0')

              const statusMeta = {
                completed: { label: 'Completed', dotClass: 'green', chipClass: 'completed' },
                in_progress: { label: 'In Progress', dotClass: 'amber', chipClass: 'in-progress' },
                not_started: { label: 'Not Started', dotClass: 'gray', chipClass: 'not-started' },
              }[statusKey]

              return (
                <div
                  key={chapter.id || idx}
                  className={`nm-mini-chapter-card ${statusKey}`}
                  onClick={() => handleOpenEditor(chapter)}
                >
                  {/* Top Row: Order Pill, Subject Badge & Status Chip */}
                  <div className="nm-mini-card-top">
                    <div className="nm-mini-left-pills">
                      <span className="nm-mini-order-pill">CH {chNum}</span>
                      <span className="nm-mini-sub-pill">{subject.name}</span>
                    </div>

                    <button
                      type="button"
                      className={`nm-mini-status-chip ${statusMeta.chipClass}`}
                      onClick={(e) => handleToggleStatus(chapter, e)}
                      title="Click to toggle status (Completed → In Progress → Not Started)"
                    >
                      <span className={`sm-dot ${statusMeta.dotClass}`} />
                      <span>{statusMeta.label}</span>
                    </button>
                  </div>

                  {/* Middle Row: Chapter Title */}
                  <div className="nm-mini-card-body">
                    <h4 className="nm-mini-chapter-title" title={chapter.name}>
                      {chapter.name}
                    </h4>
                  </div>

                  {/* Bottom Row: Word Count Pill & Micro Action Button */}
                  <div className="nm-mini-card-footer">
                    <div className="nm-mini-meta-stats">
                      <span className="nm-mini-meta-pill">
                        <AppIcon name="document" size={11} /> {wordCount > 0 ? `${wordCount}w` : '0w'}
                      </span>
                      {wordCount > 0 && (
                        <span className="nm-mini-meta-pill">
                          <AppIcon name="clock" size={11} /> ~{readTime}m
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="nm-mini-action-btn"
                      onClick={(e) => { e.stopPropagation(); handleOpenEditor(chapter) }}
                      title="Edit / Author Notes"
                    >
                      <AppIcon name={note ? 'edit' : 'add'} size={12} />
                      <span>{note ? 'Edit' : 'Notes'}</span>
                    </button>
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
            if (savedNote && activeEditorNote) {
              setActiveEditorNote((prev) => (prev ? { ...prev, note: savedNote } : null))
            }
          }}
        />
      )}
    </div>
  )
}
