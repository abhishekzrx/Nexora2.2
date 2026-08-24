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
    courseName: 'BPSC PRE LIMS',
    examContext: 'BPSC PRE LIMS',
    examKey: 'BPSC_PRELIMS',
    examLabel: 'BPSC PRE LIMS',
    targetAudience: 'BPSC CCE Prelims Aspirants',
    questionStyle: 'BPSC Prelims-style factual, statement-based and subject-scoped questions',
    contentRules: {
      emphasizeBiharSpecific: true,
      emphasizeCurrentAffairs: true,
      useActualPYQs: true,
      preserveQuestionSourceMetadata: true,
      preservePYQVsGeneratedDistinction: true,
    },
    subjectDomains: [
      'general science',
      'current affairs',
      'bihar special knowledge',
      'indian history',
      'geography & environment',
      'indian polity & governance',
      'indian economy',
      'general mental ability & quantitative aptitude',
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
          order: 1,
          name: 'General Science',
          icon: 'science',
          desc: 'General Science and Everyday Technology, focusing on fundamental scientific principles, practical applications and everyday observations.',
          color: '#0E9494',
          weightage: {
            avgQuestionCount: '25–30',
            percentageShare: '16.7%–20.0%',
            strategicPriority: 'Very High (VH)',
          },
          chapters: [],
        },
        {
          order: 2,
          name: 'Current Affairs',
          icon: 'target',
          desc: 'National and international current affairs covering recent socio-economic, political, legal, technological and environmental developments.',
          color: '#E8491D',
          weightage: {
            avgQuestionCount: '20–27',
            percentageShare: '13.3%–18.0%',
            strategicPriority: 'Very High (VH)',
          },
          chapters: [],
        },
        {
          order: 3,
          name: 'Bihar Special Knowledge',
          icon: 'location',
          desc: 'Bihar-specific history, geography, economy, administration, governance and regional developments.',
          color: '#0F766E',
          weightage: {
            avgQuestionCount: '20–25',
            percentageShare: '13.3%–16.7%',
            strategicPriority: 'Very High (VH)',
          },
          chapters: [],
        },
        {
          order: 4,
          name: 'Indian History',
          icon: 'chapters',
          desc: 'Indian history and freedom movement with emphasis on socio-economic transformations, political developments and the national movement.',
          color: '#F1621B',
          weightage: {
            avgQuestionCount: '20–25',
            percentageShare: '13.3%–16.7%',
            strategicPriority: 'Very High (VH)',
          },
          chapters: [],
        },
        {
          order: 5,
          name: 'Geography & Environment',
          icon: 'earth',
          desc: 'Physical, spatial, human and economic geography of India and the world along with environmental concepts.',
          color: '#12B76A',
          weightage: {
            avgQuestionCount: '12–15',
            percentageShare: '8.0%–10.0%',
            strategicPriority: 'High (H)',
          },
          chapters: [],
        },
        {
          order: 6,
          name: 'Indian Polity & Governance',
          icon: 'law',
          desc: 'Constitutional structures, democratic processes, public policy and institutional frameworks.',
          color: '#2E5CE6',
          weightage: {
            avgQuestionCount: '10–15',
            percentageShare: '6.7%–10.0%',
            strategicPriority: 'High (H)',
          },
          chapters: [],
        },
        {
          order: 7,
          name: 'Indian Economy',
          icon: 'analyticsTab',
          desc: 'Indian economy, macroeconomic concepts, economic policy, planning and official economic indicators.',
          color: '#7C3AED',
          weightage: {
            avgQuestionCount: '8–15',
            percentageShare: '5.3%–10.0%',
            strategicPriority: 'High (H) / Medium (M)',
          },
          chapters: [],
        },
        {
          order: 8,
          name: 'General Mental Ability & Quantitative Aptitude',
          icon: 'computer',
          desc: 'Logical deduction, numerical fluency, mathematical problem-solving and quantitative aptitude.',
          color: '#6366F1',
          weightage: {
            avgQuestionCount: '10',
            percentageShare: '6.7%',
            strategicPriority: 'Medium (M)',
          },
          chapters: [],
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
