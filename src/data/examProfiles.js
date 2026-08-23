/**
 * examProfiles.js
 * Centralized exam configuration for the exam-aware MCQ prompt engine.
 */

export const EXAM_PROFILES = {
  GENERIC: {
    key: 'GENERIC',
    label: 'Generic / Board',
    name: 'Generic / Board',
    shortLabel: 'Generic',
    tagline: 'No exam-specific rules applied',
    promptVersion: 'generic-v1',
    examPattern: null,
    questionTypes: ['Conceptual', 'Numerical', 'Application-based', 'Mixed'],
    defaultQuestionType: 'Mixed',
    difficulties: ['Easy', 'Medium', 'Hard', 'Mixed'],
    defaultDifficulty: 'Mixed',
    factualDepthOptions: ['Standard', 'High', 'Very High'],
    defaultFactualDepth: 'Standard',
    cognitiveStyles: ['Auto', 'Recall', 'Recall + Association', 'Elimination', 'Analytical Elimination', 'Conceptual Application'],
    defaultCognitiveStyle: 'Auto',
    biharIntegrationOptions: ['Auto', 'Yes', 'No'],
    defaultBiharIntegration: 'Auto',
    biharIntegration: 0,
    optionCount: 4,
    maxStatements: 0,
    pyqInfluenceOptions: ['Low', 'Moderate', 'High'],
    defaultPyqInfluence: 'Moderate',
    pyqInclusionOptions: ['Auto', 'Include Actual PYQs', 'Generated Questions Only', 'PYQ + Generated Mix'],
    defaultPyqInclusion: 'Auto',
    promptTemplate: null,
    validationRules: { requireOptionE: false, optionELabel: '', maxStatements: 0, homogeneousOptions: false, noClueLeakage: false },
    topicIntelligence: { enabled: false, maxDisplayPie: 8, classifications: [] },
  },
  BPSC_PRELIMS: {
    key: 'BPSC_PRELIMS',
    label: 'BPSC Prelims',
    name: 'BPSC Prelims',
    shortLabel: 'BPSC',
    tagline: 'Post-68th BPSC CCE Prelims calibration with micro-factual verification and analytical elimination',
    promptVersion: 'bpsc-prelims-v1',
    level: 'Competitive Examination',
    examPattern: { totalQuestions: 150, timeMinutes: 120, marksPerQuestion: 1, negativeMarking: 0.33, optionStructure: 'A-B-C-D-E', optionELabel: 'Not Attempted' },

    questionTypeDistribution: {
      directFactual: 0.38,
      twoStatement: 0.14,
      threeStatement: 0.12,
      matching: 0.08,
      chronology: 0.05,
      assertionReason: 0.04,
      causeEffect: 0.03,
      conceptual: 0.05,
      application: 0.03,
      mapLocation: 0.03,
      dataStatistics: 0.03,
      personalityEvent: 0.02,
    },

    difficultyDistribution: {
      easy: 0.25,
      moderate: 0.50,
      difficult: 0.18,
      veryDifficult: 0.07,
    },

    biharIntegration: 0.22,
    optionCount: 5,
    optionE: 'Not Attempted',
    maxStatements: 3,

    questionTypes: [
      'Auto / Authentic BPSC Mix',
      'Direct Factual',
      'Two-Statement',
      'Three-Statement',
      'Matching',
      'Chronology',
      'Assertion-Reason',
      'Cause-Effect',
      'Conceptual',
      'Application-Based',
      'Map / Location',
      'Data / Statistics',
      'Person-Event Association',
    ],
    defaultQuestionType: 'Auto / Authentic BPSC Mix',
    difficulties: ['Easy', 'Moderate', 'Difficult', 'Very Difficult', 'BPSC Authentic Mix', 'Auto'],
    defaultDifficulty: 'BPSC Authentic Mix',
    factualDepthOptions: ['Standard', 'High', 'Very High', 'BPSC Micro-Factual'],
    defaultFactualDepth: 'BPSC Micro-Factual',
    cognitiveStyles: ['Auto', 'Recall', 'Recall + Association', 'Elimination', 'Analytical Elimination', 'Conceptual Application'],
    defaultCognitiveStyle: 'Auto',
    biharIntegrationOptions: ['Auto', 'Yes', 'No'],
    defaultBiharIntegration: 'Auto',
    pyqInfluenceOptions: ['Low', 'Moderate', 'High', 'Authentic Pattern'],
    defaultPyqInfluence: 'Authentic Pattern',
    pyqInclusionOptions: ['Auto', 'Include Actual PYQs', 'Generated Questions Only', 'PYQ + Generated Mix'],
    defaultPyqInclusion: 'Auto',

    promptTemplate: `Act as a senior BPSC Prelims question setter with 15+ years of experience. Generate questions that strictly follow modern post-68th BPSC Prelims standards.

EXAM CALIBRATION & PRINCIPLES:
- Factual precision & concrete factual anchors in every question.
- Moderate analytical elimination & micro-factual depth.
- Statement-based questions: Maximum 3 statements testing verifiable factual knowledge.
- Distractor engineering for Options A-D: Homogeneous category, realistic and plausible, avoid obvious clues.
- Option E: Exactly "Not Attempted" (no subject content in Option E).
- Target ~22% Bihar-specific integration where naturally relevant (History, Geography, Economy, Polity, Bihar schemes, leaders, data).
- Formal administrative and exam-accurate tone.

OUTPUT FORMAT:
Return ONLY a valid JSON array without markdown or extra commentary.
Each object must follow:
{
  "question": "Full question text here.",
  "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D", "E": "Not Attempted" },
  "correct": "A",
  "difficulty": "Moderate",
  "explanation": "Concise factual explanation.",
  "subject": "Subject name",
  "chapter": "Chapter name"
}`,
    validationRules: {
      requireOptionE: true,
      optionELabel: 'Not Attempted',
      maxStatements: 3,
      homogeneousOptions: true,
      noClueLeakage: true,
      biharTarget: 0.22,
    },
    topicIntelligence: { enabled: true, maxDisplayPie: 8, classifications: ['EXACT TOPIC', 'CLOSELY RELATED', 'CONCEPTUALLY RELATED'] },
  },
}

