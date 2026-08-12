/**
 * subjectService.js
 * Centralized API Service for Course-Scoped Subjects with Supabase snake_case mapping.
 */

import { apiService } from './apiService'
import {
  addSubject,
  updateSubject as updateSubjectInStore,
  deleteSubject as deleteSubjectFromStore,
} from '../data/adminStore'

function mapRowToSubject(row) {
  if (!row) return null
  return {
    id: row.id,
    courseId: row.course_id || row.courseId,
    name: row.name,
    icon: row.icon_type || 'chapters',
    desc: row.description || '',
    color: row.color || '#F1621B',
    status: row.status || 'active',
    locked: false,
    order: 1,
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: row.status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
    ],
  }
}

function toSlug(name, suffix) {
  const base = (name || 'subject')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subject'
  return suffix ? `${base}-${suffix}` : base
}

function mapSubjectToPayload(payload, courseId) {
  const slug = toSlug(payload.name, Date.now())
  const isValidUuid = payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)
  return {
    id: isValidUuid ? payload.id : crypto.randomUUID(),
    course_id: courseId || payload.courseId,
    name: payload.name,
    description: payload.desc || '',
    icon_type: payload.icon || 'chapters',
    color: payload.color || '#F1621B',
    status: payload.status || 'active',
    slug,
    difficulty: payload.difficulty || 2,
  }
}

export const subjectService = {
  async getSubjects(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.get(`/subjects?course_id=eq.${courseId}`)
    if (res.success && Array.isArray(res.data)) {
      return { success: true, data: res.data.map(mapRowToSubject) }
    }
    return { success: false, error: res.error || 'Failed to fetch subjects from database' }
  },

  async getSubject(subjectId) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const res = await apiService.get(`/subjects?id=eq.${subjectId}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return { success: true, data: mapRowToSubject(res.data[0]) }
    }
    return { success: false, error: res.error || 'Subject not found in database' }
  },

  async createSubject(courseId, payload) {
    if (!courseId) return { success: false, error: 'Course ID is required to create a Subject' }
    if (!payload?.name) return { success: false, error: 'Subject name is required' }

    const dbPayload = mapSubjectToPayload(payload, courseId)
    const res = await apiService.post('/subjects', dbPayload)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create subject in database' }
    }

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToSubject(rawRecord)

    addSubject(mapped)

    return { success: true, data: mapped }
  },

  async updateSubject(subjectId, patch) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const dbPatch = {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.desc !== undefined ? { description: patch.desc } : {}),
      ...(patch.icon ? { icon_type: patch.icon } : {}),
      ...(patch.color ? { color: patch.color } : {}),
      ...(patch.status ? { status: patch.status } : {}),
    }

    const res = await apiService.patch(`/subjects?id=eq.${subjectId}`, dbPatch)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update subject in database' }
    }

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToSubject(rawRecord)

    updateSubjectInStore(subjectId, mapped)

    return { success: true, data: mapped }
  },

  async deleteSubject(subjectId) {
    if (!subjectId) return { success: false, error: 'Subject ID is required' }
    const res = await apiService.delete(`/subjects?id=eq.${subjectId}`)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to delete subject from database' }
    }

    deleteSubjectFromStore(subjectId)
    return { success: true, data: { id: subjectId } }
  },
}
