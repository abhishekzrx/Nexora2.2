/**
 * permissionService.js
 * Granular Multi-Layer Permission & Access Control Engine.
 *
 * Implements:
 * 1. Default Inheritance Model: If Course = ALLOWED, all subjects/chapters/content types allowed by default.
 * 2. Admin Granular Overrides: Subject, Chapter, and Content-Type overrides take priority.
 * 3. Super Admin (adminalpha) universal elevated access.
 * 4. Disabled Account Protection: Disabled members blocked from all learning content.
 */

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
   * Layer 2 Guard: Can user access a specific course?
   */
  canAccessCourse(member, courseId) {
    if (!member || !courseId) return false
    if (!this.isMemberActive(member)) return false
    if (this.isSuperAdmin(member)) return true

    const assigned = member.assigned_courses || []
    if (assigned.includes('*')) return true

    const strCourseId = String(courseId).toLowerCase().trim()
    return assigned.some((c) => String(c).toLowerCase().trim() === strCourseId)
  },

  /**
   * Checks if user can access a specific subject within a course.
   * Default inheritance: Allowed if course allowed, unless explicitly overridden.
   */
  canAccessSubject(member, courseId, subjectId) {
    if (!this.canAccessCourse(member, courseId)) return false
    if (this.isSuperAdmin(member)) return true

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
   */
  canAccessChapter(member, courseId, subjectId, chapterId) {
    if (!this.canAccessSubject(member, courseId, subjectId)) return false
    if (this.isSuperAdmin(member)) return true

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
