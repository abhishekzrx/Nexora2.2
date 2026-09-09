/**
 * TestResultsPage.jsx
 * Highly structured 40-60 desktop split Results & Review Hub.
 *
 * Layout:
 * - 40% Left Pane: Score Hero, Stat Matrix, Performance Trends Studio (Fixed Bar & Line graphs), AI Learning Feedback.
 * - 60% Right Pane:
 *    1. Question Map Matrix (Right above the displayed question) with filter tabs and color-coded chips.
 *    2. Full-featured Question Review & Explanation Inspector.
 * - Bottom Bar: Performance Summary Metrics & Action Buttons (Review Full Test, Practice Again, Back to Subjects).
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import '../styles/testResults.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import AppIcon from '../components/ui/AppIcon'
import { useContentRegistry } from '../data/contentRegistry'
import { testSession } from '../utils/navigation'
import { getCurrentUserId } from '../services/userService'
import { useWorkspaceStore } from '../data/workspaceStore'
import { userAnalyticsService } from '../services/userAnalyticsService'
import FormattedQuestionText from '../components/mcq/FormattedQuestionText'
import PyqBadge from '../components/mcq/PyqBadge'

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatDateLabel(isoStringOrTimestamp) {
  if (!isoStringOrTimestamp) return 'Today'
  try {
    const d = new Date(isoStringOrTimestamp)
    if (isNaN(d.getTime())) return 'Today'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Today'
  }
}

function TestResultsPage({
  onBack,
  onReviewAnswers,
  onPracticeAgain,
  onBackToSubjects,
  subjectKey,
  chapterId,
}) {
  const registry = useContentRegistry()
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const courseId = activeWorkspace?.id || 'course_default'
  const userId = getCurrentUserId()

  // Ensure test session is loaded for the active user if not already in memory
  if (!testSession.result && userId) {
    testSession.loadForUser(userId)
  }

  const subject = registry.subjectCatalog[subjectKey || testSession.subjectKey] || null
  const subjectTitle = subject?.title || 'Subject Practice'
  const chapter = testSession.chapter || null
  const chapterTitle = chapter?.num
    ? `Ch ${chapter.num}: ${chapter.title || chapter.name || 'Practice'}`
    : (chapter?.title || chapter?.name || 'Chapter Practice')

  // Result metrics computed at submission
  const result = testSession.result || {}
  const total = result.total || 0
  const attempted = result.attempted !== undefined ? result.attempted : 0
  const correct = result.correct !== undefined ? result.correct : 0
  const incorrect = result.incorrect !== undefined ? result.incorrect : 0
  const accuracy = result.accuracy !== undefined ? result.accuracy : 0
  const percentage = result.percentage !== undefined ? result.percentage : 0
  const masteredCount = result.masteredCount !== undefined ? result.masteredCount : (result.totalMastered || correct)
  const skipped = result.skipped !== undefined ? result.skipped : Math.max(0, total - attempted)
  const score = result.score !== undefined ? result.score : correct
  const scoreDelta = result.scoreDelta !== undefined ? result.scoreDelta : null

  // Raw questions and student answers
  const questions = testSession.questions || []
  const answers = testSession.answers || {}

  // Filter state for Question Map & selected question
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'CORRECT' | 'INCORRECT' | 'SKIPPED'
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Trends & Historical Graph state
  const [timeframe, setTimeframe] = useState('7D') // '7D' | '30D' | 'ALL'
  const [graphType, setGraphType] = useState('BAR') // 'BAR' | 'LINE'
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [historyAttempts, setHistoryAttempts] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Compute detailed response models for each question
  const mappedQuestions = useMemo(() => {
    return questions.map((q, idx) => {
      const chosen = answers[idx]
      const isAttempted = chosen !== undefined && chosen !== null
      const isCorrect = isAttempted && chosen === q.correct
      const isIncorrect = isAttempted && chosen !== q.correct
      const isSkipped = !isAttempted

      let statusType = 'SKIPPED'
      let markText = '0.0'
      let statusLabel = 'Skipped'

      if (isCorrect) {
        statusType = 'CORRECT'
        markText = '+1.0'
        statusLabel = 'Correct'
      } else if (isIncorrect) {
        statusType = 'INCORRECT'
        markText = '0.0'
        statusLabel = 'Incorrect'
      }

      return {
        index: idx,
        number: idx + 1,
        question: q,
        chosen,
        correct: q.correct,
        options: Array.isArray(q.options) ? q.options : [],
        explanation: q.explanation || 'No detailed explanation provided for this question.',
        statusType,
        markText,
        statusLabel,
      }
    })
  }, [questions, answers])

  // Default to first incorrect question for quick review, or Q1
  useEffect(() => {
    if (mappedQuestions.length > 0) {
      const firstWrong = mappedQuestions.findIndex((q) => q.statusType === 'INCORRECT')
      if (firstWrong !== -1) {
        setSelectedIdx(firstWrong)
      } else {
        setSelectedIdx(0)
      }
    }
  }, [mappedQuestions])

  // Fetch backend historical attempts and snapshots with fallback
  useEffect(() => {
    let isMounted = true

    async function loadHistoricalData() {
      setIsLoadingHistory(true)
      try {
        const [backendAttempts, snapshots] = await Promise.all([
          userAnalyticsService.getUserAttempts(userId, courseId),
          userAnalyticsService.getUserDailySnapshots(userId, courseId),
        ])

        if (!isMounted) return

        const localAttempts = Array.isArray(testSession.attemptHistoryData) ? testSession.attemptHistoryData : []
        const combined = [...backendAttempts]

        localAttempts.forEach((local) => {
          const exists = combined.some((b) => b.id === local.id || (b.timestamp && b.timestamp === local.timestamp))
          if (!exists) {
            combined.push({
              id: local.id,
              created_at: local.timestamp ? new Date(local.timestamp).toISOString() : new Date().toISOString(),
              accuracy: local.accuracy,
              score: local.score,
              total_questions: local.total,
              attempted_count: local.attempted,
              correct_count: local.correct,
              subject_title: local.subjectTitle,
              chapter_title: local.chapterTitle,
            })
          }
        })

        if (total > 0) {
          const currentId = `current_session_${Date.now()}`
          const hasCurrent = combined.some((c) => c.id === currentId)
          if (!hasCurrent) {
            combined.push({
              id: currentId,
              created_at: new Date().toISOString(),
              accuracy,
              score,
              total_questions: total,
              attempted_count: attempted,
              correct_count: correct,
              subject_title: subjectTitle,
              chapter_title: chapterTitle,
            })
          }
        }

        combined.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        setHistoryAttempts(combined)
      } catch {
        if (isMounted) {
          const localAttempts = Array.isArray(testSession.attemptHistoryData) ? testSession.attemptHistoryData : []
          setHistoryAttempts(
            localAttempts.map((l) => ({
              id: l.id,
              created_at: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
              accuracy: l.accuracy,
              score: l.score,
              total_questions: l.total,
              attempted_count: l.attempted,
              correct_count: l.correct,
              subject_title: l.subjectTitle,
              chapter_title: l.chapterTitle,
            }))
          )
        }
      } finally {
        if (isMounted) setIsLoadingHistory(false)
      }
    }

    loadHistoricalData()

    return () => {
      isMounted = false
    }
  }, [userId, courseId, accuracy, score, total, attempted, correct, subjectTitle, chapterTitle])

  // Filter trend data points by timeframe
  const trendPoints = useMemo(() => {
    let list = [...historyAttempts]

    if (list.length === 0) {
      return [
        {
          id: 'p-prev',
          dateLabel: 'Previous',
          accuracy: Math.max(0, accuracy - 15),
          score: Math.max(0, score - 2),
          total: total || 10,
          attempted: attempted || 10,
          correct: Math.max(0, score - 2),
          subject: subjectTitle,
        },
        {
          id: 'p-curr',
          dateLabel: 'Current',
          accuracy,
          score,
          total: total || 10,
          attempted,
          correct,
          subject: subjectTitle,
        },
      ]
    }

    const now = Date.now()
    if (timeframe === '7D') {
      const cutoff = now - 7 * 24 * 60 * 60 * 1000
      list = list.filter((item) => new Date(item.created_at || 0).getTime() >= cutoff)
      if (list.length === 0) list = historyAttempts.slice(-7)
    } else if (timeframe === '30D') {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000
      list = list.filter((item) => new Date(item.created_at || 0).getTime() >= cutoff)
      if (list.length === 0) list = historyAttempts.slice(-15)
    }

    const maxPoints = timeframe === '7D' ? 7 : timeframe === '30D' ? 12 : 16
    const sliced = list.slice(-maxPoints)

    return sliced.map((item, idx) => ({
      id: item.id || `tp-${idx}`,
      dateLabel: formatDateLabel(item.created_at),
      rawDate: item.created_at,
      accuracy: Math.min(100, Math.max(0, Math.round(item.accuracy !== undefined ? item.accuracy : (item.correct_count / (item.attempted_count || 1)) * 100))),
      score: item.score !== undefined ? item.score : item.correct_count || 0,
      total: item.total_questions || total,
      attempted: item.attempted_count || attempted,
      correct: item.correct_count || correct,
      subject: item.subject_title || subjectTitle,
      chapter: item.chapter_title || chapterTitle,
    }))
  }, [historyAttempts, timeframe, accuracy, score, total, attempted, correct, subjectTitle, chapterTitle])

  // Filtered question counts
  const correctCount = mappedQuestions.filter((q) => q.statusType === 'CORRECT').length
  const incorrectCount = mappedQuestions.filter((q) => q.statusType === 'INCORRECT').length
  const skippedCount = mappedQuestions.filter((q) => q.statusType === 'SKIPPED').length

  // Selected question model
  const activeQuestionModel = mappedQuestions[selectedIdx] || mappedQuestions[0] || null

  const handlePrevQuestion = () => {
    if (selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
  }

  const handleNextQuestion = () => {
    if (selectedIdx < mappedQuestions.length - 1) setSelectedIdx(selectedIdx + 1)
  }

  // Stat items
  const statItems = [
    { icon: 'check', iconClass: 'icon-correct', value: String(correct), label: 'Correct (+1.0)' },
    { icon: 'cross', iconClass: 'icon-incorrect', value: String(incorrect), label: 'Incorrect (0.0)' },
    { icon: 'star', iconClass: 'icon-total', value: String(masteredCount), label: 'Mastered' },
    { icon: 'viewList', iconClass: 'icon-unattempted', value: String(skipped), label: 'Skipped' },
  ]

  const timeTaken = formatTime(testSession.timeTakenSeconds)
  let performanceTier = 'Practice Mode'
  if (percentage >= 90) performanceTier = 'Outstanding! 🏆'
  else if (percentage >= 75) performanceTier = 'Good Mastery 😌'
  else if (percentage >= 50) performanceTier = 'Fair Effort 🙂'

  // AI Mentor Insight
  let aiInsightText = `You completed ${total} practice questions from ${chapterTitle}.`
  if (correctCount === total && total > 0) {
    aiInsightText = `Outstanding mastery! Perfect score of ${score}/${total} (+${score} marks). Keep this momentum going!`
  } else if (scoreDelta !== null && scoreDelta > 0) {
    aiInsightText = `Accuracy improved by +${scoreDelta}% compared to your previous attempt! Review incorrect questions to solidify concepts.`
  } else if (incorrectCount > 0) {
    aiInsightText = `You scored ${score} out of ${total} marks (${accuracy}% accuracy). Take a moment to review explanations for the ${incorrectCount} incorrect responses.`
  }

  const avgTrendAccuracy = useMemo(() => {
    if (trendPoints.length === 0) return accuracy
    const sum = trendPoints.reduce((acc, p) => acc + p.accuracy, 0)
    return Math.round(sum / trendPoints.length)
  }, [trendPoints, accuracy])

  return (
    <div className="results-shell desktop-single-page">
      <PhoneFrame>
        {/* Clean Header */}
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              <AppIcon name="back" size={18} />
            </button>
            <div className="header-title">
              <h1>Test Results & Analysis 🎉</h1>
              <p>{subjectTitle} • {chapterTitle} • {total} Questions</p>
            </div>
          </div>
        </header>

        {/* Main 40-60 Split Viewport Grid */}
        <main className="content main-viewport-grid">
          {/* ── LEFT PANE (40%): Results Overview & Performance Trends ── */}
          <aside className="results-left-pane">
            {/* 1. Score Hero Card */}
            <div className="card score-hero-card anim" style={{ animationDelay: '0.04s' }}>
              <div className="score-hero-top">
                <div className="trophy-circle-compact">
                  <AppIcon name="trophy" size={32} />
                  <span className="confetti-piece" style={{ top: '30%', left: '50%', '--tx': '-30px', '--ty': '-35px', '--rot': '-120deg', animationDelay: '0.1s' }}>✨</span>
                  <span className="confetti-piece" style={{ top: '30%', left: '50%', '--tx': '30px', '--ty': '-30px', '--rot': '120deg', animationDelay: '0.2s' }}>🎉</span>
                </div>
                <div className="score-hero-details">
                  <div className="hero-sub-label">OVERALL TEST SCORE</div>
                  <div className="hero-score-val">
                    {score} <span className="hero-score-total">/ {total} Marks</span>
                  </div>
                  <div className="hero-badge-row">
                    <span className="score-pill">{accuracy}% Accuracy</span>
                    <span className="time-pill">
                      <AppIcon name="timer" size={12} /> {timeTaken}
                    </span>
                    {scoreDelta !== null && (
                      <span className={`delta-pill ${scoreDelta >= 0 ? 'delta-pos' : 'delta-neg'}`}>
                        {scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} vs prev
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Mini Stat Badges */}
              <div className="stat-grid-compact">
                {statItems.map((item) => (
                  <div className="stat-item-compact" key={item.label}>
                    <div className={`stat-icon-compact ${item.iconClass}`}>
                      <AppIcon name={item.icon} size={13} />
                    </div>
                    <div className="stat-num-compact">{item.value}</div>
                    <div className="stat-label-compact">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Historical Performance Trends Studio */}
            <div className="card trends-card anim" style={{ animationDelay: '0.08s' }}>
              <div className="trends-card-header">
                <div className="trends-title-group">
                  <div className="trends-title">
                    <AppIcon name="analytics" size={16} />
                    <span>Performance Trends</span>
                  </div>
                  <div className="trends-subtitle">
                    Avg Accuracy: <strong>{avgTrendAccuracy}%</strong> ({trendPoints.length} Attempts)
                  </div>
                </div>

                {/* Controls: Timeframe Filter + Graph Switcher */}
                <div className="trends-controls">
                  <div className="timeframe-selector">
                    {['7D', '30D', 'ALL'].map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                        onClick={() => setTimeframe(tf)}
                      >
                        {tf === 'ALL' ? 'All' : `${tf.replace('D', ' Days')}`}
                      </button>
                    ))}
                  </div>

                  <div className="graph-type-selector">
                    <button
                      type="button"
                      className={`gt-btn ${graphType === 'BAR' ? 'active' : ''}`}
                      onClick={() => setGraphType('BAR')}
                      title="Switch to Bar Graph"
                    >
                      <AppIcon name="analytics" size={14} />
                      <span>Bar</span>
                    </button>
                    <button
                      type="button"
                      className={`gt-btn ${graphType === 'LINE' ? 'active' : ''}`}
                      onClick={() => setGraphType('LINE')}
                      title="Switch to Line Graph"
                    >
                      <AppIcon name="trendingUp" size={14} />
                      <span>Line</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean SVG Graph Canvas */}
              <div className="trends-canvas-container">
                {trendPoints.length === 0 ? (
                  <div className="trends-empty-state">No historical attempt records yet.</div>
                ) : (
                  <TrendGraphSvg
                    points={trendPoints}
                    graphType={graphType}
                    hoveredPoint={hoveredPoint}
                    onHoverPoint={setHoveredPoint}
                  />
                )}
              </div>

              {/* Hover Details / Legend */}
              <div className="trends-footer-bar">
                {hoveredPoint ? (
                  <div className="trend-hover-details">
                    <span className="th-date">{hoveredPoint.dateLabel}:</span>
                    <span className="th-acc">{hoveredPoint.accuracy}% Accuracy</span>
                    <span className="th-score">({hoveredPoint.score}/{hoveredPoint.total} Marks)</span>
                  </div>
                ) : (
                  <div className="trend-legend">
                    <span className="legend-item"><span className="legend-dot green"></span> High (≥75%)</span>
                    <span className="legend-item"><span className="legend-dot orange"></span> Mid (50-74%)</span>
                    <span className="legend-item"><span className="legend-dot red"></span> Low (&lt;50%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. AI Learning Feedback */}
            <div className="card ai-insight-compact anim" style={{ animationDelay: '0.12s' }}>
              <div className="ai-insight-icon-compact">
                <AppIcon name="lightbulb" size={18} />
              </div>
              <div className="ai-insight-content">
                <div className="ai-insight-heading">AI Learning Insight</div>
                <div className="ai-insight-body">{aiInsightText}</div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT PANE (60%): Question Map (Just Above Question) + Question Review ── */}
          <section className="results-right-pane">
            {/* 1. Question Map Header & Matrix (Just Above the Question Displayed) */}
            <div className="card qmap-compact-card anim" style={{ animationDelay: '0.06s' }}>
              <div className="qmap-compact-header">
                <div className="qmap-compact-title">
                  <AppIcon name="gridView" size={16} />
                  <span>Question Map</span>
                </div>

                {/* Filter Tabs */}
                <div className="qmap-filter-group">
                  <button
                    type="button"
                    className={`qmap-filter-pill ${filterTab === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilterTab('ALL')}
                  >
                    All ({mappedQuestions.length})
                  </button>
                  <button
                    type="button"
                    className={`qmap-filter-pill pill-correct ${filterTab === 'CORRECT' ? 'active' : ''}`}
                    onClick={() => setFilterTab('CORRECT')}
                  >
                    <span>✓</span> Correct ({correctCount})
                  </button>
                  <button
                    type="button"
                    className={`qmap-filter-pill pill-incorrect ${filterTab === 'INCORRECT' ? 'active' : ''}`}
                    onClick={() => setFilterTab('INCORRECT')}
                  >
                    <span>✕</span> Incorrect ({incorrectCount})
                  </button>
                  {skippedCount > 0 && (
                    <button
                      type="button"
                      className={`qmap-filter-pill pill-skipped ${filterTab === 'SKIPPED' ? 'active' : ''}`}
                      onClick={() => setFilterTab('SKIPPED')}
                    >
                      <span>–</span> Skipped ({skippedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Question Map Chips Strip */}
              <div className="qmap-chips-strip">
                {mappedQuestions.map((q) => {
                  const isVisible =
                    filterTab === 'ALL' ||
                    (filterTab === 'CORRECT' && q.statusType === 'CORRECT') ||
                    (filterTab === 'INCORRECT' && q.statusType === 'INCORRECT') ||
                    (filterTab === 'SKIPPED' && q.statusType === 'SKIPPED')

                  if (!isVisible) return null

                  const isSelected = selectedIdx === q.index
                  let chipClass = 'chip-s'
                  let markSymbol = '–'
                  if (q.statusType === 'CORRECT') {
                    chipClass = 'chip-c'
                    markSymbol = '✓'
                  } else if (q.statusType === 'INCORRECT') {
                    chipClass = 'chip-i'
                    markSymbol = '✕'
                  }

                  return (
                    <button
                      key={q.index}
                      type="button"
                      className={`qmap-strip-chip ${chipClass} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedIdx(q.index)}
                      title={`Question ${q.number}: ${q.statusLabel} (${q.markText} Marks)`}
                    >
                      <span className="qchip-num">Q{q.number}</span>
                      <span className="qchip-mark">{markSymbol} {q.markText}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Full-Height Dedicated Question Review Card */}
            <div className="card response-inspector-card anim" style={{ animationDelay: '0.08s' }}>
              {activeQuestionModel ? (
                <>
                  {/* Inspector Header */}
                  <div className="inspector-header">
                    <div className="inspector-header-left">
                      <div className="inspector-qnum">
                        Question {activeQuestionModel.number} of {mappedQuestions.length}
                      </div>
                      <div className={`inspector-badge badge-${activeQuestionModel.statusType.toLowerCase()}`}>
                        {activeQuestionModel.statusType === 'CORRECT' && '✓ Correct (+1.0 Mark)'}
                        {activeQuestionModel.statusType === 'INCORRECT' && '✕ Incorrect (0.0 Mark)'}
                        {activeQuestionModel.statusType === 'SKIPPED' && '– Skipped (0.0 Mark)'}
                      </div>
                      <PyqBadge question={activeQuestionModel.question} size="xs" />
                    </div>

                    <div className="inspector-nav-buttons">
                      <button
                        type="button"
                        className="inspector-nav-btn"
                        onClick={handlePrevQuestion}
                        disabled={selectedIdx <= 0}
                        title="Previous Question"
                      >
                        <AppIcon name="back" size={14} />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        className="inspector-nav-btn"
                        onClick={handleNextQuestion}
                        disabled={selectedIdx >= mappedQuestions.length - 1}
                        title="Next Question"
                      >
                        <span>Next</span>
                        <AppIcon name="chevronRight" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Question Stem, Options, and Explanation */}
                  <div className="inspector-scrollable-body">
                    {/* Question Stem */}
                    <div className="inspector-stem">
                      <FormattedQuestionText
                        text={activeQuestionModel.question?.text}
                        question={activeQuestionModel.question}
                      />
                    </div>

                    {/* Options List */}
                    <div className="inspector-options">
                      {activeQuestionModel.options.map((opt, optIdx) => {
                        const optText = typeof opt === 'string' ? opt : String(opt || '')
                        const isThisCorrect = optIdx === activeQuestionModel.correct
                        const isUserChoice = optIdx === activeQuestionModel.chosen

                        let rowClass = ''
                        let tagLabel = null
                        let tagClass = ''

                        if (isThisCorrect) {
                          rowClass = 'opt-correct'
                          if (isUserChoice) {
                            tagLabel = '✓ Your Answer (Correct)'
                            tagClass = 'tag-correct'
                          } else {
                            tagLabel = '✓ Correct Answer'
                            tagClass = 'tag-correct'
                          }
                        } else if (isUserChoice && !isThisCorrect) {
                          rowClass = 'opt-wrong'
                          tagLabel = '✕ Your Answer'
                          tagClass = 'tag-wrong'
                        }

                        return (
                          <div key={optIdx} className={`inspector-option-row ${rowClass}`}>
                            <span className="opt-letter">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="opt-text">{optText}</span>
                            {tagLabel && <span className={`opt-tag ${tagClass}`}>{tagLabel}</span>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {activeQuestionModel.explanation && (
                      <div className="inspector-explanation">
                        <div className="explanation-title">
                          <AppIcon name="lightbulb" size={15} />
                          <span>Detailed Explanation & Concept:</span>
                        </div>
                        <div className="explanation-text">{activeQuestionModel.explanation}</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="inspector-empty">Select a question from the question map above.</div>
              )}
            </div>
          </section>
        </main>

        {/* ── BOTTOM SUMMARY & ACTION FOOTER (Occupies footer space efficiently) ── */}
        <footer className="results-bottom-bar">
          {/* Summary Metric Badges */}
          <div className="footer-summary-chips">
            <div className="footer-chip">
              <span className="fchip-label">Score:</span>
              <strong className="fchip-val">{score}/{total}</strong>
            </div>
            <div className="footer-chip">
              <span className="fchip-label">Accuracy:</span>
              <strong className="fchip-val text-acc">{accuracy}%</strong>
            </div>
            <div className="footer-chip">
              <span className="fchip-label">Attempted:</span>
              <strong className="fchip-val">{attempted}/{total}</strong>
            </div>
            <div className="footer-chip">
              <span className="fchip-label">Time:</span>
              <strong className="fchip-val">{timeTaken}</strong>
            </div>
            <div className="footer-chip tier-chip">
              <strong className="fchip-val">{performanceTier}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bottom-actions-group">
            <button type="button" className="btn btn-review-exam" onClick={onReviewAnswers}>
              <AppIcon name="quiz" size={15} />
              Review Full Test (Exam View)
            </button>
            <button type="button" className="btn btn-practice-again" onClick={onPracticeAgain}>
              <AppIcon name="refresh" size={15} />
              Practice Again
            </button>
            <button type="button" className="btn btn-back-subjects" onClick={onBackToSubjects}>
              <AppIcon name="subjects" size={15} />
              Back to Subjects
            </button>
          </div>
        </footer>
      </PhoneFrame>
    </div>
  )
}

/**
 * TrendGraphSvg
 * Clean SVG renderer for Bar and Line trend charts with non-overlapping axes.
 */
function TrendGraphSvg({ points = [], graphType = 'BAR', hoveredPoint, onHoverPoint }) {
  const width = 440
  const height = 180
  const padLeft = 40
  const padRight = 20
  const padTop = 26
  const padBottom = 34

  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom

  const yTicks = [0, 25, 50, 75, 100]
  const count = points.length

  const coords = useMemo(() => {
    if (count === 0) return []
    if (count === 1) {
      const x = padLeft + plotWidth / 2
      const y = padTop + plotHeight - (points[0].accuracy / 100) * plotHeight
      return [{ ...points[0], x, y, idx: 0 }]
    }
    const step = plotWidth / (count - 1)
    return points.map((p, idx) => {
      const x = padLeft + idx * step
      const y = padTop + plotHeight - (p.accuracy / 100) * plotHeight
      return { ...p, x, y, idx }
    })
  }, [points, count, padLeft, plotWidth, padTop, plotHeight])

  const linePathD = useMemo(() => {
    if (coords.length === 0) return ''
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`

    let d = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i]
      const next = coords[i + 1]
      const cpx1 = curr.x + (next.x - curr.x) / 2
      const cpy1 = curr.y
      const cpx2 = curr.x + (next.x - curr.x) / 2
      const cpy2 = next.y
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`
    }
    return d
  }, [coords])

  const areaPathD = useMemo(() => {
    if (coords.length <= 1) return ''
    const baseLineY = padTop + plotHeight
    return `${linePathD} L ${coords[coords.length - 1].x} ${baseLineY} L ${coords[0].x} ${baseLineY} Z`
  }, [coords, linePathD, padTop, plotHeight])

  const barWidth = Math.max(16, Math.min(32, plotWidth / (Math.max(count, 3) * 1.5)))

  return (
    <div className="svg-chart-wrapper">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trend-svg"
      >
        <defs>
          <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="barHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="barMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="barLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Labels */}
        {yTicks.map((val) => {
          const y = padTop + plotHeight - (val / 100) * plotHeight
          return (
            <g key={val} className="grid-row">
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#F1F5F9"
                strokeDasharray={val === 0 ? 'none' : '3 3'}
                strokeWidth={val === 0 ? '1.5' : '1'}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="axis-label"
              >
                {val}%
              </text>
            </g>
          )
        })}

        {/* ── BAR GRAPH MODE ── */}
        {graphType === 'BAR' && (
          <g className="bars-group">
            {coords.map((p) => {
              const barH = Math.max(6, (p.accuracy / 100) * plotHeight)
              const barX = p.x - barWidth / 2
              const barY = padTop + plotHeight - barH
              const isHovered = hoveredPoint?.id === p.id

              let fillUrl = 'url(#barHigh)'
              if (p.accuracy < 50) fillUrl = 'url(#barLow)'
              else if (p.accuracy < 75) fillUrl = 'url(#barMid)'

              return (
                <g
                  key={p.id}
                  className={`bar-group ${isHovered ? 'bar-active' : ''}`}
                  onMouseEnter={() => onHoverPoint(p)}
                  onMouseLeave={() => onHoverPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    rx="5"
                    ry="5"
                    fill={fillUrl}
                    opacity={hoveredPoint && !isHovered ? 0.45 : 1}
                    className="bar-rect"
                  />
                  {/* Accuracy label on top of bar */}
                  <text
                    x={p.x}
                    y={barY - 6}
                    textAnchor="middle"
                    className="bar-value-label"
                  >
                    {p.accuracy}%
                  </text>
                  {/* Date label cleanly below the baseline */}
                  <text
                    x={p.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="bar-date-label"
                  >
                    {p.dateLabel}
                  </text>
                </g>
              )
            })}
          </g>
        )}

        {/* ── LINE GRAPH MODE ── */}
        {graphType === 'LINE' && (
          <g className="line-group">
            {areaPathD && (
              <path d={areaPathD} fill="url(#lineAreaGradient)" className="line-area-path" />
            )}

            {linePathD && (
              <path
                d={linePathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="line-stroke-path"
              />
            )}

            {coords.map((p) => {
              const isHovered = hoveredPoint?.id === p.id
              return (
                <g
                  key={p.id}
                  className={`point-group ${isHovered ? 'point-active' : ''}`}
                  onMouseEnter={() => onHoverPoint(p)}
                  onMouseLeave={() => onHoverPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4.5}
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="point-dot"
                  />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className={`point-value-label ${isHovered ? 'visible' : ''}`}
                  >
                    {p.accuracy}%
                  </text>
                  <text
                    x={p.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="point-date-label"
                  >
                    {p.dateLabel}
                  </text>
                </g>
              )
            })}
          </g>
        )}
      </svg>
    </div>
  )
}

export default TestResultsPage
