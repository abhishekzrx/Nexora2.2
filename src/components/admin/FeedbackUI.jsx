/**
 * FeedbackUI
 * Global feedback overlay with toast notifications and confirmation dialogs.
 */
import { useEffect, useRef } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { useFeedback } from '../../data/feedbackStore'

const TOAST_ICON = {
  success: 'check',
  warning: 'warning',
  error: 'cross',
  info: 'centerBook',
}

function FeedbackUI() {
  const { toasts, confirmCallback, dismissToast, confirmAction, cancelConfirm } = useFeedback()
  const toastListRef = useRef(null)

  useEffect(() => {
    if (toastListRef.current) {
      toastListRef.current.scrollTop = toastListRef.current.scrollHeight
    }
  }, [toasts.length])

  return (
    <>
      {/* ── Toast Notifications ───────────────────────────────── */}
      <div className="admin-feedback-toast-wrap" ref={toastListRef}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`admin-feedback-toast admin-feedback-toast-${toast.type}`}>
            <span className="admin-feedback-toast-icon">
              <AppIcon name={TOAST_ICON[toast.type] || 'check'} size={18} />
            </span>
            <div className="admin-feedback-toast-body">
              {toast.title ? <span className="admin-feedback-toast-title">{toast.title}</span> : null}
              {toast.message ? <span className="admin-feedback-toast-message">{toast.message}</span> : null}
            </div>
            <button
              type="button"
              className="admin-feedback-toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <AppIcon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Confirmation Dialog ──────────────────────────────── */}
      {confirmCallback ? (
        <div className="admin-feedback-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelConfirm() }}>
          <div className="admin-feedback-confirm">
            <div className="admin-feedback-confirm-icon">
              <AppIcon name="warning" size={28} />
            </div>
            <h3 className="admin-feedback-confirm-title">{confirmCallback.title}</h3>
            <p className="admin-feedback-confirm-message">{confirmCallback.message}</p>

            {confirmCallback.impact && confirmCallback.impact.length > 0 ? (
              <div className="admin-feedback-confirm-impact">
                {confirmCallback.impact.map((item, idx) => (
                  <span key={idx} className="admin-feedback-confirm-chip">
                    <AppIcon name={item.icon || 'warning'} size={14} />
                    {item.label}: <strong>{item.value}</strong>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="admin-feedback-confirm-actions">
              <Button variant="secondary" onClick={cancelConfirm}>Cancel</Button>
              <Button variant="danger" onClick={confirmAction}>Confirm</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default FeedbackUI
