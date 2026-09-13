/**
 * chapterPracticeEngine.js
 * Comprehensive Multi-Angle, Quality Gate, Anti-Duplication & Continuous Expansion Engine for Nexora.
 *
 * Implements:
 * 1. 28 Question Angles Taxonomy & Cognitive Levels
 * 2. Strict Anti-Duplication (N-Gram Jaccard + Levenshtein)
 * 3. Quality Gate Validator (Distractor Quality, Option Logic, Explanations)
 * 4. Continuous Question Bank Gap Analyzer & 200-300 Target Expansion Builder
 */

import { decomposeChapterIntoKnowledgeTree, getFlatConceptsForChapter, tagQuestionWithConcept } from '../services/knowledgeHierarchyService.js'

// ── 1. The 28 Question Angles Taxonomy ─────────────────────────────
export const QUESTION_ANGLES = [
  // Category A: Conceptual & Foundational
  { id: 'definition', name: 'Definition & Terminology', category: 'Conceptual', cognitiveLevel: 'Recall', desc: 'Standard definitions, scientific terminology, and formal phrasing.' },
  { id: 'identification', name: 'Identification & Recognition', category: 'Conceptual', cognitiveLevel: 'Understand', desc: 'Identifying terms, components, symbols, formulas, or structures from given characteristics.' },
  { id: 'conceptual_understanding', name: 'Conceptual Understanding', category: 'Conceptual', cognitiveLevel: 'Understand', desc: 'Testing the underlying mechanics and "why" behind phenomena.' },
  { id: 'properties', name: 'Properties & Characteristics', category: 'Conceptual', cognitiveLevel: 'Understand', desc: 'Inherent traits, physical/logical properties, and distinguishing attributes.' },
  { id: 'rules', name: 'Rules & Governing Laws', category: 'Conceptual', cognitiveLevel: 'Understand', desc: 'Direct application of foundational theorems, axioms, and official rules.' },
  { id: 'classification', name: 'Classification & Hierarchy', category: 'Conceptual', cognitiveLevel: 'Understand', desc: 'Categorizing elements into types, taxonomy levels, or protocols.' },
  { id: 'comparison', name: 'Comparison & Analogy', category: 'Conceptual', cognitiveLevel: 'Analyze', desc: 'Comparing similarities across multiple structures or models.' },
  { id: 'difference', name: 'Difference & Contrast', category: 'Conceptual', cognitiveLevel: 'Analyze', desc: 'Contrasting distinct mechanisms (e.g., Fission vs Fusion, TCP vs UDP, 2NF vs 3NF).' },
  { id: 'cause_effect', name: 'Cause and Effect', category: 'Conceptual', cognitiveLevel: 'Analyze', desc: 'Tracing outcomes resulting from specific state changes or conditions.' },

  // Category B: Practical, Scenario & Edge-Cases
  { id: 'application', name: 'Direct Application', category: 'Application', cognitiveLevel: 'Apply', desc: 'Applying principles to standard practical problems or domain use-cases.' },
  { id: 'scenario_based', name: 'Scenario-Based Reasoning', category: 'Application', cognitiveLevel: 'Apply', desc: 'Real-world case situations requiring problem framing and solution selection.' },
  { id: 'practical_use', name: 'Practical & Industrial Use', category: 'Application', cognitiveLevel: 'Apply', desc: 'Real-world equipment, industrial applications, clinical/field scenarios.' },
  { id: 'example_based', name: 'Example-Based', category: 'Application', cognitiveLevel: 'Understand', desc: 'Classifying or recognizing concrete examples of theoretical constructs.' },
  { id: 'counter_example', name: 'Counter-Example Recognition', category: 'Application', cognitiveLevel: 'Analyze', desc: 'Identifying items that violate a general rule or proposition.' },
  { id: 'exception', name: 'Exceptions & Special Cases', category: 'Application', cognitiveLevel: 'Analyze', desc: 'Boundary conditions and known exceptions to general rules.' },
  { id: 'edge_case', name: 'Edge-Case Analysis', category: 'Application', cognitiveLevel: 'Evaluate', desc: 'Limiting values (0, infinity, null, boundary limits) and extreme situations.' },

  // Category C: Analytical & Multi-Step Reasoning
  { id: 'statement_analysis', name: 'Statement Analysis (True/False & Assertions)', category: 'Reasoning', cognitiveLevel: 'Analyze', desc: 'Evaluating validity of 1 or 2 targeted analytical statements.' },
  { id: 'multi_statement_reasoning', name: 'Multiple-Statement Reasoning (I, II, III)', category: 'Reasoning', cognitiveLevel: 'Evaluate', desc: 'Evaluating combinations of 3–4 statements ("Which of the above are correct?").' },
  { id: 'concept_combination', name: 'Concept Combination', category: 'Reasoning', cognitiveLevel: 'Multi-step reasoning', desc: 'Connecting two or more distinct concepts within the chapter to solve a single problem.' },
  { id: 'misconception_trap', name: 'Misconception-Based Trap', category: 'Reasoning', cognitiveLevel: 'Analyze', desc: 'Deliberately targeting common student errors, false intuition, or confused terminology.' },

  // Category D: Technical, Computational & Code Output
  { id: 'numerical_solving', name: 'Numerical / Problem Solving', category: 'Computational', cognitiveLevel: 'Apply', desc: 'Calculations with numerical parameters, unit conversions, and quantitative results.' },
  { id: 'formula_based', name: 'Formula Application & Derivation', category: 'Computational', cognitiveLevel: 'Apply', desc: 'Direct algebraic substitutions and proportional relationship evaluations.' },
  { id: 'algorithm_tracing', name: 'Algorithm Tracing', category: 'Computational', cognitiveLevel: 'Analyze', desc: 'Step-by-step execution tracking of algorithms (sorting, scheduling, routing).' },
  { id: 'code_output', name: 'Code Output Prediction', category: 'Computational', cognitiveLevel: 'Analyze', desc: 'Predicting exact terminal output of code snippets (Python, SQL, C, Java).' },
  { id: 'syntax', name: 'Syntax & Construction', category: 'Computational', cognitiveLevel: 'Understand', desc: 'Valid syntax constructs, keyword rules, and grammar definitions.' },
  { id: 'error_identification', name: 'Error Identification', category: 'Computational', cognitiveLevel: 'Analyze', desc: 'Spotting syntax errors, logical bugs, or design flaws in given representations.' },
  { id: 'debugging', name: 'Debugging & Fix Proposal', category: 'Computational', cognitiveLevel: 'Evaluate', desc: 'Selecting correct patches or modifications to rectify incorrect behavior.' },
  { id: 'logical_reasoning', name: 'Logical Deduction & Truth Tables', category: 'Computational', cognitiveLevel: 'Multi-step reasoning', desc: 'Boolean logic, deduction chains, and Venn/K-map reductions.' },
]

