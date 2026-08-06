/**
 * PracticeHubPage
 * Premium Practice Hub — the student's primary entry point for continuing
 * learning. Surfaces unfinished sessions, intelligent recommendations,
 * weak topics, recent practice, quick actions, stats and full history.
 *
 * Section order (never changes):
 *   1. Continue Learning (hero card)
 *   2. Today's Recommended Practice
 *   3. Weak Topic Practice
 *   4. Recent Practice
 *   5. Quick Practice
 *   6. Practice Statistics
 *   7. Practice History
 */
import { useMemo, useState } from 'react'
import '../styles/practiceHub.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import AppIcon from '../components/ui/AppIcon'
import ProgressRing from '../components/ui/ProgressRing'
import { useContentRegistry } from '../data/contentRegistry'
import { usePracticeStore } from '../data/practiceStore'

// ── Status meta ────────────────────────────────────────────────────
const STATUS_META = {
  'in-progress': { label: 'In Progress', cls: 'st-inprogress' },
  completed: { label: 'Completed', cls: 'st-completed' },
  paused: { label: 'Paused', cls: 'st-paused' },
  failed: { label: 'Failed', cls: 'st-failed' },
  mastered: { label: 'Mastered', cls: 'st-mastered' },
  locked: { label: 'Locked', cls: 'st-locked' },
  new: { label: 'New', cls: 'st-new' },
}

const TYPE_LABEL = {
  mcq: 'MCQ',
  flashcards: 'Flashcards',
  revision: 'Revision',
  mock: 'Mock Test',
}

