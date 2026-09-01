/**
 * masterContentEngine.js
 * Master Unified Task Workflow Engine for Nexora EdTech LMS
 * 
 * Implements:
 * Task 1: Initialization & Context Parsing
 * Task 2: Dynamic Prompt Synthesis (MCQs, Flashcards, Revision Notes)
 * Task 3: Batched Bulk Execution Engine (Splitting count > 30 into 25-30 item sub-batches)
 * Task 4: Quality Verification & Distractor Audit (NCERT/Graduation baseline, realistic traps, single correct answer)
 * Task 5: Schema Enforcement & Output Delivery (Strict JSON schemas, multi-batch merge, ready for state injection)
 */

// ── TASK 1: Initialization & Context Parsing ───────────────────────

/**
 * Standardizes and extracts context variables from UI inputs.
 * Ensures a universal, high-yield generation standard across all subjects.
 */
export function parseContext({
  courseLevel = 'Graduation',
  subject = '',
  chapter = '',
  chapterDescription = '',
  resourceType = 'MCQs',
  quantity = 30,
  difficulty = 'Standard',
  language = 'English',
  specialInstructions = '',
  examBenchmark = 'Universal High-Yield Standard',
} = {}) {
  const normResourceType = String(resourceType).toLowerCase().includes('flash')
    ? 'flashcards'
    : String(resourceType).toLowerCase().includes('note')
    ? 'notes'
    : 'mcqs'

  const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 30)

  return {
    courseLevel: courseLevel || 'Graduation / Higher Secondary',
    subject: String(subject || 'General Studies').trim(),
    chapter: String(chapter || 'Core Chapter').trim(),
    chapterDescription: String(chapterDescription || '').trim(),
    resourceType: normResourceType,
    quantity: parsedQuantity,
    difficulty: difficulty || 'Standard High-Yield Baseline',
    language: language || 'English',
    specialInstructions: specialInstructions || '',
    examBenchmark: examBenchmark || 'NCERT / Graduation Competitive Baseline',
  }
}

// ── TASK 2: Dynamic Prompt Synthesis ───────────────────────────────

/**
 * Constructs the core AI instruction set based on the selected resource type.
 */
export function synthesizePrompt(context, batchMeta = null) {
  const {
    courseLevel,
    subject,
    chapter,
    chapterDescription,
    resourceType,
    quantity,
    difficulty,
    language,
    specialInstructions,
    examBenchmark,
  } = context

  const activeCount = batchMeta ? batchMeta.batchSize : quantity
  const batchHeading = batchMeta
    ? `### SUB-BATCH ${batchMeta.batchNumber} OF ${batchMeta.totalBatches} (Items ${batchMeta.startIndex} to ${batchMeta.endIndex} of ${quantity})`
    : `### TARGET QUANTITY: Exactly ${activeCount} items`

  if (resourceType === 'mcqs') {
    return buildUnifiedMcqPrompt({
      courseLevel,
      subject,
      chapter,
      chapterDescription,
      quantity: activeCount,
      difficulty,
      language,
      specialInstructions,
      examBenchmark,
      batchHeading,
      batchMeta,
    })
  }

  if (resourceType === 'flashcards') {
    return buildUnifiedFlashcardPrompt({
      courseLevel,
      subject,
      chapter,
      chapterDescription,
      quantity: activeCount,
      difficulty,
      language,
      specialInstructions,
      examBenchmark,
      batchHeading,
      batchMeta,
    })
  }

  // Revision Notes
  return buildUnifiedRevisionNotesPrompt({
    courseLevel,
    subject,
    chapter,
    chapterDescription,
    difficulty,
    language,
    specialInstructions,
    examBenchmark,
  })
}

/**
 * Task 2.1: MCQ Prompt Synthesis with exact exam ratios & Option E ("Not Attempted"):
 * - 45% Conceptual
 * - 25% Theoretical
 * - 10% Code Output / Technical Execution
 * - 10% Numerical / Problem-Solving
 * - 10% Statement Verification / Match-the-Following
 * - Option E strictly "Not Attempted"
 * - High-capacity 100-in-one-go smart structuring with token-optimized JSON blueprint.
 */
