import { useEffect, useRef, useState } from 'react'
import AppIcon from '../components/ui/AppIcon'
import '../styles/auth.css'
import { memberService } from '../services/memberService'
import { setActiveMember } from '../data/memberStore'
import { clearUserProgressStore } from '../data/progressStore'
import { clearAnalyticsStore } from '../data/analyticsStore'

const QUICK_PROFILES = [
  { id: 'adminalpha', name: 'Super Admin', role: 'SUPER_ADMIN', icon: '👑' },
  { id: 'MEMBER01', name: 'Rahul', role: 'Student (BPSC CS)', icon: '👤' },
  { id: 'MEMBER02', name: 'Priya', role: 'Student (BPSC Prelims)', icon: '👤' },
  { id: 'MEMBER03', name: 'Amit', role: 'Student (BPSC CS)', icon: '👤' },
]

export default function AuthPage({
  mode = 'login',
  onGoLogin,
  onGoSignup,
  onLoginSuccess,
  onSignupSuccess,
}) {
  const [username, setUsername] = useState('adminalpha')
  const [password, setPassword] = useState('Alpha@123')
  const [showPassword, setShowPassword] = useState(false)

  // Signup fields
  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  // Status & UI state
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(false)

    if (mode === 'login') {
      setUsername('adminalpha')
      setPassword('Alpha@123')
    } else {
      setSignupName('')
      setSignupUsername('')
      setSignupEmail('')
      setSignupPassword('')
      setSignupConfirm('')
    }
  }, [mode])

  // Handle Quick Profile Fill
  const handleSelectQuickProfile = (profileId) => {
    setUsername(profileId)
    setPassword('Alpha@123')
    setErrorMessage('')
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

    try {
      const cleanLookup = trimmedUser.toLowerCase() === 'student01' ? 'adminalpha' : trimmedUser
      const memberRes = await memberService.getMemberById(cleanLookup)

      if (!memberRes.success || !memberRes.data) {
        setIsLoading(false)
        setErrorMessage(`Account "${trimmedUser}" not found. Try adminalpha or MEMBER01.`)
        return
      }

      const member = memberRes.data

      if (member.status === 'ARCHIVED') {
        setIsLoading(false)
        setErrorMessage('This account is archived and inactive. Contact Super Admin.')
        return
      }

      if (member.status === 'DISABLED') {
        setIsLoading(false)
        setErrorMessage('This account is currently disabled. Contact Super Admin.')
        return
      }

      // Clear user stores before binding new user
      clearUserProgressStore()
      clearAnalyticsStore()

      // Bind member session
      setActiveMember(member)

      timerRef.current = setTimeout(() => {
        setIsLoading(false)
        onLoginSuccess?.()
      }, 950)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Login failed. Please try again.')
    }
  }

  // Handle Signup Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedName = signupName.trim()
    const trimmedUser = signupUsername.trim().toUpperCase()
    const trimmedEmail = signupEmail.trim()
    const trimmedPass = signupPassword.trim()
    const trimmedConfirm = signupConfirm.trim()

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!trimmedUser) {
      setErrorMessage('Please choose a username.')
      return
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    if (trimmedPass !== trimmedConfirm) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const createRes = await memberService.createMember({
        username: trimmedUser,
        display_name: trimmedName,
        email: trimmedEmail,
        assigned_courses: ['bpsc_prelims'],
        role: 'MEMBER',
        status: 'ACTIVE',
      })

      if (!createRes.success) {
        setIsLoading(false)
        setErrorMessage(createRes.error || 'Failed to create account.')
        return
      }

      setIsLoading(false)
      setSuccessMessage(`Account "${trimmedUser}" created! Redirecting to login...`)

      timerRef.current = setTimeout(() => {
        onSignupSuccess?.()
        onGoLogin?.()
      }, 1200)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Failed to register account.')
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="alpha-auth-root">
      <div className="alpha-scene">
        <div className="alpha-card">
          {/* Floating Logo with Glow & Heartbeat */}
          <div
            className={`logo-wrap${isInputFocused ? ' active' : ''}`}
            id="logoWrap"
            title="Nexora Alpha Portal"
          >
            <div className="logo-glow"></div>
            <img className="logo-img" src="/alpha-logo.png" alt="Alpha" />
          </div>

          <h1>{isSignup ? 'Create Account' : 'Welcome back'}</h1>
          <p className="subtext">
            {isSignup ? 'Join Nexora to begin your exam journey' : 'Sign in to continue'}
          </p>

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
                  <label htmlFor="username">Email or username</label>
                  <div className="field-input-wrap">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. adminalpha or MEMBER01"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="field-input-wrap">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
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
                {/* Full Name */}
                <div className="field">
                  <label htmlFor="signupName">Full Name</label>
                  <div className="field-input-wrap">
                    <input
                      id="signupName"
                      type="text"
                      placeholder="e.g. Abhishek Kumar"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="field">
                  <label htmlFor="signupUsername">Username / ID</label>
                  <div className="field-input-wrap">
                    <input
                      id="signupUsername"
                      type="text"
                      placeholder="e.g. MEMBER06"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="field">
                  <label htmlFor="signupEmail">Email address</label>
                  <div className="field-input-wrap">
                    <input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field">
                  <label htmlFor="signupPassword">Password</label>
                  <div className="field-input-wrap">
                    <input
                      id="signupPassword"
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
                    <button
                      type="button"
                      className="field-toggle-btn"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <AppIcon name={showSignupPassword ? 'visibilityOff' : 'visibility'} size={17} />
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="field">
                  <label htmlFor="signupConfirm">Confirm Password</label>
                  <div className="field-input-wrap">
                    <input
                      id="signupConfirm"
                      type="password"
                      placeholder="Re-enter password"
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      required
                    />
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
              <span className="btn-text">{isSignup ? 'Create Account' : 'Log in'}</span>
              <span className="spinner"></span>
            </button>
          </form>

          {/* Mode Switch (Sign in / Sign up) */}
          <div className="alpha-mode-switch">
            {!isSignup ? (
              <span>
                Don't have an account?
                <button
                  type="button"
                  className="alpha-switch-btn"
                  onClick={onGoSignup}
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?
                <button
                  type="button"
                  className="alpha-switch-btn"
                  onClick={onGoLogin}
                >
                  Log in
                </button>
              </span>
            )}
          </div>

          {/* Quick Demo Access Bar */}
          {!isSignup && (
            <div className="alpha-demo-section">
              <span className="alpha-demo-title">Quick Demo Login</span>
              <div className="alpha-demo-chips">
                {QUICK_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`alpha-chip-btn${username === p.id ? ' active' : ''}`}
                    onClick={() => handleSelectQuickProfile(p.id)}
                    title={`Click to fill ${p.name} (${p.id})`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
