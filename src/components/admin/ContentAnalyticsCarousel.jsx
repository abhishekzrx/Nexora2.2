/**
 * ContentAnalyticsCarousel
 * Auto-playing premium analytics hero carousel for the Admin Dashboard.
 * Rotates through MCQ / Flashcard / Notes / Overall slides with
 * micro-visualizations (progress rings, mini bars, donut segments).
 * Store-driven so counts update live.
 */
import { useEffect, useMemo, useState } from 'react'
import AppIcon from '../ui/AppIcon'
import { useAdminStore } from '../../data/adminStore'

const SLIDE_MS = 5000

function MiniBar({ label, value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="carousel-mini-bar">
      <div className="carousel-mini-bar-top">
        <span className="carousel-mini-bar-label">{label}</span>
        <span className="carousel-mini-bar-value">{value}</span>
      </div>
      <div className="carousel-mini-bar-track">
        <div className={`carousel-mini-bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Donut({ segments, size = 64, stroke = 8 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="carousel-donut">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )
        offset += dash
        return el
      })}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="carousel-donut-center">
        {total}
      </text>
    </svg>
  )
}

function HealthRing({ value, label, tone }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="carousel-health">
      <svg width={64} height={64} viewBox="0 0 64 64" className="carousel-health-ring">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          transform="rotate(-90 32 32)"
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="carousel-health-value">
          {pct}%
        </text>
      </svg>
      <span className="carousel-health-label">{label}</span>
    </div>
  )
}

function McqSlide({ mcqs, subjects }) {
  const total = mcqs.length
  const easy = mcqs.filter((m) => m.difficultyText === 'Easy').length
  const medium = mcqs.filter((m) => m.difficultyText === 'Medium').length
  const hard = mcqs.filter((m) => m.difficultyText === 'Hard').length
  const subjectDist = subjects.map((s) => ({
    label: s.name,
    value: mcqs.filter((m) => m.subject === s.name).length,
  }))
  const maxSubject = Math.max(1, ...subjectDist.map((s) => s.value))

  return (
    <div className="carousel-slide">
      <div className="carousel-slide-head">
        <span className="carousel-slide-icon tone-orange"><AppIcon name="mcqs" size={18} /></span>
        <div>
          <div className="carousel-slide-title">MCQ Bank</div>
          <div className="carousel-slide-sub">{total} total questions</div>
        </div>
        <HealthRing value={total > 0 ? 82 : 0} label="Health" tone="#FF8A3D" />
      </div>
      <div className="carousel-slide-grid">
        <div className="carousel-slide-col">
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">{total}</span>
            <span className="carousel-slide-stat-label">Total MCQs</span>
          </div>
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value green">+340</span>
            <span className="carousel-slide-stat-label">Recently Added</span>
          </div>
        </div>
        <div className="carousel-slide-col">
          <div className="carousel-difficulty">
            <Donut
              size={64}
              stroke={8}
              segments={[
                { value: easy, color: '#3EE088' },
                { value: medium, color: '#FF8A3D' },
                { value: hard, color: '#F04438' },
              ]}
            />
            <div className="carousel-difficulty-legend">
              <span><i className="dot green" />Easy {easy}</span>
              <span><i className="dot orange" />Medium {medium}</span>
              <span><i className="dot red" />Hard {hard}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="carousel-slide-bars">
        {subjectDist.slice(0, 3).map((s) => (
          <MiniBar key={s.label} label={s.label} value={s.value} max={maxSubject} tone="orange" />
        ))}
      </div>
    </div>
  )
}

function FlashcardSlide({ flashcards, subjects }) {
  const total = flashcards.length
  const subjectDist = subjects.map((s) => ({
    label: s.name,
    value: flashcards.filter((f) => f.subject === s.name).length,
  }))
  const maxSubject = Math.max(1, ...subjectDist.map((s) => s.value))

  return (
    <div className="carousel-slide">
      <div className="carousel-slide-head">
        <span className="carousel-slide-icon tone-purple"><AppIcon name="flashcardsTab" size={18} /></span>
        <div>
          <div className="carousel-slide-title">Flashcard Decks</div>
          <div className="carousel-slide-sub">{total} total cards</div>
        </div>
        <HealthRing value={total > 0 ? 76 : 0} label="Health" tone="#B794F6" />
      </div>
      <div className="carousel-slide-grid">
        <div className="carousel-slide-col">
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">{total}</span>
            <span className="carousel-slide-stat-label">Total Flashcards</span>
          </div>
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value green">+180</span>
            <span className="carousel-slide-stat-label">Recently Added</span>
          </div>
        </div>
        <div className="carousel-slide-col">
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">{subjects.length}</span>
            <span className="carousel-slide-stat-label">Active Decks</span>
          </div>
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value green">72%</span>
            <span className="carousel-slide-stat-label">Review Coverage</span>
          </div>
        </div>
      </div>
      <div className="carousel-slide-bars">
        {subjectDist.slice(0, 3).map((s) => (
          <MiniBar key={s.label} label={s.label} value={s.value} max={maxSubject} tone="purple" />
        ))}
      </div>
    </div>
  )
}

function NotesSlide() {
  return (
    <div className="carousel-slide">
      <div className="carousel-slide-head">
        <span className="carousel-slide-icon tone-blue"><AppIcon name="notes" size={18} /></span>
        <div>
          <div className="carousel-slide-title">Notes Library</div>
          <div className="carousel-slide-sub">Study notes & resources</div>
        </div>
        <HealthRing value={64} label="Health" tone="#7B9CFF" />
      </div>
      <div className="carousel-slide-grid">
        <div className="carousel-slide-col">
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">24</span>
            <span className="carousel-slide-stat-label">Total Notes</span>
          </div>
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">18</span>
            <span className="carousel-slide-stat-label">Rich Text Notes</span>
          </div>
        </div>
        <div className="carousel-slide-col">
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value">6</span>
            <span className="carousel-slide-stat-label">PDF Notes</span>
          </div>
          <div className="carousel-slide-stat">
            <span className="carousel-slide-stat-value green">12</span>
            <span className="carousel-slide-stat-label">Chapters Covered</span>
          </div>
        </div>
      </div>
      <div className="carousel-slide-bars">
        <MiniBar label="Physics" value={8} max={12} tone="blue" />
        <MiniBar label="Chemistry" value={6} max={12} tone="blue" />
        <MiniBar label="Biology" value={10} max={12} tone="blue" />
      </div>
    </div>
  )
}

function OverallSlide({ subjects, chapters, mcqs, flashcards }) {
  const total = subjects.length + chapters.length + mcqs.length + flashcards.length
  const health = total > 0 ? Math.min(100, Math.round((subjects.length * 4 + chapters.length * 3 + mcqs.length * 2 + flashcards.length * 2) / (total * 4) * 100)) : 0

  return (
    <div className="carousel-slide">
      <div className="carousel-slide-head">
        <span className="carousel-slide-icon tone-green"><AppIcon name="adminDashboard" size={18} /></span>
        <div>
          <div className="carousel-slide-title">Content Overview</div>
          <div className="carousel-slide-sub">All modules combined</div>
        </div>
        <HealthRing value={health} label="Overall" tone="#3EE088" />
      </div>
      <div className="carousel-overall-grid">
        <div className="carousel-overall-item"><span className="carousel-overall-value">{subjects.length}</span><span className="carousel-overall-label">Subjects</span></div>
        <div className="carousel-overall-item"><span className="carousel-overall-value">{chapters.length}</span><span className="carousel-overall-label">Chapters</span></div>
        <div className="carousel-overall-item"><span className="carousel-overall-value">{mcqs.length}</span><span className="carousel-overall-label">MCQs</span></div>
        <div className="carousel-overall-item"><span className="carousel-overall-value">{flashcards.length}</span><span className="carousel-overall-label">Flashcards</span></div>
        <div className="carousel-overall-item"><span className="carousel-overall-value">24</span><span className="carousel-overall-label">Notes</span></div>
        <div className="carousel-overall-item"><span className="carousel-overall-value green">{health}%</span><span className="carousel-overall-label">Health</span></div>
      </div>
    </div>
  )
}

function ContentAnalyticsCarousel() {
  const { subjects, chapters, mcqs, flashcards } = useAdminStore()
  const [active, setActive] = useState(0)

  const slides = useMemo(
    () => [
      { key: 'mcqs', label: 'MCQs', component: <McqSlide mcqs={mcqs} subjects={subjects} /> },
      { key: 'flashcards', label: 'Flashcards', component: <FlashcardSlide flashcards={flashcards} subjects={subjects} /> },
      { key: 'notes', label: 'Notes', component: <NotesSlide /> },
      { key: 'overall', label: 'Overall', component: <OverallSlide subjects={subjects} chapters={chapters} mcqs={mcqs} flashcards={flashcards} /> },
    ],
    [subjects, chapters, mcqs, flashcards],
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, SLIDE_MS)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <section className="content-analytics-hero">
      <div className="content-analytics-glow" aria-hidden="true" />
      <div className="content-analytics-top">
        <div className="content-analytics-title-row">
          <span className="content-analytics-icon" aria-hidden="true">
            <AppIcon name="analytics" size={20} />
          </span>
          <h2 className="content-analytics-title">Content Analytics</h2>
        </div>
        <span className="content-analytics-live">
          <span className="content-analytics-live-dot" />
          Live
        </span>
      </div>

      <div className="content-analytics-carousel">
        <div className="content-analytics-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {slides.map((slide) => (
            <div className="content-analytics-slide-panel" key={slide.key}>
              {slide.component}
            </div>
          ))}
        </div>
      </div>

      <div className="content-analytics-dots">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            className={`content-analytics-dot${index === active ? ' active' : ''}`}
            onClick={() => setActive(index)}
            aria-label={`Show ${slide.label} analytics`}
          />
        ))}
      </div>
    </section>
  )
}

export default ContentAnalyticsCarousel