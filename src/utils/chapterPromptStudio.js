/**
 * chapterPromptStudio.js
 * AI Prompt Generator and JSON Parser for Quick Chapter Creation in Admin Panel.
 * Generates structured prompts for ChatGPT / Claude / Gemini to break down subject syllabi into exact chapter counts
 * and parses/normalizes the returned JSON.
 */

import { formatPriority } from '../data/bpscPrelimsChapters.js'

/**
 * Derives a recommended 2-4 letter uppercase code prefix for a subject name.
 * e.g., "General Science" -> "SCI", "Ancient Indian History" -> "HIST", "Computer Networks" -> "CN"
 */
export function deriveSubjectCodePrefix(subjectName = '') {
  if (!subjectName) return 'CH'
  const clean = subjectName.trim().toUpperCase()

  if (clean.includes('COMPUTER NETWORK') || clean === 'CN') return 'CN'
  if (clean.includes('OPERATING SYSTEM') || clean === 'OS') return 'OS'
  if (clean.includes('DATABASE') || clean.includes('DBMS') || clean.includes('SQL')) return 'DBMS'
  if (clean.includes('DIGITAL') || clean.includes('ELECTRONIC')) return 'DE'
  if (clean.includes('ARCHITECTURE') || clean.includes('ORGANIZATION') || clean.includes('COA')) return 'COA'
  if (clean.includes('DATA STRUCTURE') || clean.includes('ALGORITHM') || clean.includes('DSA')) return 'DSA'
  if (clean.includes('PYTHON') || clean.includes('PROGRAMMING')) return 'PY'
  if (clean.includes('PHYSIC')) return 'PHY'
  if (clean.includes('CHEMIST')) return 'CHEM'
  if (clean.includes('BIOLOG') || clean.includes('BOTANY') || clean.includes('ZOOLOGY')) return 'BIO'
  if (clean.includes('SCIENCE')) return 'SCI'
  if (clean.includes('HISTORY') || clean.includes('HIST')) return 'HIST'
  if (clean.includes('GEOGRAPHY') || clean.includes('GEO')) return 'GEO'
  if (clean.includes('POLITY') || clean.includes('CONSTITUTION') || clean.includes('GOVERNANCE')) return 'POL'
  if (clean.includes('ECONOMY') || clean.includes('ECONOMICS')) return 'ECON'
  if (clean.includes('ENVIRONMENT') || clean.includes('ECOLOGY')) return 'ENV'
  if (clean.includes('CURRENT AFFAIR') || clean.includes('CA')) return 'CA'
  if (clean.includes('BIHAR') || clean.includes('STATE SPECIAL')) return 'BS'
  if (clean.includes('MATH') || clean.includes('QUANT') || clean.includes('APTITUDE')) return 'MATH'
  if (clean.includes('REASONING') || clean.includes('MENTAL')) return 'REAS'

  // Generic acronym from words
  const words = clean.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]).join('')
  }
  return clean.slice(0, 4) || 'CH'
}

/**
 * Builds a prompt for an AI LLM to decompose a subject into N chapters.
 */
