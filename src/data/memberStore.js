/**
 * memberStore.js
 * Reactive External Store for Active User Profile, Member Directory, and "View as Member" Mode.
 */

import { useSyncExternalStore } from 'react'
import { memberService, SEED_MEMBERS } from '../services/memberService.js'

let listeners = []
let version = 0

const CURRENT_USER_KEY = 'nexora_active_member_profile'
const VIEW_AS_KEY = 'nexora_view_as_member_profile'

function loadSavedMember() {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.id) return parsed
    }
  } catch {
    // ignore
  }
  return SEED_MEMBERS[0] // Default to adminalpha
}

function loadSavedViewAs() {
  try {
    const saved = localStorage.getItem(VIEW_AS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.id) return parsed
    }
  } catch {
    // ignore
  }
  return null
}

let activeMember = loadSavedMember()
let viewAsMember = loadSavedViewAs()
let membersList = [...SEED_MEMBERS]
let isHydrated = false

let snapshot = {
  activeMember,
  effectiveMember: viewAsMember || activeMember,
  isViewingAs: Boolean(viewAsMember),
  viewAsMember,
  membersList,
  isSuperAdmin: activeMember?.role === 'SUPER_ADMIN',
  isHydrated,
  version: 0,
}

function emit() {
  snapshot = {
    activeMember,
    effectiveMember: viewAsMember || activeMember,
    isViewingAs: Boolean(viewAsMember),
    viewAsMember,
    membersList: [...membersList],
    isSuperAdmin: activeMember?.role === 'SUPER_ADMIN',
    isHydrated,
    version,
  }
  version += 1
  listeners.forEach((l) => l())
}

export function subscribeMemberStore(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getMemberStoreSnapshot() {
  return snapshot
}

export async function hydrateMemberStore() {
  try {
    const res = await memberService.getAllMembers()
    if (res && res.success && Array.isArray(res.data)) {
      membersList = res.data

      // Keep activeMember refreshed
      const currentId = activeMember?.id
      const found = membersList.find((m) => m.id === currentId)
      if (found) {
        activeMember = found
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found))
      }

      if (viewAsMember) {
        const foundView = membersList.find((m) => m.id === viewAsMember.id)
        if (foundView) {
          viewAsMember = foundView
          localStorage.setItem(VIEW_AS_KEY, JSON.stringify(foundView))
        }
      }

      isHydrated = true
      emit()
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[memberStore] Hydration error:', err)
    }
  }
}

export function setActiveMember(member) {
  if (!member) return
  activeMember = member
  viewAsMember = null
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(member))
    localStorage.removeItem(VIEW_AS_KEY)
    localStorage.setItem('nexora_user_id', member.id)
    localStorage.setItem('nexora_is_authenticated', 'true')
  } catch {
    // ignore
  }
  emit()
}

export function setViewAsMember(member) {
  if (activeMember?.role !== 'SUPER_ADMIN') return // Only Super Admin can enter view as member
  viewAsMember = member
  try {
    localStorage.setItem(VIEW_AS_KEY, JSON.stringify(member))
  } catch {
    // ignore
  }
  emit()
}

export function exitViewAsMember() {
  viewAsMember = null
  try {
    localStorage.removeItem(VIEW_AS_KEY)
  } catch {
    // ignore
  }
  emit()
}

export function clearMemberSession() {
  activeMember = null
  viewAsMember = null
  try {
    localStorage.removeItem(CURRENT_USER_KEY)
    localStorage.removeItem(VIEW_AS_KEY)
    localStorage.removeItem('nexora_user_id')
    localStorage.removeItem('nexora_is_authenticated')
  } catch {
    // ignore
  }
  emit()
}

export function useMemberStore() {
  return useSyncExternalStore(subscribeMemberStore, getMemberStoreSnapshot, getMemberStoreSnapshot)
}

// Hydrate directory in browser
if (typeof window !== 'undefined') {
  hydrateMemberStore().catch(() => {})
}
