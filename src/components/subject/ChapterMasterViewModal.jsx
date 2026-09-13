/**
 * ChapterMasterViewModal.jsx
 * Full-scale Chapter Health & Concept Master View Modal.
 * Displays overall chapter metrics, concept breakdown table, weak/strong areas,
 * and 1-click targeted practice triggers.
 */

import { useMemo } from 'react'
import '../../styles/chapterMaster.css'
import AppIcon from '../ui/AppIcon'
import { CircularCoverageRing } from './ChapterCard'
import { getFlatConceptsForChapter } from '../../services/knowledgeHierarchyService'
import { analyzeChapterQuestionGaps } from '../../utils/chapterPracticeEngine'
import { useUserProgressStore } from '../../data/progressStore'
import { useAdminStore } from '../../data/adminStore'

export default function ChapterMasterViewModal({
  chapter,
  subjectTitle = '',
  onClose = () => {},
  onStartPractice = () => {},
  onOpenFlashcards = () => {},
}) {
  const progressState = useUserProgressStore()
  const adminState = useAdminStore()

  // All MCQs belonging to this chapter in store
  const allChapterMcqs = useMemo(() => {
    if (!chapter) return []
    const all = adminState.allMcqs || []
    return all.filter((m) => String(m.chapter_id || m.chapterId) === String(chapter.id))
  }, [adminState.allMcqs, chapter])

  // Flat concepts for this chapter
  const flatConcepts = useMemo(() => {
    return getFlatConceptsForChapter(chapter, subjectTitle)
  }, [chapter, subjectTitle])

  // Progress records for this chapter
  const chapterProgress = useMemo(() => {
    if (!chapter) return []
    const list = progressState.progressList || []
    const mcqIds = new Set(allChapterMcqs.map((m) => String(m.id)))
    return list.filter((p) => {
      if (!p) return false
      if (String(p.chapter_id || p.chapterId) === String(chapter.id)) return true
      if (mcqIds.has(String(p.mcq_id || p.mcqId))) return true
      return false
    })
  }, [chapter, allChapterMcqs, progressState.progressList])

  // Concept-level calculated performance
  const conceptMetrics = useMemo(() => {
    const progressMap = new Map()
    chapterProgress.forEach((p) => {
      if (p && (p.mcq_id || p.mcqId)) {
        progressMap.set(String(p.mcq_id || p.mcqId), p)
      }
    })

    return flatConcepts.map((concept) => {
      // Find MCQs tagged to this concept
      const conceptMcqs = allChapterMcqs.filter((m) => {
        const cId = m.conceptId || m.concept_id
        if (cId) return cId === concept.id
        const text = `${m.question || m.text || ''} ${m.explanation || ''}`.toLowerCase()
        return text.includes(concept.name.toLowerCase().slice(0, 8))
      })

      const totalAvail = Math.max(conceptMcqs.length, 12) // baseline estimate
      let attempted = 0
      let mastered = 0
      let errors = 0
      let totalAttCount = 0
      let totalCorrCount = 0

      conceptMcqs.forEach((m) => {
        const p = progressMap.get(String(m.id))
        if (p) {
          attempted += 1
          const status = String(p.status || '').toUpperCase()
          if (status === 'MASTERED') mastered += 1
          if (status === 'INCORRECT' || (Number(p.incorrect_count) || 0) > 0) errors += 1

          const att = Math.max(Number(p.attempts) || 0, 1)
          const corr = Number(p.correct_count) || (status === 'MASTERED' ? 1 : 0)
          totalAttCount += att
          totalCorrCount += Math.min(corr, att)
        }
      })

      const coveragePct = Math.min(100, Math.round((attempted / totalAvail) * 100))
      const accuracyPct = totalAttCount > 0 ? Math.round((totalCorrCount / totalAttCount) * 100) : 0
      const masteryPct = attempted > 0 ? Math.round((mastered / attempted) * 100) : 0

      let statusLabel = 'Unseen'
      let statusClass = 'cm-pill-neutral'
      if (attempted === 0) {
        statusLabel = 'Unseen'
        statusClass = 'cm-pill-neutral'
      } else if (accuracyPct >= 80 && coveragePct >= 50) {
        statusLabel = 'Mastered'
        statusClass = 'cm-pill-good'
      } else if (accuracyPct < 60 || errors > 1) {
        statusLabel = 'Needs Work'
        statusClass = 'cm-pill-weak'
      } else {
        statusLabel = 'Practicing'
        statusClass = 'cm-pill-med'
      }

      return {
        ...concept,
        totalAvailable: totalAvail,
        attempted,
        mastered,
        errors,
        coveragePct,
        accuracyPct,
        masteryPct,
        statusLabel,
        statusClass,
      }
    })
  }, [flatConcepts, allChapterMcqs, chapterProgress])

  // Overall chapter metrics
  const totalMcqs = allChapterMcqs.length || Number(chapter?.totalMcqs || chapter?.mcqs || 0) || 45
  const attemptedUnique = Number(chapter?.attemptedMcqs || chapter?.uniqueAttempted || 0)
  const coveragePercent = totalMcqs > 0 ? Math.min(100, Math.round((attemptedUnique / totalMcqs) * 100)) : 0
  const accuracyPercent = Number(chapter?.accuracyPercent || chapter?.accuracyPercentage || 0)
  const masteryPercent = Number(chapter?.masteryPercent || chapter?.masteryPercentage || 0)
  const readinessScore = Number(chapter?.readinessScore || chapter?.progress || 0)

  if (!chapter) return null

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cm-modal-header">
          <div className="cm-title-area">
            <div className="cm-chap-badge-row">
              <span className="cm-chap-num-badge">Ch {chapter.number || chapter.num || '01'}</span>
              <span className="cm-modal-subtitle">{subjectTitle || chapter.subject || 'Subject'}</span>
            </div>
            <h2 className="cm-modal-title">{chapter.title || chapter.name}</h2>
            {chapter.description && (
              <p className="cm-modal-subtitle" style={{ marginTop: 4, lineHeight: 1.4 }}>
                {chapter.description}
              </p>
            )}
          </div>
          <button type="button" className="cm-close-btn" onClick={onClose} aria-label="Close modal">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="cm-modal-body">
          {/* Top Metric Cards */}
          <div className="cm-stats-grid">
            <div className="cm-stat-card">
              <span className="cm-stat-label">
                <AppIcon name="target" size={13} />
                Readiness Score
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <CircularCoverageRing percent={readinessScore} size={32} strokeWidth={3.5} />
                <span className="cm-stat-value">{readinessScore}%</span>
              </div>
              <span className="cm-stat-sub">Weighted Mastery & Consistency</span>
            </div>

            <div className="cm-stat-card">
              <span className="cm-stat-label">
                <AppIcon name="mcqs" size={13} />
                Question Coverage
              </span>
              <span className="cm-stat-value">{coveragePercent}%</span>
              <span className="cm-stat-sub">{attemptedUnique} of {totalMcqs} Unique MCQs</span>
            </div>

            <div className="cm-stat-card">
              <span className="cm-stat-label">
                <AppIcon name="check" size={13} />
                Average Accuracy
              </span>
              <span className="cm-stat-value">{accuracyPercent}%</span>
              <span className="cm-stat-sub">Across All Practice Sessions</span>
            </div>

            <div className="cm-stat-card">
              <span className="cm-stat-label">
                <AppIcon name="trophy" size={13} />
                Mastery Level
              </span>
              <span className="cm-stat-value">{masteryPercent}%</span>
              <span className="cm-stat-sub">Consistent Retention Score</span>
            </div>
          </div>

          {/* Concept Master Table */}
          <div>
            <div className="cm-section-title">
              <span>Concept Master Breakdown ({conceptMetrics.length} Concepts)</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>
                Practice weak concepts to raise readiness
              </span>
            </div>

            <div className="cm-concept-table-wrap">
              <table className="cm-concept-table">
                <thead>
                  <tr>
                    <th>Concept & Topic</th>
                    <th>Status</th>
                    <th>Coverage</th>
                    <th>Accuracy</th>
                    <th>Errors</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptMetrics.map((cm) => (
                    <tr key={cm.id}>
                      <td>
                        <div className="cm-concept-name-cell">
                          <span className="cm-concept-title">{cm.name}</span>
                          <span className="cm-concept-topic">{cm.topicName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`cm-metric-pill ${cm.statusClass}`}>{cm.statusLabel}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{cm.coveragePct}%</span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                          ({cm.attempted}/{cm.totalAvailable})
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: cm.accuracyPct >= 70 ? '#10b981' : cm.accuracyPct > 0 ? '#f97316' : '#94a3b8' }}>
                          {cm.accuracyPct > 0 ? `${cm.accuracyPct}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: cm.errors > 0 ? '#ef4444' : '#64748b', fontWeight: cm.errors > 0 ? 700 : 500 }}>
                          {cm.errors}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="cm-practice-concept-btn"
                          onClick={() => {
                            onClose()
                            onStartPractice('targeted', { selectedConceptId: cm.id, conceptName: cm.name })
                          }}
                        >
                          <AppIcon name="play" size={12} />
                          Practice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="cm-modal-footer">
          <button
            type="button"
            className="cm-btn-secondary"
            onClick={() => {
              onClose()
              onOpenFlashcards(chapter)
            }}
          >
            <AppIcon name="flashcardsTab" size={15} />
            Study Flashcards Deck
          </button>

          <div className="cm-footer-actions">
            <button
              type="button"
              className="cm-btn-secondary"
              onClick={() => {
                onClose()
                onStartPractice('revision')
              }}
            >
              <AppIcon name="bolt" size={15} />
              Rapid Revision
            </button>
            <button
              type="button"
              className="cm-btn-primary"
              onClick={() => {
                onClose()
                onStartPractice('adaptive')
              }}
            >
              <AppIcon name="target" size={16} />
              Start Adaptive 20 Qs Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
