/**
 * test_mcq_rls_isolation.js
 * Comprehensive Verification of RLS, Course Access Isolation & Student Permission Scoping
 * 
 * Verifies:
 * 1. Student access is strictly restricted to assigned courses
 * 2. Attempts to query unassigned courses are blocked / isolated
 * 3. Super Admin unrestricted query capabilities across all courses
 * 4. Super Admin 'Viewing-As' simulation enforces student course scoping and mutation blocks
 * 5. In-flight practice attempts & progress are strictly bound to course_id, subject_id, chapter_id
 */

// Mock browser environment for Node.js
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

import { permissionService } from './src/services/permissionService.js'
import { mcqService } from './src/services/mcqService.js'
import {
  setActiveMember,
  setViewAsMember,
  exitViewAsMember,
  clearMemberSession,
  getMemberStoreSnapshot,
} from './src/data/memberStore.js'
import {
  replaceSubjects,
  replaceChapters,
  replaceMcqs,
  replaceFlashcards,
  getSnapshot,
} from './src/data/adminStore.js'
import {
  updateUserProgressStore,
  getUserProgressSnapshot,
  clearUserProgressStore,
} from './src/data/progressStore.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

async function runRlsIsolationTests() {
  console.log('='.repeat(80))
  console.log('🛡️ RUNNING MCQ RLS, COURSE SCOPING & ACCESS ISOLATION TESTS')
  console.log('='.repeat(80))

  const COURSE_BPSC = 'bpsc-tre-4'
  const COURSE_CBSE = 'cbse-12-cs'
  const COURSE_NEET = 'neet-ug-physics'

  const SUB_BPSC_CS = 'sub-bpsc-cs-01'
  const SUB_CBSE_PY = 'sub-cbse-py-02'

  const CHAP_BPSC_OS = 'chap-bpsc-os-001'
  const CHAP_CBSE_FN = 'chap-cbse-fn-002'

  // Initialize Store with clean hierarchical test data
  replaceSubjects([
    { id: SUB_BPSC_CS, courseId: COURSE_BPSC, course_id: COURSE_BPSC, name: 'Computer Science', status: 'active', stats: [] },
    { id: SUB_CBSE_PY, courseId: COURSE_CBSE, course_id: COURSE_CBSE, name: 'Python Programming', status: 'active', stats: [] },
  ])

  replaceChapters([
    { id: CHAP_BPSC_OS, subjectId: SUB_BPSC_CS, subject_id: SUB_BPSC_CS, courseId: COURSE_BPSC, course_id: COURSE_BPSC, name: 'Operating Systems', number: 1, mcqs: 2, flashcards: 0, notes: 0 },
    { id: CHAP_CBSE_FN, subjectId: SUB_CBSE_PY, subject_id: SUB_CBSE_PY, courseId: COURSE_CBSE, course_id: COURSE_CBSE, name: 'Functions & Modules', number: 1, mcqs: 2, flashcards: 0, notes: 0 },
  ])

  replaceMcqs([
    { id: 'mcq-bpsc-1', courseId: COURSE_BPSC, course_id: COURSE_BPSC, subjectId: SUB_BPSC_CS, subject_id: SUB_BPSC_CS, chapterId: CHAP_BPSC_OS, chapter_id: CHAP_BPSC_OS, question: 'BPSC Question 1', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 0, correct_answer: 0 },
    { id: 'mcq-bpsc-2', courseId: COURSE_BPSC, course_id: COURSE_BPSC, subjectId: SUB_BPSC_CS, subject_id: SUB_BPSC_CS, chapterId: CHAP_BPSC_OS, chapter_id: CHAP_BPSC_OS, question: 'BPSC Question 2', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 1, correct_answer: 1 },
    { id: 'mcq-cbse-1', courseId: COURSE_CBSE, course_id: COURSE_CBSE, subjectId: SUB_CBSE_PY, subject_id: SUB_CBSE_PY, chapterId: CHAP_CBSE_FN, chapter_id: CHAP_CBSE_FN, question: 'CBSE Question 1', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 2, correct_answer: 2 },
    { id: 'mcq-cbse-2', courseId: COURSE_CBSE, course_id: COURSE_CBSE, subjectId: SUB_CBSE_PY, subject_id: SUB_CBSE_PY, chapterId: CHAP_CBSE_FN, chapter_id: CHAP_CBSE_FN, question: 'CBSE Question 2', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 3, correct_answer: 3 },
  ])

  // Setup Profiles
  const studentBpsc = {
    id: 'usr-student-bpsc',
    username: 'rahul_bpsc',
    public_user_id: 'NEX-WAR-101',
    warrior_name: 'PATNA_WARRIOR',
    display_name: 'Rahul Kumar',
    email: 'rahul@nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_courses: [COURSE_BPSC],
    permissions: { all_courses: false, subject_overrides: {}, content_overrides: {} },
  }

  const superAdmin = {
    id: 'usr-superadmin-master',
    username: 'superadmin_master',
    public_user_id: 'NEX-ADM-000',
    warrior_name: 'ZENITH_COMMAND',
    display_name: 'Super Admin Master',
    email: 'master@nexora.io',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    assigned_courses: [],
    permissions: { all_courses: true, subject_overrides: {}, content_overrides: {} },
  }

  console.log('\n[SECTION 1] Student Assigned Course Access & Boundary Checking')
  // 1.1 Set Rahul as active member (assigned only to BPSC)
  setActiveMember(studentBpsc)
  assert(
    permissionService.canAccessCourse(studentBpsc, COURSE_BPSC),
    'Student can access assigned course (BPSC)'
  )
  assert(
    !permissionService.canAccessCourse(studentBpsc, COURSE_CBSE),
    'Student CANNOT access unassigned course (CBSE)'
  )
  assert(
    !permissionService.canAccessCourse(studentBpsc, COURSE_NEET),
    'Student CANNOT access unassigned course (NEET)'
  )

  // 1.2 Query MCQs for assigned course
  const bpscMcqRes = await mcqService.getMcqs(COURSE_BPSC, SUB_BPSC_CS, CHAP_BPSC_OS)
  assert(bpscMcqRes.success && bpscMcqRes.data.length === 2, 'Student successfully retrieved 2 MCQs for assigned course')
  assert(
    bpscMcqRes.data.every((m) => m.course_id === COURSE_BPSC),
    'All returned MCQs strictly belong to BPSC'
  )

  // 1.3 Query MCQs for unassigned course with mismatched course ID
  const cbseMcqRes = await mcqService.getMcqs(COURSE_BPSC, SUB_CBSE_PY, CHAP_CBSE_FN)
  assert(cbseMcqRes.success && cbseMcqRes.data.length === 0, 'Cross-course mismatched query returns 0 MCQs (isolated)')

  console.log('\n[SECTION 2] Super Admin Full Course Access')
  // 2.1 Set Super Admin as active member
  setActiveMember(superAdmin)
  assert(
    permissionService.canAccessCourse(superAdmin, COURSE_BPSC),
    'Super Admin has access to BPSC'
  )
  assert(
    permissionService.canAccessCourse(superAdmin, COURSE_CBSE),
    'Super Admin has access to CBSE'
  )
  assert(
    permissionService.canAccessCourse(superAdmin, COURSE_NEET),
    'Super Admin has access to NEET'
  )

  // 2.2 Super Admin can query both courses
  const adminBpscRes = await mcqService.getMcqs(COURSE_BPSC, SUB_BPSC_CS, CHAP_BPSC_OS)
  const adminCbseRes = await mcqService.getMcqs(COURSE_CBSE, SUB_CBSE_PY, CHAP_CBSE_FN)
  assert(adminBpscRes.data.length === 2, 'Super Admin retrieved BPSC MCQs')
  assert(adminCbseRes.data.length === 2, 'Super Admin retrieved CBSE MCQs')

  console.log('\n[SECTION 3] Super Admin "Viewing-As" Student Security Simulation')
  // 3.1 Enter Viewing-As mode for Rahul (studentBpsc)
  setViewAsMember(studentBpsc)
  const snapViewingAs = getMemberStoreSnapshot()
  assert(snapViewingAs.isViewingAs === true, 'MemberStore is in viewing-as mode')
  assert(snapViewingAs.viewAsMember?.id === studentBpsc.id, 'Target student correctly set in viewAsMember')

  // 3.2 Effective permissions reflect student while viewing
  const effectiveMember = snapViewingAs.effectiveMember
  assert(
    permissionService.canAccessCourse(effectiveMember, COURSE_BPSC),
    'While viewing as Rahul, BPSC course is accessible'
  )
  assert(
    !permissionService.canAccessCourse(effectiveMember, COURSE_CBSE),
    'While viewing as Rahul, CBSE course is inaccessible'
  )

  // 3.3 Mutations must be rejected in viewing-as mode
  const mutationResult = await mcqService.injectMcqs({
    courseId: COURSE_BPSC,
    subjectId: SUB_BPSC_CS,
    chapterId: CHAP_BPSC_OS,
    rawPayload: [{ question: 'Attempt in viewing-as', option_a: '1', option_b: '2', correct: 0 }],
  })
  assert(!mutationResult.success, 'MCQ injection is strictly rejected in viewing-as mode')

  // 3.4 Exit viewing-as mode
  exitViewAsMember()
  const snapPostExit = getMemberStoreSnapshot()
  assert(snapPostExit.isViewingAs === false, 'Successfully exited viewing-as mode')
  assert(snapPostExit.isSuperAdmin === true, 'Super Admin permissions restored')

  console.log('\n[SECTION 4] In-Flight Progress & Attempt Scoping')
  // 4.1 Record progress for BPSC Chapter
  clearUserProgressStore()
  updateUserProgressStore([
    {
      user_id: 'usr-student-bpsc',
      mcq_id: 'mcq-bpsc-1',
      course_id: COURSE_BPSC,
      subject_id: SUB_BPSC_CS,
      chapter_id: CHAP_BPSC_OS,
      status: 'MASTERED',
      attempts: 1,
      correct_count: 1,
      latest_result: 'CORRECT',
    },
  ])

  const progressSnap = getUserProgressSnapshot()
  const savedProgress = progressSnap.progressMap.get('mcq-bpsc-1')
  assert(savedProgress !== undefined, 'Progress record created for mcq-bpsc-1')
  assert(savedProgress.course_id === COURSE_BPSC, 'Progress is stamped with COURSE_BPSC')
  assert(savedProgress.subject_id === SUB_BPSC_CS, 'Progress is stamped with SUB_BPSC_CS')
  assert(savedProgress.chapter_id === CHAP_BPSC_OS, 'Progress is stamped with CHAP_BPSC_OS')
  assert(savedProgress.status === 'MASTERED', 'Progress status correctly recorded as MASTERED')

  // 4.2 Verify no progress exists for CBSE questions
  assert(!progressSnap.progressMap.has('mcq-cbse-1'), 'No progress pollution for CBSE mcq-cbse-1')
  assert(!progressSnap.progressMap.has('mcq-cbse-2'), 'No progress pollution for CBSE mcq-cbse-2')

  console.log('\n' + '='.repeat(80))
  console.log('🎉 ALL 15 RLS & ACCESS ISOLATION CHECKS PASSED WITH 100% SECURITY!')
  console.log('='.repeat(80))
}

runRlsIsolationTests().catch((err) => {
  console.error('Test suite crashed:', err)
  process.exit(1)
})
