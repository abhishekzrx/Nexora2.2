/**
 * bpscPrelimsSeed.js
 * Canonical Course and Subject specification for "BPSC PRE LIMS" derived from:
 * "BPSC Prelims Syllabus and Weightage.pdf"
 *
 * Establishes the 8 core subjects with exact order, weightage metadata, and framing.
 */

import { apiService } from '../services/apiService.js'
import { seedBpscPrelimsChapters } from './bpscPrelimsChapters.js'

export const BPSC_PRELIMS_COURSE_ID = 'bpsc-prelims'
export const BPSC_PRELIMS_COURSE_NAME = 'BPSC PRE LIMS'

export const BPSC_PRELIMS_SUBJECTS = [
  {
    order: 1,
    name: 'General Science',
    aliases: ['general science', 'science'],
    desc: 'General Science and Everyday Technology, focusing on fundamental scientific principles, practical applications and everyday observations.',
    icon: 'science',
    color: '#0E9494',
    weightage: {
      avgQuestionCount: '25–30',
      percentageShare: '16.7%–20.0%',
      strategicPriority: 'Very High (VH)',
      priorityCode: 'VH',
    },
  },
  {
    order: 2,
    name: 'Current Affairs',
    aliases: ['current affairs'],
    desc: 'National and international current affairs covering recent socio-economic, political, legal, technological and environmental developments.',
    icon: 'target',
    color: '#E8491D',
    weightage: {
      avgQuestionCount: '20–27',
      percentageShare: '13.3%–18.0%',
      strategicPriority: 'Very High (VH)',
      priorityCode: 'VH',
    },
  },
  {
    order: 3,
    name: 'Bihar Special Knowledge',
    aliases: ['bihar special knowledge', 'bihar specific', 'bihar special', 'bihar gk'],
    desc: 'Bihar-specific history, geography, economy, administration, governance and regional developments.',
    icon: 'location',
    color: '#0F766E',
    weightage: {
      avgQuestionCount: '20–25',
      percentageShare: '13.3%–16.7%',
      strategicPriority: 'Very High (VH)',
      priorityCode: 'VH',
    },
  },
  {
    order: 4,
    name: 'Indian History',
    aliases: [
      'indian history',
      'history',
      'indian history & freedom movement',
      'indian history and freedom movement',
    ],
    desc: 'Indian history and freedom movement with emphasis on socio-economic transformations, political developments and the national movement.',
    icon: 'chapters',
    color: '#F1621B',
    weightage: {
      avgQuestionCount: '20–25',
      percentageShare: '13.3%–16.7%',
      strategicPriority: 'Very High (VH)',
      priorityCode: 'VH',
    },
  },
  {
    order: 5,
    name: 'Geography & Environment',
    aliases: ['geography & environment', 'geography', 'environment', 'geography and environment'],
    desc: 'Physical, spatial, human and economic geography of India and the world along with environmental concepts.',
    icon: 'earth',
    color: '#12B76A',
    weightage: {
      avgQuestionCount: '12–15',
      percentageShare: '8.0%–10.0%',
      strategicPriority: 'High (H)',
      priorityCode: 'H',
    },
  },
  {
    order: 6,
    name: 'Indian Polity & Governance',
    aliases: ['indian polity & governance', 'indian polity', 'polity', 'polity & governance', 'indian polity and governance'],
    desc: 'Constitutional structures, democratic processes, public policy and institutional frameworks.',
    icon: 'law',
    color: '#2E5CE6',
    weightage: {
      avgQuestionCount: '10–15',
      percentageShare: '6.7%–10.0%',
      strategicPriority: 'High (H)',
      priorityCode: 'H',
    },
  },
  {
    order: 7,
    name: 'Indian Economy',
    aliases: ['indian economy', 'economy'],
    desc: 'Indian economy, macroeconomic concepts, economic policy, planning and official economic indicators.',
    icon: 'analyticsTab',
    color: '#7C3AED',
    weightage: {
      avgQuestionCount: '8–15',
      percentageShare: '5.3%–10.0%',
      strategicPriority: 'High (H) / Medium (M)',
      priorityCode: 'H/M',
    },
  },
  {
    order: 8,
    name: 'General Mental Ability & Quantitative Aptitude',
    aliases: [
      'general mental ability & quantitative aptitude',
      'general mental ability',
      'quantitative aptitude',
      'mental ability',
      'aptitude',
      'reasoning',
      'mathematics',
    ],
    desc: 'Logical deduction, numerical fluency, mathematical problem-solving and quantitative aptitude.',
    icon: 'computer',
    color: '#6366F1',
    weightage: {
      avgQuestionCount: '10',
      percentageShare: '6.7%',
      strategicPriority: 'Medium (M)',
      priorityCode: 'M',
    },
  },
]

