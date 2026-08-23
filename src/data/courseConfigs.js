/**
 * courseConfigs.js
 * Lightweight course-level configuration mapping.
 *
 * Each course can define its own:
 * - exam context
 * - target audience
 * - question style
 * - generation rules
 * - content rules
 * - PYQ behavior
 */

export const COURSE_CONFIGS = {
  'bpsc-tre-4': {
    courseId: 'bpsc-tre-4',
    courseName: 'BPSC TRE 4.0 - Computer Science',
    examContext: 'BPSC TRE 4.0 Computer Science',
    examKey: 'BPSC_PRELIMS',
    examLabel: 'BPSC Prelims',
    targetAudience: 'Teacher Recruitment Aspirants',
    questionStyle: 'BPSC-flavoured computer science recall with mixed factual depth',
    contentRules: {
      emphasizeComputerScience: true,
      keepBPSCStyle: true,
      preferChapterSpecificQuestions: true,
      avoidUnrelatedGeneralStudies: true,
    },
    subjectDomains: [
      'digital electronics',
      'computer organization & architecture (coa)',
      'operating systems',
      'database management systems (dbms)',
      'computer networks',
      'python programming',
    ],
    generationRules: {
      defaultQuestionType: 'Auto / Authentic BPSC Mix',
      defaultDifficulty: 'BPSC Authentic Mix',
      defaultFactualDepth: 'BPSC Micro-Factual',
      defaultCognitiveStyle: 'Auto',
      defaultBiharIntegration: 'Auto',
      defaultPyqInfluence: 'Authentic Pattern',
      defaultPyqInclusion: 'Auto',
    },
    pyq: {
      enabled: true,
      scope: 'chapter',
      includeActualQuestions: true,
      preferRepositoryFirst: true,
      allowAiFallback: true,
    },
    contentBlueprint: {
      subjects: [],
    },
  },
  'bpsc-prelims': {
    courseId: 'bpsc-prelims',
    courseName: 'BPSC Prelims',
    examContext: 'BPSC Prelims',
    examKey: 'BPSC_PRELIMS',
    examLabel: 'BPSC Prelims',
    targetAudience: 'BPSC CCE Prelims Aspirants',
    questionStyle: 'BPSC Prelims-style factual, statement-based and chapter-scoped questions',
    contentRules: {
      emphasizeBiharSpecific: true,
      emphasizeCurrentAffairs: true,
      useActualPYQs: true,
      preserveQuestionSourceMetadata: true,
      preservePYQVsGeneratedDistinction: true,
    },
    subjectDomains: [
      'history',
      'geography',
      'polity',
      'economy',
      'general science',
      'bihar specific',
      'general knowledge',
      'current affairs',
      'computer science',
      'mathematics',
      'reasoning',
    ],
    generationRules: {
      defaultQuestionType: 'Auto / Authentic BPSC Mix',
      defaultDifficulty: 'BPSC Authentic Mix',
      defaultFactualDepth: 'BPSC Micro-Factual',
      defaultCognitiveStyle: 'Auto',
      defaultBiharIntegration: 'Auto',
      defaultPyqInfluence: 'Authentic Pattern',
      defaultPyqInclusion: 'Auto',
    },
    pyq: {
      enabled: true,
      scope: 'course-subject-chapter',
      includeActualQuestions: true,
      preferRepositoryFirst: true,
      allowAiFallback: true,
    },
    contentBlueprint: {
      subjects: [
        {
          name: 'History',
          icon: 'chapters',
          desc: 'Ancient, medieval, and modern Indian history with Bihar-linked context',
          color: '#F1621B',
          chapters: [
            { name: 'Ancient India', desc: 'Early civilization, Mauryan and Gupta periods' },
            { name: 'Medieval India', desc: 'Delhi Sultanate, Mughals, and regional powers' },
            { name: 'Modern India', desc: 'Company rule, reform movements, and freedom struggle' },
          ],
        },
        {
          name: 'Geography',
          icon: 'earth',
          desc: 'Physical geography, Indian geography, and Bihar geography',
          color: '#12B76A',
          chapters: [
            { name: 'Physical Geography', desc: 'Landforms, climate, and atmospheric systems' },
            { name: 'Indian Geography', desc: 'Rivers, resources, and regional distribution' },
            { name: 'Bihar Geography', desc: 'Rivers, plains, soils, and location-specific facts' },
          ],
        },
        {
          name: 'Polity',
          icon: 'law',
          desc: 'Indian Constitution, governance, rights, and institutions',
          color: '#2E5CE6',
          chapters: [
            { name: 'Indian Constitution', desc: 'Preamble, features, and constitutional structure' },
            { name: 'Fundamental Rights', desc: 'Rights, duties, and constitutional remedies' },
            { name: 'Parliament and Governance', desc: 'Legislature, executive, and key institutions' },
          ],
        },
        {
          name: 'Economy',
          icon: 'analyticsTab',
          desc: 'Indian economy, banking, budgeting, and planning',
          color: '#7C3AED',
          chapters: [
            { name: 'Indian Economy', desc: 'Core economic concepts and national economy basics' },
            { name: 'Banking and Finance', desc: 'RBI, banking systems, and monetary policy' },
            { name: 'Budget and Planning', desc: 'Budget process, planning, and fiscal concepts' },
          ],
        },
        {
          name: 'General Science',
          icon: 'science',
          desc: 'Physics, chemistry, and biology fundamentals',
          color: '#0E9494',
          chapters: [
            { name: 'Physics Basics', desc: 'Motion, force, energy, and optics basics' },
            { name: 'Chemistry Basics', desc: 'Atoms, elements, compounds, and reactions' },
            { name: 'Biology Basics', desc: 'Cells, human body, plants, and living systems' },
          ],
        },
        {
          name: 'Current Affairs',
          icon: 'target',
          desc: 'National and Bihar-specific current affairs coverage',
          color: '#E8491D',
          chapters: [
            { name: 'National Current Affairs', desc: 'Recent national events, reports, and awards' },
            { name: 'Bihar Current Affairs', desc: 'Recent Bihar schemes, governance, and news' },
            { name: 'Science and Technology', desc: 'Recent developments in science and tech' },
          ],
        },
        {
          name: 'Bihar Specific',
          icon: 'location',
          desc: 'Culture, geography, administration, and state-specific facts',
          color: '#0F766E',
          chapters: [
            { name: 'History and Culture of Bihar', desc: 'Dynasties, heritage, festivals, and culture' },
            { name: 'Bihar Geography', desc: 'Rivers, districts, climate, and landforms' },
            { name: 'Schemes and Administration', desc: 'State schemes, governance, and institutions' },
          ],
        },
      ],
    },
  },
  'cbse-12-cs': {
    courseId: 'cbse-12-cs',
    courseName: 'CBSE Class 12 - Computer Science',
    examContext: 'CBSE Class 12',
    examKey: 'GENERIC',
    examLabel: 'Generic / Board',
    targetAudience: 'Class 12 Students',
    questionStyle: 'Board-exam aligned conceptual and application questions',
    contentRules: {
      emphasizeBoardPatterns: true,
      preferConceptualQuestions: true,
      keepDifficultyModerate: true,
    },
    subjectDomains: [
      'python programming',
      'database management systems (dbms)',
      'computer networks',
      'computer organization & architecture (coa)',
    ],
    generationRules: {
      defaultQuestionType: 'Mixed',
      defaultDifficulty: 'Medium',
      defaultFactualDepth: 'Standard',
      defaultCognitiveStyle: 'Auto',
      defaultBiharIntegration: 'Auto',
      defaultPyqInfluence: 'Moderate',
      defaultPyqInclusion: 'Auto',
    },
    pyq: {
      enabled: true,
      scope: 'chapter',
      includeActualQuestions: true,
      preferRepositoryFirst: true,
      allowAiFallback: true,
    },
    contentBlueprint: {
      subjects: [],
    },
  },
  'ssc-cgl-computer': {
    courseId: 'ssc-cgl-computer',
    courseName: 'SSC CGL - Computer',
    examContext: 'SSC CGL Computer Section',
    examKey: 'GENERIC',
    examLabel: 'Generic / Board',
    targetAudience: 'SSC CGL Aspirants',
    questionStyle: 'Competitive exam style with factual recall and fast elimination',
    contentRules: {
      emphasizeCompetitiveExamStyle: true,
      preferObjectiveRecall: true,
      keepDifficultyModerate: true,
    },
    subjectDomains: [
      'fundamentals of computers',
      'software',
      'hardware',
      'networking',
      'database',
    ],
    generationRules: {
      defaultQuestionType: 'Mixed',
      defaultDifficulty: 'Medium',
      defaultFactualDepth: 'Standard',
      defaultCognitiveStyle: 'Auto',
      defaultBiharIntegration: 'Auto',
      defaultPyqInfluence: 'Moderate',
      defaultPyqInclusion: 'Auto',
    },
    pyq: {
      enabled: true,
      scope: 'chapter',
      includeActualQuestions: true,
      preferRepositoryFirst: true,
      allowAiFallback: true,
    },
    contentBlueprint: {
      subjects: [],
    },
  },
}

