import { useEffect, useRef, useState } from 'react'
import AppIcon from '../components/ui/AppIcon'
import '../styles/auth.css'
import { userService } from '../services/userService'
import { useWorkspaceStore, hydrateWorkspacesFromSupabase } from '../data/workspaceStore'

export default function AuthPage({
  mode = 'login',
  onGoLogin,
  onGoSignup,
  onLoginSuccess,
  onSignupSuccess,
}) {
  const [localMode, setLocalMode] = useState(mode)
  const isSignup = localMode === 'signup'

  // Workspace courses
  const { workspaces } = useWorkspaceStore()
  const activeCourses = workspaces.filter((w) => w.status !== 'archived' && w.status !== 'deleted')

  // Login fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Signup fields (Academic Fast Registration)
  const [signupName, setSignupName] = useState('')
  const [signupCourseId, setSignupCourseId] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)

  // Status & UI state
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const timerRef = useRef(null)

  useEffect(() => {
    hydrateWorkspacesFromSupabase().catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Sync mode prop when changed externally (via hash routing #/login vs #/signup)
  useEffect(() => {
    setLocalMode(mode)
  }, [mode])

  // Pre-select first course when courses load
  useEffect(() => {
    if (!signupCourseId && activeCourses.length > 0) {
      setSignupCourseId(activeCourses[0].id)
    }
  }, [activeCourses, signupCourseId])

  // Auto-fill suggested username when name is entered if username hasn't been manually edited
  const handleNameChange = (val) => {
    setSignupName(val)
    if (!signupUsername || signupUsername.startsWith('STU_')) {
      const base = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
      if (base) {
        setSignupUsername(`STU_${base}`)
      }
    }
  }

  // Reset error/success messages on mode switch
  useEffect(() => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(false)
  }, [localMode])

  const handleSwitchToLogin = () => {
    setLocalMode('login')
    onGoLogin?.()
  }

  const handleSwitchToSignup = () => {
    setLocalMode('signup')
    onGoSignup?.()
  }

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedUser = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUser) {
      setErrorMessage('Please enter your email or username.')
      return
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const authRes = await userService.authenticateUser({
        identifier: trimmedUser,
        password: trimmedPassword,
      })

      if (!authRes.success || !authRes.data) {
        setIsLoading(false)
        setErrorMessage(authRes.error || 'Authentication failed. Please verify your credentials.')
        return
      }

      const member = authRes.data
      setIsLoading(false)
      setSuccessMessage(`Welcome back, ${member.display_name || member.username}!`)

      timerRef.current = setTimeout(() => {
        onLoginSuccess?.()
      }, 700)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Login failed. Please check network connection.')
    }
  }

  // Handle Signup Submit (Fast Academic Registration Flow)
  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedName = signupName.trim()
    const trimmedCourse = signupCourseId || (activeCourses[0]?.id || 'cbse-10')
    const trimmedEmail = signupEmail.trim().toLowerCase()
    let trimmedUser = signupUsername.trim().toUpperCase()
    const trimmedPass = signupPassword.trim()
    const trimmedConfirmPass = signupConfirmPassword.trim()

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!trimmedCourse) {
      setErrorMessage('Please choose your academic course / class.')
      return
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@domain.com).')
      return
    }

    if (!trimmedUser) {
      const base = trimmedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'STU'
      trimmedUser = `${base}${Date.now().toString().slice(-4)}`
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    if (trimmedPass !== trimmedConfirmPass) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const createRes = await userService.createStudentProfile({
        name: trimmedName,
        courseId: trimmedCourse,
        email: trimmedEmail,
        username: trimmedUser,
        password: trimmedPass,
      })

      if (!createRes.success || !createRes.data) {
        setIsLoading(false)
        setErrorMessage(createRes.error || 'Failed to create account. Please try again.')
        return
      }

      const newMember = createRes.data
      setIsLoading(false)
      setSuccessMessage(`Account created! Entering ${newMember.display_name}'s classroom...`)

      timerRef.current = setTimeout(() => {
        onSignupSuccess?.()
        onLoginSuccess?.()
      }, 850)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Failed to register account.')
    }
  }

  // Quick Supreme Admin Login Trigger
  const handleSupremeAdminQuickLogin = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await userService.authenticateUser({
        identifier: 'adminalpha',
        password: 'password',
      })
      if (res.success) {
        setSuccessMessage('Supreme Alpha Admin verified. Loading console...')
        timerRef.current = setTimeout(() => {
          onLoginSuccess?.()
        }, 600)
      } else {
        setIsLoading(false)
        setErrorMessage(res.error || 'Failed to authenticate Supreme Admin.')
      }
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Supreme Admin login error.')
    }
  }

  return (
    <div className="alpha-auth-root">
      <div className="alpha-scene">
        <div className="alpha-card">
          {/* Logo inside the card at the top */}
          <div
            className={`logo-wrap${focusedField ? ' active' : ''}`}
            id="logoWrap"
            title="Nexora Academic Portal"
          >
            <div className="logo-glow"></div>
            <img className="logo-img" src="/alpha-logo.png" alt="Nexora Alpha" />
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="alpha-error-banner" role="alert">
              <AppIcon name="close" size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="alpha-success-banner" role="alert">
              <AppIcon name="check" size={14} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form
            className="alpha-form"
            onSubmit={isSignup ? handleSignupSubmit : handleLoginSubmit}
          >
            {!isSignup ? (
              <>
                {/* Email or Username */}
                <div className="field">
                  <label htmlFor="username">Email or Username</label>
                  <div className={`field-input-wrap${focusedField === 'username' ? ' focused' : ''}`}>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. adminalpha or student@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className={`field-input-wrap${focusedField === 'password' ? ' focused' : ''}`}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                    <button
                      type="button"
                      className="field-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <AppIcon name={showPassword ? 'visibilityOff' : 'visibility'} size={17} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1. Academic Track / Class Dynamic Selection */}
                <div className="alpha-class-section">
                  <div className="alpha-class-section-header">
                    <span className="alpha-class-section-title">🎓 Academic Course / Class</span>
                    <span className="alpha-class-section-badge">{activeCourses.length} Available</span>
                  </div>
                  <div className="alpha-class-grid">
                    {activeCourses.map((course) => {
                      const isSelected = signupCourseId === course.id
                      return (
                        <button
                          key={course.id}
                          type="button"
                          className={`alpha-class-chip${isSelected ? ' active' : ''}`}
                          onClick={() => setSignupCourseId(course.id)}
                        >
                          <span className="alpha-class-chip-icon">
                            {course.name.toLowerCase().includes('9')
                              ? '⚡'
                              : course.name.toLowerCase().includes('10')
                              ? '📘'
                              : course.name.toLowerCase().includes('11')
                              ? '⚛️'
                              : course.name.toLowerCase().includes('12')
                              ? '💻'
                              : '🎓'}
                          </span>
                          <span className="alpha-class-chip-name" title={course.name}>
                            {course.name}
                          </span>
                          {isSelected && (
                            <span className="alpha-class-chip-check">
                              <AppIcon name="check" size={13} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Full Name */}
                <div className="field">
                  <label htmlFor="signupName">Full Name</label>
                  <div className={`field-input-wrap${focusedField === 'signupName' ? ' focused' : ''}`}>
                    <input
                      id="signupName"
                      type="text"
                      placeholder="e.g. Abhishek Kumar"
                      value={signupName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => setFocusedField('signupName')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                  </div>
                </div>

                {/* 3. Email Address */}
                <div className="field">
                  <label htmlFor="signupEmail">Email Address</label>
                  <div className={`field-input-wrap${focusedField === 'signupEmail' ? ' focused' : ''}`}>
                    <input
                      id="signupEmail"
                      type="email"
                      placeholder="student@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      onFocus={() => setFocusedField('signupEmail')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                  </div>
                </div>

                {/* 4. Username */}
                <div className="field">
                  <label htmlFor="signupUsername">
                    <span>Username</span>
                    <span className="field-label-hint">Auto-suggested</span>
                  </label>
                  <div className={`field-input-wrap${focusedField === 'signupUsername' ? ' focused' : ''}`}>
                    <input
                      id="signupUsername"
                      type="text"
                      placeholder="e.g. STU_ABHISHEK"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      onFocus={() => setFocusedField('signupUsername')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                  </div>
                </div>

                {/* 5. Password & 6. Confirm Password */}
                <div className="field-grid-row">
                  <div className="field">
                    <label htmlFor="signupPassword">Password</label>
                    <div className={`field-input-wrap${focusedField === 'signupPassword' ? ' focused' : ''}`}>
                      <input
                        id="signupPassword"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="Min 6 chars"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        onFocus={() => setFocusedField('signupPassword')}
                        onBlur={() => setFocusedField(null)}
                        required
                      />
                      <button
                        type="button"
                        className="field-toggle-btn"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        <AppIcon name={showSignupPassword ? 'visibilityOff' : 'visibility'} size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="signupConfirmPassword">Confirm Password</label>
                    <div className={`field-input-wrap${focusedField === 'signupConfirmPassword' ? ' focused' : ''}`}>
                      <input
                        id="signupConfirmPassword"
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        onFocus={() => setFocusedField('signupConfirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        required
                      />
                      <button
                        type="button"
                        className="field-toggle-btn"
                        onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                        aria-label={showSignupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        tabIndex={-1}
                      >
                        <AppIcon name={showSignupConfirmPassword ? 'visibilityOff' : 'visibility'} size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`submit${isLoading ? ' loading' : ''}`}
              id="submitBtn"
              disabled={isLoading}
            >
              {isLoading && <span className="spinner"></span>}
              <span className="btn-text">
                {isLoading
                  ? isSignup
                    ? 'Creating account...'
                    : 'Signing in...'
                  : isSignup
                    ? 'Create Account & Start Learning 🚀'
                    : 'Log in'}
              </span>
            </button>
          </form>

          {/* Mode Switch Footer Link */}
          <div className="alpha-mode-switch">
            <span>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                className="alpha-switch-btn"
                onClick={isSignup ? handleSwitchToLogin : handleSwitchToSignup}
              >
                {isSignup ? 'Log in' : 'Create Account'}
              </button>
            </span>
          </div>

          {/* Supreme Alpha Admin Quick Login Chip (on Login screen) */}
          {!isSignup && (
            <div
              className="alpha-admin-badge"
              onClick={handleSupremeAdminQuickLogin}
              title="Click to sign in instantly as Supreme Alpha Admin"
            >
              <div className="alpha-admin-badge-left">
                <AppIcon name="lock" size={14} color="#ff741f" />
                <span className="alpha-admin-badge-text">Supreme Alpha Admin Access</span>
              </div>
              <span className="alpha-admin-badge-tag">ADMINALPHA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



