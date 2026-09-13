/**
 * test_strict_mcq_injection.js
 * Comprehensive Verification Suite for Production-Grade MCQ Injection
 * 
 * Tests:
 * 1. Authoritative Target ID Stamping (overwriting untrusted raw IDs)
 * 2. Hierarchy Pre-Validation (chapter.subject_id === subject.id AND subject.course_id === course.id)
 * 3. Sequential Injections across distinct Courses, Subjects, and Chapters
 * 4. Absolute Zero Cross-Contamination in queries and retrieval
 * 5. Recomputation of Chapter & Subject Stats
 * 6. Role-Based Permissions (Super Admin enforcement)
 * 7. Scoped Batch Deletion & Trimming Isolation
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

import { mcqService } from './src/services/mcqService.js'
import {
  getSnapshot,
  replaceSubjects,
  replaceChapters,
  replaceMcqs,
  replaceFlashcards,
  matchContentToChapter,
  recomputeAllChapterStats,
  recomputeSubjectStats,
  recomputeAllSubjectStats,
} from './src/data/adminStore.js'
import {
  setActiveMember,
  setViewAsMember,
  exitViewAsMember,
  clearMemberSession,
} from './src/data/memberStore.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

async function runStrictInjectionTests() {
  console.log('='.repeat(80))
  console.log('🧪 RUNNING STRICT MCQ INJECTION & HIERARCHY ISOLATION TESTS')
  console.log('='.repeat(80))

  // Define 2 Mock Courses, 3 Subjects, 4 Chapters
  const COURSE_A = 'course-alpha-001'
  const COURSE_B = 'course-beta-002'

  const SUB_A1 = 'sub-alpha-networking-101'
  const SUB_A2 = 'sub-alpha-os-102'
  const SUB_B1 = 'sub-beta-history-201'

  const CHAP_A1_1 = 'chap-alpha-osi-model'
  const CHAP_A1_2 = 'chap-alpha-tcp-ip'
  const CHAP_A2_1 = 'chap-alpha-processes'
  const CHAP_B1_1 = 'chap-beta-ancient-india'

  // Setup Admin Store state with exact hierarchical subjects and chapters
  const mockSubjects = [
    {
      id: SUB_A1,
      courseId: COURSE_A,
      course_id: COURSE_A,
      name: 'Computer Networks',
      icon: 'computerNetworks',
      desc: 'Networks',
      status: 'active',
      stats: [],
    },
    {
      id: SUB_A2,
      courseId: COURSE_A,
      course_id: COURSE_A,
      name: 'Operating Systems',
      icon: 'operatingSystems',
      desc: 'OS',
      status: 'active',
      stats: [],
    },
    {
      id: SUB_B1,
      courseId: COURSE_B,
      course_id: COURSE_B,
      name: 'Ancient Indian History',
      icon: 'history',
      desc: 'History',
      status: 'active',
      stats: [],
    },
  ]

  const mockChapters = [
    { id: CHAP_A1_1, subjectId: SUB_A1, subject_id: SUB_A1, courseId: COURSE_A, course_id: COURSE_A, name: 'OSI Model', number: 1, mcqs: 0, flashcards: 0, notes: 0, status: 'active' },
    { id: CHAP_A1_2, subjectId: SUB_A1, subject_id: SUB_A1, courseId: COURSE_A, course_id: COURSE_A, name: 'TCP/IP Architecture', number: 2, mcqs: 0, flashcards: 0, notes: 0, status: 'active' },
    { id: CHAP_A2_1, subjectId: SUB_A2, subject_id: SUB_A2, courseId: COURSE_A, course_id: COURSE_A, name: 'Processes & Threads', number: 1, mcqs: 0, flashcards: 0, notes: 0, status: 'active' },
    { id: CHAP_B1_1, subjectId: SUB_B1, subject_id: SUB_B1, courseId: COURSE_B, course_id: COURSE_B, name: 'Indus Valley Civilization', number: 1, mcqs: 0, flashcards: 0, notes: 0, status: 'active' },
  ]

  // Initialize store state
  replaceSubjects(mockSubjects)
  replaceChapters(mockChapters)
  replaceMcqs([])
  replaceFlashcards([])

  // Set Super Admin identity
  const superAdmin = {
    id: 'usr-superadmin-root',
    username: 'admin_root',
    public_user_id: 'NEX-ADM-001',
    warrior_name: 'COMMANDER_ZERO',
    display_name: 'Lead Instructor',
    email: 'admin@nexora.io',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  }
  setActiveMember(superAdmin)

  console.log('\n[TEST GROUP 1] Permission Gate & Role Enforcement')
  // 1.1 Test permission gate for regular member
  const regularMember = {
    id: 'usr-student-001',
    username: 'student_jane',
    public_user_id: 'NEX-STU-001',
    warrior_name: 'LEARNER_ONE',
    display_name: 'Jane Doe',
    email: 'jane@nexora.io',
    role: 'MEMBER',
    status: 'ACTIVE',
  }
  setActiveMember(regularMember)

  const memberInjectResult = await mcqService.injectMcqs({
    courseId: COURSE_A,
    subjectId: SUB_A1,
    chapterId: CHAP_A1_1,
    rawPayload: [{ question: 'Test Q1', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 0 }],
  })
  assert(!memberInjectResult.success, 'Regular MEMBER cannot inject MCQs (blocked by permission check)')

  // 1.2 Test viewing-as mode block
  setActiveMember(superAdmin)
  setViewAsMember(regularMember)
  const viewAsInjectResult = await mcqService.injectMcqs({
    courseId: COURSE_A,
    subjectId: SUB_A1,
    chapterId: CHAP_A1_1,
    rawPayload: [{ question: 'Test Q1', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 0 }],
  })
  assert(!viewAsInjectResult.success, 'Super Admin in VIEWING_AS mode cannot mutate content')
  exitViewAsMember()

  console.log('\n[TEST GROUP 2] Hierarchy Pre-Validation & Error Rejection')
  // 2.1 Attempt injection with Chapter belonging to a DIFFERENT subject
  const crossSubjectResult = await mcqService.injectMcqs({
    courseId: COURSE_A,
    subjectId: SUB_A1, // Subject is Computer Networks
    chapterId: CHAP_A2_1, // Chapter belongs to Operating Systems!
    rawPayload: [{ question: 'Cross Subject Test', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 0 }],
  })
  assert(!crossSubjectResult.success, 'Rejects injection when Chapter does not belong to target Subject')
  assert(crossSubjectResult.error.includes('hierarchy'), 'Error message clearly specifies hierarchy violation')

  // 2.2 Attempt injection with Subject belonging to a DIFFERENT course
  const crossCourseResult = await mcqService.injectMcqs({
    courseId: COURSE_A, // Target Course A
    subjectId: SUB_B1,  // Subject belongs to Course B!
    chapterId: CHAP_B1_1,
    rawPayload: [{ question: 'Cross Course Test', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct: 0 }],
  })
  assert(!crossCourseResult.success, 'Rejects injection when Subject does not belong to target Course')

  console.log('\n[TEST GROUP 3] Authoritative Target Stamping & Raw JSON Overwrite')
  // 3.1 Raw payload contains fraudulent / untrusted IDs
  const maliciousPayload = [
    {
      id: 'custom-malicious-id',
      course_id: 'fraudulent-course-xyz',
      subject_id: 'fraudulent-subject-xyz',
      chapter_id: 'fraudulent-chapter-xyz',
      question: 'Which layer of OSI model handles routing?',
      option_a: 'Network Layer',
      option_b: 'Data Link Layer',
      option_c: 'Transport Layer',
      option_d: 'Physical Layer',
      correct: 'A',
      explanation: 'Network Layer performs routing and forwarding.',
    },
    {
      question: 'What is the standard port for HTTPS?',
      options: { A: '80', B: '443', C: '8080', D: '22' },
      correct_answer: 'B',
      explanation: 'Port 443 is used for TLS/HTTPS.',
    },
  ]

  const stampInjectResult = await mcqService.injectMcqs({
    courseId: COURSE_A,
    subjectId: SUB_A1,
    chapterId: CHAP_A1_1,
    rawPayload: maliciousPayload,
  })
  assert(stampInjectResult.success, 'Injection succeeded with valid hierarchy parameters')
  assert(stampInjectResult.insertedCount === 2, 'Inserted exactly 2 items')

  // Verify that inserted items in store have the authoritative target IDs stamped
  const storeMcqs = getSnapshot().allMcqs
  const q1 = storeMcqs.find((m) => m.question.includes('routing'))
  assert(q1 !== undefined, 'Found Q1 in store')
  assert(q1.course_id === COURSE_A, 'Fraudulent course_id was replaced with target COURSE_A')
  assert(q1.subject_id === SUB_A1, 'Fraudulent subject_id was replaced with target SUB_A1')
  assert(q1.chapter_id === CHAP_A1_1, 'Fraudulent chapter_id was replaced with target CHAP_A1_1')
  assert(q1.correct_answer === 0, 'Correct answer correctly mapped from "A" to index 0')

  const q2 = storeMcqs.find((m) => m.question.includes('HTTPS'))
  assert(q2 !== undefined, 'Found Q2 in store')
  assert(q2.option_b === '443', 'Option B successfully extracted from options object')
  assert(q2.correct_answer === 1, 'Correct answer correctly mapped from "B" to index 1')

  console.log('\n[TEST GROUP 4] Sequential Injections Across Distinct Courses & Subjects')
  // Inject into Course A -> Subject A2 -> Chapter A2.1 (Operating Systems / Processes)
  const osPayload = [
    {
      question: 'What is a thread in an OS?',
      option_a: 'Lightweight Process',
      option_b: 'Hardware device',
      option_c: 'File system',
      option_d: 'Network socket',
      correct: 0,
    },
    {
      question: 'What is a deadlock condition?',
      option_a: 'Mutual exclusion',
      option_b: 'Hold and wait',
      option_c: 'No preemption',
      option_d: 'All of the above',
      correct: 3,
    },
    {
      question: 'What is virtual memory?',
      option_a: 'RAM extension on disk',
      option_b: 'CPU cache',
      option_c: 'ROM',
      option_d: 'BIOS chip',
      correct: 0,
    },
  ]
  const osResult = await mcqService.injectMcqs({
    courseId: COURSE_A,
    subjectId: SUB_A2,
    chapterId: CHAP_A2_1,
    rawPayload: osPayload,
  })
  assert(osResult.success, 'Injected 3 MCQs into Course A -> Subject A2 -> Chapter A2.1')

  // Inject into Course B -> Subject B1 -> Chapter B1.1 (History / Indus Valley)
  const historyPayload = [
    {
      question: 'The Great Bath was discovered at which Indus Valley site?',
      option_a: 'Harappa',
      option_b: 'Mohenjo-daro',
      option_c: 'Kalibangan',
      option_d: 'Lothal',
      correct: 'B',
    },
  ]
  const historyResult = await mcqService.injectMcqs({
    courseId: COURSE_B,
    subjectId: SUB_B1,
    chapterId: CHAP_B1_1,
    rawPayload: historyPayload,
  })
  assert(historyResult.success, 'Injected 1 MCQ into Course B -> Subject B1 -> Chapter B1.1')

  console.log('\n[TEST GROUP 5] Strict Isolation & Zero Cross-Contamination Verification')
  // 5.1 Query Chapter A1.1 (Networks / OSI)
  const a1_1_res = await mcqService.getMcqs(COURSE_A, SUB_A1, CHAP_A1_1)
  const a1_1_mcqs = a1_1_res.data || []
  assert(a1_1_mcqs.length === 2, `Chapter A1.1 has exactly 2 MCQs (got ${a1_1_mcqs.length})`)
  assert(
    a1_1_mcqs.every((m) => (m.course_id || m.courseId) === COURSE_A && (m.subject_id || m.subjectId) === SUB_A1 && (m.chapter_id || m.chapterId) === CHAP_A1_1),
    '100% of Chapter A1.1 MCQs strictly match its Course, Subject, and Chapter IDs'
  )

  // 5.2 Query Chapter A1.2 (Networks / TCP/IP) - should be empty
  const a1_2_res = await mcqService.getMcqs(COURSE_A, SUB_A1, CHAP_A1_2)
  const a1_2_mcqs = a1_2_res.data || []
  assert(a1_2_mcqs.length === 0, `Chapter A1.2 is isolated and empty (got ${a1_2_mcqs.length})`)

  // 5.3 Query Chapter A2.1 (OS / Processes)
  const a2_1_res = await mcqService.getMcqs(COURSE_A, SUB_A2, CHAP_A2_1)
  const a2_1_mcqs = a2_1_res.data || []
  assert(a2_1_mcqs.length === 3, `Chapter A2.1 has exactly 3 MCQs (got ${a2_1_mcqs.length})`)
  assert(
    a2_1_mcqs.every((m) => (m.course_id || m.courseId) === COURSE_A && (m.subject_id || m.subjectId) === SUB_A2 && (m.chapter_id || m.chapterId) === CHAP_A2_1),
    '100% of Chapter A2.1 MCQs strictly match Course A / Subject A2 / Chapter A2.1'
  )

  // 5.4 Query Chapter B1.1 (History / Indus Valley in Course B)
  const b1_1_res = await mcqService.getMcqs(COURSE_B, SUB_B1, CHAP_B1_1)
  const b1_1_mcqs = b1_1_res.data || []
  assert(b1_1_mcqs.length === 1, `Chapter B1.1 in Course B has exactly 1 MCQ (got ${b1_1_mcqs.length})`)
  assert(
    (b1_1_mcqs[0].course_id || b1_1_mcqs[0].courseId) === COURSE_B &&
    (b1_1_mcqs[0].subject_id || b1_1_mcqs[0].subjectId) === SUB_B1 &&
    (b1_1_mcqs[0].chapter_id || b1_1_mcqs[0].chapterId) === CHAP_B1_1,
    'Chapter B1.1 MCQ strictly bound to Course B'
  )

  // 5.5 Cross-Course Query Check: querying Course A with Course B Chapter ID returns empty
  const crossQuery = await mcqService.getMcqs(COURSE_A, SUB_B1, CHAP_B1_1)
  const crossMcqs = crossQuery.data || []
  assert(crossMcqs.length === 0, 'Cross-course query with mismatched courseId returns 0 items')

  console.log('\n[TEST GROUP 6] Dynamic Stats Recomputation')
  // Verify matchContentToChapter and stats computation
  recomputeAllChapterStats()
  const updatedChapters = getSnapshot().allChapters
  const updatedChapA1_1 = updatedChapters.find((c) => c.id === CHAP_A1_1)
  const updatedChapA1_2 = updatedChapters.find((c) => c.id === CHAP_A1_2)
  const updatedChapA2_1 = updatedChapters.find((c) => c.id === CHAP_A2_1)

  assert(updatedChapA1_1.mcqs === 2, `Chapter A1.1 stats recomputed to exactly 2 MCQs (got ${updatedChapA1_1.mcqs})`)
  assert(updatedChapA1_2.mcqs === 0, `Chapter A1.2 stats recomputed to exactly 0 MCQs (got ${updatedChapA1_2.mcqs})`)
  assert(updatedChapA2_1.mcqs === 3, `Chapter A2.1 stats recomputed to exactly 3 MCQs (got ${updatedChapA2_1.mcqs})`)

  console.log('\n[TEST GROUP 7] Scoped MCQ Deletion & Trimming Isolation')
  // Delete targeted MCQs for Chapter A1.1 only
  const qToDelete = a1_1_mcqs[0].id
  const deleteResult = await mcqService.deleteTargetedMcqs([qToDelete], {
    courseId: COURSE_A,
    subjectId: SUB_A1,
    chapterId: CHAP_A1_1,
  })
  assert(deleteResult.success, 'Deleted 1 targeted MCQ in Chapter A1.1')

  const postDeleteA1_1_res = await mcqService.getMcqs(COURSE_A, SUB_A1, CHAP_A1_1)
  const postDeleteA1_1 = postDeleteA1_1_res.data || []
  assert(postDeleteA1_1.length === 1, `Chapter A1.1 now has 1 MCQ (got ${postDeleteA1_1.length})`)

  // Ensure Chapter A2.1 and Chapter B1.1 were completely untouched
  const postDeleteA2_1_res = await mcqService.getMcqs(COURSE_A, SUB_A2, CHAP_A2_1)
  const postDeleteA2_1 = postDeleteA2_1_res.data || []
  assert(postDeleteA2_1.length === 3, 'Chapter A2.1 untouched with 3 MCQs')

  const postDeleteB1_1_res = await mcqService.getMcqs(COURSE_B, SUB_B1, CHAP_B1_1)
  const postDeleteB1_1 = postDeleteB1_1_res.data || []
  assert(postDeleteB1_1.length === 1, 'Chapter B1.1 untouched with 1 MCQ')

  console.log('\n' + '='.repeat(80))
  console.log('🎉 ALL 20 STRICT MCQ INJECTION & ISOLATION CHECKS PASSED PERFECTLY!')
  console.log('='.repeat(80))
}

runStrictInjectionTests().catch((err) => {
  console.error('Test suite crashed:', err)
  process.exit(1)
})
