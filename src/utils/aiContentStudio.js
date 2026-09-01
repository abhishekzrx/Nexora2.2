/**
 * aiContentStudio
 * Pure utility helpers for the AI Content Studio:
 * - Prompt generation (MCQ + Flashcard)
 * - JSON validation (MCQ + Flashcard)
 * - Template presets
 * - Exam-aware prompt generation
 * All local/mock — no backend.
 */

import { getExamProfile, resolveExamProfile } from '../data/examProfiles.js'
import { getRelevantPYQs, analyzePYQs } from '../data/pyqRepository.js'
import { buildBPSCPrompt, createBPSCBatchPlan, BPSC_PRELIMS_PROMPT_RULES, cleanChapterDescriptionForPrompt } from './bpscPromptRules.js'
import { validateBPSCBatch, validateBPSCMcq, buildTargetedRegenerationPrompt, autoFixBPSCItems } from './bpscValidator.js'
import {
  parseContext,
  synthesizePrompt,
  createBatchedExecutionPlan,
  auditMcqItem,
  auditMcqBatch,
  sanitizeRawJsonText,
  enforceMcqSchema,
  enforceFlashcardSchema,
  parseAndEnforceBatchOutput,
} from './masterContentEngine.js'

export {
  buildBPSCPrompt,
  createBPSCBatchPlan,
  BPSC_PRELIMS_PROMPT_RULES,
  cleanChapterDescriptionForPrompt,
  validateBPSCBatch,
  validateBPSCMcq,
  buildTargetedRegenerationPrompt,
  autoFixBPSCItems,
  parseContext,
  synthesizePrompt,
  createBatchedExecutionPlan,
  auditMcqItem,
  auditMcqBatch,
  sanitizeRawJsonText,
  enforceMcqSchema,
  enforceFlashcardSchema,
  parseAndEnforceBatchOutput,
}

// ── Template Presets ──────────────────────────────────────────────
export const templatePresets = [
  {
    id: 'bpsc',
    label: 'BPSC TRE 4.0',
    icon: 'rocket',
    values: { className: 'Class 12', examination: 'BPSC TRE', difficulty: 'Medium', language: 'English', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'No' },
  },
  {
    id: 'bpsc-prelims',
    label: 'BPSC PRE LIMS',
    icon: 'target',
    values: { className: 'Graduate', examination: 'BPSC CCE Prelims', difficulty: 'BPSC Authentic Mix', language: 'English', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'Yes' },
  },
  {
    id: 'cbse',
    label: 'CBSE',
    icon: 'school',
    values: { className: 'Class 10', examination: 'Board Exam (CBSE)', difficulty: 'Easy', language: 'English', withExplanations: 'Yes', withPreviousYear: 'No', withNegative: 'No' },
  },
  {
    id: 'ctet',
    label: 'CTET',
    icon: 'school',
    values: { className: 'Graduate', examination: 'CTET', difficulty: 'Medium', language: 'English + Hindi', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'No' },
  },
  {
    id: 'ssc',
    label: 'SSC',
    icon: 'medal',
    values: { className: 'Graduate', examination: 'SSC', difficulty: 'Hard', language: 'English', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'Yes' },
  },
  {
    id: 'upsc',
    label: 'UPSC',
    icon: 'trophy',
    values: { className: 'Graduate', examination: 'UPSC', difficulty: 'Hard', language: 'English', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'Yes' },
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'settings',
    values: {},
  },
]

// ── Universal Exam-Aware MCQ Prompt Builder ──────────────────────
export function buildMCQPrompt({
  course = '',
  subject = '',
  chapter = '',
  chapterDescription = '',
  difficulty = 'Auto',
  quantity = 10,
  language = 'English',
  examProfile = null,
  topic = '',
  specialInstructions = '',
  withExplanations = 'Yes',
  withPreviousYear = 'No',
  withNegative = 'No',
  matchedPYQs = [],
  pyqAnalysis = null,
} = {}) {
  const profile = resolveExamProfile(examProfile || course)
  const cleanDesc = cleanChapterDescriptionForPrompt(chapterDescription)

  if (profile && profile.key === 'BPSC_PRELIMS') {
    return buildBPSCPrompt({
      course: course || profile.label,
      subject,
      chapter,
      chapterDescription: cleanDesc,
      difficulty,
      quantity,
      language,
      specialInstructions,
      matchedPYQs,
      pyqAnalysis,
    })
  }

  // Fallback to standard generic prompt
  return generateMcqPrompt({
    numQuestions: quantity,
    subject,
    chapter,
    chapterDescription: cleanDesc,
    topic,
    difficulty,
    language,
    examination: course || profile.label || 'Standard Exam',
    withExplanations,
    withPreviousYear,
    withNegative,
    specialInstructions,
  })
}

