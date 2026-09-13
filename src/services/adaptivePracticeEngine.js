/**
 * adaptivePracticeEngine.js
 * Adaptive Chapter Practice Session Selector & Error Intelligence Engine for Nexora.
 *
 * Implements:
 * 1. Intelligent 20-Question Session Selector (Weighted multi-factor scoring)
 * 2. Specialized Practice Modes (Adaptive 20 Qs, Targeted Concept, Rapid Revision, High-Difficulty, Retest)
 * 3. Error Intelligence Classifier (9 Mistake Categories)
 * 4. MCQ -> Revision -> Retest Continuous Learning Loop
 */

import { getFlatConceptsForChapter, tagQuestionWithConcept } from './knowledgeHierarchyService.js'
import { QUESTION_ANGLES } from '../utils/chapterPracticeEngine.js'

// ── Practice Modes ─────────────────────────────────────────────────
export const PRACTICE_MODES = {
  ADAPTIVE_CHAPTER: {
    id: 'adaptive',
    name: 'Adaptive Chapter Practice',
    badge: '20 Qs Balanced',
    icon: 'target',
    description: 'Intelligently balances unpracticed concepts, weak spots, multi-angle questions, and spaced revision.',
    defaultCount: 20,
  },
  TARGETED_CONCEPT: {
    id: 'targeted',
    name: 'Targeted Concept Deep Dive',
    badge: 'Concept Focus',
    icon: 'filter',
    description: 'Drill down specifically into one topic, concept, or knowledge point.',
    defaultCount: 15,
  },
  RAPID_REVISION: {
    id: 'revision',
    name: 'Rapid Revision Mode',
    badge: 'High-Yield Rules',
    icon: 'bolt',
    description: 'Quick-fire practice covering essential formulas, definitions, rules, and frequently missed traps.',
    defaultCount: 15,
  },
  HIGH_DIFFICULTY: {
    id: 'high_difficulty',
    name: 'High-Difficulty Challenge',
    badge: 'Hard & Multi-Step',
    icon: 'trophy',
    description: 'Focus solely on Difficult, Very Difficult, multi-step reasoning, and edge-case questions.',
    defaultCount: 15,
  },
  RETEST_WEAK: {
    id: 'retest',
    name: 'Retest Weak Concepts',
    badge: 'Error Recovery',
    icon: 'refresh',
    description: 'Re-attempt questions and concepts where you previously made mistakes to reach mastery.',
    defaultCount: 15,
  },
}

// ── 1. Error Intelligence Classifier ────────────────────────────────
export const ERROR_CATEGORIES = {
  CONCEPTUAL: {
    id: 'CONCEPTUAL',
    label: 'Conceptual Error',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    description: 'Misunderstanding the underlying theory, law, or mechanism.',
  },
  FACTUAL: {
    id: 'FACTUAL',
    label: 'Factual / Recall Error',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    description: 'Forgot specific facts, dates, names, or SI units.',
  },
  CALCULATION: {
    id: 'CALCULATION',
    label: 'Calculation / Formula Error',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    description: 'Mathematical mistake or incorrect formula substitution.',
  },
  LOGICAL: {
    id: 'LOGICAL',
    label: 'Logical / Reasoning Error',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    description: 'Flawed step-by-step deduction or multiple-statement analysis.',
  },
  CODE_SYNTAX: {
    id: 'CODE_SYNTAX',
    label: 'Code / Syntax Error',
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    description: 'Mistake in tracing execution or programming syntax.',
  },
  MISREADING: {
    id: 'MISREADING',
    label: 'Misreading / Exception Miss',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    description: 'Overlooked "NOT", "INCORRECT", or special boundary condition.',
  },
  OPTION_CONFUSION: {
    id: 'OPTION_CONFUSION',
    label: 'Option Confusion',
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.1)',
    description: 'Trapped between two closely related options.',
  },
  TIME_PRESSURE: {
    id: 'TIME_PRESSURE',
    label: 'Time Pressure / Rushed',
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.1)',
    description: 'Answered too hastily (< 8s) or overthought excessively.',
  },
  CARELESS: {
    id: 'CARELESS',
    label: 'Careless Mistake',
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.1)',
    description: 'Unforced error on a fundamental question.',
  },
}

/**
 * Heuristically classifies a student's incorrect attempt into an error category.
 */
