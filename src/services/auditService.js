/**
 * auditService.js
 * Comprehensive Production Admin Audit Log Engine.
 *
 * Tracks:
 * - IDENTITY_CHANGE (Warrior Name, Public User ID)
 * - COURSE_ACCESS_GRANTED / COURSE_ACCESS_REVOKED
 * - SUBJECT_PERMISSION_CHANGED
 * - CONTENT_PERMISSION_CHANGED
 * - MEMBER_ACTIVATED / MEMBER_DISABLED / MEMBER_ARCHIVED / MEMBER_RESTORED
 * - ROLE_CHANGED
 * - MEMBER_CREATED
 */

import { apiService } from './apiService.js'

const AUDIT_STORAGE_KEY = 'nexora_admin_audit_logs_v2'

const memoryAuditLogs = []

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return null
}

function setStorageItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // ignore
  }
}

export const auditService = {
  /**
   * Records an immutable admin audit log entry.
   */
  async logAction({
    adminUserId = 'adminalpha',
    actionType,
    targetUserId,
    targetResource = 'MEMBER_PROFILE',
    oldValue = null,
    newValue = null,
    reason = '',
  }) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      admin_user_id: adminUserId,
      action_type: actionType,
      target_user_id: targetUserId,
      target_resource: targetResource,
      old_value: oldValue,
      new_value: newValue,
      reason,
      created_at: new Date().toISOString(),
    }

    memoryAuditLogs.unshift(entry)

    // 1. Try Supabase insert
    try {
      await apiService.post('/admin_audit_logs', [entry])
    } catch {
      // fallback
    }

    // 2. Persistent local cache
    try {
      const saved = getStorageItem(AUDIT_STORAGE_KEY)
      const list = saved ? JSON.parse(saved) : []
      list.unshift(entry)
      setStorageItem(AUDIT_STORAGE_KEY, JSON.stringify(list.slice(0, 500)))
    } catch {
      // ignore
    }

    return entry
  },

  /**
   * Retrieves audit logs with optional filtering.
   */
  async getAuditLogs(filter = {}) {
    let logs = []

    // 1. Try Supabase
    try {
      let query = '?order=created_at.desc'
      if (filter.targetUserId) {
        query += `&target_user_id=eq.${encodeURIComponent(filter.targetUserId)}`
      }
      if (filter.actionType) {
        query += `&action_type=eq.${encodeURIComponent(filter.actionType)}`
      }

      const res = await apiService.get(`/admin_audit_logs${query}`)
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        logs = res.data
      }
    } catch {
      // fallback
    }

    if (logs.length === 0) {
      try {
        const saved = getStorageItem(AUDIT_STORAGE_KEY)
        if (saved) {
          const list = JSON.parse(saved)
          if (Array.isArray(list)) logs = list
        }
      } catch {
        // ignore
      }
    }

    if (logs.length === 0 && memoryAuditLogs.length > 0) {
      logs = [...memoryAuditLogs]
    }

    // Apply in-memory filters if needed
    if (filter.targetUserId) {
      logs = logs.filter((l) => l.target_user_id === filter.targetUserId)
    }
    if (filter.actionType) {
      logs = logs.filter((l) => l.action_type === filter.actionType)
    }

    return logs
  },
}
