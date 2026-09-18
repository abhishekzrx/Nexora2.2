/**
 * Automated Verification: MCQ Practice Session Integrity (Phase 1)
 *
 * Tests:
 * 1. Session Creation & Freezing: Generates unique practice_session_id and freezes exact question IDs & order.
 * 2. Order Stability: Multiple fetches / reloads return 100% identical questions & sequence.
 * 3. Answer-to-Question Integrity: Answers are mapped strictly to question_id, preventing option displacement.
 * 4. Interruption & Remount Simulation: Switching tabs / unmounting retains frozen state and previous answers.
 * 5. Result Safety Validation: Validates session_id and question_id matching before evaluation.
 * 6. Multi-Size Sets: Verifies integrity across 10, 20, and 30 question sets.
 */

import { practiceSessionService } from './src/services/practiceSessionService.js'

// Mock localStorage for Node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

// Generate sample question pool
function generateMockQuestions(count = 50) {
  const list = []
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `q_test_${String(i).padStart(3, '0')}`,
      text: `What is the significance of protocol #${i}?`,
      options: [
        `Option A for Q${i}`,
        `Option B for Q${i}`,
        `Option C for Q${i}`,
        `Option D for Q${i}`,
      ],
      correct: (i % 4),
      chapterId: 'ch_networking_01',
      subjectId: 'computer-networks',
      difficulty: i % 3 === 0 ? 'HARD' : i % 2 === 0 ? 'MEDIUM' : 'EASY',
    })
  }
  return list
}

async function runTests() {
  console.log('====================================================')
  console.log('🚀 MCQ PRACTICE SESSION INTEGRITY VERIFICATION SUITE')
  console.log('====================================================\n')

  const testUser = 'user_student_alpha'
  const mockPool = generateMockQuestions(50)
  let passed = 0
  let failed = 0

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${testName}`)
      failed++
    }
  }

  // TEST 1: Session Creation and Freezing
  console.log('--- TEST 1: Session Creation & Freezing ---')
  const initial10 = mockPool.slice(0, 20)
  const session1 = await practiceSessionService.createSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
    mode: 'set_10',
    questions: initial10,
    sessionSize: 10,
  })

  assert(Boolean(session1.sessionId), 'Unique session_id generated')
  assert(session1.questionIds.length === 10, 'Session contains exact requested size (10 questions)')
  assert(session1.questionOrder.length === 10, 'Question order sequence is initialized')
  assert(session1.status === 'ACTIVE', 'Session status is ACTIVE')

  // TEST 2: Session Restoration & Question Immutability
  console.log('\n--- TEST 2: Session Restoration & Question Immutability ---')
  const activeSess = await practiceSessionService.findActiveSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
  })

  assert(Boolean(activeSess), 'Active session found in storage')
  assert(activeSess.sessionId === session1.sessionId, 'Restored session matches created sessionId')

  const restoredQuestions = practiceSessionService.restoreSessionQuestions(activeSess, mockPool)
  assert(restoredQuestions.length === 10, 'Restored 10 questions')

  const orderMatch = restoredQuestions.every((q, idx) => q.id === session1.questionOrder[idx])
  assert(orderMatch, 'Restored question order is 100% identical to original frozen order')

  // TEST 3: Answer to Question ID Mapping
  console.log('\n--- TEST 3: Answer to Question ID Mapping ---')
  const targetQ = restoredQuestions[2]
  const targetQId = targetQ.id
  const selectedOpt = 2

  await practiceSessionService.saveAnswer({
    sessionId: session1.sessionId,
    userId: testUser,
    questionId: targetQId,
    selectedOption: selectedOpt,
  })

  const sessionAfterAnswer = await practiceSessionService.findActiveSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
  })

  assert(
    sessionAfterAnswer.answers[targetQId] &&
    sessionAfterAnswer.answers[targetQId].selected_option === selectedOpt,
    'Answer is saved strictly by question_id (not array index)'
  )

  // TEST 4: Simulated Interruption & Remount (Simulating Tab Switch / Backgrounding)
  console.log('\n--- TEST 4: Simulated Interruption & Remount ---')
  // User navigates to question index 4, marks questions 1 and 3, seconds left 450
  await practiceSessionService.saveProgress({
    sessionId: session1.sessionId,
    userId: testUser,
    currentIndex: 4,
    markedQuestionIds: [restoredQuestions[1].id, restoredQuestions[3].id],
    visitedQuestionIds: [restoredQuestions[0].id, restoredQuestions[1].id, restoredQuestions[2].id, restoredQuestions[4].id],
    secondsLeft: 450,
  })

  // Simulate component unmount and re-mount (fresh call to findActiveSession + restoreSessionQuestions)
  const remountedSession = await practiceSessionService.findActiveSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
  })

  assert(remountedSession.currentIndex === 4, 'Current question index preserved across remount (4)')
  assert(remountedSession.secondsLeft === 450, 'Timer state preserved across remount (450s)')
  assert(remountedSession.markedQuestionIds.length === 2, 'Marked questions preserved across remount')
  assert(remountedSession.answers[targetQId].selected_option === selectedOpt, 'Answer remains attached to correct question_id')

  const questionsAfterRemount = practiceSessionService.restoreSessionQuestions(remountedSession, mockPool)
  const remountOrderMatch = questionsAfterRemount.every((q, idx) => q.id === session1.questionOrder[idx])
  assert(remountOrderMatch, 'Questions DID NOT re-randomize upon remount')

  // TEST 5: Result Safety Validation
  console.log('\n--- TEST 5: Result Safety Validation ---')
  const validSafety = practiceSessionService.validateSessionResultSafety(session1, questionsAfterRemount)
  assert(validSafety.valid === true, 'Matching question set passes result safety check')

  // Intentionally tamper question set to simulate defect
  const tamperedQuestions = [...questionsAfterRemount.slice(1), mockPool[35]]
  const tamperedSafety = practiceSessionService.validateSessionResultSafety(session1, tamperedQuestions)
  assert(tamperedSafety.valid === false, 'Tampered question set is rejected by safety validation')

  // TEST 6: Session Submission Cleanup
  console.log('\n--- TEST 6: Session Submission & Completion ---')
  await practiceSessionService.markSessionSubmitted({
    sessionId: session1.sessionId,
    userId: testUser,
    result: { score: 8, total: 10 },
  })

  const activeAfterSubmit = await practiceSessionService.findActiveSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
  })
  assert(activeAfterSubmit === null, 'Submitted session is cleared from active sessions')

  // TEST 7: Multi-Size Test Sets (20 and 30 questions)
  console.log('\n--- TEST 7: Multi-Size Practice Sets (20 & 30 Questions) ---')
  const session20 = await practiceSessionService.createSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
    mode: 'set_20',
    questions: mockPool,
    sessionSize: 20,
  })
  assert(session20.questionIds.length === 20, '20-question session creates exactly 20 frozen questions')
  await practiceSessionService.abandonSession({ sessionId: session20.sessionId, userId: testUser })

  const session30 = await practiceSessionService.createSession({
    userId: testUser,
    subjectKey: 'computer-networks',
    chapterId: 'ch_networking_01',
    mode: 'set_all',
    questions: mockPool,
    sessionSize: 30,
  })
  assert(session30.questionIds.length === 30, '30-question session creates exactly 30 frozen questions')
  await practiceSessionService.abandonSession({ sessionId: session30.sessionId, userId: testUser })

  console.log('\n====================================================')
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