export const DIFFICULTY_DISTRIBUTION = {
  Easy: { pct: 25, label: 'Easy (Fundamentals & Core Recall)', multiplier: 0.25 },
  Moderate: { pct: 45, label: 'Moderate (Conceptual & Direct Application)', multiplier: 0.45 },
  Difficult: { pct: 20, label: 'Difficult (Application, Tracing & Multi-Step)', multiplier: 0.20 },
  'Very Difficult': { pct: 10, label: 'Very Difficult (Edge-Cases & Concept Combinations)', multiplier: 0.10 },
}

export const COGNITIVE_LEVELS = [
  'Recall',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Multi-step reasoning',
]

// ── 2. Anti-Duplication & String Similarity ─────────────────────────
/**
 * Normalizes question string for robust comparison (lowercase, strip punctuation, sort words).
 */
export function normalizeForComparison(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Computes character-level Levenshtein distance between two strings.
 */
export function levenshteinDistance(s1, s2) {
  const m = s1.length
  const n = s2.length
  if (m === 0) return n
  if (n === 0) return m

  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      )
    }
  }
  return d[m][n]
}

/**
 * Computes token-level 2-gram and word Jaccard similarity between two strings (0.0 to 1.0).
 */
export function computeTokenJaccardSimilarity(textA = '', textB = '') {
  const cleanA = normalizeForComparison(textA)
  const cleanB = normalizeForComparison(textB)

  if (!cleanA || !cleanB) return 0
  if (cleanA === cleanB) return 1.0

  const wordsA = new Set(cleanA.split(' ').filter((w) => w.length > 2))
  const wordsB = new Set(cleanB.split(' ').filter((w) => w.length > 2))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let intersection = 0
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection += 1
  })

  const union = wordsA.size + wordsB.size - intersection
  const wordJaccard = union > 0 ? intersection / union : 0

  // Quick Levenshtein ratio on short text (< 200 chars)
  let levRatio = 0
  if (cleanA.length < 200 && cleanB.length < 200) {
    const maxLen = Math.max(cleanA.length, cleanB.length)
    const dist = levenshteinDistance(cleanA, cleanB)
    levRatio = maxLen > 0 ? 1 - dist / maxLen : 0
  }

  return Math.max(wordJaccard, levRatio)
}

