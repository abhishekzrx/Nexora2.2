/**
 * memberService.js
 * Production-Ready Member & Profile Management Service.
 *
 * Hardened Features:
 * 1. Soft Delete / Archival: ACTIVE, DISABLED, ARCHIVED states (historical data preserved).
 * 2. Super Admin Lockout Protection: Primary adminalpha & last active Super Admin cannot be disabled/archived/deleted.
 * 3. Comprehensive Admin Audit Logging via auditService.
 * 4. Database-level Warrior Identity & Public ID conflict handling.
 * 5. Supabase persistence with resilient memory + local caching.
 */

import { apiService } from './apiService.js'
import { identityService } from './identityService.js'
import { auditService } from './auditService.js'

const MEMBERS_CACHE_KEY = 'nexora_members_directory_v2'

export const SEED_MEMBERS = [
  {
    id: 'usr_super_admin_alpha',
    username: 'adminalpha',
    public_user_id: 'NEX-WAR-000',
    warrior_name: 'APEXALPHA',
    display_name: 'Super Admin',
    email: 'adminalpha@nexora.io',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    assigned_courses: ['*'], // Access to all courses
    permissions: {
      all_courses: true,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_01_rahul',
    username: 'MEMBER01',
    public_user_id: 'NEX-WAR-001',
    warrior_name: 'IRONPHOENIX',
    display_name: 'Rahul',
    email: 'rahul@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: ['bpsc_prelims', 'bpsc_cs'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_02_priya',
    username: 'MEMBER02',
    public_user_id: 'NEX-WAR-002',
    warrior_name: 'SHADOWWOLF',
    display_name: 'Priya',
    email: 'priya@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: ['bpsc_prelims'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-16T00:00:00.000Z',
    updated_at: '2026-01-16T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_03_amit',
    username: 'MEMBER03',
    public_user_id: 'NEX-WAR-003',
    warrior_name: 'STORMRIDER',
    display_name: 'Amit',
    email: 'amit@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: ['bpsc_cs'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-17T00:00:00.000Z',
    updated_at: '2026-01-17T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_04_sneha',
    username: 'MEMBER04',
    public_user_id: 'NEX-WAR-004',
    warrior_name: 'FIRETITAN',
    display_name: 'Sneha',
    email: 'sneha@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: ['bpsc_prelims'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-18T00:00:00.000Z',
    updated_at: '2026-01-18T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_05_rohan',
    username: 'MEMBER05',
    public_user_id: 'NEX-WAR-005',
    warrior_name: 'NIGHTHAWK',
    display_name: 'Rohan',
    email: 'rohan@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: ['bpsc_cs'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-01-19T00:00:00.000Z',
    updated_at: '2026-01-19T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
]

let memoryMembers = [...SEED_MEMBERS]

function getLocalMembers() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(MEMBERS_CACHE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryMembers = parsed
          return parsed
        }
      }
    }
  } catch {
    // ignore
  }

  saveLocalMembers(memoryMembers)
  return memoryMembers
}

function saveLocalMembers(members) {
  memoryMembers = [...members]
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(members))
    }
  } catch {
    // ignore
  }
}

