/**
 * SubjectDetailPage
 * Universal reusable Subject Detail / Chapter Analytics page.
 * Renders dynamically based on the selected subject from course registry.
 */
import { useEffect, useMemo, useState } from 'react'
import '../styles/subjectDetail.css'
import { useCourseRegistry } from '../data/courseRegistry'
import { useWorkspaceStore } from '../data/workspaceStore'
import { deriveAnalytics } from '../utils/deriveAnalytics'
import Header from '../components/layout/Header'
import MobileLayout from '../components/layout/MobileLayout'
import SubjectHero from '../components/subject/SubjectHero'
import Tabs from '../components/subject/Tabs'
import ChapterCard from '../components/subject/ChapterCard'
import CoverageLegendCard from '../components/subject/CoverageLegendCard'
import ChapterMcqAnalytics from '../components/subject/ChapterMcqAnalytics'
import StatGrid from '../components/subject/StatGrid'
import BarList from '../components/subject/BarList'
import WeakTopics from '../components/subject/WeakTopics'
import StudyStats from '../components/subject/StudyStats'
import TimeSpent from '../components/subject/TimeSpent'
import Achievements from '../components/subject/Achievements'
import AccuracyChart from '../components/subject/AccuracyChart'
import AppIcon from '../components/ui/AppIcon'
import ChapterNotesView from '../components/student/ChapterNotesView'
import { subjectTabs } from '../utils/navigation'

const tabItems = [
  { key: 'chapters', icon: 'chapters', label: 'Chapters' },
  { key: 'mcqs', icon: 'mcqs', label: 'MCQs' },
  { key: 'flashcards', icon: 'flashcardsTab', label: 'Flashcards' },
  { key: 'notes', icon: 'notesTab', label: 'Notes' },
  { key: 'analytics', icon: 'analyticsTab', label: 'Analytics' },
]

function SubjectDetailPage({
  courseId,
  subjectKey,
  onBackToSubjects = () => {},
  onNavigateHome = () => {},
  onNavigateSubjects = () => {},
  onStartMCQPractice = () => {},
  onChapterClick = () => {},
}) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const registry = useCourseRegistry(courseId || activeWorkspaceId)
  const subject = registry.subjectCatalog[subjectKey] || null
  const derived = useMemo(() => subject ? deriveAnalytics(subject) : null, [subject])
  const [activeTab, setActiveTab] = useState(() => subjectTabs[subjectKey] || 'chapters')

  const activeCourse = workspaces.find((w) => w.id === (courseId || activeWorkspaceId)) || workspaces[0]

  useEffect(() => {
    subjectTabs[subjectKey] = activeTab
  }, [subjectKey, activeTab])

  if (!subject) {
    return (
      <div className="subject-detail-shell">
        <MobileLayout activeTab="Subjects" disabledItems={['Practice', 'Profile']}>
          <Header variant="back" title="Subject" onBackClick={onBackToSubjects} />
          <main className="content">
            <div className="acad-empty" style={{ marginTop: 24 }}>
              <AppIcon name="chapters" size={28} />
              <p>This subject is no longer available in {activeCourse?.name || 'this course'}.</p>
              <button type="button" className="btn btn-primary" onClick={onBackToSubjects}>
                Back to Subjects
              </button>
            </div>
          </main>
        </MobileLayout>
      </div>
    )
  }

  const renderContent = () => {
    if (activeTab === 'chapters') {
      return (
        <>
          <div className="chapters-header">
            <div className="chapters-title">All Chapters ({subject.chapters.length})</div>
            <div className="chapters-actions">
              <button type="button" className="sort-btn" disabled>
                <AppIcon name="sort" size={14} />
                Sort
              </button>
              <button type="button" className="view-btn active" disabled>
                <AppIcon name="viewList" size={16} />
              </button>
              <button type="button" className="view-btn" disabled>
                <AppIcon name="viewGrid" size={16} />
              </button>
            </div>
          </div>
          {subject.chapters.length === 0 ? (
            <div className="empty-chapters-card">
              <div className="empty-chapters-icon-badge">
                <AppIcon name="document" size={32} />
              </div>
              <h3 className="empty-chapters-title">No Chapters Added Yet</h3>
              <p className="empty-chapters-sub">
                There are currently no chapters available for <strong>{subject.title}</strong>. Our curriculum team is actively preparing content for this subject!
              </p>
              <button type="button" className="empty-chapters-btn" onClick={onBackToSubjects}>
                ← Back to All Subjects
              </button>
            </div>
          ) : (
            <div className="chapter-list">
              {subject.chapters.map((chapter) => (
                <ChapterCard key={chapter.id || chapter.num} chapter={chapter} onClick={onChapterClick} />
              ))}
            </div>
          )}
          <CoverageLegendCard subject={subject} />
          <div className="banner">
            <div className="banner-left">
              <div className="banner-icon">
                <AppIcon name="target" size={18} />
              </div>
              <div>
                <div className="banner-title">Keep going! You're doing great.</div>
                <div className="banner-sub">Complete the next chapter to improve your score.</div>
              </div>
            </div>
            <button type="button" className="banner-btn" onClick={() => onStartMCQPractice(subjectKey)}>
              Continue Learning →
            </button>
          </div>
        </>
      )
    }

    if (activeTab === 'mcqs') {
      return (
        <>
          <ChapterMcqAnalytics subject={subject} />
        </>
      )
    }

    if (activeTab === 'flashcards') {
      return (
        <>
          <StatGrid metrics={derived.flashMetrics} />
          <BarList title="Flashcard Decks" items={derived.flashList} />
        </>
      )
    }

    if (activeTab === 'notes') {
      return (
        <ChapterNotesView
          courseId={courseId || activeWorkspaceId}
          subject={subject}
        />
      )
    }

    return (
      <>
        <ChapterMcqAnalytics subject={subject} />
        <StatGrid metrics={derived.metrics} streakIndex={2} />
        <AccuracyChart values={derived.trend} />
        <WeakTopics items={derived.focus} />
        <StudyStats items={derived.study} />
        <Achievements items={derived.achievements} />
      </>
    )
  }

  return (
    <div
      className="subject-detail-shell"
      style={{
        '--accent': subject.accent,
        '--accent-light': subject.accentLight,
        '--accent-bg': subject.accentBg,
        '--accent-soft': subject.accentSoft,
      }}
    >
      <MobileLayout
        activeTab="Subjects"
        disabledItems={['Practice', 'Profile']}
        onNavigate={(item) => {
          if (item.center) {
            onStartMCQPractice(subjectKey)
          } else if (item.label === 'Home') {
            onNavigateHome()
          } else if (item.label === 'Subjects') {
            onNavigateSubjects()
          }
        }}
      >
        <Header
          variant="back"
          title={subject.title}
          onBackClick={onBackToSubjects}
          right={
            <div className="header-icons">
              <span className="disabled-icon">
                <AppIcon name="bookmark" size={18} />
              </span>
              <span className="disabled-icon">
                <AppIcon name="moreVert" size={18} />
              </span>
            </div>
          }
        />

        <main className="content">
          <SubjectHero subject={subject} />
          <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
          <div className="tab-content-wrapper">{renderContent()}</div>
        </main>
      </MobileLayout>
    </div>
  )
}

export default SubjectDetailPage
