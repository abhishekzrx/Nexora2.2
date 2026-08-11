/**
 * InjectionStatusCard
 * Pure presentational UI component for rendering the compact Injection Status Card.
 *
 * Responsibilities:
 * - Displays Chapter Name & Injection Type badge (MCQs vs Flashcards)
 * - Renders Payload Preview container with semantic status borders (Neutral, Green, Red)
 * - Accepts JSON via paste in the payload area
 * - Renders dynamic Inject / Retry button with double-click protection
 *
 * All state management, context tracking, and backend injection logic
 * are handled by the parent container component.
 */

import { useState, useRef, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'

export default function InjectionStatusCard({
  chapterName = 'Selected Chapter',
  injectionType = 'MCQs',
  payload = null,
  status = 'idle',
  error = null,
  result = null,
  onInject,
  jsonError = null,
  onPaste,
}) {
  const [isFocused, setIsFocused] = useState(false)
  const hiddenTextareaRef = useRef(null)

  const isInjecting = status === 'injecting'
  const isSuccess = status === 'success'
  const isError = status === 'error'
  const isReady = status === 'ready'
  const isIdle = status === 'idle'

  const itemCount = useMemoPayloadCount(payload)

  const borderClass = isSuccess
    ? 'status-success'
    : isError
    ? 'status-error'
    : isInjecting
    ? 'status-injecting'
    : isReady
    ? 'status-ready'
    : 'status-idle'

  const focusPasteArea = useCallback(() => {
    hiddenTextareaRef.current?.focus()
  }, [])

  const handleTextareaPaste = useCallback(
    (e) => {
      if (onPaste) onPaste(e)
    },
    [onPaste],
  )

  const handleBoxFocus = useCallback(() => setIsFocused(true), [])
  const handleBoxBlur = useCallback(() => setIsFocused(false), [])

  const handleTextareaFocus = useCallback(() => setIsFocused(true), [])
  const handleTextareaBlur = useCallback(() => setIsFocused(false), [])

  return (
    <div className="injection-status-card">
      {/* ── Card Header: Chapter Title & Type Badge ── */}
      <div className="status-card-header">
        <div className="chapter-title-block">
          <span className="chapter-title-label">Target Chapter</span>
          <h3 className="chapter-title-text">{chapterName}</h3>
        </div>
        <span className={`injection-type-badge ${injectionType.toLowerCase()}`}>
          {injectionType === 'MCQs' ? (
            <>
              <AppIcon name="mcqs" size={14} /> MCQs
            </>
          ) : (
            <>
              <AppIcon name="flashcardsTab" size={14} /> Flashcards
            </>
          )}
        </span>
      </div>

      {/* ── Payload & Status Area ── */}
      <div className={`payload-container ${borderClass} ${isFocused ? 'focused' : ''}`}>
        {/* Status Header Badge Bar */}
        <div className="payload-status-bar">
          {isSuccess && (
            <div className="status-indicator success">
              <AppIcon name="check" size={16} className="status-icon success-icon" />
              <span>Injection Confirmed (Backend Success)</span>
            </div>
          )}

          {isError && (
            <div className="status-indicator error">
              <AppIcon name="close" size={16} className="status-icon error-icon" />
              <span>Injection Failed</span>
            </div>
          )}

          {isInjecting && (
            <div className="status-indicator injecting">
              <div className="status-spinner" />
              <span>Processing Injection Request...</span>
            </div>
          )}

          {isReady && (
            <div className="status-indicator ready">
              <AppIcon name="document" size={16} />
              <span>Payload Ready ({itemCount} {injectionType})</span>
            </div>
          )}

          {isIdle && (
            <div className="status-indicator idle">
              <AppIcon name="help" size={16} />
              <span>Paste JSON to prepare payload for injection.</span>
            </div>
          )}
        </div>

        {/* Hidden textarea for reliable paste capture */}
        <textarea
          ref={hiddenTextareaRef}
          className="hidden-paste-textarea"
          onPaste={handleTextareaPaste}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          readOnly
        />

        {/* Payload Preview Content Box */}
        <div
          className="payload-content-box"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault()
            focusPasteArea()
          }}
          onFocus={handleBoxFocus}
          onBlur={handleBoxBlur}
        >
          {isSuccess && (
            <div className="success-result-message">
              <AppIcon name="check" size={24} className="big-success-icon" />
              <div className="message-text">
                <strong>Successfully Injected!</strong>
                <p>
                  Injected {result?.imported ?? itemCount} {injectionType} into "{chapterName}". Course store & metrics updated.
                </p>
              </div>
            </div>
          )}

          {isError && (
            <div className="error-result-message">
              <AppIcon name="close" size={24} className="big-error-icon" />
              <div className="message-text">
                <strong>Injection Error</strong>
                <p>{error || 'Backend injection failed. Payload preserved for retry.'}</p>
              </div>
            </div>
          )}

          {!isSuccess && !isError && (
            <div className="payload-json-snippet">
              {payload ? (
                <pre className="compact-json-text">
                  {typeof payload === 'string'
                    ? payload
                    : JSON.stringify(payload, null, 2).slice(0, 450) + (JSON.stringify(payload).length > 450 ? '...\n}' : '')}
                </pre>
              ) : (
                <div className="empty-payload-placeholder">
                  <AppIcon name="clipboard" size={28} style={{ color: '#667085', marginBottom: 6 }} />
                  <p>Paste JSON here</p>
                  {jsonError && <p className="json-error-text">{jsonError}</p>}
                </div>
              )}
              {jsonError && payload && <p className="json-error-text">{jsonError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Card Footer: Inject / Retry Button ── */}
      <div className="status-card-footer">
        <Button
          variant="primary"
          size="lg"
          disabled={isInjecting || isIdle || (!payload && !isError)}
          onClick={onInject}
          className={`inject-action-btn ${isError ? 'retry-mode' : isSuccess ? 'success-mode' : ''}`}
        >
          {isInjecting ? (
            <>
              <div className="btn-spinner" /> Injecting...
            </>
          ) : isError ? (
            <>
              <AppIcon name="add" size={18} /> Retry Injection
            </>
          ) : isSuccess ? (
            <>
              <AppIcon name="check" size={18} /> Injected Successfully
            </>
          ) : (
            <>
              <AppIcon name="add" size={18} /> Inject {injectionType}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function useMemoPayloadCount(payload) {
  if (!payload) return 0
  if (Array.isArray(payload)) return payload.length
  if (typeof payload === 'object') {
    if (Array.isArray(payload.mcqs)) return payload.mcqs.length
    if (Array.isArray(payload.flashcards)) return payload.flashcards.length
  }
  return 1
}

