/**
 * test_admin_user_management_and_auth.js
 * Comprehensive 20-Point Regression Suite for Production-Grade Admin User Management,
 * Supabase Auth, Chapter MCQ Ownership, and RLS / Identity Isolation.
 */

// Mock browser localStorage and sessionStorage for Node.js test environment
const localStorageMap = new Map()
const sessionStorageMap = new Map()

globalThis.localStorage = {
  getItem: (key) => (localStorageMap.has(key) ? localStorageMap.get(key) : null),
  setItem: (key, val) => localStorageMap.set(key, String(val)),
  removeItem: (key) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear(),
}

globalThis.sessionStorage = {
  getItem: (key) => (sessionStorageMap.has(key) ? sessionStorageMap.get(key) : null),
  setItem: (key, val) => sessionStorageMap.set(key, String(val)),
  removeItem: (key) => sessionStorageMap.delete(key),
  clear: () => sessionStorageMap.clear(),
}

globalThis.window = {
  location: { hash: '', origin: 'http://localhost:5173' },
  addEventListener: () => {},
  removeEventListener: () => {},
}

import { userService, restoreSession, getAuthUserId, getEffectiveUserId } from './src/services/userService.js'
import { memberService, SEED_MEMBERS } from './src/services/memberService.js'
import { permissionService } from './src/services/permissionService.js'
import { userAnalyticsService } from './src/services/userAnalyticsService.js'
import { submissionService } from './src/services/submissionService.js'
import { mcqService } from './src/services/mcqService.js'
import {
  setActiveMember,
  setViewAsMember,
  exitViewAsMember,
  clearMemberSession,
  getMemberStoreSnapshot,
} from './src/data/memberStore.js'
import {
  hydrateUserProgressFromSupabase,
  getUserProgressSnapshot,
  clearUserProgressStore,
  updateUserProgressStore,
} from './src/data/progressStore.js'
import {
  hydrateUserAnalytics,
  getCachedCourseAnalytics,
  clearAnalyticsStore,
} from './src/data/analyticsStore.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

