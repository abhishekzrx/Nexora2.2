/**
 * RoleSwitch
 * Role switching component — ONLY visible on Student Dashboard.
 * Admin users can switch to Admin Panel.
 * Students never see the Admin option.
 */

import AppIcon from '../ui/AppIcon'
import { useRoleStore, switchToAdmin, switchToStudent } from '../../data/roleStore'

function RoleSwitch({ onSwitchToAdmin, onSwitchToStudent }) {
  const { isAdmin } = useRoleStore()

  if (isAdmin) {
    return (
      <button type="button" className="role-switch-btn" onClick={() => { switchToStudent(); onSwitchToStudent?.() }}>
        <AppIcon name="adminDashboard" size={16} />
        Back to Student Dashboard
      </button>
    )
  }

  return (
    <button type="button" className="role-switch-btn role-switch-admin" onClick={() => { switchToAdmin(); onSwitchToAdmin?.() }}>
      <AppIcon name="adminDashboard" size={16} />
      Switch to Admin Panel
    </button>
  )
}

export default RoleSwitch
