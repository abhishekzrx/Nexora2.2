/**
 * SubjectDetailPage
 * Universal reusable Subject Detail / Chapter Analytics page.
 * Renders dynamically based on the selected subject from course registry.
 */
import { useEffect, useMemo, useState } from 'react'
import '../styles/subjectDetail.css'
import { useCourseRegistry } from '../data/courseRegistry'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useAdminStore } from '../data/adminStore'
import { useMemberStore } from '../data/memberStore'
import { useUserProgressStore } from '../data/progressStore'
import Header from '../components/layout/Header'
import MobileLayout from '../components/layout/MobileLayout'
import SubjectHero from '../components/subject/SubjectHero'
import Tabs from '../components/subject/Tabs'
import ChapterCard from '../components/subject/ChapterCard'
import CoverageLegendCard from '../components/subject/CoverageLegendCard'
import ChapterMcqAnalytics from '../components/subject/ChapterMcqAnalytics'
import WeakTopics from '../components/subject/WeakTopics'
import StudyStats from '../components/subject/StudyStats'
import TimeSpent from '../components/subject/TimeSpent'
import Achievements from '../components/subject/Achievements'
import AccuracyChart from '../components/subject/AccuracyChart'
import AppIcon from '../components/ui/AppIcon'
import ChapterNotesView from '../components/student/ChapterNotesView'
import SubjectAnalysisTab from '../components/subject/SubjectAnalysisTab'
import SubjectFlashcardsTab from '../components/subject/SubjectFlashcardsTab'
import { subjectTabs } from '../utils/navigation'
import { getEnrichedSubjectIntelligence } from '../services/performanceEngine'
import { recordSubjectSnapshot } from '../services/trendService'

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
  const adminState = useAdminStore()
  const { effectiveMember } = useMemberStore()
  const progressSnapshot = useUserProgressStore()
  const baseSubject = registry.subjectCatalog[subjectKey] || null
  const subject = useMemo(() => {
    if (!baseSubject) return null
    const progressList = progressSnapshot.progressList || []
    return getEnrichedSubjectIntelligence(baseSubject, progressList) || baseSubject
  }, [baseSubject, progressSnapshot.progressList])
  const [activeTab, setActiveTab] = useState(() => subjectTabs[subjectKey] || 'chapters')
  const trendPreferenceKey = useMemo(() => {
    const memberId = effectiveMember?.id || 'anon'
    return `nexora_subject_trends_${memberId}_${subjectKey || 'subject'}`
  }, [effectiveMember?.id, subjectKey])
  const [showChapterTrends, setShowChapterTrends] = useState(true)

  const allFlashcards = adminState.allFlashcards || adminState.flashcards || []
  const activeCourse = workspaces.find((w) => w.id === (courseId || activeWorkspaceId)) || workspaces[0]

  useEffect(() => {
    subjectTabs[subjectKey] = activeTab
  }, [subjectKey, activeTab])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(trendPreferenceKey)
      if (saved === 'true' || saved === 'false') {
        setShowChapterTrends(saved === 'true')
        return
      }
    } catch {
      // ignore
    }
    setShowChapterTrends(true)
  }, [trendPreferenceKey])

  useEffect(() => {
    try {
      localStorage.setItem(trendPreferenceKey, String(showChapterTrends))
    } catch {
      // ignore
    }
  }, [trendPreferenceKey, showChapterTrends])

  useEffect(() => {
    if (!subject) return
    const subjectId = subject.subjectId || subject.id || subjectKey
    const practicedCount = Number(subject.subjectAttemptedMcqs || subject.attemptedMcqs || 0)
    if (!subjectId || practicedCount <= 0) return

    recordSubjectSnapshot(subjectId, {
      subjectReadinessScore: subject.subjectReadinessScore || subject.readinessScore || subject.progress || 0,
      subjectAccuracyPercentage: subject.subjectAccuracyPercentage || subject.accuracyPercentage || subject.accuracy || 0,
      subjectCoveragePercent: subject.subjectCoveragePercent || subject.coveragePercent || subject.coverage || 0,
      subjectMasteryPercentage: subject.subjectMasteryPercentage || subject.masteryPercentage || subject.mastery || 0,
      subjectAttemptedMcqs: subject.subjectAttemptedMcqs || subject.attemptedMcqs || 0,
      subjectTotalMcqs: subject.subjectTotalMcqs || subject.totalMcqs || subject.counts?.mcqs || 0,
    })
  }, [
    subject?.subjectId,
    subject?.id,
    subject?.subjectReadinessScore,
    subject?.subjectAccuracyPercentage,
    subject?.subjectCoveragePercent,
    subject?.subjectMasteryPercentage,
    subject?.subjectAttemptedMcqs,
    subject?.subjectTotalMcqs,
    subject?.readinessScore,
    subject?.accuracyPercentage,
    subject?.coveragePercent,
    subject?.masteryPercentage,
    subject?.attemptedMcqs,
    subject?.totalMcqs,
    subjectKey,
  ])

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
            <div className="chapters-title-wrap">
              <span className="chapters-title">All Chapters ({subject.chapters.length})</span>
            </div>
            <div className="chapters-actions">
              <button
                type="button"
                className={`subject-trends-toggle-btn${showChapterTrends ? ' active' : ''}`}
                onClick={() => setShowChapterTrends((prev) => !prev)}
                title={showChapterTrends ? 'Hide detailed statistics across all chapters' : 'Expand detailed statistics across all chapters'}
              >
                <AppIcon name={showChapterTrends ? 'eyeOff' : 'analyticsTab'} size={13} />
                <span>{showChapterTrends ? 'Hide Trends' : 'Show Trends'}</span>
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
                <ChapterCard
                  key={chapter.id || chapter.num}
                  chapter={chapter}
                  showTrends={showChapterTrends}
                  onClick={onChapterClick}
                />
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
        <ChapterMcqAnalytics
          subject={subject}
          onChapterClick={onChapterClick}
          onStartPractice={() => onStartMCQPractice(subjectKey)}
        />
      )
    }

    if (activeTab === 'flashcards') {
      return (
        <SubjectFlashcardsTab
          subject={subject}
          courseId={courseId || activeWorkspaceId}
          allFlashcards={allFlashcards}
        />
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

    if (activeTab === 'analytics') {
      return (
        <SubjectAnalysisTab
          subject={subject}
          onChapterClick={onChapterClick}
          onStartPractice={() => onStartMCQPractice(subjectKey)}
        />
      )
    }

    return (
      <SubjectAnalysisTab
        subject={subject}
        onChapterClick={onChapterClick}
        onStartPractice={() => onStartMCQPractice(subjectKey)}
      />
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
