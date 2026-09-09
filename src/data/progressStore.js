/**
 * progressStore.js
 * Reactive user progress store for student MCQ attempt data.
 * Manages user-scoped caching and reactive subscriptions for mcq_progress records.
 */

import { useSyncExternalStore } from 'react'
import { mcqService } from '../services/mcqService.js'
import { getUserId } from '../services/userService.js'

let listeners = []
let version = 0

let activeScopedUserId = null
let progressList = []
let progressMap = new Map() // mcq_id -> progress object
let isHydrated = false
let hydrationPromise = null
let currentRequestId = 0

function getScopedProgressKey(userId) {
  return `nexora_progress_${userId || 'anon'}`
}

function loadLocalUserProgress(userId) {
  if (!userId || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(getScopedProgressKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveLocalUserProgress(userId, records) {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(getScopedProgressKey(userId), JSON.stringify(records))
  } catch {
    // ignore
  }
}

let snapshot = {
  progressList: [],
  progressMap: new Map(),
  isHydrated: false,
  version: 0,
}

function emit() {
  snapshot = {
    progressList: [...progressList],
    progressMap: new Map(progressMap),
    isHydrated,
    version,
  }
  version += 1
  listeners.forEach((l) => l())
}

export function subscribeUserProgress(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getUserProgressSnapshot() {
  return snapshot
}

export function clearUserProgressStore() {
  progressList = []
  progressMap = new Map()
  isHydrated = false
  activeScopedUserId = null
  hydrationPromise = null
  emit()
}

export async function hydrateUserProgressFromSupabase(targetUserId = undefined, force = false) {
  const userId = targetUserId !== undefined ? targetUserId : getUserId()
  if (!userId) {
    clearUserProgressStore()
    return { success: true, data: [] }
  }

  // If user changed, clear previous user's cached progress immediately
  if (activeScopedUserId !== userId) {
    activeScopedUserId = userId
    // Seed immediately from user's local cache
    const local = loadLocalUserProgress(userId)
    progressList = local
    progressMap = new Map()
    local.forEach((item) => {
      const mcqId = item.mcq_id || item.mcqId
      if (mcqId) progressMap.set(String(mcqId), item)
    })
    isHydrated = local.length > 0
    emit()
  }

  const requestId = ++currentRequestId

  if (hydrationPromise && !force) return hydrationPromise

  hydrationPromise = (async () => {
    try {
      const res = await mcqService.getAllUserProgress(userId)
      // Check if user changed or request is stale
      if (requestId !== currentRequestId || activeScopedUserId !== userId) {
        return { success: false, stale: true }
      }

      if (res && res.success && Array.isArray(res.data)) {
        progressList = res.data
        progressMap = new Map()
        res.data.forEach((item) => {
          const mcqId = item.mcq_id || item.mcqId
          if (mcqId) {
            progressMap.set(String(mcqId), item)
          }
        })
        saveLocalUserProgress(userId, res.data)
        isHydrated = true
        emit()
        return { success: true, data: res.data }
      }
      return { success: false, error: res?.error || 'Failed to load user progress' }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      if (requestId === currentRequestId) {
        hydrationPromise = null
      }
    }
  })()

  return hydrationPromise
}

export function updateUserProgressStore(records) {
  if (!Array.isArray(records) || records.length === 0) return

  const uid = activeScopedUserId || getUserId() || 'anon'
  if (!activeScopedUserId && uid && uid !== 'anon') {
    activeScopedUserId = uid
  }

  const updatedMap = new Map(progressMap)
  records.forEach((rec) => {
    const mcqId = rec.mcq_id || rec.mcqId
    if (mcqId) {
      const existing = updatedMap.get(String(mcqId)) || {}
      updatedMap.set(String(mcqId), { ...existing, ...rec })
    }
  })

  progressMap = updatedMap
  progressList = Array.from(progressMap.values())
  isHydrated = true

  saveLocalUserProgress(uid, progressList)
  emit()
}

export function resetChapterProgressInStore(chapterId) {
  if (!chapterId) return
  const strId = String(chapterId)
  const updatedMap = new Map()
  progressMap.forEach((val, key) => {
    const recChapId = String(val.chapter_id || val.chapterId || '')
    if (recChapId !== strId) {
      updatedMap.set(key, val)
    }
  })
  progressMap = updatedMap
  progressList = Array.from(progressMap.values())
  emit()
}

export function resetSubjectProgressInStore(subjectId, chapterIds = []) {
  if (!subjectId && chapterIds.length === 0) return
  const strSubId = String(subjectId || '')
  const chapIdSet = new Set(chapterIds.map((id) => String(id)))

  const updatedMap = new Map()
  progressMap.forEach((val, key) => {
    const recSubId = String(val.subject_id || val.subjectId || '')
    const recChapId = String(val.chapter_id || val.chapterId || '')
    if (recSubId !== strSubId && !chapIdSet.has(recChapId)) {
      updatedMap.set(key, val)
    }
  })
  progressMap = updatedMap
  progressList = Array.from(progressMap.values())
  emit()
}

export function useUserProgressStore() {
  return useSyncExternalStore(subscribeUserProgress, getUserProgressSnapshot, getUserProgressSnapshot)
}

// Auto-hydrate on initial module import if in browser environment
if (typeof window !== 'undefined') {
  hydrateUserProgressFromSupabase().catch(() => {})
}
