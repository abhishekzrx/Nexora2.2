/**
 * SubjectDetailPage
 * Universal reusable Subject Detail / Chapter Analytics page.
 * Renders dynamically based on the selected subject from mock data.
 */
import { useEffect, useMemo, useState } from 'react'
import '../styles/subjectDetail.css'
import { getSubject } from '../data/mockData'
import { deriveAnalytics } from '../utils/deriveAnalytics'
import Header from '../components/layout/Header'
import MobileLayout from '../components/layout/MobileLayout'
import SubjectHero from '../components/subject/SubjectHero'
import Tabs from '../components/subject/Tabs'
import ChapterCard from '../components/subject/ChapterCard'
import StatGrid from '../components/subject/StatGrid'
import BarList from '../components/subject/BarList'
import WeakTopics from '../components/subject/WeakTopics'
import StudyStats from '../components/subject/StudyStats'
import TimeSpent from '../components/subject/TimeSpent'
import Achievements from '../components/subject/Achievements'
import AccuracyChart from '../components/subject/AccuracyChart'
import AppIcon from '../components/ui/AppIcon'
import { subjectTabs } from '../utils/navigation'

const tabItems = [
  { key: 'chapters', icon: 'chapters', label: 'Chapters' },
  { key: 'mcqs', icon: 'mcqs', label: 'MCQs' },
  { key: 'flashcards', icon: 'flashcardsTab', label: 'Flashcards' },
  { key: 'notes', icon: 'notesTab', label: 'Notes' },
  { key: 'analytics', icon: 'analyticsTab', label: 'Analytics' },
]

function SubjectDetailPage({
  subjectKey,
  onBackToSubjects = () => {},
  onNavigateHome = () => {},
  onNavigateSubjects = () => {},
  onStartMCQPractice = () => {},
  onChapterClick = () => {},
}) {
  const subject = getSubject(subjectKey)
  const derived = useMemo(() => deriveAnalytics(subject), [subject])
  const [activeTab, setActiveTab] = useState(() => subjectTabs[subjectKey] || 'chapters')

  // Persist the selected tab per subject so returning from MCQ practice
  // (or any navigation) does not reset the user's context.
  useEffect(() => {
    subjectTabs[subjectKey] = activeTab
  }, [subjectKey, activeTab])

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
          <div className="chapter-list">
            {subject.chapters.map((chapter) => (
              <ChapterCard key={chapter.num} chapter={chapter} onClick={onChapterClick} />
            ))}
          </div>
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
          <StatGrid metrics={derived.mcqMetrics} />
          <BarList title="MCQ Practice" items={derived.mcqList} />
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
        <>
          <StatGrid metrics={derived.notesMetrics} />
          <WeakTopics title="Pinned Notes" items={derived.notesList} />
        </>
      )
    }

    return (
      <>
        <StatGrid metrics={derived.metrics} streakIndex={2} />
        <AccuracyChart values={derived.trend} />
        <BarList title="Chapter-wise Accuracy" items={derived.breakdown} />
        <WeakTopics items={derived.focus} />
        <StudyStats items={derived.study} />
        <TimeSpent items={derived.timeSpent} />
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