/**
 * Strict Anti-Duplication Checker.
 * Prevents exact and near-duplicates while permitting same-concept questions
 * if they legitimately test different question angles or cognitive levels.
 */
export function checkQuestionDuplication(newQuestion, existingQuestions = [], threshold = 0.76) {
  if (!newQuestion || !Array.isArray(existingQuestions) || existingQuestions.length === 0) {
    return { isDuplicate: false, matchedQuestion: null, similarity: 0 }
  }

  const newText = newQuestion.question || newQuestion.text || ''
  const newAngle = newQuestion.questionAngle || newQuestion.angle || ''
  const newConcept = newQuestion.conceptId || ''

  for (const existing of existingQuestions) {
    if (!existing || existing.id === newQuestion.id) continue
    const exText = existing.question || existing.text || ''

    const similarity = computeTokenJaccardSimilarity(newText, exText)

    if (similarity >= 0.90) {
      return {
        isDuplicate: true,
        reason: 'Exact or near-identical question text detected.',
        similarity,
        matchedQuestion: existing,
      }
    }

    if (similarity >= threshold) {
      const exAngle = existing.questionAngle || existing.angle || ''
      const exConcept = existing.conceptId || ''

      // If they test the same concept and the same angle, flag as redundant
      if ((newAngle && exAngle && newAngle === exAngle) || (newConcept && exConcept && newConcept === exConcept)) {
        return {
          isDuplicate: true,
          reason: `Near-duplicate question on concept "${newConcept || 'same'}" using the same angle "${newAngle || 'standard'}".`,
          similarity,
          matchedQuestion: existing,
        }
      }
    }
  }

  return { isDuplicate: false, similarity: 0, matchedQuestion: null }
}

// ── 3. Quality Gate Validator ───────────────────────────────────────
/**
 * Rigorously validates an MCQ item before admission to the student practice bank.
 */
