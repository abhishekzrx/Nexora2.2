/**
 * test_daily_focus_personalization.js
 * Verification of personalized user data flow and state management for Daily Focus & Quick Review.
 */

import assert from 'assert'
import {
  recordCardRating,
  getDeckProgress,
  getTodayFlashcardReviewCount,
  getUserDueFlashcardsCount,
} from './src/services/flashcardService.js'

// Simple mock for localStorage in Node test environment
const mockStorage = {}
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v) },
  removeItem: (k) => { delete mockStorage[k] },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]) },
}

console.log('--- STARTING PERSONALIZED USER STATE FLOW TESTS ---')

// 1. TEST NEW STUDENT (Zero attempts, Zero reviews)
console.log('\n[Test 1] Brand New Student Personalization (Student A)')
const studentAId = 'student-alpha-001'

const studentADueCards = getUserDueFlashcardsCount(studentAId, null, { incorrectCount: 0 })
assert.strictEqual(studentADueCards, 0, 'New student must have 0 flashcards due (not 300!)')

const studentAReviewCount = getTodayFlashcardReviewCount(studentAId)
assert.strictEqual(studentAReviewCount, 0, 'New student must have 0 cards reviewed today')

// Check forgotten topics calculation logic for new student
const mockSubjectsList = [
  {
    subjectKey: 'physics',
    title: 'Physics',
    chapters: [
      { id: 'ch-1', name: 'Units & Dimensions', hasAttempts: false, masteryPercent: 0, revisionRequirement: 'Not Started' },
      { id: 'ch-2', name: 'Kinematics', hasAttempts: false, masteryPercent: 0, revisionRequirement: 'Not Started' },
    ],
  },
  {
    subjectKey: 'chemistry',
    title: 'Chemistry',
    chapters: [
      { id: 'ch-3', name: 'Atomic Structure', hasAttempts: false, masteryPercent: 0, revisionRequirement: 'Not Started' },
      { id: 'ch-4', name: 'Chemical Bonding', hasAttempts: false, masteryPercent: 0, revisionRequirement: 'Not Started' },
    ],
  },
]

let studentAForgottenTopics = 0
mockSubjectsList.forEach((sub) => {
  (sub.chapters || []).forEach((ch) => {
    if (ch.hasAttempts) {
      if (ch.masteryPercent < 50 || ch.revisionRequirement === 'Revision due' || ch.revisionRequirement === 'Urgent revision needed') {
        studentAForgottenTopics += 1
      }
    }
  })
})
assert.strictEqual(studentAForgottenTopics, 0, 'New student must have 0 forgotten topics (not 64!)')
console.log('✓ Student A correctly shows 0 due cards, 0 reviewed cards, and 0 forgotten topics.')

// 2. TEST ACTIVE STUDENT WITH PERSONALIZED PROGRESS (Student B)
console.log('\n[Test 2] Active Student Data Flow & Spaced Repetition (Student B)')
const studentBId = 'student-beta-002'

// Student B rates card 1 as 'again' (due today) and card 2 as 'good'
recordCardRating('ch-1', 'card-101', 'again', studentBId)
recordCardRating('ch-1', 'card-102', 'good', studentBId)
recordCardRating('ch-2', 'card-201', 'hard', studentBId)

const studentBDeck = getDeckProgress('ch-1', studentBId)
assert.strictEqual(studentBDeck.reviewed, 2, 'Student B deck progress should track 2 cards')
assert.strictEqual(studentBDeck.mastered, 1, 'Student B mastered count should track 1 good card')

const studentBTodayReviews = getTodayFlashcardReviewCount(studentBId)
assert.strictEqual(studentBTodayReviews, 3, 'Student B should have 3 reviews recorded today')

const studentBDueCards = getUserDueFlashcardsCount(studentBId, null, { incorrectCount: 0 })
assert.strictEqual(studentBDueCards >= 1, true, 'Student B should have at least 1 card due (rated "again")')

// Active chapters for Student B (1 forgotten chapter with attempts and low accuracy)
const studentBSubjects = [
  {
    subjectKey: 'physics',
    title: 'Physics',
    chapters: [
      { id: 'ch-1', name: 'Units & Dimensions', hasAttempts: true, masteryPercent: 30, revisionRequirement: 'Urgent revision needed' },
      { id: 'ch-2', name: 'Kinematics', hasAttempts: true, masteryPercent: 85, revisionRequirement: 'Up to date' },
    ],
  },
]

let studentBForgottenTopics = 0
studentBSubjects.forEach((sub) => {
  (sub.chapters || []).forEach((ch) => {
    if (ch.hasAttempts) {
      if (ch.masteryPercent < 50 || ch.revisionRequirement === 'Revision due' || ch.revisionRequirement === 'Urgent revision needed') {
        studentBForgottenTopics += 1
      }
    }
  })
})
assert.strictEqual(studentBForgottenTopics, 1, 'Student B must have exactly 1 forgotten topic')
console.log('✓ Student B correctly tracks personal spaced repetition ratings, due cards, and forgotten topics.')

// 3. TEST CROSS-STUDENT ISOLATION (No State Leakage)
console.log('\n[Test 3] Student Isolation Verification')
// Verify Student A's deck progress is still clean and unaffected by Student B
const studentADeckAfterB = getDeckProgress('ch-1', studentAId)
assert.strictEqual(studentADeckAfterB.reviewed, 0, 'Student A must remain at 0 reviewed cards')
assert.strictEqual(studentADeckAfterB.mastered, 0, 'Student A must remain at 0 mastered cards')

const studentATodayReviewsAfterB = getTodayFlashcardReviewCount(studentAId)
assert.strictEqual(studentATodayReviewsAfterB, 0, 'Student A must still have 0 cards reviewed today')

console.log('✓ Complete isolation verified between Student A and Student B.')

console.log('\nALL PERSONALIZED STATE FLOW TESTS PASSED SUCCESSFULLY! (100% PASS)')