export function classifyMistake({ question, selectedOptionIdx, timeTakenSeconds = 30 }) {
  if (!question) return ERROR_CATEGORIES.CONCEPTUAL

  const angle = String(question.questionAngle || '').toLowerCase()
  const qText = String(question.question || question.text || '').toLowerCase()
  const diff = String(question.difficulty || '').toLowerCase()

  // 1. Time pressure (< 7 seconds)
  if (timeTakenSeconds < 7) {
    return ERROR_CATEGORIES.TIME_PRESSURE
  }

  // 2. Misreading "NOT", "EXCEPT", "INCORRECT"
  if (qText.includes('not ') || qText.includes('incorrect') || qText.includes('except') || qText.includes('which of the following is false')) {
    return ERROR_CATEGORIES.MISREADING
  }

  // 3. Technical / Code / Syntax
  if (angle.includes('code') || angle.includes('syntax') || angle.includes('debug') || angle.includes('algorithm') || qText.includes('def ') || qText.includes('output of')) {
    return ERROR_CATEGORIES.CODE_SYNTAX
  }

  // 4. Calculation / Formula
  if (angle.includes('numerical') || angle.includes('formula') || qText.includes('calculate') || qText.includes('find the value') || /\d+\s*[\+\-\*\/\^]/.test(qText)) {
    return ERROR_CATEGORIES.CALCULATION
  }

  // 5. Logical / Statement analysis
  if (angle.includes('statement') || angle.includes('logical') || angle.includes('reasoning') || qText.includes('statement 1') || qText.includes('assertion')) {
    return ERROR_CATEGORIES.LOGICAL
  }

  // 6. Factual / Definition
  if (angle.includes('definition') || angle.includes('identification') || qText.includes('si unit') || qText.includes('who discovered') || qText.includes('in which year')) {
    return ERROR_CATEGORIES.FACTUAL
  }

  // 7. Careless on Easy questions
  if (diff === 'easy' && timeTakenSeconds < 15) {
    return ERROR_CATEGORIES.CARELESS
  }

  // Default: Conceptual error
  return ERROR_CATEGORIES.CONCEPTUAL
}

// ── 2. Adaptive Question Selection Algorithm ───────────────────────
/**
 * Intelligently constructs an optimal question set from the chapter pool.
 *
 * @param {Array} rawQuestions - All available MCQs in the chapter
 * @param {Array} progressList - User progress records
 * @param {Object} options - Selection mode & filters
 */
