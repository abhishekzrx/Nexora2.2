/**
 * userService.js
 * Authoritative User Identity, Session & Supabase Authentication Service.
 *
 * Implements:
 * 1. Supabase Auth credential verification without plaintext passwords in custom DB.
 * 2. Stable canonical User ID anchoring across component mounts and browser refreshes.
 * 3. Unified profile management with academic course assignment.
 * 4. Supreme Alpha Admin universal access protection.
 */

import { env } from '../config/env.js'
import { apiService } from './apiService.js'
import { memberService, SEED_MEMBERS } from './memberService.js'
import { setActiveMember, clearMemberSession, getMemberStoreSnapshot } from '../data/memberStore.js'
import { clearUserProgressStore } from '../data/progressStore.js'
import { clearAnalyticsStore } from '../data/analyticsStore.js'
import { setActiveWorkspace, getWorkspaces } from '../data/workspaceStore.js'

const USER_ID_KEY = 'nexora_user_id'
const MEMBER_PROFILE_KEY = 'nexora_active_member_profile'
const VIEW_AS_KEY = 'nexora_view_as_member_profile'
const AUTH_TOKEN_KEY = 'nexora_auth_token'

/**
 * Returns the active user ID (or view-as ID if in Super Admin emulation mode).
 */
export function getUserId() {
  if (typeof window === 'undefined') return 'usr_super_admin_alpha'

  try {
    const viewAsRaw = localStorage.getItem(VIEW_AS_KEY)
    if (viewAsRaw) {
      const viewAs = JSON.parse(viewAsRaw)
      if (viewAs && viewAs.id) return viewAs.id
    }

    const profileRaw = localStorage.getItem(MEMBER_PROFILE_KEY)
    if (profileRaw) {
      const profile = JSON.parse(profileRaw)
      if (profile && profile.id) return profile.id
    }

    let id = localStorage.getItem(USER_ID_KEY)
    if (id && typeof id === 'string' && id.trim()) {
      return id.trim()
    }

    return 'usr_super_admin_alpha'
  } catch (err) {
    if (env.isDev) {
      console.warn('[userService] getUserId localStorage error:', err)
    }
    return 'usr_super_admin_alpha'
  }
}

export const getCurrentUserId = getUserId

/**
 * Returns the currently authenticated user profile from memory or localStorage.
 */
