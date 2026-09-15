import { useEffect, useRef, useState, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import '../../styles/adminSecurityModal.css'
import { userService, verifyAdminMasterCode } from '../../services/userService'

export default function AdminSecurityModal({ open, onClose, onSuccess }) {
  const [entryMode, setEntryMode] = useState('pin') // 'pin' | 'cipher'
  const [pinDigits, setPinDigits] = useState('')
  const [cipherText, setCipherText] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isGranted, setIsGranted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'error' | 'success', message: '' }
  const [showClue, setShowClue] = useState(false)

  const cipherInputRef = useRef(null)
  const timerRef = useRef(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setPinDigits('')
      setCipherText('')
      setIsShaking(false)
      setIsGranted(false)
      setIsLoading(false)
      setFeedback(null)
      setShowClue(false)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [open])

  // Focus input when cipher mode is active
  useEffect(() => {
    if (open && entryMode === 'cipher') {
      setTimeout(() => {
        cipherInputRef.current?.focus()
      }, 50)
    }
  }, [open, entryMode])

  // Central submission handler
  const handleVerifySubmission = useCallback(
    async (candidateCode) => {
      if (isLoading || isGranted) return

      const cleanCode = (candidateCode || '').trim()
      if (!cleanCode) {
        setFeedback({ type: 'error', message: 'Please enter master key or 4-digit PIN.' })
        triggerShake()
        return
      }

      setIsLoading(true)
      setFeedback(null)

      try {
        const res = await userService.authenticateAdminByMasterCode(cleanCode)

        if (res.success) {
          setIsLoading(false)
          setIsGranted(true)
          setFeedback({
            type: 'success',
            message: 'Clearance verified. Welcome Supreme Alpha Admin! 👑',
          })

          timerRef.current = setTimeout(() => {
            onSuccess?.(res.data)
            onClose?.()
          }, 650)
        } else {
          setIsLoading(false)
          setFeedback({
            type: 'error',
            message: res.error || 'Access Denied: Invalid Security Cipher.',
          })
          triggerShake()
          setPinDigits('')
        }
      } catch (err) {
        setIsLoading(false)
        setFeedback({
          type: 'error',
          message: err.message || 'Security validation error.',
        })
        triggerShake()
        setPinDigits('')
      }
    },
    [isLoading, isGranted, onSuccess, onClose]
  )

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => {
      setIsShaking(false)
    }, 500)
  }

  // Keypad click handlers
  const handleKeypadPress = (val) => {
    if (isLoading || isGranted) return

    if (val === 'CLR') {
      setPinDigits('')
      setFeedback(null)
      return
    }

    if (val === 'DEL') {
      setPinDigits((prev) => prev.slice(0, -1))
      setFeedback(null)
      return
    }

    // Number digit
    if (pinDigits.length < 4) {
      const nextDigits = pinDigits + val
      setPinDigits(nextDigits)
      setFeedback(null)

      // Auto-submit on 4th digit
      if (nextDigits.length === 4) {
        handleVerifySubmission(nextDigits)
      }
    }
  }

  // Global keyboard listener for modal
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      if (entryMode === 'pin') {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault()
          handleKeypadPress(e.key)
        } else if (e.key === 'Backspace') {
          e.preventDefault()
          handleKeypadPress('DEL')
        } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
          e.preventDefault()
          handleKeypadPress('CLR')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (pinDigits.length >= 4) {
            handleVerifySubmission(pinDigits)
          }
        }
      } else if (entryMode === 'cipher') {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleVerifySubmission(cipherText)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, entryMode, pinDigits, cipherText, handleVerifySubmission, onClose])

  if (!open) return null

  const keypadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'CLR', '0', 'DEL',
  ]

  return (
    <div className="admin-sec-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`admin-sec-modal${isShaking ? ' is-shaking' : ''}${isGranted ? ' is-granted' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-sec-glowline" />

        {/* Close Button */}
        <button
          type="button"
          className="admin-sec-close-btn"
          onClick={onClose}
          aria-label="Close Admin Clearance Modal"
        >
          <AppIcon name="close" size={16} />
        </button>

        {/* Header */}
        <div className="admin-sec-header">
          <div className="admin-sec-icon-wrap">
            {isGranted ? (
              <AppIcon name="check" size={28} />
            ) : (
              <AppIcon name="adminPanelSettings" size={28} />
            )}
          </div>
          <span className="admin-sec-badge">
            <AppIcon name="security" size={11} />
            <span>Restricted Level 5 Clearance</span>
          </span>
          <h2 className="admin-sec-title">Admin Security Clearance</h2>
          <p className="admin-sec-subtitle">
            Enter the hardcoded Master Cipher Code or 4-digit Security PIN to unlock Administrator access.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="admin-sec-mode-tabs">
          <button
            type="button"
            className={`admin-sec-mode-tab${entryMode === 'pin' ? ' active' : ''}`}
            onClick={() => {
              setEntryMode('pin')
              setFeedback(null)
            }}
          >
            <AppIcon name="dialpad" size={13} />
            <span>4-Digit PIN Matrix</span>
          </button>
          <button
            type="button"
            className={`admin-sec-mode-tab${entryMode === 'cipher' ? ' active' : ''}`}
            onClick={() => {
              setEntryMode('cipher')
              setFeedback(null)
            }}
          >
            <AppIcon name="key" size={13} />
            <span>Master Cipher Key</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`admin-sec-feedback ${feedback.type}`} role="alert">
            <AppIcon
              name={feedback.type === 'success' ? 'check' : 'warningAmber'}
              size={14}
            />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* PIN Matrix Mode */}
        {entryMode === 'pin' ? (
          <>
            <div className="admin-sec-pin-display" aria-label="PIN Entry Slots">
              {[0, 1, 2, 3].map((slotIdx) => {
                const digit = pinDigits[slotIdx]
                const isFilled = Boolean(digit)
                return (
                  <div
                    key={slotIdx}
                    className={`admin-sec-pin-slot${isFilled ? ' filled' : ''}`}
                  >
                    {isFilled ? digit : '·'}
                  </div>
                )
              })}
            </div>

            <div className="admin-sec-keypad">
              {keypadButtons.map((btn) => {
                const isClear = btn === 'CLR'
                const isDel = btn === 'DEL'
                const isAction = isClear || isDel
                return (
                  <button
                    key={btn}
                    type="button"
                    className={`admin-sec-key${isAction ? ' action-key' : ''}${isClear ? ' clear' : ''}`}
                    onClick={() => handleKeypadPress(btn)}
                    disabled={isLoading || isGranted}
                  >
                    {isDel ? (
                      <AppIcon name="backspace" size={16} />
                    ) : (
                      btn
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="admin-sec-submit-btn"
              disabled={isLoading || isGranted || pinDigits.length < 4}
              onClick={() => handleVerifySubmission(pinDigits)}
            >
              {isLoading ? (
                <span className="admin-sec-spinner" />
              ) : isGranted ? (
                <>
                  <AppIcon name="check" size={16} />
                  <span>Access Granted</span>
                </>
              ) : (
                <>
                  <AppIcon name="vpnKey" size={16} />
                  <span>Verify Security PIN</span>
                </>
              )}
            </button>
          </>
        ) : (
          /* Master Cipher Mode */
          <div className="admin-sec-cipher-wrap">
            <div className="admin-sec-cipher-input-box">
              <input
                ref={cipherInputRef}
                type="text"
                className="admin-sec-cipher-input"
                placeholder="e.g. ALPHA-7789"
                value={cipherText}
                onChange={(e) => {
                  setCipherText(e.target.value.toUpperCase())
                  setFeedback(null)
                }}
                disabled={isLoading || isGranted}
                autoFocus
              />
            </div>

            <button
              type="button"
              className="admin-sec-submit-btn"
              style={{ marginTop: '14px' }}
              disabled={isLoading || isGranted || !cipherText.trim()}
              onClick={() => handleVerifySubmission(cipherText)}
            >
              {isLoading ? (
                <span className="admin-sec-spinner" />
              ) : isGranted ? (
                <>
                  <AppIcon name="check" size={16} />
                  <span>Access Granted</span>
                </>
              ) : (
                <>
                  <AppIcon name="vpnKey" size={16} />
                  <span>Authenticate Master Code</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer with Clue / Riddle Toggle */}
        <div className="admin-sec-footer">
          <span>Security Protocol: v2.2 ALPHA</span>
          <button
            type="button"
            className="admin-sec-hint-btn"
            onClick={() => setShowClue((prev) => !prev)}
          >
            <AppIcon name="help" size={13} />
            <span>{showClue ? 'Hide Hint' : 'Master Clue'}</span>
          </button>
        </div>

        {showClue && (
          <div className="admin-sec-hint-box">
            <span>
              🔒 Master Cipher: <code>ALPHA-7789</code> | Keypad PIN: <code>7789</code>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
