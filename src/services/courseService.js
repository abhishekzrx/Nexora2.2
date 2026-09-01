/**
 * courseService.js
 * Centralized API Service for Top-Level Courses with Supabase snake_case mapping.
 */

import { apiService } from './apiService.js'
import {
  createWorkspace,
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

    const dbPayload = mapCourseToPayload(payload)
    const res = await apiService.post('/courses', dbPayload)

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to create course in database' }
    }

    const rawRecord = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : res.data
    const mapped = mapRowToCourse(rawRecord) || mapRowToCourse(dbPayload)

    createWorkspace(mapped)

    return { success: true, data: mapped }
  },

  async updateCourse(courseId, patch) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const dbPatch = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.published !== undefined ? { published: Boolean(patch.published) } : {}),
      ...(patch.themeColor !== undefined ? { theme_color: patch.themeColor } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.version !== undefined ? { version: patch.version } : {}),
      ...(patch.order !== undefined ? { order: Number(patch.order) } : {}),
    }

    const res = await apiService.patch(`/courses?id=eq.${encodeURIComponent(courseId)}`, dbPatch)

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
