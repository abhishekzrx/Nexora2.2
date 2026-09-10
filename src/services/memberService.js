/**
 * memberService.js
 * Production Supabase-First Member & Profile Management Service.
 *
 * Hardened Architecture:
 * 1. Supabase as Source of Truth with Resilient Client Persistence:
 *    - Database members are always loaded and prioritized.
 *    - Created members (MEMBER06+) are never wiped by default seed lists or network drops.
 * 2. Super Admin Lockout Immunity: Root adminalpha is permanently protected (cannot be deleted/disabled/archived/demoted).
 * 3. Stable Member Identity: Immutable auth.users.id (UUID) anchors all analytics, attempts, and progress.
 * 4. Single Course Constraint: Students are restricted to exactly 1 academic course track (Super Admin has global * access).
 * 5. Supabase Auth Integration: Passwords/Credentials are securely managed via Supabase Auth.
 */

import { apiService } from './apiService.js'
import { identityService } from './identityService.js'
import { auditService } from './auditService.js'

const MEMBERS_CACHE_KEY = 'nexora_supabase_users_directory_v3'
const LEGACY_CACHE_KEY_1 = 'nexora_members_directory_v2'
const LEGACY_CACHE_KEY_2 = 'nexora_members_directory'

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

// Baseline Production Seed & Bootstrap Profiles
export const SEED_MEMBERS = [
  PRIMARY_SUPER_ADMIN,
  {
    id: 'usr_member_01_rahul',
    username: 'MEMBER01',
    public_user_id: 'NEX-WAR-001',
    warrior_name: 'IRONPHOENIX',
    display_name: 'Rahul',
    email: 'rahul@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_course_id: 'bpsc_prelims',
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
    assigned_course_id: 'bpsc_prelims',
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
    assigned_course_id: 'bpsc_cs',
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
    assigned_course_id: 'bpsc_prelims',
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
    assigned_course_id: 'bpsc_cs',
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
  {
    id: 'usr_member_06_ansh',
    username: 'ansh09',
    public_user_id: 'NEX-WAR-006',
    warrior_name: 'THUNDERFANG',
    display_name: 'Ansh',
    email: 'ansh@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_course_id: 'cbse-9',
    assigned_courses: ['cbse-9'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_07_abhinash',
    username: 'abhinash09',
    public_user_id: 'NEX-WAR-007',
    warrior_name: 'BLAZELION',
    display_name: 'Abhinash',
    email: 'abhinash@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_course_id: 'cbse-9',
    assigned_courses: ['cbse-9'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-02-02T00:00:00.000Z',
    updated_at: '2026-02-02T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_08_sahil',
    username: 'sahil09',
    public_user_id: 'NEX-WAR-008',
    warrior_name: 'FROSTDRAGON',
    display_name: 'Sahil',
    email: 'sahil@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_course_id: 'cbse-9',
    assigned_courses: ['cbse-9'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-02-03T00:00:00.000Z',
    updated_at: '2026-02-03T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'usr_member_09_ankit',
    username: 'ankit10',
    public_user_id: 'NEX-WAR-009',
    warrior_name: 'CYBERSHARK',
    display_name: 'Ankit',
    email: 'ankit@student.nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_course_id: 'cbse-10',
    assigned_courses: ['cbse-10'],
    permissions: {
      all_courses: false,
      subject_overrides: {},
      content_overrides: {},
    },
    created_at: '2026-02-04T00:00:00.000Z',
    updated_at: '2026-02-04T00:00:00.000Z',
    last_active_at: new Date().toISOString(),
  },
]

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
    if (c === 'bpsc_prelims' || c === 'bpsc-prelims' || c.includes('prelims') || c.includes('pre lims')) return 'bpsc_prelims'
    if (c === 'bpsc_cs' || c === 'bpsc-tre-4' || c === 'bpsc-4-cs' || c.includes('bpsc') || c.includes('tre')) return 'bpsc_cs'
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
    assigned_courses: singleCourse ? [singleCourse] : (Array.isArray(member.assigned_courses) ? member.assigned_courses : []),
  }
}

let memoryMembers = SEED_MEMBERS.map(normalizeMember)

/**
 * Intelligent local member loader:
 * Merges localStorage records with baseline SEED_MEMBERS.
 * Guarantees that dynamically created members (e.g. MEMBER06+) are NEVER dropped.
 */
function getLocalMembers() {
  try {
    if (typeof localStorage !== 'undefined') {
      let saved = localStorage.getItem(MEMBERS_CACHE_KEY)
      if (!saved) {
        saved = localStorage.getItem(LEGACY_CACHE_KEY_1) || localStorage.getItem(LEGACY_CACHE_KEY_2)
      }

      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const storedNormalized = parsed.map(normalizeMember)

          // Build dictionary keyed by ID and uppercase username
          const memberMap = new Map()

          // 1. Seed baseline accounts first
          SEED_MEMBERS.forEach((seed) => {
            const normSeed = normalizeMember(seed)
            memberMap.set(normSeed.id, normSeed)
            if (normSeed.username) memberMap.set(normSeed.username.toUpperCase(), normSeed)
          })

          // 2. Overlay stored members (including updates and dynamically created members)
          storedNormalized.forEach((stored) => {
            const normStored = normalizeMember(stored)
            memberMap.set(normStored.id, normStored)
            if (normStored.username) memberMap.set(normStored.username.toUpperCase(), normStored)
          })

          // Extract unique list
          const uniqueList = Array.from(new Set(Array.from(memberMap.values())))
          const finalMerged = ensureRootAdminAnchor(uniqueList)
          memoryMembers = finalMerged
          return finalMerged
        }
      }
    }
  } catch {
    // ignore
  }

  const initial = ensureRootAdminAnchor(SEED_MEMBERS.map(normalizeMember))
  saveLocalMembers(initial)
  return initial
}

