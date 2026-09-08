/**
 * permissionService.js
 * Granular Multi-Layer Permission & Access Control Engine.
 *
 * Implements:
 * 1. Default Inheritance Model: If Course = ALLOWED, all subjects/chapters/content types allowed by default.
 * 2. Admin Granular Overrides: Subject, Chapter, and Content-Type overrides take priority.
 * 3. Super Admin (adminalpha) universal elevated access across all courses.
 * 4. Disabled Account Protection: Disabled members blocked from all learning content.
 * 5. Strict Class-Wise Content Isolation: Prevents unauthorized cross-course subject/chapter/MCQ access.
 */

import { getWorkspaces } from '../data/workspaceStore.js'
import { getSnapshot as getAdminSnapshot } from '../data/adminStore.js'
import { subjectKeyFor } from '../data/courseRegistry.js'

export const CONTENT_TYPES = [
  { id: 'notes', label: 'Notes / Theory', icon: 'notes' },
  { id: 'pdf_notes', label: 'PDF Notes', icon: 'document' },
  { id: 'image_notes', label: 'Image Notes', icon: 'image' },
  { id: 'mcqs', label: 'MCQs & Question Bank', icon: 'mcqs' },
  { id: 'pyqs', label: 'Previous Year Questions (PYQs)', icon: 'examMode' },
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcardsTab' },
  { id: 'practice', label: 'Practice Mode', icon: 'practice' },
  { id: 'tests', label: 'Mock Tests & Exam Mode', icon: 'quiz' },
  { id: 'analytics', label: 'Performance Analytics', icon: 'analyticsTab' },
]

