/**
 * identityService.js
 * Production-Ready Warrior Identity & Public User ID Management System.
 *
 * Core Principles:
 * 1. auth.users.id (Internal UUID) is immutable and anchors all foreign keys and analytics.
 * 2. Public Identity (public_user_id & warrior_name) can be managed/changed by Super Admin.
 * 3. All Public User IDs (e.g. NEX-WAR-001) and Warrior Names (e.g. IRONPHOENIX) must be unique.
 * 4. All identity manipulations are recorded in an audit log.
 */

import { apiService } from './apiService.js'

export const WARRIOR_TITLES = [
  'APEXALPHA',
  'IRONPHOENIX',
  'SHADOWWOLF',
  'STORMRIDER',
  'FIRETITAN',
  'NIGHTHAWK',
  'THUNDERFANG',
  'BLAZELION',
  'FROSTDRAGON',
  'CYBERSHARK',
  'VALKYRIE',
  'TITANSLAYER',
  'VIPERSTRIKE',
  'GHOSTREAPER',
  'COSMICBLADE',
  'SOLARFLARE',
  'PHANTOMKNIGHT',
  'STEELHAWK',
  'WARVORTEX',
  'NEONHUNTER',
  'CHRONOGUARD',
  'VOIDWALKER',
  'DARKFALCON',
  'AURORAKNIGHT',
  'ZENITHWARRIOR',
]

const IDENTITY_AUDIT_STORAGE_KEY = 'nexora_identity_audit_logs'

let memoryAuditLogs = []

export const identityService = {
  /**
   * Generates next available Public User ID (e.g. NEX-WAR-006).
   */
  generatePublicId(existingMembers = []) {
    const existingNumbers = existingMembers
      .map((m) => {
        const match = String(m.public_user_id || m.publicId || '').match(/NEX-WAR-(\d+)/i)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n) => n > 0)

    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    return `NEX-WAR-${String(nextNum).padStart(3, '0')}`
  },

  /**
   * Generates a random unused Warrior Name from the registry.
   */
  generateWarriorName(existingMembers = []) {
    const usedNames = new Set(
      existingMembers.map((m) => String(m.warrior_name || m.warriorName || '').trim().toUpperCase())
    )

    const available = WARRIOR_TITLES.filter((t) => !usedNames.has(t))
    if (available.length > 0) {
      const idx = Math.floor(Math.random() * available.length)
      return available[idx]
    }

    // Fallback if all titles taken: append random suffix
    const base = WARRIOR_TITLES[Math.floor(Math.random() * WARRIOR_TITLES.length)]
    return `${base}_${Math.floor(100 + Math.random() * 900)}`
  },

  /**
   * Validates format and uniqueness of Public User ID.
   */
  validatePublicId(publicId, currentMemberId, existingMembers = []) {
    if (!publicId || typeof publicId !== 'string') {
      return { valid: false, error: 'Public User ID is required.' }
    }

    const clean = publicId.trim().toUpperCase()
    if (!/^NEX-WAR-\d{3,}$/i.test(clean)) {
      return { valid: false, error: 'Public User ID must follow format NEX-WAR-XXX (e.g. NEX-WAR-001).' }
    }

    const duplicate = existingMembers.find(
      (m) => String(m.public_user_id || m.publicId).toUpperCase() === clean && m.id !== currentMemberId
    )

    if (duplicate) {
      return { valid: false, error: `Public User ID "${clean}" is already assigned to ${duplicate.display_name || duplicate.name || 'another member'}.` }
    }

    return { valid: true, cleanId: clean }
  },

  /**
   * Validates format and uniqueness of Warrior Name.
   */
  validateWarriorName(warriorName, currentMemberId, existingMembers = []) {
    if (!warriorName || typeof warriorName !== 'string') {
      return { valid: false, error: 'Warrior Name is required.' }
    }

    const clean = warriorName.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (clean.length < 3 || clean.length > 30) {
      return { valid: false, error: 'Warrior Name must be between 3 and 30 alphanumeric characters.' }
    }

    const duplicate = existingMembers.find(
      (m) => String(m.warrior_name || m.warriorName).toUpperCase() === clean && m.id !== currentMemberId
    )

    if (duplicate) {
      return { valid: false, error: `Warrior Name "${clean}" is already taken by ${duplicate.display_name || duplicate.name || 'another member'}.` }
    }

    return { valid: true, cleanName: clean }
  },

  /**
   * Records an audit log for public identity changes.
   */
  async logIdentityChange({
    internalUserId,
    oldPublicId,
    newPublicId,
    oldWarriorName,
    newWarriorName,
    changedBy = 'adminalpha',
    reason = 'Super Admin Identity Reassignment',
  }) {
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      internal_user_id: internalUserId,
      old_public_id: oldPublicId,
      new_public_id: newPublicId,
      old_warrior_name: oldWarriorName,
      new_warrior_name: newWarriorName,
      changed_by: changedBy,
      reason,
      created_at: new Date().toISOString(),
    }

    // In-memory record
    memoryAuditLogs.unshift(entry)

    // 1. Try Supabase audit log table
    try {
      await apiService.post('/identity_audit_logs', [entry])
    } catch {
      // ignore network errors
    }

    // 2. Persistent localStorage audit cache if available
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(IDENTITY_AUDIT_STORAGE_KEY)
        const list = saved ? JSON.parse(saved) : []
        list.unshift(entry)
        localStorage.setItem(IDENTITY_AUDIT_STORAGE_KEY, JSON.stringify(list.slice(0, 200)))
      }
    } catch {
      // ignore
    }

    return entry
  },

  /**
   * Retrieves identity audit logs.
   */
  async getIdentityAuditLogs(internalUserId = null) {
    let logs = []
    try {
      const query = internalUserId ? `?internal_user_id=eq.${encodeURIComponent(internalUserId)}` : ''
      const res = await apiService.get(`/identity_audit_logs${query}`)
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        logs = res.data
      }
    } catch {
      // fallback
    }

    if (logs.length === 0) {
      try {
        if (typeof localStorage !== 'undefined') {
          const cached = localStorage.getItem(IDENTITY_AUDIT_STORAGE_KEY)
          if (cached) {
            const list = JSON.parse(cached)
            logs = internalUserId ? list.filter((l) => l.internal_user_id === internalUserId) : list
          }
        }
      } catch {
        // ignore
      }
    }

    if (logs.length === 0 && memoryAuditLogs.length > 0) {
      logs = internalUserId ? memoryAuditLogs.filter((l) => l.internal_user_id === internalUserId) : memoryAuditLogs
    }

    return logs
  },
}
