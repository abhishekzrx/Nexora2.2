/**
 * RoleSwitch
 * Role switching component — ONLY visible to Super Admin (adminalpha).
 * Normal student members NEVER see this switcher.
 */

import AppIcon from '../ui/AppIcon'
import { useRoleStore, switchToAdmin, switchToStudent } from '../../data/roleStore'
import { useMemberStore } from '../../data/memberStore'

function RoleSwitch({ onSwitchToAdmin, onSwitchToStudent }) {
  const { isAdmin } = useRoleStore()
  const { isSuperAdmin, isViewingAs } = useMemberStore()

  // Layer 1 Security: Only adminalpha / Super Admin can see role switch
  if (!isSuperAdmin || isViewingAs) {
    return null
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        className="role-switch-btn"
        onClick={() => {
          switchToStudent()
          onSwitchToStudent?.()
        }}
      >
        <AppIcon name="adminDashboard" size={16} />
        Back to Student Dashboard
      </button>
    )
  }

  return (
    <button
      type="button"
      className="role-switch-btn role-switch-admin"
      onClick={() => {
        switchToAdmin()
        onSwitchToAdmin?.()
      }}
    >
      <AppIcon name="adminDashboard" size={16} />
      Switch to Admin Panel
    </button>
  )
}

export default RoleSwitch
