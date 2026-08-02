/**
 * SubjectDetailPage
 * Universal reusable Subject Detail / Chapter Analytics page.
 * Renders dynamically based on the selected subject from mock data.
 */
import { useEffect, useMemo, useState } from 'react'
import '../styles/subjectDetail.css'
import { getSubject } from '../data/mockData'
import { deriveAnalytics } from '../utils/deriveAnalytics'
import PhoneFrame from '../components/layout/PhoneFrame'
import Header from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
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

const tabItems = [
  { key: 'chapters', icon: '📖', label: 'Chapters' },
  { key: 'mcqs', icon: '❓', label: 'MCQs' },
  { key: 'flashcards', icon: '🗂️', label: 'Flashcards' },
  { key: 'notes', icon: '📝', label: 'Notes' },
  { key: 'analytics', icon: '📊', label: 'Analytics' },
]

const bottomNav = [
  { icon: '🏠', label: 'Home' },
  { icon: '▦', label: 'Subjects', active: true },
  { icon: '📖', label: 'center', center: true },
  { icon: '📝', label: 'Practice' },
  { icon: '👤', label: 'Profile' },
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
  const [activeTab, setActiveTab] = useState('chapters')

  useEffect(() => {
    setActiveTab('chapters')
  }, [subjectKey])

  const renderContent = () => {
    if (activeTab === 'chapters') {
      return (
        <>
          <div className="chapters-header">
            <div className="chapters-title">All Chapters ({subject.chapters.length})</div>
            <div className="chapters-actions">
              <button type="button" className="sort-btn">⇅ Sort</button>
              <button type="button" className="view-btn active">☰</button>
              <button type="button" className="view-btn">⊞</button>
            </div>
          </div>
          <div className="chapter-list">
            {subject.chapters.map((chapter) => (
              <ChapterCard key={chapter.num} chapter={chapter} onClick={onChapterClick} />
            ))}
          </div>
          <div className="banner">
            <div className="banner-left">
              <div className="banner-icon">🎯</div>
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
      <PhoneFrame>
        <Header
          variant="back"
          title={subject.title}
          onBackClick={onBackToSubjects}
          right={
            <div className="header-icons">
              <span>🔖</span>
              <span>⋮</span>
            </div>
          }
        />

        <main className="content">
          <SubjectHero subject={subject} />
          <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
          <div className="tab-content-wrapper">{renderContent()}</div>
        </main>

        <BottomNav
          items={bottomNav}
          centerDark
          onNavigate={(item) => {
            if (item.label === 'Home') onNavigateHome()
            if (item.label === 'Subjects') onNavigateSubjects()
          }}
        />
      </PhoneFrame>
    </div>
  )
}

export default SubjectDetailPage