/**
 * bpscPromptRules.js
 * Centralized BPSC Prelims Master Prompt Rules and Batch Planning Engine.
 *
 * Calibrated against modern post-68th BPSC Prelims specifications:
 * - Factual precision & concrete factual anchors
 * - Moderate analytical elimination & micro-factual depth
 * - Maximum 3 statements for statement verification items
 * - Option architecture: A-D (content) + Option E strictly "Not Attempted"
 * - Realistic distractor engineering (near-miss dates/names/places, Bihar vs national traps)
 * - 22% Bihar-specific integration where naturally relevant
 * - Strict integer-preserving batch planning for arbitrary quantities
 */

import { EXAM_PROFILES } from '../data/examProfiles.js'

export const BPSC_PRELIMS_PROMPT_RULES = `You are a senior question-setter for the Bihar Public Service Commission (BPSC) Combined Competitive Preliminary Examination.
Follow the modern post-68th BPSC Prelims examination calibration with rigorous precision.

CORE PRINCIPLES:
1. ONLY STANDARD MULTIPLE CHOICE QUESTIONS (MCQs): Every item must be a direct, standard multiple-choice question. Do NOT generate assertion-reason pairs.
2. FACTUAL ANCHORING: Every question must be anchored in verifiable, concrete historical, geographical, administrative, scientific, economic, or constitutional facts. Avoid vague or speculative premises.
3. MICRO-FACTUAL DEPTH & ANALYTICAL ELIMINATION: Test authentic depth (e.g. exact organizations, associated treaties, regional jurisdictions, act numbers, committee names, session venues, and chronology) with analytical elimination.
4. DISTRACTOR ENGINEERING (OPTIONS A-D):
   - All options A-D must belong to the exact same taxonomic category (e.g. all 4 are rivers of North Bihar, all 4 are 1920s peasant leaders, all 4 are constitutional articles).
   - Distractors must be plausible and realistic—never obviously absurd, never joke answers.
   - Avoid giveaway answer clues based on option length, grammatical agreement, or extreme qualifiers ("always", "never") unless authentic to the fact.
   - Do NOT use "All of the above" or "None of the above" in Options A-D.
5. OPTION E ARCHITECTURE:
   - Option E MUST ALWAYS BE EXACTLY: "Not Attempted".
   - Do NOT put any subject content or "None of the above / More than one of the above" in Option E.
6. BIHAR INTEGRATION (TARGET ~22%):
   - Integrate Bihar-specific dimensions (Bihar History, Geography, Economy, Polity, Movements, Leaders, Schemes, and Statistics) wherever naturally relevant to the subject/chapter.
   - Do not artificially force Bihar references into purely universal technical topics.
7. LINGUISTIC PRECISION: Use formal, concise administrative Hindi/English examination wording.`

/**
 * Calculates proportional integer distributions ensuring the sum of parts exactly equals the total quantity.
 * Uses the Largest Remainder Method (Hare-Niemeyer).
 */
function allocateIntegerDistribution(totalQuantity, distributionMap) {
  if (totalQuantity <= 0) return {}

  const entries = Object.entries(distributionMap)
  const sumWeights = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (sumWeights === 0) return {}

  const exacts = entries.map(([key, weight]) => {
    const raw = (weight / sumWeights) * totalQuantity
    const floor = Math.floor(raw)
    const remainder = raw - floor
    return { key, floor, remainder }
  })

  let assignedCount = exacts.reduce((acc, cur) => acc + cur.floor, 0)
  let deficit = totalQuantity - assignedCount

  // Sort by largest remainder descending
  exacts.sort((a, b) => b.remainder - a.remainder)

  const result = {}
  for (let i = 0; i < exacts.length; i++) {
    const bonus = deficit > 0 ? 1 : 0
    if (bonus > 0) deficit--
    result[exacts[i].key] = exacts[i].floor + bonus
  }

  return result
}

/**
 * Creates an exact integer batch plan for BPSC Prelims bulk generation.
 */
