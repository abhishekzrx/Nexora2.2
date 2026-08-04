import { useState } from 'react'
import DashboardPage from './DashboardPage'
import SubjectsPage from './SubjectsPage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import MCQPracticePage from './pages/MCQPracticePage'
import TestResultsPage from './pages/TestResultsPage'
import AdminPage from './pages/AdminPage'

function App() {
  const [screen, setScreen] = useState({ name: 'dashboard', subjectKey: 'computer-networks' })

  const openSubjects = () => setScreen((current) => ({ ...current, name: 'subjects' }))
  const openSubjectDetail = (subjectKey) => setScreen({ name: 'subject', subjectKey })
  const openDashboard = () => setScreen((current) => ({ ...current, name: 'dashboard' }))
  const openMCQPractice = (subjectKey) => setScreen({ name: 'mcq', subjectKey })
  const openMCQResponse = (subjectKey, chapter) => setScreen({ name: 'mcq', subjectKey, chapter })
  const openTestResults = () => setScreen((current) => ({ ...current, name: 'results' }))
  const openAdmin = () => setScreen((current) => ({ ...current, name: 'admin' }))

  if (screen.name === 'admin') {
    return (
      <AdminPage onBackHome={openDashboard} />
    )
  }

  if (screen.name === 'subjects') {
    return (
      <SubjectsPage
        onNavigateHome={openDashboard}
        onOpenSubjectDetail={openSubjectDetail}
      />
    )
  }

  if (screen.name === 'subject') {
    return (
      <SubjectDetailPage
        subjectKey={screen.subjectKey}
        onBackToSubjects={openSubjects}
        onNavigateHome={openDashboard}
        onNavigateSubjects={openSubjects}
        onStartMCQPractice={openMCQPractice}
        onChapterClick={(chapter) => openMCQResponse(screen.subjectKey, chapter)}
      />
    )
  }

  if (screen.name === 'mcq') {
    return (
      <MCQPracticePage
        subjectKey={screen.subjectKey}
        chapter={screen.chapter}
        onBack={() => openSubjectDetail(screen.subjectKey)}
        onSubmit={openTestResults}
      />
    )
  }

  if (screen.name === 'results') {
    return (
      <TestResultsPage
        onBack={openDashboard}
        onReviewAnswers={() => openMCQPractice(screen.subjectKey)}
        onPracticeAgain={() => openMCQPractice(screen.subjectKey)}
        onBackToSubjects={openSubjects}
      />
    )
  }

  return (
    <DashboardPage
      onNavigateSubjects={openSubjects}
      onOpenSubjectDetail={openSubjectDetail}
      onNavigateAdmin={openAdmin}
    />
  )
}

export default App