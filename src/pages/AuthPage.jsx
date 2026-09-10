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

  // Signup fields (Academic Fast Registration with Mobile SMS OTP)
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

  // Sync mode prop when changed externally (via hash routing #/login vs #/signup)
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
      setErrorMessage('Please enter your mobile number, email, or username.')
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
      }, 850)
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
                {/* Mobile / Email / Username */}
                <div className="field">
                  <label htmlFor="username">
                    <AppIcon name="person" size={13} color="#FB923C" />
                    <span>Mobile Number, Email or Username</span>
                  </label>
                  <div className={`field-input-wrap${focusedField === 'username' ? ' focused' : ''}`}>
                    <span className="field-prefix-icon">
                      <AppIcon name="person" size={16} color="#64748B" />
                    </span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. 9876543210 or adminalpha"
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
                  <label htmlFor="password">
                    <AppIcon name="key" size={13} color="#FB923C" />
                    <span>Password</span>
                  </label>
                  <div className={`field-input-wrap${focusedField === 'password' ? ' focused' : ''}`}>
                    <span className="field-prefix-icon">
                      <AppIcon name="key" size={16} color="#64748B" />
                    </span>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  className={`submit${isLoading ? ' loading' : ''}`}
                  id="submitBtn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner"></span>
                  ) : (
                    <AppIcon name="logout" size={16} />
                  )}
                  <span className="btn-text">{isLoading ? 'Signing in...' : 'Log in'}</span>
                </button>
              </>
            ) : signupStep === 'otp' ? (
              <div className="alpha-otp-container">
                <div className="alpha-otp-badge">
                  <AppIcon name="security" size={14} />
                  <span>SMS VERIFICATION</span>
                </div>
                <h2 className="alpha-otp-title">Enter SMS Code</h2>
                <p className="alpha-otp-subtitle">
                  Enter the 6-digit SMS verification code sent to{' '}
                  <span className="alpha-otp-highlight">{signupDisplayPhone || signupPhone}</span>
                </p>

                <div className="field">
                  <div className={`field-input-wrap alpha-otp-input-wrap${focusedField === 'otpCode' ? ' focused' : ''}`}>
                    <input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="alpha-otp-input"
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onFocus={() => setFocusedField('otpCode')}
                      onBlur={() => setFocusedField(null)}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* Verify Submit Button */}
                <button
                  type="submit"
                  className={`submit${isLoading ? ' loading' : ''}`}
                  id="verifyOtpBtn"
                  disabled={isLoading || otpCode.length < 6}
                >
                  {isLoading ? (
                    <span className="spinner"></span>
                  ) : (
                    <AppIcon name="rocket" size={16} />
                  )}
                  <span className="btn-text">
                    {isLoading ? 'Verifying SMS Code...' : 'Verify & Create Account'}
                  </span>
                </button>

                <div className="alpha-otp-footer">
                  <button
                    type="button"
                    className="alpha-link-btn"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    {resendCooldown > 0 ? `Resend SMS in ${resendCooldown}s` : 'Resend SMS'}
                  </button>
                  <span className="alpha-otp-dot">•</span>
                  <button
                    type="button"
                    className="alpha-link-btn"
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
                {/* 1. Academic Track / Class Dynamic Selection */}
                <div className="alpha-class-section">
                  <div className="alpha-class-section-header">
                    <span className="alpha-class-section-title">
                      <AppIcon name="school" size={14} color="#FB923C" />
                      <span>Academic Course / Class</span>
                    </span>
                    <span className="alpha-class-section-badge">{activeCourses.length} Available</span>
                  </div>
                  <div className="alpha-class-grid">
                    {activeCourses.map((course) => {
                      const isSelected = signupCourseId === course.id
                      const lower = course.name.toLowerCase()
                      const iconName = lower.includes('9')
                        ? 'bolt'
                        : lower.includes('10')
                        ? 'chapters'
                        : lower.includes('11')
                        ? 'physics'
                        : lower.includes('12') || lower.includes('cs')
                        ? 'computer'
                        : 'school'

                      return (
                        <button
                          key={course.id}
                          type="button"
                          className={`alpha-class-chip${isSelected ? ' active' : ''}`}
                          onClick={() => setSignupCourseId(course.id)}
                        >
                          <span className="alpha-class-chip-icon">
                            <AppIcon name={iconName} size={15} color={isSelected ? '#FB923C' : '#94A3B8'} />
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
                  <label htmlFor="signupName">
                    <AppIcon name="badge" size={13} color="#FB923C" />
                    <span>Full Name</span>
                  </label>
                  <div className={`field-input-wrap${focusedField === 'signupName' ? ' focused' : ''}`}>
                    <span className="field-prefix-icon">
                      <AppIcon name="badge" size={16} color="#64748B" />
                    </span>
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

                {/* 3. Mobile Number */}
                <div className="field">
                  <label htmlFor="signupPhone">
                    <AppIcon name="phone" size={13} color="#FB923C" />
                    <span>Mobile Number (for SMS OTP)</span>
                  </label>
                  <div className={`field-input-wrap alpha-phone-wrap${focusedField === 'signupPhone' ? ' focused' : ''}`}>
                    <span className="alpha-phone-prefix">+91</span>
                    <input
                      id="signupPhone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="98765 43210"
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
                </div>

                {/* 4. Password & Confirm Password */}
                <div className="field-grid-row">
                  <div className="field">
                    <label htmlFor="signupPassword">
                      <AppIcon name="key" size={13} color="#FB923C" />
                      <span>Password</span>
                    </label>
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
                    <label htmlFor="signupConfirmPassword">
                      <AppIcon name="key" size={13} color="#FB923C" />
                      <span>Confirm Password</span>
                    </label>
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

                {/* Send Mobile OTP Submit Button */}
                <button
                  type="submit"
                  className={`submit${isLoading ? ' loading' : ''}`}
                  id="sendOtpBtn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner"></span>
                  ) : (
                    <AppIcon name="phone" size={16} />
                  )}
                  <span className="btn-text">
                    {isLoading ? 'Sending SMS OTP...' : 'Send Mobile OTP'}
                  </span>
                </button>
              </>
            )}
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



