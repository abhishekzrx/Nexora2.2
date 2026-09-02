/**
 * userService.js
 * Persistent student/user identity management.
 * Guarantees stable internal UUID anchoring per member session across refreshes.
 */

const USER_ID_KEY = 'nexora_user_id'
const MEMBER_PROFILE_KEY = 'nexora_active_member_profile'
const VIEW_AS_KEY = 'nexora_view_as_member_profile'

export function getUserId() {
  if (typeof window === 'undefined') return 'usr_super_admin_alpha'

  try {
    // If viewing as member, use that member's ID for query scoping
    const viewAsRaw = localStorage.getItem(VIEW_AS_KEY)
    if (viewAsRaw) {
      const viewAs = JSON.parse(viewAsRaw)
      if (viewAs && viewAs.id) return viewAs.id
    }

    const profileRaw = localStorage.getItem(MEMBER_PROFILE_KEY)
    if (profileRaw) {
      const profile = JSON.parse(profileRaw)
      if (profile && profile.id) return profile.id
    }

    let id = localStorage.getItem(USER_ID_KEY)
    if (id && typeof id === 'string' && id.trim()) {
      return id
    }

    // Default fallback to Super Admin
    id = 'usr_super_admin_alpha'
    localStorage.setItem(USER_ID_KEY, id)
    return id
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[userService] localStorage access failed:', err)
    }
    return 'usr_super_admin_alpha'
  }
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MEMBER_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Alias for backwards compatibility with existing imports
export const getCurrentUserId = getUserId