export const memberService = {
  /**
   * Retrieves all member profiles (includes active and disabled, optionally includes archived).
   */
  async getAllMembers(includeArchived = true) {
    // 1. Try fetching from Supabase user_profiles table
    try {
      const res = await apiService.get('/user_profiles?order=created_at.asc')
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        saveLocalMembers(res.data)
        const list = res.data
        return { success: true, data: includeArchived ? list : list.filter((m) => m.status !== 'ARCHIVED') }
      }
    } catch {
      // fallback
    }

    // 2. Return cached / seeded members
    const local = getLocalMembers()
    return { success: true, data: includeArchived ? local : local.filter((m) => m.status !== 'ARCHIVED') }
  },

  /**
   * Retrieves single member profile by internal UUID or username.
   */
  async getMemberById(idOrUsername) {
    if (!idOrUsername) return { success: false, error: 'User ID or username required.' }

    const clean = String(idOrUsername).trim().toLowerCase()
    const all = getLocalMembers()
    const found = all.find(
      (m) =>
        m.id === idOrUsername ||
        String(m.username).toLowerCase() === clean ||
        String(m.public_user_id).toLowerCase() === clean ||
        String(m.warrior_name).toLowerCase() === clean
    )

    if (found) return { success: true, data: found }
    return { success: false, error: `Member "${idOrUsername}" not found.` }
  },

  /**
   * Creates a new member profile (Unlimited members supported).
   */
  async createMember({
    username,
    display_name,
    email,
    assigned_courses = [],
    role = 'MEMBER',
    status = 'ACTIVE',
    custom_public_id = null,
    custom_warrior_name = null,
    adminUserId = 'adminalpha',
  }) {
    const all = getLocalMembers()

    // Validate username uniqueness
    const cleanUsername = String(username || '').trim().toUpperCase()
    if (!cleanUsername) {
      return { success: false, error: 'Username is required.' }
    }

    if (all.some((m) => String(m.username).toUpperCase() === cleanUsername)) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` }
    }

    // Validate or generate Public ID
    let publicId = custom_public_id
    if (!publicId) {
      publicId = identityService.generatePublicId(all)
    } else {
      const val = identityService.validatePublicId(publicId, null, all)
      if (!val.valid) return { success: false, error: val.error }
      publicId = val.cleanId
    }

    // Validate or generate Warrior Name
    let warriorName = custom_warrior_name
    if (!warriorName) {
      warriorName = identityService.generateWarriorName(all)
    } else {
      const val = identityService.validateWarriorName(warriorName, null, all)
      if (!val.valid) return { success: false, error: val.error }
      warriorName = val.cleanName
    }

    const newMember = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      username: cleanUsername,
      public_user_id: publicId,
      warrior_name: warriorName,
      display_name: display_name || cleanUsername,
      email: email || `${cleanUsername.toLowerCase()}@student.nexora.io`,
      role,
      status,
      assigned_courses: Array.isArray(assigned_courses) ? assigned_courses : [],
      permissions: {
        all_courses: role === 'SUPER_ADMIN',
        subject_overrides: {},
        content_overrides: {},
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    }

    // Try Supabase insert
    try {
      await apiService.post('/user_profiles', [newMember])
    } catch {
      // fallback
    }

    const updatedList = [...all, newMember]
    saveLocalMembers(updatedList)

    // Audit Log
    await auditService.logAction({
      adminUserId,
      actionType: 'MEMBER_CREATED',
      targetUserId: newMember.id,
      newValue: `${newMember.display_name} (${newMember.warrior_name} • ${newMember.public_user_id})`,
      reason: 'New member registration',
    })

    return { success: true, data: newMember }
  },

  /**
   * Updates an existing member profile (courses, display name, permissions).
   */
  async updateMember(memberId, updates, adminUserId = 'adminalpha') {
    if (!memberId) return { success: false, error: 'Member ID required.' }

    const all = getLocalMembers()
    const index = all.findIndex((m) => m.id === memberId)
    if (index === -1) {
      return { success: false, error: `Member with ID "${memberId}" not found.` }
    }

    const existing = all[index]

    // Lockout Protection: Primary adminalpha & last active Super Admin cannot be stripped/deactivated
    if (existing.username === 'adminalpha') {
      if (updates.role && updates.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Super Admin Lockout Protection: Cannot remove SUPER_ADMIN role from primary adminalpha.' }
      }
      if (updates.status && updates.status !== 'ACTIVE') {
        return { success: false, error: 'Super Admin Lockout Protection: Cannot deactivate or archive primary adminalpha.' }
      }
    }

    if (existing.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = all.filter((m) => m.role === 'SUPER_ADMIN' && m.status === 'ACTIVE' && m.id !== memberId)
      if (updates.role && updates.role !== 'SUPER_ADMIN' && activeSuperAdmins.length === 0) {
        return { success: false, error: 'Super Admin Lockout Protection: Cannot remove role from the last active Super Admin.' }
      }
      if (updates.status && updates.status !== 'ACTIVE' && activeSuperAdmins.length === 0) {
        return { success: false, error: 'Super Admin Lockout Protection: Cannot deactivate or archive the last active Super Admin.' }
      }
    }

    // Prohibit changing internal immutable UUID
    const cleanUpdates = { ...updates }
    delete cleanUpdates.id

    const updated = {
      ...existing,
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    }

    // Audit Course access changes if any
    if (updates.assigned_courses) {
      const oldCourses = (existing.assigned_courses || []).join(', ')
      const newCourses = (updates.assigned_courses || []).join(', ')
      if (oldCourses !== newCourses) {
        await auditService.logAction({
          adminUserId,
          actionType: 'COURSE_ACCESS_CHANGED',
          targetUserId: memberId,
          oldValue: oldCourses,
          newValue: newCourses,
          reason: 'Admin updated course assignments',
        })
      }
    }

    // Audit Granular permission changes if any
    if (updates.permissions) {
      await auditService.logAction({
        adminUserId,
        actionType: 'PERMISSION_OVERRIDE_CHANGED',
        targetUserId: memberId,
        oldValue: JSON.stringify(existing.permissions || {}),
        newValue: JSON.stringify(updates.permissions || {}),
        reason: 'Admin updated granular overrides',
      })
    }

    // Try Supabase update
    try {
      await apiService.patch(`/user_profiles?id=eq.${encodeURIComponent(memberId)}`, updated)
    } catch {
      // fallback
    }

    all[index] = updated
    saveLocalMembers(all)

    return { success: true, data: updated }
  },

  /**
   * Production Identity Management:
   * Changes Public User ID or Warrior Name with audit logging.
   * Internal UUID and all historical analytics/attempts remain 100% untouched.
   */
  async updatePublicIdentity({
    memberId,
    newPublicId,
    newWarriorName,
    changedBy = 'adminalpha',
    reason = 'Super Admin Identity Reassignment',
  }) {
    if (!memberId) return { success: false, error: 'Member ID required.' }

    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) {
      return { success: false, error: `Member with ID "${memberId}" not found.` }
    }

    const oldPublicId = member.public_user_id
    const oldWarriorName = member.warrior_name

    let cleanPublicId = oldPublicId
    if (newPublicId && newPublicId !== oldPublicId) {
      const pubCheck = identityService.validatePublicId(newPublicId, memberId, all)
      if (!pubCheck.valid) return { success: false, error: pubCheck.error }
      cleanPublicId = pubCheck.cleanId
    }

    let cleanWarriorName = oldWarriorName
    if (newWarriorName && newWarriorName !== oldWarriorName) {
      const warCheck = identityService.validateWarriorName(newWarriorName, memberId, all)
      if (!warCheck.valid) return { success: false, error: warCheck.error }
      cleanWarriorName = warCheck.cleanName
    }

    // Record audit log via identityService & auditService
    await identityService.logIdentityChange({
      internalUserId: memberId,
      oldPublicId,
      newPublicId: cleanPublicId,
      oldWarriorName,
      newWarriorName: cleanWarriorName,
      changedBy,
      reason,
    })

    await auditService.logAction({
      adminUserId: changedBy,
      actionType: 'IDENTITY_CHANGE',
      targetUserId: memberId,
      oldValue: `${oldWarriorName} (${oldPublicId})`,
      newValue: `${cleanWarriorName} (${cleanPublicId})`,
      reason,
    })

    // Update profile
    return this.updateMember(memberId, {
      public_user_id: cleanPublicId,
      warrior_name: cleanWarriorName,
    }, changedBy)
  },

  /**
   * Toggles member active / disabled status with Super Admin Lockout protection.
   */
  async toggleMemberStatus(memberId, adminUserId = 'adminalpha') {
    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Member not found.' }

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = all.filter((m) => m.role === 'SUPER_ADMIN' && m.status === 'ACTIVE')
      if (activeSuperAdmins.length <= 1) {
        return { success: false, error: 'Super Admin Lockout Protection: Cannot disable the only active Super Admin.' }
      }
    }

    const newStatus = member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    const actionType = newStatus === 'ACTIVE' ? 'MEMBER_ACTIVATED' : 'MEMBER_DISABLED'

    await auditService.logAction({
      adminUserId,
      actionType,
      targetUserId: memberId,
      oldValue: member.status,
      newValue: newStatus,
      reason: `Admin toggled status to ${newStatus}`,
    })

    return this.updateMember(memberId, { status: newStatus }, adminUserId)
  },

  /**
   * Soft Delete / Archive Member (Data remains 100% safe, login blocked, restorable).
   */
  async archiveMember(memberId, adminUserId = 'adminalpha') {
    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Member not found.' }

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      return { success: false, error: 'Super Admin Lockout Protection: Cannot archive Super Admin.' }
    }

    await auditService.logAction({
      adminUserId,
      actionType: 'MEMBER_ARCHIVED',
      targetUserId: memberId,
      oldValue: member.status,
      newValue: 'ARCHIVED',
      reason: 'Soft deleted / archived member profile',
    })

    return this.updateMember(memberId, { status: 'ARCHIVED' }, adminUserId)
  },

  /**
   * Restores an archived member to ACTIVE status.
   */
  async restoreMember(memberId, adminUserId = 'adminalpha') {
    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Member not found.' }

    await auditService.logAction({
      adminUserId,
      actionType: 'MEMBER_RESTORED',
      targetUserId: memberId,
      oldValue: member.status,
      newValue: 'ACTIVE',
      reason: 'Restored archived member profile',
    })

    return this.updateMember(memberId, { status: 'ACTIVE' }, adminUserId)
  },

  /**
   * Safe Delete Member with Lockout Protection.
   */
  async deleteMember(memberId, adminUserId = 'adminalpha') {
    if (!memberId) return { success: false, error: 'Member ID required.' }

    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Member not found.' }

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      return { success: false, error: 'Super Admin Lockout Protection: Super Admin account cannot be deleted.' }
    }

    // Soft delete preferred: archive instead of permanent wipe
    return this.archiveMember(memberId, adminUserId)
  },
}