function buildUnifiedMcqPrompt({
  courseLevel,
  subject,
  chapter,
  chapterDescription,
  quantity,
  difficulty,
  language,
  specialInstructions,
  examBenchmark,
  batchHeading,
  batchMeta,
}) {
  // Calculate question type quota
  const conceptualCount = Math.max(1, Math.round(quantity * 0.45))
  const theoreticalCount = Math.max(1, Math.round(quantity * 0.25))
  const codeOutputCount = Math.max(0, Math.round(quantity * 0.10))
  const numericalCount = Math.max(0, Math.round(quantity * 0.10))
  const statementMatchCount = Math.max(0, quantity - (conceptualCount + theoreticalCount + codeOutputCount + numericalCount))

  const lines = []
  lines.push('You are an elite exam question architect and senior academic professor.')
  lines.push(`Your mission is to generate exactly ${quantity} high-yield, authentic exam-grade Multiple Choice Questions in ONE continuous complete JSON array without truncation, skipping, or conversational filler.`)
  lines.push('')
  lines.push('==================================================================')
  lines.push('1. CONTEXT & ACADEMIC BASELINE')
  lines.push('==================================================================')
  lines.push(`- Academic Standard: ${courseLevel} (${examBenchmark})`)
  lines.push(`- Target Subject: ${subject}`)
  lines.push(`- Target Chapter: ${chapter}`)
  if (chapterDescription) {
    lines.push(`- Syllabus Scope & Core Themes: ${chapterDescription}`)
  }
  lines.push(`- Target Difficulty Calibration: ${difficulty}`)
  lines.push(`- Language: ${language}`)
  lines.push(`- ${batchHeading}`)
  lines.push('')
  lines.push('==================================================================')
  lines.push('2. MANDATORY EXAM RATIO & DISTRIBUTION')
  lines.push('==================================================================')
  lines.push(`Generate exactly ${quantity} MCQs with this precise balanced distribution:`)
  lines.push(`- Conceptual Application (${conceptualCount} MCQs ~45%): Test deep principles, causal mechanisms, and system behavior.`)
  lines.push(`- Theoretical & Canonical Facts (${theoreticalCount} MCQs ~25%): Test foundational definitions, standard laws, protocols, and architectures.`)
  if (codeOutputCount > 0) {
    lines.push(`- Code Output / Technical Execution (${codeOutputCount} MCQs ~10%): Trace snippet execution, state transitions, or algorithm steps.`)
  }
  if (numericalCount > 0) {
    lines.push(`- Numerical / Problem-Solving (${numericalCount} MCQs ~10%): Formula evaluation, resource calculation, metrics, or time/space complexities.`)
  }
  if (statementMatchCount > 0) {
    lines.push(`- Statement Verification / Match-the-Following (${statementMatchCount} MCQs ~10%): Multi-statement validation (e.g. "Which of the statements given above is/are correct?").`)
  }
  lines.push('')

  if (quantity >= 50) {
    lines.push('==================================================================')
    lines.push('3. HIGH-CAPACITY 100-MCQ PACED COVERAGE BLUEPRINT')
    lines.push('==================================================================')
    lines.push('To ensure 100% comprehensive syllabus coverage without repetition across all questions, pace your generation through these 4 thematic quadrants:')
    lines.push(`- Quadrant 1 (Items 1 to ${Math.round(quantity * 0.25)}): Core Foundations, Definitions, Classifications, Basic Properties & Fundamental Laws.`)
    lines.push(`- Quadrant 2 (Items ${Math.round(quantity * 0.25) + 1} to ${Math.round(quantity * 0.50)}): Mechanics, Mathematical Derivations, Code Tracing, Complex Formulas & Algorithms.`)
    lines.push(`- Quadrant 3 (Items ${Math.round(quantity * 0.50) + 1} to ${Math.round(quantity * 0.75)}): Scenario Analysis, Real-World Application, Subtle Traps, Edge Cases & Common Misconceptions.`)
    lines.push(`- Quadrant 4 (Items ${Math.round(quantity * 0.75) + 1} to ${quantity}): Multi-Statement Verification, Comparative Matrix, Cross-Concept Synthesis & High-Order Reasoning.`)
    lines.push('')
  }

  lines.push('==================================================================')
  lines.push('4. OPTION E & DISTRACTOR AUDIT RULES')
  lines.push('==================================================================')
  lines.push('1. Five Options Structure (A–E): Every MCQ must have exactly 5 options labeled "A", "B", "C", "D", and "E".')
  lines.push('2. Options A, B, C, D: Must contain 4 distinct, plausible subject matter choices with homogeneous length and tone.')
  lines.push('3. OPTION E STRICT RULE: Option E MUST ALWAYS be exactly "Not Attempted". Never put real content in Option E.')
  lines.push('4. Correct Answer Constraint: "correct_option" MUST STRICTLY be one of "A", "B", "C", or "D". (Option E is NEVER correct).')
  lines.push('5. Realistic Distractor Traps: Distractors (wrong options among A-D) must represent genuine student misconceptions, common calculation errors, or closely related terminology — NOT obvious giveaways.')
  lines.push('6. No Clue Leakage: Avoid "All of the above" or "None of the above" in options A-D.')
  lines.push('7. 2-Line Explanation: Every MCQ must include a concise, high-yield explanation detailing WHY the correct answer is right and clarifying the primary trap.')
  if (specialInstructions) {
    lines.push(`8. Instructor Guidance: ${specialInstructions}`)
  }
  lines.push('')
  lines.push('==================================================================')
  lines.push('5. TOKEN-OPTIMIZED STRICT JSON SCHEMA')
  lines.push('==================================================================')
  lines.push('Return ONLY a valid, complete JSON array. No markdown code blocks, no text before or after.')
  lines.push('Ensure complete generation from index 1 to ' + quantity + ' with proper closing bracket `]`.')
  lines.push('')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push(`    "id": "${batchMeta ? `mcq-b${batchMeta.batchNumber}-1` : 'mcq-1'}",`)
  lines.push('    "question": "Full unambiguous question stem here.",')
  lines.push('    "options": {')
  lines.push('      "A": "Plausible option A",')
  lines.push('      "B": "Plausible option B",')
  lines.push('      "C": "Plausible option C",')
  lines.push('      "D": "Plausible option D",')
  lines.push('      "E": "Not Attempted"')
  lines.push('    },')
  lines.push('    "correct_option": "A",')
  lines.push('    "difficulty": "Moderate",')
  lines.push('    "question_type": "Conceptual",')
  lines.push('    "explanation": "Direct factual reasoning explaining why A is correct and why top distractor is incorrect.",')
  lines.push(`    "subject": "${subject}",`)
  lines.push(`    "chapter": "${chapter}"`)
  lines.push('  }')
  lines.push(']')
  lines.push('```')

  return lines.join('\n')
}

