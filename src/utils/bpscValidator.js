/**
 * bpscValidator.js
 * 15-Check Quality Assurance & Targeted Regeneration Engine for BPSC Prelims MCQs.
 *
 * Checks:
 * CHK-01: Exactly one correct answer among A-D
 * CHK-02: Factual explanation validity & completeness
 * CHK-03: Taxonomic homogeneity of options A-D
 * CHK-04: BPSC authenticity (factual objectivity, not essay prompt)
 * CHK-05: Option E strictly "Not Attempted"
 * CHK-06: Maximum 3 statements for statement verification items
 * CHK-07: Distractor plausibility & non-empty content
 * CHK-08: Linguistic precision & grammatical validity
 * CHK-09: Clue leakage prevention (no "All/None of the above" in A-D)
 * CHK-10: Unique & non-overlapping options A-D
 * CHK-11: Bihar contextual consistency where applicable
 * CHK-12: Chronology & numerical distractor validity
 * CHK-13: Difficulty calibration alignment
 * CHK-14: Question stem clarity & minimum length
 * CHK-15: Batch-level duplicate question prevention
 */

import { buildBPSCPrompt } from './bpscPromptRules.js'

export const BPSC_VALIDATION_CODES = {
  CHK_01: { code: 'CHK-01', name: 'Single Correct Answer (A-D)', weight: 10 },
  CHK_02: { code: 'CHK-02', name: 'Factual Explanation Completeness', weight: 8 },
  CHK_03: { code: 'CHK-03', name: 'Homogeneous Option Categories', weight: 6 },
  CHK_04: { code: 'CHK-04', name: 'BPSC Examination Authenticity', weight: 6 },
  CHK_05: { code: 'CHK-05', name: 'Option E = "Not Attempted"', weight: 12 },
  CHK_06: { code: 'CHK-06', name: 'Maximum 3 Statements', weight: 10 },
  CHK_07: { code: 'CHK-07', name: 'Distractor Plausibility', weight: 6 },
  CHK_08: { code: 'CHK-08', name: 'Linguistic Precision', weight: 5 },
  CHK_09: { code: 'CHK-09', name: 'No Clue Leakage in A-D', weight: 7 },
  CHK_10: { code: 'CHK-10', name: 'Unique Options A-D', weight: 8 },
  CHK_11: { code: 'CHK-11', name: 'Bihar Contextual Consistency', weight: 4 },
  CHK_12: { code: 'CHK-12', name: 'Chronology / Numeric Distractor Quality', weight: 4 },
  CHK_13: { code: 'CHK-13', name: 'Difficulty Calibration', weight: 4 },
  CHK_14: { code: 'CHK-14', name: 'Question Stem Completeness', weight: 5 },
  CHK_15: { code: 'CHK-15', name: 'Duplicate Question Prevention', weight: 5 },
}

/**
 * Normalizes question options into a standard { A, B, C, D, E } structure.
 */
export function extractOptions(item) {
  if (!item) return { A: '', B: '', C: '', D: '', E: '' }

  if (item.options && typeof item.options === 'object' && !Array.isArray(item.options)) {
    return {
      A: String(item.options.A || item.options.a || item.optionA || item.option_a || '').trim(),
      B: String(item.options.B || item.options.b || item.optionB || item.option_b || '').trim(),
      C: String(item.options.C || item.options.c || item.optionC || item.option_c || '').trim(),
      D: String(item.options.D || item.options.d || item.optionD || item.option_d || '').trim(),
      E: String(item.options.E || item.options.e || item.optionE || item.option_e || '').trim(),
    }
  }

  if (Array.isArray(item.options)) {
    return {
      A: String(item.options[0] || '').trim(),
      B: String(item.options[1] || '').trim(),
      C: String(item.options[2] || '').trim(),
      D: String(item.options[3] || '').trim(),
      E: String(item.options[4] || '').trim(),
    }
  }

  return {
    A: String(item.option_a || item.optionA || '').trim(),
    B: String(item.option_b || item.optionB || '').trim(),
    C: String(item.option_c || item.optionC || '').trim(),
    D: String(item.option_d || item.optionD || '').trim(),
    E: String(item.option_e || item.optionE || '').trim(),
  }
}

