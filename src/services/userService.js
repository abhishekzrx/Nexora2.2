/**
 * userService.js
 * Persistent student/user identity management.
 * Guarantees a stable user_id per browser/student session across refreshes.
 */

const USER_ID_KEY = 'nexora_user_id'

export function getCurrentUserId() {
  if (typeof window === 'undefined') return 'usr_default_student'

  try {
    let id = localStorage.getItem(USER_ID_KEY)
    if (!id || typeof id !== 'string' || !id.trim()) {
      const randomSegment = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
      id = `usr_${randomSegment}`
      localStorage.setItem(USER_ID_KEY, id)
    }
    return id
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[userService] localStorage access failed, using session fallback ID:', err)
    }
    return 'usr_session_fallback'
  }
}
