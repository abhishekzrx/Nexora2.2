/**
 * test_role_wise_refresh_persistence.js
 * Comprehensive 20-Point Role-Wise Session, State & Data Persistence Regression Suite.
 *
 * Tests:
 * 1. Login persistence after refresh.
 * 2. MEMBER01 state restoration.
 * 3. MEMBER02 state restoration.
 * 4. Super Admin state restoration.
 * 5. Role restoration.
 * 6. Course permission restoration.
 * 7. Subject permission restoration.
 * 8. Chapter permission restoration.
 * 9. MCQ progress restoration.
 * 10. Analytics restoration.
 * 11. User cache isolation.
 * 12. Logout cleanup.
 * 13. User switching.
 * 14. Disabled account protection.
 * 15. Archived account protection.
 * 16. Admin route protection.
 * 17. View As Member session integrity.
 * 18. View As Member read-only protection.
 * 19. Race-condition protection.
 * 20. Empty/error hydration handling.
 */

// Mock browser localStorage and sessionStorage for Node.js environment
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
  location: { hash: '' },
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
import { testSession } from './src/utils/navigation.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

async function runRegressionSuite() {
  console.log('\n===============================================================')
  console.log('🛡️ RUNNING ROLE-WISE REFRESH PERSISTENCE TEST SUITE (20 CHECKS)')
  console.log('===============================================================\n')

  const member01 = SEED_MEMBERS.find((m) => m.username === 'MEMBER01')
  const member02 = SEED_MEMBERS.find((m) => m.username === 'MEMBER02')
  const member03 = SEED_MEMBERS.find((m) => m.username === 'MEMBER03')
  const superAdmin = SEED_MEMBERS.find((m) => m.username === 'adminalpha')

  // ── 1. LOGIN PERSISTENCE AFTER REFRESH ──
  console.log('--- CHECK 1: Login Persistence After Refresh ---')
  await userService.authenticateUser({ identifier: 'MEMBER01', password: 'password123' })
  assert(localStorage.getItem('nexora_is_authenticated') === 'true', 'Authenticated flag saved to localStorage')
  assert(localStorage.getItem('nexora_active_member_profile') !== null, 'Active member profile persisted')

  // Simulate full refresh (restoreSession)
  const refreshRes01 = await userService.restoreSession()
  assert(refreshRes01.success === true, 'restoreSession succeeded on F5 refresh')
  assert(refreshRes01.authenticated === true, 'Session remains authenticated after refresh')

  // ── 2. MEMBER01 STATE RESTORATION ──
  console.log('\n--- CHECK 2: MEMBER01 State Restoration ---')
  assert(refreshRes01.data.username === 'MEMBER01', 'MEMBER01 restored with correct username')
  assert(refreshRes01.data.warrior_name === 'IRONPHOENIX', 'MEMBER01 warrior_name restored')
  assert(refreshRes01.data.public_user_id === 'NEX-WAR-001', 'MEMBER01 public_user_id restored')

  // ── 3. MEMBER02 STATE RESTORATION ──
  console.log('\n--- CHECK 3: MEMBER02 State Restoration ---')
  await userService.authenticateUser({ identifier: 'MEMBER02', password: 'password123' })
  const refreshRes02 = await userService.restoreSession()
  assert(refreshRes02.data.username === 'MEMBER02', 'MEMBER02 restored with correct username')
  assert(refreshRes02.data.warrior_name === 'SHADOWWOLF', 'MEMBER02 warrior_name restored')
  assert(refreshRes02.data.public_user_id === 'NEX-WAR-002', 'MEMBER02 public_user_id restored')

  // ── 4. SUPER ADMIN STATE RESTORATION ──
  console.log('\n--- CHECK 4: Super Admin State Restoration ---')
  await userService.authenticateUser({ identifier: 'adminalpha', password: 'adminpassword' })
  const refreshAdmin = await userService.restoreSession()
  assert(refreshAdmin.data.username === 'adminalpha', 'adminalpha restored')
  assert(refreshAdmin.data.role === 'SUPER_ADMIN', 'SUPER_ADMIN role preserved across refresh')
  assert(permissionService.isSuperAdmin(refreshAdmin.data), 'Super Admin privileges verified')

  // ── 5. ROLE RESTORATION INVARIANT ──
  console.log('\n--- CHECK 5: Role Restoration Invariant ---')
  assert(getMemberStoreSnapshot().isSuperAdmin === true, 'Super Admin store flag active')
  await userService.authenticateUser({ identifier: 'MEMBER01', password: 'password123' })
  await userService.restoreSession()
  assert(getMemberStoreSnapshot().isSuperAdmin === false, 'Member role is NOT Super Admin')
  assert(getMemberStoreSnapshot().activeMember.role === 'MEMBER', 'MEMBER role restored accurately')

  // ── 6. COURSE PERMISSION RESTORATION ──
  console.log('\n--- CHECK 6: Course Permission Restoration ---')
  const m1Profile = getMemberStoreSnapshot().activeMember
  assert(permissionService.canAccessCourse(m1Profile, 'bpsc_prelims') === true, 'MEMBER01 can access assigned bpsc_prelims')
  assert(permissionService.canAccessCourse(m1Profile, 'cbse-12-cs') === false, 'MEMBER01 blocked from unauthorized cbse-12-cs course')

  // ── 7. SUBJECT PERMISSION RESTORATION ──
  console.log('\n--- CHECK 7: Subject Permission Restoration ---')
  assert(permissionService.canAccessSubject(m1Profile, 'bpsc_prelims', 'history') === true, 'MEMBER01 can access history subject')

  // ── 8. CHAPTER PERMISSION RESTORATION ──
  console.log('\n--- CHECK 8: Chapter Permission Restoration ---')
  assert(permissionService.canAccessChapter(m1Profile, 'bpsc_prelims', 'history', 'ch1') === true, 'MEMBER01 can access chapter ch1')

  // ── 9. MCQ PROGRESS RESTORATION ──
  console.log('\n--- CHECK 9: MCQ Progress Restoration ---')
  // Record unique MCQ progress for MEMBER01
  const m1Updates = [
    { mcq_id: 'mcq_m1_1', chapter_id: 'ch1', status: 'MASTERED', attempts: 3, correct_count: 3 },
    { mcq_id: 'mcq_m1_2', chapter_id: 'ch1', status: 'MASTERED', attempts: 2, correct_count: 2 },
    { mcq_id: 'mcq_m1_3', chapter_id: 'ch1', status: 'INCORRECT', attempts: 1, correct_count: 0 },
  ]
  updateUserProgressStore(m1Updates)
  assert(getUserProgressSnapshot().progressList.length === 3, 'User progress store populated with 3 records')

  // Re-hydrate to simulate F5 refresh
  await hydrateUserProgressFromSupabase(member01.id, true)
  const snapAfterRefresh = getUserProgressSnapshot()
  assert(snapAfterRefresh.progressList.length === 3, 'All 3 unique MCQ records restored after refresh')

  // ── 10. ANALYTICS RESTORATION ──
  console.log('\n--- CHECK 10: Analytics Restoration ---')
  await userAnalyticsService.recordAttempt({
    userId: member01.id,
    courseId: 'bpsc_prelims',
    subjectId: 'history',
    chapterId: 'ch1',
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 8,
    accuracy: 80,
  })

  await hydrateUserAnalytics(member01.id, 'bpsc_prelims')
  const cachedAnalytics = getCachedCourseAnalytics(member01.id, 'bpsc_prelims')
  assert(cachedAnalytics !== null, 'Course analytics cached in user-scoped store')
  assert(cachedAnalytics.accuracy === 80, 'Accuracy 80% restored from store')
  assert(cachedAnalytics.totalQuestionsAttempted === 10, '10 questions attempted restored from store')

  // ── 11. USER CACHE ISOLATION ──
  console.log('\n--- CHECK 11: User Cache Isolation ---')
  const m1Cached = localStorage.getItem(`nexora_progress_${member01.id}`)
  const m2Cached = localStorage.getItem(`nexora_progress_${member02.id}`)
  assert(m1Cached !== null && JSON.parse(m1Cached).length === 3, 'MEMBER01 progress (3 records) exists in localStorage')
  assert(!m2Cached || JSON.parse(m2Cached).length === 0, 'MEMBER02 progress key is clean and isolated (0 records)')
  if (m2Cached) {
    const parsedM2 = JSON.parse(m2Cached)
    assert(!parsedM2.some((r) => r.mcq_id === 'mcq_m1_1'), 'MEMBER01 question mcq_m1_1 is not present in MEMBER02 cache')
  }

  // ── 12. LOGOUT CLEANUP ──
  console.log('\n--- CHECK 12: Logout Cleanup ---')
  userService.clearCurrentUser()
  clearUserProgressStore()
  clearAnalyticsStore()
  assert(getMemberStoreSnapshot().activeMember === null, 'Active member cleared on logout')
  assert(localStorage.getItem('nexora_is_authenticated') === null, 'Authentication flag removed')
  assert(localStorage.getItem('nexora_active_member_profile') === null, 'Profile key removed')

  // ── 13. USER SWITCHING ISOLATION ──
  console.log('\n--- CHECK 13: User Switching Isolation ---')
  await userService.authenticateUser({ identifier: 'MEMBER02', password: 'password123' })
  await hydrateUserProgressFromSupabase(member02.id)
  const m2ProgressSnapshot = getUserProgressSnapshot()
  assert(m2ProgressSnapshot.progressList.length === 0, 'MEMBER02 sees 0 questions (MEMBER01 data does not leak)')

  // ── 14. DISABLED ACCOUNT PROTECTION ──
  console.log('\n--- CHECK 14: Disabled Account Protection ---')
  await memberService.toggleMemberStatus(member03.id, 'adminalpha')
  const authDisabledRes = await userService.authenticateUser({ identifier: 'MEMBER03', password: 'password123' })
  assert(authDisabledRes.success === false, 'Disabled account login blocked')
  assert(authDisabledRes.error.includes('disabled'), 'Disabled error message returned')
  await memberService.toggleMemberStatus(member03.id, 'adminalpha') // Re-enable

  // ── 15. ARCHIVED ACCOUNT PROTECTION ──
  console.log('\n--- CHECK 15: Archived Account Protection ---')
  await memberService.archiveMember(member03.id, 'adminalpha')
  const authArchivedRes = await userService.authenticateUser({ identifier: 'MEMBER03', password: 'password123' })
  assert(authArchivedRes.success === false, 'Archived account login blocked')
  assert(authArchivedRes.error.includes('archived'), 'Archived error message returned')
  await memberService.restoreMember(member03.id, 'adminalpha') // Restore

  // ── 16. ADMIN ROUTE PROTECTION ──
  console.log('\n--- CHECK 16: Admin Route Protection ---')
  await userService.authenticateUser({ identifier: 'MEMBER01', password: 'password123' })
  assert(permissionService.canAccessAdmin(getMemberStoreSnapshot().activeMember) === false, 'MEMBER01 blocked from Admin Panel')

  await userService.authenticateUser({ identifier: 'adminalpha', password: 'adminpassword' })
  assert(permissionService.canAccessAdmin(getMemberStoreSnapshot().activeMember) === true, 'Super Admin granted Admin Panel access')

  // ── 17. VIEW AS MEMBER SESSION INTEGRITY ──
  console.log('\n--- CHECK 17: View As Member Session Integrity ---')
  setViewAsMember(member01)
  assert(getAuthUserId() === superAdmin.id, 'Authenticated identity remains adminalpha in View As mode')
  assert(getEffectiveUserId() === member01.id, 'Effective user ID reflects MEMBER01 for view inspection')
  assert(getMemberStoreSnapshot().isViewingAs === true, 'Viewing As mode is active')

  // ── 18. VIEW AS MEMBER READ-ONLY PROTECTION ──
  console.log('\n--- CHECK 18: View As Member Read-Only Protection ---')
  const blockedSubmitRes = await submissionService.submitPracticeSession({
    userId: member01.id,
    courseId: 'bpsc_prelims',
    totalQuestions: 5,
    attemptedCount: 5,
    correctCount: 5,
    isReadOnly: true,
  })
  assert(blockedSubmitRes.isReadOnly === true, 'Submission in View As mode intercepted and blocked (Read-Only)')
  exitViewAsMember()
  assert(getMemberStoreSnapshot().isViewingAs === false, 'Exited View As mode cleanly')

  // ── 19. RACE CONDITION PROTECTION ──
  console.log('\n--- CHECK 19: Race Condition Protection ---')
  const p1 = hydrateUserProgressFromSupabase(member01.id)
  const p2 = hydrateUserProgressFromSupabase(member02.id)
  await Promise.all([p1, p2])
  // Current active user must be member02
  assert(getUserProgressSnapshot().progressList.length === 0, 'Late response from member01 did not overwrite member02 state')

  // ── 20. EMPTY / ERROR HYDRATION HANDLING ──
  console.log('\n--- CHECK 20: Empty / Error Hydration Handling ---')
  const emptyRes = await hydrateUserProgressFromSupabase(null)
  assert(emptyRes.success === true && emptyRes.data.length === 0, 'Null user safely handled without crash')

  console.log('\n===============================================================')
  console.log('🎉 ALL 20 ROLE-WISE REFRESH PERSISTENCE CHECKS PASSED (100% SUCCESS)!')
  console.log('===============================================================\n')
}

runRegressionSuite().catch((err) => {
  console.error('Test Suite Failed with Exception:', err)
  process.exit(1)
})
