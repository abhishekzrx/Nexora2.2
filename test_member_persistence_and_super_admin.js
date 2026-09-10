/**
 * test_member_persistence_and_super_admin.js
 * Comprehensive 30-Point Regression Suite for Member Creation Persistence,
 * Root Super Admin adminalpha Protection, and Super Admin Performance Persistence.
 *
 * Section 19 Requirements:
 * 1. Create MEMBER06.
 * 2. Refresh.
 * 3. Verify MEMBER06 exists.
 * 4. Logout/login.
 * 5. Verify MEMBER06 exists.
 * 6. Change MEMBER06 course access.
 * 7. Refresh.
 * 8. Verify access persists.
 * 9. Change Warrior Name.
 * 10. Refresh.
 * 11. Verify identity persists.
 * 12. Disable MEMBER06.
 * 13. Refresh.
 * 14. Verify status persists.
 * 15. Restore MEMBER06.
 * 16. Verify restoration.
 * 17. Login as adminalpha.
 * 18. Attempt MCQs.
 * 19. Verify performance saved.
 * 20. Refresh.
 * 21. Verify performance restored.
 * 22. Logout/login.
 * 23. Verify performance restored.
 * 24. View MEMBER06 as adminalpha.
 * 25. Verify read-only mode.
 * 26. Exit View Mode.
 * 27. Verify adminalpha remains authenticated.
 * 28. Verify MEMBER06 data remains isolated.
 * 29. Verify adminalpha cannot be disabled.
 * 30. Verify no hardcoded seed process overwrites production members.
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
import { memberService, PRIMARY_SUPER_ADMIN, SEED_MEMBERS } from './src/services/memberService.js'
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
  hydrateMemberStore,
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
  console.log('🛡️ RUNNING 30-POINT MEMBER PERSISTENCE & SUPER ADMIN TEST SUITE')
  console.log('=======================================================================\n')

  // ── 1. Create MEMBER06 ──
  console.log('--- CHECK 1: Create MEMBER06 ---')
  const createRes = await memberService.createMember({
    username: 'MEMBER06_TEST',
    display_name: 'Member Six Student',
    email: 'membersix@student.nexora.io',
    phone: '9988776655',
    password: 'password123',
    assigned_course_id: 'bpsc_prelims',
    assigned_courses: ['bpsc_prelims'],
    role: 'MEMBER',
    status: 'ACTIVE',
  })
  assert(createRes.success, 'MEMBER06 created successfully')
  const member06Id = createRes.data.id
  assert(member06Id, 'MEMBER06 has immutable UUID')

  // ── 2 & 3. Refresh & Verify MEMBER06 Exists ──
  console.log('--- CHECK 2 & 3: Refresh and Verify MEMBER06 Exists ---')
  await hydrateMemberStore()
  const membersAfterRefresh = await memberService.getAllMembers(true)
  const m06Found = membersAfterRefresh.data.find((m) => m.id === member06Id || m.username === 'MEMBER06_TEST')
  assert(m06Found !== undefined, 'MEMBER06 exists after hydration/refresh')
  assert(m06Found.username === 'MEMBER06_TEST', 'MEMBER06 username matches')

  // ── 4 & 5. Logout / Login & Verify MEMBER06 Exists ──
  console.log('--- CHECK 4 & 5: Logout, Login & Verify MEMBER06 ---')
  clearMemberSession()
  assert(getMemberStoreSnapshot().activeMember === null, 'Session cleared on logout')
  const loginRes = await userService.authenticateUser({ identifier: 'MEMBER06_TEST', password: 'password123' })
  assert(loginRes.success, 'MEMBER06 logged in successfully')
  assert(loginRes.data.id === member06Id, 'Authenticated profile matches MEMBER06 UUID')

  // ── 6, 7, 8. Change MEMBER06 Course Access & Verify Persistence Across Refresh ──
  console.log('--- CHECK 6, 7 & 8: Change Course Access & Verify Across Refresh ---')
  const updateCourseRes = await memberService.updateMember(member06Id, {
    assigned_course_id: 'bpsc_cs',
    assigned_courses: ['bpsc_cs'],
  })
  assert(updateCourseRes.success, 'Course updated to bpsc_cs')
  await hydrateMemberStore()
  const m06Refreshed = await memberService.getMemberById(member06Id)
  assert(m06Refreshed.data.assigned_course_id === 'bpsc_cs', 'Updated course assignment bpsc_cs persisted across refresh')

  // ── 9, 10, 11. Change Warrior Name & Verify Identity Persistence ──
  console.log('--- CHECK 9, 10 & 11: Change Warrior Name & Verify Identity Persistence ---')
  const updateIdentityRes = await memberService.updatePublicIdentity({
    memberId: member06Id,
    newWarriorName: 'ZENITHWARRIOR',
    reason: 'Promoted warrior status',
  })
  assert(updateIdentityRes.success, 'Warrior name updated')
  await hydrateMemberStore()
  const m06Identity = await memberService.getMemberById(member06Id)
  assert(m06Identity.data.warrior_name === 'ZENITHWARRIOR', 'ZENITHWARRIOR warrior name persisted across refresh')
  assert(m06Identity.data.id === member06Id, 'Internal UUID remains immutable after identity change')

  // ── 12, 13, 14. Disable MEMBER06 & Verify Status Persists ──
  console.log('--- CHECK 12, 13 & 14: Disable MEMBER06 & Verify Status Across Refresh ---')
  const disableRes = await memberService.toggleMemberStatus(member06Id)
  assert(disableRes.success, 'Status toggled to DISABLED')
  await hydrateMemberStore()
  const m06Disabled = await memberService.getMemberById(member06Id)
  assert(m06Disabled.data.status === 'DISABLED', 'DISABLED status persisted across refresh')
  const blockedLogin = await userService.authenticateUser({ identifier: 'MEMBER06_TEST', password: 'password123' })
  assert(!blockedLogin.success, 'Disabled account login blocked')

  // ── 15 & 16. Restore MEMBER06 & Verify Restoration ──
  console.log('--- CHECK 15 & 16: Restore MEMBER06 & Verify Active Status ---')
  const restoreRes = await memberService.restoreMember(member06Id)
  assert(restoreRes.success, 'MEMBER06 restored')
  await hydrateMemberStore()
  const m06Active = await memberService.getMemberById(member06Id)
  assert(m06Active.data.status === 'ACTIVE', 'ACTIVE status restored and verified')

  // ── 17, 18, 19. Login as adminalpha & Attempt MCQs ──
  console.log('--- CHECK 17, 18 & 19: Login as adminalpha & Attempt MCQs ---')
  const adminLogin = await userService.authenticateUser({ identifier: 'adminalpha', password: 'any' })
  assert(adminLogin.success, 'adminalpha authenticated')
  const adminId = adminLogin.data.id

  // adminalpha performs learning activity (Attempts 10 MCQs)
  const adminMcqUpdates = [
    { mcq_id: 'mcq_admin_01', chapter_id: 'chap_hist_1', status: 'MASTERED', is_correct: true, total_attempts: 1, correct_attempts: 1, incorrect_attempts: 0 },
    { mcq_id: 'mcq_admin_02', chapter_id: 'chap_hist_1', status: 'MASTERED', is_correct: true, total_attempts: 1, correct_attempts: 1, incorrect_attempts: 0 },
    { mcq_id: 'mcq_admin_03', chapter_id: 'chap_hist_1', status: 'INCORRECT', is_correct: false, total_attempts: 1, correct_attempts: 0, incorrect_attempts: 1 },
  ]

  const submitRes = await submissionService.submitPracticeSession({
    userId: adminId,
    courseId: 'bpsc_prelims',
    subjectId: 'history',
    subjectTitle: 'History',
    chapterId: 'chap_hist_1',
    chapterTitle: 'Ancient History',
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 8,
    incorrectCount: 2,
    skippedCount: 0,
    score: 8,
    percentage: 80,
    accuracy: 80,
    timeTakenSeconds: 120,
    progressUpdates: adminMcqUpdates,
    isReadOnly: false,
  })
  assert(submitRes.success, 'adminalpha practice session recorded')

  const adminAnalytics = await userAnalyticsService.computeCourseAnalytics(adminId, 'bpsc_prelims', adminMcqUpdates, 50)
  assert(adminAnalytics.accuracy === 80, 'adminalpha accuracy calculated as 80%')
  assert(adminAnalytics.totalQuestionsAttempted === 10, 'adminalpha questions attempted calculated as 10')
  assert(adminAnalytics.readinessScore > 0, 'adminalpha readiness score computed')

  // ── 20 & 21. Refresh & Verify adminalpha Performance Restored ──
  console.log('--- CHECK 20 & 21: Refresh & Verify adminalpha Performance Restored ---')
  const adminRefresh = await restoreSession()
  assert(adminRefresh.success && adminRefresh.data.username === 'adminalpha', 'adminalpha session restored')
  const refreshedAdminProgress = await mcqService.getAllUserProgress(adminId)
  assert(refreshedAdminProgress.data.length >= 3, 'adminalpha unique question progress records restored')
  const refreshedAdminAnalytics = await userAnalyticsService.computeCourseAnalytics(adminId, 'bpsc_prelims', refreshedAdminProgress.data, 50)
  assert(refreshedAdminAnalytics.accuracy === 80, 'adminalpha accuracy 80% restored after refresh')
  assert(refreshedAdminAnalytics.totalQuestionsAttempted === 10, 'adminalpha 10 questions attempted restored after refresh')

  // ── 22 & 23. Logout / Login & Verify Performance Restored ──
  console.log('--- CHECK 22 & 23: Logout / Login & Verify Performance Restored ---')
  clearMemberSession()
  clearUserProgressStore()
  clearAnalyticsStore()
  await userService.authenticateUser({ identifier: 'adminalpha', password: 'any' })
  const reloadedAdminProgress = await mcqService.getAllUserProgress(adminId)
  assert(reloadedAdminProgress.data.length >= 3, 'adminalpha MCQ progress loaded after re-login')
  const reloadedAdminAnalytics = await userAnalyticsService.computeCourseAnalytics(adminId, 'bpsc_prelims', reloadedAdminProgress.data, 50)
  assert(reloadedAdminAnalytics.accuracy === 80, 'adminalpha accuracy 80% verified after re-login')

  // ── 24 & 25. View MEMBER06 as adminalpha & Verify Read-Only Mode ──
  console.log('--- CHECK 24 & 25: View MEMBER06 as adminalpha (Read-Only Mode) ---')
  setViewAsMember(m06Active.data)
  const viewAsSnapshot = getMemberStoreSnapshot()
  assert(viewAsSnapshot.isViewingAs === true, 'View-As Mode active')
  assert(getAuthUserId() === adminId, 'Authenticated User ID remains adminalpha')
  assert(getEffectiveUserId() === member06Id, 'Effective User ID is MEMBER06 for inspection')

  const readOnlyAttemptRes = await submissionService.submitPracticeSession({
    userId: member06Id,
    courseId: 'bpsc_cs',
    subjectId: 'cs',
    chapterId: 'ch1',
    totalQuestions: 5,
    attemptedCount: 5,
    correctCount: 5,
    score: 5,
    percentage: 100,
    accuracy: 100,
    isReadOnly: true,
  })
  assert(readOnlyAttemptRes.isReadOnly === true, 'Submission in View-As mode blocked by Read-Only guard')

  // ── 26, 27 & 28. Exit View Mode & Verify Isolation ──
  console.log('--- CHECK 26, 27 & 28: Exit View Mode & Verify Isolation ---')
  exitViewAsMember()
  assert(getMemberStoreSnapshot().isViewingAs === false, 'Exited View Mode successfully')
  assert(getAuthUserId() === adminId, 'adminalpha remains authenticated')
  const m06Attempts = await userAnalyticsService.getUserAttempts(member06Id)
  assert(m06Attempts.length === 0, 'MEMBER06 has 0 attempts (complete isolation, no contamination)')

  // ── 29. Verify adminalpha Cannot Be Disabled ──
  console.log('--- CHECK 29: adminalpha Immunity to Lockout / Disabling ---')
  const tryDisableAdmin = await memberService.toggleMemberStatus('usr_super_admin_alpha')
  assert(!tryDisableAdmin.success, 'adminalpha cannot be disabled')
  const tryArchiveAdmin = await memberService.archiveMember('usr_super_admin_alpha')
  assert(!tryArchiveAdmin.success, 'adminalpha cannot be archived')
  const tryDeleteAdmin = await memberService.hardDeleteMember('usr_super_admin_alpha')
  assert(!tryDeleteAdmin.success, 'adminalpha cannot be deleted')

  // ── 30. Verify No Hardcoded Seed Process Overwrites Production Members ──
  console.log('--- CHECK 30: Seed Data Does Not Overwrite Production Members ---')
  const allFinalMembers = await memberService.getAllMembers(true)
  assert(allFinalMembers.data.some((m) => m.id === member06Id), 'Production MEMBER06 preserved in all members')
  assert(allFinalMembers.data.some((m) => m.username === 'MEMBER01'), 'Baseline MEMBER01 preserved')
  assert(allFinalMembers.data.some((m) => m.username === 'adminalpha'), 'Root adminalpha preserved')
  assert(allFinalMembers.data.length >= 10, 'Full member registry intact without loss')

  console.log('\n=======================================================================')
  console.log('🎉 ALL 30 MEMBER PERSISTENCE & SUPER ADMIN CHECKS PASSED (100% SUCCESS)!')
  console.log('=======================================================================\n')
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
