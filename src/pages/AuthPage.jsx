import { useEffect, useRef, useState } from 'react'
import '../styles/auth.css'

const DEMO_CREDENTIALS = {
  studentId: 'STUDENT01',
  password: 'Alpha@123',
}

const LOGIN_FLASH_DELAY = 1150
const SIGNUP_FLASH_DELAY = 900

function AlphaMark({ className = '', filled = false, fillPercentage = 0 }) {
  const isFilled = filled || fillPercentage >= 100
  const yOffset = 96 - (Math.min(100, Math.max(0, fillPercentage)) / 100) * 96

  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Alpha logo"
    >
      <defs>
        <linearGradient id="alphaLiquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF3D00" />
          <stop offset="45%" stopColor="#FF7A18" />
          <stop offset="85%" stopColor="#FFA040" />
          <stop offset="100%" stopColor="#FFE082" />
        </linearGradient>

        <clipPath id="authCardAlphaClip">
          <rect x="0" y={yOffset} width="96" height="96" />
        </clipPath>

        <filter id="alphaNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wireframe Outline */}
      <path
        d="M48 12L84 76H12L48 12Z"
        fill={isFilled ? 'url(#alphaLiquidGrad)' : 'none'}
        stroke={isFilled ? 'url(#alphaLiquidGrad)' : 'currentColor'}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M34 58L48 36L62 58"
        fill="none"
        stroke={isFilled ? '#FFFFFF' : 'currentColor'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {fillPercentage > 0 && !isFilled && (
        <g clipPath="url(#authCardAlphaClip)">
          <path
            d="M48 12L84 76H12L48 12Z"
            fill="url(#alphaLiquidGrad)"
            stroke="url(#alphaLiquidGrad)"
            strokeWidth="8"
            strokeLinejoin="round"
            filter="url(#alphaNeonGlow)"
          />
          <path
            d="M34 58L48 36L62 58"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}

function AlphaFillOverlay({ fillPercent = 0, isGranted = false }) {
  const clamped = Math.min(100, Math.max(0, fillPercent))
  const yOffset = 96 - (clamped / 100) * 96

  return (
    <div className="authFlashLayer" role="status" aria-live="polite">
      <div className={`authFlashPanel ${isGranted ? 'access-granted' : ''}`}>
        <div className="alpha-fill-stage">
          <div className={`alpha-glow-orb ${isGranted ? 'burst' : ''}`} />
          <svg
            className="authFlashLogo"
            viewBox="0 0 96 96"
            role="img"
            aria-label="Alpha filling logo"
          >
            <defs>
              <linearGradient id="overlayAlphaGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FF3D00" />
                <stop offset="40%" stopColor="#FF7A18" />
                <stop offset="80%" stopColor="#FFA040" />
                <stop offset="100%" stopColor="#FFE082" />
              </linearGradient>

              <clipPath id="overlayFillClip">
                <rect x="0" y={yOffset} width="96" height="96" />
              </clipPath>

              <filter id="alphaOverlayGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base Ghost Frame */}
            <path
              d="M48 12L84 76H12L48 12Z"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            <path
              d="M34 58L48 36L62 58"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Rising Liquid Fill */}
            <g clipPath="url(#overlayFillClip)">
              <path
                d="M48 12L84 76H12L48 12Z"
                fill="url(#overlayAlphaGrad)"
                stroke="url(#overlayAlphaGrad)"
                strokeWidth="8"
                strokeLinejoin="round"
                filter="url(#alphaOverlayGlow)"
              />
              <path
                d="M34 58L48 36L62 58"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Liquid surface wave indicator */}
            {clamped > 0 && clamped < 100 && (
              <line
                x1="8"
                y1={yOffset}
                x2="88"
                y2={yOffset}
                stroke="#FFE082"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#alphaOverlayGlow)"
              />
            )}
          </svg>
        </div>

        <div className="authFlashText">
          <div className="auth-brand-row">
            <p className="auth-brand-title">ALPHA</p>
            <span className="auth-fill-pct">{Math.round(clamped)}%</span>
          </div>
          <span className="auth-status-msg">
            {isGranted ? '✓ ACCESS GRANTED' : 'AUTHENTICATING ALPHA ACCESS...'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete = 'off',
}) {
  return (
    <label className="authField" htmlFor={id}>
      <span className="authLabel">{label}</span>
      <input
        id={id}
        className="authInput"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck="false"
        autoCapitalize="off"
      />
    </label>
  )
}

export default function AuthPage({
  mode = 'login',
  onGoLogin,
  onGoSignup,
  onLoginSuccess,
  onSignupSuccess,
}) {
  const [loginStudentId, setLoginStudentId] = useState(DEMO_CREDENTIALS.studentId)
  const [loginPassword, setLoginPassword] = useState(DEMO_CREDENTIALS.password)
  const [signupName, setSignupName] = useState('')
  const [signupStudentId, setSignupStudentId] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupMessage, setSignupMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [fillPercentage, setFillPercentage] = useState(0)
  const [isAccessGranted, setIsAccessGranted] = useState(false)

  const loginTimerRef = useRef(null)
  const signupTimerRef = useRef(null)
  const animFrameRef = useRef(null)

  useEffect(() => {
    return () => {
      window.clearTimeout(loginTimerRef.current)
      window.clearTimeout(signupTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    setLoginError('')
    setSignupError('')
    setSignupMessage('')
    setIsSigningIn(false)
    setFillPercentage(0)
    setIsAccessGranted(false)

    if (mode === 'login') {
      setLoginStudentId(DEMO_CREDENTIALS.studentId)
      setLoginPassword(DEMO_CREDENTIALS.password)
      return
    }

    setSignupName('')
    setSignupStudentId('')
    setSignupEmail('')
    setSignupPassword('')
    setSignupConfirmPassword('')
  }, [mode])

  const handleLoginSubmit = (event) => {
    event.preventDefault()

    if (isSigningIn) {
      return
    }

    const enteredStudentId = loginStudentId.trim().toUpperCase()
    const expectedStudentId = DEMO_CREDENTIALS.studentId.toUpperCase()

    if (enteredStudentId !== expectedStudentId || loginPassword !== DEMO_CREDENTIALS.password) {
      setLoginError('Use the demo Student ID and password shown below.')
      return
    }

    setLoginError('')
    setIsSigningIn(true)
    setFillPercentage(0)
    setIsAccessGranted(false)

    const startTime = performance.now()
    const duration = 1100

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 2.5)
      const currentPct = Math.round(eased * 100)

      setFillPercentage(currentPct)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setFillPercentage(100)
        setIsAccessGranted(true)
        loginTimerRef.current = window.setTimeout(() => {
          onLoginSuccess?.()
        }, 450)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  const handleSignupSubmit = (event) => {
    event.preventDefault()

    if (!signupName.trim() || !signupStudentId.trim() || !signupEmail.trim() || !signupPassword.trim() || !signupConfirmPassword.trim()) {
      setSignupError('Please fill in every field to create the student profile.')
      return
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.')
      return
    }

    setSignupError('')
    setSignupMessage('Student account created. Redirecting to sign in...')
    signupTimerRef.current = window.setTimeout(() => {
      onSignupSuccess?.()
    }, SIGNUP_FLASH_DELAY)
  }

  return (
    <main className={`authShell authShell--${mode}`}>
      <div className="authBackdrop" aria-hidden="true">
        <span className="authOrb authOrb--one" />
        <span className="authOrb authOrb--two" />
        <span className="authGrid" />
      </div>

      <section className="authCard" aria-labelledby="auth-title">
        <div className="authHeader">
          <div className="authLogoWrap">
            <AlphaMark className="authLogo" fillPercentage={isSigningIn ? fillPercentage : 0} />
          </div>

          <div className="authHeading">
            <p className="authEyebrow">Alpha student access</p>
            <h1 id="auth-title">
              {mode === 'login' ? 'Welcome back' : 'Create your student account'}
            </h1>
            <p className="authCopy">
              {mode === 'login'
                ? 'Sign in with the hardcoded student ID and password.'
                : 'Join as a student and move back to sign in with a smooth transition.'}
            </p>
          </div>
        </div>

        {mode === 'login' ? (
          <form className="authForm" onSubmit={handleLoginSubmit}>
            <Field
              label="Student ID"
              id="student-id"
              value={loginStudentId}
              onChange={(event) => setLoginStudentId(event.target.value)}
              placeholder="Enter your student ID"
              autoComplete="username"
            />

            <Field
              label="Password"
              id="student-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            <div className="authDemo">
              <div className="authDemoChip">
                <span>Demo ID</span>
                <strong>{DEMO_CREDENTIALS.studentId}</strong>
              </div>
              <div className="authDemoChip">
                <span>Demo password</span>
                <strong>{DEMO_CREDENTIALS.password}</strong>
              </div>
            </div>

            {loginError ? (
              <p className="authError" role="alert">
                {loginError}
              </p>
            ) : null}

            <button className="authPrimaryButton" type="submit" disabled={isSigningIn}>
              {isSigningIn ? `Authenticating ${fillPercentage}%...` : 'Sign in'}
            </button>

            <p className="authSwitch">
              New student?{' '}
              <button type="button" className="authLinkButton" onClick={onGoSignup}>
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form className="authForm" onSubmit={handleSignupSubmit}>
            <Field
              label="Full name"
              id="student-name"
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />

            <Field
              label="Student ID"
              id="signup-student-id"
              value={signupStudentId}
              onChange={(event) => setSignupStudentId(event.target.value)}
              placeholder="Choose a student ID"
              autoComplete="username"
            />

            <Field
              label="Email"
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Field
              label="Password"
              id="signup-password"
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
            />

            <Field
              label="Confirm password"
              id="signup-confirm-password"
              type="password"
              value={signupConfirmPassword}
              onChange={(event) => setSignupConfirmPassword(event.target.value)}
              placeholder="Repeat the password"
              autoComplete="new-password"
            />

            {signupMessage ? (
              <p className="authSuccess" role="status" aria-live="polite">
                {signupMessage}
              </p>
            ) : null}

            {signupError ? (
              <p className="authError" role="alert">
                {signupError}
              </p>
            ) : null}

            <button className="authPrimaryButton" type="submit" disabled={Boolean(signupMessage)}>
              {signupMessage ? 'Preparing sign in...' : 'Create account'}
            </button>

            <p className="authSwitch">
              Already have an account?{' '}
              <button type="button" className="authLinkButton" onClick={onGoLogin}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {isSigningIn ? (
          <AlphaFillOverlay fillPercent={fillPercentage} isGranted={isAccessGranted} />
        ) : null}
      </section>
    </main>
  )
}
