/**
 * StudentCourseSelector
 * Course selector for the Student Dashboard.
 * Shows only Published courses from the centralized workspaceStore.
 */

import { useState, useRef, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import { useWorkspaceStore } from '../../data/workspaceStore'

function StudentCourseSelector({ activeCourseId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { workspaces } = useWorkspaceStore()

  const publishedCourses = workspaces.filter((w) => w.published && w.status !== 'archived')
  const activeCourse = workspaces.find((w) => w.id === activeCourseId)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="student-course-selector" ref={ref}>
      <button type="button" className="student-course-selector-trigger" onClick={() => setOpen(!open)}>
        <span className="student-course-dot" style={{ background: activeCourse?.themeColor || '#F1621B' }} />
        <span className="student-course-name">{activeCourse?.name || 'Select Course'}</span>
        <AppIcon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="student-course-dropdown">
          {publishedCourses.length === 0 ? (
            <div className="student-course-empty">No published courses available</div>
          ) : (
            publishedCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                className={`student-course-option${course.id === activeCourseId ? ' active' : ''}`}
                onClick={() => { onSelect(course.id); setOpen(false) }}
              >
                <span className="student-course-dot" style={{ background: course.themeColor || '#F1621B' }} />
                <span className="student-course-option-name">{course.name}</span>
                {course.id === activeCourseId && <AppIcon name="check" size={14} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default StudentCourseSelector