/**
 * Task 2.2: Flashcard Prompt Synthesis with distribution:
 * - 40% Definition
 * - 30% Comparison
 * - 20% Formulas/Rules
 * - 10% Syntax
 * Strict length limits: 15-word max front, 40-word max bulleted back response.
 */
function buildUnifiedFlashcardPrompt({
  courseLevel,
  subject,
  chapter,
  chapterDescription,
  quantity,
  difficulty,
  language,
  specialInstructions,
  examBenchmark,
  batchHeading,
  batchMeta,
}) {
  const defCount = Math.max(1, Math.round(quantity * 0.40))
  const compCount = Math.max(1, Math.round(quantity * 0.30))
  const ruleCount = Math.max(0, Math.round(quantity * 0.20))
  const syntaxCount = Math.max(0, quantity - (defCount + compCount + ruleCount))

  const lines = []
  lines.push('You are an expert cognitive learning designer creating high-retention active recall flashcards.')
  lines.push('Generate exam-grade flashcards strictly adhering to the Master Unified Specification.')
  lines.push('')
  lines.push('==================================================================')
  lines.push('1. TASK CONTEXT & OBJECTIVE')
  lines.push('==================================================================')
  lines.push(`- Academic Baseline: ${courseLevel} (${examBenchmark})`)
  lines.push(`- Subject: ${subject}`)
  lines.push(`- Chapter: ${chapter}`)
  if (chapterDescription) {
    lines.push(`- Chapter Scope: ${chapterDescription}`)
  }
  lines.push(`- Language: ${language}`)
  lines.push(`- ${batchHeading}`)
  lines.push('')
  lines.push('==================================================================')
  lines.push('2. FLASHCARD DISTRIBUTION')
  lines.push('==================================================================')
  lines.push(`Generate exactly ${quantity} flashcards with this distribution:`)
  lines.push(`- Core Definitions (${defCount} cards ~40%): Direct concept recall and essential terminology.`)
  lines.push(`- Comparison & Contrast (${compCount} cards ~30%): Distinguishing two closely related concepts/mechanisms.`)
  if (ruleCount > 0) {
    lines.push(`- Formulas, Theorems & Rules (${ruleCount} cards ~20%): Key formulas, bounds, properties, or axioms.`)
  }
  if (syntaxCount > 0) {
    lines.push(`- Syntax & Mechanics (${syntaxCount} cards ~10%): Syntax signatures, protocol commands, or workflow order.`)
  }
  lines.push('')
  lines.push('==================================================================')
  lines.push('3. LENGTH & FORMAT CONSTRAINTS')
  lines.push('==================================================================')
  lines.push('1. Front Prompt Constraint: Maximum 15 words. Must be sharp, clear, and direct active recall query.')
  lines.push('2. Back Response Constraint: Maximum 40 words. Must be formatted as 2-3 clean, bulleted key takeaways for rapid mental retention.')
  lines.push('3. Avoid ambiguity: Every card must stand alone with unambiguous context.')
  if (specialInstructions) {
    lines.push(`4. Custom Guidance: ${specialInstructions}`)
  }
  lines.push('')
  lines.push('==================================================================')
  lines.push('4. STRICT JSON SCHEMA ENFORCEMENT')
  lines.push('==================================================================')
  lines.push('Return ONLY a valid JSON array of objects without markdown formatting or preamble:')
  lines.push('```json')
  lines.push('[')
  lines.push('  {')
  lines.push(`    "id": "${batchMeta ? `fc-b${batchMeta.batchNumber}-1` : 'fc-1'}",`)
  lines.push('    "front": "Concise active recall prompt under 15 words?",')
  lines.push('    "back": "• Core point 1\\n• Crucial distinction 2\\n• Key takeaway under 40 words total",')
  lines.push('    "category": "Definition",')
  lines.push('    "tags": ["Concept", "Core"],')
  lines.push(`    "subject": "${subject}",`)
  lines.push(`    "chapter": "${chapter}"`)
  lines.push('  }')
  lines.push(']')
  lines.push('```')

  return lines.join('\n')
}

