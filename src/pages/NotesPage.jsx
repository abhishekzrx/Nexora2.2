/**
 * NotesPage.jsx
 * Dedicated Student Notes Hub.
 * Filters and renders ONLY the subjects that have notes.
 * Directly links students into the rich Chapter Notes Reader.
 */
import { useMemo, useState, useRef } from 'react'
import '../styles/notesPage.css'
import AppIcon from '../components/ui/AppIcon'
import MobileLayout from '../components/layout/MobileLayout'
import SideDrawer from '../components/layout/SideDrawer'
import { useCourseRegistry } from '../data/courseRegistry'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useMemberStore } from '../data/memberStore'
import { permissionService } from '../services/permissionService'
import { subjectTabs } from '../utils/navigation'

const TONE_MAP = [
  { iconClass: 'icon-orange', accent: '#F1621B', accentBg: 'rgba(241, 98, 27, 0.15)' },
  { iconClass: 'icon-blue', accent: '#38BDF8', accentBg: 'rgba(56, 189, 248, 0.15)' },
  { iconClass: 'icon-green', accent: '#34D399', accentBg: 'rgba(52, 211, 153, 0.15)' },
  { iconClass: 'icon-purple', accent: '#A78BFA', accentBg: 'rgba(167, 139, 250, 0.15)' },
  { iconClass: 'icon-teal', accent: '#2DD4BF', accentBg: 'rgba(45, 212, 191, 0.15)' },
  { iconClass: 'icon-red', accent: '#F87171', accentBg: 'rgba(248, 113, 113, 0.15)' },
]

const drawerSections = [
  {
    label: 'MAIN',
    items: [
      { icon: 'home', label: 'Dashboard' },
      { icon: 'subjects', label: 'Subjects' },
      { icon: 'practice', label: 'Practice' },
      { icon: 'flashcards', label: 'Flashcards', disabled: true },
      { icon: 'mockTests', label: 'Mock Tests', disabled: true },
    ],
  },
  {
    label: 'LEARNING',
    items: [
      { icon: 'notes', label: 'Notes', active: true },
      { icon: 'analytics', label: 'Analytics', disabled: true },
      { icon: 'studyPlanner', label: 'Study Planner', disabled: true },
      { icon: 'leaderboard', label: 'Leaderboard', disabled: true },
    ],
  },
  {
    label: 'MORE',
    items: [
      { icon: 'notifications', label: 'Notifications', badge: '3', disabled: true },
      { icon: 'settings', label: 'Settings', disabled: true },
      { icon: 'help', label: 'Help & Support', disabled: true },
      { icon: 'adminDashboard', label: 'Admin' },
    ],
  },
]