// ── Prompt Generation ─────────────────────────────────────────────
function buildSpecLines(form) {
  const spec = []
  if (form.className) spec.push(`Class: ${form.className}`)
  if (form.examination) spec.push(`Examination: ${form.examination}`)
  if (form.subject) spec.push(`Subject: ${form.subject}`)
  if (form.chapter) spec.push(`Chapter: ${form.chapter}`)
  const rawDesc = form.chapterDescription || form.chapterDesc || form.desc || form.description
  const cleanDesc = cleanChapterDescriptionForPrompt(rawDesc)
  if (cleanDesc) {
    spec.push(`Chapter Scope: ${cleanDesc}`)
  }
  if (form.topic) spec.push(`Topic / Subtopic: ${form.topic}`)
  if (form.difficulty) spec.push(`Difficulty Level: ${form.difficulty}`)
  if (form.bloom) spec.push(`Bloom's Taxonomy Level: ${form.bloom}`)
  if (form.style) spec.push(`Question Style: ${form.style}`)
  if (form.language) spec.push(`Language: ${form.language}`)
  if (form.withNegative === 'Yes') spec.push('Include negative (except / NOT true) questions')
  if (form.withPreviousYear === 'Yes') spec.push('Style: aligned with previous-year exam questions')
  if (form.randomness) spec.push(`Random seed / diversity guidance: ${form.randomness}`)
  return spec
}

export function generateMcqPrompt(form) {
  const lines = []
  lines.push('You are an expert exam-question designer with deep knowledge of Indian education syllabi and competitive examinations.')
  lines.push('')
  lines.push(`Generate ${form.numQuestions || 10} high-quality multiple-choice questions (MCQs) for the following specification:`)
  lines.push('')
  buildSpecLines(form).forEach((line) => lines.push(`- ${line}`))
  lines.push('')
  lines.push('Quality requirements:')
  lines.push('- Each question must be factually accurate, unambiguous, and self-contained.')
  lines.push('- Options A, B, C, D must be distinct and plausible; exactly one among A-D must be correct.')
  lines.push('- Option E must strictly be "Not Attempted".')
  lines.push('- Distractors should reflect common misconceptions, not obvious errors.')
  lines.push('')
  lines.push('Return the output STRICTLY as a valid JSON array - no markdown, no code fences, no extra text.')
  lines.push('Each object in the array must use this exact schema:')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "question": "Write the full question text here.",')
  lines.push('    "optionA": "Option A text",')
  lines.push('    "optionB": "Option B text",')
  lines.push('    "optionC": "Option C text",')
  lines.push('    "optionD": "Option D text",')
  lines.push('    "optionE": "Not Attempted",')
  lines.push('    "correctAnswer": "A",')
  lines.push('    "explanation": "A concise explanation of why this answer is correct.",')
  lines.push(`    "subject": "${form.subject || 'Subject name'}",`)
  lines.push(`    "chapter": "${form.chapter || 'Chapter name'}"`)
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  if (form.withExplanations === 'Yes') {
    lines.push('The "explanation" field is for post-submission review only and must NOT be displayed to the student during the quiz.')
  } else {
    lines.push('Omit the "explanation" field entirely.')
  }
  if (form.specialInstructions) {
    lines.push('')
    lines.push(`Additional instructions: ${form.specialInstructions}`)
  }
  lines.push('')
  lines.push("Ensure the JSON is complete, syntactically valid, and ready to import into Nexora's MCQ system without any edits.")
  return lines.join('\n')
}

