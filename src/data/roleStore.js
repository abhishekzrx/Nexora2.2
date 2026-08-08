/**
 * roleStore
 * Role-based workspace management for Nexora.
 *
 * Supported roles:
 * - student: Default learning workspace
 * - admin: CMS / Course Control Center
 *
 * Future-ready for:
 * - teacher
 * - moderator
 * - superAdmin
 *
 * Role switching is ONLY allowed from the Student Dashboard.
 * Admin Panel has NO role switching.
 */

import { useSyncExternalStore } from 'react'

let listeners = []
let version = 0

const ROLES = ['student', 'admin', 'teacher', 'moderator', 'superAdmin']

let activeRole = 'student'

function emit() {
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot() {
  return version
}

export function useRoleStore() {
  useSyncExternalStore(subscribe, getSnapshot)
  return {
    activeRole,
    isStudent: activeRole === 'student',
    isAdmin: activeRole === 'admin',
    isTeacher: activeRole === 'teacher',
    isModerator: activeRole === 'moderator',
    isSuperAdmin: activeRole === 'superAdmin',
    roles: ROLES,
  }
}

export function getActiveRole() {
  return activeRole
}

export function setActiveRole(role) {
  if (!ROLES.includes(role)) return
  activeRole = role
  emit()
}

export function switchToStudent() {
  activeRole = 'student'
  emit()
}

export function switchToAdmin() {
  activeRole = 'admin'
  emit()
}

export { ROLES }
