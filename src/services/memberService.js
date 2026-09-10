/**
 * memberService.js
 * Production Supabase-First Member & Profile Management Service.
 *
 * Hardened Architecture:
 * 1. Supabase Live Directory: Only Supabase database user records are displayed.
 * 2. Super Admin Lockout Immunity: Root adminalpha is permanently protected (cannot be deleted/disabled/archived/demoted).
 * 3. Single Course Constraint: Students are restricted to exactly 1 academic course track.
 * 4. Supabase Auth Integration: Passwords/Credentials are securely managed via Supabase Auth.
 */

import { apiService } from './apiService.js'
import { identityService } from './identityService.js'
import { auditService } from './auditService.js'

const MEMBERS_CACHE_KEY = 'nexora_supabase_users_directory_v3'

// Supreme Root Super Admin Anchor (Immune to deletion/lockout)
export const PRIMARY_SUPER_ADMIN = {
  id: 'usr_super_admin_alpha',
  username: 'adminalpha',
  public_user_id: 'NEX-WAR-000',
  warrior_name: 'APEXALPHA',
  display_name: 'Super Admin',
  email: 'adminalpha@nexora.io',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  assigned_courses: ['*'],
  assigned_course_id: '*',
  permissions: {
    all_courses: true,
    subject_overrides: {},
    content_overrides: {},
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  last_active_at: new Date().toISOString(),
}

export const SEED_MEMBERS = [PRIMARY_SUPER_ADMIN]

export function normalizeMember(member) {
  if (!member) return member
  const isSuper =
    member.role === 'SUPER_ADMIN' ||
    member.username === 'adminalpha' ||
    member.id === 'usr_super_admin_alpha'

  if (isSuper) {
    return {
      ...member,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      assigned_courses: ['*'],
      assigned_course_id: '*',
      permissions: {
        ...(member.permissions || {}),
        all_courses: true,
      },
    }
  }

  // Map alias / legacy course slugs to canonical course ID
  const mapCourseId = (cid) => {
    if (!cid || typeof cid !== 'string') return null
    const c = cid.toLowerCase().trim()
    if (c === 'cbse-9' || c === 'cbse-c9' || c === 'cbse-class-9' || c.includes('class 9') || c.includes('class-9')) return 'cbse-9'
    if (c === 'cbse-10' || c === 'cbse-c10' || c === 'cbse-class-10' || c.includes('class 10') || c.includes('class-10')) return 'cbse-10'
    if (c === 'cbse-12-cs' || c.includes('class 12')) return 'cbse-12-cs'
    if (c === 'bpsc_prelims' || c === 'bpsc-prelims' || c.includes('prelims') || c.includes('pre lims')) return 'bpsc-prelims'
    if (c === 'bpsc_cs' || c === 'bpsc-tre-4' || c === 'bpsc-4-cs' || c.includes('bpsc') || c.includes('tre')) return 'bpsc-tre-4'
    return cid
  }

  let singleCourse = null
  if (member.assigned_course_id && member.assigned_course_id !== '*') {
    singleCourse = mapCourseId(member.assigned_course_id)
  } else if (Array.isArray(member.assigned_courses) && member.assigned_courses.length > 0) {
    const valid = member.assigned_courses.filter((c) => c && c !== '*')
    if (valid.length > 0) {
      singleCourse = mapCourseId(valid[0])
    }
  }

  return {
    ...member,
    assigned_course_id: singleCourse || null,
    assigned_courses: singleCourse ? [singleCourse] : [],
  }
}

let memoryMembers = [PRIMARY_SUPER_ADMIN]

function getLocalMembers() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(MEMBERS_CACHE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeMember)
          const hasAdmin = normalized.some((m) => m.username === 'adminalpha' || m.role === 'SUPER_ADMIN')
          const merged = hasAdmin ? normalized : [PRIMARY_SUPER_ADMIN, ...normalized]
          memoryMembers = merged
          return merged
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
  const normalized = members.map(normalizeMember)
  const hasAdmin = normalized.some((m) => m.username === 'adminalpha' || m.role === 'SUPER_ADMIN')
  memoryMembers = hasAdmin ? normalized : [PRIMARY_SUPER_ADMIN, ...normalized]

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(memoryMembers))
    }
  } catch {
    // ignore
  }
}