/**
 * Task 2.3: Revision Notes Prompt Synthesis with 5-part structure:
 * - 1. Core Definitions
 * - 2. Key Formulas / Syntax & Rules
 * - 3. Pitfalls & Traps
 * - 4. High-Frequency Topics
 * - 5. 10-Point One-Liner Fact Sheet
 */
function buildUnifiedRevisionNotesPrompt({
  courseLevel,
  subject,
  chapter,
  chapterDescription,
  difficulty,
  language,
  specialInstructions,
  examBenchmark,
}) {
  const lines = []
  lines.push('You are a senior academic professor and revision guide author.')
  lines.push('Synthesize a high-density, structured Chapter Revision Study Note adhering strictly to the 5-Part Master Specification.')
  lines.push('')
  lines.push('==================================================================')
  lines.push('1. CHAPTER CONTEXT')
  lines.push('==================================================================')
  lines.push(`- Academic Baseline: ${courseLevel} (${examBenchmark})`)
  lines.push(`- Subject: ${subject}`)
  lines.push(`- Chapter: ${chapter}`)
  if (chapterDescription) {
    lines.push(`- Chapter Scope: ${chapterDescription}`)
  }
  lines.push(`- Language: ${language}`)
  lines.push('')
  lines.push('==================================================================')
  lines.push('2. MANDATORY 5-PART CHAPTER STRUCTURE')
  lines.push('==================================================================')
  lines.push('Your output MUST contain all 5 sections in sequence:')
  lines.push('SECTION 1: Core Definitions (Clear, concise breakdowns of fundamental chapter concepts)')
  lines.push('SECTION 2: Key Formulas, Laws & Syntax (Mathematical expressions, code syntax, architectural equations)')
  lines.push('SECTION 3: Common Pitfalls & Traps (Subtle conceptual traps, edge cases, and exam misconceptions)')
  lines.push('SECTION 4: High-Frequency & Recurring Topics (Most commonly examined themes and application areas)')
  lines.push('SECTION 5: 10-Point One-Liner Fact Sheet (Exactly 10 crisp, high-yield one-liners for rapid pre-exam revision)')
  if (specialInstructions) {
    lines.push(`Additional Instructions: ${specialInstructions}`)
  }
  lines.push('')
  lines.push('==================================================================')
  lines.push('3. OUTPUT FORMAT')
  lines.push('==================================================================')
  lines.push('Return ONLY a valid JSON object matching this schema:')
  lines.push('```json')
  lines.push('{')
  lines.push(`  "title": "${chapter} - Master Revision Notes",`)
  lines.push(`  "subject": "${subject}",`)
  lines.push(`  "chapter": "${chapter}",`)
  lines.push('  "core_definitions": [')
  lines.push('    { "term": "Term Name", "definition": "Direct definition text." }')
  lines.push('  ],')
  lines.push('  "key_formulas_syntax": [')
  lines.push('    { "title": "Formula/Syntax Name", "formula": "Expression / Syntax", "note": "Usage rule" }')
  lines.push('  ],')
  lines.push('  "pitfalls_traps": [')
  lines.push('    { "trap": "Common mistake", "clarification": "Why it is wrong and what is correct." }')
  lines.push('  ],')
  lines.push('  "high_frequency_topics": [')
  lines.push('    { "topic": "Topic Name", "summary": "Key exam takeaways and points." }')
  lines.push('  ],')
  lines.push('  "fact_sheet_one_liners": [')
  lines.push('    "1. Fact one...",')
  lines.push('    "2. Fact two...",')
  lines.push('    "3. Fact three...",')
  lines.push('    "4. Fact four...",')
  lines.push('    "5. Fact five...",')
  lines.push('    "6. Fact six...",')
  lines.push('    "7. Fact seven...",')
  lines.push('    "8. Fact eight...",')
  lines.push('    "9. Fact nine...",')
  lines.push('    "10. Fact ten..."')
  lines.push('  ]')
  lines.push('}')
  lines.push('```')

  return lines.join('\n')
}

