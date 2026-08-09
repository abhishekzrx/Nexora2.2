/**
 * feedbackStore
 * Global feedback system for Nexora.
 * Provides toast notifications and confirmation dialogs
 * for every CRUD action.
 *
 * Feedback types:
 * - success: ✅ Course Created, ✅ Subject Created, etc.
 * - warning: ⚠ Delete Course?, etc.
 * - error: ❌ Failed to create course
 *
 * Uses useSyncExternalStore for React integration.
 */

import { useSyncExternalStore } from 'react'

let listeners = []
let version = 0

let toasts = []
let confirmCallback = null

let snapshot = { toasts, confirmCallback }

function emit() {
  snapshot = { toasts, confirmCallback }
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot() {
  return snapshot
}

export function useFeedback() {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  return {
    ...store,
    showToast,
    showConfirm,
    dismissToast,
    dismissConfirm,
    confirmAction,
    cancelConfirm,
  }
}

export function showToast({ type = 'success', title = '', message = '', duration = 3000 }) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const toast = { id, type, title, message, createdAt: Date.now() }
  toasts = [...toasts, toast]
  emit()

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }

  return id
}

export function showConfirm({ title = 'Confirm', message = '', impact = [], onConfirm, onCancel }) {
  confirmCallback = { title, message, impact, onConfirm, onCancel }
  emit()
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function dismissConfirm() {
  confirmCallback = null
  emit()
}

export function confirmAction() {
  if (!confirmCallback) return
  const { onConfirm } = confirmCallback
  confirmCallback = null
  emit()
  if (onConfirm) onConfirm()
}

export function cancelConfirm() {
  if (!confirmCallback) return
  const { onCancel } = confirmCallback
  confirmCallback = null
  emit()
  if (onCancel) onCancel()
}
