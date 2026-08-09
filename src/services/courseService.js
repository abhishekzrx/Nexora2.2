/**
 * courseService.js
 * Centralized API Service for Top-Level Courses with Supabase snake_case mapping.
 */

import { apiService } from './apiService'
import {
  createWorkspace,
  updateWorkspaceMetadata,
  deleteWorkspace as deleteWorkspaceFromStore,
  getWorkspaces,
} from '../data/workspaceStore'

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
    const res = await apiService.get('/courses')
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mapped = res.data.map(mapRowToCourse)
      return { success: true, data: mapped }
    }
    return { success: true, data: getWorkspaces() }
  },

  async getCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.get(`/courses?id=eq.${courseId}`)
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return { success: true, data: mapRowToCourse(res.data[0]) }
    }
    return { success: false, error: 'Course not found' }
  },

  async createCourse(payload) {
    if (!payload?.name) return { success: false, error: 'Course name is required' }

    const dbPayload = mapCourseToPayload(payload)
    const res = await apiService.post('/courses', dbPayload)

    const rawRecord = res.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null
    const mapped = rawRecord ? mapRowToCourse(rawRecord) : null

    // Synchronous central store update
    const createdInStore = createWorkspace({
      id: mapped?.id || dbPayload.id,
      name: payload.name,
      description: payload.description,
      status: payload.status,
    })

    return { success: true, data: mapped || createdInStore }
  },

  async updateCourse(courseId, patch) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const dbPatch = {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.published !== undefined ? { published: Boolean(patch.published) } : {}),
      ...(patch.themeColor ? { theme_color: patch.themeColor } : {}),
    }

    const res = await apiService.patch(`/courses?id=eq.${courseId}`, dbPatch)

    if (patch.name) {
      updateWorkspaceMetadata(courseId, 'name', patch.name)
    }

    const rawRecord = res.success && res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null
    return { success: true, data: rawRecord ? mapRowToCourse(rawRecord) : { id: courseId, ...patch } }
  },

  async deleteCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.delete(`/courses?id=eq.${courseId}`)
    deleteWorkspaceFromStore(courseId)
    return { success: true, data: { id: courseId } }
  },
}
