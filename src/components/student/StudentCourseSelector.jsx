/**
 * StudentCourseSelector
 * Centralized Course selector for Student Dashboard and Header.
 * Data-bound directly to workspaceStore. Automatically reflects all courses
 * created, renamed, or updated in the Admin Panel in real time.
 */

import { useState, useRef, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'

function StudentCourseSelector({ onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()

  // Filter out archived/deleted courses — all active, draft, and published courses from Admin UI appear here
  const visibleCourses = workspaces.filter((w) => w.status !== 'archived' && w.status !== 'deleted')
  const activeCourse = workspaces.find((w) => w.id === activeWorkspaceId) || visibleCourses[0] || null

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
            <div className="student-course-empty">No courses available</div>
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

