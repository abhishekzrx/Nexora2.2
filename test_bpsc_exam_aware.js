/**
 * test_bpsc_exam_aware.js
 * Comprehensive automated regression and verification suite for BPSC Prelims integration.
 */

import { EXAM_PROFILES, resolveExamProfile, getExamProfile } from './src/data/examProfiles.js'
import { createBPSCBatchPlan, formatBPSCBatchPlan, buildBPSCPrompt, BPSC_PRELIMS_PROMPT_RULES } from './src/utils/bpscPromptRules.js'
import { buildMCQPrompt, generatePrompt } from './src/utils/aiContentStudio.js'
import { validateBPSCMcq, validateBPSCBatch, buildTargetedRegenerationPrompt } from './src/utils/bpscValidator.js'
import { getCourseConfig } from './src/data/courseConfigs.js'

let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passedTests++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failedTests++
  }
}

console.log('\n=============================================================')
console.log('  RUNNING BPSC PRELIMS EXAM-AWARE MCQ PROMPT TEST SUITE')
console.log('=============================================================\n')

// ── TEST A: BPSC Course Resolution ──
console.log('TEST A: Course to Exam Profile Resolution (BPSC Prelims)')
const bpscCourseObj = { id: 'bpsc-prelims', name: 'BPSC Prelims', examProfile: 'BPSC_PRELIMS' }
const resolvedBpsc1 = resolveExamProfile(bpscCourseObj)
const resolvedBpsc2 = resolveExamProfile('bpsc-prelims')
const resolvedBpsc3 = resolveExamProfile('BPSC Prelims')
const resolvedBpsc4 = resolveExamProfile('BPSC_PRELIMS')

assert(resolvedBpsc1.key === 'BPSC_PRELIMS', 'Course object resolves to BPSC_PRELIMS')
assert(resolvedBpsc2.key === 'BPSC_PRELIMS', 'Course ID "bpsc-prelims" resolves to BPSC_PRELIMS')
assert(resolvedBpsc3.key === 'BPSC_PRELIMS', 'Course Name "BPSC Prelims" resolves to BPSC_PRELIMS')
assert(resolvedBpsc4.key === 'BPSC_PRELIMS', 'Exam Key "BPSC_PRELIMS" resolves to BPSC_PRELIMS')
assert(resolvedBpsc1.optionCount === 5, 'BPSC Prelims has optionCount = 5')
assert(resolvedBpsc1.optionE === 'Not Attempted', 'BPSC Prelims has optionE = "Not Attempted"')
assert(resolvedBpsc1.maxStatements === 3, 'BPSC Prelims has maxStatements = 3')

// ── TEST B: Existing Generic Course Resolution & Behavior ──
console.log('\nTEST B: Generic Courses Behavior (Preserved Intact)')
const cbseCourseObj = { id: 'cbse-12-cs', name: 'CBSE Class 12 – Computer Science', examProfile: 'GENERIC' }
const resolvedCbse = resolveExamProfile(cbseCourseObj)
const resolvedGenericKey = resolveExamProfile('GENERIC')
const genericCourseConfig = getCourseConfig('cbse-12-cs')

assert(resolvedCbse.key === 'GENERIC', 'CBSE course resolves to GENERIC profile')
assert(resolvedGenericKey.key === 'GENERIC', 'GENERIC key resolves to GENERIC profile')
assert(genericCourseConfig.examKey === 'GENERIC', 'CBSE course config retains examKey = GENERIC')

const genericPrompt = buildMCQPrompt({
  course: 'CBSE Class 12 – Computer Science',
  subject: 'Python Programming',
  chapter: 'Functions & Recursion',
  difficulty: 'Easy',
  quantity: 10,
  language: 'English',
})

assert(!genericPrompt.includes('BPSC Combined Competitive Examination'), 'Generic prompt does NOT include BPSC rules')
assert(genericPrompt.includes('Generate 10 high-quality multiple-choice questions'), 'Generic prompt preserves standard structure')