export function generateFlashcardPrompt(form) {
  const lines = []
  lines.push('You are an expert study-content designer with deep knowledge of Indian education syllabi and competitive examinations.')
  lines.push('')
  lines.push(`Generate ${form.numQuestions || 10} high-quality flashcards for the following specification:`)
  lines.push('')
  buildSpecLines(form).forEach((line) => lines.push(`- ${line}`))
  lines.push('')
  lines.push('Quality requirements:')
  lines.push('- Each flashcard must have a concise, self-contained front (question/prompt).')
  lines.push('- The back (answer) must be accurate, complete, and easy to memorize.')
  lines.push('- Avoid ambiguous or overly long answers.')
  lines.push('')
  lines.push('Return the output STRICTLY as a valid JSON array - no markdown, no code fences, no extra text.')
  lines.push('Each object in the array must use this exact schema:')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push('    "front": "The question or prompt text.",')
  lines.push('    "back": "The answer text.",')
  lines.push(`    "subject": "${form.subject || 'Subject name'}",`)
  lines.push(`    "chapter": "${form.chapter || 'Chapter name'}"`)
  lines.push('  }')
  lines.push(']')
  lines.push('```')
  lines.push('')
  if (form.specialInstructions) {
    lines.push('')
    lines.push(`Additional instructions: ${form.specialInstructions}`)
  }
  lines.push('')
  lines.push("Ensure the JSON is complete, syntactically valid, and ready to import into Nexora's flashcard system without any edits.")
  return lines.join('\n')
}

export function generatePrompt(contentType, form) {
  return contentType === 'flashcards' ? generateFlashcardPrompt(form) : generateMcqPrompt(form)
}