export function buildQuickChapterPrompt({
  courseName = 'Competitive Exam',
  subjectName = 'General Studies',
  subjectDesc = '',
  numChapters = 8,
  startingNumber = 1,
  codePrefix = '',
  examTarget = 'BPSC / State PSC / Competitive Exams',
  syllabusScope = '',
  customInstructions = '',
} = {}) {
  const prefix = codePrefix || deriveSubjectCodePrefix(subjectName)
  const lines = []

  lines.push('You are an expert curriculum designer and senior academic professor specializing in competitive exams, higher secondary education, and exam syllabus structuring.')
  lines.push('')
  lines.push('### TASK OBJECTIVE:')
  lines.push(`Deconstruct the ENTIRE syllabus of the subject "${subjectName}" into exactly ${numChapters} comprehensive, distinct, and logically sequenced chapters.`)
  lines.push('')
  lines.push('### COURSE & SUBJECT SPECIFICATION:')
  lines.push(`- Course / Exam Category: ${courseName || 'Competitive Examination'}`)
  lines.push(`- Target Exam Standard: ${examTarget || 'General Competitive Standard'}`)
  lines.push(`- Target Subject: "${subjectName}"`)
  if (subjectDesc) {
    lines.push(`- Subject Overview / Core Themes: ${subjectDesc}`)
  }
  if (syllabusScope) {
    lines.push(`- Specific Syllabus Scope to Cover: ${syllabusScope}`)
  }
  lines.push(`- Total Number of Chapters: Exactly ${numChapters}`)
  lines.push(`- Starting Chapter Number: ${startingNumber}`)
  lines.push(`- Chapter Code Prefix: "${prefix}" (Format: ${prefix}-${String(startingNumber).padStart(2, '0')}, ${prefix}-${String(Number(startingNumber) + 1).padStart(2, '0')}, ...)`)
  lines.push('')
  lines.push('### CRITICAL REQUIREMENTS:')
  lines.push('1. Complete Syllabus Coverage: Together, these chapters must cover 100% of the subject syllabus without skipping fundamental or high-yield topics.')
  lines.push('2. Zero Redundancy: Ensure no overlapping or duplicate chapter topics.')
  lines.push('3. In-Depth Chapter Description: Provide a rich 2-4 sentence description for EACH chapter outlining key concepts, theories, core formulas/laws, high-yield subtopics, and exam focus areas.')
  lines.push('4. Exam Priority: Assign an exam weightage priority to each chapter using strictly one of these 4 codes:')
  lines.push('   - "VH" : Very High Priority (frequently asked, highest question weightage)')
  lines.push('   - "H"  : High Priority (core conceptual chapters, regular appearance in exams)')
  lines.push('   - "M"  : Medium Priority (standard importance, foundational concepts)')
  lines.push('   - "L"  : Low Priority (supplementary or low question frequency)')
  if (customInstructions) {
    lines.push(`5. Additional Custom Instructions: ${customInstructions}`)
  }
  lines.push('')
  lines.push('### OUTPUT FORMAT:')
  lines.push('Return ONLY a valid JSON array of objects (enclosed in ```json ... ``` or as pure JSON). Do NOT include any intro or conversational filler before or after the JSON.')
  lines.push('')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push(`    "number": ${startingNumber},`)
  lines.push(`    "code": "${prefix}-${String(startingNumber).padStart(2, '0')}",`)
  lines.push(`    "name": "Chapter 1 Title",`)
  lines.push('    "description": "Comprehensive summary of topics, subtopics, theories, applications, and high-yield areas covered in this chapter.",')
  lines.push('    "priority": "VH"')
  lines.push('  },')
  lines.push('  {')
  lines.push(`    "number": ${Number(startingNumber) + 1},`)
  lines.push(`    "code": "${prefix}-${String(Number(startingNumber) + 1).padStart(2, '0')}",`)
  lines.push(`    "name": "Chapter 2 Title",`)
  lines.push('    "description": "Comprehensive summary of topics, subtopics, theories, applications, and high-yield areas covered in this chapter.",')
  lines.push('    "priority": "H"')
  lines.push('  }')
  lines.push(']')
  lines.push('```')

  return lines.join('\n')
}

/**
 * Normalizes priority codes (VH, H, M, L) from various AI representations.
 */
export function normalizePriority(val) {
  if (!val) return 'M'
  const str = String(val).trim().toUpperCase()
  if (str === 'VH' || str === 'VERY HIGH' || str === 'VERY_HIGH' || str === 'VERYHIGH') return 'VH'
  if (str === 'H' || str === 'HIGH') return 'H'
  if (str === 'H/M' || str === 'HIGH/MEDIUM' || str === 'HIGH / MEDIUM') return 'H/M'
  if (str === 'M' || str === 'MEDIUM' || str === 'MED') return 'M'
  if (str === 'L/M' || str === 'LOW/MEDIUM' || str === 'LOW / MEDIUM') return 'L/M'
  if (str === 'L' || str === 'LOW') return 'L'
  return 'M'
}

/**
 * Extracts and cleans raw JSON text from an AI response string.
 */
