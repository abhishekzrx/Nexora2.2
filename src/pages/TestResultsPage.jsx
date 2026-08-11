/**
 * TestResultsPage
 * Reusable test results screen with trophy, stats, overview,
 * strengths/improve, progress trend, and quote.
 * Reproduces htmlresource/test-results.html.
 *
 * DATA BINDING:
 * Every existing field is driven by the authoritative result computed at
 * submission time and stored on `testSession`. No hardcoded/demo numbers —
 * the UI simply re-renders with the user's actual responses.
 */
import '../styles/testResults.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import ProgressRing from '../components/ui/ProgressRing'
import AppIcon from '../components/ui/AppIcon'
import { useContentRegistry } from '../data/contentRegistry'
import { testSession } from '../utils/navigation'

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function TestResultsPage({ onBack, onReviewAnswers, onPracticeAgain, onBackToSubjects, subjectKey }) {
  const registry = useContentRegistry()
  const subject = registry.subjectCatalog[subjectKey || testSession.subjectKey] || null
  const subjectTitle = subject?.title || 'Computer Networks'

  // Authoritative result computed at submission. Falls back to a safe
  // zero-state so the UI never shows NaN/undefined if reached directly.
  const result = testSession.result || {
    total: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    score: 0,
    percentage: 0,
    accuracy: 0,
  }
  const total = result.total || 0
  const attempted = result.attempted || 0
  const correct = result.correct || 0
  const incorrect = result.incorrect || 0
  const unanswered = result.unanswered || 0
  const score = result.score || 0
  const percentage = result.percentage || 0
  const accuracy = result.accuracy || 0

  // ── Stat grid (Correct / Incorrect / Unattempted / Total) ──
  const statItems = [
    { icon: 'check', iconClass: 'icon-correct', value: String(correct), label: 'Correct' },
    { icon: 'cross', iconClass: 'icon-incorrect', value: String(incorrect), label: 'Incorrect' },
    { icon: 'remove', iconClass: 'icon-unattempted', value: String(unanswered), label: 'Unattempted' },
    { icon: 'viewList', iconClass: 'icon-total', value: String(total), label: 'Total Questions' },
  ]

  // ── Strengths / Improve derived from the actual submitted questions ──
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
      improvements.push({ label: shortLabel, score: 'Unanswered' })
    }
  })

  // ── Progress trend from real attempt history ──
  const history = Array.isArray(testSession.attemptHistory) ? testSession.attemptHistory : []
  const trendData = history.map((value, i) => ({
    label: `Attempt ${i + 1}`,
    value,
  }))
  // Always end with the current attempt.
  trendData.push({ label: 'Current', value: percentage })
  const prevAttempt = history.length > 1 ? history[history.length - 2] : null
  const scoreDelta = prevAttempt !== null ? percentage - prevAttempt : null

  // ── Time taken ──
  const timeTaken = formatTime(testSession.timeTakenSeconds)

  // ── Performance tier text (derived, not hardcoded) ──
  let performanceTier = 'Keep Practicing 💪'
  if (percentage >= 90) performanceTier = 'Outstanding! 🏆'
  else if (percentage >= 75) performanceTier = 'Good 😌'
  else if (percentage >= 50) performanceTier = 'Fair 🙂'
  const above70 = percentage >= 70

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
              <p>{subjectTitle} • {total} Questions</p>
            </div>
          </div>
          <button type="button" className="test-details-btn" disabled>
            <AppIcon name="testDetails" size={15} />
            Test Details
          </button>
        </header>

        <main className="content">
          {/* Top row: trophy + performance */}
          <div className="top-row">
            <div className="card trophy-card anim" style={{ animationDelay: '0.05s' }}>
              <div className="trophy-circle">
                <AppIcon name="trophy" size={52} />
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-60px', '--ty': '-70px', '--rot': '-140deg', animationDelay: '0.15s' }}>🎉</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '65px', '--ty': '-60px', '--rot': '160deg', animationDelay: '0.25s' }}>✨</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-70px', '--ty': '40px', '--rot': '90deg', animationDelay: '0.35s' }}>🎉</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '70px', '--ty': '50px', '--rot': '-90deg', animationDelay: '0.2s' }}>⭐</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '0px', '--ty': '-90px', '--rot': '40deg', animationDelay: '0.4s' }}>🎉</span>
              </div>
              <div className="trophy-title">Great Effort! Keep Going!</div>
              <div className="score-big">{score}<span> / {total}</span></div>
              <div className="score-pill">{percentage}% Score</div>
            </div>

            <div className="card stats-card anim" style={{ animationDelay: '0.12s' }}>
              <div className="stat-grid">
                {statItems.map((item) => (
                  <div className="stat-item" key={item.label}>
                    <div className={`stat-icon ${item.iconClass}`}>
                      <AppIcon name={item.icon} size={16} />
                    </div>
                    <div className="stat-num">{item.value}</div>
                    <div className="stat-label">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="performance-box">
                <div className="performance-top">
                  <div className="performance-label">Your Performance</div>
                  <div className="above-pill">
                    <AppIcon name="clock" size={12} />
                    {above70 ? 'Above 70%' : 'Below 70%'}
                  </div>
                </div>
                <div className="performance-value">{performanceTier}</div>
                <div className="performance-sub">
                  {attempted > 0
                    ? `You answered ${attempted} of ${total} questions`
                    : 'You did not attempt any questions'}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="section-title anim" style={{ animationDelay: '0.16s' }}>Performance Overview</div>
          <div className="overview-grid mb-16">
            <div className="overview-card anim" style={{ animationDelay: '0.18s' }}>
              <h3>Accuracy</h3>
              <ProgressRing size={96} radius={42} strokeWidth={9} progress={accuracy} trackColor="#EAECF0" fillColor="#12B76A">
                <div className="ring-value">{accuracy}%</div>
              </ProgressRing>
              {scoreDelta !== null ? (
                <div className={`overview-delta ${scoreDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                  <AppIcon name={scoreDelta >= 0 ? 'trendingUp' : 'trendingDown'} size={14} />
                  {Math.abs(scoreDelta)}%
                </div>
              ) : (
                <div className="overview-delta delta-up">
                  <AppIcon name="trendingUp" size={14} />
                  0%
                </div>
              )}
              <div className="overview-compare">
                {prevAttempt !== null ? `vs Last Attempt (${prevAttempt}%)` : 'First attempt'}
              </div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.22s' }}>
              <h3>Score</h3>
              <ProgressRing size={96} radius={42} strokeWidth={9} progress={percentage} trackColor="#EDE6FC" fillColor="#7C3AED">
                <div className="ring-value">{score}<span>/{total}</span></div>
              </ProgressRing>
              {scoreDelta !== null ? (
                <div className={`overview-delta ${scoreDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                  <AppIcon name={scoreDelta >= 0 ? 'trendingUp' : 'trendingDown'} size={14} />
                  {Math.abs(scoreDelta)}
                </div>
              ) : (
                <div className="overview-delta delta-up">
                  <AppIcon name="trendingUp" size={14} />
                  0
                </div>
              )}
              <div className="overview-compare">
                {prevAttempt !== null ? `vs Last Attempt (${prevAttempt}%)` : 'First attempt'}
              </div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.26s' }}>
              <h3>Time Taken</h3>
              <div className="clock-icon-wrap">
                <AppIcon name="clock" size={32} />
              </div>
              <div className="time-value">{timeTaken}</div>
              <div className="overview-compare">Total time for this attempt</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.3s' }}>
              <h3>Rank</h3>
              <div className="medal-icon-wrap">
                <AppIcon name="medal" size={40} />
              </div>
              <div className="rank-value">
                {percentage >= 90 ? '🥇' : percentage >= 75 ? '🥈' : percentage >= 50 ? '🥉' : '—'}
              </div>
              <div className="rank-sub">
                {history.length > 1 ? `of ${history.length} attempts` : 'First attempt'}
              </div>
            </div>
          </div>

          {/* Strengths / Improve */}
          <div className="two-col mb-16">
            <div className="box box-strength anim" style={{ animationDelay: '0.34s' }}>
              <h4>Your Strengths 💪</h4>
              {strengths.length > 0 ? (
                strengths.map((item) => (
                  <div className="list-row" key={item.label}>
                    <div className="list-left">
                      <span className="dot dot-green">
                        <AppIcon name="check" size={10} />
                      </span>
                      {item.label}
                    </div>
                    <span className="list-score">{item.score}</span>
                  </div>
                ))
              ) : (
                <div className="list-row">
                  <div className="list-left">
                    <span className="dot dot-green">
                      <AppIcon name="check" size={10} />
                    </span>
                    No correct answers yet
                  </div>
                </div>
              )}
              <div className="tip-banner tip-green">
                <AppIcon name="star" size={14} />
                Keep it up! You're doing great in these topics.
              </div>
            </div>

            <div className="box box-improve anim" style={{ animationDelay: '0.38s' }}>
              <h4>Topics to Improve 🎯</h4>
              {improvements.length > 0 ? (
                improvements.map((item) => (
                  <div className="list-row" key={item.label}>
                    <div className="list-left">
                      <span className="dot dot-red">
                        <AppIcon name="cross" size={10} />
                      </span>
                      {item.label}
                    </div>
                    <span className="list-score">{item.score}</span>
                  </div>
                ))
              ) : (
                <div className="list-row">
                  <div className="list-left">
                    <span className="dot dot-red">
                      <AppIcon name="cross" size={10} />
                    </span>
                    Nothing to improve 🎉
                  </div>
                </div>
              )}
              <div className="tip-banner tip-red">
                <AppIcon name="trendingUp" size={14} />
                Focus on these topics to boost your score in the next attempt.
              </div>
            </div>
          </div>

          {/* Progress Trend */}
          <div className="section-title anim" style={{ animationDelay: '0.42s' }}>Your Progress Trend</div>
          <div className="progress-card mb-16 anim" style={{ animationDelay: '0.46s' }}>
            <div className="chart-wrap">
              <div className="trend-chart">
                {trendData.map((point, index) => {
                  const max = 100
                  const height = (point.value / max) * 100
                  return (
                    <div className="trend-point" key={point.label} style={{ left: `${(index / Math.max(1, trendData.length - 1)) * 100}%`, bottom: `${height}%` }}>
                      <span className="trend-value">{point.value}%</span>
                      <span className="trend-dot" />
                      <span className="trend-label">{point.label}</span>
                    </div>
                  )
                })}
                <div className="trend-line" />
              </div>
            </div>
            <div className="improve-panel">
              <div>
                <div className="improve-title">
                  {scoreDelta !== null && scoreDelta > 0
                    ? 'You are improving! 🎉'
                    : 'Keep going! 💪'}
                </div>
                <div className="improve-text">
                  {scoreDelta !== null && scoreDelta > 0
                    ? `Your score improved by ${scoreDelta}% from your last attempt.`
                    : scoreDelta !== null
                      ? `Your score changed by ${Math.abs(scoreDelta)}% from your last attempt.`
                      : 'This is your first recorded attempt.'}
                </div>
              </div>
              <div className="improve-arrow">
                <AppIcon name="trendingUp" size={30} />
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="quote-card mb-16 anim" style={{ animationDelay: '0.5s' }}>
            <div className="quote-mark">”</div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="quote-text">The expert at anything was once a beginner. Keep learning, keep growing!</div>
              <div className="quote-author">– Helen Hayes</div>
            </div>
            <div className="quote-mountain">🏔️</div>
          </div>
        </main>

        {/* Bottom bar */}
        <div className="bottom-bar anim" style={{ animationDelay: '0.54s' }}>
          <button type="button" className="btn" onClick={onReviewAnswers}>
            <AppIcon name="reviewAnswers" size={15} />
            Review Answers
          </button>
          <button type="button" className="btn" onClick={onPracticeAgain}>
            <AppIcon name="practiceAgain" size={15} />
            Practice Again
          </button>
          <button type="button" className="btn btn-primary" onClick={onBackToSubjects}>
            <AppIcon name="backToSubjects" size={15} />
            Back to Subjects
          </button>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default TestResultsPage