// ── Exam-aware Prompt Generation ──────────────────────────────────
export function buildExamPrompt({ examProfile, form, matchedPYQs = [], pyqAnalysis }) {
  const profile = examProfile || resolveExamProfile(form.examKey || form.activeExamProfileKey || form.courseTitle || form.targetExam)

  if (profile && profile.key === 'BPSC_PRELIMS' && form.contentMode !== 'flashcards') {
    return buildBPSCPrompt({
      course: form.courseTitle || 'BPSC Prelims',
      subject: form.subjectTitle,
      chapter: form.chapterTitle,
      chapterDescription: form.chapterDescription,
      difficulty: form.mcqDifficulty || form.difficulty || 'Auto',
      quantity: form.finalQuantity || form.numQuestions || 10,
      language: form.mcqLanguage || form.language || 'English',
      specialInstructions: form.specialInstructions,
      matchedPYQs,
      pyqAnalysis,
    })
  }

  if (!profile || profile.key === 'GENERIC' || !profile.promptTemplate) {
    return generateMcqPrompt({
      numQuestions: form.finalQuantity || form.numQuestions,
      subject: form.subjectTitle,
      chapter: form.chapterTitle,
      chapterDescription: form.chapterDescription,
      topic: form.topicFocus,
      difficulty: form.contentMode === 'mcqs' ? form.mcqDifficulty : form.flashDifficulty,
      language: form.contentMode === 'mcqs' ? form.mcqLanguage : form.flashLanguage,
      examination: form.targetExam || form.courseTitle,
      withExplanations: form.explanationRequired,
      withPreviousYear: form.pyqInclusion === 'Include Actual PYQs' || form.pyqInclusion === 'PYQ + Generated Mix' ? 'Yes' : 'No',
      withNegative: form.negativeMarking ? 'Yes' : 'No',
      specialInstructions: form.specialInstructions,
    })
  }

  const lines = []
  lines.push(profile.promptTemplate)
  lines.push('')

  const cleanDesc = cleanChapterDescriptionForPrompt(form.chapterDescription)

  lines.push('EXAM CONTEXT:')
  lines.push(`- Course: ${form.courseTitle || 'N/A'}`)
  lines.push(`- Exam: ${profile.label}`)
  lines.push(`- Subject: ${form.subjectTitle || 'N/A'}`)
  lines.push(`- Chapter: ${form.chapterTitle || 'N/A'}`)
  if (cleanDesc) {
    lines.push(`- Chapter Scope: ${cleanDesc}`)
  }
  if (profile.examPattern) {
    lines.push(`- Total questions in real exam: ${profile.examPattern.totalQuestions}`)
    lines.push(`- Time: ${profile.examPattern.timeMinutes} minutes`)
    lines.push(`- Marks per question: ${profile.examPattern.marksPerQuestion}`)
    lines.push(`- Negative marking: ${profile.examPattern.negativeMarking}`)
    lines.push(`- Option structure: ${profile.examPattern.optionStructure}`)
    if (profile.examPattern.optionELabel) {
      lines.push(`- Option E label: "${profile.examPattern.optionELabel}"`)
    }
  }
  lines.push('')

  if (matchedPYQs && matchedPYQs.length > 0) {
    lines.push('PREVIOUSLY ASKED QUESTIONS:')
    lines.push(`- The following questions were previously asked from this chapter/topic.`)
    lines.push(`- Count: ${matchedPYQs.length}`)
    lines.push(`- Use these ONLY as reference material to understand tested concepts, difficulty, wording style, conceptual traps, and recurring areas.`)
    lines.push('- Do NOT copy PYQ wording or reproduce the same question.')
    lines.push('- Preserve the distinction between PYQs and newly generated questions.')
    lines.push('')
    matchedPYQs.forEach((pyq, idx) => {
      const year = pyq.exam_year || pyq.year || 'N/A'
      const qNo = pyq.question_number || pyq.questionNo || 'N/A'
      const qText = pyq.question_text || pyq.question || ''
      lines.push(`PYQ ${idx + 1} [Year: ${year} | Q: ${qNo}]: ${qText}`)
    })
    lines.push('')
    lines.push('GENERATION INSTRUCTIONS:')
    lines.push('- Use the PYQs above to identify tested concepts and exam patterns.')
    lines.push('- Preserve exam relevance and ensure important previously asked concepts are represented.')
    lines.push('- Generate additional NEW original questions covering the chapter comprehensively.')
    lines.push('- Do not invent PYQs.')
    lines.push('- Do not falsely label generated questions as PYQs.')
    lines.push('- Maintain the selected exam\'s expected difficulty and style.')
  } else {
    lines.push('PREVIOUSLY ASKED QUESTIONS:')
    lines.push('- No verified PYQs found for this specific topic.')
    lines.push('- Generate using course, exam profile, subject, chapter, and selected parameters only.')
    lines.push('')
    lines.push('GENERATION INSTRUCTIONS:')
    lines.push('- Cover the selected chapter comprehensively.')
    lines.push('- Maintain the selected exam\'s expected difficulty and style.')
  }
  lines.push('')

  if (profile.questionTypes && profile.questionTypes.length) {
    lines.push('QUESTION TYPE RULES:')
    lines.push(`- Requested question type: ${form.questionType || profile.defaultQuestionType}`)
    lines.push(`- Allowed types: ${profile.questionTypes.join(', ')}`)
    lines.push('')
  }

  if (profile.difficulties && profile.difficulties.length) {
    lines.push('DIFFICULTY RULES:')
    lines.push(`- Requested difficulty: ${form.contentMode === 'mcqs' ? form.mcqDifficulty : form.flashDifficulty || profile.defaultDifficulty}`)
    lines.push(`- Allowed difficulties: ${profile.difficulties.join(', ')}`)
    lines.push('')
  }

  if (profile.factualDepthOptions && profile.factualDepthOptions.length) {
    lines.push('FACTUAL DEPTH RULES:')
    lines.push(`- Factual depth: ${form.factualDepth || profile.defaultFactualDepth}`)
    lines.push(`- Allowed depths: ${profile.factualDepthOptions.join(', ')}`)
    lines.push('')
  }

  if (profile.cognitiveStyles && profile.cognitiveStyles.length) {
    lines.push('COGNITIVE STYLE RULES:')
    lines.push(`- Cognitive style: ${form.cognitiveStyle || profile.defaultCognitiveStyle}`)
    lines.push(`- Allowed styles: ${profile.cognitiveStyles.join(', ')}`)
    lines.push('')
  }

  if (profile.biharIntegrationOptions && profile.biharIntegrationOptions.length) {
    lines.push('Bihar Integration:')
    lines.push(`- Bihar integration: ${form.biharIntegration || profile.defaultBiharIntegration}`)
    lines.push(`- Options: ${profile.biharIntegrationOptions.join(', ')}`)
    lines.push('')
  }

  if (profile.validationRules) {
    lines.push('VALIDATION RULES:')
    const v = profile.validationRules
    if (v.requireOptionE) lines.push('- Option E is mandatory and labeled: ' + (v.optionELabel || 'Not Attempted'))
    if (v.maxStatements) lines.push(`- Maximum statements per question: ${v.maxStatements}`)
    if (v.homogeneousOptions) lines.push('- All options must be homogeneous in length and complexity')
    if (v.noClueLeakage) lines.push('- Ensure no clue leakage between questions')
    lines.push('')
  }

  if (pyqAnalysis && pyqAnalysis.total > 0) {
    lines.push('PYQ PATTERN ANALYSIS:')
    lines.push(`- Total relevant PYQs found: ${pyqAnalysis.total}`)
    if (pyqAnalysis.mostTested && pyqAnalysis.mostTested.length) {
      lines.push(`- Most tested micro-topics: ${pyqAnalysis.mostTested.map((m) => `${m.topic}(${m.count})`).join(', ')}`)
    }
    if (pyqAnalysis.commonPatterns && pyqAnalysis.commonPatterns.length) {
      lines.push(`- Common patterns: ${pyqAnalysis.commonPatterns.map((p) => `${p.pattern}(${p.count})`).join(', ')}`)
    }
    if (pyqAnalysis.lastAsked && pyqAnalysis.lastAsked.length) {
      lines.push(`- Last asked years: ${pyqAnalysis.lastAsked.join(', ')}`)
    }
    lines.push(`- Priority: ${pyqAnalysis.priority}`)
    lines.push('')
  }

  lines.push('GENERATION PARAMETERS:')
  lines.push(`- Quantity: ${form.finalQuantity || 10}`)
  lines.push(`- Language: ${form.contentMode === 'mcqs' ? form.mcqLanguage : form.flashLanguage}`)
  if (form.targetExam) lines.push(`- Exam Benchmark: ${form.targetExam}`)
  if (form.topicFocus) lines.push(`- Topic Focus: ${form.topicFocus}`)
  if (form.examPattern) lines.push(`- Exam Pattern: ${form.examPattern}`)
  if (form.negativeMarking) lines.push(`- Negative Marking: ${form.negativeMarking}`)
  if (form.languageStyle) lines.push(`- Language Style: ${form.languageStyle}`)
  if (form.specialInstructions) lines.push(`- Special Instructions: ${form.specialInstructions}`)
  lines.push('')

  if (form.contentMode === 'flashcards') {
    lines.push('OUTPUT FORMAT:')
    lines.push('Return ONLY a valid JSON array - no markdown, no code fences, no extra text.')
    lines.push('Each object must use this exact schema:')
    lines.push('{')
    lines.push('  "front": "The question or prompt text.",')
    lines.push('  "back": "The answer text."')
    lines.push('}')
    lines.push('')
    lines.push("Ensure the JSON is complete, syntactically valid, and ready to import into Nexora's flashcard system without any edits.")
  } else {
    lines.push('OUTPUT FORMAT:')
    lines.push('Return ONLY a valid JSON array - no markdown, no code fences, no extra text.')
    const optionSchema = profile.validationRules?.requireOptionE
      ? `"options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D", "E": "${profile.validationRules.optionELabel || 'Not Attempted'}" }`
      : `"options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" }`
    lines.push('Each object must use this exact schema:')
    lines.push('{')
    lines.push('  "question": "Full question text here.",')
    lines.push(`  ${optionSchema},`)
    lines.push('  "correct": "A",')
    lines.push('  "difficulty": "Moderate",')
    lines.push('  "explanation": "Concise explanation.",')
    lines.push(`  "subject": "${form.subjectTitle || 'Subject name'}",`)
    lines.push(`  "chapter": "${form.chapterTitle || 'Chapter name'}"`)
    lines.push('}')
    lines.push('')
    lines.push('Ensure the JSON is complete, syntactically valid, and ready to import into Nexora MCQ system without any edits.')
  }

  return lines.join('\n')
}

