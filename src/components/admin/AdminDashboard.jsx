/**
 * AdminDashboard
 * Main dashboard for the Admin Panel.
 * Fully Course-aware — all data derives from the active Course.
 */
import { useMemo, useState, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import AdminSidebar from './AdminSidebar'
import AdminMobileLayout from './AdminMobileLayout'
import CourseSelector from './CourseSelector'
import CourseManager from './CourseManager'
import SubjectManager from './SubjectManager'
import ChapterManager from './ChapterManager'
import McqManager from './McqManager'
import FlashcardManager from './FlashcardManager'
import EmptyCourseState from './EmptyCourseState'
import FeedbackUI from './FeedbackUI'
import { useAdminStore, getCounts } from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { useFeedback } from '../../data/feedbackStore'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= MOBILE_BREAKPOINT
}

const MOBILE_SECTION_MAP = {
  dashboard: 'Dashboard',
  courses: 'Courses',
  subjects: 'Subjects',
  chapters: 'Chapters',
  mcqs: 'MCQs',
  flashcards: 'Flashcards',
}

const QUICK_ACTIONS = [
  { key: 'subjects', label: 'Add Subject', icon: 'add' },
  { key: 'chapters', label: 'Add Chapter', icon: 'document' },
  { key: 'mcqs', label: 'Add MCQs', icon: 'mcqs' },
  { key: 'flashcards', label: 'Add Flashcards', icon: 'flashcardsTab' },
]

const ANALYTICS_ITEMS = [
  { key: 'subjects', label: 'Subjects', icon: 'chapters', color: '#F1621B' },
  { key: 'chapters', label: 'Chapters', icon: 'document', color: '#2E5CE6' },
  { key: 'mcqs', label: 'MCQs', icon: 'mcqs', color: '#12B76A' },
  { key: 'flashcards', label: 'Flashcards', icon: 'flashcardsTab', color: '#7C3AED' },
]

function CourseAnalytics({ counts }) {
  const maxValue = Math.max(counts.subjects, counts.chapters, counts.mcqs, counts.flashcards, 1)
  return (
    <div className="admin-analytics-card">
      <div className="admin-analytics-header">
        <div className="admin-analytics-title">Course Analytics</div>
        <div className="admin-analytics-subtitle">Content overview for the active course</div>
      </div>
      <div className="admin-analytics-chart">
        {ANALYTICS_ITEMS.map((item) => {
          const value = counts[item.key] || 0
          const pct = Math.round((value / maxValue) * 100)
          return (
            <div key={item.key} className="admin-analytics-row">
              <div className="admin-analytics-label">
                <span className="admin-analytics-icon" style={{ background: `${item.color}15`, color: item.color }}>
                  <AppIcon name={item.icon} size={14} />
                </span>
                <span>{item.label}</span>
              </div>
              <div className="admin-analytics-bar-track">
                <div
                  className="admin-analytics-bar-fill"
                  style={{ width: `${pct}%`, background: item.color }}
                />
              </div>
              <div className="admin-analytics-value">{value}</div>
            </div>
          )
        })}
      </div>
      <div className="admin-analytics-footer">
        <div className="admin-analytics-stat">
          <span className="admin-analytics-stat-value">{counts.subjects + counts.chapters + counts.mcqs + counts.flashcards}</span>
          <span className="admin-analytics-stat-label">Total Items</span>
        </div>
        <div className="admin-analytics-stat">
          <span className="admin-analytics-stat-value">{counts.chapters > 0 ? Math.round((counts.chapters / Math.max(counts.subjects, 1)).toFixed(1)) : 0}</span>
          <span className="admin-analytics-stat-label">Avg Chapters/Subject</span>
        </div>
        <div className="admin-analytics-stat">
          <span className="admin-analytics-stat-value">{counts.mcqs + counts.flashcards}</span>
          <span className="admin-analytics-stat-label">Practice Items</span>
        </div>
      </div>
    </div>
  )
}

function buildCourseActivity(course, subjects, chapters, mcqs, flashcards) {
  const items = []
  const totalChapters = chapters.length
  const totalMcqs = mcqs.length
  const totalFlashcards = flashcards.length
  const totalSubjects = subjects.length

  if (totalSubjects > 0) {
    items.push({
      icon: 'chapters',
      strong: `${totalSubjects} Subject${totalSubjects > 1 ? 's' : ''}`,
      text: 'created in this course',
      time: 'Recently',
    })
  }
  if (totalChapters > 0) {
    items.push({
      icon: 'document',
      strong: `${totalChapters} Chapter${totalChapters > 1 ? 's' : ''}`,
      text: 'added across subjects',
      time: 'Recently',
    })
  }
  if (totalMcqs > 0) {
    items.push({
      icon: 'mcqs',
      strong: `${totalMcqs} MCQs`,
      text: 'injected into question bank',
      time: 'Recently',
    })
  }
  if (totalFlashcards > 0) {
    items.push({
      icon: 'flashcardsTab',
      strong: `${totalFlashcards} Flashcards`,
      text: 'generated for review',
      time: 'Recently',
    })
  }
  if (course.contentHealth?.issues?.length > 0) {
    items.push({
      icon: 'warning',
      strong: 'Content Issues',
      text: course.contentHealth.issues[0],
      time: 'Needs attention',
    })
  }
  if (items.length === 0) {
    items.push({
      icon: 'adminDashboard',
      strong: 'Empty Course',
      text: 'No content has been added yet',
      time: 'Start building',
    })
  }
  return items.slice(0, 5)
}

