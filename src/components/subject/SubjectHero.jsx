import ConcentricRingGraph from '../ui/ConcentricRingGraph'
import AppIcon from '../ui/AppIcon'
import { formatInteger } from '../../services/mcqAnalyticsService'

function SubjectHero({ subject }) {
  const counts = subject.counts || {}
  const chapters = subject.chapters || []
  const chapterCount = counts.chapters ?? chapters.length

  // Dynamically sum the exact count of MCQs present across all chapters of this subject
  const totalMcqCount = chapters.reduce((sum, ch) => sum + (Number(ch.totalMcqs || ch.mcqs || 0) || 0), 0)
  const attemptedMcqCount = subject.attemptedMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.attemptedMcqs || 0) || 0), 0)
  const masteredMcqCount = subject.masteredMcqs ?? chapters.reduce((sum, ch) => sum + (Number(ch.masteredMcqs || 0) || 0), 0)
  const flashCount = counts.flashcards ?? 0
  const notesCount = counts.notes ?? chapterCount ?? 0

  const coveragePercent = subject.coveragePercent ?? (totalMcqCount > 0 ? Math.round((attemptedMcqCount / totalMcqCount) * 100) : 0)
  const masteryPercent = subject.masteryPercent ?? (attemptedMcqCount > 0 ? Math.round((masteredMcqCount / attemptedMcqCount) * 100) : 0)
  const accuracyPercent = subject.accuracyPercent ?? subject.accuracy ?? masteryPercent

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

      <div className="hero-ring-zone" title="Multi-Layer Concentric Ring: Outer=Coverage, Middle=Mastery, Inner=Accuracy">
        <ConcentricRingGraph
          size={92}
          coveragePercent={coveragePercent}
          masteryPercent={masteryPercent}
          accuracyPercent={accuracyPercent}
          showLegend
          colors={{
            coverage: '#FFFFFF',
            mastery: '#FFD700',
            accuracy: '#34D399',
            track: 'rgba(255, 255, 255, 0.28)',
          }}
        />
      </div>
    </section>
  )
}

export default SubjectHero