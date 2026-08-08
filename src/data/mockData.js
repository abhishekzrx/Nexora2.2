/**
 * MOCK DATA — DERIVED FROM CONTENT REGISTRY
 * This module no longer owns academic content.
 * It derives everything from the centralized contentRegistry,
 * which in turn subscribes to academicStore (the Admin SSOT).
 *
 * When Supabase integration begins, only contentRegistry's data
 * source changes — no UI, component, navigation, or business-logic
 * redesign is necessary.
 */
import { getExaminations } from './academicStore'
import { subjectKeyFor } from './contentRegistry'

export const userProfile = {
  name: 'Abhi Kumar',
  sub: 'BPSC TRE 4.0 • Computer Science',
  streak: '14 Day Streak',
}

// ── Derive the subject catalog from the academicStore SSOT ─────────
// This is a non-reactive snapshot for modules that don't use hooks.
// React components should use useContentRegistry() / useSubjectCatalog()
// for live synchronization.

function buildCatalogFromExaminations(examinations) {
  const catalog = {}
  const orderedKeys = []

  const ACCENT_PALETTE = [
    { accent: '#F1621B', accentLight: '#FF7A2E', accentBg: '#FFF1E6', accentSoft: '#FDECE3' },
    { accent: '#2E5CE6', accentLight: '#4F7AF7', accentBg: '#EEF2FF', accentSoft: '#E7EDFD' },
    { accent: '#12B76A', accentLight: '#2ACB7A', accentBg: '#E9F9F1', accentSoft: '#DFF7EA' },
    { accent: '#7C3AED', accentLight: '#9B5CFF', accentBg: '#F1EDFC', accentSoft: '#EFE6FC' },
    { accent: '#0E9494', accentLight: '#13BABA', accentBg: '#E6F7F7', accentSoft: '#DDF4F4' },
    { accent: '#E8491D', accentLight: '#FF6A3D', accentBg: '#FDECE7', accentSoft: '#FCE2DC' },
  ]

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
    const locked = Boolean(sub.locked)

    const chapters = sub.chapters
      .filter((c) => !c.archived)
      .sort((a, b) => a.number - b.number)
      .map((ch, ci) => {
        const progress = ch.completion && typeof ch.completion === 'number'
          ? ch.completion
          : (ch.mcqs > 0 || ch.flashcards > 0)
            ? Math.min(100, ((ch.mcqs > 0 ? 1 : 0) + (ch.flashcards > 0 ? 1 : 0) + (ch.notes > 0 ? 1 : 0)) * 25)
            : 0
        return {
          num: String(ch.number || ci + 1).padStart(2, '0'),
          title: ch.name,
          sub: ch.difficulty ? `${ch.difficulty.toUpperCase()} • ${ch.estMinutes || 45} min` : `${ch.status || 'draft'} • ${ch.estMinutes || 45} min`,
          progress,
          pct: `${progress}%`,
          complete: ch.mcqs > 0 && ch.flashcards > 0 && ch.notes > 0 && ch.status === 'published',
          meta: `${ch.mcqs || 0} MCQs • ${ch.flashcards || 0} Flashcards`,
          locked: Boolean(ch.locked),
          status: ch.locked ? 'locked' : ch.status || 'draft',
          id: ch.id,
        }
      })

    const averageProgress = chapters.length
      ? Math.round(chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length)
      : 0

    const stats = {
      chapters: chapters.length,
      mcqs: sub.chapters.reduce((n, c) => n + (c.mcqs || 0), 0),
      flashcards: sub.chapters.reduce((n, c) => n + (c.flashcards || 0), 0),
      notes: sub.chapters.reduce((n, c) => n + (c.notes || 0), 0),
    }

    const badge = locked
      ? 'LOCKED'
      : (sub.status || 'active').toUpperCase().slice(0, 6) === 'DRAFT'
        ? 'DRAFT'
        : sub.status === 'published'
          ? 'READY'
          : index % 2 === 0
            ? 'MEDIUM'
            : 'HARD'

    catalog[key] = {
      subjectKey: key,
      subjectId: sub.id,
      title: sub.name,
      shortCode: sub.shortCode,
      icon,
      badge,
      progress: averageProgress,
      desc: cls.name || exam.name || '',
      counts: stats,
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
    orderedKeys.push(key)
  })

  return { catalog, orderedKeys }
}

// ── Live snapshot (non-hook) ──────────────────────────────────────
// Components that need live sync should use useContentRegistry().
// This provides a static snapshot for non-hook consumers.

let cachedSnapshot = null

function getSnapshot() {
  if (!cachedSnapshot) {
    const { catalog, orderedKeys } = buildCatalogFromExaminations(getExaminations())
    cachedSnapshot = { catalog, orderedKeys }
  }
  return cachedSnapshot
}

export const subjectCatalog = getSnapshot().catalog

export const subjectsList = getSnapshot().orderedKeys.map((k) => subjectCatalog[k]).filter(Boolean)

export const getSubject = (subjectKey) => subjectCatalog[subjectKey] || subjectCatalog[Object.keys(subjectCatalog)[0]] || null