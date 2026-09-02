import { useEffect, useRef, useState } from 'react'
import AppIcon from '../components/ui/AppIcon'
import '../styles/auth.css'
import { memberService, SEED_MEMBERS } from '../services/memberService'
import { setActiveMember } from '../data/memberStore'
import { clearUserProgressStore } from '../data/progressStore'
import { clearAnalyticsStore } from '../data/analyticsStore'

const QUICK_PROFILES = [
  { id: 'adminalpha', name: 'Super Admin', course: 'All Courses', icon: '👑' },
  { id: 'MEMBER01', name: 'Rahul', course: 'BPSC Prelims + CS', icon: '👤' },
  { id: 'MEMBER02', name: 'Priya', course: 'BPSC Prelims', icon: '👤' },
  { id: 'MEMBER03', name: 'Amit', course: 'BPSC CS', icon: '👤' },
]

const LOGIN_FLASH_DELAY = 1150
const SIGNUP_FLASH_DELAY = 900

function AlphaMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Alpha logo"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id="alphaLiquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF3D00" />
          <stop offset="40%" stopColor="#FF7A18" />
          <stop offset="80%" stopColor="#FFA040" />
          <stop offset="100%" stopColor="#FFE082" />
        </linearGradient>
      </defs>

      {/* Razor-Sharp Geometric Triangle Base */}
      <path
        d="M48 10L86 78H10L48 10Z"
        fill="url(#alphaLiquidGrad)"
        stroke="url(#alphaLiquidGrad)"
        strokeWidth="4"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />
      {/* Razor-Sharp Inner Chevron */}
      <path
        d="M33 58L48 34L63 58"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />
    </svg>
  )
}

