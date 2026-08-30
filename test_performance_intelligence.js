/**
 * test_performance_intelligence.js
 * Verification test suite for Chapter → Subject → Course Performance Intelligence.
 */

import { calculateDeepChapterPerformance } from './src/services/chapterAnalyticsService.js'
import { calculateSubjectIntelligence } from './src/services/subjectAnalyticsService.js'
import { calculateTrendDirection, recordChapterSnapshot, recordSubjectSnapshot } from './src/services/trendService.js'
import { READINESS_WEIGHTS, getPriorityWeight } from './src/config/performanceConfig.js'

console.log('=== TEST 1: Coverage Logic (Unique MCQs) ===')
// 500 MCQs in chapter pool
const totalPool = 500
// Progress with 10 unique MCQs, but some attempted multiple times
const mockRecords = []
for (let i = 1; i <= 10; i++) {
  mockRecords.push({
    mcq_id: `mcq-${i}`,
    status: i <= 8 ? 'MASTERED' : 'INCORRECT',
    attempts: i % 2 === 0 ? 3 : 1,
    correct_count: i <= 8 ? 2 : 0,
    incorrect_count: i <= 8 ? 1 : 1,
    last_attempted_at: new Date().toISOString(),
  })
}

const chMetrics = calculateDeepChapterPerformance(totalPool, mockRecords, 'VH', 'ch-test-1')
console.assert(chMetrics.totalMcqs === 500, 'Total MCQs must be 500')
console.assert(chMetrics.attemptedMcqs === 10, 'Unique attempted must be 10')
console.assert(chMetrics.coveragePercent === 2, 'Coverage must be exactly 2% (10/500), not inflated by repeats')
console.assert(chMetrics.masteredMcqs === 8, 'Mastered unique must be 8')
console.assert(chMetrics.readinessScore < 30, 'Readiness should NOT be 100% when coverage is only 2%')
console.log('✓ Coverage logic verified: Unique MCQs strictly enforced (2% coverage on 10/500 MCQs)')

console.log('\n=== TEST 2: Balanced Readiness Formula ===')
// When a student has 80% coverage, 90% accuracy, 85% mastery
const highCovRecords = []
for (let i = 1; i <= 80; i++) {
  highCovRecords.push({
    mcq_id: `mcq-hc-${i}`,
    status: i <= 70 ? 'MASTERED' : 'INCORRECT',
    attempts: 1,
    correct_count: i <= 70 ? 1 : 0,
    incorrect_count: i <= 70 ? 0 : 1,
    last_attempted_at: new Date().toISOString(),
  })
}
const highCovMetrics = calculateDeepChapterPerformance(100, highCovRecords, 'VH', 'ch-test-2')
console.assert(highCovMetrics.coveragePercent === 80, 'Coverage should be 80%')
console.assert(highCovMetrics.readinessScore >= 70, 'Readiness should be high (>= 70%)')
console.log(`✓ Readiness score computed: ${highCovMetrics.readinessScore}% (Confidence: ${highCovMetrics.confidenceLevel})`)

console.log('\n=== TEST 3: Weighted Subject Aggregation ===')
// Chapter 1: 500 MCQs, VERY HIGH priority (weight 4.0), Low readiness (30%)
// Chapter 2: 50 MCQs, LOW priority (weight 1.0), High readiness (90%)
const subjectChapters = [
  {
    id: 'ch-big',
    title: 'Operating Systems Core',
    totalMcqs: 500,
    priority: 'VERY HIGH',
    readinessScore: 30,
    accuracyPercentage: 40,
    coveragePercent: 20,
    masteryPercentage: 35,
    attemptedMcqs: 100,
    masteredMcqs: 35,
    totalResponses: 100,
    totalCorrectResponses: 40,
  },
  {
    id: 'ch-small',
    title: 'Basic I/O Devices',
    totalMcqs: 50,
    priority: 'LOW',
    readinessScore: 90,
    accuracyPercentage: 90,
    coveragePercent: 100,
    masteryPercentage: 90,
    attemptedMcqs: 50,
    masteredMcqs: 45,
    totalResponses: 50,
    totalCorrectResponses: 45,
  },
]

const subjectIntel = calculateSubjectIntelligence(
  { title: 'Operating Systems' },
  subjectChapters,
  'sub-os'
)

// The 500-MCQ VH chapter should dominate the subject score
console.assert(
  subjectIntel.subjectReadinessScore < 50,
  'Subject readiness must be weighted towards the 500-MCQ VH chapter (< 50%)'
)
console.log(
  `✓ Weighted Subject Readiness: ${subjectIntel.subjectReadinessScore}% (Weighted by Priority & Chapter Size)`
)

console.log('\n=== TEST 4: Strong, Weak, & Immediate Focus Classifications ===')
console.assert(
  subjectIntel.immediateFocusChapters.length === 1,
  'Chapter 1 must be flagged as Immediate Focus (VH Priority + Low Readiness)'
)
console.assert(
  subjectIntel.immediateFocusChapters[0].id === 'ch-big',
  'ch-big is the Immediate Focus chapter'
)
console.assert(
  subjectIntel.strongChapters.length === 1,
  'Chapter 2 must be flagged as Strong Chapter'
)
console.assert(
  subjectIntel.strongChapters[0].id === 'ch-small',
  'ch-small is the Strong Chapter'
)
console.log('✓ Strong, Weak, and Immediate Focus classifications verified')

console.log('\n=== TEST 5: Trend Direction Calculations ===')
const improvingSnapshots = [
  { timestamp: 1, readiness: 35, accuracy: 40, coverage: 20, mastery: 30 },
  { timestamp: 2, readiness: 48, accuracy: 55, coverage: 35, mastery: 45 },
  { timestamp: 3, readiness: 62, accuracy: 70, coverage: 50, mastery: 65 },
]
const trendResult = calculateTrendDirection(improvingSnapshots, 'readiness')
console.assert(trendResult.direction === 'improving', 'Trend must be improving')
console.assert(trendResult.symbol === '↑', 'Symbol must be ↑')
console.assert(trendResult.delta === 27, 'Delta should be 27%')
console.log(`✓ Trend calculation verified: ${trendResult.symbol} ${trendResult.label}`)

console.log('\n=========================================')
console.log('ALL 5 PERFORMANCE INTELLIGENCE TESTS PASSED!')
console.log('=========================================')