export function createBPSCBatchPlan({ quantity = 10, difficulty = 'Auto', questionType = 'Auto / Authentic BPSC Mix' } = {}) {
  const total = Math.max(1, parseInt(quantity, 10) || 10)
  const profile = EXAM_PROFILES.BPSC_PRELIMS

  // 1. Difficulty Plan
  const diffMap = profile.difficultyDistribution
  let difficultyPlan = {}

  const normalizedDiff = String(difficulty || 'Auto').toLowerCase().trim()
  if (normalizedDiff === 'easy') {
    difficultyPlan = { easy: total, moderate: 0, difficult: 0, veryDifficult: 0 }
  } else if (normalizedDiff === 'moderate' || normalizedDiff === 'medium') {
    difficultyPlan = { easy: 0, moderate: total, difficult: 0, veryDifficult: 0 }
  } else if (normalizedDiff === 'difficult' || normalizedDiff === 'hard') {
    difficultyPlan = { easy: 0, moderate: 0, difficult: total, veryDifficult: 0 }
  } else if (normalizedDiff === 'very difficult' || normalizedDiff === 'verydifficult') {
    difficultyPlan = { easy: 0, moderate: 0, difficult: 0, veryDifficult: total }
  } else {
    // Auto / Authentic BPSC Mix (25% Easy, 50% Moderate, 18% Difficult, 7% Very Difficult)
    difficultyPlan = allocateIntegerDistribution(total, diffMap)
  }

  // 2. Question Types Plan
  let questionTypesPlan = {}
  const normalizedType = String(questionType || 'Auto').toLowerCase().trim()

  if (normalizedType.includes('direct factual') || normalizedType.includes('factual')) {
    questionTypesPlan = { directFactual: total }
  } else if (normalizedType.includes('conceptual')) {
    questionTypesPlan = { conceptual: total }
  } else if (normalizedType.includes('application')) {
    questionTypesPlan = { application: total }
  } else if (normalizedType.includes('statement')) {
    questionTypesPlan = { twoStatement: total }
  } else {
    // Standard bulk question distribution
    questionTypesPlan = allocateIntegerDistribution(total, profile.questionTypeDistribution)
  }

  // 3. Bihar Integration Target (~22%)
  const biharTargetCount = Math.min(total, Math.max(total >= 5 ? 1 : 0, Math.round(total * (profile.biharIntegration || 0.22))))

  return {
    totalQuantity: total,
    difficultySelection: difficulty,
    difficultyPlan,
    questionTypesPlan,
    biharTargetCount,
    biharTargetPct: Math.round((biharTargetCount / total) * 100),
    promptVersion: profile.promptVersion || 'bpsc-prelims-v1',
  }
}

/**
 * Formats the Batch Plan into prompt directives for the AI model.
 */