// ── Section header ─────────────────────────────────────────────────
function HubSectionHeader({ title, icon, actionLabel, onAction }) {
  return (
    <div className="hub-section-header">
      <div className="hub-section-title">
        {icon ? (
          <span className="hub-section-icon" aria-hidden="true">
            <AppIcon name={icon} size={15} />
          </span>
        ) : null}
        {title}
      </div>
      {actionLabel ? (
        <button type="button" className="hub-section-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

// ── 1. Continue Learning hero ──────────────────────────────────────
function ContinueHero({ session, onResume }) {
  if (!session) return null

  return (
    <section className="hub-hero anim" style={{ animationDelay: '0.02s' }}>
      <div className="hub-hero-glow" aria-hidden="true" />
      <div className="hub-hero-top">
        <div className="hub-hero-title-row">
          <span className="hub-hero-icon" aria-hidden="true">
            <AppIcon name={session.icon} size={20} />
          </span>
          <div>
            <div className="hub-hero-kicker">CONTINUE LEARNING</div>
            <div className="hub-hero-subject">{session.subjectTitle}</div>
          </div>
        </div>
        <span className={`hub-status ${STATUS_META[session.status]?.cls || 'st-new'}`}>
          {STATUS_META[session.status]?.label || 'New'}
        </span>
      </div>

      <div className="hub-hero-chapter">{session.chapterName}</div>

      <div className="hub-hero-body">
        <div className="hub-hero-ring">
          <ProgressRing
            size={86}
            radius={37}
            strokeWidth={8}
            progress={session.progress}
            trackColor="rgba(255,255,255,0.16)"
            fillColor="#F1621B"
          >
            <div className="hub-hero-pct">{session.progress}%</div>
          </ProgressRing>
        </div>

        <div className="hub-hero-copy">
          <div className="hub-hero-q">Question {session.currentQuestion} / {session.totalQuestions}</div>
          <div className="hub-hero-complete">{session.progress}% Complete</div>
          <div className="hub-hero-meta">
            <span>
              <AppIcon name="clock" size={12} />
              {session.estRemaining} Remaining
            </span>
            <span>Last {session.lastAttempt}</span>
          </div>
        </div>
      </div>

      <div className="hub-hero-track">
        <div
          className="hub-hero-track-fill"
          style={{ width: `${session.progress}%` }}
        />
      </div>

      <button type="button" className="hub-hero-btn" onClick={() => onResume(session)}>
        Continue Practice
        <AppIcon name="arrowForward" size={16} />
      </button>
    </section>
  )
}

// ── 2. Recommendation card ─────────────────────────────────────────
function RecommendationCard({ rec, onSelect }) {
  return (
    <button
      type="button"
      className={`hub-rec anim ${rec.tone}`}
      style={{ animationDelay: '0.06s' }}
      onClick={() => onSelect(rec)}
    >
      <span className="hub-rec-icon" aria-hidden="true">
        <AppIcon name={rec.icon} size={18} />
      </span>
      <span className="hub-rec-body">
        <span className="hub-rec-title">{rec.title}</span>
        <span className="hub-rec-insight">{rec.insight}</span>
      </span>
      <span className="hub-rec-cta">
        {rec.cta}
        <AppIcon name="arrowForward" size={13} />
      </span>
    </button>
  )
}

// ── 3. Weak topic card ─────────────────────────────────────────────
function WeakTopicCard({ topic, onPractice }) {
  return (
    <div className={`hub-weak anim ${topic.tone}`} style={{ animationDelay: '0.08s' }}>
      <div className="hub-weak-top">
        <div>
          <div className="hub-weak-subject">{topic.subjectTitle}</div>
          <div className="hub-weak-chapter">{topic.chapterName}</div>
        </div>
        <div className="hub-weak-accuracy">
          <div className="hub-weak-acc-num">{topic.accuracy}%</div>
          <div className="hub-weak-acc-label">Current Accuracy</div>
        </div>
      </div>
      <div className="hub-weak-track">
        <div className="hub-weak-track-fill" style={{ width: `${topic.accuracy}%` }} />
      </div>
      <div className="hub-weak-bottom">
        <div className="hub-weak-gains">
          <span className="hub-weak-opp">{topic.opportunity}</span>
          <span className="hub-weak-readiness">
            Readiness <b>{topic.readinessGain}</b>
          </span>
        </div>
        <button type="button" className="hub-weak-btn" onClick={() => onPractice(topic)}>
          Practice Now
        </button>
      </div>
    </div>
  )
}

// ── 4. Recent practice card ────────────────────────────────────────
function RecentPracticeCard({ session, onResume, onReview }) {
  const meta = STATUS_META[session.status] || STATUS_META.new
  const isActionable = session.status === 'in-progress' || session.status === 'paused'

  return (
    <div className={`hub-recent anim ${session.tone || ''}`} style={{ animationDelay: '0.1s' }}>
      <div className="hub-recent-top">
        <span className="hub-recent-icon" aria-hidden="true">
          <AppIcon name={session.icon} size={16} />
        </span>
        <div className="hub-recent-titles">
          <div className="hub-recent-subject">{session.subjectTitle}</div>
          <div className="hub-recent-chapter">{session.chapterName}</div>
        </div>
        <span className={`hub-status ${meta.cls}`}>{meta.label}</span>
      </div>

      <div className="hub-recent-track">
        <div className="hub-recent-track-fill" style={{ width: `${session.progress}%` }} />
      </div>

      <div className="hub-recent-meta">
        <span>{TYPE_LABEL[session.type] || session.type}</span>
        <span>Accuracy {session.accuracy}%</span>
        <span>Score {session.score}</span>
        <span>
          <AppIcon name="clock" size={11} />
          {session.timeTaken}
        </span>
        <span>{session.date}</span>
        <span>{session.lastAttempt}</span>
      </div>

      <div className="hub-recent-actions">
        {isActionable ? (
          <button type="button" className="hub-recent-btn primary" onClick={() => onResume(session)}>
            Continue
            <AppIcon name="arrowForward" size={13} />
          </button>
        ) : (
          <button type="button" className="hub-recent-btn" onClick={() => onReview(session)}>
            Review
            <AppIcon name="reviewAnswers" size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── 5. Quick action card ───────────────────────────────────────────
function QuickActionCard({ action, onSelect }) {
  return (
    <button
      type="button"
      className={`hub-quick anim ${action.tone}`}
      style={{ animationDelay: '0.12s' }}
      onClick={() => onSelect(action)}
    >
      <span className="hub-quick-icon" aria-hidden="true">
        <AppIcon name={action.icon} size={18} />
      </span>
      <span className="hub-quick-label">{action.label}</span>
      <span className="hub-quick-desc">{action.desc}</span>
    </button>
  )
}

// ── 6. Stats grid ──────────────────────────────────────────────────
function StatTile({ icon, value, label, sub, tone = 'orange', progress }) {
  return (
    <div className={`hub-stat-tile ${tone}`}>
      <div className="hub-stat-top">
        <span className="hub-stat-icon" aria-hidden="true">
          <AppIcon name={icon} size={15} />
        </span>
        {sub ? <span className="hub-stat-sub">{sub}</span> : null}
      </div>
      <div className="hub-stat-value">{value}</div>
      <div className="hub-stat-label">{label}</div>
      {progress ? (
        <div className="hub-stat-track">
          <div className="hub-stat-track-fill" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function StatsSection({ stats }) {
  return (
    <section className="hub-stats">
      <div className="hub-stats-grid">
        <StatTile
          icon="quiz"
          value={stats.todayQuestions}
          label="Questions Today"
          sub={`Target ${stats.todayTarget}`}
          tone="orange"
          progress={(stats.todayQuestions / stats.todayTarget) * 100}
        />
        <StatTile
          icon="target"
          value={`${stats.accuracy}%`}
          label="Current Accuracy"
          sub={stats.accuracyDelta}
          tone="green"
        />
        <StatTile
          icon="clock"
          value={stats.studyTime}
          label="Study Time"
          tone="blue"
        />
        <StatTile
          icon="streak"
          value={stats.streak}
          label="Day Streak"
          tone="purple"
        />
        <StatTile
          icon="trendingUp"
          value={`${stats.weeklyProgress}%`}
          label="Weekly Progress"
          sub={`Goal ${stats.weeklyGoal}%`}
          tone="teal"
          progress={(stats.weeklyProgress / stats.weeklyGoal) * 100}
        />
      </div>
    </section>
  )
}

// ── 7. History — search / filter / sort / list ─────────────────────
function HistorySection({
  sessions,
  filters,
  search,
  setSearch,
  subjectFilter,
  setSubjectFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  onResume,
  onReview,
}) {
  const filtered = useMemo(() => {
    let list = [...sessions]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.subjectTitle.toLowerCase().includes(q) ||
          s.chapterName.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q),
      )
    }
    if (subjectFilter !== 'All Subjects') {
      list = list.filter((s) => s.subjectTitle === subjectFilter)
    }
    if (typeFilter !== 'All Types') {
      list = list.filter((s) => TYPE_LABEL[s.type] === typeFilter)
    }
    if (statusFilter !== 'All Statuses') {
      list = list.filter((s) => STATUS_META[s.status]?.label === statusFilter)
    }

    switch (sortBy) {
      case 'Oldest':
        list.sort((a, b) => a.lastPracticed - b.lastPracticed)
        break
      case 'Accuracy':
        list.sort((a, b) => b.accuracy - a.accuracy)
        break
      case 'Score':
        list.sort((a, b) => b.answered - a.answered)
        break
      default:
        list.sort((a, b) => b.lastPracticed - a.lastPracticed)
    }

    return list
  }, [sessions, search, subjectFilter, typeFilter, statusFilter, sortBy])

  return (
    <section className="hub-history">
      <HubSectionHeader title="Practice History" icon="viewList" />

      <div className="hub-history-search">
        <span className="hub-history-search-icon" aria-hidden="true">
          <AppIcon name="search" size={15} />
        </span>
        <input
          type="search"
          className="hub-history-input"
          placeholder="Search practice sessions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="hub-history-filters">
        <label className="hub-filter">
          <span className="hub-filter-label">Subject</span>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            {filters.subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="hub-filter">
          <span className="hub-filter-label">Type</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {filters.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="hub-filter">
          <span className="hub-filter-label">Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {filters.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="hub-filter">
          <span className="hub-filter-label">Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {filters.sortBy.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="hub-history-empty">
          <AppIcon name="search" size={26} />
          <p>No sessions found for your filters.</p>
        </div>
      ) : (
        <div className="hub-history-list">
          {filtered.map((session) => {
            const meta = STATUS_META[session.status] || STATUS_META.new
            const isActionable = session.status === 'in-progress' || session.status === 'paused'
            return (
              <div className="hub-history-row anim" key={session.id} style={{ animationDelay: '0.05s' }}>
                <div className="hub-history-row-top">
                  <span className="hub-history-icon" aria-hidden="true">
                    <AppIcon name={session.icon} size={15} />
                  </span>
                  <div className="hub-history-titles">
                    <div className="hub-history-subject">{session.subjectTitle}</div>
                    <div className="hub-history-chapter">{session.chapterName}</div>
                  </div>
                  <span className={`hub-status ${meta.cls}`}>{meta.label}</span>
                </div>
                <div className="hub-history-row-meta">
                  <span>{TYPE_LABEL[session.type] || session.type}</span>
                  <span>Accuracy {session.accuracy}%</span>
                  <span>Score {session.score}</span>
                  <span>{session.date}</span>
                </div>
                <div className="hub-history-row-actions">
                  <button
                    type="button"
                    className="hub-recent-btn"
                    onClick={() => (isActionable ? onResume(session) : onReview(session))}
                  >
                    <AppIcon name={isActionable ? 'arrowForward' : 'reviewAnswers'} size={13} />
                    {isActionable ? 'Continue' : 'Review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyHistory({ onStart }) {
  return (
    <div className="hub-empty">
      <div className="hub-empty-art" aria-hidden="true">
        <AppIcon name="quiz" size={38} />
        <span className="hub-empty-spark">✦</span>
      </div>
      <div className="hub-empty-title">Start your first practice session</div>
      <div className="hub-empty-sub">to begin tracking your progress.</div>
      <button type="button" className="hub-empty-btn" onClick={onStart}>
        <AppIcon name="practice" size={16} />
        Start Practicing
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────
function PracticeHubPage({
  onNavigateHome = () => {},
  onOpenSubject = () => {},
  onResume = () => {},
  onStartPractice = () => {},
}) {
  const registry = useContentRegistry()
  const store = usePracticeStore()

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [sortBy, setSortBy] = useState('Newest')

  const continueSession = store.sessions.find(
    (s) => s.status === 'in-progress' || s.status === 'paused',
  ) || null

  const recentSessions = useMemo(
    () => [...store.sessions].sort((a, b) => b.lastPracticed - a.lastPracticed).slice(0, 3),
    [store.sessions],
  )

  const handleResume = (session) => onResume(session)
  const handleReview = (session) => onResume(session)

  const handleRecSelect = (rec) => onOpenSubject(rec.subjectKey)
  const handleWeakPractice = (topic) => onOpenSubject(topic.subjectKey)
  const handleQuickSelect = (action) => {
    if (action.id === 'qa-1') onStartPractice('random')
    else if (action.id === 'qa-2') onStartPractice('weak')
    else if (action.id === 'qa-3') onStartPractice('revision')
    else if (action.id === 'qa-4') onStartPractice('flashcards')
    else onOpenSubject(registry.subjectsList[0]?.subjectKey)
  }

  return (
    <div className="hub-shell">
      <PhoneFrame>
        <header className="header hub-header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onNavigateHome} aria-label="Go home">
              <AppIcon name="back" size={20} />
            </button>
            <div className="header-title">Practice</div>
          </div>
          <div className="header-right">
            <button type="button" className="header-icon header-notify" aria-label="Notifications" disabled>
              <AppIcon name="notifications" size={19} />
              <span className="bell-badge">3</span>
            </button>
            <div className="avatar" aria-hidden="true">
              <AppIcon name="profile" size={20} />
            </div>
          </div>
        </header>

        <main className="content hub-content">
          <div className="hub-greeting">
            <div className="hub-greeting-title">Practice Hub</div>
            <div className="hub-greeting-sub">
              {continueSession
                ? 'Resume where you left off and keep the momentum going.'
                : 'Pick up right where you stopped — your next best session is one tap away.'}
            </div>
          </div>

          {/* 1. Continue Learning */}
          <ContinueHero session={continueSession} onResume={handleResume} />

          {/* 2. Today's Recommended Practice */}
          <section className="hub-rec-list">
            <HubSectionHeader title="Today's Recommended" icon="lightbulb" />
            {store.recommendations.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onSelect={handleRecSelect} />
            ))}
          </section>

          {/* 3. Weak Topic Practice */}
          <section className="hub-weak-list">
            <HubSectionHeader title="Weak Topic Practice" icon="target" />
            {store.weakTopics.map((topic) => (
              <WeakTopicCard key={topic.id} topic={topic} onPractice={handleWeakPractice} />
            ))}
          </section>

          {/* 4. Recent Practice */}
          {recentSessions.length > 0 ? (
            <section className="hub-recent-list">
              <HubSectionHeader title="Recent Practice" icon="clock" />
              {recentSessions.map((session) => (
                <RecentPracticeCard
                  key={session.id}
                  session={session}
                  onResume={handleResume}
                  onReview={handleReview}
                />
              ))}
            </section>
          ) : null}

          {/* 5. Quick Practice */}
          <section className="hub-quick-list">
            <HubSectionHeader title="Quick Practice" icon="quickJump" />
            <div className="hub-quick-grid">
              {store.quickActions.map((action) => (
                <QuickActionCard key={action.id} action={action} onSelect={handleQuickSelect} />
              ))}
            </div>
          </section>

          {/* 6. Practice Statistics */}
          <section className="hub-stats-section">
            <HubSectionHeader title="Practice Statistics" icon="analytics" />
            <StatsSection stats={store.stats} />
          </section>

          {/* 7. Practice History */}
          {store.sessions.length > 0 ? (
            <HistorySection
              sessions={store.sessions}
              filters={store.historyFilters}
              search={search}
              setSearch={setSearch}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onResume={handleResume}
              onReview={handleReview}
            />
          ) : (
            <EmptyHistory onStart={() => handleQuickSelect(store.quickActions[0])} />
          )}
        </main>
      </PhoneFrame>
    </div>
  )
}

export default PracticeHubPage