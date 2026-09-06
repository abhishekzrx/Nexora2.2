/**
 * courseService.js
 * Centralized API Service for Top-Level Courses with Supabase snake_case mapping.
 */

import { apiService } from './apiService.js'
import {
  createWorkspace,
  updateWorkspace,
  updateWorkspaceMetadata,
  deleteWorkspace as deleteWorkspaceFromStore,
} from '../data/workspaceStore.js'

function mapRowToCourse(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'adminDashboard',
    themeColor: row.theme_color || row.themeColor || '#F1621B',
    description: row.description || '',
    status: row.status || 'active',
    published: row.published !== undefined ? Boolean(row.published) : true,
    version: row.version || 'v1.0',
    order: row.order || 1,
    examDate: row.exam_date || row.examDate || '',
    showExamCountdown: row.show_exam_countdown !== undefined ? Boolean(row.show_exam_countdown) : (row.showExamCountdown !== undefined ? Boolean(row.showExamCountdown) : true),
    subjectsCount: row.subjects_count || 0,
    chaptersCount: row.chapters_count || 0,
    mcqsCount: row.mcqs_count || 0,
    flashcardsCount: row.flashcards_count || 0,
  }
}

function mapCourseToPayload(payload) {
  return {
    id: payload.id || `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: payload.name,
    description: payload.description || '',
    status: payload.status || 'active',
    icon: payload.icon || 'adminDashboard',
    theme_color: payload.themeColor || '#F1621B',
    published: payload.published !== undefined ? Boolean(payload.published) : true,
    version: payload.version || 'v1.0',
    exam_date: payload.examDate || '',
    show_exam_countdown: payload.showExamCountdown !== undefined ? Boolean(payload.showExamCountdown) : true,
  }
}

export const courseService = {
  async getCourses() {
    const res = await apiService.get('/courses?order=created_at.asc')
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map(mapRowToCourse)
      return { success: true, data: mapped }
    }
    return { success: false, error: res.error || 'Failed to fetch courses from database' }
  },

  async getCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.get(`/courses?id=eq.${encodeURIComponent(courseId)}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return { success: true, data: mapRowToCourse(res.data[0]) }
    }
    return { success: false, error: res.error || 'Course not found in database' }
  },

  async createCourse(payload) {
    if (!payload?.name) return { success: false, error: 'Course name is required' }

    let dbPayload = mapCourseToPayload(payload)
    let res = await apiService.post('/courses', dbPayload)

    // Fallback: If Supabase table is missing 'exam_date' or 'show_exam_countdown' column, retry without them
    if (!res.success && res.error && (res.error.includes('exam_date') || res.error.includes('show_exam_countdown') || res.error.includes('schema cache'))) {
      const { exam_date, show_exam_countdown, ...safePayload } = dbPayload
      res = await apiService.post('/courses', safePayload)
    }

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create course in database' }
    }

    const rawRecord = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data
    const mapped = mapRowToCourse(rawRecord) || mapRowToCourse(dbPayload)

    createWorkspace({ ...mapped, examDate: payload.examDate || '', showExamCountdown: payload.showExamCountdown !== false })

    return { success: true, data: mapped }
  },

  async updateCourse(courseId, patch) {
    if (!courseId) return { success: false, error: 'Course ID is required' }

    // 1. Update workspaceStore and localStorage immediately for instant local UI reactivity
    updateWorkspace(courseId, patch)

    const dbPatch = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.published !== undefined ? { published: Boolean(patch.published) } : {}),
      ...(patch.themeColor !== undefined ? { theme_color: patch.themeColor } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.version !== undefined ? { version: patch.version } : {}),
      ...(patch.order !== undefined ? { order: Number(patch.order) } : {}),
      ...(patch.examDate !== undefined ? { exam_date: patch.examDate } : {}),
      ...(patch.showExamCountdown !== undefined ? { show_exam_countdown: Boolean(patch.showExamCountdown) } : {}),
    }

    let res = await apiService.patch(`/courses?id=eq.${encodeURIComponent(courseId)}`, dbPatch)

    // 2. Fallback: If Supabase table is missing columns, retry DB patch without them
    if (!res.success && res.error && (res.error.includes('exam_date') || res.error.includes('show_exam_countdown') || res.error.includes('schema cache'))) {
      const { exam_date, show_exam_countdown, ...safePatch } = dbPatch
      if (Object.keys(safePatch).length > 0) {
        res = await apiService.patch(`/courses?id=eq.${encodeURIComponent(courseId)}`, safePatch)
      } else {
        res = { success: true, data: [] }
      }
    }

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update course in database' }
    }

    const rawRecord = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data
    const mapped = rawRecord ? mapRowToCourse(rawRecord) : null

    updateWorkspace(courseId, {
      ...patch,
      ...(mapped || {}),
    })

    return { success: true, data: mapped || { id: courseId, ...patch } }
  },

  async duplicateCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const getRes = await this.getCourse(courseId)
    if (!getRes.success || !getRes.data) {
      return { success: false, error: 'Source course not found in database' }
    }
    const source = getRes.data
    const newId = `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const copyPayload = {
      id: newId,
      name: `${source.name} (Copy)`,
      description: source.description || '',
      status: 'active',
      published: true,
      icon: source.icon || 'adminDashboard',
      themeColor: source.themeColor || '#F1621B',
      version: source.version || 'v1.0',
    }
    return this.createCourse(copyPayload)
  },

  async deleteCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    
    // Cascade cleanup of child records from Supabase to prevent FK violations
    try {
      const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}&select=id`)
      if (subRes.success && Array.isArray(subRes.data)) {
        for (const sub of subRes.data) {
          if (sub?.id) {
            await apiService.delete(`/mcqs?subject_id=eq.${encodeURIComponent(sub.id)}`).catch(() => {})
            await apiService.delete(`/flashcards?subject_id=eq.${encodeURIComponent(sub.id)}`).catch(() => {})
            await apiService.delete(`/chapters?subject_id=eq.${encodeURIComponent(sub.id)}`).catch(() => {})
          }
        }
      }
      await apiService.delete(`/subjects?course_id=eq.${encodeURIComponent(courseId)}`).catch(() => {})
    } catch (cascadeErr) {
      console.warn('[courseService] Cascade cleanup warning:', cascadeErr)
    }

    const res = await apiService.delete(`/courses?id=eq.${encodeURIComponent(courseId)}`)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to delete course from database' }
    }

    deleteWorkspaceFromStore(courseId)
    return { success: true, data: { id: courseId } }
  },

  async ensureCourseExists(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    try {
      const res = await apiService.get(`/courses?id=eq.${encodeURIComponent(courseId)}`)
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return { success: true, data: mapRowToCourse(res.data[0]) }
      }

      // If missing and requested by child subject creator, insert dynamic fallback record
      const fallbackCourse = {
        id: courseId,
        name: courseId.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: '',
        status: 'active',
        published: true,
        icon: 'adminDashboard',
        themeColor: '#F1621B',
        version: 'v1.0',
      }

      const dbPayload = mapCourseToPayload(fallbackCourse)
      const insertRes = await apiService.post('/courses', dbPayload)
      if (insertRes.success) {
        const rawRecord = Array.isArray(insertRes.data) && insertRes.data.length > 0 ? insertRes.data[0] : insertRes.data
        const mapped = mapRowToCourse(rawRecord) || fallbackCourse
        return { success: true, data: mapped }
      }
      return { success: false, error: insertRes.error || 'Failed to insert course into database' }
    } catch (err) {
      return { success: false, error: err.message || 'Error ensuring course existence in database' }
    }
  },
}