export function formatBPSCBatchPlan(plan) {
  if (!plan) return []
  const lines = []

  lines.push(`BATCH BLUEPRINT (TOTAL: ${plan.totalQuantity} MCQs):`)

  // Difficulty line
  const diffItems = []
  if (plan.difficultyPlan.easy) diffItems.push(`${plan.difficultyPlan.easy} Easy`)
  if (plan.difficultyPlan.moderate) diffItems.push(`${plan.difficultyPlan.moderate} Moderate`)
  if (plan.difficultyPlan.difficult) diffItems.push(`${plan.difficultyPlan.difficult} Difficult`)
  if (plan.difficultyPlan.veryDifficult) diffItems.push(`${plan.difficultyPlan.veryDifficult} Very Difficult`)
  if (diffItems.length > 0) {
    lines.push(`- Difficulty Distribution: ${diffItems.join(', ')}`)
  }

  // Question Type lines
  const typeLabels = {
    directFactual: 'Direct Factual',
    twoStatement: 'Two-Statement Verification',
    threeStatement: 'Three-Statement Verification',
    matching: 'Matching Lists',
    chronology: 'Chronological Sequence',
    assertionReason: 'Assertion-Reason',
    causeEffect: 'Cause-Effect',
    conceptual: 'Conceptual',
    application: 'Application-Based',
    mapLocation: 'Map / Geographical Location',
    dataStatistics: 'Data / Statistics',
    personalityEvent: 'Personality-Event Association',
  }

  const typeItems = Object.entries(plan.questionTypesPlan)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${typeLabels[key] || key}`)

  if (typeItems.length > 0) {
    lines.push(`- Question Structures: ${typeItems.join(', ')}`)
  }

  lines.push(`- Bihar-Integrated Items: approximately ${plan.biharTargetCount} of ${plan.totalQuantity} questions (${plan.biharTargetPct}%) where contextually relevant.`)
  lines.push('- Option Architecture: Every question must contain 5 options (A, B, C, D as authentic content options, and Option E strictly as "Not Attempted").')

  return lines
}

/**
 * Builds the complete BPSC Prelims MCQ Generation Prompt.
 */
export function buildBPSCPrompt({
  course = 'BPSC Prelims',
  subject = '',
  chapter = '',
  chapterDescription = '',
  difficulty = 'Auto',
  quantity = 10,
  language = 'English',
  specialInstructions = '',
  matchedPYQs = [],
  pyqAnalysis = null,
} = {}) {
  const plan = createBPSCBatchPlan({ quantity, difficulty })
  const lines = []

  lines.push(BPSC_PRELIMS_PROMPT_RULES)
  lines.push('')

  lines.push('TARGET SYLLABUS & CONTEXT:')
  lines.push(`- Examination Profile: BPSC Combined Competitive Examination (Prelims)`)
  lines.push(`- Course: ${course || 'BPSC Prelims'}`)
  lines.push(`- Subject: ${subject || 'General Studies'}`)
  lines.push(`- Chapter: ${chapter || 'Prescribed Chapter'}`)
  if (chapterDescription) {
    lines.push(`- Chapter Scope & Core Subtopics: ${chapterDescription}`)
  }
  lines.push(`- Medium / Language: ${language || 'English'}`)
  lines.push(`- Prompt Version: ${plan.promptVersion}`)
  lines.push('')

  formatBPSCBatchPlan(plan).forEach((line) => lines.push(line))
  lines.push('')

  if (matchedPYQs && matchedPYQs.length > 0) {
    lines.push('PREVIOUS YEARS QUESTIONS (PYQ) BENCHMARK REFERENCE:')
    lines.push(`- Count of historical questions available: ${matchedPYQs.length}`)
    lines.push('- Use these to anchor difficulty, recurring tested facts, and distractor patterns.')
    lines.push('- Do NOT copy or re-ask the exact same PYQ. Generate original BPSC-standard questions.')
    lines.push('')
    matchedPYQs.slice(0, 5).forEach((pyq, i) => {
      const yr = pyq.exam_year || pyq.year || 'PYQ'
      const qText = pyq.question_text || pyq.question || ''
      lines.push(`  PYQ ${i + 1} (${yr}): ${qText}`)
    })
    lines.push('')
  }

  if (pyqAnalysis && pyqAnalysis.total > 0 && pyqAnalysis.mostTested?.length) {
    lines.push(`- PYQ Priority Micro-Topics: ${pyqAnalysis.mostTested.map((m) => m.topic).join(', ')}`)
    lines.push('')
  }

  if (specialInstructions) {
    lines.push(`ADDITIONAL INSTRUCTIONS:`)
    lines.push(specialInstructions)
    lines.push('')
  }

  lines.push('OUTPUT SPECIFICATION:')
  lines.push('Return the generated questions strictly as a raw JSON array. Do not enclose in backticks or markdown, and do not add conversational preamble.')
  lines.push('Schema per question object:')
  lines.push('{')
  lines.push('  "question": "Full clear question stem here.",')
  lines.push('  "options": {')
  lines.push('    "A": "Plausible content option A",')
  lines.push('    "B": "Plausible content option B",')
  lines.push('    "C": "Plausible content option C",')
  lines.push('    "D": "Plausible content option D",')
  lines.push('    "E": "Not Attempted"')
  lines.push('  },')
  lines.push('  "correct": "A",')
  lines.push('  "difficulty": "Moderate",')
  lines.push('  "explanation": "Precise factual explanation of the correct answer and why the key distractors are incorrect.",')
  lines.push(`  "subject": "${subject || 'Subject name'}",`)
  lines.push(`  "chapter": "${chapter || 'Chapter name'}",`)
  lines.push('  "exam_profile": "BPSC_PRELIMS",')
  lines.push(`  "prompt_version": "${plan.promptVersion}"`)
  lines.push('}')

  return lines.join('\n')
}
