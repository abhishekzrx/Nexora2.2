/**
 * aiContentStudio
 * Pure utility helpers for the AI Content Studio:
 * - Prompt generation (MCQ + Flashcard)
 * - JSON validation (MCQ + Flashcard)
 * - Template presets
 * All local/mock — no backend.
 */

// ── Template Presets ──────────────────────────────────────────────
export const templatePresets = [
  {
    id: 'bpsc',
    label: 'BPSC TRE 4.0',
    icon: 'rocket',
    values: { className: 'Class 12', examination: 'BPSC TRE', difficulty: 'Medium', language: 'English', withExplanations: 'Yes', withPreviousYear: 'Yes', withNegative: 'No' },
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

// ── Prompt Generation ─────────────────────────────────────────────
function buildSpecLines(form) {
  const spec = []
  if (form.className) spec.push(`Class: ${form.className}`)
  if (form.examination) spec.push(`Examination: ${form.examination}`)
  if (form.subject) spec.push(`Subject: ${form.subject}`)
  if (form.chapter) spec.push(`Chapter: ${form.chapter}`)
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
  lines.push('- All four options (A-D) must be plausible; exactly one must be correct.')
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
      if (!record.optionA || !String(record.optionA).trim()) issues.push('Missing optionA')
      if (!record.optionB || !String(record.optionB).trim()) issues.push('Missing optionB')
      if (!record.optionC || !String(record.optionC).trim()) issues.push('Missing optionC')
      if (!record.optionD || !String(record.optionD).trim()) issues.push('Missing optionD')
      if (!record.correctAnswer || !['A', 'B', 'C', 'D'].includes(String(record.correctAnswer).toUpperCase())) issues.push('Invalid correctAnswer (must be A/B/C/D)')
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