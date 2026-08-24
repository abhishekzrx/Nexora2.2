import { apiService } from './apiService.js'
import {
  addChapter,
  updateChapter as updateChapterInStore,
  deleteChapter as deleteChapterFromStore,
} from '../data/adminStore.js'
import { getBpscChapterMeta, formatPriority } from '../data/bpscPrelimsChapters.js'

function toSlug(name, suffix) {
  const base = (name || 'chapter')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'chapter'
  return suffix ? `${base}-${suffix}` : base
}

function mapRowToChapter(row, courseId) {
  if (!row) return null
  const bpscMeta = getBpscChapterMeta(row.name, row.slug)
  const code = row.chapter_code || row.code || (bpscMeta ? bpscMeta.code : '')
  const priority = row.priority || (bpscMeta ? bpscMeta.priority : 'M')
  const priorityMeta = formatPriority(priority)

  return {
    id: row.id,
    courseId: courseId || row.course_id || row.courseId,
    subjectId: row.subject_id || row.subjectId,
    subject: row.subject || row.subject_id,
    name: row.name,
    desc: row.description || row.desc || '',
    number: Number(row.number) || 1,
    code,
    priority,
    priorityLabel: bpscMeta ? bpscMeta.priorityLabel : priorityMeta.label,
    slug: row.slug || '',
    status: row.status || 'active',
    mcqs: row.mcqs_count || row.mcqs || 0,
    flashcards: row.flashcards_count || row.flashcards || 0,
    notes: row.notes_count || row.notes || 0,
    createdAt: row.created_at || row.createdAt || row.added_at || row.addedAt || null,
  }
}

function mapChapterToPayload(payload, subjectId) {
  const isValidUuid = payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)
  return {
    id: isValidUuid ? payload.id : crypto.randomUUID(),
    subject_id: subjectId || payload.subjectId,
    name: payload.name,
    description: payload.desc || payload.description || '',
    number: Number(payload.number) || 1,
    slug: payload.slug || toSlug(payload.name, Date.now()),
    status: payload.status || 'active',
    created_at: payload.createdAt || payload.created_at || new Date().toISOString(),
  }
}

export const chapterService = {
  async getChapters(courseId, subjectId) {
    if (subjectId) {
      const res = await apiService.get(`/chapters?subject_id=eq.${encodeURIComponent(subjectId)}`)
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((r) => mapRowToChapter(r, courseId))
        mapped.sort((a, b) => (a.number || 0) - (b.number || 0))
        return { success: true, data: mapped }
      }
      return { success: false, error: res.error || 'Failed to fetch chapters from database' }
    }

    if (!courseId) return { success: true, data: [] }

    const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`)
    if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
      return { success: true, data: [] }
    }

    const subjectIds = subRes.data.map((s) => s.id)
    const res = await apiService.get(`/chapters?subject_id=in.(${subjectIds.map((id) => encodeURIComponent(id)).join(',')})`)
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map((r) => mapRowToChapter(r, courseId))
      mapped.sort((a, b) => (a.number || 0) - (b.number || 0))
      return { success: true, data: mapped }
    }
    return { success: false, error: res.error || 'Failed to fetch chapters from database' }
  },

  async createChapter(courseId, subjectId, payload) {
    if (!courseId || !subjectId) return { success: false, error: 'Course ID and Subject ID are required' }
    if (!payload?.name) return { success: false, error: 'Chapter name is required' }

    let targetSubjectUuid = subjectId
    const isSubjectUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectId)

    // Resolve subject UUID from Supabase if subjectId is a non-UUID string or name
    if (!isSubjectUuid && payload.subjectName) {
      try {
        const searchRes = await apiService.get(`/subjects?name=eq.${encodeURIComponent(payload.subjectName)}`)
        if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          targetSubjectUuid = searchRes.data[0].id
        }
      } catch (err) {
        console.warn('Could not resolve subject UUID from Supabase:', err)
      }
    }

    const isValidSubjectUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSubjectUuid)

    const dbPayload = mapChapterToPayload(payload, isValidSubjectUuid ? targetSubjectUuid : null)

    let mapped = null
    if (isValidSubjectUuid) {
      try {
        const res = await apiService.post('/chapters', dbPayload)
        if (res.success && res.data) {
          const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
          mapped = mapRowToChapter(rawRecord, courseId)
        }
      } catch (err) {
        console.warn('Supabase post /chapters warning:', err)
      }
    }

    if (!mapped) {
      mapped = {
        id: crypto.randomUUID(),
        courseId,
        subjectId: targetSubjectUuid || subjectId,
        subject: payload.subjectName || subjectId,
        name: payload.name,
        desc: payload.desc || payload.description || '',
        number: Number(payload.number) || 1,
        status: payload.status || 'active',
        mcqs: 0,
        flashcards: 0,
        notes: 0,
        createdAt: new Date().toISOString(),
      }
    }

    if (payload.subjectName) mapped.subject = payload.subjectName
    addChapter(mapped)

    return { success: true, data: mapped }
  },

  async updateChapter(chapterId, patch) {
    if (!chapterId) return { success: false, error: 'Chapter ID is required' }
    const dbPatch = {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.number ? { number: Number(patch.number) } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.desc !== undefined || patch.description !== undefined ? { description: patch.desc || patch.description || '' } : {}),
    }

    const res = await apiService.patch(`/chapters?id=eq.${chapterId}`, dbPatch)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update chapter in database' }
    }

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToChapter(rawRecord, patch.courseId)

    updateChapterInStore(chapterId, mapped)

    return { success: true, data: mapped }
  },

  async deleteChapter(chapterId) {
    if (!chapterId) return { success: false, error: 'Chapter ID is required' }

    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)

    if (isValidUuid) {
      try {
        // Delete dependent MCQs and Flashcards first to prevent FK constraint errors in Supabase
        await apiService.delete(`/mcqs?chapter_id=eq.${encodeURIComponent(chapterId)}`)
        await apiService.delete(`/flashcards?chapter_id=eq.${encodeURIComponent(chapterId)}`)
        await apiService.delete(`/chapters?id=eq.${encodeURIComponent(chapterId)}`)
      } catch (err) {
        console.warn('Supabase chapter delete error:', err)
      }
    }

    deleteChapterFromStore(chapterId)
    return { success: true, data: { id: chapterId } }
  },
}
