/**
 * TestResultsPage
 * Reusable test results screen with trophy, stats, overview,
 * strengths/improve, progress trend, and quote.
 * Reproduces htmlresource/test-results.html.
 */
import '../styles/testResults.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import ProgressRing from '../components/ui/ProgressRing'

const statItems = [
  { icon: '✓', iconClass: 'icon-correct', value: '15', label: 'Correct' },
  { icon: '✕', iconClass: 'icon-incorrect', value: '3', label: 'Incorrect' },
  { icon: '–', iconClass: 'icon-unattempted', value: '2', label: 'Unattempted' },
  { icon: '☰', iconClass: 'icon-total', value: '20', label: 'Total Questions' },
]

const strengths = [
  { label: 'OSI Model Layers', score: '9/10' },
  { label: 'TCP/IP Protocol Suite', score: '8/10' },
  { label: 'Network Topologies', score: '7/8' },
  { label: 'IP Addressing', score: '6/7' },
]

const improvements = [
  { label: 'Transport Layer Protocols', score: '2/5' },
  { label: 'Error Detection & Correction', score: '1/4' },
  { label: 'Routing Algorithms', score: '1/3' },
]

const trendData = [
  { label: 'Attempt 1', value: 45 },
  { label: 'Attempt 2', value: 60 },
  { label: 'Attempt 3', value: 63 },
  { label: 'Current', value: 75 },
]

function TestResultsPage({ onBack, onReviewAnswers, onPracticeAgain, onBackToSubjects }) {
  return (
    <div className="results-shell">
      <PhoneFrame>
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              ←
            </button>
            <div className="header-title">
              <h1>Test Submitted! 🎉</h1>
              <p>Computer Networks • 20 Questions</p>
            </div>
          </div>
          <button type="button" className="test-details-btn">📄 Test Details</button>
        </header>

        <main className="content">
          {/* Top row: trophy + performance */}
          <div className="top-row">
            <div className="card trophy-card anim" style={{ animationDelay: '0.05s' }}>
              <div className="trophy-circle">
                🏆
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-60px', '--ty': '-70px', '--rot': '-140deg', animationDelay: '0.15s' }}>🎉</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '65px', '--ty': '-60px', '--rot': '160deg', animationDelay: '0.25s' }}>✨</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '-70px', '--ty': '40px', '--rot': '90deg', animationDelay: '0.35s' }}>🎊</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '70px', '--ty': '50px', '--rot': '-90deg', animationDelay: '0.2s' }}>⭐</span>
                <span className="confetti-piece" style={{ top: '40%', left: '50%', '--tx': '0px', '--ty': '-90px', '--rot': '40deg', animationDelay: '0.4s' }}>🎉</span>
              </div>
              <div className="trophy-title">Great Effort! Keep Going!</div>
              <div className="score-big">15<span> / 20</span></div>
              <div className="score-pill">75% Score</div>
            </div>

            <div className="card stats-card anim" style={{ animationDelay: '0.12s' }}>
              <div className="stat-grid">
                {statItems.map((item) => (
                  <div className="stat-item" key={item.label}>
                    <div className={`stat-icon ${item.iconClass}`}>{item.icon}</div>
                    <div className="stat-num">{item.value}</div>
                    <div className="stat-label">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="performance-box">
                <div className="performance-top">
                  <div className="performance-label">Your Performance</div>
                  <div className="above-pill">⏱ Above 70%</div>
                </div>
                <div className="performance-value">Good 😌</div>
                <div className="performance-sub">You scored better than <b>68%</b> of learners</div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="section-title anim" style={{ animationDelay: '0.16s' }}>Performance Overview</div>
          <div className="overview-grid mb-16">
            <div className="overview-card anim" style={{ animationDelay: '0.18s' }}>
              <h3>Accuracy</h3>
              <ProgressRing size={96} radius={42} strokeWidth={9} progress={75} trackColor="#EAECF0" fillColor="#12B76A">
                <div className="ring-value">75%</div>
              </ProgressRing>
              <div className="overview-delta delta-up">↑ 12%</div>
              <div className="overview-compare">vs Last Attempt (63%)</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.22s' }}>
              <h3>Score</h3>
              <ProgressRing size={96} radius={42} strokeWidth={9} progress={75} trackColor="#EDE6FC" fillColor="#7C3AED">
                <div className="ring-value">15<span>/20</span></div>
              </ProgressRing>
              <div className="overview-delta delta-up">↑ 3</div>
              <div className="overview-compare">vs Last Attempt (12/20)</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.26s' }}>
              <h3>Time Taken</h3>
              <div className="clock-icon-wrap">🕐</div>
              <div className="time-value">00:29:45</div>
              <div className="overview-delta delta-down">↓ 02:15</div>
              <div className="overview-compare">vs Last Attempt (00:27:30)</div>
            </div>

            <div className="overview-card anim" style={{ animationDelay: '0.3s' }}>
              <h3>Rank</h3>
              <div className="medal-icon-wrap">🏅</div>
              <div className="rank-value">#28</div>
              <div className="rank-sub">of 120 Learners</div>
              <div className="overview-delta delta-up">↑ 15</div>
              <div className="overview-compare">vs Last Attempt (#43)</div>
            </div>
          </div>

          {/* Strengths / Improve */}
          <div className="two-col mb-16">
            <div className="box box-strength anim" style={{ animationDelay: '0.34s' }}>
              <h4>Your Strengths 💪</h4>
              {strengths.map((item) => (
                <div className="list-row" key={item.label}>
                  <div className="list-left"><span className="dot dot-green">✓</span>{item.label}</div>
                  <span className="list-score">{item.score}</span>
                </div>
              ))}
              <div className="tip-banner tip-green">
                ⭐ Keep it up! You're doing great in these topics.
              </div>
            </div>

            <div className="box box-improve anim" style={{ animationDelay: '0.38s' }}>
              <h4>Topics to Improve 🎯</h4>
              {improvements.map((item) => (
                <div className="list-row" key={item.label}>
                  <div className="list-left"><span className="dot dot-red">✕</span>{item.label}</div>
                  <span className="list-score">{item.score}</span>
                </div>
              ))}
              <div className="tip-banner tip-red">
                📈 Focus on these topics to boost your score in the next attempt.
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
                    <div className="trend-point" key={point.label} style={{ left: `${(index / (trendData.length - 1)) * 100}%`, bottom: `${height}%` }}>
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
                <div className="improve-title">You are improving! 🎉</div>
                <div className="improve-text">Your score has improved by 30% from your first attempt.</div>
              </div>
              <div className="improve-arrow">↗</div>
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
          <button type="button" className="btn" onClick={onReviewAnswers}>📄 Review Answers</button>
          <button type="button" className="btn" onClick={onPracticeAgain}>🔄 Practice Again</button>
          <button type="button" className="btn btn-primary" onClick={onBackToSubjects}>→ Back to Subjects</button>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default TestResultsPage