import { useEffect, useState } from 'react'
import DashboardPage from './DashboardPage'
import SubjectsPage from './SubjectsPage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import MCQPracticePage from './pages/MCQPracticePage'
import TestResultsPage from './pages/TestResultsPage'
import PracticeHubPage from './pages/PracticeHubPage'
import NotesPage from './pages/NotesPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import AccessRestrictedCard from './components/common/AccessRestrictedCard'
import { navigate, parseHash, testSession, subjectTabs } from './utils/navigation'
import { switchToAdmin, switchToStudent, useRoleStore } from './data/roleStore'
import { useWorkspaceStore, hydrateWorkspacesFromSupabase } from './data/workspaceStore'
import { hydrateAdminStoreFromSupabase } from './data/adminStore'
import { useMemberStore, exitViewAsMember, clearMemberSession } from './data/memberStore'
import { permissionService } from './services/permissionService'
import { clearUserProgressStore } from './data/progressStore'
import { clearAnalyticsStore } from './data/analyticsStore'

const AUTH_ROUTES = new Set(['login', 'signup'])

/**
 * Resolve the current hash into a route descriptor.
 * Returns { name, subjectKey, chapterId, sub } or null for unknown routes.
 */
function resolveRoute() {
  const parts = parseHash()

  if (parts.length === 0) return { name: 'dashboard' }

  if (parts[0] === 'login') return { name: 'login' }

  if (parts[0] === 'signup') return { name: 'signup' }

  if (parts[0] === 'subjects') return { name: 'subjects' }

  if (parts[0] === 'practice') return { name: 'practice' }

  if (parts[0] === 'notes') return { name: 'notes' }

  if (parts[0] === 'admin') return { name: 'admin', section: parts[1] || 'dashboard' }

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('nexora_is_authenticated') === 'true'
    } catch {
      return false
    }
  })
  const { activeWorkspaceId } = useWorkspaceStore()
  const { activeRole } = useRoleStore()
  const { effectiveMember, isSuperAdmin, isViewingAs } = useMemberStore()

  const handleLogout = () => {
    clearMemberSession()
    clearUserProgressStore()
    clearAnalyticsStore()
    setIsAuthenticated(false)
    switchToStudent()
    navigate('login')
  }

  const handleSwitchToAdmin = (section) => {
    if (!permissionService.canAccessAdmin(effectiveMember)) {
      return
    }
    switchToAdmin()
    if (section && typeof section === 'string') {
      navigate(`admin/${section}`)
    } else {
      navigate('admin')
    }
  }

  const handleSwitchToStudent = () => {
    switchToStudent()
    navigate('')
  }

  useEffect(() => {
    const onHashChange = () => setRoute(resolveRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!route) return

    const isAuthRoute = AUTH_ROUTES.has(route.name)

    if (!isAuthenticated && !isAuthRoute) {
      navigate('login')
      return
    }

    if (isAuthenticated && isAuthRoute) {
      navigate('')
    }
  }, [route, isAuthenticated])

  useEffect(() => {
    if (!route) return
    if (!isAuthenticated) return

    if (route.name === 'admin' && activeRole !== 'admin') {
      if (permissionService.canAccessAdmin(effectiveMember)) {
        switchToAdmin()
      }
    }
    if (route.name !== 'admin' && activeRole === 'admin') {
      switchToStudent()
    }
  }, [route, activeRole, isAuthenticated, effectiveMember])

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

  const renderAuthPage = () => (
    <AuthPage
      mode={route?.name === 'signup' ? 'signup' : 'login'}
      onGoLogin={() => navigate('login')}
      onGoSignup={() => navigate('signup')}
      onLoginSuccess={() => {
        setIsAuthenticated(true)
        switchToStudent()
        navigate('')
      }}
      onSignupSuccess={() => navigate('login')}
    />
  )

  // Unknown / malformed route -> fall back to dashboard.
  if (!route) {
    navigate(isAuthenticated ? '' : 'login')
    return null
  }

  if (!isAuthenticated) {
    return renderAuthPage()
  }

  // Account Disabled Shield
  if (effectiveMember && effectiveMember.status === 'DISABLED') {
    return (
      <AccessRestrictedCard
        title="Account Deactivated"
        message="This account has been disabled by Super Admin. Please contact adminalpha to re-enable access."
        onReturnDashboard={handleLogout}
        showContactAdmin={false}
      />
    )
  }

  const { name, subjectKey, chapterId } = route

  // Layer 2 Security Guard: Admin Route Protection
  if (name === 'admin') {
    if (!permissionService.canAccessAdmin(effectiveMember)) {
      return (
        <AccessRestrictedCard
          title="Access Restricted — Admin Panel"
          message="You do not have administrative permissions. Only Super Admin (adminalpha) is authorized to access the CMS studio."
          onReturnDashboard={() => navigate('')}
        />
      )
    }

    return (
      <AdminPage
        initialSection={route?.section || 'dashboard'}
        onBackHome={handleSwitchToStudent}
        onLogout={handleLogout}
        onSwitchToStudent={handleSwitchToStudent}
      />
    )
  }

  // Layer 2 Security Guard: Course & Subject Permission Protection
  if (name === 'subject' && subjectKey) {
    if (!permissionService.canAccessSubject(effectiveMember, activeWorkspaceId, subjectKey)) {
      return (
        <AccessRestrictedCard
          title="Course Access Restricted"
          message="Your student profile is not assigned to access this course or subject. Please select an allowed course."
          onReturnDashboard={() => navigate('')}
        />
      )
    }
  }

  const renderMainContent = () => {
    if (name === 'subjects') {
      return (
        <SubjectsPage
          courseId={activeWorkspaceId}
          onNavigateHome={() => navigate('')}
          onOpenSubjectDetail={(key) => navigate(`subject/${key}`)}
          onNavigatePractice={() => navigate('practice')}
          onNavigateNotes={() => navigate('notes')}
          onNavigateAdmin={handleSwitchToAdmin}
          onLogout={handleLogout}
        />
      )
    }

    if (name === 'notes') {
      return (
        <NotesPage
          courseId={activeWorkspaceId}
          onNavigateHome={() => navigate('')}
          onNavigateSubjects={() => navigate('subjects')}
          onNavigatePractice={() => navigate('practice')}
          onOpenSubjectNotes={(key) => {
            subjectTabs[key] = 'notes'
            navigate(`subject/${key}`)
          }}
          onNavigateAdmin={handleSwitchToAdmin}
          onLogout={handleLogout}
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
        onNavigateNotes={() => navigate('notes')}
        onOpenSubjectDetail={(key) => navigate(`subject/${key}`)}
        onNavigateAdmin={handleSwitchToAdmin}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <>
      {/* Super Admin Read-Only "View as Member" Banner */}
      {isViewingAs && (
        <div
          style={{
            background: 'linear-gradient(90deg, #F1621B 0%, #D9480F 100%)',
            color: '#FFFFFF',
            padding: '8px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.84rem',
            fontWeight: 700,
            position: 'sticky',
            top: 0,
            zIndex: 99999,
            boxShadow: '0 4px 16px rgba(241, 98, 27, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👁️</span>
            <span>
              VIEWING AS: <b>{effectiveMember?.warrior_name}</b> ({effectiveMember?.display_name}) — READ-ONLY MODE
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              exitViewAsMember()
              navigate('admin')
            }}
            style={{
              background: '#0F0E0D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            Exit View Mode ✕
          </button>
        </div>
      )}

      {renderMainContent()}
    </>
  )
}

export default App
