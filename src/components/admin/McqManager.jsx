/**
 * McqManager.jsx
 * Relevant Admin Panel UI for managing, modifying, trimming, and deleting chapter MCQs
 * WITHOUT deleting the parent chapter record.
 */
import { useState, useEffect, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { mcqService } from '../../services/mcqService'
import { showToast } from '../../data/feedbackStore'

export default function McqManager() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { allSubjects, allChapters, allMcqs } = useAdminStore()

  const [selectedCourseId, setSelectedCourseId] = useState(activeWorkspaceId || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')

  const [chapterMcqs, setChapterMcqs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [maxMcqsLimit, setMaxMcqsLimit] = useState('50')
  const [isTrimming, setIsTrimming] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  // Edit Modal State
  const [editingMcq, setEditingMcq] = useState(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editOptA, setEditOptA] = useState('')
  const [editOptB, setEditOptB] = useState('')
  const [editOptC, setEditOptC] = useState('')
  const [editOptD, setEditOptD] = useState('')
  const [editCorrect, setEditCorrect] = useState(0)
  const [editExplanation, setEditExplanation] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Synchronize course selection
  useEffect(() => {
    if (activeWorkspaceId && !selectedCourseId) {
      setSelectedCourseId(activeWorkspaceId)
    }
  }, [activeWorkspaceId])

  // Filter subjects by selected course
  const availableSubjects = useMemo(() => {
    if (!selectedCourseId) return []
    return allSubjects.filter((s) => s.courseId === selectedCourseId)
  }, [selectedCourseId, allSubjects])

  // Auto select first subject
  useEffect(() => {
    if (availableSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(availableSubjects[0].id)
    }
  }, [availableSubjects, selectedSubjectId])

  // Filter chapters by selected subject
  const availableChapters = useMemo(() => {
    if (!selectedSubjectId) return []
    const targetSub = availableSubjects.find((s) => s.id === selectedSubjectId || s.name === selectedSubjectId)
    const subName = targetSub?.name || selectedSubjectId
    return allChapters.filter(
      (c) => (c.subjectId === selectedSubjectId || c.subject === subName || c.subject === selectedSubjectId) && c.courseId === selectedCourseId
    )
  }, [selectedSubjectId, selectedCourseId, availableSubjects, allChapters])

  // Auto select first chapter
  useEffect(() => {
    if (availableChapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(availableChapters[0].id)
    }
  }, [availableChapters, selectedChapterId])

  // Load MCQs for selected chapter from DB & store
  const loadChapterMcqs = async () => {
    if (!selectedChapterId) {
      setChapterMcqs([])
      return
    }
    setLoading(true)
    const res = await mcqService.getMcqs(selectedCourseId, selectedSubjectId, selectedChapterId)
    if (res.success && Array.isArray(res.data)) {
      setChapterMcqs(res.data)
    } else {
      // Fallback to local adminStore filtered by chapter_id
      const storeFiltered = allMcqs.filter(
        (m) => String(m.chapterId || m.chapter_id) === String(selectedChapterId)
      )
      setChapterMcqs(storeFiltered)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadChapterMcqs()
  }, [selectedCourseId, selectedSubjectId, selectedChapterId, allMcqs])

  // Search filter
  const filteredMcqs = useMemo(() => {
    if (!searchQuery.trim()) return chapterMcqs
    const q = searchQuery.toLowerCase().trim()
    return chapterMcqs.filter(
      (m) =>
        (m.question && m.question.toLowerCase().includes(q)) ||
        (m.explanation && m.explanation.toLowerCase().includes(q))
    )
  }, [chapterMcqs, searchQuery])

  // Delete Single MCQ (without deleting chapter)
  const handleDeleteSingleMcq = async (mcqId, qText) => {
    if (!window.confirm(`Delete this MCQ without deleting the chapter?\n\n"${qText?.slice(0, 60)}..."`)) {
      return
    }

    const res = await mcqService.deleteMcqs([mcqId])
    if (res.success) {
      showToast({
        type: 'success',
        title: 'MCQ Deleted',
        message: 'Question deleted successfully. Chapter remains intact.',
        duration: 4000,
      })
      setChapterMcqs((prev) => prev.filter((m) => String(m.id) !== String(mcqId)))
    } else {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: res.error || 'Failed to delete MCQ from database.',
        duration: 5000,
      })
    }
  }

  // Delete All MCQs in Chapter (without deleting chapter)
  const handleDeleteAllChapterMcqs = async () => {
    if (chapterMcqs.length === 0) return
    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'this chapter'

    if (
      !window.confirm(
        `WARNING: Are you sure you want to delete ALL ${chapterMcqs.length} MCQs from "${chapName}"?\n\nThe parent chapter will NOT be deleted.`
      )
    ) {
      return
    }

    setIsDeletingAll(true)
    const res = await mcqService.deleteChapterMcqs(selectedChapterId)
    setIsDeletingAll(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: 'Chapter MCQs Cleared',
        message: `All MCQs deleted from "${chapName}". Chapter structure preserved.`,
        duration: 4000,
      })
      setChapterMcqs([])
    } else {
      showToast({
        type: 'error',
        title: 'Clear Failed',
        message: res.error || 'Failed to clear chapter MCQs.',
        duration: 5000,
      })
    }
  }

  // Trim MCQs to Max Limit (without deleting chapter)
  const handleApplyMaxLimit = async () => {
    const limit = parseInt(maxMcqsLimit, 10)
    if (isNaN(limit) || limit < 0) {
      showToast({ type: 'warning', title: 'Invalid Limit', message: 'Enter a valid max limit number.' })
      return
    }

    if (chapterMcqs.length <= limit) {
      showToast({
        type: 'info',
        title: 'No Trimming Needed',
        message: `Chapter currently has ${chapterMcqs.length} MCQs, which is already within the limit of ${limit}.`,
        duration: 4000,
      })
      return
    }

    const excessCount = chapterMcqs.length - limit
    if (
      !window.confirm(
        `Trim ${excessCount} excess MCQs from this chapter?\n\nWill keep the first ${limit} MCQs and remove ${excessCount} extra MCQs without deleting the chapter.`
      )
    ) {
      return
    }

    setIsTrimming(true)
    const res = await mcqService.trimChapterMcqs(selectedChapterId, limit)
    setIsTrimming(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: 'MCQs Trimmed Successfully',
        message: `Trimmed ${res.trimmedCount} excess MCQs. Chapter now has ${limit} MCQs.`,
        duration: 4000,
      })
      loadChapterMcqs()
    } else {
      showToast({
        type: 'error',
        title: 'Trim Failed',
        message: res.error || 'Failed to trim chapter MCQs.',
        duration: 5000,
      })
    }
  }

  // Open Edit Modal
  const handleOpenEditModal = (mcq) => {
    setEditingMcq(mcq)
    setEditQuestion(mcq.question || mcq.text || '')
    const opts = mcq.options || [mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d]
    setEditOptA(opts[0] || mcq.option_a || '')
    setEditOptB(opts[1] || mcq.option_b || '')
    setEditOptC(opts[2] || mcq.option_c || '')
    setEditOptD(opts[3] || mcq.option_d || '')

    const correctMap = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
    const rawCorrect = mcq.correct !== undefined ? mcq.correct : mcq.correct_answer
    const cIdx = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').toUpperCase()] ?? 0)
    setEditCorrect(cIdx)
    setEditExplanation(mcq.explanation || '')
  }

  // Save MCQ Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingMcq) return

    if (!editQuestion.trim()) {
      showToast({ type: 'warning', title: 'Missing Question', message: 'Question text cannot be empty.' })
      return
    }

    setIsSavingEdit(true)
    const payload = {
      question: editQuestion.trim(),
      options: [editOptA.trim(), editOptB.trim(), editOptC.trim(), editOptD.trim()],
      correct: Number(editCorrect),
      explanation: editExplanation.trim(),
    }

    const res = await mcqService.updateMcq(editingMcq.id, payload)
    setIsSavingEdit(false)

    if (res.success) {
      showToast({
        type: 'success',
        title: 'MCQ Updated',
        message: 'Question updated successfully in database.',
        duration: 4000,
      })
      setEditingMcq(null)
      loadChapterMcqs()
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update question in database.',
        duration: 5000,
      })
    }
  }

  const selectedChapter = availableChapters.find((c) => String(c.id) === String(selectedChapterId))

  return (
    <div className="mcq-manager-container">
      <div className="mcq-manager-header">
        <div>
          <h2 className="mcq-manager-title">MCQ Manager</h2>
          <p className="mcq-manager-subtitle">
            Modify, trim, and delete chapter MCQs individually or in bulk without deleting parent chapters
          </p>
        </div>
      </div>

      {/* Target Hierarchy Selection */}
      <div className="mcq-manager-selectors">
        <div className="select-group">
          <label>Course</label>
          <select
            className="admin-select"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value)
              setSelectedSubjectId('')
              setSelectedChapterId('')
            }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label>Subject</label>
          <select
            className="admin-select"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value)
              setSelectedChapterId('')
            }}
          >
            {availableSubjects.map((s) => (
              <option key={s.id || s.name} value={s.id || s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label>Chapter</label>
          <select
            className="admin-select"
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
          >
            {availableChapters.map((c) => (
              <option key={c.id || c.name} value={c.id || c.name}>
                Ch {c.number || ''}: {c.name || c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chapter Overview & Trimming Control Panel */}
      {selectedChapter ? (
        <div className="mcq-manager-panel">
          <div className="panel-info">
            <div className="panel-badge">
              <AppIcon name="chapters" size={16} />
            </div>
            <div>
              <h3 className="panel-chap-name">
                {selectedChapter.name || selectedChapter.title}
              </h3>
              <div className="panel-chap-meta">
                Total MCQs in Chapter: <strong>{chapterMcqs.length}</strong>
              </div>
            </div>
          </div>

          <div className="panel-controls">
            {/* Trim MCQs Control */}
            <div className="trim-control-box">
              <span className="control-lbl">Max MCQs Limit:</span>
              <input
                type="number"
                min="0"
                className="admin-input-sm"
                value={maxMcqsLimit}
                onChange={(e) => setMaxMcqsLimit(e.target.value)}
                placeholder="50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyMaxLimit}
                disabled={isTrimming || chapterMcqs.length === 0}
              >
                {isTrimming ? 'Trimming...' : 'Apply Max Limit'}
              </Button>
            </div>

            {/* Clear All MCQs */}
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAllChapterMcqs}
              disabled={isDeletingAll || chapterMcqs.length === 0}
            >
              {isDeletingAll ? 'Clearing...' : 'Clear All Chapter MCQs'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Search & Filter Bar */}
      <div className="mcq-manager-toolbar">
        <div className="search-box">
          <AppIcon name="search" size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search questions by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-count">
          Showing {filteredMcqs.length} of {chapterMcqs.length} MCQs
        </div>
      </div>

      {/* MCQs List */}
      {loading ? (
        <div className="mcq-manager-loading">Loading chapter MCQs...</div>
      ) : filteredMcqs.length === 0 ? (
        <div className="mcq-manager-empty">
          <AppIcon name="mcqs" size={32} />
          <p>No MCQs found for this chapter.</p>
        </div>
      ) : (
        <div className="mcq-cards-grid">
          {filteredMcqs.map((mcq, index) => {
            const opts = mcq.options || [mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d]
            const correctIdx = typeof mcq.correct === 'number' ? mcq.correct : (mcq.correct_answer ?? 0)

            return (
              <div key={mcq.id || index} className="mcq-item-card">
                <div className="mcq-card-header">
                  <span className="mcq-q-num">Q{index + 1}</span>
                  <div className="mcq-card-actions">
                    <button
                      type="button"
                      className="btn-icon-text btn-edit"
                      onClick={() => handleOpenEditModal(mcq)}
                    >
                      <AppIcon name="edit" size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn-icon-text btn-delete"
                      onClick={() => handleDeleteSingleMcq(mcq.id, mcq.question)}
                    >
                      <AppIcon name="close" size={13} /> Delete
                    </button>
                  </div>
                </div>

                <div className="mcq-card-question">{mcq.question || mcq.text}</div>

                <div className="mcq-card-options">
                  {opts.map((opt, oIdx) => {
                    const isCorrect = oIdx === correctIdx
                    const letter = String.fromCharCode(65 + oIdx)
                    return (
                      <div
                        key={oIdx}
                        className={`mcq-opt-chip ${isCorrect ? 'opt-correct' : ''}`}
                      >
                        <span className="opt-letter">{letter}.</span>
                        <span className="opt-text">{opt || `Option ${letter}`}</span>
                        {isCorrect && <span className="correct-tag">Correct</span>}
                      </div>
                    )
                  })}
                </div>

                {mcq.explanation ? (
                  <div className="mcq-card-explanation">
                    <strong>Explanation:</strong> {mcq.explanation}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit MCQ Modal Dialog */}
      {editingMcq && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Edit MCQ</h3>
              <button type="button" className="close-btn" onClick={() => setEditingMcq(null)}>
                <AppIcon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label>Question Text</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  required
                />
              </div>

              <div className="form-options-grid">
                <div className="form-group">
                  <label>Option A</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editOptA}
                    onChange={(e) => setEditOptA(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Option B</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editOptB}
                    onChange={(e) => setEditOptB(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Option C</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editOptC}
                    onChange={(e) => setEditOptC(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Option D</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editOptD}
                    onChange={(e) => setEditOptD(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Correct Answer</label>
                <select
                  className="admin-select"
                  value={editCorrect}
                  onChange={(e) => setEditCorrect(Number(e.target.value))}
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Explanation</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Detailed explanation for the correct answer..."
                />
              </div>

              <div className="modal-footer">
                <Button type="button" variant="secondary" onClick={() => setEditingMcq(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