export function generateExamPrompt(contentType, form, matchedPYQs, pyqAnalysis) {
  const profile = getExamProfile(form.examKey || form.activeExamProfileKey || form.targetExam)

  const pyqs = matchedPYQs || (contentType === 'mcqs' ? getRelevantPYQs({
    exam: profile.key,
    subject: form.subjectTitle,
    chapter: form.chapterTitle,
    topic: form.topicFocus,
  }) : [])

  const analysis = pyqAnalysis || analyzePYQs(pyqs)

  return buildExamPrompt({
    examProfile: profile,
    form: { ...form, contentType },
    matchedPYQs: pyqs,
    pyqAnalysis: analysis,
  })
}

// ── JSON Validation ───────────────────────────────────────────────
export function parseJsonInput(raw) {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)
    return { ok: true, data: Array.isArray(parsed) ? parsed : [parsed] }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

export function validateMcqJson(records) {
  const errors = []
  const seen = new Set()
  let validCount = 0
  let duplicateCount = 0
  let invalidCount = 0

  records.forEach((record, index) => {
    const issues = []
    if (!record || typeof record !== 'object') {
      issues.push('Not an object')
    } else {
      if (!record.question || !String(record.question).trim()) issues.push('Missing question')
      if (!record.optionA && !record.options) issues.push('Missing optionA')
      if (!record.optionB && !record.options) issues.push('Missing optionB')
      if (!record.optionC && !record.options) issues.push('Missing optionC')
      if (!record.optionD && !record.options) issues.push('Missing optionD')
      if (!record.correctAnswer && !record.correct) issues.push('Missing correctAnswer')
      if (!record.explanation || !String(record.explanation).trim()) issues.push('Missing explanation')
      if (!record.subject || !String(record.subject).trim()) issues.push('Missing subject')
      if (!record.chapter || !String(record.chapter).trim()) issues.push('Missing chapter')

      const key = String(record.question || '').toLowerCase().trim()
      if (key && seen.has(key)) {
        issues.push('Duplicate question')
        duplicateCount += 1
      } else if (key) {
        seen.add(key)
      }
    }

    if (issues.length > 0) {
      invalidCount += 1
      errors.push({ index: index + 1, issues })
    } else {
      validCount += 1
    }
  })

  return { valid: validCount, invalid: invalidCount, duplicates: duplicateCount, errors, total: records.length }
}

