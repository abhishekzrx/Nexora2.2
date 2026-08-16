/**
 * contentRegistry
 * Centralized academic content registry — the single bridge between the
 * Admin Panel (academicStore, the SSOT) and every student-facing module.
 *
 * This module NEVER owns academic content. It only:
 *   1. Subscribes to academicStore (the admin SSOT)
 *   2. Derives student-facing views (subjects catalog, chapter lists, stats)
 *   3. Applies smart defaults (icons, accent colors, badges, order)
 *   4. Computes content status (Ready / Draft / Locked / Incomplete)
 *   5. Respects display order and lock state
 *
 * When Supabase integration begins, only this registry's data source
 * changes — no UI, component, navigation, or business-logic redesign.
 */
import { useMemo } from 'react'
import { useAcademicStore, computeStats } from './academicStore'

// ── Smart visual defaults ─────────────────────────────────────────

/** Fallback accent palette cycled per subject. */
const ACCENT_PALETTE = [
  { accent: '#F1621B', accentLight: '#FF7A2E', accentBg: '#FFF1E6', accentSoft: '#FDECE3' },
  { accent: '#2E5CE6', accentLight: '#4F7AF7', accentBg: '#EEF2FF', accentSoft: '#E7EDFD' },
  { accent: '#12B76A', accentLight: '#2ACB7A', accentBg: '#E9F9F1', accentSoft: '#DFF7EA' },
  { accent: '#7C3AED', accentLight: '#9B5CFF', accentBg: '#F1EDFC', accentSoft: '#EFE6FC' },
  { accent: '#0E9494', accentLight: '#13BABA', accentBg: '#E6F7F7', accentSoft: '#DDF4F4' },
  { accent: '#E8491D', accentLight: '#FF6A3D', accentBg: '#FDECE7', accentSoft: '#FCE2DC' },
]

/** Icon library used when an admin omits a subject icon. */
const ICON_LIBRARY = [
  'computerNetworks',
  'operatingSystems',
  'dbms',
  'digitalElectronics',
  'dataStructures',
  'computerOrganization',
  'physics',
  'chemistry',
]

