/**
 * subjectService.js
 * Centralized API Service for Course-Scoped Subjects with Supabase snake_case mapping.
 */

import { apiService } from './apiService'
import {
  addSubject,
  updateSubject as updateSubjectInStore,
  deleteSubject as deleteSubjectFromStore,
  getSubjectsByCourse,
} from '../data/adminStore'

function mapRowToSubject(row) {
  if (!row) return null
  return {
    id: row.id,
    courseId: row.course_id || row.courseId,
    name: row.name,
    icon: row.icon || 'chapters',
    desc: row.desc_text || row.desc || '',
    color: row.color || '#F1621B',
    status: row.status || 'active',
    locked: Boolean(row.locked),
    order: row.order || 1,
    stats: row.stats || [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: row.status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
    ],
  }
}

function mapSubjectToPayload(payload, courseId) {
  return {
    id: payload.id || `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    course_id: courseId || payload.courseId,
    name: payload.name,
    icon: payload.icon || 'chapters',
    desc_text: payload.desc || '',
    color: payload.color || '#F1621B',
    status: payload.status || 'active',
    locked: Boolean(payload.locked),
  }
}

export const subjectService = {
  async getSubjects(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.get(`/subjects?course_id=eq.${courseId}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mapped = res.data.map(mapRowToSubject)
      return { success: true, data: mapped }
    }
    return { success: true, data: getSubjectsByCourse(courseId) }
  },

  async getSubject(subjectId) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const res = await apiService.get(`/subjects?id=eq.${subjectId}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return { success: true, data: mapRowToSubject(res.data[0]) }
    }
    return { success: false, error: 'Subject not found' }
  },

  async createSubject(courseId, payload) {
    if (!courseId) return { success: false, error: 'Course ID is required to create a Subject' }
    if (!payload?.name) return { success: false, error: 'Subject name is required' }

    const dbPayload = mapSubjectToPayload(payload, courseId)
    const res = await apiService.post('/subjects', dbPayload)

    const rawRecord = res.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null
    const mapped = rawRecord ? mapRowToSubject(rawRecord) : null

    // Synchronous central store registration for immediate UI sync
    const createdInStore = addSubject({
      id: mapped?.id || dbPayload.id,
      courseId,
      name: payload.name,
      icon: payload.icon,
      desc: payload.desc,
      color: payload.color,
      status: payload.status,
      locked: payload.locked,
    })

    return { success: true, data: mapped || createdInStore }
  },

  async updateSubject(subjectId, patch) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const dbPatch = {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.desc !== undefined ? { desc_text: patch.desc } : {}),
      ...(patch.icon ? { icon: patch.icon } : {}),
      ...(patch.color ? { color: patch.color } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.locked !== undefined ? { locked: Boolean(patch.locked) } : {}),
    }

    const res = await apiService.patch(`/subjects?id=eq.${subjectId}`, dbPatch)
    updateSubjectInStore(subjectId, patch)

    const rawRecord = res.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null
    return { success: true, data: rawRecord ? mapRowToSubject(rawRecord) : { id: subjectId, ...patch } }
  },

  async deleteSubject(subjectId) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const res = await apiService.delete(`/subjects?id=eq.${subjectId}`)
    deleteSubjectFromStore(subjectId)
    return { success: true, data: { id: subjectId } }
  },
}