export function buildAdaptivePracticeSet(rawQuestions = [], progressList = [], options = {}) {
  const {
    mode = 'adaptive',
    targetCount = 20,
    selectedConceptId = null,
    selectedTopicId = null,
    selectedDifficulty = null,
    chapter = null,
  } = options

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return []
  }

  const concepts = getFlatConceptsForChapter(chapter || { title: rawQuestions[0]?.subjectTitle || 'Chapter' })
  const progressMap = new Map()

  // Map progress by question ID
  progressList.forEach((p) => {
    if (p && (p.mcq_id || p.mcqId)) {
      progressMap.set(String(p.mcq_id || p.mcqId), p)
    }
  })

  // Compute concept-level accuracy stats
  const conceptStats = {}
  concepts.forEach((c) => {
    conceptStats[c.id] = { correct: 0, attempts: 0, accuracy: 100 }
  })

  rawQuestions.forEach((q) => {
    const qConcept = q.conceptId || tagQuestionWithConcept(q, concepts)?.conceptId
    const p = progressMap.get(String(q.id))
    if (qConcept && conceptStats[qConcept] && p) {
      const att = Number(p.attempts || (p.correct_count || 0) + (p.incorrect_count || 0)) || 0
      const corr = Number(p.correct_count) || (p.status === 'MASTERED' ? 1 : 0)
      conceptStats[qConcept].attempts += att
      conceptStats[qConcept].correct += corr
    }
  })

  Object.values(conceptStats).forEach((cs) => {
    if (cs.attempts > 0) {
      cs.accuracy = Math.round((cs.correct / cs.attempts) * 100)
    }
  })

  // Enrich each question with scoring
  const scoredQuestions = rawQuestions.map((q) => {
    const p = progressMap.get(String(q.id))
    const status = String(p?.status || 'UNSEEN').toUpperCase()
    const attempts = Number(p?.attempts) || 0
    const qConcept = q.conceptId || tagQuestionWithConcept(q, concepts)?.conceptId
    const cStats = conceptStats[qConcept] || { accuracy: 100, attempts: 0 }

    let score = 50 // baseline

    // 1. Unpracticed question (+35 pts)
    if (status === 'UNSEEN' || attempts === 0) {
      score += 35
    }

    // 2. Weak concept bonus (+25 pts if concept accuracy < 60%)
    if (cStats.attempts > 0 && cStats.accuracy < 60) {
      score += 25
    }

    // 3. Incorrect recovery (+30 pts)
    if (status === 'INCORRECT' || (p?.incorrect_count || 0) > 0) {
      score += 30
    }

    // 4. Spaced repetition for mastered questions (> 5 days ago)
    if (status === 'MASTERED' && p?.last_attempted_at) {
      const daysSince = (Date.now() - new Date(p.last_attempted_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince >= 5) {
        score += 20 // Spaced revision due
      } else {
        score -= 40 // Recently mastered, deprioritize
      }
    }

    // 5. Difficulty alignment
    const diff = String(q.difficulty || 'Moderate').toLowerCase()
    if (mode === 'high_difficulty') {
      if (diff === 'difficult' || diff === 'hard' || diff.includes('very')) {
        score += 100
      } else {
        score -= 100
      }
    } else if (mode === 'revision') {
      const angle = String(q.questionAngle || '').toLowerCase()
      if (angle.includes('rule') || angle.includes('formula') || angle.includes('definition') || angle.includes('misconception')) {
        score += 50
      }
    } else if (mode === 'retest') {
      if (status === 'INCORRECT' || cStats.accuracy < 70) {
        score += 80
      } else {
        score -= 50
      }
    }

    // Targeted concept filter
    if (selectedConceptId && qConcept !== selectedConceptId) {
      score = -9999
    }

    return {
      ...q,
      conceptId: qConcept,
      status,
      attempts,
      selectionScore: score,
    }
  })

  // Filter out invalid items
  let eligible = scoredQuestions.filter((q) => q.selectionScore > -500)

  // Fallback if filter is too strict
  if (eligible.length < 5) {
    eligible = scoredQuestions
  }

  // Sort by score descending
  eligible.sort((a, b) => b.selectionScore - a.selectionScore)

  // Ensure diversity in question angles & concepts among top selections
  const selected = []
  const angleTally = {}
  const conceptTally = {}

  for (const q of eligible) {
    if (selected.length >= targetCount) break

    const ang = q.questionAngle || 'general'
    const cId = q.conceptId || 'general'

    const currentAngCount = angleTally[ang] || 0
    const currentCCount = conceptTally[cId] || 0

    // Prevent more than 3 questions with exact same angle unless needed
    if (currentAngCount >= 3 && selected.length < targetCount - 2) {
      continue
    }

    selected.push(q)
    angleTally[ang] = currentAngCount + 1
    conceptTally[cId] = currentCCount + 1
  }

  // If still below target count, fill from remaining
  if (selected.length < targetCount) {
    const pickedIds = new Set(selected.map((s) => s.id))
    for (const q of eligible) {
      if (selected.length >= targetCount) break
      if (!pickedIds.has(q.id)) {
        selected.push(q)
        pickedIds.add(q.id)
      }
    }
  }

  // Shuffle final set gently so questions don't appear strictly grouped
  return shuffleArray(selected)
}

function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── 3. MCQ -> Revision -> Retest Continuous Learning Loop ─────────
/**
 * Processes completed practice results to identify missed concepts,
 * record error intelligence, and prepare instant revision & retest targets.
 */
export function analyzePracticeSessionErrors({
  questions = [],
  answers = {},
  timeTakenPerQuestion = {},
  chapter = null,
}) {
  const flatConcepts = getFlatConceptsForChapter(chapter || { title: questions[0]?.subjectTitle || 'Chapter' })
  const missedQuestions = []
  const conceptMistakeCount = {}
  const errorTypeBreakdown = {}

  Object.keys(ERROR_CATEGORIES).forEach((k) => {
    errorTypeBreakdown[k] = 0
  })

  questions.forEach((q, idx) => {
    const chosen = answers[idx]
    const isAttempted = chosen !== undefined && chosen !== null
    const isCorrect = isAttempted && chosen === q.correct

    if (!isCorrect) {
      const timeTaken = timeTakenPerQuestion[idx] || 30
      const errorCategory = classifyMistake({ question: q, selectedOptionIdx: chosen, timeTakenSeconds: timeTaken })

      errorTypeBreakdown[errorCategory.id] = (errorTypeBreakdown[errorCategory.id] || 0) + 1

      const conceptMatch = tagQuestionWithConcept(q, flatConcepts)
      const cName = conceptMatch?.conceptName || 'General Chapter Core'
      conceptMistakeCount[cName] = (conceptMistakeCount[cName] || 0) + 1

      missedQuestions.push({
        question: q,
        index: idx,
        chosen,
        correct: q.correct,
        errorCategory,
        concept: conceptMatch,
      })
    }
  })

  // Identify top weak concepts
  const sortedWeakConcepts = Object.entries(conceptMistakeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  return {
    totalMistakes: missedQuestions.length,
    missedQuestions,
    weakConcepts: sortedWeakConcepts,
    errorTypeBreakdown,
    hasErrors: missedQuestions.length > 0,
  }
}