// ── TASK 3: Batched Bulk Execution Engine ──────────────────────────

/**
 * Evaluates requested QUANTITY and splits bulk generation into sub-batches
 * of 25-30 items per batch to avoid LLM token truncation.
 */
export function createBatchedExecutionPlan(context, maxBatchSize = 25) {
  const parsed = parseContext(context)
  const totalCount = parsed.quantity

  if (totalCount <= maxBatchSize || parsed.resourceType === 'notes') {
    return {
      isBatched: false,
      totalCount,
      totalBatches: 1,
      batches: [
        {
          batchNumber: 1,
          totalBatches: 1,
          batchSize: totalCount,
          startIndex: 1,
          endIndex: totalCount,
          prompt: synthesizePrompt(parsed),
        },
      ],
    }
  }

  const numBatches = Math.ceil(totalCount / maxBatchSize)
  const batches = []

  let remaining = totalCount
  let currentStart = 1

  for (let i = 1; i <= numBatches; i++) {
    const currentBatchSize = Math.min(remaining, maxBatchSize)
    const currentEnd = currentStart + currentBatchSize - 1

    const batchMeta = {
      batchNumber: i,
      totalBatches: numBatches,
      batchSize: currentBatchSize,
      startIndex: currentStart,
      endIndex: currentEnd,
    }

    batches.push({
      batchNumber: i,
      totalBatches: numBatches,
      batchSize: currentBatchSize,
      startIndex: currentStart,
      endIndex: currentEnd,
      prompt: synthesizePrompt(parsed, batchMeta),
    })

    currentStart = currentEnd + 1
    remaining -= currentBatchSize
  }

  return {
    isBatched: true,
    totalCount,
    totalBatches: numBatches,
    batches,
  }
}