function getReadinessLevel(score) {
  const clamped = Math.max(0, Math.min(100, score))
  if (clamped <= 39) return { label: 'Beginner', tone: 'orange', gradient: ['#FF5A5F', '#F1621B'] }
  if (clamped <= 69) return { label: 'Improving', tone: 'orange', gradient: ['#F1621B', '#FFB020'] }
  if (clamped <= 84) return { label: 'Competitive', tone: 'teal', gradient: ['#0E9494', '#12B76A'] }
  return { label: 'Exam Ready', tone: 'green', gradient: ['#12B76A', '#34D399'] }
}

function AdminDashboard({ activeSection, onNavigate }) {
  const [isMobile, setIsMobile] = useState(getIsMobile)
  const { subjects, chapters, mcqs, flashcards } = useAdminStore()
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { showToast } = useFeedback()

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const counts = getCounts()
  const activeCourse = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]

  const courseActivity = buildCourseActivity(activeCourse, subjects, chapters, mcqs, flashcards)

  const readinessScore = useMemo(() => {
    if (!activeCourse) return 0
    return Math.round(activeCourse.metadata?.completion || activeCourse.contentHealth?.score || 0)
  }, [activeCourse])

  const readinessLevel = getReadinessLevel(readinessScore)

  const healthScore = useMemo(() => {
    if (!activeCourse) return 0
    return Math.round(activeCourse.contentHealth?.score || 0)
  }, [activeCourse])

  const handleQuickAction = (key) => {
    onNavigate?.(key)
    showToast({ type: 'success', title: 'Quick Action', message: `Navigated to ${key}` })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const mobileSection = MOBILE_SECTION_MAP[activeSection] || 'Dashboard'

  const renderSection = () => {
    switch (activeSection) {
      case 'subjects':
        return <SubjectManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      case 'chapters':
        return <ChapterManager key={activeWorkspaceId} courseName={activeCourse?.name} selectedSubject={subjects[0]?.name} />
      case 'mcqs':
        return <McqManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      case 'flashcards':
        return <FlashcardManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      case 'courses':
        return <CourseManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      default:
        return (
          <>
      {subjects.length === 0 ? (
        <EmptyCourseState courseName={activeCourse?.name} />
      ) : (
        <>
          <div className="admin-section">
            <h2 className="admin-section-title">Quick Actions</h2>
            <div className="admin-quick-grid">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="admin-quick-card"
                  onClick={() => handleQuickAction(action.key)}
                >
                  <span className="admin-quick-icon">
                    <AppIcon name={action.icon} size={20} />
                  </span>
                  <span className="admin-quick-label">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <CourseAnalytics counts={counts} />

          <div className="admin-section">
            <h2 className="admin-section-title">Course Health</h2>
                  <div className="admin-health-grid">
                    <div className="admin-health-card">
                      <div className="admin-health-ring">
                        <div className="admin-health-ring-value" style={{ color: healthScore >= 70 ? 'var(--green)' : healthScore >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                          {healthScore}%
                        </div>
                      </div>
                      <div className="admin-health-label">Content Health</div>
                    </div>
                    <div className="admin-health-metrics">
                      <div className="admin-health-metric">
                        <AppIcon name="chapters" size={14} />
                        <span>{counts.subjects} Subjects</span>
                      </div>
                      <div className="admin-health-metric">
                        <AppIcon name="document" size={14} />
                        <span>{counts.chapters} Chapters</span>
                      </div>
                      <div className="admin-health-metric">
                        <AppIcon name="mcqs" size={14} />
                        <span>{counts.mcqs} MCQs</span>
                      </div>
                      <div className="admin-health-metric">
                        <AppIcon name="flashcardsTab" size={14} />
                        <span>{counts.flashcards} Flashcards</span>
                      </div>
                    </div>
                  </div>
                  {activeCourse.contentHealth?.issues?.length > 0 && (
                    <div className="admin-health-issues">
                      {activeCourse.contentHealth.issues.map((issue, idx) => (
                        <div key={idx} className="admin-health-issue">
                          <AppIcon name="warning" size={13} />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-section">
                  <h2 className="admin-section-title">Exam Readiness</h2>
                  <div className="admin-readiness-card">
                    <div className="admin-readiness-top">
                      <div className="admin-readiness-ring">
                        <div className="admin-readiness-ring-fill" style={{ '--readiness-pct': `${readinessScore}%`, background: `linear-gradient(135deg, ${readinessLevel.gradient[0]}, ${readinessLevel.gradient[1]})` }} />
                        <div className="admin-readiness-ring-value">{readinessScore}%</div>
                      </div>
                      <div className="admin-readiness-info">
                        <div className="admin-readiness-level" style={{ color: readinessLevel.tone === 'green' ? 'var(--green)' : readinessLevel.tone === 'teal' ? 'var(--teal)' : 'var(--orange)' }}>
                          {readinessLevel.label}
                        </div>
                        <div className="admin-readiness-message">
                          {readinessScore >= 80 ? 'Course content is well-structured and comprehensive.' : readinessScore >= 50 ? 'Course is progressing well. Add more content to improve readiness.' : 'Course needs more content. Start adding subjects and chapters.'}
                        </div>
                      </div>
                    </div>
                    <div className="admin-readiness-meta">
                      <span>Based on {counts.subjects} subjects, {counts.chapters} chapters, and content completeness</span>
                    </div>
                  </div>
                </div>

                <div className="admin-section">
                  <h2 className="admin-section-title">Recent Activity</h2>
                  <div className="admin-activity-feed">
                    {courseActivity.map((item, idx) => (
                      <div key={idx} className="admin-activity-item">
                        <span className="admin-activity-icon">
                          <AppIcon name={item.icon} size={16} />
                        </span>
                        <div className="admin-activity-body">
                          <span className="admin-activity-strong">{item.strong}</span>
                          <span className="admin-activity-text">{item.text}</span>
                        </div>
                        <span className="admin-activity-time">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )
    }
  }

  const courseSection = renderSection()

  if (isMobile) {
    return (
      <AdminMobileLayout
        activeTab={mobileSection}
        onNavigate={(item) => onNavigate?.(item.label.toLowerCase())}
        courseName={activeCourse?.name}
      >
        <div className="admin-mobile-section">
          {activeSection === 'dashboard' && (
            <div className="admin-mobile-dashboard">
              <div className="admin-section">
                <h2 className="admin-section-title">Quick Actions</h2>
                <div className="admin-quick-grid">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className="admin-quick-card"
                      onClick={() => handleQuickAction(action.key)}
                    >
                      <span className="admin-quick-icon">
                        <AppIcon name={action.icon} size={20} />
                      </span>
                      <span className="admin-quick-label">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <CourseAnalytics counts={counts} />

              <div className="admin-section">
                <h2 className="admin-section-title">Course Health</h2>
                <div className="admin-health-card-mobile">
                  <div className="admin-health-ring">
                    <div className="admin-health-ring-value" style={{ color: healthScore >= 70 ? 'var(--green)' : healthScore >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                      {healthScore}%
                    </div>
                    <div className="admin-health-label">Content Health</div>
                  </div>
                  <div className="admin-health-metrics-mobile">
                    <div className="admin-health-metric"><AppIcon name="chapters" size={14} /><span>{counts.subjects} Subjects</span></div>
                    <div className="admin-health-metric"><AppIcon name="document" size={14} /><span>{counts.chapters} Chapters</span></div>
                    <div className="admin-health-metric"><AppIcon name="mcqs" size={14} /><span>{counts.mcqs} MCQs</span></div>
                    <div className="admin-health-metric"><AppIcon name="flashcardsTab" size={14} /><span>{counts.flashcards} Flashcards</span></div>
                  </div>
                </div>
              </div>

              <div className="admin-section">
                <h2 className="admin-section-title">Recent Activity</h2>
                <div className="admin-activity-feed">
                  {courseActivity.map((item, idx) => (
                    <div key={idx} className="admin-activity-item">
                      <span className="admin-activity-icon"><AppIcon name={item.icon} size={16} /></span>
                      <div className="admin-activity-body">
                        <span className="admin-activity-strong">{item.strong}</span>
                        <span className="admin-activity-text">{item.text}</span>
                      </div>
                      <span className="admin-activity-time">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeSection !== 'dashboard' && courseSection}
        </div>
      </AdminMobileLayout>
    )
  }

  return (
    <div className="admin-dashboard-shell">
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        courseName={activeCourse?.name}
      />

      <div className="admin-dashboard-main">
        <div className="admin-dashboard-header">
          <div>
            <h1 className="admin-dashboard-greeting">
              {greeting}, Abhi 👋
            </h1>
            <div className="admin-dashboard-sub">
              {activeSection === 'dashboard' ? "Here's what's happening across your courses today." : `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Management`}
            </div>
          </div>
          <CourseSelector
            courses={workspaces}
            activeCourseId={activeWorkspaceId}
            onSelect={(id) => {
              setActiveWorkspace(id)
              const course = workspaces.find((w) => w.id === id)
              showToast({ type: 'success', title: 'Workspace Switched', message: `Now viewing ${course?.name || id}` })
            }}
          />
        </div>

        {renderSection()}
      </div>

      <FeedbackUI />
    </div>
  )
}

export default AdminDashboard
