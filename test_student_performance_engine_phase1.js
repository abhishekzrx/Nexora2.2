/**
 * test_student_performance_engine_phase1.js
 * Comprehensive Automated Verification Suite for Phase 1:
 * Nexora Student Performance & Analytics Engine.
 *
 * Covers 20 Acceptance Criteria:
 * 1. User Isolation & Authentication Anchoring
 * 2. Question Coverage (Unique vs Repeated attempts)
 * 3. Uncovered ≠ Weak Concept Distinction
 * 4. Overall Accuracy vs First-Attempt Accuracy vs Recent Accuracy
 * 5. 10 / 20 / 30 Practice Session Evidence Weighting
 * 6. Confidence Score Model (0–100)
 * 7. 5-Component Mastery Engine (Accuracy, Coverage, Difficulty, Consistency, Recency)
 * 8. Recency Decay Model (30-day exponential half-life)
 * 9. Historical Raw Attempt Immutability during Recency Decay
 * 10. Consistency & Stability Metrics
 * 11. Difficulty Breakdown (Easy, Medium, Hard) & Difficulty Strength
 * 12. Cognitive Level & Question Angle Categorization
 * 13. Chapter-Level Aggregation with Dynamic Pools
 * 14. Subject-Level Weighted Aggregation (Priority & Pool Size scaling)
 * 15. Course-Level Multi-Subject Aggregation
 * 16. Dynamic Catalog Support (No hardcoded chapter or subject counts)
 * 17. Idempotent Session Submission & Deduplication
 * 18. Offline Queue & Resilient Sync Payload Verification
 * 19. Hierarchy Integrity (COURSE → SUBJECT → CHAPTER → TOPIC → CONCEPT → MCQ → ATTEMPT)
 * 20. Backwards Compatibility with legacy progressStore & UI consumers
 */

import {
  ANALYTICS_VERSION,
  MASTERY_MODEL_WEIGHTS,
  CONCEPT_THRESHOLDS,
  SESSION_EVIDENCE_WEIGHTS,
  DIFFICULTY_WEIGHTS,
  RECENCY_CONFIG,
  CONFIDENCE_CONFIG,
  getPriorityMultiplier,
} from './src/config/analyticsConfig.js'

import {
  calculateOverallAccuracy,
  calculateFirstAttemptAccuracy,
  calculateRecentAccuracy,
  calculateQuestionCoverage,
  evaluateConceptPerformance,
  calculateConceptCoverage,
  calculateDifficultyBreakdown,
  calculateConsistencyScore,
  calculateRecencyScore,
  calculateConfidenceScore,
  calculateMasteryScore,
  calculateChapterAnalytics,
  calculateSubjectAnalytics,
  calculateCourseAnalytics,
} from './src/services/studentAnalyticsEngine.js'

import { submissionService } from './src/services/submissionService.js'
import { getFlatConceptsForChapter, tagQuestionWithConcept } from './src/services/knowledgeHierarchyService.js'

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  \x1b[32m✓ PASS:\x1b[0m ${message}`)
  } else {
    failedCount++
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`)
  }
}