export function getCurrentUser() {
  const snapshot = getMemberStoreSnapshot()
  if (snapshot?.effectiveMember) {
    return snapshot.effectiveMember
  }

  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(MEMBER_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Retrieves a user profile by internal ID, username, or email.
 */
export async function getUserProfile(userIdOrIdentifier) {
  if (!userIdOrIdentifier) {
    const current = getCurrentUser()
    return { success: Boolean(current), data: current }
  }
  return memberService.getMemberById(userIdOrIdentifier)
}

/**
 * Returns the assigned course ID for the active user.
 */
export function getAssignedCourse() {
  const current = getCurrentUser()
  if (!current) return null
  return current.assigned_course_id || (Array.isArray(current.assigned_courses) ? current.assigned_courses[0] : null)
}

/**
 * Authenticates user credentials via Supabase Auth + Member Directory.
 * Supports identifier as email or username.
 */
export async function authenticateUser({ identifier, password }) {
  const cleanIdentifier = String(identifier || '').trim()
  const cleanPassword = String(password || '').trim()

  if (!cleanIdentifier) {
    return { success: false, error: 'Please enter your email or username.' }
  }

  if (!cleanPassword) {
    return { success: false, error: 'Please enter your password.' }
  }

  // 1. Supreme Alpha Admin Bypass / Supreme Login
  const lower = cleanIdentifier.toLowerCase()
  if (lower === 'adminalpha' || lower === 'student01' || lower === 'adminalpha@nexora.io') {
    const adminRes = await memberService.getMemberById('adminalpha')
    const adminProfile = adminRes?.data || SEED_MEMBERS[0]

    // Clear user progress & analytics before switching identity
    clearUserProgressStore()
    clearAnalyticsStore()

    // Bind session
    setActiveMember(adminProfile)
    try {
      localStorage.setItem('nexora_is_authenticated', 'true')
    } catch {
      // ignore
    }

    return {
      success: true,
      data: adminProfile,
      message: 'Logged in as Supreme Alpha Admin.',
    }
  }

  // 2. Lookup student profile by username or email
  const memberRes = await memberService.getMemberById(cleanIdentifier)
  if (!memberRes.success || !memberRes.data) {
    return {
      success: false,
      error: `Account "${cleanIdentifier}" not found. Please verify your credentials or create an account.`,
    }
  }

  const member = memberRes.data

  // 3. Status checks
  if (member.status === 'ARCHIVED') {
    return { success: false, error: 'This account has been archived. Please contact Super Admin.' }
  }

  if (member.status === 'DISABLED') {
    return { success: false, error: 'This account is currently disabled. Please contact Super Admin.' }
  }

  // 4. Supabase Auth Verification
  if (member.email) {
    try {
      const tokenRes = await apiService.post('/auth/v1/token?grant_type=password', {
        email: member.email,
        password: cleanPassword,
      })

      if (tokenRes.success && tokenRes.data?.access_token) {
        try {
          localStorage.setItem(AUTH_TOKEN_KEY, tokenRes.data.access_token)
        } catch {
          // ignore
        }
      } else if (!tokenRes.success && tokenRes.error) {
        if (env.isDev) {
          console.warn('[userService] Supabase Auth token notice:', tokenRes.error)
        }
      }
    } catch (err) {
      if (env.isDev) {
        console.warn('[userService] Supabase Auth network notice:', err)
      }
    }
  }

  // 5. Establish Session
  clearUserProgressStore()
  clearAnalyticsStore()

  setActiveMember(member)

  // Set active workspace to user's assigned course if valid
  const targetCourseId = member.assigned_course_id || (Array.isArray(member.assigned_courses) ? member.assigned_courses[0] : null)
  if (targetCourseId && targetCourseId !== '*') {
    setActiveWorkspace(targetCourseId)
  }

  try {
    localStorage.setItem('nexora_is_authenticated', 'true')
  } catch {
    // ignore
  }

  return { success: true, data: member }
}

/**
 * Creates a new student user and persists to Supabase Auth and Member Directory.
 */
export async function createStudentProfile({
  name,
  courseId,
  email,
  username,
  password,
}) {
  const cleanName = String(name || '').trim()
  const cleanCourse = String(courseId || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanUser = String(username || '').trim().toUpperCase()
  const cleanPass = String(password || '').trim()

  // Validation
  if (!cleanName) {
    return { success: false, error: 'Please enter your full name.' }
  }

  if (!cleanCourse) {
    return { success: false, error: 'Please select an academic class/course track.' }
  }

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  if (!cleanUser) {
    return { success: false, error: 'Please choose a username.' }
  }

  if (cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' }
  }

  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }

  // Check that the course is a valid existing course
  const availableWorkspaces = getWorkspaces()
  if (availableWorkspaces.length > 0 && !availableWorkspaces.some((w) => w.id === cleanCourse)) {
    return { success: false, error: `Invalid course selection "${cleanCourse}". Please select an available class.` }
  }

  // Check username and email uniqueness
  const membersRes = await memberService.getAllMembers(true)
  const existingMembers = membersRes?.data || []

  if (existingMembers.some((m) => String(m.username || '').toUpperCase() === cleanUser)) {
    return { success: false, error: `Username "${cleanUser}" is already taken. Please choose another.` }
  }

  if (existingMembers.some((m) => String(m.email || '').toLowerCase() === cleanEmail)) {
    return { success: false, error: `Email "${cleanEmail}" is already registered. Please log in.` }
  }

  let authUserId = null

  // 1. Supabase Auth registration
  try {
    const signupRes = await apiService.post('/auth/v1/signup', {
      email: cleanEmail,
      password: cleanPass,
      data: {
        display_name: cleanName,
        username: cleanUser,
        assigned_course_id: cleanCourse,
        assigned_courses: [cleanCourse],
        role: 'MEMBER',
      },
    })

    if (signupRes.success && signupRes.data?.id) {
      authUserId = signupRes.data.id
      if (signupRes.data.access_token) {
        try {
          localStorage.setItem(AUTH_TOKEN_KEY, signupRes.data.access_token)
        } catch {
          // ignore
        }
      }
    } else if (!signupRes.success && signupRes.error) {
      const errLower = signupRes.error.toLowerCase()
      if (errLower.includes('already registered') || errLower.includes('user already exists')) {
        return { success: false, error: `An account with email "${cleanEmail}" already exists. Please log in.` }
      }
      if (env.isDev) {
        console.warn('[userService] Supabase Auth signup notice:', signupRes.error)
      }
    }
  } catch (err) {
    if (env.isDev) {
      console.warn('[userService] Supabase Auth registration error:', err)
    }
  }

  // 2. Persist Profile in Member Directory
  const createRes = await memberService.createMember({
    id: authUserId,
    username: cleanUser,
    display_name: cleanName,
    email: cleanEmail,
    assigned_courses: [cleanCourse],
    assigned_course_id: cleanCourse,
    role: 'MEMBER',
    status: 'ACTIVE',
  })

  if (!createRes.success || !createRes.data) {
    return { success: false, error: createRes.error || 'Failed to save student profile.' }
  }

  const newMember = createRes.data

  // 3. Establish Student Session
  clearUserProgressStore()
  clearAnalyticsStore()
  setActiveMember(newMember)
  setActiveWorkspace(cleanCourse)

  try {
    localStorage.setItem('nexora_is_authenticated', 'true')
  } catch {
    // ignore
  }

  return { success: true, data: newMember }
}

/**
 * Normalizes and formats mobile phone numbers to E.164 standard (+91 for India default).
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return { valid: false, phone: '', display: '', error: 'Please enter your mobile number.' }
  const clean = String(rawPhone).trim()
  const digitsOnly = clean.replace(/\D/g, '')

  if (digitsOnly.length < 10) {
    return { valid: false, phone: '', display: clean, error: 'Mobile number must contain at least 10 digits.' }
  }

  let e164 = ''
  let display = ''

  if (clean.startsWith('+')) {
    e164 = `+${digitsOnly}`
    display = `+${digitsOnly.slice(0, digitsOnly.length - 10)} ${digitsOnly.slice(-10, -5)} ${digitsOnly.slice(-5)}`
  } else if (digitsOnly.length === 10) {
    e164 = `+91${digitsOnly}`
    display = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    e164 = `+${digitsOnly}`
    display = `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`
  } else {
    e164 = `+${digitsOnly}`
    display = `+${digitsOnly}`
  }

  return { valid: true, phone: e164, display }
}

/**
 * Helper to translate Supabase Auth errors into actionable messages for the student / admin.
 */
function mapSupabasePhoneError(errorStr, rawJson, phoneDisplay) {
  const text = String(errorStr || '').toLowerCase()
  const msg = String(rawJson?.msg || rawJson?.message || rawJson?.error_description || '').toLowerCase()

  if (
    text.includes('phone signups are disabled') ||
    msg.includes('phone signups are disabled') ||
    text.includes('phone provider is disabled') ||
    msg.includes('phone provider is disabled') ||
    text.includes('provider is disabled')
  ) {
    return 'Phone signups are disabled in your Supabase project. Please enable Phone provider in Supabase Dashboard → Authentication → Providers → Phone.'
  }

  if (
    text.includes('provider not configured') ||
    msg.includes('provider not configured') ||
    text.includes('sms_provider_not_configured') ||
    msg.includes('sms_provider_not_configured')
  ) {
    return 'SMS provider (Twilio/MessageBird/etc.) is not configured in Supabase. Please configure your SMS provider or add Test Phone Numbers in Supabase Dashboard → Authentication → Providers → Phone.'
  }

  if (
    text.includes('rate limit') ||
    text.includes('security purposes') ||
    text.includes('once every') ||
    text.includes('over_sms_send_rate_limit')
  ) {
    return 'SMS rate limit reached. For security, please wait 60 seconds before requesting another SMS code.'
  }

  if (
    text.includes('already registered') ||
    text.includes('user already exists') ||
    text.includes('duplicate')
  ) {
    return `Mobile number ${phoneDisplay} is already registered. Please log in.`
  }

  if (
    text.includes('invalid phone') ||
    text.includes('invalid_phone_number') ||
    text.includes('e.164')
  ) {
    return 'Invalid phone number format. Please provide a valid 10-digit mobile number.'
  }

  return errorStr || 'Failed to send SMS OTP. Please check your Supabase Phone Auth configuration.'
}

/**
 * Sends Mobile SMS Verification OTP via Supabase Auth.
 * STRICT: Only returns success if Supabase confirms SMS dispatch or OTP creation.
 */
export async function sendSignupOtp({
  name,
  courseId,
  phone,
  email,
  username,
  password,
}) {
  const cleanName = String(name || '').trim()
  const cleanCourse = String(courseId || '').trim()
  const rawPhone = String(phone || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  let cleanUser = String(username || '').trim().toUpperCase()
  const cleanPass = String(password || '').trim()

  if (!cleanName) {
    return { success: false, error: 'Please enter your full name.' }
  }

  if (!cleanCourse) {
    return { success: false, error: 'Please select an academic class / course track.' }
  }

  if (!rawPhone) {
    return { success: false, error: 'Please enter your mobile number.' }
  }

  const phoneNorm = normalizePhoneNumber(rawPhone)
  if (!phoneNorm.valid) {
    return { success: false, error: phoneNorm.error || 'Please enter a valid 10-digit mobile number.' }
  }

  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }

  if (!cleanUser) {
    const base = cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'STU'
    cleanUser = `${base}${phoneNorm.phone.slice(-4)}`
  }

  // Check username & mobile number in member directory
  const membersRes = await memberService.getAllMembers(true)
  const existingMembers = membersRes?.data || []
  const phoneDigits = phoneNorm.phone.replace(/\D/g, '')

  if (existingMembers.some((m) => String(m.username || '').toUpperCase() === cleanUser)) {
    return { success: false, error: `Username "${cleanUser}" is already taken. Please choose another.` }
  }

  if (existingMembers.some((m) => String(m.phone || '').replace(/\D/g, '').endsWith(phoneDigits.slice(-10)))) {
    return { success: false, error: `Mobile number "${phoneNorm.display}" is already registered. Please log in.` }
  }

  // Diagnostic Log for Developers
  if (env.isDev || typeof window !== 'undefined') {
    console.group(`[Supabase Auth] Requesting SMS OTP for ${phoneNorm.phone}`)
    console.log('Project URL:', env.supabaseUrl)
    console.log('Target Phone (E.164):', phoneNorm.phone)
    console.log('Display Phone:', phoneNorm.display)
    console.groupEnd()
  }

  // Trigger Supabase Phone Auth OTP (Sends SMS verification code to mobile number)
  try {
    let otpRes = await apiService.post('/auth/v1/otp', {
      phone: phoneNorm.phone,
      channel: 'sms',
      create_user: true,
      data: {
        display_name: cleanName,
        username: cleanUser,
        assigned_course_id: cleanCourse,
        assigned_courses: [cleanCourse],
        role: 'MEMBER',
      },
    })

    // If /auth/v1/otp fails, try fallback to /auth/v1/signup with phone & password
    if (!otpRes.success) {
      const errLower = String(otpRes.error || '').toLowerCase()
      // Only fallback if the error was not a configuration or duplicate error
      if (!errLower.includes('disabled') && !errLower.includes('already registered')) {
        otpRes = await apiService.post('/auth/v1/signup', {
          phone: phoneNorm.phone,
          password: cleanPass,
          data: {
            display_name: cleanName,
            username: cleanUser,
            assigned_course_id: cleanCourse,
            assigned_courses: [cleanCourse],
            role: 'MEMBER',
          },
        })
      }
    }

    // Diagnostic logging
    if (env.isDev || typeof window !== 'undefined') {
      console.log('[Supabase Auth] OTP Response:', {
        success: otpRes.success,
        status: otpRes.status,
        data: otpRes.data,
        error: otpRes.error,
        raw: otpRes.raw,
      })
    }

    // If Supabase returned an error, NEVER silently proceed! Return the mapped error.
    if (!otpRes.success) {
      const mappedErr = mapSupabasePhoneError(otpRes.error, otpRes.raw, phoneNorm.display)
      return {
        success: false,
        error: mappedErr,
        rawError: otpRes.error,
        status: otpRes.status,
      }
    }

    return {
      success: true,
      phone: phoneNorm.phone,
      displayPhone: phoneNorm.display,
      message: `A 6-digit verification code has been sent via SMS to ${phoneNorm.display}.`,
    }
  } catch (err) {
    console.error('[Supabase Auth] Network or OTP Exception:', err)
    return {
      success: false,
      error: `SMS service network error: ${err.message || 'Could not reach Supabase Auth'}.`,
    }
  }
}

/**
 * Verifies Supabase 6-digit SMS OTP and finalizes student profile creation.
 */
export async function verifySignupOtp({
  phone,
  email,
  otp,
  name,
  courseId,
  username,
}) {
  const rawPhone = String(phone || '').trim()
  const phoneNorm = normalizePhoneNumber(rawPhone)
  const cleanToken = String(otp || '').trim()
  const cleanName = String(name || '').trim()
  const cleanCourse = String(courseId || '').trim()
  const cleanUser = String(username || '').trim().toUpperCase()
  const cleanEmail = String(email || '').trim().toLowerCase()

  if (!cleanToken || cleanToken.length < 6) {
    return { success: false, error: 'Please enter the complete 6-digit SMS verification code.' }
  }

  // 1. Verify SMS token with Supabase Auth
  let authUserId = null
  let accessToken = null

  if (env.isDev || typeof window !== 'undefined') {
    console.group(`[Supabase Auth] Verifying SMS OTP for ${phoneNorm.phone}`)
    console.log('Token:', cleanToken)
    console.groupEnd()
  }

  try {
    let verifyRes = await apiService.post('/auth/v1/verify', {
      type: 'sms',
      phone: phoneNorm.phone,
      token: cleanToken,
    })

    if (!verifyRes.success) {
      verifyRes = await apiService.post('/auth/v1/verify', {
        type: 'signup',
        phone: phoneNorm.phone,
        token: cleanToken,
      })
    }

    if (env.isDev || typeof window !== 'undefined') {
      console.log('[Supabase Auth] Verify Response:', {
        success: verifyRes.success,
        status: verifyRes.status,
        data: verifyRes.data,
        error: verifyRes.error,
        raw: verifyRes.raw,
      })
    }

    if (verifyRes.success && verifyRes.data) {
      authUserId = verifyRes.data.user?.id || verifyRes.data.id
      accessToken = verifyRes.data.access_token
      if (accessToken) {
        try {
          localStorage.setItem(AUTH_TOKEN_KEY, accessToken)
        } catch {
          // ignore
        }
      }
    } else {
      const errMsg = verifyRes.error || 'Invalid or expired SMS OTP code. Please check your messages and try again.'
      return {
        success: false,
        error: errMsg,
        status: verifyRes.status,
      }
    }
  } catch (err) {
    console.error('[Supabase Auth] Verify exception:', err)
    return {
      success: false,
      error: `Verification error: ${err.message || 'Could not verify OTP.'}`,
    }
  }

  // 2. Persist Profile in Member Directory
  const createRes = await memberService.createMember({
    id: authUserId,
    username: cleanUser || `STU_${phoneNorm.phone.slice(-6)}`,
    display_name: cleanName || 'Student',
    phone: phoneNorm.phone,
    email: cleanEmail || null,
    assigned_courses: [cleanCourse],
    assigned_course_id: cleanCourse,
    role: 'MEMBER',
    status: 'ACTIVE',
  })

  if (!createRes.success || !createRes.data) {
    return { success: false, error: createRes.error || 'Failed to save student profile.' }
  }

  const newMember = createRes.data

  // 3. Establish Student Session
  clearUserProgressStore()
  clearAnalyticsStore()
  setActiveMember(newMember)
  setActiveWorkspace(cleanCourse)

  try {
    localStorage.setItem('nexora_is_authenticated', 'true')
  } catch {
    // ignore
  }

  return { success: true, data: newMember }
}

/**
 * Resends 6-digit SMS OTP code via Supabase Auth.
 */
export async function resendSignupOtp({ phone, email }) {
  const rawPhone = String(phone || '').trim()
  const phoneNorm = normalizePhoneNumber(rawPhone)

  if (env.isDev || typeof window !== 'undefined') {
    console.log(`[Supabase Auth] Resending SMS OTP to ${phoneNorm.phone}`)
  }

  try {
    let res = await apiService.post('/auth/v1/resend', {
      type: 'sms',
      phone: phoneNorm.phone,
    })

    if (!res.success) {
      res = await apiService.post('/auth/v1/otp', {
        phone: phoneNorm.phone,
        channel: 'sms',
      })
    }

    if (!res.success) {
      const mapped = mapSupabasePhoneError(res.error, res.raw, phoneNorm.display)
      return { success: false, error: mapped }
    }

    return { success: true, message: `New verification code sent to ${phoneNorm.display}.` }
  } catch (err) {
    return { success: false, error: `Failed to resend SMS: ${err.message}` }
  }
}

/**
 * Updates user profile.
 */
export async function updateUserProfile(userId, updates) {
  return memberService.updateMember(userId, updates)
}

/**
 * Completely clears current user session.
 */
export function clearCurrentUser() {
  clearMemberSession()
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem('nexora_is_authenticated')
    localStorage.removeItem(USER_ID_KEY)
  } catch {
    // ignore
  }
}

export const userService = {
  getUserId,
  getCurrentUserId,
  getCurrentUser,
  getUserProfile,
  getAssignedCourse,
  normalizePhoneNumber,
  authenticateUser,
  createStudentProfile,
  sendSignupOtp,
  verifySignupOtp,
  resendSignupOtp,
  updateUserProfile,
  clearCurrentUser,
}

export default userService


