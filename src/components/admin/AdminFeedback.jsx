/**
 * AdminFeedback
 * Centralized notification system for the Admin Panel.
 * Provides a Material Design Toast/Snackbar with Success, Warning,
 * Error and Information variants.
 *
 * Usage:
 *   const feedback = useAdminFeedback()
 *   feedback.success('Course created successfully')
 *   feedback.warning('Delete this Course?')
 *   feedback.error('Import failed.')
 *   feedback.info('Action completed')
 *
 * Wrap the Admin module with <AdminFeedbackProvider>.
 */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import AppIcon from '../ui/AppIcon'

const FeedbackContext = createContext(null)

// ── Toast item ────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: 'check',
    warning: 'warning',
    error: 'cross',
    info: 'lightbulb',
  }

  return (
    <div className={`admin-toast admin-toast-${toast.variant}`} role="status">
      <span className="admin-toast-icon" aria-hidden="true">
        <AppIcon name={icons[toast.variant] || 'lightbulb'} size={15} />
      </span>
      <span className="admin-toast-message">{toast.message}</span>
      <button type="button" className="admin-toast-close" onClick={onDismiss} aria-label="Dismiss">
        <AppIcon name="close" size={13} />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────
export function AdminFeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const push = useCallback((variant, message, duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((cur) => [...cur, { id, variant, message }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const value = {
    success: (msg) => push('success', msg),
    warning: (msg) => push('warning', msg, 5000),
    error: (msg) => push('error', msg, 5000),
    info: (msg) => push('info', msg),
    dismiss,
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="admin-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAdminFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useAdminFeedback must be used within <AdminFeedbackProvider>')
  }
  return ctx
}

export default AdminFeedbackProvider