/**
 * questionParser.js
 * Question text parsing, PYQ metadata extraction, and tag cleaning.
 */

/**
 * Extracts PYQ metadata from question object or embedded strings.
 */
export function extractPyqInfo(question = {}) {
  if (!question || typeof question !== 'object') return null

  // 1. Direct object properties
  if (question.is_pyq || question.isPyq || question.pyq) {
    const year = String(question.pyq_year || question.exam_year || question.year || '').trim()
    const exam = String(question.pyq_exam || question.exam_profile || question.source || (typeof question.pyq === 'string' ? question.pyq : '') || 'BPSC').trim()
    const qNo = String(question.pyq_qno || question.question_number || question.questionNo || '').trim()

    let label = 'PYQ'
    if (year && exam) label = `${exam} ${year}`
    else if (year) label = `PYQ ${year}`
    else if (exam && exam !== 'BPSC') label = `${exam} PYQ`
    if (qNo) label += ` · Q${qNo}`

    return {
      isPyq: true,
      label,
      year,
      exam,
      qNo,
    }
  }

  // 2. Specific year or source properties
  if (question.exam_year || question.pyq_year) {
    const year = String(question.exam_year || question.pyq_year).trim()
    const exam = String(question.exam_profile || question.source || 'BPSC').trim()
    return {
      isPyq: true,
      label: `${exam} ${year}`,
      year,
      exam,
    }
  }

  // 3. Embedded tags inside question text e.g. [69th BPSC 2023] or [PYQ 2022]
  const text = String(question.text || question.question || '')
  const tagMatch = text.match(/\[(?:BPSC|PYQ|UPSC|SSC|CSE|CCE)\s*([^\]]*)\]/i)
  if (tagMatch) {
    return {
      isPyq: true,
      label: tagMatch[0].replace(/[\[\]]/g, '').trim(),
      year: tagMatch[1]?.trim() || '',
      exam: 'PYQ',
    }
  }

  return null
}

/**
 * Cleans leading/trailing tags like [BPSC 2022] from question text
 */
export function cleanQuestionText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return ''
  return rawText
    .replace(/^\[(?:BPSC|PYQ|UPSC|SSC|CSE|CCE)[^\]]*\]\s*/i, '')
    .trim()
}

/**
 * Parses raw question text for standard MCQ display.
 */
export function parseStructuredQuestion(rawText = '') {
  if (!rawText || typeof rawText !== 'string') {
    return { type: 'standard', text: String(rawText || '') }
  }

  const text = cleanQuestionText(rawText)
  return {
    type: 'standard',
    text,
  }
}
