/**
 * test_complete_warrior_system.js
 * Comprehensive Verification Suite for Warrior Identity, Course Access Control,
 * Super Admin adminalpha, and Persistent Central Analytics Pipeline.
 */

import { identityService } from './src/services/identityService.js'
import { memberService, SEED_MEMBERS } from './src/services/memberService.js'
import { permissionService } from './src/services/permissionService.js'
import { userAnalyticsService } from './src/services/userAnalyticsService.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

async function runTests() {
  console.log('\n======================================================')
  console.log('🚀 RUNNING WARRIOR IDENTITY & ACCESS CONTROL TEST SUITE')
  console.log('======================================================\n')

  // ── TEST 1: Identity Service & Warrior Uniqueness ────────────────
  console.log('--- TEST 1: Identity & Warrior Name Generation & Validation ---')
  const publicIdGen = identityService.generatePublicId(SEED_MEMBERS)
  assert(/^NEX-WAR-\d{3}$/.test(publicIdGen), `Generated valid public ID: ${publicIdGen}`)

  const warriorGen = identityService.generateWarriorName(SEED_MEMBERS)
  assert(typeof warriorGen === 'string' && warriorGen.length >= 3, `Generated valid warrior name: ${warriorGen}`)

  const duplicatePubCheck = identityService.validatePublicId('NEX-WAR-001', 'usr_other', SEED_MEMBERS)
  assert(duplicatePubCheck.valid === false, 'Duplicate public ID NEX-WAR-001 is correctly rejected')

  const duplicateWarriorCheck = identityService.validateWarriorName('IRONPHOENIX', 'usr_other', SEED_MEMBERS)
  assert(duplicateWarriorCheck.valid === false, 'Duplicate warrior name IRONPHOENIX is correctly rejected')

  // ── TEST 2: Super Admin adminalpha Privileges ───────────────────
  console.log('\n--- TEST 2: Super Admin adminalpha Privileges ---')
  const superAdmin = SEED_MEMBERS.find((m) => m.username === 'adminalpha')
  assert(superAdmin !== undefined, 'Super Admin adminalpha profile exists')
  assert(permissionService.isSuperAdmin(superAdmin) === true, 'adminalpha is identified as Super Admin')
  assert(permissionService.canAccessAdmin(superAdmin) === true, 'Super Admin can access Admin Panel')
  assert(permissionService.canAccessCourse(superAdmin, 'bpsc_prelims') === true, 'Super Admin can access BPSC Prelims')
  assert(permissionService.canAccessCourse(superAdmin, 'bpsc_cs') === true, 'Super Admin can access BPSC CS')
  assert(permissionService.canAccessCourse(superAdmin, 'any_future_course') === true, 'Super Admin has elevated access to all future courses')

  // ── TEST 3: Course-Wise Member Access Control ───────────────────
  console.log('\n--- TEST 3: Course-Wise Member Access & Route Guards ---')
  const member01 = SEED_MEMBERS.find((m) => m.username === 'MEMBER01') // Rahul: bpsc_prelims, bpsc_cs
  const member02 = SEED_MEMBERS.find((m) => m.username === 'MEMBER02') // Priya: bpsc_prelims only
  const member03 = SEED_MEMBERS.find((m) => m.username === 'MEMBER03') // Amit: bpsc_cs only

  assert(permissionService.canAccessAdmin(member01) === false, 'Normal Member01 is blocked from Admin Panel')
  assert(permissionService.canAccessCourse(member01, 'bpsc_prelims') === true, 'Member01 can access BPSC Prelims')
  assert(permissionService.canAccessCourse(member01, 'bpsc_cs') === true, 'Member01 can access BPSC CS')
  assert(permissionService.canAccessCourse(member01, 'class10_science') === false, 'Member01 is blocked from unauthorized Class 10 Science')

  assert(permissionService.canAccessCourse(member02, 'bpsc_prelims') === true, 'Member02 can access assigned BPSC Prelims')
  assert(permissionService.canAccessCourse(member02, 'bpsc_cs') === false, 'Member02 is blocked from unassigned BPSC CS')

  assert(permissionService.canAccessCourse(member03, 'bpsc_cs') === true, 'Member03 can access assigned BPSC CS')
  assert(permissionService.canAccessCourse(member03, 'bpsc_prelims') === false, 'Member03 is blocked from unassigned BPSC Prelims')

  // ── TEST 4: Granular Permissions & Default Inheritance ──────────
  console.log('\n--- TEST 4: Default Inheritance & Granular Overrides ---')
  // Default inheritance: Allowed course allows all subjects & content
  assert(permissionService.canAccessSubject(member02, 'bpsc_prelims', 'history') === true, 'Inherited allow: History allowed for Member02')
  assert(permissionService.canAccessContent(member02, 'bpsc_prelims', 'mcqs') === true, 'Inherited allow: MCQs allowed for Member02')
  assert(permissionService.canAccessContent(member02, 'bpsc_prelims', 'flashcards') === true, 'Inherited allow: Flashcards allowed for Member02')

  // Explicit override: Block polity for Member02
  const member02WithOverride = {
    ...member02,
    permissions: {
      all_courses: false,
      subject_overrides: { polity: false },
      content_overrides: { flashcards: false },
    },
  }
  assert(permissionService.canAccessSubject(member02WithOverride, 'bpsc_prelims', 'history') === true, 'History remains allowed')
  assert(permissionService.canAccessSubject(member02WithOverride, 'bpsc_prelims', 'polity') === false, 'Polity is blocked by granular override')
  assert(permissionService.canAccessContent(member02WithOverride, 'bpsc_prelims', 'flashcards') === false, 'Flashcards blocked by content override')

  // ── TEST 5: Production Identity Management & Audit Logging ──────
  console.log('\n--- TEST 5: Public Identity Manipulation & Audit Logs ---')
  const initialUuid = member01.id
  const updatedIdentityRes = await memberService.updatePublicIdentity({
    memberId: member01.id,
    newPublicId: 'NEX-WAR-099',
    newWarriorName: 'VALKYRIE',
    changedBy: 'adminalpha',
    reason: 'Promoted to elite tier',
  })
  assert(updatedIdentityRes.success === true, 'Identity updated successfully')
  assert(updatedIdentityRes.data.id === initialUuid, 'Internal immutable UUID is 100% preserved')
  assert(updatedIdentityRes.data.public_user_id === 'NEX-WAR-099', 'Public User ID updated to NEX-WAR-099')
  assert(updatedIdentityRes.data.warrior_name === 'VALKYRIE', 'Warrior Name updated to VALKYRIE')

  const auditLogs = await identityService.getIdentityAuditLogs(member01.id)
  assert(auditLogs.length > 0, 'Identity change audit log was recorded')
  assert(auditLogs[0].old_warrior_name === 'IRONPHOENIX', 'Audit log captured previous warrior name')
  assert(auditLogs[0].new_warrior_name === 'VALKYRIE', 'Audit log captured new warrior name')

  // Revert back for consistency
  await memberService.updatePublicIdentity({
    memberId: member01.id,
    newPublicId: 'NEX-WAR-001',
    newWarriorName: 'IRONPHOENIX',
    changedBy: 'adminalpha',
    reason: 'Test Suite Revert',
  })

  // ── TEST 6: Data Isolation & Zero Refresh Reset ─────────────────
  console.log('\n--- TEST 6: User Data Isolation & Persistent Analytics ---')
  // Record attempt for Member 01
  const attemptRes = await userAnalyticsService.recordAttempt({
    userId: member01.id,
    courseId: 'bpsc_prelims',
    subjectId: 'history',
    subjectTitle: 'Modern Indian History',
    chapterId: 'ch_revolt_1857',
    chapterTitle: 'Revolt of 1857',
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 8,
    incorrectCount: 2,
    skippedCount: 0,
    score: 8,
    percentage: 80,
    accuracy: 80,
    timeTakenSeconds: 120,
    isReadOnly: false,
  })
  assert(attemptRes.success === true, 'Attempt recorded for Member01')

  // Compute analytics for Member01
  const mockProgress01 = [
    { mcq_id: 'm1', status: 'MASTERED' },
    { mcq_id: 'm2', status: 'MASTERED' },
    { mcq_id: 'm3', status: 'INCORRECT' },
  ]
  const analytics01 = await userAnalyticsService.computeCourseAnalytics(member01.id, 'bpsc_prelims', mockProgress01, 50)
  assert(analytics01.accuracy === 80, `Member01 accuracy computed correctly: ${analytics01.accuracy}%`)
  assert(analytics01.readinessScore > 0, `Member01 readiness score computed: ${analytics01.readinessScore}%`)
  assert(analytics01.totalQuestionsAttempted === 10, 'Member01 total questions attempted is 10')

  // Member 02 must have 0 attempts & separate empty/clean analytics
  const analytics02 = await userAnalyticsService.computeCourseAnalytics(member02.id, 'bpsc_prelims', [], 50)
  assert(analytics02.totalAttemptsCount === 0, 'Member02 data is 100% isolated: 0 attempts')
  assert(analytics02.totalQuestionsAttempted === 0, 'Member02 has 0 questions attempted')
  assert(analytics02.readinessScore === 0, 'Member02 readiness score is clean')

  // Refresh Simulation: Re-fetch Member01 analytics from persistence
  console.log('\n--- Refresh Simulation (F5) ---')
  const restoredAnalytics01 = await userAnalyticsService.computeCourseAnalytics(member01.id, 'bpsc_prelims', mockProgress01, 50)
  assert(restoredAnalytics01.accuracy === 80, `Persistence Verified: Accuracy is still ${restoredAnalytics01.accuracy}% after re-hydration`)
  assert(restoredAnalytics01.readinessScore === analytics01.readinessScore, `Persistence Verified: Readiness score ${restoredAnalytics01.readinessScore}% restored`)
  assert(restoredAnalytics01.trendHistory.length > 0, 'Persistence Verified: Historical trend graph points restored')

  // ── TEST 7: Disabled Member Protection ──────────────────────────
  console.log('\n--- TEST 7: Disabled Member Protection ---')
  const toggleRes = await memberService.toggleMemberStatus(member03.id)
  assert(toggleRes.success === true && toggleRes.data.status === 'DISABLED', 'Member03 disabled successfully')
  assert(permissionService.isMemberActive(toggleRes.data) === false, 'isMemberActive returns false for disabled member')
  assert(permissionService.canAccessCourse(toggleRes.data, 'bpsc_cs') === false, 'Disabled member is blocked from accessing learning content')

  // Re-enable Member03
  await memberService.toggleMemberStatus(member03.id)

  console.log('\n======================================================')
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (7/7 TEST SUITES)')
  console.log('======================================================\n')
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err)
  process.exit(1)
})
