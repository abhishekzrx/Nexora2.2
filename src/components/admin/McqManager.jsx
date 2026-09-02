/**
 * McqManager.jsx
 * Notebook-Themed Interactive MCQ Manager with EduTech Platform aesthetic & smooth micro-interactions.
 * Supports searching, filtering by difficulty, interactive answer testing, bulk trimming, and individual MCQ editing/deletion.
 */
import { useState, useEffect, useMemo } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { useMemberStore } from '../../data/memberStore'
import { mcqService } from '../../services/mcqService'
import { showToast } from '../../data/feedbackStore'
import { getActiveExamKey, getExamProfile } from '../../data/examProfiles'
import FormattedQuestionText from '../mcq/FormattedQuestionText'
import PyqBadge from '../mcq/PyqBadge'

export default function McqManager() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { allSubjects, allChapters, allMcqs } = useAdminStore()
  const { isSuperAdmin, isViewingAs } = useMemberStore()

  const activeExamKey = getActiveExamKey()
  const activeExamProfile = getExamProfile(activeExamKey)
  const showPyqBadge = activeExamProfile && activeExamProfile.key !== 'GENERIC'

  const [selectedCourseId, setSelectedCourseId] = useState(activeWorkspaceId || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')

  const [chapterMcqs, setChapterMcqs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('ALL')
  const [maxMcqsLimit, setMaxMcqsLimit] = useState('')
  const [targetedDeleteCount, setTargetedDeleteCount] = useState('')
  const [targetedDeletePos, setTargetedDeletePos] = useState('end')
  const [isDeletingTargeted, setIsDeletingTargeted] = useState(false)
  const [isTrimming, setIsTrimming] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [isResettingProgress, setIsResettingProgress] = useState(false)

  // Visual Satisfying Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    chapterName: '',
    countText: '',
    questionPreview: null,
    warningNote: '',
    dangerLevel: 'medium',
    onConfirm: null,
  })
  const [isExecutingDelete, setIsExecutingDelete] = useState(false)

  // Interactive option selection test per question
  const [userSelectedOpts, setUserSelectedOpts] = useState({})
  const [expandedExplanations, setExpandedExplanations] = useState({})

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

  // Auto select / reconcile subject ID
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!selectedSubjectId || !availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id)
      }
    } else {
      setSelectedSubjectId('')
    }
  }, [availableSubjects, selectedSubjectId])

  // Filter chapters by selected subject
  const availableChapters = useMemo(() => {
    if (!selectedSubjectId) return []
    return allChapters.filter(
      (c) =>
        (c.subjectId === selectedSubjectId || c.subject_id === selectedSubjectId) &&
        (!selectedCourseId || c.courseId === selectedCourseId)
    )
  }, [selectedSubjectId, selectedCourseId, allChapters])

  // Auto select / reconcile chapter ID
  useEffect(() => {
    if (availableChapters.length > 0) {
      if (!selectedChapterId || !availableChapters.some((c) => c.id === selectedChapterId)) {
        setSelectedChapterId(availableChapters[0].id)
      }
    } else {
      setSelectedChapterId('')
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
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      setChapterMcqs(res.data.filter((m) => String(m.chapterId || m.chapter_id) === String(selectedChapterId)))
    } else {
      const storeFiltered = allMcqs.filter(
        (m) => String(m.chapterId || m.chapter_id) === String(selectedChapterId)
      )
      setChapterMcqs(storeFiltered)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadChapterMcqs()
    setUserSelectedOpts({})
    setExpandedExplanations({})
  }, [selectedCourseId, selectedSubjectId, selectedChapterId, allMcqs])

  // Safe helper to extract difficulty text as a string
  const getDifficultyText = (m) => {
    if (!m) return 'Easy'
    if (typeof m.difficultyText === 'string' && m.difficultyText.trim()) return m.difficultyText
    if (typeof m.difficulty === 'string' && m.difficulty.trim()) {
      if (m.difficulty === 'danger') return 'Hard'
      if (m.difficulty === 'warning') return 'Medium'
      if (m.difficulty === 'success') return 'Easy'
      return m.difficulty
    }
    return 'Easy'
  }

  // Filtered MCQs by search and difficulty
  const filteredMcqs = useMemo(() => {
    return chapterMcqs.filter((m) => {
      // Search text match
      const q = searchQuery.toLowerCase().trim()
      const matchesText =
        !q ||
        (m.question && typeof m.question === 'string' && m.question.toLowerCase().includes(q)) ||
        (m.explanation && typeof m.explanation === 'string' && m.explanation.toLowerCase().includes(q))

      // Difficulty match
      const diff = getDifficultyText(m).toLowerCase()
      const matchesDiff = difficultyFilter === 'ALL' || diff.includes(difficultyFilter.toLowerCase())

      return matchesText && matchesDiff
    })
  }, [chapterMcqs, searchQuery, difficultyFilter])

  // Single Option Selection handler (interactive quiz mode inside admin manager)
  const handleSelectOption = (mcqId, optIdx) => {
    setUserSelectedOpts((prev) => ({
      ...prev,
      [mcqId]: prev[mcqId] === optIdx ? null : optIdx,
    }))
  }

  // Toggle Explanation visibility
  const toggleExplanation = (mcqId) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [mcqId]: !prev[mcqId],
    }))
  }

  // Helper to open visual deletion confirmation modal
  const openDeleteConfirmModal = ({
    title,
    subtitle,
    chapterName,
    countText,
    questionPreview = null,
    warningNote = 'Chapter structure & metadata remain safe and preserved.',
    dangerLevel = 'medium',
    onConfirm,
  }) => {
    setDeleteConfirmModal({
      isOpen: true,
      title,
      subtitle,
      chapterName,
      countText,
      questionPreview,
      warningNote,
      dangerLevel,
      onConfirm,
    })
  }

  // Delete Single MCQ (without deleting chapter)
  const handleDeleteSingleMcq = (mcqId, qText) => {
    if (!isSuperAdmin || isViewingAs) {
      showToast({ type: 'error', title: 'Permission Denied', message: 'Only Super Admin can delete MCQs.' })
      return
    }
    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'Selected Chapter'

    openDeleteConfirmModal({
      title: 'Delete MCQ Question?',
      subtitle: 'Remove this question from chapter bank without deleting the parent chapter.',
      chapterName: chapName,
      countText: '1 Question',
      questionPreview: qText,
      warningNote: 'Parent chapter structure & all other questions remain completely safe.',
      dangerLevel: 'medium',
      onConfirm: async () => {
        const res = await mcqService.deleteMcqs([mcqId])
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Question Deleted',
            message: 'Question removed successfully. Chapter structure remains intact.',
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
      },
    })
  }

  // Delete All MCQs in Chapter (without deleting chapter)
  const handleDeleteAllChapterMcqs = () => {
    if (chapterMcqs.length === 0) return
    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'Selected Chapter'

    openDeleteConfirmModal({
      title: `Clear ALL ${chapterMcqs.length} Chapter Questions?`,
      subtitle: `DANGER ZONE: You are about to wipe all ${chapterMcqs.length} MCQs from "${chapName}".`,
      chapterName: chapName,
      countText: `ALL ${chapterMcqs.length} Questions`,
      warningNote: 'The chapter record itself will NOT be deleted, but all contained questions will be removed.',
      dangerLevel: 'high',
      onConfirm: async () => {
        setIsDeletingAll(true)
        const res = await mcqService.deleteChapterMcqs(selectedChapterId)
        setIsDeletingAll(false)

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Chapter MCQs Cleared',
            message: `Cleared all questions from "${chapName}". Chapter structure preserved.`,
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
      },
    })
  }

  // Delete Targeted Number of MCQs (without deleting chapter)
  const handleDeleteTargetedMcqs = () => {
    const count = parseInt(targetedDeleteCount, 10)
    if (isNaN(count) || count <= 0) {
      showToast({
        type: 'warning',
        title: 'Invalid Number',
        message: 'Enter a valid number of questions to delete.',
      })
      return
    }

    if (chapterMcqs.length === 0) {
      showToast({
        type: 'info',
        title: 'No Questions',
        message: 'This chapter has no MCQs to delete.',
      })
      return
    }

    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'Selected Chapter'
    const actualToDelete = Math.min(count, chapterMcqs.length)
    const positionLabel = targetedDeletePos === 'start' ? 'First' : 'Last'

    openDeleteConfirmModal({
      title: `Delete ${actualToDelete} Targeted Question${actualToDelete > 1 ? 's' : ''}?`,
      subtitle: `Removes the ${positionLabel.toLowerCase()} ${actualToDelete} question(s) from this chapter bank.`,
      chapterName: chapName,
      countText: `${actualToDelete} Question${actualToDelete > 1 ? 's' : ''} (${positionLabel} ${actualToDelete})`,
      warningNote: 'Chapter structure and remaining questions stay intact.',
      dangerLevel: 'medium',
      onConfirm: async () => {
        setIsDeletingTargeted(true)
        const res = await mcqService.deleteTargetedMcqs(selectedChapterId, actualToDelete, targetedDeletePos)
        setIsDeletingTargeted(false)

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Targeted MCQs Deleted',
            message: `Deleted ${res.deletedCount} question(s) from "${chapName}". ${res.totalRemaining} question(s) remaining.`,
            duration: 4000,
          })
          loadChapterMcqs()
        } else {
          showToast({
            type: 'error',
            title: 'Delete Failed',
            message: res.error || 'Failed to delete targeted MCQs.',
            duration: 5000,
          })
        }
      },
    })
  }

  // Trim MCQs to Max Limit (without deleting chapter)
  const handleApplyMaxLimit = () => {
    const limit = parseInt(maxMcqsLimit, 10)
    if (isNaN(limit) || limit < 0) {
      showToast({ type: 'warning', title: 'Invalid Limit', message: 'Enter a valid max limit number.' })
      return
    }

    if (chapterMcqs.length <= limit) {
      showToast({
        type: 'info',
        title: 'No Trimming Required',
        message: `Chapter has ${chapterMcqs.length} MCQs, which is already within limit of ${limit}.`,
        duration: 4000,
      })
      return
    }

    const excessCount = chapterMcqs.length - limit
    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'Selected Chapter'

    openDeleteConfirmModal({
      title: `Trim ${excessCount} Excess Question${excessCount > 1 ? 's' : ''}?`,
      subtitle: `Will cap total questions at ${limit} by deleting ${excessCount} excess question(s).`,
      chapterName: chapName,
      countText: `${excessCount} Excess Qs (Capped at ${limit})`,
      warningNote: `First ${limit} questions will be preserved intact.`,
      dangerLevel: 'medium',
      onConfirm: async () => {
        setIsTrimming(true)
        const res = await mcqService.trimChapterMcqs(selectedChapterId, limit)
        setIsTrimming(false)

        if (res.success) {
          showToast({
            type: 'success',
            title: 'MCQs Trimmed Successfully',
            message: `Trimmed ${res.trimmedCount} excess MCQs. Chapter capped at ${limit} MCQs.`,
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
      },
    })
  }

  // Reset Chapter Readiness, Accuracy, and Student Mastery State
  const handleResetChapterProgress = () => {
    if (!selectedChapterId) return
    const currentChap = availableChapters.find((c) => String(c.id) === String(selectedChapterId))
    const chapName = currentChap?.name || currentChap?.title || 'Selected Chapter'

    openDeleteConfirmModal({
      title: `Reset Readiness & Accuracy State?`,
      subtitle: `Clear all student attempt progress, readiness score, accuracy %, and mastery metrics for "${chapName}".`,
      chapterName: chapName,
      countText: 'Chapter Metrics & Attempt Progress',
      warningNote: 'Questions and chapter structure remain completely safe. Only attempt metrics are reset to 0%.',
      dangerLevel: 'medium',
      onConfirm: async () => {
        setIsResettingProgress(true)
        const res = await mcqService.resetChapterProgress(selectedChapterId)
        setIsResettingProgress(false)

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Chapter Progress Reset',
            message: `Cleared readiness score, accuracy %, and student progress for "${chapName}".`,
            duration: 4000,
          })
          loadChapterMcqs()
        } else {
          showToast({
            type: 'error',
            title: 'Reset Failed',
            message: res.error || 'Failed to reset chapter progress.',
            duration: 5000,
          })
        }
      },
    })
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
    <div className="mcq-manager-container edutech-clean-container">
      {/* Sticky Top Controls Wrapper */}
      <div className="mcq-sticky-top-controls">
        {/* EduTech Premium Header */}
        <div className="mcq-manager-header edutech-header">
          <div className="header-left">
            <div className="header-badge-icon">
              <AppIcon name="mcqs" size={22} />
            </div>
            <div>
              <div className="edutech-pill-tag">
                <span className="live-dot" /> Academic Question Bank Studio
              </div>
              <h2 className="mcq-manager-title">MCQ Manager</h2>
              <p className="mcq-manager-subtitle">
                Manage, edit, & trim chapter MCQs up to dynamic pool size without altering chapter structures.
              </p>
            </div>
          </div>

          <div className="header-stats-row">
            <div className="stat-pill-chip">
              <span className="stat-num">{chapterMcqs.length}</span>
              <span className="stat-lbl">Questions</span>
            </div>
            <div className="stat-pill-chip highlight">
              <span className="stat-num">{availableChapters.length}</span>
              <span className="stat-lbl">Chapters</span>
            </div>
          </div>
        </div>

        {/* Target Hierarchy Selection */}
        <div className="mcq-manager-selectors edutech-card-elevated">
          <div className="select-group">
            <label className="select-label">
              <AppIcon name="folder" size={13} /> Course Workspace
            </label>
            <select
              className="admin-select custom-select"
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
            <label className="select-label">
              <AppIcon name="chapters" size={13} /> Subject
            </label>
            <select
              className="admin-select custom-select"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value)
                setSelectedChapterId('')
              }}
            >
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label className="select-label">
              <AppIcon name="document" size={13} /> Target Chapter
            </label>
            <select
              className="admin-select custom-select"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
            >
              {availableChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.number || ''}: {c.name || c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chapter Overview & Trimming Control Panel */}
        {selectedChapter ? (
          <div className="mcq-manager-panel edutech-chap-banner">
            <div className="panel-info">
              <div className="panel-badge-icon">
                <AppIcon name="chapters" size={16} />
              </div>
              <div>
                <h3 className="panel-chap-name">
                  {selectedChapter.name || selectedChapter.title}
                </h3>
                <div className="panel-chap-meta">
                  <span className="meta-chip">
                    Total MCQs: <strong>{chapterMcqs.length}</strong>
                  </span>
                  <span className="meta-chip success">
                    Chapter ID: <code className="id-code">{String(selectedChapter.id).slice(0, 10)}...</code>
                  </span>
                </div>
              </div>
            </div>

            <div className="panel-controls">
              {/* Targeted MCQ Culling / Delete Control */}
              <div className="trim-control-box edutech-input-group targeted-del-box">
                <span className="control-lbl">Delete Targeted:</span>
                <input
                  type="number"
                  min="1"
                  max={chapterMcqs.length || 999}
                  className="admin-input-sm limit-input"
                  value={targetedDeleteCount}
                  onChange={(e) => setTargetedDeleteCount(e.target.value)}
                  placeholder="Qty"
                />
                <select
                  className="admin-select-sm pos-select"
                  value={targetedDeletePos}
                  onChange={(e) => setTargetedDeletePos(e.target.value)}
                >
                  <option value="end">From End (Last Qs)</option>
                  <option value="start">From Start (First Qs)</option>
                </select>
                <Button
                  variant="danger"
                  size="sm"
                  className="btn-targeted-action"
                  onClick={handleDeleteTargetedMcqs}
                  disabled={isDeletingTargeted || chapterMcqs.length === 0}
                >
                  {isDeletingTargeted ? 'Deleting...' : `Delete Targeted Qs`}
                </Button>
              </div>

              {/* Trim MCQs Control */}
              <div className="trim-control-box edutech-input-group">
                <span className="control-lbl">Max Limit:</span>
                <input
                  type="number"
                  min="0"
                  className="admin-input-sm limit-input"
                  value={maxMcqsLimit}
                  onChange={(e) => setMaxMcqsLimit(e.target.value)}
                  placeholder="Cap"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-trim-action"
                  onClick={handleApplyMaxLimit}
                  disabled={isTrimming || chapterMcqs.length === 0}
                >
                  {isTrimming ? 'Trimming...' : 'Apply Cap'}
                </Button>
              </div>

              {/* Clear All MCQs */}
              <Button
                variant="danger"
                size="sm"
                className="btn-clear-action"
                onClick={handleDeleteAllChapterMcqs}
                disabled={isDeletingAll || chapterMcqs.length === 0}
              >
                {isDeletingAll ? 'Clearing...' : 'Clear All Chapter MCQs'}
              </Button>

              {/* Reset Readiness & Accuracy State */}
              <Button
                variant="secondary"
                size="sm"
                className="btn-reset-state-action"
                onClick={handleResetChapterProgress}
                disabled={isResettingProgress || !selectedChapterId}
                title="Reset readiness score, accuracy %, and student attempt progress for this chapter"
              >
                <AppIcon name="timer" size={13} />
                {isResettingProgress ? 'Resetting...' : 'Reset Readiness & Accuracy'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Search, Difficulty Filter & Stats Toolbar */}
        <div className="mcq-manager-toolbar notebook-toolbar">
          <div className="search-box notebook-search-box">
            <AppIcon name="search" size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search questions by text or explanation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-pills-group">
            {['ALL', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                type="button"
                className={`filter-pill ${difficultyFilter === diff ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(diff)}
              >
                {diff === 'ALL' ? 'All Difficulties' : diff}
              </button>
            ))}
          </div>

          <div className="toolbar-count-badge">
            <span className="count-active">{filteredMcqs.length}</span> / {chapterMcqs.length} Questions
          </div>
        </div>
      </div>

        {/* MCQs Notebook Questions List */}
        {loading ? (
          <div className="mcq-manager-loading edutech-loading-state">
            <div className="loading-spinner" />
            <p>Loading notebook questions from Supabase...</p>
          </div>
        ) : filteredMcqs.length === 0 ? (
          <div className="mcq-manager-empty edutech-empty-card">
            <div className="empty-icon-wrap">
              <AppIcon name="mcqs" size={36} />
            </div>
            <h4>No Questions Found</h4>
            <p>
              {searchQuery || difficultyFilter !== 'ALL'
                ? 'No MCQs match your current search and difficulty filters.'
                : 'This chapter does not contain any MCQs yet. Use the AI Content Studio or JSON Injector to add questions.'}
            </p>
          </div>
        ) : (
          <div className="mcq-cards-grid notebook-questions-list">
            {filteredMcqs.map((mcq, index) => {
              let opts = []
              if (Array.isArray(mcq.options) && mcq.options.length > 0) {
                opts = mcq.options
              } else if (mcq.options && typeof mcq.options === 'object') {
                opts = ['A', 'B', 'C', 'D', 'E']
                  .map((k) => mcq.options[k] ?? mcq.options[k.toLowerCase()])
                  .filter((v) => v !== undefined && v !== null)
              }
              if (opts.length < 2) {
                opts = [mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d, mcq.option_e].filter(Boolean)
              }
              if (opts.length < 2) {
                opts = ['Option A', 'Option B', 'Option C', 'Option D']
              }
              const correctIdx = typeof mcq.correct === 'number' ? mcq.correct : (mcq.correct_answer ?? 0)
              const userChoice = userSelectedOpts[mcq.id]
              const isExplanationOpen = expandedExplanations[mcq.id]
              const difficultyTag = getDifficultyText(mcq)

              return (
                <div
                  key={mcq.id || index}
                  className={`mcq-item-card notebook-question-card ${
                    userChoice !== undefined && userChoice !== null
                      ? userChoice === correctIdx
                        ? 'answered-correct'
                        : 'answered-wrong'
                      : ''
                  }`}
                  style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
                >
                  {/* Notebook Card Header */}
                  <div className="mcq-card-header">
                    <div className="card-header-left">
                      <span className="notebook-q-badge">Q{index + 1}</span>
                      <span className={`difficulty-tag tag-${difficultyTag.toLowerCase()}`}>
                         {difficultyTag}
                      </span>
                      <PyqBadge question={mcq} size="xs" />
                    </div>

                    <div className="mcq-card-actions">
                      <button
                        type="button"
                        className="btn-icon-text btn-edit-interactive"
                        onClick={() => handleOpenEditModal(mcq)}
                        title="Edit question text and options"
                      >
                        <AppIcon name="edit" size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn-icon-text btn-delete-interactive"
                        onClick={() => handleDeleteSingleMcq(mcq.id, mcq.question)}
                        title="Delete this question"
                      >
                        <AppIcon name="close" size={13} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="mcq-card-question notebook-question-text">
                    <FormattedQuestionText text={mcq.question || mcq.text} question={mcq} />
                  </div>

                  {/* Interactive Options Grid */}
                  <div className="mcq-card-options notebook-options-grid">
                    {opts.map((opt, oIdx) => {
                      const isCorrect = oIdx === correctIdx
                      const isSelected = userChoice === oIdx
                      const letter = String.fromCharCode(65 + oIdx)

                      let optStateClass = ''
                      if (isCorrect) optStateClass += ' opt-correct-key'
                      if (isSelected) {
                        optStateClass += isCorrect ? ' user-selected-correct' : ' user-selected-wrong'
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`mcq-opt-chip notebook-opt-chip ${optStateClass}`}
                          onClick={() => handleSelectOption(mcq.id, oIdx)}
                          title="Click option to preview interactive student feedback"
                        >
                          <span className="opt-letter-circle">{letter}</span>
                          <span className="opt-text">{opt || `Option ${letter}`}</span>
                          {isCorrect && (
                            <span className="correct-tag-badge">
                              <span className="check-icon">✓</span> CORRECT
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="wrong-tag-badge">SELECTED</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Explanation Box / Accordion */}
                  {mcq.explanation ? (
                    <div className="explanation-accordion-wrapper">
                      <button
                        type="button"
                        className="explanation-toggle-btn"
                        onClick={() => toggleExplanation(mcq.id)}
                      >
                        <span className="toggle-icon">{isExplanationOpen ? '▼' : '►'}</span>
                        <span className="toggle-title">Solution Explanation</span>
                      </button>

                      {(isExplanationOpen || userChoice !== undefined) && (
                        <div className="mcq-card-explanation notebook-explanation-box">
                          <div className="explanation-header-tag">💡 Pedagogical Explanation:</div>
                          <div className="explanation-body-text">{mcq.explanation}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {/* Edit MCQ Notebook Modal */}
        {editingMcq && (
          <div className="admin-modal-overlay notebook-modal-overlay">
            <div className="admin-modal-card notebook-modal-card">
              <div className="modal-header notebook-modal-header">
                <div className="modal-title-wrap">
                  <span className="modal-badge-icon">
                    <AppIcon name="edit" size={16} />
                  </span>
                  <h3 className="modal-title">Edit Notebook Question</h3>
                </div>
                <button type="button" className="close-btn" onClick={() => setEditingMcq(null)}>
                  <AppIcon name="close" size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="modal-form">
                <div className="form-group">
                  <label className="input-label">Question Text</label>
                  <textarea
                    className="admin-textarea notebook-textarea"
                    rows={3}
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-options-grid">
                  <div className="form-group">
                    <label className="input-label">Option A</label>
                    <input
                      type="text"
                      className="admin-input notebook-input"
                      value={editOptA}
                      onChange={(e) => setEditOptA(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Option B</label>
                    <input
                      type="text"
                      className="admin-input notebook-input"
                      value={editOptB}
                      onChange={(e) => setEditOptB(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Option C</label>
                    <input
                      type="text"
                      className="admin-input notebook-input"
                      value={editOptC}
                      onChange={(e) => setEditOptC(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Option D</label>
                    <input
                      type="text"
                      className="admin-input notebook-input"
                      value={editOptD}
                      onChange={(e) => setEditOptD(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">Correct Answer</label>
                  <select
                    className="admin-select notebook-select"
                    value={editCorrect}
                    onChange={(e) => setEditCorrect(Number(e.target.value))}
                  >
                    <option value={0}>Option A (Correct)</option>
                    <option value={1}>Option B (Correct)</option>
                    <option value={2}>Option C (Correct)</option>
                    <option value={3}>Option D (Correct)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Explanation</label>
                  <textarea
                    className="admin-textarea notebook-textarea"
                    rows={3}
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    placeholder="Detailed step-by-step solution for students..."
                  />
                </div>

                <div className="modal-footer notebook-modal-footer">
                  <Button type="button" variant="secondary" onClick={() => setEditingMcq(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSavingEdit}>
                    {isSavingEdit ? 'Saving Changes...' : 'Save Question Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Visual Satisfying Delete Confirmation Modal (Desktop & Mobile) */}
        {deleteConfirmModal?.isOpen && (
          <div className="mcq-delete-modal-overlay">
            <div
              className={`mcq-delete-modal-card ${
                deleteConfirmModal.dangerLevel === 'high' ? 'danger-high' : ''
              }`}
            >
              {/* Modal Pulse Icon */}
              <div className="mcq-delete-badge-ring">
                <div className="mcq-delete-badge-icon">
                  <AppIcon name="close" size={20} />
                </div>
              </div>

              {/* Header Info */}
              <h3 className="mcq-delete-modal-title">{deleteConfirmModal.title}</h3>
              <p className="mcq-delete-modal-subtitle">{deleteConfirmModal.subtitle}</p>

              {/* Summary Details Box */}
              <div className="mcq-delete-details-box">
                <div className="detail-row">
                  <span className="detail-lbl">Target Chapter:</span>
                  <span className="detail-val chapter-tag" title={deleteConfirmModal.chapterName}>
                    {deleteConfirmModal.chapterName}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-lbl">Deletion Scope:</span>
                  <span className="detail-val count-tag">{deleteConfirmModal.countText}</span>
                </div>
                {deleteConfirmModal.questionPreview ? (
                  <div className="detail-preview-box">
                    <span className="detail-lbl">Question Preview:</span>
                    <div className="detail-preview-text">
                      "{deleteConfirmModal.questionPreview.slice(0, 110)}
                      {deleteConfirmModal.questionPreview.length > 110 ? '...' : ''}"
                    </div>
                  </div>
                ) : null}
                <div className="detail-row protection-row">
                  <span className="protection-icon">🛡️</span>
                  <span className="protection-text">{deleteConfirmModal.warningNote}</span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="mcq-delete-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  className="btn-cancel-modal"
                  disabled={isExecutingDelete}
                  onClick={() => setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="btn-confirm-delete-modal"
                  disabled={isExecutingDelete}
                  onClick={async () => {
                    if (deleteConfirmModal.onConfirm) {
                      setIsExecutingDelete(true)
                      await deleteConfirmModal.onConfirm()
                      setIsExecutingDelete(false)
                      setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }))
                    }
                  }}
                >
                  {isExecutingDelete ? 'Deleting...' : 'Yes, Confirm Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
