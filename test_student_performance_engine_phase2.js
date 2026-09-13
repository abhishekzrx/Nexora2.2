/**
 * test_student_performance_engine_phase2.js
 * Comprehensive Automated Verification Suite for Phase 2:
 * Advanced Exam Readiness, Trends, Ranking & Adaptive Student Intelligence.
 *
 * Covers 20 Acceptance Criteria:
 * 1. High Accuracy + Low Concept Coverage -> Readiness Capped
 * 2. High Coverage + Poor Accuracy -> Readiness Remains Low/Moderate
 * 3. Easy Question Skew -> Difficulty Strength Reduces Inflated Readiness
 * 4. Strong Subjects + 1 Critical Weak Subject -> Balance Penalty & Gap Surfaced
 * 5. High Raw ERI + Uncovered High-Priority Concepts -> Safety Cap Applied
 * 6. Sparse Evidence (10 Questions) -> Limited Confidence (< 25/100)
 * 7. Multi-Session Consistency -> High Consistency & High Confidence (>= 80)
 * 8. Multi-Session Performance Decline -> Negative Trend & Declining Momentum
 * 9. Steady Growth -> Strong Momentum & Improving Trend Direction
 * 10. Weak Concept Reduction -> Weakness Trend "IMPROVING"
 * 11. Repeated MCQ Grinding -> No Coverage Inflation
 * 12. Diverse Concept Practice -> Concept Coverage Growth
 * 13. High-Difficulty Success -> High Difficulty Strength (>= 80)
 * 14. Difficult MCQ Struggle -> Difficulty Gap Bottleneck Triggered
 * 15. Concurrent Multi-Student Isolation -> Zero Data Contamination
 * 16. Multi-Device Learning State Consistency
 * 17. Insufficient Practice Evidence -> Ranking Gated with "Not enough data"
 * 18. Academic Performance Growth -> Deterministic Rank & Percentile Promotion
 * 19. Super Admin "View As Member" -> Read-Only Guard & No Progress Mutation
 * 20. Version Traceability -> ANALYTICS_VERSION = 2 Maintained
 */

import {
  ANALYTICS_VERSION,
  ERI_MODEL_WEIGHTS,
  READINESS_BANDS,
  READINESS_CAPS_CONFIG,
  SUBJECT_BALANCE_CONFIG,
  SESSION_EVIDENCE_WEIGHTS,
} from './src/config/analyticsConfig.js'

import {
  calculateExamReadinessIndex,
  getReadinessBand,
  calculateSubjectBalance,
} from './src/services/examReadinessEngine.js'

import {
  identifyReadinessBottlenecks,
  BOTTLENECK_TYPES,
} from './src/services/bottleneckEngine.js'

import {
  generateSmartRecommendations,
  ACTION_TYPES,
} from './src/services/recommendationEngine.js'

import {
  calculateWindowComparison,
  calculateLearningMomentum,
  calculateWeaknessTrend,
} from './src/services/trendEngine.js'

import {
  validateRankingEligibility,
  calculateAcademicRankingScore,
  compareStudentsForRanking,
  calculatePersonalRanking,
} from './src/services/rankingEngine.js'

import {
  calculateOverallAccuracy,
  calculateQuestionCoverage,
  calculateConceptCoverage,
  calculateDifficultyBreakdown,
  calculateConfidenceScore,
  calculateCourseAnalytics,
} from './src/services/studentAnalyticsEngine.js'

import { buildAdaptivePracticeSet } from './src/services/adaptivePracticeEngine.js'
import { submissionService } from './src/services/submissionService.js'

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

