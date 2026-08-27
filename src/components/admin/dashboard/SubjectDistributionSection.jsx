/**
 * SubjectDistributionSection.jsx
 * Clean visualization of content concentration across subjects.
 */

export default function SubjectDistributionSection({ subjectBreakdown = [] }) {
  if (subjectBreakdown.length === 0) {
    return null
  }

  const maxMcqs = Math.max(...subjectBreakdown.map((s) => s.mcqsCount), 1)
  const totalMcqs = subjectBreakdown.reduce((sum, s) => sum + s.mcqsCount, 0)

  return (
    <div className="content-distribution-card">
      <div className="card-header-row">
        <div>
          <h3 className="dashboard-section-title">Content Concentration</h3>
        </div>
      </div>

      <div className="distribution-bars-list">
        {subjectBreakdown.map((sub) => {
          const barPct = Math.max(8, Math.round((sub.mcqsCount / maxMcqs) * 100))
          const sharePct = totalMcqs > 0 ? Math.round((sub.mcqsCount / totalMcqs) * 100) : 0

          return (
            <div key={sub.id} className="dist-bar-item">
              <div className="dist-bar-header">
                <div className="dist-sub-info">
                  <span className="dist-dot" style={{ background: sub.color }} />
                  <span className="dist-sub-name">{sub.name}</span>
                </div>
                <div className="dist-sub-counts">
                  <strong>{sub.mcqsCount} MCQs</strong>
                  <span className="dist-sub-pct-chip">{sharePct}% Share</span>
                </div>
              </div>

              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{
                    width: `${barPct}%`,
                    background: sub.color || '#2E5CE6',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