export const permissionService = {
  /**
   * Checks if user is active Super Admin (adminalpha).
   */
  isSuperAdmin(member) {
    if (!member) return false
    return member.role === 'SUPER_ADMIN' || member.username === 'adminalpha'
  },

  /**
   * Checks if member status is ACTIVE.
   */
  isMemberActive(member) {
    if (!member) return false
    return member.status === 'ACTIVE'
  },

  /**
   * Layer 2 Guard: Can user access Admin Panel?
   */
  canAccessAdmin(member) {
    if (!member) return false
    if (!this.isMemberActive(member)) return false
    return this.isSuperAdmin(member)
  },

  /**
   * Layer 1 Super Admin Guard: Content updates (MCQs, Flashcards, Notes, Subjects, Chapters, Courses)
   * can strictly and only be performed by Super Admin.
   */
  canEditContent(member) {
    if (!member) return false
    if (!this.isMemberActive(member)) return false
    return this.isSuperAdmin(member)
  },

  /**
   * Layer 2 Guard: Can user access a specific course?
   * Checks assigned_courses and assigned_course_id.
   */
  canAccessCourse(member, courseId) {
    if (!member || !courseId) return false
    if (!this.isMemberActive(member)) return false
    if (this.isSuperAdmin(member)) return true

    const assigned = Array.isArray(member.assigned_courses)
      ? [...member.assigned_courses]
      : []

    if (member.assigned_course_id) {
      assigned.push(member.assigned_course_id)
    }

    if (assigned.includes('*')) return true

    const strCourseId = String(courseId).toLowerCase().trim()
    return assigned.some((c) => String(c).toLowerCase().trim() === strCourseId)
  },

  /**
   * Looks up the owning courseId for a subject by subject key or ID.
   */
  getOwningCourseForSubject(subjectKeyOrId) {
    if (!subjectKeyOrId) return null
    const clean = String(subjectKeyOrId).trim().toLowerCase()

    try {
      const adminState = getAdminSnapshot?.()
      const allSubs = adminState?.allSubjects || []
      const found = allSubs.find((s) => {
        if (!s) return false
        const key = subjectKeyFor ? subjectKeyFor(s.name, s.id) : String(s.id).toLowerCase()
        return (
          String(s.id).toLowerCase() === clean ||
          String(key).toLowerCase() === clean ||
          String(s.shortCode || '').toLowerCase() === clean ||
          String(s.name || '').toLowerCase() === clean
        )
      })
      if (found && found.courseId) return found.courseId
    } catch {
      // ignore
    }

    try {
      const workspaces = getWorkspaces?.() || []
      for (const w of workspaces) {
        if (Array.isArray(w.subjects)) {
          const sFound = w.subjects.find((s) => {
            const key = subjectKeyFor ? subjectKeyFor(s.name, s.id) : String(s.id).toLowerCase()
            return (
              String(s.id).toLowerCase() === clean ||
              String(key).toLowerCase() === clean ||
              String(s.name || '').toLowerCase() === clean
            )
          })
          if (sFound) return w.id
        }
      }
    } catch {
      // ignore
    }

    return null
  },

  /**
   * Looks up the owning courseId for a chapter by chapter ID.
   */
  getOwningCourseForChapter(chapterId) {
    if (!chapterId) return null
    const clean = String(chapterId).trim().toLowerCase()

    try {
      const adminState = getAdminSnapshot?.()
      const allChaps = adminState?.allChapters || []
      const found = allChaps.find((c) => c && String(c.id).toLowerCase() === clean)
      if (found && found.courseId) return found.courseId
    } catch {
      // ignore
    }

    return null
  },

  /**
   * Checks if user can access a specific subject within a course.
   * Validates both course permission and subject ownership.
   */
  canAccessSubject(member, courseId, subjectId) {
    if (!member) return false
    if (!this.isMemberActive(member)) return false
    if (this.isSuperAdmin(member)) return true

    // Check courseId if passed
    if (courseId && !this.canAccessCourse(member, courseId)) {
      return false
    }

    // Check subject's actual owning course
    const owningCourse = this.getOwningCourseForSubject(subjectId)
    if (owningCourse && !this.canAccessCourse(member, owningCourse)) {
      return false
    }

    const overrides = member.permissions?.subject_overrides || {}
    const strSubId = String(subjectId)

    // Explicit override check
    if (overrides[strSubId] !== undefined) {
      return Boolean(overrides[strSubId])
    }

    // Default: inherited allow
    return true
  },

  /**
   * Checks if user can access a specific chapter.
   * Validates course permission, subject ownership, and chapter ownership.
   */
  canAccessChapter(member, courseId, subjectId, chapterId) {
    if (!member) return false
    if (!this.isMemberActive(member)) return false
    if (this.isSuperAdmin(member)) return true

    if (subjectId && !this.canAccessSubject(member, courseId, subjectId)) {
      return false
    }

    // Check chapter's actual owning course
    const owningCourse = this.getOwningCourseForChapter(chapterId)
    if (owningCourse && !this.canAccessCourse(member, owningCourse)) {
      return false
    }

    const overrides = member.permissions?.chapter_overrides || {}
    const strChapId = String(chapterId)

    if (overrides[strChapId] !== undefined) {
      return Boolean(overrides[strChapId])
    }

    return true
  },

  /**
   * Checks if user can access a specific content type (e.g. 'notes', 'mcqs', 'flashcards').
   */
  canAccessContent(member, courseId, contentType) {
    if (!this.canAccessCourse(member, courseId)) return false
    if (this.isSuperAdmin(member)) return true

    const overrides = member.permissions?.content_overrides || {}
    const cleanType = String(contentType).toLowerCase().trim()

    if (overrides[cleanType] !== undefined) {
      return Boolean(overrides[cleanType])
    }

    return true
  },

  /**
   * Filters course list based on member's allowed course assignments.
   */
  filterAllowedCourses(member, courses = []) {
    if (!member || !Array.isArray(courses)) return []
    if (!this.isMemberActive(member)) return []
    if (this.isSuperAdmin(member)) return courses

    return courses.filter((c) => this.canAccessCourse(member, c.id))
  },

  /**
   * Filters subject list based on member's permissions.
   */
  filterAllowedSubjects(member, courseId, subjects = []) {
    if (!member || !Array.isArray(subjects)) return []
    if (!this.canAccessCourse(member, courseId)) return []
    if (this.isSuperAdmin(member)) return subjects

    return subjects.filter((s) => this.canAccessSubject(member, courseId, s.id || s.key))
  },
}

