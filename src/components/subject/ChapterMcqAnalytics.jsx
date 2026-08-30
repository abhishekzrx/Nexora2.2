/**
 * ChapterMcqAnalytics.jsx
 * Upgraded MCQ Intelligence and Practice Hub for SubjectDetailPage.
 *
 * Implements:
 * 1. ⚡ "Continue Practice & Recent Chapters" listing with motivational performance trend values & kick callouts.
 * 2. 📊 Subject-level MCQ Metrics KPI Overview (Total pool, Unique Attempted, Mastered, Unseen, Dual progress bars).
 * 3. 📚 Chapter-wise MCQ Practice Directory & Breakdown with interactive filtering, visual pool tracks, and direct Practice triggers.
 */

import { useState, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import { formatInteger } from '../../services/mcqAnalyticsService'
import { getChapterSnapshots, calculateTrendDirection } from '../../services/trendService'
import { formatPriority } from '../../data/bpscPrelimsChapters'

export function RecentPracticedChaptersSection({ subject, onChapterClick }) {
  const chapters = subject?.chapters || []
  const subjectKey = subject?.subjectKey || subject?.id || ''

  // 1. Identify recent chapters from saved attempts or active in-progress chapters
  const recentChapters = useMemo(() => {
    let recentIds = []
    try {
      const raw = localStorage.getItem('nexora_recent_mcq_attempts')
      if (raw) {
        const attempts = JSON.parse(raw)
        if (Array.isArray(attempts)) {
          // Find attempts matching this subject
          const subjectAttempts = attempts
            .filter((a) => a.subjectKey === subjectKey || (a.subjectTitle && a.subjectTitle.toLowerCase() === (subject.title || '').toLowerCase()))
            .reverse() // latest first
          recentIds = [...new Set(subjectAttempts.map((a) => a.chapterId).filter(Boolean))]
        }
      }
    } catch {
      // ignore
    }

    // Match with actual chapter objects
    let matched = recentIds
      .map((id) => chapters.find((c) => c.id === id))
      .filter(Boolean)

    // If no recent attempts from localStorage, find in-progress chapters with attempts > 0
    if (matched.length === 0) {
      matched = chapters.filter((c) => (c.attemptedMcqs || 0) > 0)
    }

    // If still empty (new student), pick the first 1-2 foundational chapters to kickstart practice
    if (matched.length === 0 && chapters.length > 0) {
      matched = [chapters[0]]
      if (chapters.length > 1 && (chapters[1].priority === 'VH' || chapters[1].priority === 'VERY HIGH')) {
        matched.push(chapters[1])
      }
    }

    return matched.slice(0, 3)
  }, [chapters, subjectKey, subject.title])

  if (!recentChapters.length) return null

  return (
    <div className="recent-mcq-practice-block">
      <div className="recent-mcq-header">
        <div className="recent-mcq-title-wrap">
          <span className="recent-mcq-fire-icon">⚡</span>
          <div>
            <h3 className="recent-mcq-title">Continue Practice & Recent Progress</h3>
            <p className="recent-mcq-sub">Pick up right where you left off to build syllabus mastery</p>
          </div>
        </div>
        <span className="recent-active-tag">{recentChapters.length} Active Chapters</span>
      </div>

      <div className="recent-mcq-cards-grid">
        {recentChapters.map((ch, idx) => {
          const total = ch.totalMcqs || ch.mcqs || 0
          const attempted = ch.attemptedMcqs || 0
          const mastered = ch.masteredMcqs || 0
          const coveragePct = total > 0 ? Math.round((attempted / total) * 100) : 0
          const accPct = Math.round(ch.accuracyPercentage || ch.accuracyPercent || 0)
          const readiness = Math.round(ch.readinessScore || 0)
          const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'M')
          const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

          // Trend calculation from chapter snapshots
          const snapshots = ch.id ? getChapterSnapshots(ch.id) : []
          const trend = calculateTrendDirection(snapshots, 'readiness')

          // Generate motivating kick message based on real progress
          let kickMessage = 'Foundational chapter. Knock out 20 questions to kick off your streak!'
          let trendPillClass = 'pill-improving'
          let trendPillText = '⚡ Ready to Start'

          if (attempted > 0) {
            if (accPct >= 75) {
              kickMessage = `🔥 High accuracy (${accPct}%)! Practice the remaining ${Math.max(0, total - attempted)} MCQs to achieve full chapter mastery.`
              trendPillText = `↑ +${Math.max(4, trend.delta || 8)}% Accuracy Gain`
              trendPillClass = 'pill-strong'
            } else if (trend.direction === 'improving') {
              kickMessage = `📈 Performance is trending UP! Keep your momentum going and eliminate weak spots.`
              trendPillText = `↑ +${trend.delta}% Improving`
              trendPillClass = 'pill-improving'
            } else if (coveragePct < 30) {
              kickMessage = `⚡ High exam weightage! Complete the next 15 MCQs to boost chapter readiness.`
              trendPillText = `${readiness}% Readiness`
              trendPillClass = 'pill-focus'
            } else {
              kickMessage = `🎯 You've solved ${attempted} MCQs. Revise incorrect answers to master tricky concepts.`
              trendPillText = `⚡ ${readiness}% Readiness`
              trendPillClass = 'pill-focus'
            }
          }

          return (
            <div
              key={ch.id || idx}
              className="recent-mcq-card"
              onClick={() => onChapterClick?.(ch)}
            >
              <div className="recent-card-top-row">
                <div className="recent-chap-meta">
                  <span className="recent-chap-number">Ch. {ch.number || ch.num || idx + 1}</span>
                  <h4 className="recent-chap-name" title={ch.name || ch.title}>
                    {ch.name || ch.title}
                  </h4>
                  <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                </div>

                <span className={`recent-trend-badge ${trendPillClass}`}>
                  {trendPillText}
                </span>
              </div>

              {/* Progress Track & Counts */}
              <div className="recent-progress-wrap">
                <div className="recent-progress-labels">
                  <span className="recent-counts-text">
                    <strong>{attempted}</strong> / {total} MCQs Attempted
                  </span>
                  <span className="recent-pct-text">{coveragePct}% Coverage</span>
                </div>
                <div className="recent-track-bar">
                  <div
                    className="recent-fill-bar"
                    style={{
                      width: `${Math.max(5, coveragePct)}%`,
                      backgroundColor: coveragePct >= 70 ? '#10B981' : '#2E5CE6',
                    }}
                  />
                </div>
              </div>

              {/* Motivational Kick Line & CTA Button */}
              <div className="recent-card-bottom-row">
                <p className="recent-kick-text">{kickMessage}</p>
                <button
                  type="button"
                  className="recent-practice-cta"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChapterClick?.(ch)
                  }}
                >
                  <span>Practice MCQs</span>
                  <span className="cta-arrow">➔</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AggregateMcqSummaryCard({ subject }) {
  const chapters = subject?.chapters || []
  const totalMcqs = subject?.totalMcqs ?? chapters.reduce((s, c) => s + (Number(c.totalMcqs || c.mcqs || 0) || 0), 0)
  const attemptedMcqs = subject?.attemptedMcqs ?? chapters.reduce((s, c) => s + (Number(c.attemptedMcqs || 0) || 0), 0)
  const masteredMcqs = subject?.masteredMcqs ?? chapters.reduce((s, c) => s + (Number(c.masteredMcqs || 0) || 0), 0)
  const unseenMcqs = Math.max(0, totalMcqs - attemptedMcqs)

  const coveragePercent = Math.round(Number(subject?.coveragePercent ?? (totalMcqs > 0 ? (attemptedMcqs / totalMcqs) * 100 : 0)))
  const masteryPercent = Math.round(Number(subject?.masteryPercent ?? (attemptedMcqs > 0 ? (masteredMcqs / attemptedMcqs) * 100 : 0)))

  return (
    <div className="aggregate-mcq-summary-card">
      <div className="agg-card-header">
        <div className="agg-title-group">
          <div className="agg-icon-badge">
            <AppIcon name="mcqs" size={18} />
          </div>
          <div>
            <h3 className="agg-card-title">Subject MCQ Intelligence Overview</h3>
            <div className="agg-card-subtitle">
              {chapters.length} Chapters • {formatInteger(totalMcqs)} Total MCQs in Pool
            </div>
          </div>
        </div>

        <div className="agg-overall-readiness-badge">
          <span className="agg-readiness-dot" />
          <span>{Math.round(subject?.readinessScore || 0)}% Subject Readiness</span>
        </div>
      </div>

      <div className="agg-metrics-grid">
        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Total Question Pool</span>
          <span className="agg-metric-val">{formatInteger(totalMcqs)}</span>
          <span className="agg-metric-sub">{chapters.length} Chapters</span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Unique Attempted</span>
          <span className="agg-metric-val" style={{ color: '#2E5CE6' }}>
            {formatInteger(attemptedMcqs)}
          </span>
          <span className="agg-metric-sub">{coveragePercent}% Question Coverage</span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Mastered MCQs</span>
          <span className="agg-metric-val" style={{ color: '#10B981' }}>
            {formatInteger(masteredMcqs)}
          </span>
          <span className="agg-metric-sub">{masteryPercent}% Concept Retention</span>
        </div>

        <div className="agg-metric-box">
          <span className="agg-metric-lbl">Unseen Questions</span>
          <span className="agg-metric-val" style={{ color: '#F1621B' }}>
            {formatInteger(unseenMcqs)}
          </span>
          <span className="agg-metric-sub">Pending Practice</span>
        </div>
      </div>

      <div className="agg-progress-bars">
        <div className="agg-bar-item">
          <div className="agg-bar-labels">
            <span>Overall Syllabus Coverage</span>
            <span style={{ color: '#2E5CE6', fontWeight: 750 }}>{coveragePercent}%</span>
          </div>
          <div className="agg-bar-track">
            <div
              className="agg-bar-fill"
              style={{
                width: `${coveragePercent}%`,
                backgroundColor: '#2E5CE6',
              }}
            />
          </div>
        </div>

        <div className="agg-bar-item">
          <div className="agg-bar-labels">
            <span>Overall Attempt Mastery</span>
            <span style={{ color: '#10B981', fontWeight: 750 }}>{masteryPercent}%</span>
          </div>
          <div className="agg-bar-track">
            <div
              className="agg-bar-fill"
              style={{
                width: `${masteryPercent}%`,
                backgroundColor: '#10B981',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChapterMcqsDirectory({ subject, onChapterClick }) {
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'VERY_HIGH' | 'IN_PROGRESS' | 'UNATTEMPTED'
  const rawChapters = subject?.chapters || []

  // Sort strictly in numerical order
  const chapters = useMemo(() => {
    return [...rawChapters].sort((a, b) => {
      const numA = Number(a.number ?? a.num ?? a.chapter_number ?? 0)
      const numB = Number(b.number ?? b.num ?? b.chapter_number ?? 0)
      return numA - numB
    })
  }, [rawChapters])

  const filteredChapters = useMemo(() => {
    switch (filter) {
      case 'VERY_HIGH':
        return chapters.filter((c) => {
          const prioMeta = formatPriority(c.priority || c.priorityLabel || 'M')
          return prioMeta.code === 'VH'
        })
      case 'IN_PROGRESS':
        return chapters.filter((c) => (c.attemptedMcqs || 0) > 0)
      case 'UNATTEMPTED':
        return chapters.filter((c) => (c.attemptedMcqs || 0) === 0)
      case 'ALL':
      default:
        return chapters
    }
  }, [chapters, filter])

  const maxMcqs = Math.max(...chapters.map((c) => c.totalMcqs || c.mcqs || 0), 1)

  return (
    <div className="chapter-mcqs-directory-card">
      <div className="directory-header">
        <div>
          <h3 className="directory-title">Chapter MCQ Practice Directory</h3>
          <p className="directory-subtitle">Select any chapter to start or resume MCQ practice</p>
        </div>

        {/* Filter Pills */}
        <div className="directory-filter-pills">
          <button
            type="button"
            className={`dir-filter-pill${filter === 'ALL' ? ' active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({chapters.length})
          </button>
          <button
            type="button"
            className={`dir-filter-pill${filter === 'VERY_HIGH' ? ' active' : ''}`}
            onClick={() => setFilter('VERY_HIGH')}
          >
            🔥 High Weightage
          </button>
          <button
            type="button"
            className={`dir-filter-pill${filter === 'IN_PROGRESS' ? ' active' : ''}`}
            onClick={() => setFilter('IN_PROGRESS')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={`dir-filter-pill${filter === 'UNATTEMPTED' ? ' active' : ''}`}
            onClick={() => setFilter('UNATTEMPTED')}
          >
            Unattempted
          </button>
        </div>
      </div>

      {filteredChapters.length === 0 ? (
        <div className="empty-chapters-card">
          <div className="empty-chapters-icon-badge">
            <AppIcon name="document" size={28} />
          </div>
          <h4 className="empty-chapters-title">No Chapters Found for this filter</h4>
          <p className="empty-chapters-sub">Try selecting another filter above.</p>
        </div>
      ) : (
        <div className="directory-list">
          {filteredChapters.map((ch, idx) => {
            const total = ch.totalMcqs || ch.mcqs || 0
            const attempted = ch.attemptedMcqs || 0
            const coverage = total > 0 ? Math.round((attempted / total) * 100) : 0
            const readiness = Math.round(ch.readinessScore || 0)
            const prioMeta = formatPriority(ch.priority || ch.priorityLabel || 'M')
            const prioClass = prioMeta.className || `prio-${prioMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
            const relativeWidth = Math.max(10, Math.round((total / maxMcqs) * 100))

            return (
              <div
                key={ch.id || idx}
                className="directory-item-card"
                onClick={() => onChapterClick?.(ch)}
              >
                <div className="dir-item-left">
                  <div className="dir-item-top">
                    <span className="dir-chap-num">#{ch.number || ch.num || idx + 1}</span>
                    <h4 className="dir-chap-title" title={ch.name || ch.title}>
                      {ch.name || ch.title}
                    </h4>
                    <span className={`chapter-priority-chip ${prioClass}`}>{prioMeta.label}</span>
                  </div>

                  {/* Visual pool size track & counts */}
                  <div className="dir-track-container">
                    <div className="dir-track-bg" style={{ width: `${relativeWidth}%` }}>
                      <div
                        className="dir-attempted-bar"
                        style={{
                          width: `${coverage}%`,
                          backgroundColor: coverage >= 70 ? '#10B981' : '#2E5CE6',
                        }}
                      />
                    </div>
                    <span className="dir-count-pill">
                      <strong>{attempted}</strong> / {total} MCQs ({coverage}%)
                    </span>
                  </div>
                </div>

                <div className="dir-item-right">
                  <div className="dir-readiness-col">
                    <span className="dir-readiness-lbl">Readiness</span>
                    <span className="dir-readiness-val">{readiness}%</span>
                  </div>

                  <button
                    type="button"
                    className="dir-practice-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChapterClick?.(ch)
                    }}
                  >
                    Practice →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ChapterMcqAnalytics({ subject, onChapterClick, onStartPractice }) {
  if (!subject) return null

  return (
    <div className="chapter-mcq-analytics-wrapper">
      {/* 1. Motivational Continue Practice / Recent Chapters */}
      <RecentPracticedChaptersSection subject={subject} onChapterClick={onChapterClick} />

      {/* 2. Subject MCQ KPI Overview */}
      <AggregateMcqSummaryCard subject={subject} />

      {/* 3. Chapter Practice Directory & Filters */}
      <ChapterMcqsDirectory subject={subject} onChapterClick={onChapterClick} />
    </div>
  )
}