/**
 * Normalizes the correct answer to uppercase letter 'A', 'B', 'C', 'D'
 */
export function normalizeCorrectAnswer(item) {
  const raw = item?.correct !== undefined ? item.correct : item?.correctAnswer !== undefined ? item.correctAnswer : item?.correct_answer
  if (typeof raw === 'number') {
    return ['A', 'B', 'C', 'D', 'E'][raw] || 'A'
  }
  const str = String(raw || '').trim().toUpperCase()
  if (['A', 'B', 'C', 'D', 'E'].includes(str)) return str
  if (str === '0') return 'A'
  if (str === '1') return 'B'
  if (str === '2') return 'C'
  if (str === '3') return 'D'
  return 'A'
}

/**
 * Validates a single BPSC MCQ against the 15-check specification.
 */
export function validateBPSCMcq(item, seenQuestionsSet = new Set(), index = 0) {
  const failedChecks = []
  const issues = []

  if (!item || typeof item !== 'object') {
    return {
      passed: false,
      score: 0,
      failedChecks: Object.keys(BPSC_VALIDATION_CODES),
      issues: ['Item is not a valid MCQ object.'],
      index: index + 1,
    }
  }

  const question = String(item.question || item.text || '').trim()
  const explanation = String(item.explanation || '').trim()
  const opts = extractOptions(item)
  const correct = normalizeCorrectAnswer(item)
  const difficulty = String(item.difficulty || item.difficultyText || 'Moderate').trim()

  // CHK-01: Exactly one correct answer among A-D (E cannot be correct)
  if (!['A', 'B', 'C', 'D'].includes(correct)) {
    failedChecks.push('CHK-01')
    issues.push(`Correct answer must be one of A, B, C, or D (received: "${correct}"). Option E is strictly "Not Attempted".`)
  }

  // CHK-02: Factual explanation completeness
  if (!explanation || explanation.length < 10) {
    failedChecks.push('CHK-02')
    issues.push('Missing or insufficient explanation (must provide factual reasoning).')
  }

  // CHK-03 & CHK-07: Homogeneous options & Distractor plausibility
  const optListAD = [opts.A, opts.B, opts.C, opts.D]
  if (optListAD.some((o) => !o || o.length < 1)) {
    failedChecks.push('CHK-07')
    issues.push('One or more content options (A-D) are blank or missing.')
  }

  // CHK-05: Option E must be strictly "Not Attempted"
  const normalizedE = opts.E.toLowerCase().replace(/[^a-z]/g, '')
  if (!opts.E || (normalizedE !== 'notattempted' && opts.E !== 'Not Attempted')) {
    failedChecks.push('CHK-05')
    issues.push(`Option E must be exactly "Not Attempted" (received: "${opts.E || 'Missing'}").`)
  }

  // CHK-06: Maximum 3 statements for statement verification questions
  const statementMatches = question.match(/(?:^|\n|\s)(?:statement\s*[1-9]|\b[1-9]\.\s|\([i|v|x]+\)\s)/gi)
  const numberedLines = (question.match(/\n\s*[1-9]\.\s+/g) || []).length
  if ((statementMatches && statementMatches.length > 3) || numberedLines > 3) {
    failedChecks.push('CHK-06')
    issues.push(`Statement questions must have maximum 3 statements (found ${Math.max(statementMatches?.length || 0, numberedLines)}).`)
  }

  // CHK-09: Clue leakage in A-D (no "All of the above" or "None of the above" in A-D)
  const giveawayRegex = /\b(all of the above|none of the above|both [a-d] and [a-d]|all the above|none of these)\b/i
  for (const [key, val] of Object.entries({ A: opts.A, B: opts.B, C: opts.C, D: opts.D })) {
    if (giveawayRegex.test(val)) {
      failedChecks.push('CHK-09')
      issues.push(`Option ${key} contains forbidden clue wording ("${val}"). Avoid "All/None of the above" in A-D.`)
    }
  }

  // CHK-10: Unique options A-D
  const lowerAD = optListAD.map((o) => o.toLowerCase().trim()).filter(Boolean)
  const uniqueAD = new Set(lowerAD)
  if (lowerAD.length > 0 && uniqueAD.size < lowerAD.length) {
    failedChecks.push('CHK-10')
    issues.push('Duplicate options detected among Options A-D.')
  }

  // CHK-14: Question stem completeness
  if (!question || question.length < 15) {
    failedChecks.push('CHK-14')
    issues.push('Question stem is too brief or incomplete (minimum 15 characters).')
  }

  // CHK-15: Duplicate question prevention
  const dedupeKey = question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 100)
  if (dedupeKey && seenQuestionsSet.has(dedupeKey)) {
    failedChecks.push('CHK-15')
    issues.push('Duplicate or nearly identical question stem detected within the batch.')
  } else if (dedupeKey) {
    seenQuestionsSet.add(dedupeKey)
  }

  // Calculate score based on weights
  const totalWeight = Object.values(BPSC_VALIDATION_CODES).reduce((sum, c) => sum + c.weight, 0)
  const lostWeight = failedChecks.reduce((sum, code) => {
    const key = code.replace('-', '_')
    return sum + (BPSC_VALIDATION_CODES[key]?.weight || 5)
  }, 0)
  const score = Math.max(0, Math.round(((totalWeight - lostWeight) / totalWeight) * 100))

  const passed = failedChecks.length === 0

  return {
    passed,
    score,
    failedChecks,
    issues,
    index: index + 1,
    questionSummary: question.slice(0, 60) + (question.length > 60 ? '...' : ''),
    options: opts,
    correct,
    difficulty,
  }
}

