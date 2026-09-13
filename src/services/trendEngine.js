/**
 * trendEngine.js
 * Advanced Multi-Window Historical Trend, Exponential Smoothing & Learning Momentum Engine.
 *
 * Implements Phase 2 Requirements:
 * 1. 7-Day vs Previous 7-Day, 30-Day, and 50–60-Day historical analysis.
 * 2. Trend Smoothing (prevents 1 volatile session from skewing long-term direction).
 * 3. Learning Momentum Calculation (STRONG, STABLE, SLOWING, DECLINING).
 * 4. Weakness Trend Tracking (IMPROVING, STABLE, WORSENING).
 */

import { TREND_CONFIG } from '../config/analyticsConfig.js'

/**
 * Applies Exponential Moving Average (EMA) smoothing over a series of chronological values.
 */
export function applyExponentialSmoothing(values = [], alpha = TREND_CONFIG.smoothingAlpha) {
  if (!Array.isArray(values) || values.length === 0) return []
  if (values.length === 1) return [values[0]]

  const smoothed = [values[0]]
  for (let i = 1; i < values.length; i++) {
    const val = alpha * values[i] + (1 - alpha) * smoothed[i - 1]
    smoothed.push(Math.round(val * 10) / 10)
  }
  return smoothed
}

/**
 * Calculates rolling window averages for comparative trend analysis.
 */
export function calculateWindowComparison(snapshots = [], metricKey = 'readiness') {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      currentWindowAvg: 0,
      previousWindowAvg: 0,
      delta: 0,
      percentChange: 0,
      direction: 'STABLE',
      symbol: '→',
      hasSufficientData: false,
    }
  }

  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000

  const currentWindowSnapshots = snapshots.filter((s) => (s.timestamp || 0) >= now - sevenDaysMs)
  const previousWindowSnapshots = snapshots.filter((s) => {
    const ts = s.timestamp || 0
    return ts >= now - fourteenDaysMs && ts < now - sevenDaysMs
  })

  const getAvg = (list) => {
    if (!list || list.length === 0) return null
    const sum = list.reduce((acc, s) => acc + (Number(s[metricKey] ?? s.readiness ?? s.accuracy ?? 0)), 0)
    return sum / list.length
  }

  const currentAvg = getAvg(currentWindowSnapshots)
  const previousAvg = getAvg(previousWindowSnapshots)

  // Fallback if sparse data
  const effectiveCurrent = currentAvg ?? Number(snapshots[snapshots.length - 1]?.[metricKey] ?? 0)
  const effectivePrevious = previousAvg ?? (snapshots.length > 1 ? Number(snapshots[0]?.[metricKey] ?? 0) : effectiveCurrent)

  const delta = Math.round((effectiveCurrent - effectivePrevious) * 10) / 10
  const percentChange = effectivePrevious > 0 ? Math.round((delta / effectivePrevious) * 100) : 0

  let direction = 'STABLE'
  let symbol = '→'

  if (delta >= TREND_CONFIG.momentumThresholds.moderateGrowthDelta) {
    direction = 'IMPROVING'
    symbol = '↑'
  } else if (delta <= TREND_CONFIG.momentumThresholds.declineDelta) {
    direction = 'DECLINING'
    symbol = '↓'
  }

  return {
    currentWindowAvg: Math.round(effectiveCurrent),
    previousWindowAvg: Math.round(effectivePrevious),
    delta,
    percentChange,
    direction,
    symbol,
    hasSufficientData: snapshots.length >= 2,
  }
}

/**
 * Computes Learning Momentum signal (STRONG, STABLE, SLOWING, DECLINING).
 */
export function calculateLearningMomentum({
  trendDelta = 0,
  recentSessionsCount = 0,
  consistencyScore = 70,
  coverageGrowth = 0,
  weaknessReduction = 0,
}) {
  let score = 50 // baseline

  score += trendDelta * 4
  score += Math.min(20, recentSessionsCount * 4)
  score += (consistencyScore - 50) * 0.3
  score += Math.min(15, coverageGrowth * 2)
  score += Math.min(15, weaknessReduction * 3)

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)))

  if (trendDelta >= TREND_CONFIG.momentumThresholds.strongGrowthDelta || boundedScore >= 75) {
    return {
      momentum: 'STRONG',
      label: 'Strong Momentum',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      score: boundedScore,
      description: 'Accelerating preparation with steady score gains and active practice.',
    }
  }

  if (trendDelta <= TREND_CONFIG.momentumThresholds.declineDelta || boundedScore <= 35) {
    return {
      momentum: 'DECLINING',
      label: 'Declining',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      score: boundedScore,
      description: 'Recent performance or activity has dipped. Quick revision recommended.',
    }
  }

  if (recentSessionsCount < 2) {
    return {
      momentum: 'SLOWING',
      label: 'Slowing',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      score: boundedScore,
      description: 'Practice frequency has slowed down. Maintain regular sessions.',
    }
  }

  return {
    momentum: 'STABLE',
    label: 'Steady Progress',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    score: boundedScore,
    description: 'Consistent learning pace with balanced error recovery.',
  }
}

/**
 * Tracks Weakness Count Trend (IMPROVING, STABLE, WORSENING).
 */
export function calculateWeaknessTrend(historicalWeakCounts = []) {
  if (!Array.isArray(historicalWeakCounts) || historicalWeakCounts.length < 2) {
    return {
      trend: 'STABLE',
      label: 'Weakness Trend: Stable',
      delta: 0,
      color: '#94A3B8',
    }
  }

  const initial = Number(historicalWeakCounts[0] || 0)
  const current = Number(historicalWeakCounts[historicalWeakCounts.length - 1] || 0)
  const delta = current - initial // negative delta means fewer weaknesses (good!)

  if (delta < 0) {
    return {
      trend: 'IMPROVING',
      label: 'Weakness Trend: Improving',
      delta: Math.abs(delta),
      description: `Reduced weak concepts from ${initial} down to ${current}.`,
      color: '#10B981',
    }
  }

  if (delta > 0) {
    return {
      trend: 'WORSENING',
      label: 'Weakness Trend: Needs Attention',
      delta,
      description: `Weak concepts increased from ${initial} to ${current}.`,
      color: '#EF4444',
    }
  }

  return {
    trend: 'STABLE',
    label: 'Weakness Trend: Stable',
    delta: 0,
    description: `Weak concept count steady at ${current}.`,
    color: '#3B82F6',
  }
}

export default {
  applyExponentialSmoothing,
  calculateWindowComparison,
  calculateLearningMomentum,
  calculateWeaknessTrend,
}