export function validateQuestionQuality(item) {
  const errors = []
  const warnings = []

  if (!item) {
    return { isValid: false, errors: ['Null or empty question object'] }
  }

  const qText = String(item.question || item.text || '').trim()
  if (qText.length < 15) {
    errors.push('Question text is too short or incomplete (minimum 15 characters).')
  }

  // Options validation
  const options = []
  if (Array.isArray(item.options) && item.options.length > 0) {
    options.push(...item.options.map((o) => String(o || '').trim()))
  } else {
    const optA = String(item.option_a || item.optionA || '').trim()
    const optB = String(item.option_b || item.optionB || '').trim()
    const optC = String(item.option_c || item.optionC || '').trim()
    const optD = String(item.option_d || item.optionD || '').trim()
    const optE = String(item.option_e || item.optionE || '').trim()
    if (optA) options.push(optA)
    if (optB) options.push(optB)
    if (optC) options.push(optC)
    if (optD) options.push(optD)
    if (optE) options.push(optE)
  }

  if (options.length < 4) {
    errors.push(`MCQ must contain at least 4 options. Found only ${options.length}.`)
  }

  // Check for duplicate options
  const uniqueOptions = new Set(options.map((o) => o.toLowerCase()))
  if (uniqueOptions.size < options.length) {
    errors.push('MCQ contains duplicate options.')
  }

  // Check for trivial/joke distractors
  const jokePatterns = [
    /none of our business/i,
    /magic/i,
    /i do not know/i,
    /god knows/i,
    /dummy option/i,
    /option (a|b|c|d|e)$/i,
  ]
  options.forEach((opt, idx) => {
    jokePatterns.forEach((pat) => {
      if (pat.test(opt)) {
        errors.push(`Option ${String.fromCharCode(65 + idx)} contains a joke or placeholder distractor: "${opt}"`)
      }
    })
  })

  // Correct answer index
  let correctIdx = 0
  const rawCorrect = item.correct !== undefined ? item.correct : (item.correct_answer !== undefined ? item.correct_answer : item.correctAnswer)
  if (typeof rawCorrect === 'number') {
    correctIdx = rawCorrect
  } else if (typeof rawCorrect === 'string') {
    const cMap = { A: 0, B: 1, C: 2, D: 3, E: 4, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 }
    correctIdx = cMap[rawCorrect.trim().toUpperCase()] ?? -1
  }

  if (correctIdx < 0 || correctIdx >= options.length) {
    errors.push(`Invalid correct answer index (${correctIdx}) for options length (${options.length}).`)
  }

  // Explanation check
  const explanation = String(item.explanation || '').trim()
  if (!explanation || explanation.length < 20) {
    warnings.push('Explanation is missing or too brief. Detailed conceptual rationale is recommended.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedItem: {
      ...item,
      question: qText,
      options,
      correct: correctIdx,
      correct_answer: correctIdx,
      explanation: explanation || `The correct answer is Option ${String.fromCharCode(65 + correctIdx)}.`,
      difficulty: item.difficulty || 'Moderate',
      cognitiveLevel: item.cognitiveLevel || 'Understand',
      questionAngle: item.questionAngle || 'conceptual_understanding',
    },
  }
}

// ── 4. Continuous Question Bank Gap Analyzer ───────────────────────
/**
 * Inspects a chapter's existing MCQs against the 200–300 Target Question Bank.
 * Calculates conceptual coverage, identifies missing angles, difficulty deficits,
 * and builds targeted prompt payloads for AI expansion.
 */