/**
 * Idempotent Seed Runner:
 * Verifies or seeds "BPSC PRE LIMS" course and its 8 PDF-defined subjects in Supabase.
 * Safe to execute multiple times without duplicates or data destruction.
 */
export async function seedBpscPrelimsCourseAndSubjects() {
  try {
    // 1. Ensure / update course record in Supabase
    const coursePayload = {
      name: BPSC_PRELIMS_COURSE_NAME,
      description: 'Bihar Public Service Commission – Preliminary Examination',
      icon: 'adminDashboard',
      theme_color: '#F1621B',
      status: 'active',
      published: true,
      version: 'v1.0',
    }

    try {
      const getCourseRes = await apiService.get(`/courses?id=eq.${BPSC_PRELIMS_COURSE_ID}`)
      if (getCourseRes.success && Array.isArray(getCourseRes.data) && getCourseRes.data.length > 0) {
        // Update course name if not exact
        if (getCourseRes.data[0].name !== BPSC_PRELIMS_COURSE_NAME) {
          await apiService.patch(`/courses?id=eq.${BPSC_PRELIMS_COURSE_ID}`, { name: BPSC_PRELIMS_COURSE_NAME })
        }
      } else {
        await apiService.post('/courses', { id: BPSC_PRELIMS_COURSE_ID, ...coursePayload })
      }
    } catch (err) {
      console.warn('[bpscPrelimsSeed] course check warning:', err)
    }

    // 2. Fetch existing subjects under BPSC PRE LIMS
    const subRes = await apiService.get(`/subjects?course_id=eq.${BPSC_PRELIMS_COURSE_ID}`)
    const existingSubjects = subRes.success && Array.isArray(subRes.data) ? subRes.data : []

    // 3. Reconcile / seed the 8 subjects
    for (const def of BPSC_PRELIMS_SUBJECTS) {
      const matched = existingSubjects.find((ex) =>
        def.aliases.some((alias) => String(ex.name).toLowerCase().trim() === alias.toLowerCase().trim())
      )

      if (matched) {
        // Update existing subject metadata and name
        if (matched.name !== def.name || matched.description !== def.desc) {
          await apiService.patch(`/subjects?id=eq.${matched.id}`, {
            name: def.name,
            description: def.desc,
            icon_type: def.icon,
            color: def.color,
            status: 'active',
          })
        }
      } else {
        // Create new subject
        const slug = def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
        await apiService.post('/subjects', {
          id: crypto.randomUUID(),
          course_id: BPSC_PRELIMS_COURSE_ID,
          name: def.name,
          description: def.desc,
          icon_type: def.icon,
          color: def.color,
          status: 'active',
          slug,
          difficulty: 2,
        })
      }
    }

    // 4. Seed / Reconcile the 61 BPSC Prelims chapters
    const chapterSeedRes = await seedBpscPrelimsChapters()

    return { success: true, chapters: chapterSeedRes }
  } catch (err) {
    console.warn('[bpscPrelimsSeed] Error running seed:', err)
    return { success: false, error: err.message }
  }
}

export {
  BPSC_PRELIMS_CHAPTERS,
  BPSC_PRIORITY_MAP,
  formatPriority,
  getBpscChapterByCode,
  getBpscChapterMeta,
  seedBpscPrelimsChapters,
} from './bpscPrelimsChapters.js'
