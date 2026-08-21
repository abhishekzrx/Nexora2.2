import { useEffect, useState } from 'react'
import DashboardPage from './DashboardPage'
import SubjectsPage from './SubjectsPage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import MCQPracticePage from './pages/MCQPracticePage'
import TestResultsPage from './pages/TestResultsPage'
import PracticeHubPage from './pages/PracticeHubPage'
import AdminPage from './pages/AdminPage'
import { navigate, parseHash, testSession } from './utils/navigation'
import { switchToAdmin, switchToStudent, useRoleStore } from './data/roleStore'
import { useWorkspaceStore } from './data/workspaceStore'
import { hydrateWorkspacesFromSupabase } from './data/workspaceStore'
import { hydrateAdminStoreFromSupabase } from './data/adminStore'

/**
 * Resolve the current hash into a route descriptor.
 * Returns { name, subjectKey, chapterId, sub } or null for unknown routes.
 */
function resolveRoute() {
  const parts = parseHash()

  if (parts.length === 0) return { name: 'dashboard' }

  if (parts[0] === 'subjects') return { name: 'subjects' }

  if (parts[0] === 'practice') return { name: 'practice' }

  if (parts[0] === 'admin') return { name: 'admin' }

  if (parts[0] === 'subject' && parts[1]) {
    const subjectKey = parts[1]

    // Check for chapter-scoped route: #/subject/:key/chapter/:chapterId/:sub
    if (parts[2] === 'chapter' && parts[3]) {
      const chapterId = parts[3]
      const sub = parts[4]
      if (sub === 'mcq') return { name: 'mcq', subjectKey, chapterId }
      if (sub === 'review') return { name: 'review', subjectKey, chapterId }
      if (sub === 'results') return { name: 'results', subjectKey, chapterId }
      return { name: 'mcq', subjectKey, chapterId }
    }

    const sub = parts[2]
    if (sub === 'mcq') return { name: 'mcq', subjectKey }
    if (sub === 'review') return { name: 'review', subjectKey }
    if (sub === 'results') return { name: 'results', subjectKey }
    return { name: 'subject', subjectKey }
  }

  return null
}

function App() {
  const [route, setRoute] = useState(resolveRoute)
  const { activeWorkspaceId } = useWorkspaceStore()
  const { activeRole } = useRoleStore()

  useEffect(() => {
    const onHashChange = () => setRoute(resolveRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!route) return
    if (route.name === 'admin' && activeRole !== 'admin') {
      switchToAdmin()
    }
    if (route.name !== 'admin' && activeRole === 'admin') {
      switchToStudent()
    }
  }, [route, activeRole])

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([
          hydrateWorkspacesFromSupabase(),
          hydrateAdminStoreFromSupabase(),
        ])
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[App] Supabase hydration failed:', err)
        }
      }
    }

    bootstrap()
    return () => {}
  }, [])

  // Unknown / malformed route → fall back to dashboard.
  if (!route) {
    navigate('')
    return null
  }

  const { name, subjectKey, chapterId } = route

  if (name === 'admin') {
    return <AdminPage onBackHome={() => { switchToStudent(); navigate('') }} />
  }

  if (name === 'subjects') {
    return (
      <SubjectsPage
        courseId={activeWorkspaceId}
        onNavigateHome={() => navigate('')}
        onOpenSubjectDetail={(key) => navigate(`subject/${key}`)}
        onNavigatePractice={() => navigate('practice')}
        onNavigateAdmin={() => navigate('admin')}
      />
    )
  }

  if (name === 'practice') {
    return (
      <PracticeHubPage
        onNavigateHome={() => navigate('')}
        onNavigateSubjects={() => navigate('subjects')}
        onOpenSubject={(key) => navigate(`subject/${key}`)}
        onResume={(session) => {
          testSession.subjectKey = session.subjectKey
          testSession.chapter = session.chapterId ? { id: session.chapterId, name: session.chapterName } : null
          testSession.mode = 'practice'
          testSession.save()
          if (session.chapterId) {
            navigate(`subject/${session.subjectKey}/chapter/${session.chapterId}/mcq`)
          } else {
            navigate(`subject/${session.subjectKey}/mcq`)
          }
        }}
        onStartPractice={() => navigate('subjects')}
      />
    )
  }

  if (name === 'subject') {
    return (
      <SubjectDetailPage
        courseId={activeWorkspaceId}
        subjectKey={subjectKey}
        onBackToSubjects={() => navigate('subjects')}
        onNavigateHome={() => navigate('')}
        onNavigateSubjects={() => navigate('subjects')}
        onStartMCQPractice={(key) => navigate(`subject/${key}/mcq`)}
        onChapterClick={(chapter) => {
          testSession.subjectKey = subjectKey
          testSession.chapter = chapter
          testSession.mode = 'practice'
          testSession.save()
          if (chapter?.id) {
            navigate(`subject/${subjectKey}/chapter/${chapter.id}/mcq`)
          } else {
            navigate(`subject/${subjectKey}/mcq`)
          }
        }}
      />
    )
  }

  if (name === 'mcq') {
    return (
      <MCQPracticePage
        subjectKey={subjectKey}
        chapterId={chapterId}
        chapter={testSession.chapter}
        onBack={() => navigate(`subject/${subjectKey}`)}
        onSubmit={() => {
          if (chapterId) {
            navigate(`subject/${subjectKey}/chapter/${chapterId}/results`)
          } else {
            navigate(`subject/${subjectKey}/results`)
          }
        }}
      />
    )
  }

  if (name === 'review') {
    return (
      <MCQPracticePage
        subjectKey={subjectKey}
        chapterId={chapterId}
        chapter={testSession.chapter}
        reviewMode
        onBack={() => {
          if (chapterId) {
            navigate(`subject/${subjectKey}/chapter/${chapterId}/results`)
          } else {
            navigate(`subject/${subjectKey}/results`)
          }
        }}
        onSubmit={() => {
          if (chapterId) {
            navigate(`subject/${subjectKey}/chapter/${chapterId}/results`)
          } else {
            navigate(`subject/${subjectKey}/results`)
          }
        }}
      />
    )
  }

  if (name === 'results') {
    return (
      <TestResultsPage
        subjectKey={subjectKey}
        chapterId={chapterId}
        onBack={() => navigate(`subject/${subjectKey}`)}
        onReviewAnswers={() => {
          if (chapterId) {
            navigate(`subject/${subjectKey}/chapter/${chapterId}/review`)
          } else {
            navigate(`subject/${subjectKey}/review`)
          }
        }}
        onPracticeAgain={() => {
          testSession.mode = 'practice'
          testSession.save()
          if (chapterId) {
            navigate(`subject/${subjectKey}/chapter/${chapterId}/mcq`)
          } else {
            navigate(`subject/${subjectKey}/mcq`)
          }
        }}
        onBackToSubjects={() => navigate('subjects')}
      />
    )
  }

  return (
    <DashboardPage
      courseId={activeWorkspaceId}
      onNavigateSubjects={() => navigate('subjects')}
      onNavigatePractice={() => navigate('practice')}
      onOpenSubjectDetail={(key) => navigate(`subject/${key}`)}
      onNavigateAdmin={() => navigate('admin')}
    />
  )
}

export default App