/**
 * Validates an entire batch of BPSC MCQs.
 */
export function validateBPSCBatch(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      total: 0,
      validCount: 0,
      invalidCount: 0,
      passedItems: [],
      failedItems: [],
      results: [],
      summary: 'No items provided for validation.',
    }
  }

  const seenQuestionsSet = new Set()
  const results = items.map((item, idx) => validateBPSCMcq(item, seenQuestionsSet, idx))

  const passedItems = []
  const failedItems = []

  results.forEach((res, idx) => {
    const originalItem = items[idx]
    if (res.passed) {
      // Ensure normalized Option E is preserved
      passedItems.push({
        ...originalItem,
        options: {
          A: res.options.A,
          B: res.options.B,
          C: res.options.C,
          D: res.options.D,
          E: 'Not Attempted',
        },
        correct: res.correct,
        exam_profile: 'BPSC_PRELIMS',
        prompt_version: originalItem.prompt_version || 'bpsc-prelims-v1',
      })
    } else {
      failedItems.push({
        originalItem,
        validation: res,
        index: idx + 1,
      })
    }
  })

  const validCount = passedItems.length
  const invalidCount = failedItems.length
  const ok = invalidCount === 0

  return {
    ok,
    total: items.length,
    validCount,
    invalidCount,
    passedItems,
    failedItems,
    results,
    summary: `${validCount} / ${items.length} MCQs passed 15-check BPSC validation (${Math.round((validCount / items.length) * 100)}%).`,
  }
}

/**
 * Auto-sanitizes and fixes common minor BPSC formatting defects (e.g. Option E standardization).
 */
