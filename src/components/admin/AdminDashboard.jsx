/**
 * AdminDashboard.jsx
 * Redesigned Premium EdTech Content Management & Analytics Studio.
 * Reorganizes information architecture into:
 * COURSE HEALTH & READINESS → CONTENT INVENTORY → SUBJECT DISTRIBUTION → CHAPTER CONTENT GAPS → MCQ HEALTH → RECENT ACTIVITY & QUICK ACTIONS
 */
import { useMemo, useState, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import AdminSidebar from './AdminSidebar'
import AdminMobileLayout from './AdminMobileLayout'
import CourseSelector from './CourseSelector'
import CourseManager from './CourseManager'
import SubjectManager from './SubjectManager'
import ChapterMcqInjection from './ChapterMcqInjection'
import McqManager from './McqManager'
import NotesManager from './NotesManager'
import FeedbackUI from './FeedbackUI'

import DashboardHero from './dashboard/DashboardHero'
import QuickActionsHeader from './dashboard/QuickActionsHeader'
import ContentHealthSection from './dashboard/ContentHealthSection'
import InteractiveContentGraphCard from './dashboard/InteractiveContentGraphCard'
import SubjectDistributionSection from './dashboard/SubjectDistributionSection'
import SubjectOverviewSection from './dashboard/SubjectOverviewSection'
import MCQHealthSection from './dashboard/MCQHealthSection'
import RecentActivitySection from './dashboard/RecentActivitySection'

import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { useFeedback } from '../../data/feedbackStore'
import { calculateCourseAnalytics } from '../../utils/dashboardAnalytics'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= MOBILE_BREAKPOINT
}

const MOBILE_SECTION_MAP = {
  dashboard: 'Dashboard',
  courses: 'Courses',
  subjects: 'Subjects',
  notes: 'Notes Editor',
  'mcq-injection': 'Chapter MCQs Injection',
  'mcq-manager': 'MCQ Manager',
  analytics: 'Analytics',
}

function AdminDashboard({ activeSection, onNavigate }) {
  const [isMobile, setIsMobile] = useState(getIsMobile)
  const { subjects, chapters, mcqs, flashcards, allSubjects, allChapters, allMcqs, allFlashcards } = useAdminStore()
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { showToast } = useFeedback()

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const activeCourse = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]
  }, [workspaces, activeWorkspaceId])

  // Derive all course analytics dynamically from active course dataset
  const analyticsSubjects = useMemo(() => {
    if (!activeWorkspaceId) return []
    const subList = allSubjects && allSubjects.length > 0 ? allSubjects : subjects
    return subList.filter((s) => s.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, subjects, allSubjects])

  const analyticsChapters = useMemo(() => {
    if (!activeWorkspaceId) return []
    const chapList = allChapters && allChapters.length > 0 ? allChapters : chapters
    return chapList.filter((c) => c.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, chapters, allChapters])

  const analyticsMcqs = useMemo(() => {
    if (!activeWorkspaceId) return []
    const mcqList = allMcqs && allMcqs.length > 0 ? allMcqs : mcqs
    return mcqList.filter((m) => m.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, mcqs, allMcqs])

  const analyticsFlashcards = useMemo(() => {
    if (!activeWorkspaceId) return []
    const flashList = allFlashcards && allFlashcards.length > 0 ? allFlashcards : flashcards
    return flashList.filter((f) => f.courseId === activeWorkspaceId)
  }, [activeWorkspaceId, flashcards, allFlashcards])

  const analytics = useMemo(() => {
    return calculateCourseAnalytics(
      activeCourse,
      analyticsSubjects,
      analyticsChapters,
      analyticsMcqs,
      analyticsFlashcards
    )
  }, [activeCourse, analyticsSubjects, analyticsChapters, analyticsMcqs, analyticsFlashcards])

  const mobileSection = MOBILE_SECTION_MAP[activeSection] || 'Dashboard'

  const renderDashboardMainContent = () => {
    if (workspaces.length === 0) {
      return (
        <div className="admin-empty-card-wrapper">
          <div className="subject-empty-icon">
            <AppIcon name="folder" size={36} />
          </div>
          <h3>No courses available</h3>
          <p>Create your first course workspace to start building curriculum & question banks.</p>
          <Button variant="primary" onClick={() => onNavigate('courses')}>
            <AppIcon name="add" size={15} /> Create Course Workspace
          </Button>
        </div>
      )
    }

    if (analytics.totalSubjects === 0) {
      return (
        <div className="subject-empty-card">
          <div className="subject-empty-icon">
            <AppIcon name="chapters" size={36} />
          </div>
          <h3 className="subject-empty-title">Course workspace is ready to build</h3>
          <p className="subject-empty-desc">
            No subjects created yet for "{activeCourse?.name}". Add your first subject to start creating chapters and MCQs.
          </p>
          <Button variant="primary" onClick={() => onNavigate('subjects')}>
            <AppIcon name="add" size={15} /> Create First Subject
          </Button>
        </div>
      )
    }

    return (
      <div className="redesigned-dashboard-layout">
        {/* 1. Hero Course Overview & Health Ring */}
        <DashboardHero analytics={analytics} activeCourse={activeCourse} />

        {/* 2. Quick Management Action Bar */}
        <QuickActionsHeader onNavigate={onNavigate} />

        {/* 3. Core Content Health Metrics */}
        <ContentHealthSection analytics={analytics} />

        {/* 4. Desktop 2-Column Grid: Hierarchy Content Graph & MCQ Health */}
        <div className="dashboard-grid-2col">
          <InteractiveContentGraphCard analytics={analytics} />
          <MCQHealthSection analytics={analytics} onNavigate={onNavigate} />
        </div>

        {/* 5. Desktop 2-Column Grid: Subject Distribution & Overview */}
        <div className="dashboard-grid-2col">
          <SubjectDistributionSection subjectBreakdown={analytics.subjectBreakdown} />
          <SubjectOverviewSection subjectBreakdown={analytics.subjectBreakdown} onNavigate={onNavigate} />
        </div>

        {/* 6. Recent Content Activity Feed */}
        <RecentActivitySection
          subjects={analyticsSubjects}
          chapters={analyticsChapters}
          mcqs={analyticsMcqs}
          flashcards={analyticsFlashcards}
        />
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'subjects':
      case 'chapters':
        return <SubjectManager key={activeWorkspaceId} courseName={activeCourse?.name} onNavigate={onNavigate} />
      case 'notes':
        return <NotesManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      case 'mcq-manager':
        return <McqManager key={activeWorkspaceId} />
      case 'mcq-injection':
      case 'mcqs':
      case 'flashcards':
        return <ChapterMcqInjection key={activeWorkspaceId} />
      case 'courses':
        return <CourseManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      default:
        return renderDashboardMainContent()
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
          {activeSection === 'dashboard' ? (
            <div className="mobile-dash-wrapper">
              <div className="mobile-course-selector-wrap">
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

              {renderDashboardMainContent()}
            </div>
          ) : (
            courseSection
          )}
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
        {activeSection !== 'mcq-manager' && (
          <div className="admin-dashboard-header">
            <div>
              <h1 className="admin-dashboard-greeting">
                {activeCourse?.name ? `Course Dashboard: ${activeCourse.name}` : 'Course Content Studio'}
              </h1>
              <div className="admin-dashboard-sub">
                {activeSection === 'dashboard'
                  ? 'Real-time content health, chapter question gaps, and MCQ bank insights'
                  : `${activeSection.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Management`}
              </div>
            </div>
          </div>
        )}

        {courseSection}
      </div>

      <FeedbackUI />
    </div>
  )
}

export default AdminDashboard