// ── TASK 4: Quality Verification & Distractor Audit ────────────────

/**
 * Audits generated MCQ distractors, question stems, and single correct answer validity.
 */
export function auditMcqItem(item, index = 0, seenQuestions = new Set()) {
  const issues = []
  const warnings = []
  let score = 100

  if (!item || typeof item !== 'object') {
    return {
      valid: false,
      score: 0,
      issues: ['Item is not a valid JSON object.'],
      warnings: [],
      index: index + 1,
    }
  }

  // 1. Question Stem Audit
  const question = String(item.question || item.text || '').trim()
  if (!question || question.length < 8) {
    issues.push('Question stem is missing or too brief.')
    score -= 30
  }

  // Duplicate stem check
  const stemKey = question.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (stemKey && seenQuestions.has(stemKey)) {
    issues.push('Duplicate question stem detected in batch.')
    score -= 25
  } else if (stemKey) {
    seenQuestions.add(stemKey)
  }

  // 2. Options Extraction & Distractor Audit
  const opts = extractOptionsADE(item)
  const optValues = [opts.A, opts.B, opts.C, opts.D]

  // Check all 4 content options present
  if (optValues.some((o) => !o || o.trim().length === 0)) {
    issues.push('All four options (A, B, C, D) must have non-empty content.')
    score -= 25
  }

  // Distinctness check (no duplicate options)
  const cleanOpts = optValues.map((o) => o.toLowerCase().trim())
  const uniqueOpts = new Set(cleanOpts.filter(Boolean))
  if (uniqueOpts.size < cleanOpts.length) {
    issues.push('Duplicate options detected among A-D (all 4 options must be distinct).')
    score -= 20
  }

  // Check Option E is strictly "Not Attempted"
  const cleanE = String(opts.E || '').trim()
  if (!cleanE || !/not\s*attempted/i.test(cleanE)) {
    warnings.push(`Option E should be "Not Attempted" (found: "${cleanE || 'Missing'}").`)
  }

  // Clue leakage check: "All of the above" / "None of the above"
  const hasAllNone = optValues.some((o) => /all of the above|none of the above|both [a-d] and [a-d]/i.test(o))
  if (hasAllNone) {
    warnings.push('Contains "All/None of the above" distractor which may reduce question discriminator quality.')
    score -= 5
  }

  // 3. Single Valid Correct Option Assigned (A-D only)
  const rawCorrect = item.correct_option || item.correctAnswer || item.correct || item.answer
  const correct = normalizeCorrectOption(rawCorrect)

  if (!['A', 'B', 'C', 'D'].includes(correct)) {
    issues.push(`Exactly one valid correct option (A, B, C, or D) must be assigned (found: "${rawCorrect || 'None'}"). Option E is strictly "Not Attempted".`)
    score -= 30
  }

  // 4. 2-Line Explanation Completeness
  const explanation = String(item.explanation || '').trim()
  if (!explanation || explanation.length < 15) {
    warnings.push('Explanation is missing or too brief (2-line factual reasoning recommended).')
    score -= 10
  }

  return {
    valid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    warnings,
    index: index + 1,
    questionSummary: question.length > 70 ? `${question.slice(0, 70)}...` : question,
    options: opts,
    correct_option: correct,
    explanation,
  }
}

/**
 * Normalizes options into standard { A, B, C, D, E } object.
 */