export function analyzeChapterQuestionGaps(chapter, currentMcqs = [], targetBankSize = 250) {
  if (!chapter) return null

  const title = chapter.title || chapter.name || 'Chapter'
  const desc = chapter.description || chapter.desc || ''
  const subject = chapter.subject || chapter.subjectTitle || 'General Studies'

  const flatConcepts = getFlatConceptsForChapter(chapter, subject)
  const mcqs = Array.isArray(currentMcqs) ? currentMcqs : []

  // Track counts per concept
  const conceptCoverage = {}
  flatConcepts.forEach((c) => {
    conceptCoverage[c.id] = {
      concept: c,
      totalQuestions: 0,
      anglesCovered: new Set(),
      difficultiesCovered: { Easy: 0, Moderate: 0, Difficult: 0, 'Very Difficult': 0 },
      questions: [],
    }
  })

  // Tag questions to concepts
  mcqs.forEach((m) => {
    let tagged = m.conceptId ? flatConcepts.find((c) => c.id === m.conceptId) : null
    if (!tagged) {
      const match = tagQuestionWithConcept(m, flatConcepts)
      if (match) tagged = flatConcepts.find((c) => c.id === match.conceptId)
    }

    const cId = tagged ? tagged.id : (flatConcepts[0]?.id || 'generic-concept')
    if (conceptCoverage[cId]) {
      conceptCoverage[cId].totalQuestions += 1
      if (m.questionAngle) conceptCoverage[cId].anglesCovered.add(m.questionAngle)
      const diff = m.difficulty || 'Moderate'
      conceptCoverage[cId].difficultiesCovered[diff] = (conceptCoverage[cId].difficultiesCovered[diff] || 0) + 1
      conceptCoverage[cId].questions.push(m)
    }
  })

  // Angle distribution across entire chapter
  const angleCounts = {}
  QUESTION_ANGLES.forEach((a) => {
    angleCounts[a.id] = 0
  })
  mcqs.forEach((m) => {
    const ang = m.questionAngle || m.angle
    if (ang && angleCounts[ang] !== undefined) {
      angleCounts[ang] += 1
    }
  })

  // Identify Missing / Under-covered concepts
  const uncoveredConcepts = []
  const undercoveredConcepts = [] // < 5 questions
  const wellCoveredConcepts = []

  const targetPerConcept = flatConcepts.length > 0 ? Math.ceil(targetBankSize / flatConcepts.length) : 25

  Object.values(conceptCoverage).forEach((entry) => {
    if (entry.totalQuestions === 0) {
      uncoveredConcepts.push(entry.concept)
    } else if (entry.totalQuestions < Math.max(4, Math.floor(targetPerConcept * 0.4))) {
      undercoveredConcepts.push({
        ...entry.concept,
        currentCount: entry.totalQuestions,
        deficit: targetPerConcept - entry.totalQuestions,
      })
    } else {
      wellCoveredConcepts.push(entry.concept)
    }
  })

  // Identify Missing Angles (angles with 0 questions)
  const missingAngles = QUESTION_ANGLES.filter((a) => (angleCounts[a.id] || 0) === 0)

  // Identify Difficulty Deficit
  const currentTotal = mcqs.length
  const neededQuestions = Math.max(0, targetBankSize - currentTotal)

  const diffCounts = {
    Easy: mcqs.filter((m) => String(m.difficulty).toLowerCase() === 'easy').length,
    Moderate: mcqs.filter((m) => String(m.difficulty).toLowerCase().includes('mod') || String(m.difficulty).toLowerCase().includes('med')).length,
    Difficult: mcqs.filter((m) => String(m.difficulty).toLowerCase() === 'difficult' || String(m.difficulty).toLowerCase() === 'hard').length,
    'Very Difficult': mcqs.filter((m) => String(m.difficulty).toLowerCase().includes('very')).length,
  }

  const coveragePercent = Math.min(100, Math.round((currentTotal / targetBankSize) * 100))

  return {
    chapterId: chapter.id,
    chapterTitle: title,
    targetBankSize,
    currentTotal,
    neededQuestions,
    coveragePercent,
    flatConcepts,
    conceptCoverage,
    uncoveredConcepts,
    undercoveredConcepts,
    wellCoveredConcepts,
    angleCounts,
    missingAngles,
    diffCounts,
    isTargetMet: currentTotal >= targetBankSize,
  }
}

/**
 * Builds a highly-targeted AI Generation Prompt for filling conceptual gaps
 * to reach the 200–300 distinct question target.
 */
