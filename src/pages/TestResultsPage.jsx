/**
 * TestResultsPage
 * Performance overview screen answering:
 * - How did I perform?
 * - Why did I get this result?
 * - How does this compare with my previous performance?
 * - How much of the available content have I practiced?
 * - What should I focus on next?
 */
import '../styles/testResults.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import ProgressRing from '../components/ui/ProgressRing'
import AppIcon from '../components/ui/AppIcon'
import { useContentRegistry } from '../data/contentRegistry'
import { testSession } from '../utils/navigation'

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function TestResultsPage({ onBack, onReviewAnswers, onPracticeAgain, onBackToSubjects, subjectKey }) {
  const registry = useContentRegistry()
  const subject = registry.subjectCatalog[subjectKey || testSession.subjectKey] || null
  const subjectTitle = subject?.title || 'Subject'

  // Result metrics computed at submission
  const result = testSession.result || {
    total: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    skipped: 0,
    score: 0,
    percentage: 0,
    accuracy: 0,
    poolSize: 0,
    newCount: 0,
    practicedCount: 0,
    uniquePracticedTotal: 0,
    remainingUnpracticed: 0,
    prevAttemptAccuracy: null,
    scoreDelta: null,
  }

  const total = result.total || 0
  const attempted = result.attempted || 0
  const correct = result.correct || 0
  const incorrect = result.incorrect || 0
  const skipped = result.skipped !== undefined ? result.skipped : Math.max(0, total - attempted)
  const score = result.score || 0
  const percentage = result.percentage || 0
  const accuracy = result.accuracy || 0

  const poolSize = result.poolSize || total
  const newlyMasteredCount = result.newlyMasteredCount || 0
  const totalMastered = result.totalMastered !== undefined ? result.totalMastered : correct
  const remainingEligible = result.remainingEligible !== undefined ? result.remainingEligible : Math.max(0, poolSize - totalMastered)
  const uniquePracticedTotal = result.uniquePracticedTotal || totalMastered
  const remainingUnpracticed = remainingEligible
  const prevAttemptAccuracy = result.prevAttemptAccuracy
  const scoreDelta = result.scoreDelta

  // Invariant verification: correct + incorrect + skipped = total
  const invariantSum = correct + incorrect + skipped

  // Stat grid items
  const statItems = [
    { icon: 'check', iconClass: 'icon-correct', value: String(correct), label: 'Correct' },
    { icon: 'cross', iconClass: 'icon-incorrect', value: String(incorrect), label: 'Incorrect' },
    { icon: 'star', iconClass: 'icon-total', value: String(newlyMasteredCount), label: 'Newly Mastered' },
    { icon: 'viewList', iconClass: 'icon-unattempted', value: String(remainingEligible), label: 'Remaining' },
  ]

  // Strengths / Topics to Improve derived from actual question results
  const questions = testSession.questions || []
  const answers = testSession.answers || {}
  const strengths = []
  const improvements = []

  questions.forEach((q, idx) => {
    const chosen = answers[idx]
    const shortLabel = (q.text || `Question ${idx + 1}`).length > 34
      ? `${(q.text || '').slice(0, 34)}…`
      : (q.text || `Question ${idx + 1}`)

    if (chosen !== undefined && chosen !== null) {
      if (chosen === q.correct) {
        strengths.push({ label: shortLabel, score: 'Correct' })
      } else {
        improvements.push({ label: shortLabel, score: 'Incorrect' })
      }
    } else {
      improvements.push({ label: shortLabel, score: 'Skipped' })
    }
  })

  // Time & Performance Tier
  const timeTaken = formatTime(testSession.timeTakenSeconds)

  let performanceTier = 'Keep Practicing 💪'
  if (percentage >= 90) performanceTier = 'Outstanding! 🏆'
  else if (percentage >= 75) performanceTier = 'Good 😌'
  else if (percentage >= 50) performanceTier = 'Fair 🙂'
  const above70 = percentage >= 70

  // Data-driven AI Mentor Insight
  let aiInsightText = `You completed ${total} practice questions from your ${poolSize} available MCQ pool.`
  if (strengths.length > 0 && improvements.length === 0) {
    aiInsightText = `Perfect score! You answered all ${total} questions correctly. You have strong mastery of this content.`
  } else if (scoreDelta !== null && scoreDelta > 0) {
    aiInsightText = `Your accuracy improved by +${scoreDelta}% compared to your last practice attempt! Focus on weak topics to maintain momentum.`
  } else if (improvements.length > 0) {
    const topWeak = improvements[0].label
    aiInsightText = `Your accuracy is ${accuracy}%. Reviewing '${topWeak}' will help boost your score on the next attempt.`
  }

  // Pool progress calculation
  const poolCoveragePercent = poolSize > 0 ? Math.round((uniquePracticedTotal / poolSize) * 100) : 0
  const sessionPoolPercent = poolSize > 0 ? Math.round((total / poolSize) * 100) : 0

  return (
    <div className="results-shell">
      <PhoneFrame>
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              <AppIcon name="back" size={20} />
            </button>
            <div className="header-title">
              <h1>Test Submitted! 🎉</h1>
              <p>{subjectTitle} • {total} Questions Session</p>
            </div>
          </div>
          <button type="button" className="test-details-btn" disabled>
            <AppIcon name="testDetails" size={15} />
            Attempt Recorded
          </button>
        </header>

        <main className="content">
          {/* 1. Primary Result Hero */}
          <div className="top-row">
            <div className="card trophy-card anim" style={{ animationDelay: '0.05s' }}>
              <div className="trophy-circle">
                <AppIcon name="trophy" size={52} />
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-60px', '--ty': '-70px', '--rot': '-140deg', animationDelay: '0.15s' }}>🎉</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '65px', '--ty': '-60px', '--rot': '160deg', animationDelay: '0.25s' }}>✨</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-70px', '--ty': '40px', '--rot': '90deg', animationDelay: '0.35s' }}>🎉</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '70px', '--ty': '50px', '--rot': '-90deg', animationDelay: '0.2s' }}>⭐</span>
              </div>
              <div className="trophy-title">Great Effort!</div>
              <div className="score-big">{score}<span> / {total} Correct</span></div>
              <div className="score-pill">{accuracy}% Accuracy</div>
            </div>

            <div className="card stats-card anim" style={{ animationDelay: '0.12s' }}>
              <div className="stat-grid">
                {statItems.map((item) => (
                  <div className="stat-item" key={item.label}>
                    <div className={`stat-icon ${item.iconClass}`}>
                      <AppIcon name={item.icon} size={15} />
                    </div>
                    <div className="stat-num">{item.value}</div>
                    <div className="stat-label">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="performance-box">
                <div className="performance-top">
                  <div className="performance-label">Performance Tier</div>
                  <div className="above-pill">
                    <AppIcon name="clock" size={12} />
                    {above70 ? 'Above 70%' : 'Below 70%'}
                  </div>
                </div>
                <div className="performance-value">{performanceTier}</div>
                <div className="performance-sub">
                  {attempted > 0
                    ? `Answered ${attempted} of ${total} session questions`
                    : 'No questions attempted in session'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Key Performance Metrics Hierarchy */}
          <div className="section-title anim" style={{ animationDelay: '0.16s' }}>Performance Overview</div>
          <div className="overview-grid mb-16">
            <div className="overview-card anim" style={{ animationDelay: '0.18s' }}>
              <div className="metric-large">{accuracy}%</div>
              <div className="metric-title">Accuracy</div>
              <div className={`metric-context ${scoreDelta !== null && scoreDelta >= 0 ? 'text-green' : scoreDelta !== null ? 'text-red' : ''}`}>
                {scoreDelta !== null
                  ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}% vs previous practice`
                  : 'First practice session'}
              </div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.22s' }}>
              <div className="metric-large">{score}<span>/{total}</span></div>
              <div className="metric-title">Session Score</div>
              <div className="metric-context">{percentage}% total score</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.26s' }}>
              <div className="metric-large">{timeTaken}</div>
              <div className="metric-title">Time Elapsed</div>
              <div className="metric-context">Total session duration</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.3s' }}>
              <div className="metric-large">
                {attempted > 0 ? Math.round((attempted / total) * 100) : 0}%
              </div>
              <div className="metric-title">Attempt Rate</div>
              <div className="metric-context">{attempted} of {total} attempted</div>
            </div>
          </div>

          {/* 3. MCQ Pool vs Practice Comparison */}
          <div className="section-title anim" style={{ animationDelay: '0.32s' }}>MCQ Pool vs Practice Attempt</div>
          <div className="card pool-comparison-card mb-16 anim" style={{ animationDelay: '0.34s' }}>
            <div className="pool-comp-header">
              <div>
                <div className="pool-comp-title">Question Pool Coverage</div>
                <div className="pool-comp-sub">
                  Practiced {uniquePracticedTotal} of {poolSize} total available MCQs ({poolCoveragePercent}%)
                </div>
              </div>
              <span className="pool-badge">{poolSize} Total MCQs</span>
            </div>

            <div className="pool-bar-track">
              <div
                className="pool-bar-fill session-fill"
                style={{ width: `${Math.min(100, (total / poolSize) * 100)}%` }}
                title="Current Session"
              />
              <div
                className="pool-bar-fill practiced-fill"
                style={{ width: `${Math.min(100 - (total / poolSize) * 100, Math.max(0, poolCoveragePercent - sessionPoolPercent))}%` }}
                title="Previously Practiced"
              />
            </div>

            <div className="pool-stats-row">
              <div className="pool-stat-col">
                <span className="dot dot-purple" />
                <div>
                  <div className="pool-stat-val">{poolSize}</div>
                  <div className="pool-stat-lbl">MCQ Pool</div>
                </div>
              </div>
              <div className="pool-stat-col">
                <span className="dot dot-orange" />
                <div>
                  <div className="pool-stat-val">{total}</div>
                  <div className="pool-stat-lbl">Current Session</div>
                </div>
              </div>
              <div className="pool-stat-col">
                <span className="dot dot-green" />
                <div>
                  <div className="pool-stat-val">{uniquePracticedTotal}</div>
                  <div className="pool-stat-lbl">Total Practiced</div>
                </div>
              </div>
              <div className="pool-stat-col">
                <span className="dot dot-gray" />
                <div>
                  <div className="pool-stat-val">{remainingUnpracticed}</div>
                  <div className="pool-stat-lbl">Remaining</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Performance Comparison / Previous Attempt */}
          <div className="section-title anim" style={{ animationDelay: '0.36s' }}>Performance Comparison</div>
          <div className="card prev-comparison-card mb-16 anim" style={{ animationDelay: '0.38s' }}>
            {prevAttemptAccuracy !== null ? (
              <div className="prev-comp-grid">
                <div className="prev-box">
                  <div className="prev-lbl">Previous Practice</div>
                  <div className="prev-val">{prevAttemptAccuracy}%</div>
                </div>
                <div className="prev-arrow">➔</div>
                <div className="prev-box current">
                  <div className="prev-lbl">Current Practice</div>
                  <div className="prev-val">{accuracy}%</div>
                </div>
                <div className={`prev-delta-pill ${scoreDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                  {scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
                </div>
              </div>
            ) : (
              <div className="first-attempt-box">
                <AppIcon name="star" size={24} />
                <div>
                  <div className="first-attempt-title">First Recorded Practice Session</div>
                  <div className="first-attempt-sub">
                    Your baseline performance for this chapter is {accuracy}%. Subsequent attempts will display performance improvement comparisons here.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Strengths & 6. Topics to Improve (INFORMATIONAL ONLY — NON CLICKABLE) */}
          <div className="two-col mb-16">
            <div className="box box-strength anim non-clickable" style={{ animationDelay: '0.40s' }}>
              <h4>Your Strengths 💪</h4>
              {strengths.length > 0 ? (
                strengths.slice(0, 5).map((item) => (
                  <div className="list-row" key={item.label}>
                    <div className="list-left">
                      <span className="dot dot-green">✓</span>
                      <span className="item-label">{item.label}</span>
                    </div>
                    <span className="list-score">{item.score}</span>
                  </div>
                ))
              ) : (
                <div className="list-row">
                  <div className="list-left">
                    <span className="dot dot-green">✓</span>
                    No correct answers in this session
                  </div>
                </div>
              )}
              <div className="tip-banner tip-green">
                <AppIcon name="star" size={14} />
                Solid performance in these questions.
              </div>
            </div>

            <div className="box box-improve anim non-clickable" style={{ animationDelay: '0.42s' }}>
              <h4>Topics to Improve 🎯</h4>
              {improvements.length > 0 ? (
                improvements.slice(0, 5).map((item) => (
                  <div className="list-row" key={item.label}>
                    <div className="list-left">
                      <span className="dot dot-red">✕</span>
                      <span className="item-label">{item.label}</span>
                    </div>
                    <span className="list-score">{item.score}</span>
                  </div>
                ))
              ) : (
                <div className="list-row">
                  <div className="list-left">
                    <span className="dot dot-red">✕</span>
                    No incorrect items 🎉
                  </div>
                </div>
              )}
              <div className="tip-banner tip-red">
                <AppIcon name="trendingUp" size={14} />
                Review these items to boost future accuracy.
              </div>
            </div>
          </div>

          {/* 7. AI Learning Insight */}
          <div className="section-title anim" style={{ animationDelay: '0.44s' }}>AI Learning Insight</div>
          <div className="card ai-insight-card mb-16 anim" style={{ animationDelay: '0.46s' }}>
            <div className="ai-insight-icon">
              <AppIcon name="lightbulb" size={24} />
            </div>
            <div>
              <div className="ai-insight-title">Mentor Recommendation</div>
              <div className="ai-insight-text">{aiInsightText}</div>
            </div>
          </div>
        </main>

        {/* 8. Next Learning Action */}
        <div className="bottom-bar anim" style={{ animationDelay: '0.50s' }}>
          <button type="button" className="btn btn-primary" onClick={onReviewAnswers}>
            <AppIcon name="reviewAnswers" size={16} />
            Review Answers
          </button>
          <button type="button" className="btn" onClick={onPracticeAgain}>
            <AppIcon name="practiceAgain" size={16} />
            Practice Again
          </button>
          <button type="button" className="btn" onClick={onBackToSubjects}>
            <AppIcon name="backToSubjects" size={16} />
            Back to Subjects
          </button>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default TestResultsPage

