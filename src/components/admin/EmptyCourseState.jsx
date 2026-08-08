/**
 * EmptyCourseState
 * Empty state displayed when a Course contains no Subjects.
 */
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'

function EmptyCourseState({ courseName }) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon">
        <AppIcon name="adminDashboard" size={32} />
      </div>
      <h3 className="admin-empty-title">
        {courseName ? `No subjects have been created for "${courseName}" yet.` : 'No subjects have been created for this Course yet.'}
      </h3>
      <p className="admin-empty-subtitle">
        Start building this course by adding your first subject.
      </p>
      <div className="admin-empty-actions">
        <Button variant="primary" onClick={() => window.location.hash = '#admin/courses'}>
          <AppIcon name="add" size={16} />
          Create Subject
        </Button>
        <Button variant="secondary" onClick={() => window.location.hash = '#admin/courses'}>
          <AppIcon name="folder" size={16} />
          Manage Courses
        </Button>
      </div>
    </div>
  )
}

export default EmptyCourseState