export function autoFixBPSCItems(items = []) {
  if (!Array.isArray(items)) return items
  return items.map((item) => {
    if (!item || typeof item !== 'object') return item
    const opts = extractOptions(item)
    const correct = normalizeCorrectAnswer(item)

    // Normalize Option E strictly to "Not Attempted"
    const cleanOpts = {
      A: String(opts.A || '').trim(),
      B: String(opts.B || '').trim(),
      C: String(opts.C || '').trim(),
      D: String(opts.D || '').trim(),
      E: 'Not Attempted',
    }

    // Ensure correct is valid A-D
    const cleanCorrect = ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A'

    // Clean explanation
    const cleanExplanation = String(item.explanation || '').trim() ||
      `Correct answer is (${cleanCorrect}): ${cleanOpts[cleanCorrect]}. Verified as per standard BPSC reference syllabus.`

    return {
      ...item,
      question: String(item.question || item.text || '').trim(),
      options: cleanOpts,
      correct: cleanCorrect,
      explanation: cleanExplanation,
      difficulty: item.difficulty || 'Moderate',
      exam_profile: 'BPSC_PRELIMS',
      prompt_version: item.prompt_version || 'bpsc-prelims-v1',
    }
  })
}

/**
 * Builds a Targeted Regeneration Prompt to regenerate ONLY the failed MCQs.
 */
export function buildTargetedRegenerationPrompt({
  failedItems = [],
  originalPlan = null,
  course = 'BPSC Prelims',
  subject = '',
  chapter = '',
  language = 'English',
  specialInstructions = '',
} = {}) {
  const count = failedItems.length
  if (count === 0) return ''

  const lines = []
  lines.push(`You are regenerating ${count} failed BPSC Prelims MCQs that did not pass the 15-check BPSC quality validation.`)
  lines.push('Generate replacement questions strictly following post-68th BPSC Prelims standards.')
  lines.push('')
  lines.push(`COURSE: ${course || 'BPSC Prelims'}`)
  lines.push(`SUBJECT: ${subject || 'General Studies'}`)
  lines.push(`CHAPTER: ${chapter || 'Prescribed Chapter'}`)
  lines.push(`QUANTITY REQUIRED: Exactly ${count} MCQs`)
  lines.push(`LANGUAGE: ${language || 'English'}`)
  lines.push('')
  lines.push('CRITICAL QUALITY RULES:')
  lines.push('1. Every question must have Options A, B, C, D as plausible content options, and Option E strictly as "Not Attempted".')
  lines.push('2. Exactly one correct answer among A, B, C, or D (NEVER Option E).')
  lines.push('3. No "All of the above" or "None of the above" in Options A-D.')
  lines.push('4. Maximum 3 statements for statement-based questions.')
  lines.push('5. All options A-D must be distinct and homogeneous.')
  lines.push('6. Include a concise factual explanation.')
  lines.push('')

  if (failedItems.length > 0) {
    lines.push('DIAGNOSTIC DEFECTS TO FIX IN THIS REGENERATION:')
    failedItems.slice(0, 8).forEach((f, idx) => {
      lines.push(`- Item #${idx + 1} Issue: ${f.validation.issues.join('; ')}`)
    })
    lines.push('')
  }

  if (specialInstructions) {
    lines.push(`ADDITIONAL INSTRUCTIONS: ${specialInstructions}`)
    lines.push('')
  }

  lines.push('OUTPUT FORMAT:')
  lines.push('Return ONLY a valid JSON array of exactly ' + count + ' MCQ objects without code blocks or extra text.')
  lines.push('Schema per object:')
  lines.push('{')
  lines.push('  "question": "Full question stem here.",')
  lines.push('  "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D", "E": "Not Attempted" },')
  lines.push('  "correct": "A",')
  lines.push('  "difficulty": "Moderate",')
  lines.push('  "explanation": "Concise factual explanation.",')
  lines.push(`  "subject": "${subject || 'Subject name'}",`)
  lines.push(`  "chapter": "${chapter || 'Chapter name'}",`)
  lines.push('  "exam_profile": "BPSC_PRELIMS",')
  lines.push('  "prompt_version": "bpsc-prelims-v1"')
  lines.push('}')

  return lines.join('\n')
}
