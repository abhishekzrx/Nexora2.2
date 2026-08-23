/**
 * progressStore.js
 * Reactive user progress store for student MCQ attempt data.
 * Manages caching and reactive subscriptions for mcq_progress records.
 */

import { useSyncExternalStore } from 'react'
import { mcqService } from '../services/mcqService.js'
import { getUserId } from '../services/userService.js'

let listeners = []
let version = 0

let progressList = []
let progressMap = new Map() // mcq_id -> progress object
let isHydrated = false
let hydrationPromise = null

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

export async function hydrateUserProgressFromSupabase(force = false) {
  if (hydrationPromise && !force) return hydrationPromise

  const userId = getUserId()
  if (!userId) return { success: true, data: [] }

  hydrationPromise = (async () => {
    try {
      const res = await mcqService.getAllUserProgress(userId)
      if (res && res.success && Array.isArray(res.data)) {
        progressList = res.data
        progressMap = new Map()
        res.data.forEach((item) => {
          const mcqId = item.mcq_id || item.mcqId
          if (mcqId) {
            progressMap.set(String(mcqId), item)
          }
        })
        isHydrated = true
        emit()
        return { success: true, data: res.data }
      }
      return { success: false, error: res?.error || 'Failed to load user progress' }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      hydrationPromise = null
    }
  })()

  return hydrationPromise
}

export function updateUserProgressStore(records) {
  if (!Array.isArray(records) || records.length === 0) return

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