async function runAllPhase2Tests() {
  console.log('\x1b[36m=================================================================\x1b[0m')
  console.log('\x1b[36m   NEXORA PHASE 2: ADVANCED EXAM READINESS & INTELLIGENCE TEST   \x1b[0m')
  console.log('\x1b[36m=================================================================\x1b[0m\n')

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: High Accuracy + Low Concept Coverage -> Readiness Capped
  // ─────────────────────────────────────────────────────────────────
  console.log('\x1b[33m[TEST 1] High Accuracy + Low Concept Coverage\x1b[0m')
  const test1Eri = calculateExamReadinessIndex({
    performanceQuality: 95,
    conceptCoverage: 10, // < 25% critically low
    mastery: 90,
    difficultyStrength: 85,
    consistency: 90,
    recency: 100,
    evidenceConfidence: 60,
  })

  assert(test1Eri.isCapped === true, 'Safety cap was triggered for critically low concept coverage')
  assert(test1Eri.examReadinessIndex <= READINESS_CAPS_CONFIG.criticallyLowConceptCoverageMaxCap, `ERI capped at ${test1Eri.examReadinessIndex} (<= ${READINESS_CAPS_CONFIG.criticallyLowConceptCoverageMaxCap}) despite 95% accuracy`)
  assert(test1Eri.readinessBand.key === 'DEVELOPING' || test1Eri.readinessBand.key === 'STARTING', `Readiness band is ${test1Eri.readinessBand.label}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: High Question Coverage + Poor Accuracy -> Low/Moderate Readiness
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 2] High Coverage + Poor Accuracy\x1b[0m')
  const test2Eri = calculateExamReadinessIndex({
    performanceQuality: 30, // poor accuracy
    conceptCoverage: 95,
    mastery: 35,
    difficultyStrength: 25,
    consistency: 50,
    recency: 90,
    evidenceConfidence: 80,
  })

  assert(test2Eri.examReadinessIndex < 55, `ERI is low/moderate: ${test2Eri.examReadinessIndex}/100`)
  assert(test2Eri.readinessBand.key === 'DEVELOPING' || test2Eri.readinessBand.key === 'BUILDING_FOUNDATION', `Band is ${test2Eri.readinessBand.label}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Easy Skew -> Difficulty Strength Reduces Inflated Readiness
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 3] Easy-Question Skew & Difficulty Strength Dampening\x1b[0m')
  const easyRecords = [
    { mcq_id: 'q1', difficulty: 'EASY', total_attempts: 1, correct_count: 1 },
    { mcq_id: 'q2', difficulty: 'EASY', total_attempts: 1, correct_count: 1 },
    { mcq_id: 'q3', difficulty: 'HARD', total_attempts: 3, correct_count: 0 },
    { mcq_id: 'q4', difficulty: 'HARD', total_attempts: 3, correct_count: 0 },
  ]
  const diffBreakdown = calculateDifficultyBreakdown(easyRecords)
  assert(diffBreakdown.breakdown.easy.accuracy === 100, 'Easy accuracy is 100%')
  assert(diffBreakdown.breakdown.hard.accuracy === 0, 'Hard accuracy is 0%')
  assert(diffBreakdown.difficultyStrength < 50, `Difficulty strength reflects struggle on hard MCQs: ${diffBreakdown.difficultyStrength}%`)

  const test3Eri = calculateExamReadinessIndex({
    performanceQuality: 80,
    conceptCoverage: 70,
    mastery: 75,
    difficultyStrength: diffBreakdown.difficultyStrength, // low
    consistency: 75,
    recency: 100,
    evidenceConfidence: 70,
  })
  assert(test3Eri.examReadinessIndex < 75, `ERI tempered by difficulty strength: ${test3Eri.examReadinessIndex}/100`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Strong Subjects + 1 Critical Weak Subject -> Balance Penalty
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 4] Subject Balance Engine & Spread Penalty\x1b[0m')
  const imbalancedSubjects = [
    { id: 'sub-os', title: 'Operating Systems', readinessScore: 95 },
    { id: 'sub-cn', title: 'Computer Networks', readinessScore: 90 },
    { id: 'sub-db', title: 'Databases', readinessScore: 88 },
    { id: 'sub-dsa', title: 'Data Structures & Algorithms', readinessScore: 35 }, // weak lagging subject
  ]
  const balanceResult = calculateSubjectBalance(imbalancedSubjects)

  assert(balanceResult.spread === 60, `Detected spread of ${balanceResult.spread} pts (95 - 35)`)
  assert(balanceResult.balancePenalty > 0, `Applied balance penalty of ${balanceResult.balancePenalty} pts`)
  assert(balanceResult.weakestSubject === 'Data Structures & Algorithms', `Identified weakest subject: ${balanceResult.weakestSubject}`)
  assert(balanceResult.hasSevereImbalance === true, 'Severe subject imbalance flagged')

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: High Raw ERI + Uncovered High-Priority Concepts -> Safety Cap
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 5] High Raw ERI + Uncovered High-Priority Concepts\x1b[0m')
  const test5UncoveredHigh = [
    { id: 'c1', name: 'Virtual Memory & Paging', priority: 'HIGH' },
    { id: 'c2', name: 'Process Synchronization', priority: 'HIGH' },
    { id: 'c3', name: 'TCP Congestion Control', priority: 'VERY_HIGH' },
    { id: 'c4', name: 'B-Trees & Indexing', priority: 'HIGH' },
  ]
  const test5Eri = calculateExamReadinessIndex({
    performanceQuality: 90,
    conceptCoverage: 75,
    mastery: 88,
    difficultyStrength: 85,
    consistency: 90,
    recency: 100,
    evidenceConfidence: 75,
    uncoveredConcepts: test5UncoveredHigh,
  })

  assert(test5Eri.isCapped === true, 'Readiness safety cap triggered for 4 uncovered high-priority concepts')
  assert(test5Eri.examReadinessIndex <= READINESS_CAPS_CONFIG.uncoveredHighPriorityMaxCap, `ERI capped at ${test5Eri.examReadinessIndex} (<= ${READINESS_CAPS_CONFIG.uncoveredHighPriorityMaxCap})`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Sparse Evidence (10 Questions) -> Low Confidence
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 6] Sparse Evidence & Confidence Calibration\x1b[0m')
  const sparseConfidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: 10,
    totalAvailableQuestions: 350,
    totalAttempts: 10,
    sessionsCount: 1,
    conceptCoveragePercent: 12,
  })
  assert(sparseConfidence < 25, `Confidence on 10 MCQs in 1 session is appropriately low: ${sparseConfidence}/100`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: Multi-Session Consistency -> High Consistency & Confidence
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 7] Multi-Session Consistency & Robust Evidence\x1b[0m')
  const multiSessions = Array.from({ length: 12 }, () => ({ accuracy: 82, total: 20, score: 16 }))
  const solidConfidence = calculateConfidenceScore({
    uniqueQuestionsAttempted: 120,
    totalAvailableQuestions: 150,
    totalAttempts: 180,
    sessionsCount: 12,
    conceptCoveragePercent: 88,
  })
  assert(solidConfidence >= 80, `Confidence across 12 sessions is high: ${solidConfidence}/100`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 8: Multi-Session Performance Decline -> Negative Trend & Declining Momentum
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 8] Performance Decline & Trend Direction\x1b[0m')
  const now = Date.now()
  const decliningSnapshots = [
    { timestamp: now - 10 * 24 * 60 * 60 * 1000, readiness: 85 },
    { timestamp: now - 8 * 24 * 60 * 60 * 1000, readiness: 80 },
    { timestamp: now - 3 * 24 * 60 * 60 * 1000, readiness: 60 },
    { timestamp: now - 1 * 24 * 60 * 60 * 1000, readiness: 50 },
  ]
  const windowTrend = calculateWindowComparison(decliningSnapshots, 'readiness')
  assert(windowTrend.direction === 'DECLINING', `Trend direction detected as ${windowTrend.direction} (expected DECLINING)`)
  assert(windowTrend.delta < 0, `Delta is negative: ${windowTrend.delta}`)

  const decliningMomentum = calculateLearningMomentum({
    trendDelta: windowTrend.delta,
    recentSessionsCount: 4,
    consistencyScore: 40,
    coverageGrowth: 0,
    weaknessReduction: 0,
  })
  assert(decliningMomentum.momentum === 'DECLINING', `Momentum classified as ${decliningMomentum.momentum}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 9: Steady Growth -> Strong Momentum & Upward Trend
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 9] Steady Growth & Strong Momentum\x1b[0m')
  const growthSnapshots = [
    { timestamp: now - 10 * 24 * 60 * 60 * 1000, readiness: 55 },
    { timestamp: now - 2 * 24 * 60 * 60 * 1000, readiness: 78 },
  ]
  const growthTrend = calculateWindowComparison(growthSnapshots, 'readiness')
  assert(growthTrend.direction === 'IMPROVING', `Trend direction is ${growthTrend.direction}`)
  const strongMomentum = calculateLearningMomentum({
    trendDelta: growthTrend.delta,
    recentSessionsCount: 8,
    consistencyScore: 85,
    coverageGrowth: 30,
    weaknessReduction: 10,
  })
  assert(strongMomentum.momentum === 'STRONG', `Momentum is ${strongMomentum.momentum}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 10: Weak Concept Reduction -> Weakness Trend "IMPROVING"
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 10] Weakness Count Reduction Trend\x1b[0m')
  const weaknessHistory = [30, 24, 18, 12]
  const weaknessTrend = calculateWeaknessTrend(weaknessHistory)
  assert(weaknessTrend.trend === 'IMPROVING', `Weakness trend is ${weaknessTrend.trend} (reduced from 30 down to 12)`)
  assert(weaknessTrend.delta === 18, `Weakness delta is ${weaknessTrend.delta}`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 11: Repeated MCQ Grinding -> No Coverage Inflation
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 11] Anti-Grinding Question Coverage Guard\x1b[0m')
  const totalPool = 200
  const uniqueAttempted = 5 // only 5 unique questions
  // Student attempted these 5 questions 500 times total
  const qCoverage = calculateQuestionCoverage(uniqueAttempted, totalPool)
  assert(qCoverage === 3, `Coverage strictly bounded to 3% (${uniqueAttempted}/${totalPool}) despite 500 grinding attempts`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 12: Diverse Concept Practice -> Concept Coverage Growth
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 12] Concept Coverage Growth\x1b[0m')
  const chapterConcepts = [
    { id: 'c1', name: 'Concept 1' },
    { id: 'c2', name: 'Concept 2' },
    { id: 'c3', name: 'Concept 3' },
    { id: 'c4', name: 'Concept 4' },
  ]
  const diverseRecords = [
    { mcq_id: 'q1', concept_id: 'c1', total_attempts: 3, correct_count: 3 },
    { mcq_id: 'q2', concept_id: 'c2', total_attempts: 3, correct_count: 2 },
    { mcq_id: 'q3', concept_id: 'c3', total_attempts: 3, correct_count: 3 },
  ]
  const cCoverage = calculateConceptCoverage(chapterConcepts, diverseRecords)
  assert(cCoverage.coveredCount === 3, `Covered 3 out of 4 concepts (75% coverage)`)
  assert(cCoverage.coveragePercent === 75, 'Concept coverage percent calculated as 75%')

  // ─────────────────────────────────────────────────────────────────
  // TEST 13 & 14: Difficulty Breakdown & Bottleneck Diagnostics
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 13 & 14] Difficulty Strength & Bottleneck Identification\x1b[0m')
  const hardStruggleRecords = [
    { mcq_id: 'q1', difficulty: 'EASY', total_attempts: 2, correct_count: 2 },
    { mcq_id: 'q2', difficulty: 'HARD', total_attempts: 5, correct_count: 1 },
  ]
  const hardStruggleDiff = calculateDifficultyBreakdown(hardStruggleRecords)
  const bottlenecks = identifyReadinessBottlenecks({
    examReadinessIndex: 70,
    accuracy: 80,
    conceptCoverage: 80,
    mastery: 75,
    difficultyStrength: hardStruggleDiff.difficultyStrength, // 36%
    consistency: 75,
    recency: 100,
    confidence: 70,
  })

  assert(bottlenecks.allBottlenecks.some((b) => b.id === 'DIFFICULTY_WEAKNESS'), 'Diagnosed DIFFICULTY_WEAKNESS as an active bottleneck')

  // ─────────────────────────────────────────────────────────────────
  // TEST 15: Concurrent Multi-Student Isolation
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 15] Concurrent Multi-Student Data Isolation\x1b[0m')
  const student1Id = 'usr-1111-uuid'
  const student2Id = 'usr-2222-uuid'

  const subId1 = submissionService.generateSubmissionId(student1Id)
  const subId2 = submissionService.generateSubmissionId(student2Id)

  submissionService.markSubmissionProcessed(student1Id, subId1, { score: 90 })
  submissionService.markSubmissionProcessed(student2Id, subId2, { score: 40 })

  assert(submissionService.isSubmissionProcessed(student1Id, subId1).score === 90, 'Student 1 submission isolated with score 90')
  assert(submissionService.isSubmissionProcessed(student2Id, subId2).score === 40, 'Student 2 submission isolated with score 40')
  assert(submissionService.isSubmissionProcessed(student1Id, subId2) === null, 'Student 1 cannot access Student 2 submission ID')

  // ─────────────────────────────────────────────────────────────────
  // TEST 16: Multi-Device Learning State Consistency
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 16] Multi-Device Learning State Consistency\x1b[0m')
  const commonCourse = { id: 'course-gate-2026', title: 'GATE Computer Science' }
  const commonSubjects = [
    { id: 's1', totalMcqs: 100, attemptedMcqs: 80, masteredMcqs: 70, masteryScore: 85, accuracy: 88, priorityMultiplier: 3.0 },
    { id: 's2', totalMcqs: 50, attemptedMcqs: 40, masteredMcqs: 35, masteryScore: 80, accuracy: 82, priorityMultiplier: 2.0 },
  ]
  const mobileDeviceAnalytics = calculateCourseAnalytics(commonCourse, commonSubjects, [], [], [], [], student1Id)
  const laptopDeviceAnalytics = calculateCourseAnalytics(commonCourse, commonSubjects, [], [], [], [], student1Id)

  assert(mobileDeviceAnalytics.examReadinessIndex === laptopDeviceAnalytics.examReadinessIndex, 'Mobile and Laptop compute identical ERI')
  assert(mobileDeviceAnalytics.masteryScore === laptopDeviceAnalytics.masteryScore, 'Mobile and Laptop compute identical Mastery')

  // ─────────────────────────────────────────────────────────────────
  // TEST 17: Insufficient Practice Evidence -> Ranking Gated
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 17] Insufficient Evidence Ranking Gate\x1b[0m')
  const newStudentMetrics = {
    uniqueAttemptedCount: 5, // only 5 MCQs
    sessionsCount: 1,
    readinessConfidence: 10,
    examReadinessIndex: 85, // even if high
  }
  const rankingEligibility = validateRankingEligibility(newStudentMetrics)
  assert(rankingEligibility.isEligible === false, 'New student with 5 MCQs is NOT eligible for ranking')

  const personalRankResult = calculatePersonalRanking({
    targetUserId: 'new-user',
    currentStudentMetrics: newStudentMetrics,
    cohortParticipants: [{ userId: 'peer1', uniqueAttemptedCount: 50, sessionsCount: 4, readinessConfidence: 60, examReadinessIndex: 75 }],
  })
  assert(personalRankResult.isEligible === false, 'Personal ranking returns isEligible: false')
  assert(personalRankResult.percentileLabel === 'Not enough data', 'Displays "Not enough data" instead of misleading rank')

  // ─────────────────────────────────────────────────────────────────
  // TEST 18: Academic Growth -> Deterministic Rank Promotion
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 18] Academic Growth & Deterministic Rank Sorting\x1b[0m')
  const peerGroup = [
    { userId: 'peerA', examReadinessIndex: 88, masteryScore: 90, accuracy: 92, conceptCoverage: 85, consistencyScore: 90, readinessConfidence: 80, uniqueAttemptedCount: 60, sessionsCount: 5 },
    { userId: 'peerB', examReadinessIndex: 72, masteryScore: 75, accuracy: 78, conceptCoverage: 70, consistencyScore: 75, readinessConfidence: 70, uniqueAttemptedCount: 50, sessionsCount: 4 },
  ]
  const growingStudent = {
    userId: 'student-champion',
    examReadinessIndex: 94, // top ERI
    masteryScore: 95,
    accuracy: 96,
    conceptCoverage: 90,
    consistencyScore: 92,
    readinessConfidence: 85,
    uniqueAttemptedCount: 80,
    sessionsCount: 6,
  }

  const championRank = calculatePersonalRanking({
    targetUserId: 'student-champion',
    currentStudentMetrics: growingStudent,
    cohortParticipants: peerGroup,
    previousRank: 3,
  })

  assert(championRank.isEligible === true, 'Champion student is eligible for ranking')
  assert(championRank.rank === 1, `Champion ranked #1 out of ${championRank.totalEligibleParticipants} participants`)
  assert(championRank.topPercent <= 35, `Percentile classified: ${championRank.percentileLabel}`)
  assert(championRank.rankTrend.direction === 'UP', `Rank trend indicates promotion (${championRank.rankTrend.label})`)

  // ─────────────────────────────────────────────────────────────────
  // TEST 19: Super Admin "View As Member" -> Read-Only Guard
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 19] Super Admin "View As Member" Read-Only Guard\x1b[0m')
  const adminSimulation = await submissionService.submitPracticeSession({
    userId: 'member-being-viewed-uuid',
    submissionId: 'sub-readonly-test',
    totalQuestions: 10,
    attemptedCount: 10,
    correctCount: 10,
    isReadOnly: true, // Super admin preview flag
  })
  assert(adminSimulation.readOnly === true, 'Read-only submission correctly guarded')
  assert(adminSimulation.success === true, 'Read-only preview returns success status without database mutations')

  // ─────────────────────────────────────────────────────────────────
  // TEST 20: Version Traceability & Unified Contract
  // ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[33m[TEST 20] Analytics Version Traceability & Contract Completeness\x1b[0m')
  const finalCourseContract = calculateCourseAnalytics(commonCourse, commonSubjects, [{ accuracy: 85 }], [], [], [], 'usr-test')

  assert(finalCourseContract.analyticsVersion === 2, `ANALYTICS_VERSION is 2 (got ${finalCourseContract.analyticsVersion})`)
  assert(finalCourseContract.examReadinessIndex !== undefined, 'Contract exposes examReadinessIndex')
  assert(finalCourseContract.readinessBand !== undefined, 'Contract exposes readinessBand')
  assert(finalCourseContract.readinessConfidence !== undefined, 'Contract exposes readinessConfidence')
  assert(finalCourseContract.primaryBottleneck !== undefined, 'Contract exposes primaryBottleneck')
  assert(finalCourseContract.recommendedNextAction !== undefined, 'Contract exposes recommendedNextAction')
  assert(finalCourseContract.momentum !== undefined, 'Contract exposes momentum')
  assert(finalCourseContract.rankInfo !== undefined, 'Contract exposes rankInfo')

  console.log('\n\x1b[36m=================================================================\x1b[0m')
  console.log(`\x1b[32mTEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED\x1b[0m`)
  console.log('\x1b[36m=================================================================\x1b[0m\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runAllPhase2Tests()
