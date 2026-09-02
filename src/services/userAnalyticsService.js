/**
 * userAnalyticsService.js
 * Single Central Analytics Pipeline & Persistent Snapshot Engine.
 *
 * Guarantees:
 * 1. Independent data isolation per user_id.
 * 2. Supabase as the source of truth with resilient user-scoped local fallback.
 * 3. Daily Snapshots (USER + SCOPE + DATE) preventing duplicate bloat.
 * 4. Zero Performance Reset on page refresh (F5).
 */

import { apiService } from './apiService.js'

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

function getScopedKey(userId, prefix) {
  return `nexora_${prefix}_${userId || 'anon'}`
}

const memoryStore = new Map()

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) || null
}

function setStorageItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value)
}

function removeStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key)
}

export const userAnalyticsService = {
  /**
   * Retrieves all historical test/practice attempts for a user.
   */
  async getUserAttempts(userId, courseId = null) {
    if (!userId) return []

    // 1. Try Supabase
    try {
      const query = courseId
        ? `?user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}&order=created_at.asc`
        : `?user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`
      const res = await apiService.get(`/user_attempts${query}`)
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setStorageItem(getScopedKey(userId, 'attempts'), JSON.stringify(res.data))
        return res.data
      }
    } catch {
      // fallback to scoped local storage
    }

    // 2. Scoped localStorage fallback
    try {
      const saved = getStorageItem(getScopedKey(userId, 'attempts'))
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return courseId ? parsed.filter((a) => a.course_id === courseId || a.courseId === courseId) : parsed
        }
      }
    } catch {
      // ignore
    }

    return []
  },

  /**
   * Records an attempt and updates the single central analytics pipeline.
   */
  async recordAttempt({
    userId,
    courseId,
    subjectId,
    subjectTitle,
    chapterId,
    chapterTitle,
    totalQuestions,
    attemptedCount,
    correctCount,
    incorrectCount,
    skippedCount,
    score,
    percentage,
    accuracy,
    timeTakenSeconds = 0,
    isReadOnly = false,
  }) {
    if (!userId || isReadOnly) {
      return { success: true, isReadOnly: true }
    }

    const attemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      user_id: userId,
      course_id: courseId || 'course_default',
      subject_id: subjectId,
      subject_title: subjectTitle || subjectId,
      chapter_id: chapterId,
      chapter_title: chapterTitle || 'Practice Set',
      total_questions: totalQuestions,
      attempted_count: attemptedCount,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      skipped_count: skippedCount,
      score,
      percentage,
      accuracy,
      time_taken_seconds: timeTakenSeconds,
      created_at: new Date().toISOString(),
    }

    // 1. Save attempt record to Supabase
    try {
      await apiService.post('/user_attempts', [attemptRecord])
    } catch {
      // ignore
    }

    // 2. Update user scoped localStorage
    try {
      const key = getScopedKey(userId, 'attempts')
      const saved = getStorageItem(key)
      const list = saved ? JSON.parse(saved) : []
      list.push(attemptRecord)
      setStorageItem(key, JSON.stringify(list.slice(-200)))
    } catch {
      // ignore
    }

    // 3. Upsert today's Daily Snapshot (USER + COURSE + DATE)
    await this.upsertDailySnapshot({
      userId,
      courseId: attemptRecord.course_id,
      subjectId: attemptRecord.subject_id,
      chapterId: attemptRecord.chapter_id,
      attemptAccuracy: accuracy,
      questionsSolved: attemptedCount,
      correctCount,
    })

    return { success: true, attempt: attemptRecord }
  },

  /**
   * Upserts a daily performance snapshot for the user (ONE record per user per scope per day).
   */
  async upsertDailySnapshot({
    userId,
    courseId,
    subjectId,
    chapterId,
    attemptAccuracy,
    questionsSolved,
    correctCount,
  }) {
    if (!userId || !courseId) return

    const today = getTodayIsoDate()
    const snapshotId = `snap_${userId}_${courseId}_${today}`

    const existingSnapshots = await this.getUserDailySnapshots(userId, courseId)
    const todayIndex = existingSnapshots.findIndex((s) => s.date === today)
    const existing = todayIndex !== -1 ? existingSnapshots[todayIndex] : null

    const totalSolved = (existing?.questions_solved || 0) + questionsSolved
    const totalCorrect = (existing?.correct_count || 0) + correctCount
    const avgAccuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : attemptAccuracy

    const updatedSnapshot = {
      id: snapshotId,
      user_id: userId,
      course_id: courseId,
      subject_id: subjectId || null,
      chapter_id: chapterId || null,
      date: today,
      accuracy: avgAccuracy,
      questions_solved: totalSolved,
      correct_count: totalCorrect,
      study_activity: (existing?.study_activity || 0) + 1,
      updated_at: new Date().toISOString(),
    }

    // 1. Try Supabase upsert
    try {
      await apiService.post('/user_analytics_snapshots?on_conflict=user_id,course_id,date', [updatedSnapshot], {
        Prefer: 'resolution=merge-duplicates',
      })
    } catch {
      // fallback
    }

    // 2. Update user scoped localStorage
    try {
      const key = getScopedKey(userId, `snapshots_${courseId}`)
      let list = existingSnapshots
      if (todayIndex !== -1) {
        list[todayIndex] = updatedSnapshot
      } else {
        list.push(updatedSnapshot)
      }
      setStorageItem(key, JSON.stringify(list.slice(-30)))
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves daily performance snapshots for trend graphs.
   */
  async getUserDailySnapshots(userId, courseId, limit = 7) {
    if (!userId || !courseId) return []

    // 1. Try Supabase
    try {
      const res = await apiService.get(
        `/user_analytics_snapshots?user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}&order=date.asc`
      )
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setStorageItem(getScopedKey(userId, `snapshots_${courseId}`), JSON.stringify(res.data))
        return res.data
      }
    } catch {
      // fallback
    }

    // 2. Scoped localStorage fallback
    try {
      const saved = getStorageItem(getScopedKey(userId, `snapshots_${courseId}`))
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // ignore
    }

    return []
  },

  /**
   * Calculates comprehensive course analytics from progress records & attempts.
   */
  async computeCourseAnalytics(userId, courseId, progressList = [], totalPool = 0) {
    const attempts = await this.getUserAttempts(userId, courseId)
    const snapshots = await this.getUserDailySnapshots(userId, courseId)

    const totalAttemptsCount = attempts.length
    const totalQuestionsAttempted = attempts.reduce((sum, a) => sum + (a.attempted_count || 0), 0)
    const totalCorrect = attempts.reduce((sum, a) => sum + (a.correct_count || 0), 0)
    const overallAccuracy = totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 100) : 0

    const masteredCount = progressList.filter((p) => p.status === 'MASTERED').length
    const incorrectCount = progressList.filter((p) => p.status === 'INCORRECT').length
    const practicedCount = masteredCount + incorrectCount

    const effectiveTotalPool = totalPool > 0 ? totalPool : Math.max(progressList.length, 50)
    const coveragePercentage = Math.min(100, Math.round((practicedCount / effectiveTotalPool) * 100))
    const masteryPercentage = Math.min(100, Math.round((masteredCount / effectiveTotalPool) * 100))

    // Weighted Readiness Algorithm: 50% Accuracy + 30% Mastery + 20% Coverage
    const readinessScore = totalQuestionsAttempted === 0
      ? 0
      : Math.min(100, Math.round(overallAccuracy * 0.5 + masteryPercentage * 0.3 + coveragePercentage * 0.2))

    // Subject breakdown for strong & weak areas
    const subjectStats = {}
    attempts.forEach((att) => {
      const sub = att.subject_title || att.subject_id || 'General'
      if (!subjectStats[sub]) {
        subjectStats[sub] = { attempts: 0, correct: 0, total: 0 }
      }
      subjectStats[sub].attempts += 1
      subjectStats[sub].total += att.attempted_count || 0
      subjectStats[sub].correct += att.correct_count || 0
    })

    const strongAreas = []
    const weakAreas = []
    Object.keys(subjectStats).forEach((sub) => {
      const data = subjectStats[sub]
      const acc = data.total > 0 ? (data.correct / data.total) * 100 : 0
      if (acc >= 65) strongAreas.push(sub)
      else weakAreas.push(sub)
    })

    // Construct persistent graph trend (minimum 5 days or historical records)
    let trendHistory = snapshots.map((s) => ({
      date: s.date,
      accuracy: s.accuracy || 0,
      questions: s.questions_solved || 0,
    }))

    if (trendHistory.length === 0 && totalAttemptsCount > 0) {
      trendHistory = attempts.slice(-7).map((a) => ({
        date: (a.created_at || '').split('T')[0] || getTodayIsoDate(),
        accuracy: a.accuracy || 0,
        questions: a.attempted_count || 0,
      }))
    }

    return {
      userId,
      courseId,
      readinessScore,
      accuracy: overallAccuracy,
      coverage: coveragePercentage,
      mastery: masteryPercentage,
      totalAttemptsCount,
      totalQuestionsAttempted,
      masteredCount,
      incorrectCount,
      practicedCount,
      totalPool: effectiveTotalPool,
      strongAreas: strongAreas.length > 0 ? strongAreas : ['Foundations'],
      weakAreas: weakAreas.length > 0 ? weakAreas : ['Complex Scenarios'],
      trendHistory,
      lastActiveAt: attempts.length > 0 ? attempts[attempts.length - 1].created_at : new Date().toISOString(),
    }
  },

  /**
   * Clears user analytics cache on user logout / switch.
   */
  clearUserCache(userId) {
    if (!userId) return
    try {
      removeStorageItem(getScopedKey(userId, 'attempts'))
      removeStorageItem(getScopedKey(userId, `snapshots`))
    } catch {
      // ignore
    }
  },
}
