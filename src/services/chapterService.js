/**
 * chapterService.js
 * Centralized API Service for Subject-Scoped Chapters with Supabase column mapping.
 */

import { apiService } from './apiService'
import {
  addChapter,
  updateChapter as updateChapterInStore,
  deleteChapter as deleteChapterFromStore,
} from '../data/adminStore'

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
  return {
    id: row.id,
    courseId: courseId || row.course_id || row.courseId,
    subjectId: row.subject_id || row.subjectId,
    subject: row.subject || row.subject_id,
    name: row.name,
    number: Number(row.number) || 1,
    status: row.status || 'active',
    mcqs: row.mcqs_count || row.mcqs || 0,
    flashcards: row.flashcards_count || row.flashcards || 0,
    notes: row.notes_count || row.notes || 0,
  }
}

function mapChapterToPayload(payload, subjectId) {
  const isValidUuid = payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)
  return {
    id: isValidUuid ? payload.id : crypto.randomUUID(),
    subject_id: subjectId || payload.subjectId,
    name: payload.name,
    number: Number(payload.number) || 1,
    slug: payload.slug || toSlug(payload.name, Date.now()),
    status: payload.status || 'active',
  }
}

export const chapterService = {
  async getChapters(courseId, subjectId) {
    if (subjectId) {
      const res = await apiService.get(`/chapters?subject_id=eq.${encodeURIComponent(subjectId)}`)
      if (res.success && Array.isArray(res.data)) {
        return { success: true, data: res.data.map((r) => mapRowToChapter(r, courseId)) }
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
      return { success: true, data: res.data.map((r) => mapRowToChapter(r, courseId)) }
    }
    return { success: false, error: res.error || 'Failed to fetch chapters from database' }
  },

  async createChapter(courseId, subjectId, payload) {
    if (!courseId || !subjectId) return { success: false, error: 'Course ID and Subject ID are required' }
    if (!payload?.name) return { success: false, error: 'Chapter name is required' }

    const dbPayload = mapChapterToPayload(payload, subjectId)
    const res = await apiService.post('/chapters', dbPayload)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create chapter in database' }
    }

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToChapter(rawRecord, courseId)
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
    const res = await apiService.delete(`/chapters?id=eq.${chapterId}`)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to delete chapter from database' }
    }

    deleteChapterFromStore(chapterId)
    return { success: true, data: { id: chapterId } }
  },
}
