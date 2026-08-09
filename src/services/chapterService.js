/**
 * chapterService.js
 * Centralized API Service for Subject-Scoped Chapters with Supabase column mapping.
 */

import { apiService } from './apiService'
import {
  addChapter,
  updateChapter as updateChapterInStore,
  deleteChapter as deleteChapterFromStore,
  getChaptersBySubjectAndCourse,
} from '../data/adminStore'

function mapRowToChapter(row) {
  if (!row) return null
  return {
    id: row.id,
    courseId: row.course_id || row.courseId,
    subjectId: row.subject_id || row.subjectId,
    subject: row.subject || row.subject_id,
    name: row.name,
    number: row.number || 1,
    status: row.status || 'active',
    mcqs: row.mcqs_count || row.mcqs || 0,
    flashcards: row.flashcards_count || row.flashcards || 0,
    notes: row.notes_count || row.notes || 0,
  }
}

function mapChapterToPayload(payload, courseId, subjectId) {
  return {
    id: payload.id || `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    course_id: courseId || payload.courseId,
    subject_id: subjectId || payload.subjectId,
    subject: payload.subjectName || subjectId || payload.subject,
    name: payload.name,
    number: payload.number || 1,
    status: payload.status || 'active',
  }
}

export const chapterService = {
  async getChapters(courseId, subjectId) {
    if (!courseId || !subjectId) return { success: false, error: 'Course ID and Subject ID are required' }
    const res = await apiService.get(`/chapters?course_id=eq.${courseId}&subject_id=eq.${subjectId}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mapped = res.data.map(mapRowToChapter)
      return { success: true, data: mapped }
    }
    return { success: true, data: getChaptersBySubjectAndCourse(subjectId, courseId) }
  },

  async createChapter(courseId, subjectId, payload) {
    if (!courseId || !subjectId) return { success: false, error: 'Course ID and Subject ID are required' }
    if (!payload?.name) return { success: false, error: 'Chapter name is required' }

    const dbPayload = mapChapterToPayload(payload, courseId, subjectId)
    const res = await apiService.post('/chapters', dbPayload)

    const rawRecord = res.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null
    const mapped = rawRecord ? mapRowToChapter(rawRecord) : null

    const createdInStore = addChapter({
      id: mapped?.id || dbPayload.id,
      courseId,
      subjectId,
      subject: payload.subjectName || subjectId,
      name: payload.name,
      number: payload.number,
      status: payload.status,
    })

    return { success: true, data: mapped || createdInStore }
  },

  async updateChapter(chapterId, patch) {
    if (!chapterId) return { success: false, error: 'Chapter ID is required' }
    const dbPatch = {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.number ? { number: patch.number } : {}),
      ...(patch.status ? { status: patch.status } : {}),
    }

    const res = await apiService.patch(`/chapters?id=eq.${chapterId}`, dbPatch)
    updateChapterInStore(chapterId, patch)
    return { success: true, data: { id: chapterId, ...patch } }
  },

  async deleteChapter(chapterId) {
    if (!chapterId) return { success: false, error: 'Chapter ID is required' }
    const res = await apiService.delete(`/chapters?id=eq.${chapterId}`)
    deleteChapterFromStore(chapterId)
    return { success: true, data: { id: chapterId } }
  },
}