export function cleanRawJsonText(rawText = '') {
  if (!rawText) return ''
  let text = String(rawText).trim()

  // Remove markdown code fences ```json ... ``` or ``` ... ```
  if (text.includes('```')) {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (codeBlockMatch && codeBlockMatch[1]) {
      text = codeBlockMatch[1].trim()
    } else {
      text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    }
  }

  // Find array [ ... ] or object { "chapters": [ ... ] }
  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1)
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1)
  }

  return text
}

/**
 * Parses and validates an AI-generated JSON string into an array of chapter items.
 */
export function parseQuickChaptersJson(rawText, defaultStartingNumber = 1, defaultCodePrefix = 'CH') {
  if (!rawText || !rawText.trim()) {
    return {
      valid: false,
      chapters: [],
      error: 'Please paste the AI-generated JSON output in the text area.',
      rawParsedCount: 0,
    }
  }

  const cleaned = cleanRawJsonText(rawText)

  let parsed = null
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    return {
      valid: false,
      chapters: [],
      error: `Invalid JSON syntax: ${err.message}. Please check for missing brackets, unescaped quotes, or trailing commas.`,
      rawParsedCount: 0,
    }
  }

  let list = []
  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.chapters)) list = parsed.chapters
    else if (Array.isArray(parsed.data)) list = parsed.data
    else if (Array.isArray(parsed.items)) list = parsed.items
    else if (Array.isArray(parsed.syllabus)) list = parsed.syllabus
    else {
      // If object with numeric keys or single chapter
      const vals = Object.values(parsed).filter((v) => v && typeof v === 'object')
      if (vals.length > 0 && Array.isArray(vals[0])) {
        list = vals[0]
      } else if (vals.length > 0) {
        list = vals
      } else {
        list = [parsed]
      }
    }
  }

  if (!list || list.length === 0) {
    return {
      valid: false,
      chapters: [],
      error: 'No chapter items found in the JSON output. Expected an array of chapter objects.',
      rawParsedCount: 0,
    }
  }

  const validatedChapters = []
  let autoIndex = Number(defaultStartingNumber) || 1

  for (let i = 0; i < list.length; i++) {
    const rawItem = list[i]
    if (!rawItem || typeof rawItem !== 'object') continue

    const name = String(
      rawItem.name ||
      rawItem.chapter_name ||
      rawItem.chapterName ||
      rawItem.title ||
      rawItem.chapter_title ||
      rawItem.chapterTitle ||
      ''
    ).trim()

    if (!name) {
      continue // Skip items without a chapter name
    }

    const desc = String(
      rawItem.description ||
      rawItem.desc ||
      rawItem.chapter_description ||
      rawItem.chapterDescription ||
      rawItem.summary ||
      rawItem.topics ||
      rawItem.syllabus ||
      ''
    ).trim()

    const rawPriority =
      rawItem.priority ||
      rawItem.priority_code ||
      rawItem.priorityCode ||
      rawItem.importance ||
      rawItem.weightage ||
      'M'

    const normalizedPriority = normalizePriority(rawPriority)
    const priorityMeta = formatPriority(normalizedPriority)

    const num = Number(rawItem.number || rawItem.chapter_number || rawItem.chapterNumber || rawItem.order) || autoIndex

    const fallbackCode = `${defaultCodePrefix || 'CH'}-${String(num).padStart(2, '0')}`
    const rawCode = String(rawItem.code || rawItem.chapter_code || rawItem.chapterCode || rawItem.id || fallbackCode).trim().toUpperCase()

    validatedChapters.push({
      tempId: `draft-ch-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      number: num,
      code: rawCode || fallbackCode,
      name,
      description: desc,
      desc,
      priority: normalizedPriority,
      priorityLabel: priorityMeta.label || normalizedPriority,
      status: 'active',
    })

    autoIndex = num + 1
  }

  if (validatedChapters.length === 0) {
    return {
      valid: false,
      chapters: [],
      error: 'Could not extract valid chapter titles from the JSON. Make sure each object has a "name" or "title" property.',
      rawParsedCount: list.length,
    }
  }

  // Sort by chapter number
  validatedChapters.sort((a, b) => (a.number || 0) - (b.number || 0))

  return {
    valid: true,
    chapters: validatedChapters,
    rawParsedCount: list.length,
  }
}
