/**
 * StudentCourseSelector.jsx
 * Premium, polished Course Switcher for Student Dashboard and Header.
 * Displays active track, quick dropdown with exam profile badges, and smooth animations.
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
        className={`student-course-selector-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
        title={activeCourse?.name || 'Switch Course Track'}
        aria-expanded={open}
      >
        <span className="student-course-badge-icon">
          <span>🎓</span>
        </span>
        <div className="student-course-info-wrap">
          <span className="student-course-track-lbl">COURSE TRACK</span>
          <span className="student-course-name">{activeCourse?.name || 'Select Course'}</span>
        </div>
        <span className={`student-course-chevron${open ? ' rotate' : ''}`}>
          <AppIcon name="chevronDown" size={14} />
        </span>
      </button>

      {open && (
        <div className="student-course-dropdown">
          <div className="student-course-dropdown-header">
            <div className="student-course-dropdown-title">Switch Active Course</div>
            <div className="student-course-dropdown-count">{visibleCourses.length} Enrolled</div>
          </div>

          <div className="student-course-options-list">
            {visibleCourses.length === 0 ? (
              <div className="student-course-empty">
                <span>⚠️</span>
                <span>No assigned courses found for your account.</span>
              </div>
            ) : (
              visibleCourses.map((course) => {
                const isSelected = course.id === (activeCourse?.id || activeWorkspaceId)
                const subjectCount = course.subjects?.length || 0

                return (
                  <button
                    key={course.id}
                    type="button"
                    className={`student-course-option${isSelected ? ' active' : ''}`}
                    onClick={() => handleSelect(course.id)}
                  >
                    <div className="student-course-opt-left">
                      <div className="student-course-opt-icon">
                        <span>📚</span>
                      </div>
                      <div className="student-course-opt-details">
                        <div className="student-course-option-name">{course.name}</div>
                        <div className="student-course-option-meta">
                          {course.level || 'Standard'} • {subjectCount > 0 ? `${subjectCount} Subjects` : 'All Topics'}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="student-course-check">
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
