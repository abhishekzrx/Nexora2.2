/**
 * trendService.js
 * Historical snapshot management & trend analysis for Chapter, Subject, and Course performance.
 * 
 * Rules:
 * - Persists real historical data points; does NOT fabricate fake trends.
 * - Supports timeframe filters (7 Days, 30 Days, All Time).
 * - Computes delta and trend direction (↑ Improving, → Stable, ↓ Declining).
 */

import { PERFORMANCE_THRESHOLDS, METRIC_TYPES } from '../config/performanceConfig.js'
import { getUserId } from './userService.js'

const CHAPTER_SNAPSHOT_PREFIX = 'nexora_perf_snap_ch_'
const SUBJECT_SNAPSHOT_PREFIX = 'nexora_perf_snap_sub_'
const MAX_SNAPSHOT_HISTORY = 100 // retain up to 100 chronological snapshots per entity

function getScopedSnapshotKey(prefix, entityId) {
  const userId = getUserId()
  return `${prefix}${userId || 'anon'}_${entityId}`
}

function getLegacySnapshotKey(prefix, entityId) {
  return `${prefix}${entityId}`
}

function readScopedSnapshots(prefix, entityId) {
  const scopedKey = getScopedSnapshotKey(prefix, entityId)
  const scopedSnapshots = getStorageSafe(scopedKey)
  if (scopedSnapshots.length > 0) {
    return scopedSnapshots
  }

  return getStorageSafe(getLegacySnapshotKey(prefix, entityId))
}

function getStorageSafe(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setStorageSafe(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/**
 * Filter snapshots by timeframe ('7d', '30d', 'all')
 */
export function filterSnapshotsByTimeframe(snapshots = [], timeframe = 'all') {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return []
  if (timeframe === 'all') return snapshots

  const now = Date.now()
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const cutoff = now - days * 24 * 60 * 60 * 1000

  const filtered = snapshots.filter((s) => (s.timestamp || 0) >= cutoff)
  return filtered.length > 0 ? filtered : snapshots.slice(-1)
}

/**
 * Record a historical performance snapshot for a Chapter
 */
export function recordChapterSnapshot(chapterId, metrics = {}) {
  if (!chapterId) return null
  const key = getScopedSnapshotKey(CHAPTER_SNAPSHOT_PREFIX, chapterId)
  const existing = getStorageSafe(key)

  const now = Date.now()
  const newSnapshot = {
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    readiness: Math.round(metrics.readinessScore || metrics.readiness || 0),
    accuracy: Math.round(metrics.accuracyPercentage || metrics.accuracy || 0),
    coverage: Math.round(metrics.coveragePercent || metrics.coverage || 0),
    mastery: Math.round(metrics.masteryPercentage || metrics.mastery || 0),
    attemptedMcqs: metrics.attemptedMcqs || 0,
    totalMcqs: metrics.totalMcqs || 0,
  }

  // De-duplicate if an identical snapshot was recorded in the last 60 seconds
  const last = existing[existing.length - 1]
  if (last && now - last.timestamp < 60000 && last.readiness === newSnapshot.readiness) {
    existing[existing.length - 1] = newSnapshot
  } else {
    existing.push(newSnapshot)
  }

  if (existing.length > MAX_SNAPSHOT_HISTORY) {
    existing.shift()
  }

  setStorageSafe(key, existing)
  return newSnapshot
}

/**
 * Record a historical performance snapshot for a Subject
 */
export function recordSubjectSnapshot(subjectId, metrics = {}) {
  if (!subjectId) return null
  const key = getScopedSnapshotKey(SUBJECT_SNAPSHOT_PREFIX, subjectId)
  const existing = getStorageSafe(key)

  const now = Date.now()
  const newSnapshot = {
    timestamp: now,
    date: new Date(now).toISOString().split('T')[0],
    readiness: Math.round(metrics.subjectReadinessScore || metrics.readinessScore || metrics.readiness || 0),
    accuracy: Math.round(metrics.subjectAccuracyPercentage || metrics.accuracyPercent || metrics.accuracy || 0),
    coverage: Math.round(metrics.subjectCoveragePercent || metrics.coveragePercent || metrics.coverage || 0),
    mastery: Math.round(metrics.subjectMasteryPercentage || metrics.masteryPercent || metrics.mastery || 0),
    attemptedMcqs: metrics.subjectAttemptedMcqs || metrics.attemptedMcqs || 0,
    totalMcqs: metrics.subjectTotalMcqs || metrics.totalMcqs || 0,
  }

  const last = existing[existing.length - 1]
  if (last && now - last.timestamp < 60000 && last.readiness === newSnapshot.readiness) {
    existing[existing.length - 1] = newSnapshot
  } else {
    existing.push(newSnapshot)
  }

  if (existing.length > MAX_SNAPSHOT_HISTORY) {
    existing.shift()
  }

  setStorageSafe(key, existing)
  return newSnapshot
}

/**
 * Retrieve snapshots for a chapter
 */
export function getChapterSnapshots(chapterId, timeframe = 'all') {
  if (!chapterId) return []
  const all = readScopedSnapshots(CHAPTER_SNAPSHOT_PREFIX, chapterId)
  return filterSnapshotsByTimeframe(all, timeframe)
}

/**
 * Retrieve snapshots for a subject
 */
export function getSubjectSnapshots(subjectId, timeframe = 'all') {
  if (!subjectId) return []
  const all = readScopedSnapshots(SUBJECT_SNAPSHOT_PREFIX, subjectId)
  return filterSnapshotsByTimeframe(all, timeframe)
}

/**
 * Calculate trend direction and delta between the oldest baseline and newest snapshot
 * Returns: { direction: 'improving' | 'stable' | 'declining', delta: number, symbol: '↑' | '→' | '↓', label: string }
 */
export function calculateTrendDirection(snapshots = [], metricKey = METRIC_TYPES.READINESS) {
  if (!Array.isArray(snapshots) || snapshots.length < PERFORMANCE_THRESHOLDS.trend.minDataPoints) {
    return {
      direction: 'stable',
      delta: 0,
      symbol: '→',
      label: 'Stable',
      hasHistory: false,
    }
  }

  const values = snapshots.map((s) => Number(s[metricKey] || 0)).filter((v) => !isNaN(v))
  if (values.length < 2) {
    return {
      direction: 'stable',
      delta: 0,
      symbol: '→',
      label: 'Stable',
      hasHistory: false,
    }
  }

  const first = values[0]
  const last = values[values.length - 1]
  const delta = Math.round((last - first) * 10) / 10
  const threshold = PERFORMANCE_THRESHOLDS.trend.stableThresholdDelta

  if (delta > threshold) {
    return {
      direction: 'improving',
      delta: Math.abs(delta),
      symbol: '↑',
      label: `${Math.abs(delta)}% Improving`,
      hasHistory: true,
    }
  }

  if (delta < -threshold) {
    return {
      direction: 'declining',
      delta: Math.abs(delta),
      symbol: '↓',
      label: `${Math.abs(delta)}% Declining`,
      hasHistory: true,
    }
  }

  return {
    direction: 'stable',
    delta: Math.abs(delta),
    symbol: '→',
    label: delta === 0 ? 'Stable' : `${Math.abs(delta)}% Stable`,
    hasHistory: true,
  }
}

export default {
  recordChapterSnapshot,
  recordSubjectSnapshot,
  getChapterSnapshots,
  getSubjectSnapshots,
  filterSnapshotsByTimeframe,
  calculateTrendDirection,
}