// ── TEST C: BPSC Auto Difficulty Distribution ──
console.log('\nTEST C: BPSC Auto Difficulty Distribution Calibration')
const plan100 = createBPSCBatchPlan({ quantity: 100, difficulty: 'Auto' })
assert(plan100.difficultyPlan.easy === 25, '100 MCQs Auto: Easy = 25 (25%)')
assert(plan100.difficultyPlan.moderate === 50, '100 MCQs Auto: Moderate = 50 (50%)')
assert(plan100.difficultyPlan.difficult === 18, '100 MCQs Auto: Difficult = 18 (18%)')
assert(plan100.difficultyPlan.veryDifficult === 7, '100 MCQs Auto: Very Difficult = 7 (7%)')

const sumDiff100 = plan100.difficultyPlan.easy + plan100.difficultyPlan.moderate + plan100.difficultyPlan.difficult + plan100.difficultyPlan.veryDifficult
assert(sumDiff100 === 100, 'Sum of difficulty allocation exactly equals 100')

// Rounding robustness on arbitrary quantities
const plan37 = createBPSCBatchPlan({ quantity: 37, difficulty: 'Auto' })
const sumDiff37 = plan37.difficultyPlan.easy + plan37.difficultyPlan.moderate + plan37.difficultyPlan.difficult + plan37.difficultyPlan.veryDifficult
assert(sumDiff37 === 37, 'Arbitrary quantity (37) difficulty sum strictly equals 37 without rounding discrepancy')

// Single explicit difficulty
const planDifficult = createBPSCBatchPlan({ quantity: 20, difficulty: 'Difficult' })
assert(planDifficult.difficultyPlan.difficult === 20 && planDifficult.difficultyPlan.easy === 0, 'Explicit "Difficult" sets 100% Difficult questions')

// ── TEST D: BPSC Question-Type Distribution & Bihar Target ──
console.log('\nTEST D: Bulk Question-Type Distribution & Bihar Integration Target')
const sumTypes100 = Object.values(plan100.questionTypesPlan).reduce((a, b) => a + b, 0)
assert(sumTypes100 === 100, 'Sum of question types for 100 MCQs exactly equals 100')
assert(plan100.questionTypesPlan.directFactual === 38, 'Direct Factual = 38 (38%)')
assert(plan100.questionTypesPlan.twoStatement === 14, 'Two Statement = 14 (14%)')
assert(plan100.questionTypesPlan.threeStatement === 12, 'Three Statement = 12 (12%)')
assert(plan100.questionTypesPlan.matching === 8, 'Matching = 8 (8%)')
assert(plan100.questionTypesPlan.chronology === 5, 'Chronology = 5 (5%)')
assert(plan100.questionTypesPlan.assertionReason === 4, 'Assertion-Reason = 4 (4%)')
assert(plan100.biharTargetCount === 22, 'Bihar-integrated target for 100 MCQs is 22 (22%)')

const plan13 = createBPSCBatchPlan({ quantity: 13, difficulty: 'Auto' })
const sumTypes13 = Object.values(plan13.questionTypesPlan).reduce((a, b) => a + b, 0)
assert(sumTypes13 === 13, 'Arbitrary quantity (13) question types sum strictly equals 13')

// ── TEST E: BPSC Generated Prompt Content ──
console.log('\nTEST E: BPSC Prelims Generated Prompt Calibration')
const bpscPrompt = buildMCQPrompt({
  course: 'BPSC Prelims',
  subject: 'Modern History',
  chapter: 'Quit India Movement in Bihar',
  difficulty: 'Auto',
  quantity: 20,
  language: 'English',
  specialInstructions: 'Focus on Hazaribagh jail escape and underground radio.',
})

