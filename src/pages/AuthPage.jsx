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

  // Signup fields (Academic Registration with Mobile SMS OTP)
  const [signupStep, setSignupStep] = useState('form') // 'form' | 'otp'
  const [signupName, setSignupName] = useState('')
  const [signupCourseId, setSignupCourseId] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupDisplayPhone, setSignupDisplayPhone] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Status & UI state
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const timerRef = useRef(null)
  const cooldownTimerRef = useRef(null)

  useEffect(() => {
    hydrateWorkspacesFromSupabase().catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [])

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [resendCooldown])

  // Sync mode prop when changed externally
  useEffect(() => {
    setLocalMode(mode)
    setSignupStep('form')
    setOtpCode('')
  }, [mode])

  // Pre-select first course when courses load
  useEffect(() => {
    if (!signupCourseId && activeCourses.length > 0) {
      setSignupCourseId(activeCourses[0].id)
    }
  }, [activeCourses, signupCourseId])

  // Auto-fill suggested username when name is entered
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
    setSignupStep('form')
    setOtpCode('')
  }, [localMode])

  const handleSwitchToLogin = () => {
    setLocalMode('login')
    setSignupStep('form')
    onGoLogin?.()
  }

  const handleSwitchToSignup = () => {
    setLocalMode('signup')
    setSignupStep('form')
    onGoSignup?.()
  }

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedUser = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUser) {
      setErrorMessage('Please enter your identity key, email, or mobile.')
      return
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your passcode.')
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
      setSuccessMessage(`Access granted. Welcome back, ${member.display_name || member.username}!`)

      timerRef.current = setTimeout(() => {
        onLoginSuccess?.()
      }, 600)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Login failed. Please check network connection.')
    }
  }

  // Step 1: Send OTP to Mobile Number
  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedName = signupName.trim()
    const trimmedCourse = signupCourseId || (activeCourses[0]?.id || 'cbse-10')
    const trimmedPhone = signupPhone.trim()
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

    if (!trimmedPhone) {
      setErrorMessage('Please enter your 10-digit mobile number.')
      return
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '')
    if (digitsOnly.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.')
      return
    }

    if (!trimmedUser) {
      const base = trimmedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'STU'
      trimmedUser = `${base}${digitsOnly.slice(-4)}`
    }

    if (!trimmedPass || trimmedPass.length < 6) {
      setErrorMessage('Passcode must be at least 6 characters.')
      return
    }

    if (trimmedPass !== trimmedConfirmPass) {
      setErrorMessage('Passcodes do not match. Please re-enter.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const otpRes = await userService.sendSignupOtp({
        name: trimmedName,
        courseId: trimmedCourse,
        phone: trimmedPhone,
        username: trimmedUser,
        password: trimmedPass,
      })

      setIsLoading(false)

      if (!otpRes.success) {
        setErrorMessage(otpRes.error || 'Failed to send mobile verification code. Please try again.')
        return
      }

      setSignupDisplayPhone(otpRes.displayPhone || trimmedPhone)
      setSignupStep('otp')
      setResendCooldown(45)
      setSuccessMessage(`SMS verification code sent to ${otpRes.displayPhone || trimmedPhone}!`)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Failed to send SMS verification code.')
    }
  }

  // Step 2: Verify OTP & Finalize Account Creation
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (isLoading) return

    const trimmedOtp = otpCode.trim().replace(/\D/g, '')

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit SMS verification code.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const verifyRes = await userService.verifySignupOtp({
        phone: signupPhone.trim(),
        otp: trimmedOtp,
        name: signupName.trim(),
        courseId: signupCourseId || (activeCourses[0]?.id || 'cbse-10'),
        username: signupUsername.trim().toUpperCase(),
      })

      if (!verifyRes.success || !verifyRes.data) {
        setIsLoading(false)
        setErrorMessage(verifyRes.error || 'Invalid or expired SMS code. Please try again.')
        return
      }

      const newMember = verifyRes.data
      setIsLoading(false)
      setSuccessMessage(`Mobile verified! Welcome to Nexora, ${newMember.display_name}! 🚀`)

      timerRef.current = setTimeout(() => {
        onSignupSuccess?.()
        onLoginSuccess?.()
      }, 750)
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'SMS verification failed.')
    }
  }

  // Resend SMS OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await userService.resendSignupOtp({ phone: signupPhone.trim() })
      setIsLoading(false)
      if (res.success) {
        setResendCooldown(45)
        setSuccessMessage(`New SMS verification code sent to ${signupDisplayPhone || signupPhone}!`)
      } else {
        setErrorMessage(res.error || 'Failed to resend SMS.')
      }
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Failed to resend SMS.')
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
        setSuccessMessage('Supreme Alpha Admin authorized. Loading console...')
        timerRef.current = setTimeout(() => {
          onLoginSuccess?.()
        }, 500)
      } else {
        setIsLoading(false)
        setErrorMessage(res.error || 'Failed to authenticate Administrator.')
      }
    } catch (err) {
      setIsLoading(false)
      setErrorMessage(err.message || 'Administrator login error.')
    }
  }

  return (
    <div className="alpha-auth-root">
      {/* Top-Right Administrator Access Quick Button with Tooltip */}
      <div className="auth-top-admin-container">
        <button
          type="button"
          className="auth-top-admin-btn"
          aria-label="Administrator Access"
          title="Administrator Access"
          onClick={handleSupremeAdminQuickLogin}
        >
          <AppIcon name="adminPanelSettings" size={20} />
          <span className="auth-top-admin-tooltip">Admin Access</span>
        </button>
      </div>

      {/* Subtle Warm Orange Glow Halo */}
      <div className="auth-halo-glow" />

      {/* Central Sovereign Card */}
      <div className="alpha-scene">
        <div className="alpha-card">
          {/* Sovereign glowing logo mark */}
          <div
            className={`auth-logo-wrap${focusedField ? ' active' : ''}`}
            title="Nexora Academic Portal"
          >
            <div className="auth-logo-glow" />
            <img className="auth-logo-img" src="/alpha-logo.png" alt="Nexora Alpha" />
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
            onSubmit={
              isSignup
                ? signupStep === 'otp'
                  ? handleVerifyOtp
                  : handleSendOtp
                : handleLoginSubmit
            }
          >
            {!isSignup ? (
              <>
                {/* 1. Identity Key Input (Username / Phone / Email) */}
                <div className="auth-field">
                  <div className="auth-field-icon">
                    <AppIcon name="person" size={18} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    className="auth-input"
                    placeholder="Identity Key"
                    aria-label="Identity Credential"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>

                {/* 2. Passcode Input */}
                <div className="auth-field">
                  <div className="auth-field-icon">
                    <AppIcon name="key" size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="auth-input has-toggle"
                    placeholder="Passcode"
                    aria-label="Passcode Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-btn"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                  >
                    <AppIcon name={showPassword ? 'visibilityOff' : 'visibility'} size={18} />
                  </button>
                </div>

                {/* 3. Primary Gradient Submit Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  id="submitBtn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      <span>Login</span>
                      <AppIcon name="arrowForward" size={16} />
                    </>
                  )}
                </button>
              </>
            ) : signupStep === 'otp' ? (
              <div className="alpha-card">
                <div className="auth-otp-badge">
                  <AppIcon name="security" size={13} />
                  <span>SMS Verification</span>
                </div>
                <h2 className="auth-otp-title">Enter SMS Code</h2>
                <p className="auth-otp-subtitle">
                  Enter the 6-digit SMS code sent to{' '}
                  <strong style={{ color: '#fff' }}>{signupDisplayPhone || signupPhone}</strong>
                </p>

                <div className="auth-field">
                  <input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="auth-input auth-otp-input"
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onFocus={() => setFocusedField('otpCode')}
                    onBlur={() => setFocusedField(null)}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  id="verifyOtpBtn"
                  disabled={isLoading || otpCode.length < 6}
                >
                  {isLoading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      <span>Verify &amp; Create Account</span>
                      <AppIcon name="arrowForward" size={16} />
                    </>
                  )}
                </button>

                <div className="auth-otp-footer">
                  <button
                    type="button"
                    className="auth-otp-footer-btn"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    {resendCooldown > 0 ? `Resend SMS in ${resendCooldown}s` : 'Resend SMS'}
                  </button>
                  <span className="auth-otp-dot">•</span>
                  <button
                    type="button"
                    className="auth-otp-footer-btn"
                    onClick={() => {
                      setSignupStep('form')
                      setErrorMessage('')
                    }}
                  >
                    Edit Mobile Number
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Academic Track Selection */}
                <div className="auth-class-section">
                  <div className="auth-class-section-header">
                    <span className="auth-class-section-title">
                      <AppIcon name="school" size={13} color="#f97316" />
                      <span>Academic Course / Class</span>
                    </span>
                    <span className="auth-class-section-badge">{activeCourses.length} Available</span>
                  </div>
                  <div className="auth-class-grid">
                    {activeCourses.map((course) => {
                      const isSelected = signupCourseId === course.id
                      return (
                        <button
                          key={course.id}
                          type="button"
                          className={`auth-class-chip${isSelected ? ' active' : ''}`}
                          onClick={() => setSignupCourseId(course.id)}
                        >
                          <AppIcon
                            name="school"
                            size={14}
                            color={isSelected ? '#f97316' : '#94a3b8'}
                          />
                          <span className="auth-class-chip-name" title={course.name}>
                            {course.name}
                          </span>
                          {isSelected && <AppIcon name="check" size={12} color="#f97316" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Full Name */}
                <div className="auth-field">
                  <div className="auth-field-icon">
                    <AppIcon name="badge" size={18} />
                  </div>
                  <input
                    id="signupName"
                    type="text"
                    className="auth-input"
                    placeholder="Full Name (e.g. Abhishek Kumar)"
                    value={signupName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => setFocusedField('signupName')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>

                {/* 3. Mobile Number */}
                <div className="auth-field">
                  <div className="auth-field-icon">
                    <AppIcon name="phone" size={18} />
                  </div>
                  <span className="auth-phone-prefix">+91</span>
                  <input
                    id="signupPhone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={14}
                    className="auth-input has-prefix"
                    placeholder="Mobile Number"
                    value={signupPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d+ ]/g, '')
                      setSignupPhone(val)
                    }}
                    onFocus={() => setFocusedField('signupPhone')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>

                {/* 4. Passwords */}
                <div className="auth-field-grid">
                  <div className="auth-field">
                    <div className="auth-field-icon">
                      <AppIcon name="key" size={16} />
                    </div>
                    <input
                      id="signupPassword"
                      type={showSignupPassword ? 'text' : 'password'}
                      className="auth-input has-toggle"
                      placeholder="Passcode"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      onFocus={() => setFocusedField('signupPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-toggle-btn"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      <AppIcon name={showSignupPassword ? 'visibilityOff' : 'visibility'} size={16} />
                    </button>
                  </div>

                  <div className="auth-field">
                    <div className="auth-field-icon">
                      <AppIcon name="key" size={16} />
                    </div>
                    <input
                      id="signupConfirmPassword"
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      className="auth-input has-toggle"
                      placeholder="Confirm Passcode"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('signupConfirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-toggle-btn"
                      onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      <AppIcon name={showSignupConfirmPassword ? 'visibilityOff' : 'visibility'} size={16} />
                    </button>
                  </div>
                </div>

                {/* 5. Submit Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  id="sendOtpBtn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      <span>Send Mobile OTP</span>
                      <AppIcon name="arrowForward" size={16} />
                    </>
                  )}
                </button>
              </>
            )}
          </form>

          {/* Bottom Actions */}
          <div className="auth-bottom-nav">
            {!isSignup && (
              <button
                type="button"
                className="auth-admin-portal-btn"
                onClick={handleSupremeAdminQuickLogin}
              >
                <AppIcon name="shieldPerson" size={15} />
                <span>Admin Portal</span>
              </button>
            )}

            <div className="auth-mode-switch-link">
              <span>{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
              <button
                type="button"
                className="auth-switch-text-btn"
                onClick={isSignup ? handleSwitchToLogin : handleSwitchToSignup}
              >
                {isSignup ? 'Log in' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
