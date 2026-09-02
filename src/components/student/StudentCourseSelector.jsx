/**
 * StudentCourseSelector
 * Centralized Course selector for Student Dashboard and Header.
 * Automatically filtered by active member's assigned courses and permissions.
 */

import { useState, useRef, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { useMemberStore } from '../../data/memberStore'
import { permissionService } from '../../services/permissionService'

function StudentCourseSelector({ onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { effectiveMember } = useMemberStore()

  // Filter out archived/deleted courses
  const allNonDeleted = workspaces.filter((w) => w.status !== 'archived' && w.status !== 'deleted')
  
  // Layer 1 Security: Only show courses the member is assigned & allowed to access
  const visibleCourses = permissionService.filterAllowedCourses(effectiveMember, allNonDeleted)

  const activeCourse = visibleCourses.find((w) => w.id === activeWorkspaceId) || visibleCourses[0] || null

  // Ensure active workspace points to an allowed course
  useEffect(() => {
    if (visibleCourses.length > 0 && !visibleCourses.some((c) => c.id === activeWorkspaceId)) {
      setActiveWorkspace(visibleCourses[0].id)
    }
  }, [visibleCourses, activeWorkspaceId])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (courseId) => {
    setActiveWorkspace(courseId)
    if (onSelect) onSelect(courseId)
    setOpen(false)
  }

  return (
    <div className="student-course-selector" ref={ref}>
      <button
        type="button"
        className="student-course-selector-trigger"
        onClick={() => setOpen(!open)}
        title={activeCourse?.name || 'Select Course'}
      >
        <span className="student-course-dot" style={{ background: activeCourse?.themeColor || '#F1621B' }} />
        <span className="student-course-name">{activeCourse?.name || 'Select Course'}</span>
        <AppIcon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="student-course-dropdown">
          {visibleCourses.length === 0 ? (
            <div className="student-course-empty">No assigned courses available</div>
          ) : (
            visibleCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                className={`student-course-option${course.id === activeWorkspaceId ? ' active' : ''}`}
                onClick={() => handleSelect(course.id)}
              >
                <span className="student-course-dot" style={{ background: course.themeColor || '#F1621B' }} />
                <span className="student-course-option-name">{course.name}</span>
                {course.id === activeWorkspaceId && <AppIcon name="check" size={14} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default StudentCourseSelector