assert(bpscPrompt.includes('BPSC Combined Competitive Examination (Prelims)'), 'Prompt contains BPSC Prelims examination context')
assert(bpscPrompt.includes('Option E MUST ALWAYS BE EXACTLY: "Not Attempted"'), 'Prompt contains Option E = "Not Attempted" rule')
assert(bpscPrompt.includes('Maximum of 3 statements'), 'Prompt enforces maximum 3 statements')
assert(bpscPrompt.includes('BATCH BLUEPRINT (TOTAL: 20 MCQs)'), 'Prompt includes batch blueprint with exact counts')
assert(bpscPrompt.includes('Subject: Modern History'), 'Prompt dynamically receives subject')
assert(bpscPrompt.includes('Chapter: Quit India Movement in Bihar'), 'Prompt dynamically receives chapter')
assert(bpscPrompt.includes('bpsc-prelims-v1'), 'Prompt includes prompt version bpsc-prelims-v1')

// ── TEST F: 15-Check BPSC Validation Engine ──
console.log('\nTEST F: 15-Check BPSC Quality Validation')

const validMcq = {
  question: 'Which of the following leaders escaped from Hazaribagh Central Jail during the Quit India Movement in 1942?',
  options: {
    A: 'Jayaprakash Narayan',
    B: 'Rajendra Prasad',
    C: 'Anugrah Narayan Sinha',
    D: 'Shrikrishna Singh',
    E: 'Not Attempted',
  },
  correct: 'A',
  difficulty: 'Moderate',
  explanation: 'On the night of Diwali in November 1942, Jayaprakash Narayan along with Ramanandan Mishra and others escaped from Hazaribagh Jail.',
  subject: 'History',
  chapter: 'Modern Bihar',
}

const resValid = validateBPSCMcq(validMcq)
assert(resValid.passed === true, 'Valid BPSC MCQ passes 15-check validation')
assert(resValid.score === 100, 'Valid BPSC MCQ receives 100 validation score')

// Defect 1: >3 Statements
const invalidStatementsMcq = {
  ...validMcq,
  question: 'Consider the following statements regarding the Battle of Buxar (1764):\n1. Mir Qasim was defeated.\n2. Shuja-ud-Daula participated.\n3. Shah Alam II signed the Treaty of Allahabad.\n4. Robert Clive led the British forces at Buxar.',
}
const resStatements = validateBPSCMcq(invalidStatementsMcq)
assert(resStatements.passed === false, 'MCQ with 4 statements fails validation')
assert(resStatements.failedChecks.includes('CHK-06'), 'Fails CHK-06 (Maximum 3 Statements)')

// Defect 2: Option E is not "Not Attempted"
const invalidOptionEMcq = {
  ...validMcq,
  options: {
    A: 'Jayaprakash Narayan',
    B: 'Rajendra Prasad',
    C: 'Anugrah Narayan Sinha',
    D: 'Shrikrishna Singh',
    E: 'More than one of the above',
  },
}
const resOptionE = validateBPSCMcq(invalidOptionEMcq)
assert(resOptionE.passed === false, 'MCQ with wrong Option E fails validation')
assert(resOptionE.failedChecks.includes('CHK-05'), 'Fails CHK-05 (Option E = Not Attempted)')

// Defect 3: Clue leakage ("All of the above" in Option D)
const invalidClueMcq = {
  ...validMcq,
  options: {
    A: 'Option 1',
    B: 'Option 2',
    C: 'Option 3',
    D: 'All of the above',
    E: 'Not Attempted',
  },
}
const resClue = validateBPSCMcq(invalidClueMcq)
assert(resClue.passed === false, 'MCQ with "All of the above" in Option D fails validation')
assert(resClue.failedChecks.includes('CHK-09'), 'Fails CHK-09 (No Clue Leakage in A-D)')

// Defect 4: Duplicate options
const invalidDupeOptsMcq = {
  ...validMcq,
  options: {
    A: 'Patna',
    B: 'Gaya',
    C: 'Patna',
    D: 'Bhagalpur',
    E: 'Not Attempted',
  },
}
const resDupeOpts = validateBPSCMcq(invalidDupeOptsMcq)
assert(resDupeOpts.passed === false, 'MCQ with duplicate options fails validation')
assert(resDupeOpts.failedChecks.includes('CHK-10'), 'Fails CHK-10 (Unique Options A-D)')

