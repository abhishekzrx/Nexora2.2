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
    const res = await apiService.get('/courses')
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map(mapRowToCourse)
      return { success: true, data: mapped }
    }
    return { success: false, error: res.error || 'Failed to fetch courses from database' }
  },

  async getCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.get(`/courses?id=eq.${courseId}`)
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

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToCourse(rawRecord)

    createWorkspace(mapped)

    return { success: true, data: mapped }
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

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to update course in database' }
    }

    const rawRecord = Array.isArray(res.data) ? res.data[0] : res.data
    const mapped = mapRowToCourse(rawRecord)

    if (patch.name) {
      updateWorkspaceMetadata(courseId, 'name', patch.name)
    }

    return { success: true, data: mapped }
  },

  async deleteCourse(courseId) {
    if (!courseId) return { success: false, error: 'Course ID is required' }
    const res = await apiService.delete(`/courses?id=eq.${courseId}`)

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

      const seedCourses = [
        {
          id: 'bpsc-tre-4',
          name: 'BPSC TRE 4.0 – Computer Science',
          icon: 'adminDashboard',
          themeColor: '#F1621B',
          description: 'Bihar Public Service Commission Teacher Recruitment Exam 4.0',
          status: 'active',
          published: true,
          version: 'v2.3',
        },
        {
          id: 'bpsc-prelims',
          name: 'BPSC Prelims',
          icon: 'adminDashboard',
          themeColor: '#F1621B',
          description: 'Bihar Public Service Commission – Preliminary Examination',
          status: 'active',
          published: true,
          version: 'v1.0',
        },
        {
          id: 'cbse-12-cs',
          name: 'CBSE Class 12 – Computer Science',
          icon: 'computer',
          themeColor: '#2E5CE6',
          description: 'Central Board of Secondary Education Class 12 Computer Science',
          status: 'active',
          published: true,
          version: 'v1.8',
        },
        {
          id: 'cbse-11-ph',
          name: 'CBSE Class 11 – Physics',
          icon: 'physics',
          themeColor: '#7C3AED',
          description: 'Central Board of Secondary Education Class 11 Physics',
          status: 'draft',
          published: true,
          version: 'v1.0',
        },
        {
          id: 'ssc-cgl-computer',
          name: 'SSC CGL – Computer',
          icon: 'computerNetworks',
          themeColor: '#12B76A',
          description: 'Staff Selection Commission Combined Graduate Level – Computer Section',
          status: 'active',
          published: true,
          version: 'v1.2',
        },
      ]

      const matched = seedCourses.find((w) => w.id === courseId) || {
        id: courseId,
        name: courseId.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: '',
        status: 'active',
        published: true,
        icon: 'adminDashboard',
        themeColor: '#F1621B',
        version: 'v1.0',
      }

      const dbPayload = mapCourseToPayload(matched)
      const insertRes = await apiService.post('/courses', dbPayload)
      if (insertRes.success) {
        const rawRecord = Array.isArray(insertRes.data) ? insertRes.data[0] : insertRes.data
        const mapped = mapRowToCourse(rawRecord)
        return { success: true, data: mapped }
      }
      return { success: false, error: insertRes.error || 'Failed to insert course into database' }
    } catch (err) {
      return { success: false, error: err.message || 'Error ensuring course existence in database' }
    }
  },
}
