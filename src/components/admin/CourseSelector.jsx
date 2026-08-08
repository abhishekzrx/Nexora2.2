/**
 * CourseSelector
 * Dropdown selector for the active Course Workspace.
 */
import { useState, useRef, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'

const STATUS_MAP = {
  published: { label: 'Published', tone: 'green' },
  draft: { label: 'Draft', tone: 'orange' },
  archived: { label: 'Archived', tone: 'gray' },
  active: { label: 'Active', tone: 'green' },
  private: { label: 'Private', tone: 'purple' },
  inactive: { label: 'Inactive', tone: 'gray' },
}

function CourseSelector({ courses = [], activeCourseId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]
  if (!activeCourse) return null

  const statusCfg = STATUS_MAP[activeCourse.status] || STATUS_MAP.draft

  return (
    <div className="admin-course-selector" ref={ref}>
      <button
        type="button"
        className="admin-course-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="admin-course-dot" style={{ background: activeCourse.themeColor }} />
        <span className="admin-course-name">{activeCourse.name}</span>
        <span className={`admin-course-status admin-course-status-${statusCfg.tone}`}>{statusCfg.label}</span>
        <span className="admin-course-chevron">
          <AppIcon name="chevronDown" size={16} />
        </span>
      </button>

      {open ? (
        <div className="admin-course-dropdown">
          <div className="admin-course-dropdown-header">Switch Course Workspace</div>
          {courses.map((course) => {
            const isActive = course.id === activeCourseId
            const cfg = STATUS_MAP[course.status] || STATUS_MAP.draft

            return (
              <button
                key={course.id}
                type="button"
                className={`admin-course-option${isActive ? ' active' : ''}`}
                onClick={() => {
                  onSelect?.(course.id)
                  setOpen(false)
                }}
              >
                <span className="admin-course-dot" style={{ background: course.themeColor }} />
                <span className="admin-course-option-name">{course.name}</span>
                <span className={`admin-course-status admin-course-status-${cfg.tone}`}>{cfg.label}</span>
                {isActive ? <AppIcon name="check" size={14} className="admin-course-check" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default CourseSelector