export const DEFAULT_COURSE_CONFIG = {
  courseId: null,
  courseName: 'Generic Course',
  examContext: 'Generic',
  examKey: 'GENERIC',
  examLabel: 'Generic / Board',
  targetAudience: 'General Students',
  questionStyle: 'Generic academic style',
  contentRules: {
    preferConceptualQuestions: true,
    preferModerateDifficulty: true,
  },
  subjectDomains: [],
  generationRules: {
    defaultQuestionType: 'Mixed',
    defaultDifficulty: 'Medium',
    defaultFactualDepth: 'Standard',
    defaultCognitiveStyle: 'Auto',
    defaultBiharIntegration: 'Auto',
    defaultPyqInfluence: 'Moderate',
    defaultPyqInclusion: 'Auto',
  },
  pyq: {
    enabled: true,
    scope: 'chapter',
    includeActualQuestions: true,
    preferRepositoryFirst: true,
    allowAiFallback: true,
  },
  contentBlueprint: {
    subjects: [],
  },
}

export function getCourseConfig(courseId) {
  if (!courseId) return DEFAULT_COURSE_CONFIG
  const key = String(courseId).toLowerCase().trim()
  if (COURSE_CONFIGS[key]) return COURSE_CONFIGS[key]
  const byName = Object.values(COURSE_CONFIGS).find((c) => String(c.courseId).toLowerCase() === key)
  if (byName) return byName
  const byNameMatch = Object.values(COURSE_CONFIGS).find((c) => String(c.courseName).toLowerCase().includes(key))
  if (byNameMatch) return byNameMatch
  return DEFAULT_COURSE_CONFIG
}
