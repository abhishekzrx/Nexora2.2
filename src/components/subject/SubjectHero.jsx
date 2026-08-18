import ProgressRing from '../ui/ProgressRing'
import AppIcon from '../ui/AppIcon'
import { formatCompactNumber, formatInteger } from '../../services/mcqAnalyticsService'

function SubjectHero({ subject }) {
  const counts = subject.counts || {}
  const chapters = subject.chapters || []
  const chapterCount = counts.chapters ?? chapters.length

  const totalMcqCount = subject.totalMcqs ?? counts.mcqs ?? chapters.reduce((s, c) => s + (c.totalMcqs || 0), 0)
  const attemptedMcqCount = subject.attemptedMcqs ?? chapters.reduce((s, c) => s + (c.attemptedMcqs || 0), 0)
  const flashCount = counts.flashcards ?? 0
  const notesCount = counts.notes ?? chapterCount ?? 0

  const coveragePercent = subject.coveragePercent ?? subject.progress ?? 0

  return (
    <section className="hero-card compact-hero">
      <div className="hero-main-content">
        <div className="hero-top-row">
          <div className="hero-icon" aria-hidden="true">
            <AppIcon name={subject.icon} size={24} />
          </div>
          <div className="hero-title-area">
            <h1 className="hero-name">{subject.title}</h1>
            <div className="badge-medium">
              <span className="dot" />
              {subject.badge || 'READY'}
            </div>
          </div>
        </div>

        <div className="hero-metrics-row">
          <div className="hero-metric-item">
            <span className="hero-metric-icon" aria-hidden="true">
              <AppIcon name="chapters" size={13} />
            </span>
            <div className="hero-metric-text">
              <span className="hero-metric-num">{chapterCount}</span>
              <span className="hero-metric-label">Chapters</span>
            </div>
          </div>

          <div className="hero-metric-divider" aria-hidden="true" />

          <div className="hero-metric-item" title={`Total MCQ Pool Size: ${totalMcqCount}`}>
            <span className="hero-metric-icon" aria-hidden="true">
              <AppIcon name="mcqs" size={13} />
            </span>
            <div className="hero-metric-text">
              <span className="hero-metric-num">
                {attemptedMcqCount > 0
                  ? `${formatInteger(attemptedMcqCount)} / ${formatInteger(totalMcqCount)}`
                  : formatInteger(totalMcqCount)}
              </span>
              <span className="hero-metric-label">Total MCQs</span>
            </div>
          </div>

          <div className="hero-metric-divider" aria-hidden="true" />

          <div className="hero-metric-item">
            <span className="hero-metric-icon" aria-hidden="true">
              <AppIcon name="flashcardsTab" size={13} />
            </span>
            <div className="hero-metric-text">
              <span className="hero-metric-num">{flashCount}</span>
              <span className="hero-metric-label">Flashcards</span>
            </div>
          </div>

          <div className="hero-metric-divider" aria-hidden="true" />

          <div className="hero-metric-item">
            <span className="hero-metric-icon" aria-hidden="true">
              <AppIcon name="notesTab" size={13} />
            </span>
            <div className="hero-metric-text">
              <span className="hero-metric-num">{notesCount}</span>
              <span className="hero-metric-label">Notes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-ring-divider" aria-hidden="true" />

      <div className="hero-ring-zone">
        <ProgressRing
          size={74}
          strokeWidth={6}
          progress={coveragePercent}
          trackColor="rgba(255, 255, 255, 0.28)"
          fillColor="#ffffff"
        >
          <div className="hero-ring-inner">
            <span className="hero-ring-num">{Math.round(coveragePercent)}%</span>
            <span className="hero-ring-lbl">Coverage</span>
          </div>
        </ProgressRing>
      </div>
    </section>
  )
}

export default SubjectHero