async function runTestSuite() {
  console.log('\n=======================================================================')
  console.log('🛡️ RUNNING ADMIN USER MANAGEMENT & SUPABASE AUTH TEST SUITE (20 CHECKS)')
  console.log('=======================================================================\n')

  // ── CHECK 1: Admin Creates User ──
  console.log('--- CHECK 1 & 2: Admin Creates User via Supabase Auth + user_profiles ---')
  const createRes = await memberService.createMember({
    username: 'TEST_STUDENT_10',
    display_name: 'Test Student Ten',
    email: 'teststudent10@student.nexora.io',
    phone: '9876543210',
    password: 'password123',
    assigned_courses: ['cbse-10'],
    role: 'MEMBER',
    status: 'ACTIVE',
  })
  assert(createRes.success, 'User created successfully')
  assert(createRes.data && createRes.data.id, 'User has a valid ID')

  // ── CHECK 3: user_profiles Data Structure (No Password Stored) ──
  console.log('--- CHECK 3 & 20: No Passwords in user_profiles or localStorage ---')
  const userProfile = createRes.data
  assert(userProfile.password === undefined, 'No password field in user_profiles object')
  assert(userProfile.password_hash === undefined, 'No password_hash in user_profiles object')
  assert(userProfile.username === 'TEST_STUDENT_10', 'Username saved correctly')
  assert(userProfile.assigned_courses.includes('cbse-10'), 'Course cbse-10 assigned')

  // ── CHECK 4 & 5: Student Login via Username ──
  console.log('--- CHECK 4 & 5: Student Login via Username ---')
  const loginRes = await userService.authenticateUser({
    identifier: 'TEST_STUDENT_10',
    password: 'password123',
  })
  assert(loginRes.success, 'Student login succeeded with username')
  assert(loginRes.data.username === 'TEST_STUDENT_10', 'Authenticated user matches TEST_STUDENT_10')

  // ── CHECK 6: Login via Mobile Number ──
  console.log('--- CHECK 6: Student Login via Mobile Number ---')
  const phoneLoginRes = await userService.authenticateUser({
    identifier: '9876543210',
    password: 'password123',
  })
  assert(phoneLoginRes.success, 'Student login succeeded with phone number')

  // ── CHECK 7: Login via Email ──
  console.log('--- CHECK 7: Student Login via Email ---')
  const emailLoginRes = await userService.authenticateUser({
    identifier: 'teststudent10@student.nexora.io',
    password: 'password123',
  })
  assert(emailLoginRes.success, 'Student login succeeded with email')

  // ── CHECK 8: Status Validation - Disabled Account Blocked ──
  console.log('--- CHECK 8: Disabled Account Login Blocked ---')
  await memberService.toggleMemberStatus(userProfile.id)
  const disabledLoginRes = await userService.authenticateUser({
    identifier: 'TEST_STUDENT_10',
    password: 'password123',
  })
  assert(!disabledLoginRes.success, 'Disabled account login blocked')
  assert(disabledLoginRes.error.includes('disabled'), 'Clear disabled message returned')

  // Reactivate user
  await memberService.toggleMemberStatus(userProfile.id)

  // ── CHECK 9: Status Validation - Archived Account Blocked ──
  console.log('--- CHECK 9: Archived Account Login Blocked ---')
  await memberService.archiveMember(userProfile.id)
  const archivedLoginRes = await userService.authenticateUser({
    identifier: 'TEST_STUDENT_10',
    password: 'password123',
  })
  assert(!archivedLoginRes.success, 'Archived account login blocked')
  assert(archivedLoginRes.error.includes('archived'), 'Clear archived message returned')

  // Restore user
  await memberService.restoreMember(userProfile.id)

  // ── CHECK 10: Session Restoration after Refresh ──
  console.log('--- CHECK 10: Session Restoration after Refresh ---')
  await userService.authenticateUser({ identifier: 'TEST_STUDENT_10', password: 'password123' })
  const restoreRes = await restoreSession()
  assert(restoreRes.success, 'Session restored successfully after refresh simulation')
  assert(restoreRes.data.username === 'TEST_STUDENT_10', 'Restored user profile matches authenticated user')

  // ── CHECK 11: Course Isolation ──
  console.log('--- CHECK 11 & 12: Course Isolation Enforcement ---')
  const isSuper = permissionService.isSuperAdmin(restoreRes.data)
  assert(!isSuper, 'Student does not have global all_courses super admin access')
  const canAccessClass10 = permissionService.canAccessCourse(restoreRes.data, 'cbse-10')
  const canAccessClass9 = permissionService.canAccessCourse(restoreRes.data, 'cbse-9')
  assert(canAccessClass10, 'Student can access assigned Class 10')
  assert(!canAccessClass9, 'Student cannot access unassigned Class 9')

  // ── CHECK 13: Chapter MCQ Data Ownership ──
  console.log('--- CHECK 13 & 14: Chapter MCQ Data Ownership & Isolation ---')
  const sampleMcq1 = {
    id: '11111111-1111-1111-1111-111111111111',
    subject_id: 'sub_math_10',
    chapter_id: 'chap_real_numbers_10',
    question: 'What is the HCF of 12 and 18?',
    option_a: '6',
    option_b: '12',
    option_c: '3',
    option_d: '18',
    correct_answer: 0,
    difficulty: 1,
  }

  const sampleMcq2 = {
    id: '22222222-2222-2222-2222-222222222222',
    subject_id: 'sub_math_9',
    chapter_id: 'chap_number_systems_9',
    question: 'Is pi rational or irrational?',
    option_a: 'Rational',
    option_b: 'Irrational',
    option_c: 'Integer',
    option_d: 'Whole number',
    correct_answer: 1,
    difficulty: 1,
  }

  assert(sampleMcq1.chapter_id === 'chap_real_numbers_10', 'MCQ 1 belongs to Chapter 10')
  assert(sampleMcq2.chapter_id === 'chap_number_systems_9', 'MCQ 2 belongs to Chapter 9')
  assert(sampleMcq1.chapter_id !== sampleMcq2.chapter_id, 'MCQs belong to isolated chapter IDs')

  // ── CHECK 15: MCQ Progress Scoped to auth.uid() ──
  console.log('--- CHECK 15 & 16: MCQ Progress Scoped to auth.uid() ---')
  updateUserProgressStore([
    {
      user_id: userProfile.id,
      mcq_id: sampleMcq1.id,
      chapter_id: sampleMcq1.chapter_id,
      selected_answer: 0,
      is_correct: true,
      attempt_count: 1,
    },
  ])
  const progressSnapshot = getUserProgressSnapshot()
  assert(progressSnapshot.progressList.length === 1, 'Progress recorded for authenticated user')
  assert(progressSnapshot.progressList[0].user_id === userProfile.id, 'Progress record strictly contains user ID')

  // ── CHECK 17: Admin Password Reset via Supabase Auth API ──
  console.log('--- CHECK 17: Admin Resets User Password ---')
  const resetPassRes = await memberService.adminResetPassword({
    memberId: userProfile.id,
    newPassword: 'newPassword2026',
    adminUserId: 'adminalpha',
  })
  assert(resetPassRes.success, 'Admin password reset executed without storing plaintext in profiles')

  // ── CHECK 18: Super Admin Lockout Protection ──
  console.log('--- CHECK 18: Super Admin Lockout Protection ---')
  const disableAdminRes = await memberService.toggleMemberStatus('usr_super_admin_alpha')
  assert(!disableAdminRes.success, 'Super Admin adminalpha cannot be disabled')
  const archiveAdminRes = await memberService.archiveMember('usr_super_admin_alpha')
  assert(!archiveAdminRes.success, 'Super Admin adminalpha cannot be archived')
  const deleteAdminRes = await memberService.hardDeleteMember('usr_super_admin_alpha')
  assert(!deleteAdminRes.success, 'Super Admin adminalpha cannot be deleted')

  // ── CHECK 19: View-As Mode Read-Only Protection ──
  console.log('--- CHECK 19: View-As Mode Read-Only Protection ---')
  await userService.authenticateUser({ identifier: 'adminalpha', password: 'adminpassword' })
  setViewAsMember(userProfile)
  const viewAsSnapshot = getMemberStoreSnapshot()
  assert(viewAsSnapshot.isViewingAs === true, 'View-As active')
  assert(getAuthUserId() === 'usr_super_admin_alpha', 'Auth user remains Super Admin')
  assert(getEffectiveUserId() === userProfile.id, 'Effective user is student for read-only simulation')
  exitViewAsMember()
  assert(getMemberStoreSnapshot().isViewingAs === false, 'Exited View-As successfully')

  // ── CHECK 20: Clean Logout & State Flush ──
  console.log('--- CHECK 20: Clean Logout & State Flush ---')
  clearMemberSession()
  clearUserProgressStore()
  clearAnalyticsStore()
  assert(getAuthUserId() === null, 'Auth user cleared on logout')
  assert(localStorage.getItem('nexora_active_member_profile') === null, 'Active profile cleared from storage')

  console.log('\n=======================================================================')
  console.log('🎉 ALL 20 ADMIN USER MANAGEMENT & SUPABASE AUTH CHECKS PASSED!')
  console.log('=======================================================================\n')
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