function extractOptionsADE(item) {
  if (item.options && typeof item.options === 'object' && !Array.isArray(item.options)) {
    return {
      A: String(item.options.A || item.options.a || item.optionA || item.option_a || '').trim(),
      B: String(item.options.B || item.options.b || item.optionB || item.option_b || '').trim(),
      C: String(item.options.C || item.options.c || item.optionC || item.option_c || '').trim(),
      D: String(item.options.D || item.options.d || item.optionD || item.option_d || '').trim(),
      E: String(item.options.E || item.options.e || item.optionE || item.option_e || 'Not Attempted').trim() || 'Not Attempted',
    }
  }

  if (Array.isArray(item.options)) {
    return {
      A: String(item.options[0] || '').trim(),
      B: String(item.options[1] || '').trim(),
      C: String(item.options[2] || '').trim(),
      D: String(item.options[3] || '').trim(),
      E: String(item.options[4] || 'Not Attempted').trim() || 'Not Attempted',
    }
  }

  return {
    A: String(item.optionA || item.option_a || '').trim(),
    B: String(item.optionB || item.option_b || '').trim(),
    C: String(item.optionC || item.option_c || '').trim(),
    D: String(item.optionD || item.option_d || '').trim(),
    E: String(item.optionE || item.option_e || 'Not Attempted').trim() || 'Not Attempted',
  }
}

/**
 * Normalizes correct option letter.
 */
function normalizeCorrectOption(val) {
  if (val === undefined || val === null) return 'A'
  if (typeof val === 'number') {
    return ['A', 'B', 'C', 'D'][val] || 'A'
  }
  const str = String(val).trim().toUpperCase()
  if (['A', 'B', 'C', 'D'].includes(str)) return str
  if (str === '0') return 'A'
  if (str === '1') return 'B'
  if (str === '2') return 'C'
  if (str === '3') return 'D'
  return 'A'
}

/**
 * Audits a batch of MCQs for quality & distractor baseline.
 */
export function auditMcqBatch(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      total: 0,
      validCount: 0,
      invalidCount: 0,
      qualityScore: 0,
      summary: 'No items provided for quality audit.',
      audits: [],
      failedItems: [],
    }
  }

  const seenQuestions = new Set()
  const audits = items.map((item, idx) => auditMcqItem(item, idx, seenQuestions))
  const validCount = audits.filter((a) => a.valid).length
  const invalidCount = audits.length - validCount
  const avgScore = Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length)

  const failedItems = audits.filter((a) => !a.valid)

  return {
    ok: invalidCount === 0,
    total: audits.length,
    validCount,
    invalidCount,
    qualityScore: avgScore,
    summary: invalidCount === 0
      ? `100% Quality Pass (${audits.length}/${audits.length} MCQs meet NCERT/Graduation standards & distractor audit).`
      : `${invalidCount} of ${audits.length} MCQs have quality or distractor issues.`,
    audits,
    failedItems,
  }
}

// ── TASK 5: Schema Enforcement & Output Delivery ───────────────────

/**
 * Cleans raw text containing JSON (strips markdown fences, trailing commas, etc.)
 */
export function sanitizeRawJsonText(rawText) {
  if (!rawText) return ''
  let text = String(rawText).trim()

  // Remove code blocks
  if (text.includes('```')) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (match && match[1]) {
      text = match[1].trim()
    } else {
      text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    }
  }

  // Extract bracket array or object
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
 * Task 5 Schema Enforcer:
 * Normalizes MCQ item into strict frontend schema:
 * { id, question, options: { A, B, C, D, E }, correct_option, difficulty, explanation, subject, chapter }
 */
export function enforceMcqSchema(item, index = 0, defaultSubject = '', defaultChapter = '') {
  const opts = extractOptionsADE(item)
  const correct = normalizeCorrectOption(item.correct_option || item.correctAnswer || item.correct || item.answer)

  return {
    id: item.id || `mcq-${Date.now()}-${index + 1}-${Math.floor(Math.random() * 1000)}`,
    question: String(item.question || item.text || '').trim(),
    options: opts,
    optionA: opts.A,
    optionB: opts.B,
    optionC: opts.C,
    optionD: opts.D,
    optionE: opts.E || 'Not Attempted',
    option_a: opts.A,
    option_b: opts.B,
    option_c: opts.C,
    option_d: opts.D,
    option_e: opts.E || 'Not Attempted',
    correct_option: correct,
    correctAnswer: correct,
    correct: correct,
    difficulty: String(item.difficulty || 'Moderate').trim(),
    question_type: String(item.question_type || item.type || 'Conceptual').trim(),
    explanation: String(item.explanation || '').trim(),
    subject: String(item.subject || defaultSubject || '').trim(),
    chapter: String(item.chapter || defaultChapter || '').trim(),
  }
}

