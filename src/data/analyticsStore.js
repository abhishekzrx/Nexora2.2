/**
 * analyticsStore.js
 * Reactive store for persistent user course analytics and historical performance graphs.
 */

import { useSyncExternalStore } from 'react'
import { userAnalyticsService } from '../services/userAnalyticsService.js'
import { getUserProgressSnapshot } from './progressStore.js'

let listeners = []
let version = 0

let analyticsCache = new Map() // `${userId}_${courseId}` -> analytics object
let isHydrating = false

let snapshot = {
  analyticsCache: new Map(),
  version: 0,
}

function emit() {
  snapshot = {
    analyticsCache: new Map(analyticsCache),
    version,
  }
  version += 1
  listeners.forEach((l) => l())
}

export function subscribeAnalyticsStore(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getAnalyticsStoreSnapshot() {
  return snapshot
}

function getScopedAnalyticsKey(userId, courseId) {
  return `nexora_analytics_${userId || 'anon'}_${courseId || 'default'}`
}

function loadLocalAnalytics(userId, courseId) {
  if (!userId || !courseId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(getScopedAnalyticsKey(userId, courseId))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function saveLocalAnalytics(userId, courseId, data) {
  if (!userId || !courseId || !data || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(getScopedAnalyticsKey(userId, courseId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export async function hydrateUserAnalytics(userId, courseId, totalPool = 0) {
  if (!userId || !courseId) return null

  const cacheKey = `${userId}_${courseId}`

  // CLOUD-FIRST: Do NOT seed from local cache to avoid stale reads
  // Local cache is written AFTER successful cloud hydration

  try {
    const progressSnapshot = getUserProgressSnapshot()
    const progressList = progressSnapshot.progressList || []

    const analytics = await userAnalyticsService.computeCourseAnalytics(
      userId,
      courseId,
      progressList,
      totalPool
    )

    if (analytics) {
      analyticsCache.set(cacheKey, analytics)
      saveLocalAnalytics(userId, courseId, analytics)
      emit()
      return analytics
    }
    return null
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[analyticsStore] Calculation error:', err)
    }
    return null
  }
}

export function getCachedCourseAnalytics(userId, courseId) {
  const cacheKey = `${userId}_${courseId}`
  return analyticsCache.get(cacheKey) || loadLocalAnalytics(userId, courseId) || null
}

export function clearAnalyticsStore() {
  analyticsCache.clear()
  emit()
}

export function useUserAnalytics(userId, courseId, totalPool = 0) {
  const store = useSyncExternalStore(subscribeAnalyticsStore, getAnalyticsStoreSnapshot, getAnalyticsStoreSnapshot)
  const cacheKey = `${userId}_${courseId}`
  const cached = store.analyticsCache.get(cacheKey)

  if (cached) {
    return cached
  }

  return {
    readinessScore: 0,
    accuracy: 0,
    coverage: 0,
    mastery: 0,
    totalAttemptsCount: 0,
    totalQuestionsAttempted: 0,
    masteredCount: 0,
    incorrectCount: 0,
    practicedCount: 0,
    totalPool: totalPool || 50,
    strongAreas: ['Foundations'],
    weakAreas: ['Advanced Topics'],
    trendHistory: [],
    lastActiveAt: null,
  }
}