/**
 * Ensures Primary Root Super Admin is always anchored and active.
 */
function ensureRootAdminAnchor(list = []) {
  const normalized = list.map(normalizeMember)
  const adminIndex = normalized.findIndex((m) => m.username === 'adminalpha' || m.id === 'usr_super_admin_alpha')

  if (adminIndex !== -1) {
    normalized[adminIndex] = {
      ...normalized[adminIndex],
      ...PRIMARY_SUPER_ADMIN,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      assigned_courses: ['*'],
      assigned_course_id: '*',
      permissions: { all_courses: true, subject_overrides: {}, content_overrides: {} },
    }
    return normalized
  }

  return [PRIMARY_SUPER_ADMIN, ...normalized]
}

function saveLocalMembers(members) {
  const merged = ensureRootAdminAnchor(members)
  memoryMembers = merged

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(merged))
    }
  } catch {
    // ignore
  }
}

export const memberService = {
  /**
   * Retrieves all member profiles with Supabase as Permanent Source of Truth.
   * Merges database records with local members so dynamic records are never lost.
   */
  async getAllMembers(includeArchived = true) {
    let local = getLocalMembers()

    try {
      const res = await apiService.get('/user_profiles?order=created_at.asc')
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const dbProfiles = res.data.map(normalizeMember)

        // Build merged dictionary: Supabase is source of truth, but preserve local records not yet synced
        const memberMap = new Map()

        // 1. Load local records
        local.forEach((m) => {
          memberMap.set(m.id, m)
          if (m.username) memberMap.set(m.username.toUpperCase(), m)
        })

        // 2. Overlay Supabase database records (Database wins)
        dbProfiles.forEach((dbM) => {
          memberMap.set(dbM.id, dbM)
          if (dbM.username) memberMap.set(dbM.username.toUpperCase(), dbM)
        })

        const uniqueMerged = ensureRootAdminAnchor(Array.from(new Set(Array.from(memberMap.values()))))
        saveLocalMembers(uniqueMerged)

        return {
          success: true,
          data: includeArchived ? uniqueMerged : uniqueMerged.filter((m) => m.status !== 'ARCHIVED'),
          fromDatabase: true,
        }
      }
    } catch (err) {
      console.warn('[memberService] Supabase user_profiles fetch notice (using resilient local store):', err)
    }

    // Return resilient local cache if Supabase is offline or initializing
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

    // Super Admin Lockout Protection: Primary adminalpha cannot be deactivated, demoted, or stripped of access
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

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN' || member.id === 'usr_super_admin_alpha') {
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

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN' || member.id === 'usr_super_admin_alpha') {
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

    if (member.username === 'adminalpha' || member.role === 'SUPER_ADMIN' || member.id === 'usr_super_admin_alpha') {
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

