/**
 * InjectionStatusCard
 * Pure presentational UI component for rendering the compact Injection Status Card.
 *
 * Responsibilities:
 * - Displays Chapter Name & Chapter Description
 * - Renders editable JSON textarea with paste, drag/drop, and file picker support
 * - Shows validation state: empty / valid / invalid with item count
 * - Renders dynamic Inject / Retry button
 */

import { useRef, useCallback } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'

export default function InjectionStatusCard({
  chapterName = 'Selected Chapter',
  chapterDescription = '',
  injectionType = 'MCQs',
  jsonText = '',
  onJsonChange,
  jsonStatus = 'empty',
  jsonError = null,
  jsonItemCount = 0,
  status = 'idle',
  error: _error = null,
  result: _result = null,
  onInject,
  onClearJson,
}) {
  const textareaRef = useRef(null)

  const isInjecting = status === 'injecting'
  const isSuccess = status === 'success'
  const isError = status === 'error'
  const isReady = status === 'ready'

  const borderClass = jsonStatus === 'valid'
    ? 'status-valid'
    : jsonStatus === 'invalid'
    ? 'status-invalid'
    : isSuccess
    ? 'status-success'
    : isError
    ? 'status-error'
    : isInjecting
    ? 'status-injecting'
    : isReady
    ? 'status-ready'
    : 'status-idle'

  const handleTextareaChange = useCallback(
    (e) => {
      if (onJsonChange) onJsonChange(e.target.value)
    },
    [onJsonChange],
  )

  const handleClear = useCallback(() => {
    if (onClearJson) onClearJson()
    textareaRef.current?.focus()
  }, [onClearJson])

  return (
    <div className="injection-status-card">
      {/* Card Header */}
      <div className="status-card-header">
        <div className="chapter-title-block">
          <span className="chapter-title-label">Target Chapter</span>
          <h3 className="chapter-title-text">{chapterName}</h3>
          {chapterDescription && (
            <span className="chapter-desc-text">{chapterDescription}</span>
          )}
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

      {/* Payload & Status Area */}
      <div className={`payload-container ${borderClass}`}>
        {/* Status Header Badge Bar */}
        <div className="payload-status-bar">
          {isSuccess && (
            <div className="status-indicator success">
              <AppIcon name="check" size={16} className="status-icon success-icon" />
              <span>Injection Confirmed</span>
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
              <span>Payload Ready ({jsonItemCount} {injectionType})</span>
            </div>
          )}

          {jsonStatus === 'valid' && !isReady && !isSuccess && (
            <div className="status-indicator valid">
              <AppIcon name="check" size={16} />
              <span>Valid JSON — {jsonItemCount} {injectionType} detected</span>
            </div>
          )}

          {jsonStatus === 'invalid' && !isSuccess && !isReady && (
            <div className="status-indicator invalid">
              <AppIcon name="close" size={16} />
              <span>Invalid JSON — {jsonError || 'Please provide valid JSON.'}</span>
            </div>
          )}

          {jsonStatus === 'empty' && !isSuccess && !isError && !isReady && (
            <div className="status-indicator idle">
              <AppIcon name="help" size={16} />
              <span>Paste JSON here or drop a JSON file</span>
            </div>
          )}
        </div>

        {/* JSON Input Area */}
        <div className="json-input-area">
          <textarea
            ref={textareaRef}
            className="json-textarea"
            placeholder="Paste JSON here or drop a JSON file..."
            value={jsonText}
            onChange={handleTextareaChange}
            spellCheck={false}
          />

          <div className="json-input-actions">
            {jsonText && (
              <button
                type="button"
                className="json-action-btn json-clear-btn"
                onClick={handleClear}
                title="Clear JSON"
              >
                <AppIcon name="close" size={15} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Inject Button */}
      <div className="status-card-footer">
        <Button
          variant="primary"
          size="lg"
          disabled={isInjecting || isSuccess || (jsonStatus !== 'valid' && !isError)}
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