export function buildContinuousExpansionPrompt({
  course = 'Nexora Academic Track',
  subject = '',
  chapter = null,
  gapAnalysis = null,
  batchQuantity = 30,
  language = 'English',
  specialInstructions = '',
} = {}) {
  const title = chapter?.title || chapter?.name || 'Core Chapter'
  const desc = chapter?.description || chapter?.desc || ''
  const gaps = gapAnalysis || analyzeChapterQuestionGaps(chapter)

  const lines = []
  lines.push('You are a Master Academic Professor and Question-Bank Architect creating a world-class, deep chapter question bank for Nexora LMS.')
  lines.push('')
  lines.push('### GOAL: CONTINUOUS QUESTION BANK EXPANSION (TARGET 200–300 DISTINCT MCQs)')
  lines.push(`The objective is to expand the question bank for "${title}" to achieve comprehensive coverage across ALL concepts and 28 distinct question angles.`)
  lines.push('DO NOT generate generic or repetitive questions testing the same concept in the same way.')
  lines.push('')
  lines.push('### HIERARCHICAL CONTEXT:')
  lines.push(`- Course: ${course}`)
  lines.push(`- Subject: ${subject || chapter?.subject || 'General Studies'}`)
  lines.push(`- Chapter: "${title}"`)
  if (desc) lines.push(`- Syllabus Scope: ${desc}`)
  lines.push(`- Target Sub-Batch Quantity: Exactly ${batchQuantity} high-yield MCQs`)
  lines.push(`- Language: ${language}`)
  lines.push('')

  // Include targeted gaps
  if (gaps && gaps.uncoveredConcepts.length > 0) {
    lines.push('### PRIORITY 1: UNTESTED CONCEPTS TO COVER IN THIS BATCH:')
    gaps.uncoveredConcepts.slice(0, 6).forEach((c, idx) => {
      lines.push(`${idx + 1}. Concept: "${c.name}" (Topic: ${c.topicName})`)
      if (c.knowledgePoints?.length > 0) {
        lines.push(`   Knowledge Points: ${c.knowledgePoints.join('; ')}`)
      }
    })
    lines.push('')
  }

  if (gaps && gaps.missingAngles.length > 0) {
    lines.push('### PRIORITY 2: DIVERSE QUESTION ANGLES TO INCORPORATE:')
    gaps.missingAngles.slice(0, 8).forEach((a, idx) => {
      lines.push(`- ${a.name} (${a.category} - ${a.cognitiveLevel}): ${a.desc}`)
    })
    lines.push('')
  }

  lines.push('### DIFFICULTY DISTRIBUTION FOR THIS BATCH:')
  lines.push('- 25% Easy: Establish fundamentals, definitions & core rules.')
  lines.push('- 45% Moderate: Test understanding, standard properties & direct application.')
  lines.push('- 20% Difficult: Multi-step reasoning, practical scenario analysis & numericals.')
  lines.push('- 10% Very Difficult: Edge cases, counter-examples & complex concept combinations.')
  lines.push('')

  lines.push('### STRICT QUALITY & ANTI-DUPLICATION RULES:')
  lines.push('1. Meaningful Distractors: Every wrong option must represent a realistic student misconception, formula confusion, or rule misapplication. NO joke options.')
  lines.push('2. Single Unambiguous Answer: Exactly one option is 100% scientifically/theoretically correct.')
  lines.push('3. Rich Explanations: Provide a 2–4 sentence explanation detailing WHY the correct option is right and WHY the distractors are wrong.')
  lines.push('4. Accurate Metadata: Explicitly tag each MCQ with its concept, topic, difficulty, cognitive level, and question angle.')
  if (specialInstructions) lines.push(`5. Special Directives: ${specialInstructions}`)
  lines.push('')

  lines.push('### OUTPUT FORMAT (STRICT JSON ONLY):')
  lines.push('Return ONLY a valid JSON array of objects enclosed in ```json ... ``` without conversational commentary:')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "question": "Question text testing a specific conceptual angle...",')
  lines.push('    "option_a": "First plausible option",')
  lines.push('    "option_b": "Second option (common misconception)",')
  lines.push('    "option_c": "Third option",')
  lines.push('    "option_d": "Fourth option",')
  lines.push('    "correct_answer": 0,')
  lines.push('    "explanation": "Detailed explanation clarifying the concept and correcting misconceptions.",')
  lines.push('    "difficulty": "Moderate",')
  lines.push('    "cognitive_level": "Apply",')
  lines.push('    "question_angle": "scenario_based",')
  lines.push('    "concept_name": "Name of relevant concept",')
  lines.push('    "topic_name": "Name of relevant topic"')
  lines.push('  }')
  lines.push(']')
  lines.push('```')

  return lines.join('\n')
}