export default function NotesPage({
  courseId,
  onNavigateHome = () => {},
  onNavigateSubjects = () => {},
  onNavigatePractice = () => {},
  onOpenSubjectNotes = () => {},
  onNavigateAdmin = () => {},
  onLogout = () => {},
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef(null)

  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { effectiveMember } = useMemberStore()
  const registry = useCourseRegistry(courseId || activeWorkspaceId)

  const activeCourse = useMemo(() => {
    return workspaces.find((w) => w.id === (courseId || activeWorkspaceId)) || workspaces[0]
  }, [workspaces, courseId, activeWorkspaceId])

  // Filter allowed subjects for current member
  const allowedSubjects = useMemo(() => {
    const rawList = [...(registry.subjectsList || [])]
    return permissionService.filterAllowedSubjects(effectiveMember, activeCourse?.id, rawList)
  }, [registry.subjectsList, effectiveMember, activeCourse?.id])

  // STRICT FILTER: Show ONLY subjects that have notes!
  const subjectsWithNotes = useMemo(() => {
    return allowedSubjects.filter((sub) => {
      const notesCount = sub.counts?.notes ?? sub.notes ?? sub.notesCount ?? 0
      const hasChapterNotes = Array.isArray(sub.chapters) && sub.chapters.some(
        (c) => (c.notes || 0) > 0 || (c.totalNotes || 0) > 0 || (c.chNotes && c.chNotes.length > 0)
      )
      return notesCount > 0 || hasChapterNotes
    })
  }, [allowedSubjects])

  // Compute aggregate notes stats across the course
  const notesStats = useMemo(() => {
    let totalNotes = 0
    let totalChaptersWithNotes = 0

    subjectsWithNotes.forEach((s) => {
      const nCount = s.counts?.notes ?? s.notes ?? 0
      totalNotes += nCount
      if (s.chapters) {
        s.chapters.forEach((c) => {
          if ((c.notes || 0) > 0 || (c.totalNotes || 0) > 0 || (c.chNotes && c.chNotes.length > 0)) {
            totalChaptersWithNotes += 1
          }
        })
      }
    })

    const finalNotes = totalNotes > 0 ? totalNotes : totalChaptersWithNotes
    const estReadingTimeMin = finalNotes * 8 // ~8 mins average per chapter revision note

    return {
      totalSubjectsWithNotes: subjectsWithNotes.length,
      totalNotes: finalNotes,
      totalChaptersWithNotes,
      estReadingTimeMin,
    }
  }, [subjectsWithNotes])

  // Search filter
  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjectsWithNotes
    const q = search.toLowerCase().trim()
    return subjectsWithNotes.filter((s) => {
      const matchTitle = s.title.toLowerCase().includes(q)
      const matchDesc = s.desc && s.desc.toLowerCase().includes(q)
      const matchChapter = s.chapters && s.chapters.some(
        (c) => c.title && c.title.toLowerCase().includes(q)
      )
      return matchTitle || matchDesc || matchChapter
    })
  }, [subjectsWithNotes, search])

  const handleOpenSubjectNotes = (subjectKey) => {
    subjectTabs[subjectKey] = 'notes'
    onOpenSubjectNotes(subjectKey)
  }

  return (
    <div className="notes-hub-shell">
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={onLogout}
        profile={{
          name: effectiveMember?.display_name || 'Student',
          warrior: `${effectiveMember?.warrior_name || 'WARRIOR'} • ${effectiveMember?.public_user_id || 'NEX-WAR-001'}`,
          sub: `${activeCourse?.name || 'Select Course'}`,
          streak: '14 Day Streak',
        }}
        sections={drawerSections}
        onItemClick={(item) => {
          setDrawerOpen(false)
          if (item.label === 'Dashboard') onNavigateHome()
          else if (item.label === 'Subjects') onNavigateSubjects()
          else if (item.label === 'Practice') onNavigatePractice()
          else if (item.label === 'Admin') onNavigateAdmin()
        }}
      />

      <MobileLayout
        className="notes-hub-phone"
        activeTab="Subjects"
        disabledItems={['Profile']}
        onNavigate={(item) => {
          if (item.center || item.label === 'Subjects') {
            onNavigateSubjects()
          } else if (item.label === 'Home') {
            onNavigateHome()
          } else if (item.label === 'Practice') {
            onNavigatePractice()
          }
        }}
      >
        {/* Sticky Header */}
        <header className="notes-header">
          <div className="notes-header-left">
            <button
              type="button"
              className="notes-header-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <AppIcon name="menu" size={20} />
            </button>
            <div className="notes-header-title">Study Notes</div>
          </div>
          <div className="notes-header-right">
            <button
              type="button"
              className="notes-header-btn"
              aria-label="Search notes"
              onClick={() => searchInputRef.current?.focus()}
            >
              <AppIcon name="search" size={18} />
            </button>
            <div className="avatar" aria-hidden="true">
              <AppIcon name="profile" size={20} />
            </div>
          </div>
        </header>

        <main className="notes-content">
          {/* Notes Hero Section */}
          <section className="notes-hero-card">
            <div className="notes-hero-glow" aria-hidden="true" />
            <div className="notes-hero-badge-row">
              <span className="notes-hero-badge">
                <span className="notes-hero-pulse-dot" />
                Curated Revision Notes
              </span>
              <span className="notes-hero-course-name">
                {activeCourse?.name || 'Active Course'}
              </span>
            </div>

            <h1 className="notes-hero-title">Master Concepts Step-by-Step</h1>
            <p className="notes-hero-sub">
              Access high-yield theoretical summaries, formulas, and visual diagrams curated for rapid retention.
            </p>

            <div className="notes-hero-chips">
              <div className="notes-hero-chip">
                <span className="notes-chip-val text-cyan">{notesStats.totalSubjectsWithNotes}</span>
                <span className="notes-chip-lbl">Subjects with Notes</span>
              </div>
              <div className="notes-hero-chip">
                <span className="notes-chip-val text-green">{notesStats.totalNotes}</span>
                <span className="notes-chip-lbl">Total Notes</span>
              </div>
              <div className="notes-hero-chip">
                <span className="notes-chip-val text-amber">~{notesStats.estReadingTimeMin}m</span>
                <span className="notes-chip-lbl">Est. Read Time</span>
              </div>
            </div>
          </section>

          {/* Search Box */}
          <section className="notes-search-section">
            <div className="notes-search-bar">
              <span className="notes-search-icon" aria-hidden="true">
                <AppIcon name="search" size={17} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="notes-search-input"
                placeholder="Search subjects or note topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="notes-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <AppIcon name="close" size={14} />
                </button>
              )}
            </div>
          </section>

          {/* Section Heading */}
          <div className="notes-section-head">
            <div className="notes-section-title">
              <span>Available Subjects</span>
              <span className="notes-section-count">{filteredSubjects.length}</span>
            </div>
            <span className="notes-section-hint">Showing only subjects with notes</span>
          </div>

          {/* Subjects Grid (ONLY Subjects with notes) */}
          <section className="notes-subject-grid">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject, index) => {
                const tone = TONE_MAP[index % TONE_MAP.length]
                const subjectNotesCount = subject.counts?.notes ?? subject.notes ?? 1
                const chaptersWithNotes = (subject.chapters || []).filter(
                  (c) => (c.notes || 0) > 0 || (c.totalNotes || 0) > 0 || (c.chNotes && c.chNotes.length > 0)
                )

                return (
                  <div
                    key={subject.subjectKey || subject.title}
                    className="note-subject-card"
                    onClick={() => handleOpenSubjectNotes(subject.subjectKey)}
                  >
                    <div className="note-subject-card-head">
                      <div className="note-subject-meta-left">
                        <div
                          className="note-subject-icon-box"
                          style={{ background: tone.accentBg, color: tone.accent }}
                        >
                          <AppIcon name={subject.icon || 'notes'} size={22} />
                        </div>
                        <div className="note-subject-title-wrap">
                          <h2 className="note-subject-title">{subject.title}</h2>
                          <div className="note-subject-stats-line">
                            <span>{subject.chapters?.length || 0} Chapters</span>
                            <span>•</span>
                            <span>{subjectNotesCount} Note{subjectNotesCount !== 1 ? 's' : ''} Ready</span>
                          </div>
                        </div>
                      </div>

                      <div className="note-count-pill">
                        <AppIcon name="notes" size={12} />
                        <span>{subjectNotesCount} NOTE{subjectNotesCount !== 1 ? 'S' : ''}</span>
                      </div>
                    </div>

                    {/* Chapter Previews */}
                    {chaptersWithNotes.length > 0 && (
                      <div className="note-chapters-preview">
                        {chaptersWithNotes.slice(0, 3).map((ch, idx) => (
                          <div key={ch.id || idx} className="note-chapter-item">
                            <span className="note-ch-tag">Ch. {ch.num || idx + 1}</span>
                            <span className="note-ch-name">{ch.title || ch.name}</span>
                            <span className="note-ch-status">
                              <AppIcon name="check" size={11} />
                              Ready
                            </span>
                          </div>
                        ))}
                        {chaptersWithNotes.length > 3 && (
                          <div style={{ fontSize: '0.74rem', color: '#94A3B8', textAlign: 'center', paddingTop: '2px' }}>
                            + {chaptersWithNotes.length - 3} more chapters with notes
                          </div>
                        )}
                      </div>
                    )}

                    <div className="note-subject-card-footer">
                      <span className="note-subject-read-hint">
                        <AppIcon name="book" size={13} />
                        Interactive Reader available
                      </span>
                      <button
                        type="button"
                        className="note-read-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenSubjectNotes(subject.subjectKey)
                        }}
                      >
                        Read Notes →
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="notes-empty-card">
                <div className="notes-empty-icon">
                  <AppIcon name="notes" size={28} />
                </div>
                <div className="notes-empty-title">
                  {search ? 'No Matching Notes Found' : 'No Notes in this Course Yet'}
                </div>
                <div className="notes-empty-sub">
                  {search
                    ? `No subjects with notes matched "${search}". Try searching for another topic or clear the search.`
                    : 'Notes for this course are currently being authored and published. Check back soon or explore practice MCQs!'}
                </div>
                {search ? (
                  <button
                    type="button"
                    className="notes-empty-action-btn"
                    onClick={() => setSearch('')}
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    className="notes-empty-action-btn"
                    onClick={onNavigateSubjects}
                  >
                    Explore All Subjects
                  </button>
                )}
              </div>
            )}
          </section>
        </main>
      </MobileLayout>
    </div>
  )
}
