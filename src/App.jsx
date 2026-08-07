import { useEffect, useState } from 'react'
import DashboardPage from './DashboardPage'
import SubjectsPage from './SubjectsPage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import MCQPracticePage from './pages/MCQPracticePage'
import TestResultsPage from './pages/TestResultsPage'
import PracticeHubPage from './pages/PracticeHubPage'
import AdminPage from './pages/AdminPage'
import { navigate, parseHash, testSession } from './utils/navigation'

/**
 * Resolve the current hash into a route descriptor.
 * Returns { name, subjectKey, chapter, mode } or null for unknown routes.
 */
function resolveRoute() {
  const parts = parseHash()

  if (parts.length === 0) return { name: 'dashboard' }

  if (parts[0] === 'subjects') return { name: 'subjects' }

  if (parts[0] === 'practice') return { name: 'practice' }

  if (parts[0] === 'admin') return { name: 'admin' }

  if (parts[0] === 'subject' && parts[1]) {
    const subjectKey = parts[1]
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

  useEffect(() => {
    const onHashChange = () => setRoute(resolveRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Unknown / malformed route → fall back to dashboard.
  if (!route) {
    navigate('')
    return null
  }

  const { name, subjectKey } = route

  if (name === 'admin') {
    return <AdminPage onBackHome={() => navigate('')} />
  }

  if (name === 'subjects') {
    return (
      <SubjectsPage
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
          testSession.chapter = null
          testSession.mode = 'practice'
          navigate(`subject/${session.subjectKey}/mcq`)
        }}
        onStartPractice={() => navigate('subjects')}
      />
    )
  }

  if (name === 'subject') {
    return (
      <SubjectDetailPage
        subjectKey={subjectKey}
        onBackToSubjects={() => navigate('subjects')}
        onNavigateHome={() => navigate('')}
        onNavigateSubjects={() => navigate('subjects')}
        onStartMCQPractice={(key) => navigate(`subject/${key}/mcq`)}
        onChapterClick={(chapter) => {
          testSession.subjectKey = subjectKey
          testSession.chapter = chapter
          testSession.mode = 'practice'
          navigate(`subject/${subjectKey}/mcq`)
        }}
      />
    )
  }

  if (name === 'mcq') {
    return (
      <MCQPracticePage
        subjectKey={subjectKey}
        chapter={testSession.chapter}
        onBack={() => navigate(`subject/${subjectKey}`)}
        onSubmit={() => navigate(`subject/${subjectKey}/results`)}
      />
    )
  }

  if (name === 'review') {
    return (
      <MCQPracticePage
        subjectKey={subjectKey}
        chapter={testSession.chapter}
        reviewMode
        onBack={() => navigate(`subject/${subjectKey}/results`)}
        onSubmit={() => navigate(`subject/${subjectKey}/results`)}
      />
    )
  }

  if (name === 'results') {
    return (
      <TestResultsPage
        subjectKey={subjectKey}
        onBack={() => navigate(`subject/${subjectKey}`)}
        onReviewAnswers={() => navigate(`subject/${subjectKey}/review`)}
        onPracticeAgain={() => {
          testSession.mode = 'practice'
          navigate(`subject/${subjectKey}/mcq`)
        }}
        onBackToSubjects={() => navigate('subjects')}
      />
    )
  }

  return (
    <DashboardPage
      onNavigateSubjects={() => navigate('subjects')}
      onNavigatePractice={() => navigate('practice')}
      onOpenSubjectDetail={(key) => navigate(`subject/${key}`)}
      onNavigateAdmin={() => navigate('admin')}
    />
  )
}

export default App