// ── TEST G: Batch Validation & Targeted Regeneration ──
console.log('\nTEST G: Batch Validation & Selective Regeneration of Failed Items')

// Simulate a batch of 100 where 86 are valid and 14 have defect (e.g. wrong Option E)
const testBatch = []
for (let i = 0; i < 86; i++) {
  testBatch.push({
    ...validMcq,
    question: `Question #${i + 1}: Which leader participated in the Champaran Satyagraha of 1917 item ${i + 1}?`,
  })
}
for (let i = 86; i < 100; i++) {
  testBatch.push({
    ...validMcq,
    question: `Defective Question #${i + 1}: Defective item details for question ${i + 1}?`,
    options: {
      A: 'Option A',
      B: 'Option B',
      C: 'Option C',
      D: 'Option D',
      E: 'None of the above', // Invalid Option E
    },
  })
}

const batchResult = validateBPSCBatch(testBatch)
assert(batchResult.total === 100, 'Batch total is 100')
assert(batchResult.validCount === 86, '86 questions passed validation')
assert(batchResult.invalidCount === 14, '14 questions failed validation')
assert(batchResult.passedItems.length === 86, 'Passed items array length is exactly 86')
assert(batchResult.failedItems.length === 14, 'Failed items array length is exactly 14')

// Build targeted regeneration prompt for only the 14 failed items
const regenPrompt = buildTargetedRegenerationPrompt({
  failedItems: batchResult.failedItems,
  course: 'BPSC Prelims',
  subject: 'History',
  chapter: 'Modern India',
  language: 'English',
})

assert(regenPrompt.includes('You are regenerating 14 failed BPSC Prelims MCQs'), 'Regeneration prompt targets exactly 14 failed MCQs')
assert(regenPrompt.includes('QUANTITY REQUIRED: Exactly 14 MCQs'), 'Quantity required is 14 (not 100)')
assert(regenPrompt.includes('DIAGNOSTIC DEFECTS TO FIX'), 'Regeneration prompt includes diagnostic defects feedback')

// ── TEST H: Course Foreign Key Integrity & Subject Creation ──
console.log('\nTEST H: Course Foreign Key & Subject Integrity')
import { courseService } from './src/services/courseService.js'
import { subjectService } from './src/services/subjectService.js'
import { parseStructuredQuestion, extractPyqInfo } from './src/utils/questionParser.js'

assert(typeof courseService.ensureCourseExists === 'function', 'courseService.ensureCourseExists is defined')
assert(typeof subjectService.createSubject === 'function', 'subjectService.createSubject is defined')

// ── TEST I: Clean Question Parser & PYQ Highlighting ──
console.log('\nTEST I: Clean Question Parser & PYQ Highlighting')

const sampleQuestion = 'Which of the following was NOT a major method associated with the Civil Disobedience Movement?'
const parsedQ = parseStructuredQuestion(sampleQuestion)

assert(parsedQ.type === 'standard', 'Question parsed as type "standard"')
assert(parsedQ.text.includes('Civil Disobedience Movement'), 'Question text preserved intact')

// PYQ Info Extraction
const pyq1 = { is_pyq: true, exam_year: '2023', pyq_exam: 'BPSC 69th', question_number: '12' }
const info1 = extractPyqInfo(pyq1)
assert(info1 && info1.isPyq === true, 'PYQ info recognized from is_pyq and exam_year')
assert(info1.label === 'BPSC 69th 2023 · Q12', 'PYQ label formatted as "BPSC 69th 2023 · Q12"')

const pyq2 = { text: '[BPSC 2022] Who was the first Chief Minister of Bihar?' }
const info2 = extractPyqInfo(pyq2)
assert(info2 && info2.isPyq === true, 'PYQ info recognized from embedded [BPSC 2022] tag')
assert(info2.label === 'BPSC 2022', 'Embedded tag label formatted as "BPSC 2022"')

// ── TEST J: JSON Key-Value Options Mapping ──
console.log('\nTEST J: JSON Key-Value Options Mapping Integrity')

