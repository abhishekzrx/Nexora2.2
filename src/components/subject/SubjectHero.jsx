/**
 * SubjectHero
 * Gradient hero card showing subject icon, name, badge,
 * progress ring, description, and stat counts.
 */
import ProgressRing from '../ui/ProgressRing'

function SubjectHero({ subject }) {
  return (
    <section className="hero-card">
      <div className="hero-top">
        <div className="hero-left">
          <div className="hero-icon" aria-hidden="true">
            {subject.icon}
          </div>
          <div>
            <div className="hero-name">{subject.title}</div>
            <div className="badge-medium">
              <span className="dot" />
              {subject.badge}
            </div>
          </div>
        </div>
        <div>
          <ProgressRing
            size={96}
            radius={42}
            strokeWidth={8}
            progress={subject.progress}
            trackColor="rgba(255,255,255,0.3)"
            fillColor="#fff"
          >
            {subject.progress}%
          </ProgressRing>
          <div className="progress-label">Overall Progress</div>
        </div>
      </div>

      <div className="hero-desc">{subject.desc}</div>

      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat-icon" aria-hidden="true">📄</span>
          <div>
            <div className="hero-stat-num">{subject.counts.chapters}</div>
            <div className="hero-stat-label">Chapters</div>
          </div>
        </div>
        <div className="hero-stat">
          <span className="hero-stat-icon" aria-hidden="true">❓</span>
          <div>
            <div className="hero-stat-num">{subject.counts.mcqs}</div>
            <div className="hero-stat-label">MCQs</div>
          </div>
        </div>
        <div className="hero-stat">
          <span className="hero-stat-icon" aria-hidden="true">📖</span>
          <div>
            <div className="hero-stat-num">{subject.counts.flashcards}</div>
            <div className="hero-stat-label">Flashcards</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SubjectHero