export const memberService = {
  /**
   * Retrieves all member profiles from Supabase user_profiles table.
   * Only Supabase users are shown (plus Super Admin anchor).
   */
  async getAllMembers(includeArchived = true) {
    try {
      const res = await apiService.get('/user_profiles?order=created_at.asc')
      if (res && res.success && Array.isArray(res.data)) {
        const normalizedSupabase = res.data.map(normalizeMember)
        const hasAdmin = normalizedSupabase.some((m) => m.username === 'adminalpha' || m.role === 'SUPER_ADMIN')
        const finalProfiles = hasAdmin ? normalizedSupabase : [PRIMARY_SUPER_ADMIN, ...normalizedSupabase]

        saveLocalMembers(finalProfiles)
        return {
          success: true,
          data: includeArchived ? finalProfiles : finalProfiles.filter((m) => m.status !== 'ARCHIVED'),
          fromDatabase: true,
        }
      }
    } catch (err) {
      console.warn('[memberService] Supabase user_profiles fetch notice:', err)
    }

    // Return local cache / root Super Admin if Supabase is initializing
    const local = getLocalMembers()
    return {
      success: true,
      data: includeArchived ? local : local.filter((m) => m.status !== 'ARCHIVED'),
      fromDatabase: false,
    }
  },

  /**
   * Retrieves single member profile by internal UUID, username, email, or mobile.
   */
  async getMemberById(idOrUsername) {
    if (!idOrUsername) return { success: false, error: 'User ID or username required.' }

    const clean = String(idOrUsername).trim().toLowerCase()
    const cleanDigits = clean.replace(/\D/g, '')

    // Check Super Admin anchor immediately
    if (clean === 'adminalpha' || clean === 'usr_super_admin_alpha' || clean === 'adminalpha@nexora.io') {
      return { success: true, data: PRIMARY_SUPER_ADMIN }
    }

    // 1. Try querying Supabase user_profiles directly
    try {
      const res = await apiService.get(
        `/user_profiles?or=(id.eq.${encodeURIComponent(idOrUsername)},username.eq.${encodeURIComponent(clean.toUpperCase())},email.eq.${encodeURIComponent(clean)})`
      )
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return { success: true, data: normalizeMember(res.data[0]) }
      }
    } catch {
      // fallback
    }

    // 2. Query local cache
    const all = getLocalMembers()
    const found = all.find(
      (m) =>
        m.id === idOrUsername ||
        String(m.username || '').toLowerCase() === clean ||
        String(m.email || '').toLowerCase() === clean ||
        String(m.phone || '').toLowerCase() === clean ||
        (cleanDigits.length >= 10 && String(m.phone || '').replace(/\D/g, '').endsWith(cleanDigits.slice(-10))) ||
        String(m.display_name || '').toLowerCase() === clean ||
        String(m.public_user_id || '').toLowerCase() === clean ||
        String(m.warrior_name || '').toLowerCase() === clean
    )

    if (found) return { success: true, data: normalizeMember(found) }
    return { success: false, error: `User "${idOrUsername}" not found.` }
  },

  /**
   * Creates a new member profile in Supabase Auth & Supabase user_profiles table.
   */
  async createMember({
    id = null,
    username,
    display_name,
    email,
    phone = null,
    password = null,
    assigned_courses = [],
    assigned_course_id = null,
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

    // Validate email
    let cleanEmail = String(email || '').trim().toLowerCase()
    const cleanPhone = String(phone || '').trim()
    const phoneDigits = cleanPhone.replace(/\D/g, '')

    if (!cleanEmail) {
      if (phoneDigits.length >= 10) {
        cleanEmail = `${phoneDigits.slice(-10)}@student.nexora.io`
      } else {
        cleanEmail = `${cleanUsername.toLowerCase()}@student.nexora.io`
      }
    }

    if (all.some((m) => String(m.email || '').trim().toLowerCase() === cleanEmail)) {
      return { success: false, error: `Email "${cleanEmail}" is already registered. Please log in instead.` }
    }

    // Validate phone uniqueness if provided
    if (phoneDigits.length >= 10 && all.some((m) => String(m.phone || '').replace(/\D/g, '').endsWith(phoneDigits.slice(-10)))) {
      return { success: false, error: `Mobile number "${cleanPhone}" is already registered.` }
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

    const isSuper = role === 'SUPER_ADMIN'
    let resolvedCourses = []
    let resolvedPrimaryCourseId = null

    if (isSuper) {
      resolvedCourses = ['*']
      resolvedPrimaryCourseId = '*'
    } else {
      const firstCourse = assigned_course_id || (Array.isArray(assigned_courses) && assigned_courses.length > 0 ? assigned_courses[0] : null)
      if (firstCourse && firstCourse !== '*') {
        resolvedPrimaryCourseId = firstCourse
        resolvedCourses = [firstCourse]
      }
    }

    // 1. Register with Supabase Auth if password is provided
    let authUserId = id
    if (password) {
      try {
        const signupRes = await apiService.post('/auth/v1/signup', {
          email: cleanEmail,
          password: String(password).trim(),
          data: {
            display_name: display_name || cleanUsername,
            username: cleanUsername,
            role,
            assigned_course_id: resolvedPrimaryCourseId,
            assigned_courses: resolvedCourses,
            phone: cleanPhone || null,
          },
        })

        if (signupRes.success && (signupRes.data?.id || signupRes.data?.user?.id)) {
          authUserId = signupRes.data?.id || signupRes.data?.user?.id
        }
      } catch (err) {
        console.warn('[memberService] Supabase Auth signup notice:', err)
      }
    }

    const generatedId = authUserId || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // 2. Construct user_profiles record
    const newMember = {
      id: generatedId,
      username: cleanUsername,
      public_user_id: publicId,
      warrior_name: warriorName,
      display_name: display_name || cleanUsername,
      email: cleanEmail,
      phone: cleanPhone || null,
      role,
      status,
      assigned_course_id: resolvedPrimaryCourseId,
      assigned_courses: resolvedCourses,
      permissions: {
        all_courses: isSuper,
        subject_overrides: {},
        content_overrides: {},
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    }

    // 3. Insert into Supabase user_profiles table
    try {
      const profileRes = await apiService.post('/user_profiles', [newMember])
      if (!profileRes.success && profileRes.error && !profileRes.error.includes('duplicate')) {
        console.warn('[memberService] Supabase user_profiles insert notice:', profileRes.error)
      }
    } catch (err) {
      console.warn('[memberService] Supabase user_profiles insert error:', err)
    }

    const updatedList = [...all, newMember].map(normalizeMember)
    saveLocalMembers(updatedList)

    // Audit Log
    await auditService.logAction({
      adminUserId,
      actionType: 'MEMBER_CREATED',
      targetUserId: newMember.id,
      newValue: `${newMember.display_name} (${newMember.warrior_name} • ${newMember.public_user_id})`,
      reason: 'Admin created user profile in Supabase',
    })

    return { success: true, data: normalizeMember(newMember) }
  },

  /**
   * Updates an existing member profile in Supabase user_profiles.
   */
  async updateMember(memberId, updates, adminUserId = 'adminalpha') {
    if (!memberId) return { success: false, error: 'Member ID required.' }

    const all = getLocalMembers()
    const index = all.findIndex((m) => m.id === memberId)
    if (index === -1) {
      return { success: false, error: `Member with ID "${memberId}" not found.` }
    }

    const existing = all[index]

    // Super Admin Lockout Protection: Primary adminalpha cannot be deactivated or demoted
    if (existing.username === 'adminalpha' || existing.id === 'usr_super_admin_alpha') {
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

    const rawUpdated = {
      ...existing,
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    }

    const updated = normalizeMember(rawUpdated)

    // Audit Course access changes
    if (updates.assigned_courses || updates.assigned_course_id) {
      const oldCourse = existing.assigned_course_id || existing.assigned_courses?.[0] || 'none'
      const newCourse = updated.assigned_course_id || updated.assigned_courses?.[0] || 'none'
      if (oldCourse !== newCourse) {
        await auditService.logAction({
          adminUserId,
          actionType: 'COURSE_ACCESS_CHANGED',
          targetUserId: memberId,
          oldValue: oldCourse,
          newValue: newCourse,
          reason: 'Admin updated course assignment',
        })
      }
    }

    // Update in Supabase user_profiles table
    try {
      await apiService.patch(`/user_profiles?id=eq.${encodeURIComponent(memberId)}`, updated)
    } catch (err) {
      console.warn('[memberService] Supabase patch error:', err)
    }

    all[index] = updated
    saveLocalMembers(all)

    return { success: true, data: updated }
  },

  /**
   * Resets a user's password via Supabase Auth.
   */
  async adminResetPassword({ memberId, newPassword, adminUserId = 'adminalpha' }) {
    if (!memberId) return { success: false, error: 'Member ID is required.' }
    const cleanPass = String(newPassword || '').trim()
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' }
    }

    const memberRes = await this.getMemberById(memberId)
    if (!memberRes.success || !memberRes.data) {
      return { success: false, error: 'User profile not found.' }
    }

    const member = memberRes.data

    // 1. Update password via Supabase Auth
    try {
      const authRes = await apiService.put(`/auth/v1/admin/users/${encodeURIComponent(member.id)}`, {
        password: cleanPass,
      })

      if (!authRes.success && member.email) {
        await apiService.put('/auth/v1/user', {
          password: cleanPass,
        })
      }
    } catch (err) {
      console.warn('[memberService] Supabase Auth password update notice:', err)
    }

    // 2. Audit the password reset
    await auditService.logAction({
      adminUserId,
      actionType: 'PASSWORD_RESET',
      targetUserId: memberId,
      oldValue: '********',
      newValue: '********',
      reason: 'Admin reset user password via Supabase Auth',
    })

    return { success: true, message: `Password successfully updated for ${member.display_name}.` }
  },

  /**
   * Production Identity Management: Changes Public User ID or Warrior Name with audit logging.
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
      return { success: false, error: 'Super Admin Lockout Protection: Cannot disable Super Admin.' }
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
   * Soft Delete / Archive Member.
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
   * Permanent Delete Member from Supabase with Super Admin Protection.
   */
  async hardDeleteMember(memberId, adminUserId = 'adminalpha') {
    if (!memberId) return { success: false, error: 'Member ID required.' }

    const all = getLocalMembers()
    const member = all.find((m) => m.id === memberId)
    if (!member) return { success: false, error: 'Member not found.' }

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN') {
      return { success: false, error: 'Super Admin Lockout Protection: Super Admin account cannot be deleted.' }
    }

    // 1. Delete from Supabase user_profiles table
    try {
      await apiService.delete(`/user_profiles?id=eq.${encodeURIComponent(memberId)}`)
    } catch (err) {
      console.warn('[memberService] Supabase delete error:', err)
    }

    const filtered = all.filter((m) => m.id !== memberId)
    saveLocalMembers(filtered)

    await auditService.logAction({
      adminUserId,
      actionType: 'MEMBER_DELETED',
      targetUserId: memberId,
      oldValue: member.display_name,
      newValue: 'PERMANENTLY_DELETED',
      reason: 'Admin permanently deleted user from Supabase',
    })

    return { success: true, message: `Member ${member.display_name} deleted successfully.` }
  },

  /**
   * Safe Delete Member (defaults to soft-archive).
   */
  async deleteMember(memberId, adminUserId = 'adminalpha') {
    return this.archiveMember(memberId, adminUserId)
  },
}