function EnhancedField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  iconName = 'profile',
  autoComplete = 'off',
  showTogglePassword = false,
  isPasswordVisible = false,
  onTogglePassword,
}) {
  return (
    <div className="authFieldGroup">
      <label className="authFieldLabel" htmlFor={id}>
        {label}
      </label>
      <div className="authInputWrapper">
        <span className="authInputIcon" aria-hidden="true">
          <AppIcon name={iconName} size={19} />
        </span>
        <input
          id={id}
          className="authInputField"
          type={showTogglePassword ? (isPasswordVisible ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck="false"
          autoCapitalize="off"
        />
        {showTogglePassword && (
          <button
            type="button"
            className="authPasswordToggle"
            onClick={onTogglePassword}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <AppIcon name={isPasswordVisible ? 'visibilityOff' : 'visibility'} size={19} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AuthPage({
  mode = 'login',
  onGoLogin,
  onGoSignup,
  onLoginSuccess,
  onSignupSuccess,
}) {
  const [loginStudentId, setLoginStudentId] = useState('adminalpha')
  const [loginPassword, setLoginPassword] = useState('Alpha@123')
  const [showPassword, setShowPassword] = useState(false)
  const [signupName, setSignupName] = useState('')
  const [signupStudentId, setSignupStudentId] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupMessage, setSignupMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const loginTimerRef = useRef(null)
  const signupTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      window.clearTimeout(loginTimerRef.current)
      window.clearTimeout(signupTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setLoginError('')
    setSignupError('')
    setSignupMessage('')
    setIsSigningIn(false)

    if (mode === 'login') {
      setLoginStudentId('adminalpha')
      setLoginPassword('Alpha@123')
      return
    }

    setSignupName('')
    setSignupStudentId('')
    setSignupEmail('')
    setSignupPassword('')
    setSignupConfirmPassword('')
  }, [mode])

  const handleLoginSubmit = async (event) => {
    event.preventDefault()

    if (isSigningIn) {
      return
    }

    const trimmedUser = loginStudentId.trim()
    const trimmedPassword = loginPassword.trim()

    if (!trimmedUser) {
      setLoginError('Please enter your Username, Public ID, or Warrior Name.')
      return
    }

    if (!trimmedPassword) {
      setLoginError('Please enter your password.')
      return
    }

    // Lookup member in memberService
    const cleanLookup = trimmedUser.toLowerCase() === 'student01' ? 'adminalpha' : trimmedUser
    const memberRes = await memberService.getMemberById(cleanLookup)

    if (!memberRes.success || !memberRes.data) {
      setLoginError(`Account "${trimmedUser}" not found. Try adminalpha or MEMBER01.`)
      return
    }

    const member = memberRes.data

    if (member.status === 'ARCHIVED') {
      setLoginError('This account is archived and inactive. Please contact Super Admin (adminalpha) to restore access.')
      return
    }

    if (member.status === 'DISABLED') {
      setLoginError('This account is currently disabled. Please contact Super Admin (adminalpha).')
      return
    }

    // Isolate caches: clear previous user stores before binding new user
    clearUserProgressStore()
    clearAnalyticsStore()

    // Bind authenticated member session
    setActiveMember(member)
    setLoginError('')
    setIsSigningIn(true)

    loginTimerRef.current = window.setTimeout(() => {
      onLoginSuccess?.()
    }, LOGIN_FLASH_DELAY)
  }

  const handleSignupSubmit = (event) => {
    event.preventDefault()

    const trimmedName = signupName.trim()
    const trimmedStudentId = signupStudentId.trim()
    const trimmedEmail = signupEmail.trim()
    const trimmedPassword = signupPassword.trim()
    const trimmedConfirm = signupConfirmPassword.trim()

    if (!trimmedName) {
      setSignupError('Please enter your full name.')
      return
    }

    if (!trimmedStudentId) {
      setSignupError('Please choose a student ID.')
      return
    }

    if (!trimmedEmail) {
      setSignupError('Please enter your email address.')
      return
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.')
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      setSignupError('Passwords do not match.')
      return
    }

    setSignupError('')
    setSignupMessage('Creating your student profile...')

    signupTimerRef.current = window.setTimeout(async () => {
      await memberService.createMember({
        username: trimmedStudentId,
        display_name: trimmedName,
        email: trimmedEmail,
        assigned_courses: ['bpsc_prelims'],
      })
      setSignupMessage('Account created successfully! Switching to login...')
      onSignupSuccess?.({
        name: trimmedName,
        studentId: trimmedStudentId,
        email: trimmedEmail,
      })
    }, SIGNUP_FLASH_DELAY)
  }

  const isLogin = mode === 'login'

  return (
    <div className="authPageRoot">
      <div className={`authShell${isSigningIn ? ' authShell--authenticating' : ''}`}>
        {/* Heartbeat transition state during signin */}
        {isSigningIn ? (
          <div className="authTransitionStage" role="status" aria-label="Authenticating student access">
            <div className="authTransitionLogoWrap">
              <AlphaMark className="authLogo authLogo--heartbeat authLogo--transition" />
            </div>
          </div>
        ) : (
          <div className="authCard">
            <div className="authHeader">
              <span className="authLogoStandalone" aria-hidden="true">
                <AlphaMark className="authLogo" />
              </span>
            </div>

            {/* Quick Profile Switcher */}
            {isLogin && (
              <div className="authQuickProfilesSection">
                <div className="authQuickProfilesLabel">
                  Quick Select Profile:
                </div>
                <div className="authQuickProfilesGrid">
                  {QUICK_PROFILES.map((prof) => {
                    const isSelected = loginStudentId.toUpperCase() === prof.id.toUpperCase()
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        className={`authProfileChip${isSelected ? ' authProfileChip--selected' : ''}`}
                        onClick={() => {
                          setLoginStudentId(prof.id)
                          setLoginPassword('Alpha@123')
                          setLoginError('')
                        }}
                      >
                        <div className="authProfileChipHeader">
                          <span className="authProfileChipIcon">{prof.icon}</span>
                          <span className="authProfileChipName">{prof.name}</span>
                        </div>
                        <span className="authProfileChipCourse">{prof.course}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {isLogin ? (
              <form className="authForm" onSubmit={handleLoginSubmit} noValidate>
                <EnhancedField
                  id="auth-student-id"
                  label="Username, Public ID or Warrior Name"
                  placeholder="e.g. adminalpha or MEMBER01"
                  value={loginStudentId}
                  onChange={(e) => setLoginStudentId(e.target.value)}
                  iconName="profile"
                  autoComplete="username"
                />

                <EnhancedField
                  id="auth-password"
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  iconName="lock"
                  autoComplete="current-password"
                  showTogglePassword
                  isPasswordVisible={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                />

                {loginError && (
                  <div className="authInlineError" role="alert">
                    <span className="authInlineErrorIcon">
                      <AppIcon name="warning" size={16} />
                    </span>
                    <span>{loginError}</span>
                  </div>
                )}

                <button type="submit" className="authSubmitBtn" disabled={isSigningIn}>
                  Sign in
                </button>
              </form>
            ) : (
              <form className="authForm" onSubmit={handleSignupSubmit} noValidate>
                <EnhancedField
                  id="auth-signup-name"
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  iconName="profile"
                />

                <EnhancedField
                  id="auth-signup-id"
                  label="Student ID"
                  placeholder="Choose a student ID (e.g. STUDENT02)"
                  value={signupStudentId}
                  onChange={(e) => setSignupStudentId(e.target.value)}
                  iconName="profile"
                />

                <EnhancedField
                  id="auth-signup-email"
                  label="Email Address"
                  placeholder="name@student.nexora.io"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  iconName="mail"
                />

                <EnhancedField
                  id="auth-signup-password"
                  label="Create Password"
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  iconName="lock"
                  showTogglePassword
                  isPasswordVisible={showSignupPassword}
                  onTogglePassword={() => setShowSignupPassword((prev) => !prev)}
                />

                <EnhancedField
                  id="auth-signup-confirm"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  type="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  iconName="lock"
                  showTogglePassword
                  isPasswordVisible={showSignupConfirmPassword}
                  onTogglePassword={() => setShowSignupConfirmPassword((prev) => !prev)}
                />

                {signupError && (
                  <div className="authInlineError" role="alert">
                    <span className="authInlineErrorIcon">
                      <AppIcon name="warning" size={16} />
                    </span>
                    <span>{signupError}</span>
                  </div>
                )}

                {signupMessage && <div className="authInlineSuccess">{signupMessage}</div>}

                <button type="submit" className="authSubmitBtn">
                  Create Student Profile
                </button>
              </form>
            )}

            <div className="authSwitchPrompt">
              {isLogin ? (
                <>
                  <span>New student at Nexora?</span>{' '}
                  <button type="button" className="authSwitchLink" onClick={onGoSignup}>
                    Create account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have a student account?</span>{' '}
                  <button type="button" className="authSwitchLink" onClick={onGoLogin}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