export function getExamProfile(examKey) {
  if (!examKey) return EXAM_PROFILES.GENERIC
  if (typeof examKey === 'object' && examKey !== null) {
    return resolveExamProfile(examKey)
  }
  const normalizedKey = String(examKey).toUpperCase().trim().replace(/[-\s]+/g, '_')
  if (EXAM_PROFILES[normalizedKey]) return EXAM_PROFILES[normalizedKey]
  if (normalizedKey.includes('BPSC')) return EXAM_PROFILES.BPSC_PRELIMS
  return EXAM_PROFILES[examKey] || EXAM_PROFILES.GENERIC
}

export function resolveExamProfile(courseOrKey) {
  if (!courseOrKey) return EXAM_PROFILES.GENERIC

  // If already an exam profile object with key
  if (typeof courseOrKey === 'object' && courseOrKey.key && EXAM_PROFILES[courseOrKey.key]) {
    return EXAM_PROFILES[courseOrKey.key]
  }

  // If string key or ID passed
  if (typeof courseOrKey === 'string') {
    const raw = courseOrKey.trim()
    const upper = raw.toUpperCase().replace(/[-\s]+/g, '_')
    if (EXAM_PROFILES[upper]) return EXAM_PROFILES[upper]
    if (upper === 'BPSC' || upper.startsWith('BPSC_') || upper === 'BPSC-PRELIMS' || raw.toLowerCase().includes('bpsc')) {
      return EXAM_PROFILES.BPSC_PRELIMS
    }
    return EXAM_PROFILES.GENERIC
  }

  // If course object passed
  const profileKey =
    courseOrKey.examProfile ||
    courseOrKey.exam_profile ||
    courseOrKey.examKey ||
    courseOrKey.exam_key ||
    courseOrKey.targetExam

  if (profileKey) {
    return getExamProfile(profileKey)
  }

  const name = String(courseOrKey.name || courseOrKey.courseName || courseOrKey.id || '').toLowerCase()
  if (name.includes('bpsc')) {
    return EXAM_PROFILES.BPSC_PRELIMS
  }

  return EXAM_PROFILES.GENERIC
}

export function getExamProfileForCourse(courseId) {
  if (!courseId) return EXAM_PROFILES.GENERIC
  return resolveExamProfile(courseId)
}

export function getActiveExamKey() {
  try {
    const stored = localStorage.getItem('nexora_active_exam')
    if (stored && EXAM_PROFILES[stored]) return stored
  } catch {
    // ignore
  }
  return 'GENERIC'
}

export function setActiveExam(examKey) {
  try {
    localStorage.setItem('nexora_active_exam', examKey)
  } catch {
    // ignore
  }
}
