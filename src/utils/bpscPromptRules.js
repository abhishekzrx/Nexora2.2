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

export function isTechnicalSubject(course = '', subject = '') {
  const combined = `${course} ${subject}`.toLowerCase()
  return /computer|code|program|network|dbms|operating system|data structure|algorithm|software|hardware|math|physics|tech|engineering|c\+\+|python|java/i.test(combined)
}

export const BPSC_PRELIMS_PROMPT_RULES = `You are a senior question-setter for competitive examinations.
Follow examination calibration with rigorous precision.

CORE PRINCIPLES:
1. ONLY STANDARD MULTIPLE CHOICE QUESTIONS (MCQs): Every item must be a direct, standard multiple-choice question. Do NOT generate assertion-reason pairs.
2. FACTUAL ANCHORING: Every question must be anchored in verifiable, concrete facts, specifications, or core principles. Avoid vague or speculative premises.
3. DISTRACTOR ENGINEERING (OPTIONS A-D):
   - All options A-D must belong to the exact same taxonomic category (e.g. all 4 are networking protocols, all 4 are constitutional articles, or all 4 are historical treaties).
   - Distractors must be plausible and realistic—never obviously absurd.
   - Do NOT use "All of the above" or "None of the above" in Options A-D.
4. OPTION E ARCHITECTURE:
   - Option E MUST ALWAYS BE EXACTLY: "Not Attempted".
   - Do NOT put any subject content in Option E.
5. LINGUISTIC PRECISION: Use formal, concise examination wording.`

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
    // Auto / Authentic BPSC Mix
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
export function formatBPSCBatchPlan(plan, isTech = false) {
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
    conceptual: 'Conceptual',
    application: 'Application-Based',
  }

  const typeItems = Object.entries(plan.questionTypesPlan)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${typeLabels[key] || key}`)

  if (typeItems.length > 0) {
    lines.push(`- Question Structures: ${typeItems.join(', ')}`)
  }

  if (!isTech) {
    lines.push(`- Regional/Contextual Items: approximately ${plan.biharTargetCount} of ${plan.totalQuantity} questions where relevant.`)
  }
  lines.push('- Option Architecture: Every question must contain 5 options (A, B, C, D as authentic content options, and Option E strictly as "Not Attempted").')

  return lines
}

/**
 * Sanitizes chapter descriptions for AI Prompt Generation.
 * Strips raw JSON note payloads, Base64 data URLs, raw file names (e.g. file 00000.png), HTML markup, markdown tags, UUIDs,
 * and collapses formatting into a clean, concise educational summary.
 */
export function cleanChapterDescriptionForPrompt(rawDesc, chapterTitle = '') {
  if (!rawDesc) return ''
  let desc = String(rawDesc).trim()
  if (!desc) return ''

  // 1. If desc is JSON stringified note, parse it
  if (desc.startsWith('{') && desc.endsWith('}')) {
    try {
      const parsed = JSON.parse(desc)
      if (parsed) {
        desc = [parsed.title, parsed.content].filter(Boolean).join(' - ')
      }
    } catch {
      // not valid JSON
    }
  }

  // 2. Remove base64 data URLs
  desc = desc.replace(/data:image\/[a-zA-Z0-9+]+;base64,[a-zA-Z0-9+/=]+/g, '')

  // 3. Aggressively remove raw file attachment strings (e.g. file 00000000858c81f4958802eff325e58c.png, file_xxxx.png)
  desc = desc.replace(/file[_\s-]?[0-9a-fA-F]{6,}\.[a-zA-Z0-9]+/g, '')
  desc = desc.replace(/file[_\s-]?[a-zA-Z0-9_-]+\.(png|jpg|jpeg|pdf|webp|svg|txt)/gi, '')
  desc = desc.replace(/\b[a-zA-Z0-9_-]+\.(png|jpg|jpeg|pdf|webp|svg)\b/gi, '')
  desc = desc.replace(/\bfile\s+[0-9a-fA-F]+\b/gi, '')

  // 4. Remove Markdown images ![alt](url) and links [text](url)
  desc = desc.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  desc = desc.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

  // 5. Remove Markdown formatting characters
  desc = desc.replace(/[#*_`>~|-]/g, ' ')

  // 6. Remove HTML tags
  desc = desc.replace(/<[^>]*>/g, ' ')

  // 7. Remove UUIDs & internal ID patterns
  desc = desc.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
  desc = desc.replace(/\bnote-[a-z0-9_-]+\b/gi, '')

  // 8. Collapse multi-space/newlines
  desc = desc.replace(/\s+/g, ' ').trim()

  // 9. Remove leading/trailing colons or dashes
  desc = desc.replace(/^[:\s-]+/, '').replace(/[:\s-]+$/, '').trim()

  // 10. If clean desc is identical to chapter title or empty, return empty
  if (chapterTitle && desc.toLowerCase() === String(chapterTitle).toLowerCase().trim()) {
    return ''
  }

  // 11. Truncate long description to max 250 characters
  if (desc.length > 250) {
    desc = desc.substring(0, 250).trim() + '...'
  }

  return desc
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
  const cleanDesc = cleanChapterDescriptionForPrompt(chapterDescription, chapter)
  const isTech = isTechnicalSubject(course, subject)
  const lines = []

  // Subject-Aware Core Rules
  if (isTech) {
    lines.push(`You are a senior question-setter for ${course || 'Computer Science'} examinations.`)
    lines.push('Generate authentic, standard multiple-choice questions focusing on core technical concepts, protocol specifications, and standard principles.')
    lines.push('')
    lines.push('CORE RULES:')
    lines.push('1. STANDARD MCQs: Generate clear, standard multiple-choice questions.')
    lines.push('2. TECHNICAL ANCHORING: Every question must be anchored in standard technical facts, specifications, architectures, or protocols.')
    lines.push('3. DISTRACTOR ENGINEERING: Options A-D must belong to the exact same technical category (e.g., all 4 options are networking protocols, or all 4 are database normal forms).')
    lines.push('4. OPTION E: Option E MUST ALWAYS BE EXACTLY: "Not Attempted".')
  } else {
    lines.push(BPSC_PRELIMS_PROMPT_RULES)
  }
  lines.push('')

  lines.push('TARGET SYLLABUS & CONTEXT:')
  lines.push(`- Course: ${course || 'BPSC Prelims'}`)
  lines.push(`- Subject: ${subject || 'General Studies'}`)
  lines.push(`- Chapter: ${chapter || 'Prescribed Chapter'}`)
  if (cleanDesc && cleanDesc.toLowerCase() !== String(chapter).toLowerCase().trim()) {
    lines.push(`- Chapter Scope: ${cleanDesc}`)
  }
  lines.push(`- Medium / Language: ${language || 'English'}`)
  lines.push('')

  formatBPSCBatchPlan(plan, isTech).forEach((line) => lines.push(line))
  lines.push('')

  if (matchedPYQs && matchedPYQs.length > 0) {
    lines.push('BENCHMARK REFERENCE:')
    matchedPYQs.slice(0, 3).forEach((pyq, i) => {
      const qText = pyq.question_text || pyq.question || ''
      if (qText) lines.push(`  Sample ${i + 1}: ${qText}`)
    })
    lines.push('')
  }

  if (specialInstructions) {
    lines.push(`ADDITIONAL INSTRUCTIONS: ${specialInstructions}`)
    lines.push('')
  }

  lines.push('OUTPUT SPECIFICATION:')
  lines.push('Return the generated questions strictly as a raw JSON array. Do not enclose in backticks or markdown.')
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
  lines.push('  "explanation": "Precise factual explanation of the correct answer and distractors.",')
  lines.push(`  "subject": "${subject || 'Subject name'}",`)
  lines.push(`  "chapter": "${chapter || 'Chapter name'}"`)
  lines.push('}')

  return lines.join('\n')
}