/** Map a subject display name to a stable student-facing key. */
export function subjectKeyFor(subjectName, subjectId) {
  if (subjectId && /^[a-z0-9-]+$/.test(subjectId)) return subjectId
  return String(subjectName || 'subject')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Slugify any string for route keys. */
export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Derivation helpers ────────────────────────────────────────────

/**
 * Build a student-facing subject catalog from the academicStore hierarchy.
 * Preserves admin display order. Filters archived entities.
 * Applies smart defaults for icon / accent / badge.
 */
function deriveCatalog(examinations) {
  const catalog = {}
  const orderedKeys = []
  const subjectIdToKey = {}

  // Flatten all subjects across exams → classes → subjects, preserving order
  const flattened = []
  examinations
    .filter((e) => !e.archived)
    .sort((a, b) => a.order - b.order)
    .forEach((exam) => {
      exam.classes
        .filter((c) => !c.archived)
        .sort((a, b) => a.order - b.order)
        .forEach((cls) => {
          cls.subjects
            .filter((s) => !s.archived)
            .sort((a, b) => a.order - b.order)
            .forEach((sub) => {
              flattened.push({ exam, cls, sub })
            })
        })
    })

  flattened.forEach(({ exam, cls, sub }, index) => {
    const key = subjectKeyFor(sub.name, sub.id)
    const palette = ACCENT_PALETTE[index % ACCENT_PALETTE.length]
    const icon = sub.icon || ICON_LIBRARY[index % ICON_LIBRARY.length]
    const mappedKey = sub.id || key
    const stats = computeStats({ ...exam, classes: [cls] })

    // Preserve existing key mapping so routes stay stable
    if (catalog[key]) {
      // Duplicate display name → append exam short code for uniqueness
      const uniqueKey = `${key}-${slugify(exam.shortCode || exam.name)}`
      catalog[uniqueKey] = buildSubjectEntry(uniqueKey, sub, cls, exam, palette, icon, stats, index)
      subjectIdToKey[mappedKey] = uniqueKey
      orderedKeys.push(uniqueKey)
    } else {
      catalog[key] = buildSubjectEntry(key, sub, cls, exam, palette, icon, stats, index)
      subjectIdToKey[mappedKey] = key
      orderedKeys.push(key)
    }
  })

  return { catalog, orderedKeys, subjectIdToKey }
}

/** Build a single subject entry in the student-facing mockData shape. */
function buildSubjectEntry(key, sub, cls, exam, palette, icon, stats, index) {
  const locked = Boolean(sub.locked)
  const badge = locked
    ? 'LOCKED'
    : (sub.status || 'active').toUpperCase().slice(0, 6) === 'DRAFT'
      ? 'DRAFT'
      : sub.status === 'published'
        ? 'READY'
        : index % 2 === 0
          ? 'MEDIUM'
          : 'HARD'

  const chapters = sub.chapters
    .filter((c) => !c.archived)
    .sort((a, b) => a.number - b.number)
    .map((ch, ci) => {
      const mcqCount = typeof ch.mcqs === 'number' && ch.mcqs !== 1000 ? ch.mcqs : 0
      const flashCount = typeof ch.flashcards === 'number' && ch.flashcards !== 1000 ? ch.flashcards : 0
      const progress = ch.completion && typeof ch.completion === 'number'
        ? ch.completion
        : (mcqCount > 0 || flashCount > 0)
          ? Math.min(100, ((mcqCount > 0 ? 1 : 0) + (flashCount > 0 ? 1 : 0) + (ch.notes > 0 ? 1 : 0)) * 25)
          : 0
      return {
        num: String(ch.number || ci + 1).padStart(2, '0'),
        title: ch.name,
        sub: ch.difficulty ? `${ch.difficulty.toUpperCase()} • ${ch.estMinutes || 45} min` : `${ch.status || 'draft'} • ${ch.estMinutes || 45} min`,
        progress,
        pct: `${progress}%`,
        complete: mcqCount > 0 && flashCount > 0 && ch.notes > 0 && ch.status === 'published',
        meta: `${mcqCount} MCQs • ${flashCount} Flashcards`,
        locked: Boolean(ch.locked),
        status: ch.locked ? 'locked' : ch.status || 'draft',
        id: ch.id,
      }
    })

  const averageProgress = chapters.length
    ? Math.round(chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length)
    : 0

  return {
    subjectKey: key,
    subjectId: sub.id,
    title: sub.name,
    shortCode: sub.shortCode,
    icon,
    badge,
    progress: averageProgress,
    desc: cls.name || exam.name || '',
    counts: {
      chapters: chapters.length,
      mcqs: stats.mcqs,
      flashcards: stats.flashcards,
      notes: stats.notes,
    },
    accent: sub.accent || palette.accent,
    accentLight: sub.accentLight || palette.accentLight,
    accentBg: sub.accentBg || palette.accentBg,
    accentSoft: sub.accentSoft || palette.accentSoft,
    chapters,
    locked,
    status: sub.status || 'active',
    order: sub.order || index + 1,
    examName: exam.name,
    examId: exam.id,
    className: cls.name,
    classId: cls.id,
  }
}

/** Build a full snapshot from examinations. */
function buildSnapshotFromExaminations(examinations) {
  const { catalog, orderedKeys, subjectIdToKey } = deriveCatalog(examinations || [])
  const list = orderedKeys.map((k) => catalog[k]).filter(Boolean)
  return {
    subjectCatalog: catalog,
    subjectsList: list,
    orderedKeys,
    subjectIdToKey,
    subjectCount: list.length,
    chapterCount: list.reduce((n, s) => n + (s.chapters?.length || 0), 0),
    mcqCount: list.reduce((n, s) => n + (s.counts?.mcqs || 0), 0),
    flashcardCount: list.reduce((n, s) => n + (s.counts?.flashcards || 0), 0),
    noteCount: list.reduce((n, s) => n + (s.counts?.notes || 0), 0),
    lockedSubjectCount: list.filter((s) => s.locked).length,
  }
}

/**
 * React hook — subscribes to academicStore and returns a live,
 * derived student-facing snapshot. Any admin CRUD re-renders every
 * student-facing subscriber automatically.
 */
export function useContentRegistry() {
  const { examinations } = useAcademicStore()
  return useMemo(() => buildSnapshotFromExaminations(examinations), [examinations])
}

/** Alias for useContentRegistry — same live snapshot. */
export function useSubjectCatalog() {
  return useContentRegistry()
}

/** Content status helper — derive a chapter's content status. */
export function getChapterStatus(chapter) {
  if (chapter.locked) return 'locked'
  const status = chapter.status || 'draft'
  if (status === 'published' && chapter.mcqs > 0 && chapter.flashcards > 0 && chapter.notes > 0) return 'ready'
  if (status === 'published') return 'incomplete'
  return 'draft'
}