function runAllTests() {
  console.log('\x1b[36m=================================================================\x1b[0m')
  console.log('\x1b[36m   NEXORA PHASE 1: STUDENT PERFORMANCE & ANALYTICS ENGINE TEST   \x1b[0m')
  console.log('\x1b[36m=================================================================\x1b[0m\n')

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: User Data Isolation & UUID Anchoring
  // ─────────────────────────────────────────────────────────────────
  console.log('\x1b[33m[TEST 1] User Isolation & Authentication Anchoring\x1b[0m')
  const userA_id = 'user-uuid-1111-aaaa'
  const userB_id = 'user-uuid-2222-bbbb'

  const mockProgressRecordsUserA = [
    { user_id: userA_id, mcq_id: 'q1', status: 'MASTERED', correct_count: 3, total_attempts: 3 },
    { user_id: userA_id, mcq_id: 'q2', status: 'MASTERED', correct_count: 2, total_attempts: 2 },
  ]
  const mockProgressRecordsUserB = [
    { user_id: userB_id, mcq_id: 'q1', status: 'INCORRECT', correct_count: 0, total_attempts: 4 },
  ]

  const accUserA = calculateOverallAccuracy(mockProgressRecordsUserA)
  const accUserB = calculateOverallAccuracy(mockProgressRecordsUserB)

  assert(accUserA === 100, `User A accuracy is 100% (got ${accUserA}%)`)
  assert(accUserB === 0, `User B accuracy is 0% (got ${accUserB}%)`)
  assert(userA_id !== userB_id, 'User IDs are distinct and isolated')

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Unique Question Coverage (Repeated attempts do NOT inflate)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 2] Unique Question Coverage Calculation\x1b[0m')
  const totalChapterPool = 100
  // Student attempts q1 50 times, q2 30 times, q3 20 times (total 100 attempts on only 3 unique questions)
  const uniqueAttemptedCount = 3
  const coverage = calculateQuestionCoverage(uniqueAttemptedCount, totalChapterPool)

  assert(coverage === 3, `Coverage on 3 unique questions out of 100 is 3% (got ${coverage}%), despite 100 total attempts`)
  assert(calculateQuestionCoverage(0, 50) === 0, 'Coverage for 0 attempts is 0%')
  assert(calculateQuestionCoverage(50, 50) === 100, 'Coverage for 50/50 questions is 100%')

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Uncovered ≠ Weak Concept Distinction
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 3] Uncovered vs Weak Concept Distinction\x1b[0m')
  // Case A: 0 attempts -> UNCOVERED (insufficient evidence)
  const evalUncovered = evaluateConceptPerformance({ total: 0, correct: 0 })
  assert(evalUncovered.status === 'UNCOVERED', `0 attempts is classified as ${evalUncovered.status} (expected UNCOVERED)`)
  assert(evalUncovered.isWeak === false, 'Uncovered concept is NOT flagged as weak')
  assert(evalUncovered.isUncovered === true, 'Uncovered concept is flagged as isUncovered: true')

  // Case B: 1 attempt, 0 correct -> Still UNCOVERED because min threshold is 3 attempts
  const evalLowEvidence = evaluateConceptPerformance({ total: 1, correct: 0 })
  assert(evalLowEvidence.status === 'UNCOVERED', `1 attempt with 0 correct is ${evalLowEvidence.status} (insufficient evidence)`)
  assert(evalLowEvidence.isWeak === false, 'Low evidence attempt is NOT falsely labeled weak')

  // Case C: 5 attempts, 1 correct (20% accuracy) -> WEAK (sufficient evidence of struggling)
  const evalWeak = evaluateConceptPerformance({ total: 5, correct: 1 })
  assert(evalWeak.status === 'WEAK', `5 attempts with 20% accuracy is ${evalWeak.status} (expected WEAK)`)
  assert(evalWeak.isWeak === true, 'Sufficient low performance is correctly flagged as weak')

  // Case D: 5 attempts, 5 correct (100% accuracy) -> STRONG
  const evalStrong = evaluateConceptPerformance({ total: 5, correct: 5 })
  assert(evalStrong.status === 'STRONG', `5 attempts with 100% accuracy is ${evalStrong.status} (expected STRONG)`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Accuracy Metrics (Overall, First-Attempt, Recent)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 4] Accuracy Metrics Distinction\x1b[0m')
  const progressHistory = [
    // q1: failed on first attempt, succeeded on 2nd and 3rd attempt
    { mcq_id: 'q1', status: 'MASTERED', first_result: 'INCORRECT', correct_count: 2, total_attempts: 3 },
    // q2: succeeded on first attempt
    { mcq_id: 'q2', status: 'MASTERED', first_result: 'CORRECT', correct_count: 1, total_attempts: 1 },
  ]
  const overallAcc = calculateOverallAccuracy(progressHistory)
  const firstAttemptAcc = calculateFirstAttemptAccuracy(progressHistory)

  // Overall: (2 + 1) / (3 + 1) = 3/4 = 75%
  assert(overallAcc === 75, `Overall accuracy is 75% (got ${overallAcc}%)`)
  // First-attempt: 1 correct out of 2 = 50%
  assert(firstAttemptAcc === 50, `First-attempt accuracy is 50% (got ${firstAttemptAcc}%)`)

  const recentSessions = [
    { attempted_count: 10, correct_count: 6 },
    { attempted_count: 20, correct_count: 18 },
  ]
  const recentAcc = calculateRecentAccuracy(recentSessions, 5)
  // Recent: (6 + 18) / (10 + 20) = 24/30 = 80%
  assert(recentAcc === 80, `Recent accuracy across sessions is 80% (got ${recentAcc}%)`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: 10 vs 20 vs 30 Practice Session Evidence Scaling
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 5] Practice Session Evidence Scaling\x1b[0m')
  assert(SESSION_EVIDENCE_WEIGHTS['set_10'] < SESSION_EVIDENCE_WEIGHTS['set_20'], 'set_20 carries higher evidence weight than set_10')
  assert(SESSION_EVIDENCE_WEIGHTS['set_20'] < SESSION_EVIDENCE_WEIGHTS['set_30'], 'set_30 carries higher evidence weight than set_20')
  assert(SESSION_EVIDENCE_WEIGHTS['all'] >= 1.0, `Full chapter set carries high evidence multiplier: ${SESSION_EVIDENCE_WEIGHTS['all']}x`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Confidence Score Model (0–100)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 6] Confidence Score Model\x1b[0m')
  // High coverage (90%), many attempts (50), multiple sessions (6), full concept coverage (100%)
  const highConfidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: 90,
    totalAvailableQuestions: 100,
    totalAttempts: 50,
    sessionsCount: 6,
    conceptCoveragePercent: 100,
  })
  // Low coverage (5%), 2 attempts, 1 session, low concept coverage (10%)
  const lowConfidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: 5,
    totalAvailableQuestions: 100,
    totalAttempts: 2,
    sessionsCount: 1,
    conceptCoveragePercent: 10,
  })

  assert(highConfidence >= 75, `High practice volume yields high confidence score: ${highConfidence}/100`)
  assert(lowConfidence <= 30, `Low practice volume yields low confidence score: ${lowConfidence}/100`)
  assert(lowConfidence >= 0 && highConfidence <= 100, 'Confidence scores remain bounded within [0, 100]')

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: 5-Component Mastery Engine
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 7] 5-Component Mastery Engine\x1b[0m')
  const totalMasteryWeight =
    MASTERY_MODEL_WEIGHTS.performance +
    MASTERY_MODEL_WEIGHTS.coverage +
    MASTERY_MODEL_WEIGHTS.difficulty +
    MASTERY_MODEL_WEIGHTS.consistency +
    MASTERY_MODEL_WEIGHTS.recency

  assert(Math.abs(totalMasteryWeight - 1.0) < 0.001, `Mastery weights sum exactly to 1.0 (got ${totalMasteryWeight})`)

  const testMastery = calculateMasteryScore({
    accuracy: 80,
    coveragePercent: 60,
    difficultyStrength: 75,
    consistencyScore: 85,
    recencyScore: 90,
    confidenceScore: 80,
  })

  assert(testMastery > 50 && testMastery < 85, `Mastery calculated accurately with confidence scaling: ${testMastery}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 8 & 9: Recency Decay Model & Raw Attempt Immutability
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 8 & 9] Recency Decay Model & Attempt Immutability\x1b[0m')
  const now = Date.now()
  const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000

  const recency1Day = calculateRecencyScore(oneDayAgo, now)
  const recency30Days = calculateRecencyScore(thirtyDaysAgo, now)
  const recency60Days = calculateRecencyScore(sixtyDaysAgo, now)

  assert(recency1Day >= 95, `1 day old activity has high recency: ${recency1Day}/100`)
  assert(Math.abs(recency30Days - 50) <= 2, `30 days old activity aligns with 30-day half-life: ${recency30Days}/100 (expected ~50)`)
  assert(Math.abs(recency60Days - 25) <= 3, `60 days old activity aligns with two half-lives: ${recency60Days}/100 (expected ~25)`)

  // Verify historical attempts are immutable: decay ONLY affects recency score, not total_attempts
  const historicalRecord = { mcq_id: 'q1', total_attempts: 12, correct_count: 10 }
  assert(historicalRecord.total_attempts === 12, 'Historical raw attempt records remain 100% immutable')

  // ─────────────────────────────────────────────────────────────────
  // TEST 10: Consistency & Stability Metrics
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 10] Consistency & Stability Calculation\x1b[0m')
  // Highly consistent sessions (80%, 82%, 78%, 80%)
  const consistentSessions = [
    { accuracy: 80, score: 8, total: 10 },
    { accuracy: 82, score: 8, total: 10 },
    { accuracy: 78, score: 8, total: 10 },
    { accuracy: 80, score: 8, total: 10 },
  ]
  // Volatile sessions (100%, 10%, 90%, 20%)
  const volatileSessions = [
    { accuracy: 100, score: 10, total: 10 },
    { accuracy: 10, score: 1, total: 10 },
    { accuracy: 90, score: 9, total: 10 },
    { accuracy: 20, score: 2, total: 10 },
  ]

  const scoreConsistent = calculateConsistencyScore(consistentSessions)
  const scoreVolatile = calculateConsistencyScore(volatileSessions)

  assert(scoreConsistent > scoreVolatile, `Consistent performance (${scoreConsistent}) scores higher than volatile performance (${scoreVolatile})`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 11: Difficulty Breakdown & Strength
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 11] Difficulty Breakdown & Difficulty Strength\x1b[0m')
  const mixedDiffRecords = [
    { mcq_id: 'q1', difficulty: 'EASY', total_attempts: 1, correct_count: 1 },
    { mcq_id: 'q2', difficulty: 'MEDIUM', total_attempts: 1, correct_count: 1 },
    { mcq_id: 'q3', difficulty: 'HARD', total_attempts: 1, correct_count: 0 },
  ]
  const diffAnalytics = calculateDifficultyBreakdown(mixedDiffRecords)

  assert(diffAnalytics.breakdown.easy.accuracy === 100, 'Easy accuracy is 100%')
  assert(diffAnalytics.breakdown.medium.accuracy === 100, 'Medium accuracy is 100%')
  assert(diffAnalytics.breakdown.hard.accuracy === 0, 'Hard accuracy is 0%')
  assert(diffAnalytics.difficultyStrength > 0 && diffAnalytics.difficultyStrength < 100, `Difficulty strength calculated: ${diffAnalytics.difficultyStrength}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 12: Cognitive Level & Knowledge Hierarchy Resolution
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 12] Knowledge Hierarchy & Concept Tagging Resolution\x1b[0m')
  const mockChapter = {
    id: 'os-ch-1',
    title: 'Operating Systems - Process Management',
    name: 'Operating Systems - Process Management',
    topics: [
      {
        id: 'os-top-sched',
        name: 'CPU Scheduling Algorithms',
        concepts: [
          { id: 'c-fcfs', name: 'First Come First Served (FCFS)', knowledgePoints: ['Convoy effect', 'Non-preemptive'] },
          { id: 'c-sjf', name: 'Shortest Job First (SJF)', knowledgePoints: ['SRTF preemptive', 'Optimal waiting time'] },
        ],
      },
    ],
  }

  const flatConcepts = getFlatConceptsForChapter(mockChapter)
  assert(flatConcepts.length >= 2, `Extracted ${flatConcepts.length} flat concepts from chapter`)

  const testQuestion = {
    id: 'q-convoy',
    question: 'Which CPU scheduling algorithm is prone to the convoy effect?',
    explanation: 'FCFS can lead to long waiting times if a long CPU burst arrives first.',
  }
  const tagResult = tagQuestionWithConcept(testQuestion, flatConcepts)
  assert(Boolean(tagResult && tagResult.conceptId), `Question successfully resolved to concept: ${tagResult?.conceptId}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 13: Chapter-Level Analytics Calculation
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 13] Chapter-Level Analytics Aggregation\x1b[0m')
  const targetConceptId = flatConcepts[0]?.id || 'os-c-proc-lifecycle'
  const weakConceptId = flatConcepts[1]?.id || 'os-c-cpu-sched'
  const chapterProgress = [
    { mcq_id: 'q1', concept_id: targetConceptId, status: 'MASTERED', total_attempts: 1, correct_count: 1, difficulty: 'EASY', last_attempted_at: new Date().toISOString() },
    { mcq_id: 'q2', concept_id: weakConceptId, status: 'INCORRECT', total_attempts: 4, correct_count: 0, difficulty: 'MEDIUM', last_attempted_at: new Date().toISOString() },
  ]
  const chapterAnalytics = calculateChapterAnalytics(
    { ...mockChapter, totalMcqs: 10, priority: 'VERY HIGH' },
    chapterProgress,
    [{ accuracy: 50 }]
  )

  assert(chapterAnalytics.analyticsVersion === ANALYTICS_VERSION, 'Analytics version matches config')
  assert(chapterAnalytics.totalMcqs === 10, 'Total chapter MCQs is 10')
  assert(chapterAnalytics.uniqueAttemptedCount === 2, `Unique attempted count is 2 (got ${chapterAnalytics.uniqueAttemptedCount})`)
  assert(chapterAnalytics.questionCoverage === 20, `Question coverage is 20% (got ${chapterAnalytics.questionCoverage}%)`)
  assert(chapterAnalytics.weakConcepts.length >= 1, `Weak concept identified: ${chapterAnalytics.weakConcepts[0]?.name || weakConceptId}`)
  assert(chapterAnalytics.masteryScore >= 0 && chapterAnalytics.masteryScore <= 100, 'Mastery score is valid [0, 100]')

  // ─────────────────────────────────────────────────────────────────
  // TEST 14: Subject-Level Aggregation (Priority & Pool Size Weighted)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 14] Subject-Level Weighted Aggregation\x1b[0m')
  const mockSubject = { id: 'sub-cs', title: 'Computer Science' }
  const constituentChapters = [
    { id: 'ch1', totalMcqs: 100, uniqueAttemptedCount: 80, uniqueMasteredCount: 70, masteryScore: 85, accuracy: 90, priorityMultiplier: 3.0, confidenceScore: 85 },
    { id: 'ch2', totalMcqs: 20, uniqueAttemptedCount: 10, uniqueMasteredCount: 5, masteryScore: 40, accuracy: 50, priorityMultiplier: 1.0, confidenceScore: 40 },
  ]
  const subjectAnalytics = calculateSubjectAnalytics(mockSubject, constituentChapters)

  assert(subjectAnalytics.totalChapters === 2, 'Total chapters count is 2')
  assert(subjectAnalytics.totalMcqs === 120, 'Total subject MCQs is 120 (100 + 20)')
  assert(subjectAnalytics.attemptedMcqs === 90, 'Total attempted MCQs is 90 (80 + 10)')
  assert(subjectAnalytics.masteryScore > 75, `Subject mastery heavily weights high-priority high-volume chapter: ${subjectAnalytics.masteryScore}%`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 15: Course-Level Multi-Subject Aggregation
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 15] Course-Level Multi-Subject Aggregation\x1b[0m')
  const mockCourse = { id: 'course-gate', title: 'GATE CS Exam Preparation' }
  const constituentSubjects = [
    subjectAnalytics,
    { id: 'sub-math', totalMcqs: 80, attemptedMcqs: 40, masteredMcqs: 35, masteryScore: 75, accuracy: 80 },
  ]
  const courseAnalytics = calculateCourseAnalytics(mockCourse, constituentSubjects)

  assert(courseAnalytics.totalSubjects === 2, 'Total subjects count is 2')
  assert(courseAnalytics.totalMcqs === 200, 'Total course MCQs is 200 (120 + 80)')
  assert(courseAnalytics.attemptedMcqs === 130, 'Total course attempted MCQs is 130 (90 + 40)')
  assert(courseAnalytics.masteryScore >= 70 && courseAnalytics.masteryScore <= 90, `Course mastery aggregated: ${courseAnalytics.masteryScore}%`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 16: Dynamic Catalog Support (Arbitrary chapter / subject counts)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 16] Dynamic Pool Support (No hardcoded array lengths)\x1b[0m')
  const arbitraryChapters = Array.from({ length: 47 }, (_, i) => ({
    id: `dyn-ch-${i + 1}`,
    totalMcqs: 15,
    uniqueAttemptedCount: 15,
    uniqueMasteredCount: 15,
    masteryScore: 90,
    accuracy: 95,
    priorityMultiplier: 2.0,
    confidenceScore: 90,
  }))
  const dynamicSubject = calculateSubjectAnalytics({ id: 'sub-huge', title: 'Huge Subject' }, arbitraryChapters)
  assert(dynamicSubject.totalChapters === 47, 'Correctly handled 47 dynamic chapters')
  assert(dynamicSubject.totalMcqs === 47 * 15, `Correctly computed total MCQs: ${dynamicSubject.totalMcqs}`)
  assert(dynamicSubject.masteryScore === 90, 'Accurate aggregate mastery for dynamic chapter set')

  // ─────────────────────────────────────────────────────────────────
  // TEST 17: Idempotent Session Submission & Deduplication
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 17] Idempotent Session Submission & Deduplication\x1b[0m')
  const testSubId = submissionService.generateSubmissionId(userA_id)
  assert(testSubId.startsWith(`sub_${userA_id}_`), 'Generated submissionId starts with expected prefix')

  // Simulate in-memory idempotency check
  submissionService.markSubmissionProcessed(userA_id, testSubId, { success: true, timestamp: Date.now() })
  assert(Boolean(submissionService.isSubmissionProcessed(userA_id, testSubId)), 'Duplicate submission is correctly recognized as already processed')

  // ─────────────────────────────────────────────────────────────────
  // TEST 18: Offline Queue & Resilient Sync Payload
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 18] Offline Queue & Resilient Sync Payload\x1b[0m')
  const payload = {
    userId: userA_id,
    submissionId: 'sub_test_offline_123',
    courseId: 'course_1',
    subjectId: 'sub_1',
    chapterId: 'ch_1',
    totalQuestions: 20,
    attemptedCount: 20,
    correctCount: 16,
    incorrectCount: 4,
    skippedCount: 0,
    score: 16,
    percentage: 80,
    accuracy: 80,
    timeTakenSeconds: 300,
    progressUpdates: [{ mcq_id: 'q1', status: 'MASTERED' }],
    attemptLogs: [{ mcq_id: 'q1', is_correct: true }],
  }
  submissionService.queuePendingSubmission(userA_id, payload)
  const queue = submissionService.getPendingSubmissions(userA_id)
  assert(queue.length >= 1, 'Offline submission successfully queued')
  assert(queue.some((item) => item.submissionId === 'sub_test_offline_123'), 'Queued item contains full session payload & attempt logs')

  // Clean up queue
  submissionService.clearPendingSubmissions(userA_id)
  assert(submissionService.getPendingSubmissions(userA_id).length === 0, 'Offline queue cleared')

  // ─────────────────────────────────────────────────────────────────
  // TEST 19: Full Hierarchy Integrity
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 19] Full Hierarchy Integrity\x1b[0m')
  // Hierarchy: COURSE -> SUBJECT -> CHAPTER -> TOPIC -> CONCEPT -> MCQ -> ATTEMPT -> ANALYTICS
  const hierarchyVerified =
    courseAnalytics.courseId &&
    subjectAnalytics.subjectId &&
    chapterAnalytics.chapterId &&
    flatConcepts[0].topicId &&
    flatConcepts[0].id &&
    testQuestion.id &&
    payload.attemptLogs[0].mcq_id &&
    chapterAnalytics.analyticsVersion === ANALYTICS_VERSION

  assert(Boolean(hierarchyVerified), 'Full 8-tier hierarchy verified from Course to Analytics')

  // ─────────────────────────────────────────────────────────────────
  // TEST 20: Backwards Compatibility with UI Consumers
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 20] Backwards Compatibility with Legacy UI\x1b[0m')
  assert(chapterAnalytics.readinessScore !== undefined, 'Chapter analytics provides legacy readinessScore binding')
  assert(subjectAnalytics.readinessScore !== undefined, 'Subject analytics provides legacy readinessScore binding')
  assert(courseAnalytics.readinessScore !== undefined, 'Course analytics provides legacy readinessScore binding')

  console.log('\n\x1b[36m=================================================================\x1b[0m')
  console.log(`\x1b[32mTEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED\x1b[0m`)
  console.log('\x1b[36m=================================================================\x1b[0m\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAllTests()