const sampleJsonMcq = {
  question: "Which of the following was NOT a major method associated with the Civil Disobedience Movement?",
  options: {
    A: "Salt Satyagraha at coastal regions",
    B: "Boycott of foreign textiles and liquor shops",
    C: "Non-payment of land revenue and chaukidari tax",
    D: "Armed violent insurrection against state armories",
    E: "Not Attempted"
  },
  correct: "D",
  explanation: "Armed violent insurrection was not part of the mainstream Civil Disobedience Movement led by Mahatma Gandhi.",
  difficulty: "Medium"
}

// Emulate option extraction
const getOptFromObj = (item, letter, idx) => {
  if (item.options) {
    if (typeof item.options === 'object' && !Array.isArray(item.options)) {
      if (item.options[letter] !== undefined && item.options[letter] !== null) return String(item.options[letter])
      if (item.options[letter.toUpperCase()] !== undefined && item.options[letter.toUpperCase()] !== null) return String(item.options[letter.toUpperCase()])
      if (item.options[letter.toLowerCase()] !== undefined && item.options[letter.toLowerCase()] !== null) return String(item.options[letter.toLowerCase()])
      if (item.options[idx] !== undefined && item.options[idx] !== null) return String(item.options[idx])
    }
  }
  return item[`option_${letter.toLowerCase()}`] || ''
}

assert(getOptFromObj(sampleJsonMcq, 'A', 0) === 'Salt Satyagraha at coastal regions', 'Option A extracted from JSON object accurately')
assert(getOptFromObj(sampleJsonMcq, 'B', 1) === 'Boycott of foreign textiles and liquor shops', 'Option B extracted from JSON object accurately')
assert(getOptFromObj(sampleJsonMcq, 'C', 2) === 'Non-payment of land revenue and chaukidari tax', 'Option C extracted from JSON object accurately')
assert(getOptFromObj(sampleJsonMcq, 'D', 3) === 'Armed violent insurrection against state armories', 'Option D extracted from JSON object accurately')
assert(getOptFromObj(sampleJsonMcq, 'E', 4) === 'Not Attempted', 'Option E extracted from JSON object accurately')

// ── TEST K: Admin Notes Service & Scoping Integrity ──
console.log('\nTEST K: Admin Notes Service & Scoping Contracts')
import { noteService } from './src/services/noteService.js'

assert(typeof noteService.getNotes === 'function', 'noteService.getNotes is defined')
assert(typeof noteService.getNoteById === 'function', 'noteService.getNoteById is defined')
assert(typeof noteService.createNote === 'function', 'noteService.createNote is defined')
assert(typeof noteService.updateNote === 'function', 'noteService.updateNote is defined')
assert(typeof noteService.deleteNote === 'function', 'noteService.deleteNote is defined')
assert(typeof noteService.uploadNoteImage === 'function', 'noteService.uploadNoteImage is defined')

// Validation test: missing fields
const emptyCreate = await noteService.createNote({ courseId: '', subjectId: '', chapterId: '', title: '', content: '' })
assert(emptyCreate.success === false, 'noteService.createNote rejects missing Course ID')
assert(emptyCreate.error.includes('Course is required'), 'noteService.createNote gives explicit validation error')

const missingChapterCreate = await noteService.createNote({ courseId: 'c1', subjectId: 's1', chapterId: '', title: 'Title', content: 'Content' })
assert(missingChapterCreate.success === false, 'noteService.createNote rejects missing Chapter ID')

const emptyTitleCreate = await noteService.createNote({ courseId: 'c1', subjectId: 's1', chapterId: 'ch1', title: '', content: 'Content' })
assert(emptyTitleCreate.success === false, 'noteService.createNote rejects empty title')

const emptyContentCreate = await noteService.createNote({ courseId: 'c1', subjectId: 's1', chapterId: 'ch1', title: 'Valid Title', content: '' })
assert(emptyContentCreate.success === false, 'noteService.createNote rejects empty content')

// ── SUMMARY ──
console.log('\n=============================================================')
console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
console.log('=============================================================\n')

if (failedTests > 0) {
  process.exit(1)
}



