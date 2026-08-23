/**
 * InjectionStatusCard
 * Compact, single-window presentation UI for JSON Payload Injection & Validation.
 */

import { useRef, useCallback, useState } from 'react'
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
  showPyqSection = false,
  matchedPYQs = [],
  bpscValidationResult = null,
  onRegenerateFailed = null,
  onAutoFix = null,
}) {
  const textareaRef = useRef(null)
  const [showPyqList, setShowPyqList] = useState(false)
  const [showIssuesDetail, setShowIssuesDetail] = useState(false)

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
    <div className="injection-status-card smart-compact">
      {/* Card Header Strip */}
      <div className="status-card-header-compact">
        <div className="chapter-meta-chip" title={chapterName}>
          <AppIcon name="chapters" size={14} className="meta-icon" />
          <span className="chapter-name-text">{chapterName}</span>
        </div>

        <div className="header-right-actions">
          {showPyqSection && matchedPYQs.length > 0 && (
            <button
              type="button"
              className="pyq-toggle-chip"
              onClick={() => setShowPyqList((prev) => !prev)}
              title="Toggle PYQ List"
            >
              <AppIcon name="target" size={13} />
              <span>⭐ {matchedPYQs.length} PYQs</span>
              <AppIcon name={showPyqList ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} />
            </button>
          )}

          <span className={`injection-type-pill ${injectionType.toLowerCase()}`}>
            <AppIcon name={injectionType === 'MCQs' ? "mcqs" : "flashcardsTab"} size={13} />
            {injectionType}
          </span>
        </div>
      </div>

      {/* Expandable PYQ Drawer */}
      {showPyqSection && matchedPYQs.length > 0 && showPyqList && (
        <div className="pyq-compact-drawer">
          <div className="pyq-compact-header">
            <span>Verified Post-68th BPSC PYQs</span>
            <button type="button" className="pyq-close-btn" onClick={() => setShowPyqList(false)}>
              <AppIcon name="close" size={12} />
            </button>
          </div>
          <div className="pyq-compact-list">
            {matchedPYQs.map((pyq, idx) => (
              <div key={idx} className="pyq-compact-item">
                <span className="pyq-badge">{pyq.exam_year}</span>
                <span className="pyq-qno">Q{pyq.question_number}</span>
                <span className="pyq-topic">{pyq.topic} — {pyq.subtopic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation / Diagnostic Bar */}
      {bpscValidationResult && bpscValidationResult.total > 0 && (
        <>
          <div
            className={`bpsc-compact-ribbon ${bpscValidationResult.ok ? 'passed' : 'warning'}`}
          >
            <div className="ribbon-text">
              <AppIcon name={bpscValidationResult.ok ? "check" : "warning"} size={14} />
              <span>
                <strong>{bpscValidationResult.ok ? 'BPSC 15-Check Passed' : 'BPSC Validation Issue'}:</strong> {bpscValidationResult.summary}
              </span>
            </div>

            <div className="ribbon-actions-group">
              {bpscValidationResult.invalidCount > 0 && (
                <>
                  <button
                    type="button"
                    className="view-issues-btn"
                    onClick={() => setShowIssuesDetail((prev) => !prev)}
                    title="Inspect why questions failed validation"
                  >
                    <AppIcon name="info" size={12} />
                    {showIssuesDetail ? 'Hide Issues' : `Inspect ${bpscValidationResult.invalidCount} Issue${bpscValidationResult.invalidCount > 1 ? 's' : ''}`}
                  </button>

                  {onAutoFix && (
                    <button
                      type="button"
                      className="autofix-btn"
                      onClick={onAutoFix}
                      title="Auto-fix Option E and clean formatting across all MCQs"
                    >
                      <AppIcon name="flash" size={12} /> Auto-Fix All
                    </button>
                  )}

                  {onRegenerateFailed && (
                    <button
                      type="button"
                      className="regen-failed-btn"
                      onClick={onRegenerateFailed}
                      title="Copy prompt for only failed questions"
                    >
                      <AppIcon name="replay" size={12} /> Regenerate {bpscValidationResult.invalidCount} Failed
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Expandable Issues Inspection Drawer */}
          {bpscValidationResult.invalidCount > 0 && showIssuesDetail && (
            <div className="validation-issues-drawer">
              <div className="issues-drawer-header">
                <span>Validation Failure Breakdown ({bpscValidationResult.failedItems?.length || 0} Questions)</span>
                <button type="button" className="pyq-close-btn" onClick={() => setShowIssuesDetail(false)}>
                  <AppIcon name="close" size={12} />
                </button>
              </div>
              <div className="issues-drawer-list">
                {(bpscValidationResult.failedItems || []).map((item, idx) => (
                  <div key={idx} className="issue-item-row">
                    <span className="issue-item-badge">MCQ #{item.index}</span>
                    <div className="issue-item-details">
                      <div className="issue-q-stem">"{item.validation?.questionSummary}"</div>
                      <div className="issue-reasons-list">
                        {(item.validation?.issues || []).map((iss, i) => (
                          <span key={i} className="issue-reason-pill">⚠️ {iss}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Status Bar */}
      <div className="compact-status-bar">
        {isSuccess ? (
          <span className="status-tag success"><AppIcon name="check" size={13} /> Injected Successfully</span>
        ) : isError ? (
          <span className="status-tag error"><AppIcon name="close" size={13} /> Injection Failed</span>
        ) : isInjecting ? (
          <span className="status-tag injecting"><div className="status-spinner-sm" /> Processing Injection...</span>
        ) : isReady || jsonStatus === 'valid' ? (
          <span className="status-tag ready"><AppIcon name="check" size={13} /> Ready: {jsonItemCount} {injectionType}</span>
        ) : jsonStatus === 'invalid' ? (
          <span className="status-tag invalid" title={jsonError}><AppIcon name="close" size={13} /> Invalid JSON: {jsonError}</span>
        ) : (
          <span className="status-tag idle"><AppIcon name="document" size={13} /> Paste JSON below</span>
        )}

        {jsonText && (
          <button
            type="button"
            className="clear-json-link"
            onClick={handleClear}
            title="Clear JSON Editor"
          >
            <AppIcon name="close" size={12} /> Clear
          </button>
        )}
      </div>

      {/* JSON Editor Container */}
      <div className={`json-editor-shell ${borderClass}`}>
        <textarea
          ref={textareaRef}
          className="json-code-textarea"
          placeholder='Paste JSON here (e.g. [{"question": "...", "options": {...}, "correct": "A", "explanation": "..."}])'
          value={jsonText}
          onChange={handleTextareaChange}
          spellCheck={false}
        />
      </div>

      {/* Action Footer */}
      <div className="status-card-footer-compact">
        <Button
          variant="primary"
          size="md"
          disabled={isInjecting || isSuccess || (jsonStatus !== 'valid' && !isError)}
          onClick={onInject}
          className={`inject-btn-compact ${isError ? 'retry-mode' : isSuccess ? 'success-mode' : ''}`}
        >
          {isInjecting ? (
            <>
              <div className="btn-spinner" /> Injecting...
            </>
          ) : isError ? (
            <>
              <AppIcon name="replay" size={15} /> Retry Injection
            </>
          ) : isSuccess ? (
            <>
              <AppIcon name="check" size={15} /> Injected Successfully
            </>
          ) : (
            <>
              <AppIcon name="add" size={15} /> Inject {jsonItemCount > 0 ? `${jsonItemCount} ` : ''}{injectionType}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