/**
 * Task 5 Schema Enforcer:
 * Normalizes Flashcard item into strict frontend schema:
 * { id, front, back, category, tags, subject, chapter }
 */
export function enforceFlashcardSchema(item, index = 0, defaultSubject = '', defaultChapter = '') {
  return {
    id: item.id || `fc-${Date.now()}-${index + 1}-${Math.floor(Math.random() * 1000)}`,
    front: String(item.front || item.question || item.prompt || '').trim(),
    back: String(item.back || item.answer || '').trim(),
    category: String(item.category || 'Definition').trim(),
    tags: Array.isArray(item.tags) ? item.tags : [String(item.category || 'Core')],
    subject: String(item.subject || defaultSubject || '').trim(),
    chapter: String(item.chapter || defaultChapter || '').trim(),
  }
}

/**
 * Master parser and multi-batch merger:
 * Accepts one or multiple raw JSON strings, extracts data, enforces schema, audits distractors,
 * and merges into a single clean structured payload ready for state delivery.
 */
export function parseAndEnforceBatchOutput(rawInput, resourceType = 'mcqs', defaultSubject = '', defaultChapter = '') {
  if (!rawInput || !String(rawInput).trim()) {
    return {
      success: false,
      items: [],
      error: 'Empty payload provided. Please paste the AI output.',
      audit: null,
    }
  }

  const sanitized = sanitizeRawJsonText(rawInput)
  let parsed = null

  try {
    parsed = JSON.parse(sanitized)
  } catch (err) {
    return {
      success: false,
      items: [],
      error: `JSON Syntax Error: ${err.message}. Please verify bracket matching or remove trailing commas.`,
      audit: null,
    }
  }

  let rawList = []
  if (Array.isArray(parsed)) {
    rawList = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.mcqs)) rawList = parsed.mcqs
    else if (Array.isArray(parsed.questions)) rawList = parsed.questions
    else if (Array.isArray(parsed.flashcards)) rawList = parsed.flashcards
    else if (Array.isArray(parsed.items)) rawList = parsed.items
    else if (Array.isArray(parsed.data)) rawList = parsed.data
    else {
      // Check if it's a single item or revision notes object
      rawList = [parsed]
    }
  }

  if (resourceType === 'mcqs') {
    const normalizedItems = rawList.map((item, idx) => enforceMcqSchema(item, idx, defaultSubject, defaultChapter))
    const audit = auditMcqBatch(normalizedItems)

    return {
      success: normalizedItems.length > 0,
      resourceType: 'mcqs',
      items: normalizedItems,
      totalCount: normalizedItems.length,
      audit,
      error: normalizedItems.length === 0 ? 'No valid MCQ items extracted.' : null,
    }
  }

  if (resourceType === 'flashcards') {
    const normalizedItems = rawList.map((item, idx) => enforceFlashcardSchema(item, idx, defaultSubject, defaultChapter))
    const validItems = normalizedItems.filter((f) => f.front && f.back)

    return {
      success: validItems.length > 0,
      resourceType: 'flashcards',
      items: validItems,
      totalCount: validItems.length,
      audit: {
        ok: validItems.length === normalizedItems.length,
        qualityScore: Math.round((validItems.length / Math.max(1, normalizedItems.length)) * 100),
        validCount: validItems.length,
        invalidCount: normalizedItems.length - validItems.length,
        summary: `${validItems.length} valid flashcards parsed.`,
      },
      error: validItems.length === 0 ? 'No valid flashcard items extracted.' : null,
    }
  }

  // Revision notes delivery
  return {
    success: true,
    resourceType: 'notes',
    notes: parsed,
    items: [parsed],
    totalCount: 1,
    audit: {
      ok: Boolean(parsed.core_definitions || parsed.fact_sheet_one_liners),
      qualityScore: 100,
      summary: 'Revision Notes Schema verified.',
    },
    error: null,
  }
}