export function validateFlashcardJson(records) {
  const errors = []
  const seen = new Set()
  let validCount = 0
  let duplicateCount = 0
  let invalidCount = 0

  records.forEach((record, index) => {
    const issues = []
    if (!record || typeof record !== 'object') {
      issues.push('Not an object')
    } else {
      if (!record.front || !String(record.front).trim()) issues.push('Missing front')
      if (!record.back || !String(record.back).trim()) issues.push('Missing back')
      if (!record.subject || !String(record.subject).trim()) issues.push('Missing subject')
      if (!record.chapter || !String(record.chapter).trim()) issues.push('Missing chapter')

      const key = String(record.front || '').toLowerCase().trim()
      if (key && seen.has(key)) {
        issues.push('Duplicate card')
        duplicateCount += 1
      } else if (key) {
        seen.add(key)
      }
    }

    if (issues.length > 0) {
      invalidCount += 1
      errors.push({ index: index + 1, issues })
    } else {
      validCount += 1
    }
  })

  return { valid: validCount, invalid: invalidCount, duplicates: duplicateCount, errors, total: records.length }
}

export function validateJson(contentType, records) {
  return contentType === 'flashcards' ? validateFlashcardJson(records) : validateMcqJson(records)
}

// ── Prompt History (localStorage) ─────────────────────────────────
const HISTORY_KEY = 'nexora_ai_prompt_history'

export function loadPromptHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePromptHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)))
  } catch {
    /* storage unavailable */
  }
}
