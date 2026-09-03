/**
 * StudentCourseSelector.jsx
 * Forest Green styled Course Track Switcher matching htmlresource design.
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
  
  // Security: Only show courses the member is assigned & allowed to access
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

  const courseDisplayName = (activeCourse?.name || 'SELECT COURSE').toUpperCase()

  return (
    <div className="student-course-selector-wrap" ref={ref}>
      <button
        type="button"
        className={`course-track-pill${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
        title={activeCourse?.name || 'Switch Course Track'}
        aria-expanded={open}
      >
        <div className="course-pill-left">
          <div className="course-pill-icon-box">
            <svg className="course-pill-svg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <div className="course-pill-text-col">
            <span className="course-pill-label">COURSE TRACK</span>
            <span className="course-pill-title" title={courseDisplayName}>
              {courseDisplayName}
            </span>
          </div>
        </div>
        <svg className={`course-pill-chevron${open ? ' rotate' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div className="student-course-dropdown-menu">
          <div className="course-dropdown-header">
            <span className="course-dropdown-title">Switch Active Course</span>
            <span className="course-dropdown-badge">{visibleCourses.length} Enrolled</span>
          </div>

          <div className="course-dropdown-list">
            {visibleCourses.length === 0 ? (
              <div className="course-dropdown-empty">
                <span>⚠️ No assigned courses found.</span>
              </div>
            ) : (
              visibleCourses.map((course) => {
                const isSelected = course.id === (activeCourse?.id || activeWorkspaceId)
                const subjectCount = course.subjects?.length || 0

                return (
                  <button
                    key={course.id}
                    type="button"
                    className={`course-dropdown-item${isSelected ? ' active' : ''}`}
                    onClick={() => handleSelect(course.id)}
                  >
                    <div className="course-opt-left">
                      <div className="course-opt-icon">
                        <span>🎓</span>
                      </div>
                      <div className="course-opt-info">
                        <div className="course-opt-name">{course.name}</div>
                        <div className="course-opt-meta">
                          {course.level || 'Standard'} • {subjectCount > 0 ? `${subjectCount} Subjects` : 'All Core Topics'}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="course-opt-check">
                        <AppIcon name="check" size={14} />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentCourseSelector
