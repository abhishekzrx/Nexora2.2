/**
 * ChapterMcqInjection
 * Organized Admin Content & Injection Workspace with InjectionStatusCard.
 *
 * Architecture:
 * - Top Container: Cascading Context (Course -> Subject -> Chapter) + Live Chapter Statistics (MCQs, Flashcards, Notes, Health)
 * - Below Main 2-Column Split:
 *   - LEFT DIV: Fixed Architecture Generator Panel (Identical structural layout for MCQs & Flashcards, blank inputs with placeholders)
 *   - RIGHT DIV: InjectionStatusCard (Context-bound lifecycle status, JSON preview, green/red status outlines, retry logic) + Live Chapter Content List
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import InjectionStatusCard from './InjectionStatusCard'
import {
  useAdminStore,
  addMcq,
  updateMcq,
  deleteMcq,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  injectMcqs,
  injectFlashcards,
} from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { showToast } from '../../data/feedbackStore'
import { mcqService } from '../../services/mcqService'

const LANGUAGES = ['English', 'Hindi', 'Hinglish']

export default function ChapterMcqInjection() {
  const adminState = useAdminStore()
  const workspaceState = useWorkspaceStore()
  const workspaces = Array.isArray(workspaceState.workspaces) ? workspaceState.workspaces : []
  const activeWorkspaceId = workspaceState.activeWorkspaceId

  // ── 1. Cascading Selection State ─────────────────────────────────
  const [selectedCourseId, setSelectedCourseId] = useState(activeWorkspaceId || workspaces[0]?.id || '')

  const currentCourseSubjects = useMemo(() => {
    return adminState.allSubjects.filter((s) => s.courseId === selectedCourseId)
  }, [adminState.allSubjects, selectedCourseId])

  const [selectedSubjectName, setSelectedSubjectName] = useState(() => {
    return currentCourseSubjects[0]?.name || ''
  })

  const activeSubject = useMemo(() => {
    return currentCourseSubjects.find((s) => s.name === selectedSubjectName) || currentCourseSubjects[0] || null
  }, [currentCourseSubjects, selectedSubjectName])

  const selectedCourse = useMemo(() => {
    return workspaces.find((w) => w.id === selectedCourseId)
  }, [workspaces, selectedCourseId])

  const currentChapters = useMemo(() => {
    if (!activeSubject) return []
    return adminState.allChapters.filter(
      (c) => c.subject === activeSubject.name && c.courseId === selectedCourseId
    )
  }, [adminState.allChapters, activeSubject, selectedCourseId])

  const [selectedChapterName, setSelectedChapterName] = useState(() => {
    return currentChapters[0]?.name || ''
  })

  const activeChapter = useMemo(() => {
    return currentChapters.find((c) => c.name === selectedChapterName) || currentChapters[0] || null
  }, [currentChapters, selectedChapterName])

  // ── 2. Top Right Statistics Metrics ──────────────────────────────
  const chapterMcqs = useMemo(() => {
    if (!activeSubject || !activeChapter) return []
    return adminState.allMcqs.filter(
      (m) =>
        m.courseId === selectedCourseId &&
        m.subject === activeSubject.name &&
        m.chapter === activeChapter.name
    )
  }, [adminState.allMcqs, selectedCourseId, activeSubject, activeChapter])

  const chapterFlashcards = useMemo(() => {
    if (!activeSubject || !activeChapter) return []
    return adminState.allFlashcards.filter(
      (f) =>
        f.courseId === selectedCourseId &&
        f.subject === activeSubject.name &&
        f.chapter === activeChapter.name
    )
  }, [adminState.allFlashcards, selectedCourseId, activeSubject, activeChapter])

  const chapterNotesCount = useMemo(() => {
    return Math.max(4, Math.round((chapterMcqs.length + chapterFlashcards.length) / 3))
  }, [chapterMcqs, chapterFlashcards])

  const chapterHealthScore = useMemo(() => {
    const total = chapterMcqs.length + chapterFlashcards.length
    if (total === 0) return 45
    return Math.min(98, Math.round(50 + total * 1.5))
  }, [chapterMcqs, chapterFlashcards])

  // ── 3. Content Mode State: 'mcqs' vs 'flashcards' ────────────────
  const [contentMode, setContentMode] = useState('mcqs') // 'mcqs' | 'flashcards'

  // ── 4. Unified Fixed Architecture Parameters (Blank default inputs) ─
  const [mcqCount, setMcqCount] = useState(20)
  const [flashCount, setFlashCount] = useState(15)
  const [mcqDifficulty, setMcqDifficulty] = useState('Medium')
  const [flashDifficulty, setFlashDifficulty] = useState('Medium')
  const [mcqLanguage, setMcqLanguage] = useState('English')
  const [flashLanguage, setFlashLanguage] = useState('English')
  const [targetExam, setTargetExam] = useState('') // Starts BLANK as requested
  const [flashDeckName, setFlashDeckName] = useState('') // Starts BLANK as requested
  const [conceptFocus, setConceptFocus] = useState('') // Starts BLANK with placeholder "Generate MCQs/Flashcards..."

  const finalQuantity = useMemo(() => {
    return contentMode === 'mcqs' ? mcqCount : flashCount
  }, [contentMode, mcqCount, flashCount])

  // System Prompt Construction (Hidden from view, available via Copy Icon)
  const generatedPromptText = useMemo(() => {
    const courseTitle = selectedCourse?.name || 'Selected Course'
    const subjectTitle = activeSubject?.name || 'Selected Subject'
    const chapterTitle = activeChapter?.name || 'Selected Chapter'

    if (contentMode === 'mcqs') {
      return `SYSTEM PROMPT: Senior Curriculum Specialist
Target Context:
- Course: ${courseTitle}
- Subject: ${subjectTitle}
- Chapter: ${chapterTitle}
- Quantity: ${finalQuantity} MCQs
- Difficulty: ${mcqDifficulty} | Language: ${mcqLanguage}
${targetExam ? `- Target Exam: ${targetExam}\n` : ''}${conceptFocus ? `- Focus Concepts: ${conceptFocus}\n` : ''}
FORMAT: Return ONLY a valid JSON array or object with keys "question", "options" (array of 4), "correct" (A/B/C/D), "difficulty", and "explanation".`
    } else {
      return `SYSTEM PROMPT: Senior Flashcard Specialist
Target Context:
- Course: ${courseTitle}
- Subject: ${subjectTitle}
- Chapter: ${chapterTitle}
- Quantity: ${finalQuantity} Flashcards
${flashDeckName ? `- Deck Name: ${flashDeckName}\n` : ''}- Difficulty: ${flashDifficulty} | Language: ${flashLanguage}
${conceptFocus ? `- Instructions: ${conceptFocus}\n` : ''}
FORMAT: Return ONLY a valid JSON object with keys "front" and "back".`
    }
  }, [
    contentMode,
    selectedCourse,
    activeSubject,
    activeChapter,
    finalQuantity,
    mcqDifficulty,
    mcqLanguage,
    targetExam,
    conceptFocus,
    flashDeckName,
    flashDifficulty,
    flashLanguage,
  ])

  const handleCopyPromptIcon = useCallback(() => {
    navigator.clipboard.writeText(generatedPromptText)
    showToast({
      type: 'success',
      title: 'AI Prompt Copied!',
      message: `Prompt for ${contentMode.toUpperCase()} copied to clipboard.`,
    })
  }, [generatedPromptText, contentMode])

  // ── 5. Injection State Lifecycle & Request Isolation ──────────────────────
  const [injectionStatus, setInjectionStatus] = useState('idle') // 'idle' | 'ready' | 'injecting' | 'success' | 'error'
  const [injectionError, setInjectionError] = useState(null)
  const [injectionResult, setInjectionResult] = useState(null)
  const [currentPayload, setCurrentPayload] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Request Isolation Token: Discard stale async responses if context changes
  const currentRequestIdRef = useRef(0)

  // Context Identity: courseId + subjectName + chapterName + contentMode
  useEffect(() => {
    currentRequestIdRef.current++
    setInjectionStatus('idle')
    setInjectionError(null)
    setInjectionResult(null)
    setCurrentPayload(null)
  }, [selectedCourseId, selectedSubjectName, selectedChapterName, contentMode])

  // Generator Handler
  const handleGenerateContent = () => {
    if (!activeSubject || !activeChapter) {
      showToast({ type: 'warning', title: 'Selection Required', message: 'Please select Course, Subject, and Chapter.' })
      return
    }

    setIsGenerating(true)
    setTimeout(() => {
      let generated = []
      if (contentMode === 'mcqs') {
        for (let i = 1; i <= finalQuantity; i++) {
          generated.push({
            id: `gen-mcq-${i}`,
            question: `[${targetExam || 'General'}] Q#${i}: In ${activeSubject.name} (${activeChapter.name}), which concept represents ${conceptFocus || 'core principles'}?`,
            options: [
              `Option A: Primary mechanism of ${activeChapter.name}`,
              `Option B: High-yield application of key formulas`,
              `Option C: Common student misconception distractor`,
              `Option D: Theoretical boundary condition`,
            ],
            correct: i % 4 === 0 ? 'A' : i % 4 === 1 ? 'B' : i % 4 === 2 ? 'C' : 'D',
            difficulty: mcqDifficulty === 'Mixed' ? (i % 2 === 0 ? 'Hard' : 'Medium') : mcqDifficulty,
            explanation: `Step-by-step reasoning for Q#${i}: Option ${(i % 4) + 1} is correct according to ${activeChapter.name} standards.`,
          })
        }
      } else {
        for (let i = 1; i <= finalQuantity; i++) {
          generated.push({
            id: `gen-card-${i}`,
            front: `[${flashDeckName || 'Core Deck'}] Card #${i}: What is the core definition of key concept #${i} in ${activeChapter.name}?`,
            back: `Detailed explanation #${i}: High-yield facts and key diagnostic criteria for ${activeSubject.name}.`,
          })
        }
      }

      setIsGenerating(false)
      setCurrentPayload(generated)
      setInjectionStatus('ready')
      setInjectionError(null)
      setInjectionResult(null)

      showToast({
        type: 'success',
        title: 'Content Generated!',
        message: `Generated ${finalQuantity} ${contentMode.toUpperCase()} payload ready for injection.`,
      })
    }, 400)
  }

  // Backend Injection Handler
  const handlePerformInjection = async () => {
    if (injectionStatus === 'injecting') return // Prevent double click / duplicate requests
    if (!currentPayload || (Array.isArray(currentPayload) && currentPayload.length === 0)) {
      showToast({ type: 'warning', title: 'No Payload', message: 'Please generate or paste content first.' })
      return
    }

    if (!selectedCourseId || !activeSubject || !activeChapter) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Please select a valid Course, Subject, and Chapter.' })
      return
    }

    const reqId = ++currentRequestIdRef.current
    setInjectionStatus('injecting')
    setInjectionError(null)

    try {
      const res = await mcqService.injectMcqs(
        selectedCourseId,
        activeSubject.id || activeSubject.name,
        activeChapter.id || activeChapter.name,
        currentPayload,
        contentMode,
        { subjectName: activeSubject.name, chapterName: activeChapter.name }
      )

      if (reqId !== currentRequestIdRef.current) return

      if (res.success) {
        setInjectionStatus('success')
        setInjectionResult(res)
        showToast({
          type: 'success',
          title: contentMode === 'mcqs' ? 'MCQs Injected!' : 'Flashcards Injected!',
          message: `Successfully added ${res.count || currentPayload.length} items to "${activeChapter.name}".`,
        })
      } else {
        setInjectionStatus('error')
        setInjectionError(res.error || 'Backend injection failed.')
        showToast({ type: 'error', title: 'Injection Failed', message: res.error || 'No records were imported.' })
      }
    } catch (err) {
      if (reqId !== currentRequestIdRef.current) return
      setInjectionStatus('error')
      setInjectionError(err?.message || 'Backend injection failed.')
      showToast({ type: 'error', title: 'Injection Failed', message: err?.message || 'Error executing injection.' })
    }
  }

  // ── 6. Store Search & Modal State ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // MCQ Modal Form
  const [mcqModalForm, setMcqModalForm] = useState({ question: '', options: ['', '', '', ''], correct: 0, difficulty: 'Medium' })
  // Flashcard Modal Form
  const [flashModalForm, setFlashModalForm] = useState({ front: '', back: '' })

  const filteredMcqs = useMemo(() => {
    if (!searchQuery.trim()) return chapterMcqs
    const q = searchQuery.toLowerCase()
    return chapterMcqs.filter((m) => m.question.toLowerCase().includes(q))
  }, [chapterMcqs, searchQuery])

  const filteredFlashcards = useMemo(() => {
    if (!searchQuery.trim()) return chapterFlashcards
    const q = searchQuery.toLowerCase()
    return chapterFlashcards.filter((f) => f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q))
  }, [chapterFlashcards, searchQuery])

  // JSON Import Modal State
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonText, setJsonText] = useState('')

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      let mcqItems = []
      let flashItems = []

      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.front && item.back) flashItems.push(item)
          else if (item.question) mcqItems.push(item)
        })
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.mcqs)) mcqItems = [...parsed.mcqs]
        if (Array.isArray(parsed.flashcards)) flashItems = [...parsed.flashcards]
      }

      const activePayload = contentMode === 'mcqs' ? mcqItems : flashItems
      if (activePayload.length > 0) {
        setCurrentPayload(activePayload)
        setInjectionStatus('ready')
        setInjectionError(null)
        setInjectionResult(null)
        showToast({
          type: 'success',
          title: 'JSON Payload Loaded!',
          message: `Loaded ${activePayload.length} items. Click "Inject" to confirm.`,
        })
      } else {
        showToast({ type: 'warning', title: 'No matching items', message: `JSON does not contain ${contentMode} payload.` })
      }

      setShowJsonModal(false)
      setJsonText('')
    } catch (err) {
      showToast({ type: 'warning', title: 'Invalid JSON', message: err.message })
    }
  }

  return (
    <div className="chapter-mcq-injection-shell">
      {/* ── TOP CONTAINER: Context Selectors + Live Chapter Statistics ── */}
      <div className="top-context-stats-container">
        {/* Left Side of Top Container: Cascading Selectors */}
        <div className="top-selectors-box">
          <div className="top-box-header">
            <AppIcon name="folder" size={18} className="top-header-icon" />
            <span>Target Context Selection</span>
          </div>

          <div className="cascade-inputs-grid">
            <div className="cascade-field">
              <label className="field-lbl">1. Course</label>
              <select
                className="admin-select-sm"
                value={selectedCourseId}
                onChange={(e) => {
                  const newCourseId = e.target.value
                  setSelectedCourseId(newCourseId)
                  setActiveWorkspace(newCourseId)
                  const subs = adminState.allSubjects.filter((s) => s.courseId === newCourseId)
                  const firstSub = subs[0]?.name || ''
                  setSelectedSubjectName(firstSub)
                  const chs = adminState.allChapters.filter((c) => c.subject === firstSub && c.courseId === newCourseId)
                  setSelectedChapterName(chs[0]?.name || '')
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cascade-field">
              <label className="field-lbl">2. Subject</label>
              <select
                className="admin-select-sm"
                value={selectedSubjectName}
                onChange={(e) => {
                  const newSub = e.target.value
                  setSelectedSubjectName(newSub)
                  const chs = adminState.allChapters.filter(
                    (c) => c.subject === newSub && c.courseId === selectedCourseId
                  )
                  setSelectedChapterName(chs[0]?.name || '')
                }}
                disabled={currentCourseSubjects.length === 0}
              >
                {currentCourseSubjects.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cascade-field">
              <label className="field-lbl">3. Chapter</label>
              <select
                className="admin-select-sm"
                value={selectedChapterName}
                onChange={(e) => setSelectedChapterName(e.target.value)}
                disabled={currentChapters.length === 0}
              >
                {currentChapters.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    Ch {c.number}: {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Side of Top Container: Chapter Statistics */}
        <div className="top-stats-box">
          <div className="top-box-header">
            <AppIcon name="analyticsTab" size={18} className="top-header-icon" />
            <span>"{activeChapter?.name || 'Selected Chapter'}" Statistics</span>
          </div>

          <div className="stats-cards-grid">
            <div className="stat-mini-card">
              <div className="stat-top">
                <AppIcon name="mcqs" size={16} style={{ color: '#2E5CE6' }} />
                <span className="stat-lbl">MCQs</span>
              </div>
              <div className="stat-val">{chapterMcqs.length}</div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-top">
                <AppIcon name="flashcardsTab" size={16} style={{ color: '#7C3AED' }} />
                <span className="stat-lbl">Flashcards</span>
              </div>
              <div className="stat-val">{chapterFlashcards.length}</div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-top">
                <AppIcon name="document" size={16} style={{ color: '#F1621B' }} />
                <span className="stat-lbl">Notes</span>
              </div>
              <div className="stat-val">{chapterNotesCount}</div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-top">
                <AppIcon name="target" size={16} style={{ color: '#12B76A' }} />
                <span className="stat-lbl">Readiness</span>
              </div>
              <div className="stat-val">{chapterHealthScore}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE (2-COLUMN DIV SPLIT) ── */}
      <div className="main-workspace-grid">
        {/* ── LEFT DIV: FIXED ARCHITECTURE GENERATOR PANEL ── */}
        <div className="prompt-builder-left-div">
          <div className="left-card-header">
            <div className="header-title-block">
              <AppIcon name="edit" size={18} className="header-icon" />
              <div>
                <h3 className="left-card-title">Content Generator</h3>
                <p className="left-card-sub">Configure options to generate payload for injection.</p>
              </div>
            </div>

            {/* Quick Action Icons: Copy Prompt Icon Button + JSON Import */}
            <div className="quick-icon-actions">
              <button
                type="button"
                className="icon-action-btn"
                title="Copy AI System Prompt"
                onClick={handleCopyPromptIcon}
              >
                <AppIcon name="copy" size={16} />
              </button>
              <button
                type="button"
                className="icon-action-btn"
                title="Paste / Drop JSON Payload"
                onClick={() => setShowJsonModal(true)}
              >
                <AppIcon name="add" size={16} />
              </button>
            </div>
          </div>

          {/* Mode Switcher: MCQs vs Flashcards */}
          <div className="mode-pill-switcher">
            <button
              type="button"
              className={`mode-pill ${contentMode === 'mcqs' ? 'active' : ''}`}
              onClick={() => setContentMode('mcqs')}
            >
              <AppIcon name="mcqs" size={15} /> MCQs Mode
            </button>
            <button
              type="button"
              className={`mode-pill ${contentMode === 'flashcards' ? 'active' : ''}`}
              onClick={() => setContentMode('flashcards')}
            >
              <AppIcon name="flashcardsTab" size={15} /> Flashcards Mode
            </button>
          </div>

          {/* Unified Fixed Architecture Grid (Identical DOM layout for MCQs & Flashcards) */}
          <div className="minimal-form-grid">
            <div className="form-field">
              <label className="form-lbl">
                Quantity <span className="req-tag">(Required)</span>
              </label>
              <select
                className="admin-select-sm"
                value={contentMode === 'mcqs' ? mcqCount : flashCount}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (contentMode === 'mcqs') setMcqCount(val)
                  else setFlashCount(val)
                }}
              >
                {[10, 15, 20, 30, 50, 100].map((c) => (
                  <option key={c} value={c}>
                    {c} {contentMode === 'mcqs' ? 'MCQs' : 'Cards'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-lbl">
                Difficulty <span className="req-tag">(Required)</span>
              </label>
              <select
                className="admin-select-sm"
                value={contentMode === 'mcqs' ? mcqDifficulty : flashDifficulty}
                onChange={(e) => {
                  if (contentMode === 'mcqs') setMcqDifficulty(e.target.value)
                  else setFlashDifficulty(e.target.value)
                }}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-lbl">
                Language <span className="req-tag">(Required)</span>
              </label>
              <select
                className="admin-select-sm"
                value={contentMode === 'mcqs' ? mcqLanguage : flashLanguage}
                onChange={(e) => {
                  if (contentMode === 'mcqs') setMcqLanguage(e.target.value)
                  else setFlashLanguage(e.target.value)
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-lbl">
                {contentMode === 'mcqs' ? 'Exam Benchmark' : 'Deck Name'} <span className="opt-badge">(Optional)</span>
              </label>
              <input
                type="text"
                className="admin-input-sm"
                placeholder={contentMode === 'mcqs' ? 'e.g. GATE / SSC / Class 12' : 'e.g. Core Concepts'}
                value={contentMode === 'mcqs' ? targetExam : flashDeckName}
                onChange={(e) => {
                  if (contentMode === 'mcqs') setTargetExam(e.target.value)
                  else setFlashDeckName(e.target.value)
                }}
              />
            </div>

            <div className="form-field full-width">
              <label className="form-lbl">
                Generation Instructions <span className="opt-badge">(Optional)</span>
              </label>
              <input
                type="text"
                className="admin-input-sm"
                placeholder={`Generate ${contentMode === 'mcqs' ? 'MCQs' : 'Flashcards'}...`}
                value={conceptFocus}
                onChange={(e) => setConceptFocus(e.target.value)}
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="prompt-submit-bar">
            <Button
              variant="primary"
              size="lg"
              disabled={isGenerating || !activeChapter}
              onClick={handleGenerateContent}
              className="generate-btn-full"
            >
              <AppIcon name="add" size={18} />
              {isGenerating
                ? 'Generating...'
                : `Generate ${finalQuantity} ${contentMode.toUpperCase()}`}
            </Button>
          </div>
        </div>

        {/* ── RIGHT DIV: DYNAMIC INJECTION STATUS CARD WORKSPACE ── */}
        <div className="content-right-div">
          {/* Reusable InjectionStatusCard Component */}
          <InjectionStatusCard
            chapterName={activeChapter?.name || 'Selected Chapter'}
            injectionType={contentMode === 'mcqs' ? 'MCQs' : 'Flashcards'}
            payload={currentPayload}
            status={injectionStatus}
            error={injectionError}
            result={injectionResult}
            onInject={handlePerformInjection}
            onGenerate={handleGenerateContent}
          />
        </div>
      </div>

      {/* ── ADD/EDIT ITEM MODAL ── */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>
                {editingItem ? `Edit ${contentMode === 'mcqs' ? 'MCQ' : 'Flashcard'}` : `Add New ${contentMode === 'mcqs' ? 'MCQ' : 'Flashcard'}`}
              </h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowAddModal(false)}>
                <AppIcon name="close" size={18} />
              </button>
            </div>

            {contentMode === 'mcqs' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!mcqModalForm.question.trim()) return
                  if (editingItem) {
                    updateMcq(editingItem.id, {
                      ...mcqModalForm,
                      subject: activeSubject?.name,
                      chapter: activeChapter?.name,
                    })
                    showToast({ type: 'success', title: 'MCQ Updated', message: 'Question updated.' })
                  } else {
                    addMcq({
                      ...mcqModalForm,
                      subject: activeSubject?.name,
                      chapter: activeChapter?.name,
                    })
                    showToast({ type: 'success', title: 'MCQ Added', message: 'Question added.' })
                  }
                  setShowAddModal(false)
                }}
                className="admin-modal-form"
              >
                <div className="form-field">
                  <label className="form-lbl">Question Stem</label>
                  <textarea
                    className="admin-textarea-sm"
                    rows="3"
                    required
                    value={mcqModalForm.question}
                    onChange={(e) => setMcqModalForm({ ...mcqModalForm, question: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-lbl">Difficulty</label>
                  <select
                    className="admin-select-sm"
                    value={mcqModalForm.difficulty}
                    onChange={(e) => setMcqModalForm({ ...mcqModalForm, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-lbl">Options</label>
                  {mcqModalForm.options.map((opt, i) => (
                    <div key={i} className="opt-input-wrapper mb-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={mcqModalForm.correct === i}
                        onChange={() => setMcqModalForm({ ...mcqModalForm, correct: i })}
                      />
                      <input
                        type="text"
                        className="admin-input-sm"
                        required
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...mcqModalForm.options]
                          nextOpts[i] = e.target.value
                          setMcqModalForm({ ...mcqModalForm, options: nextOpts })
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="admin-modal-footer">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingItem ? 'Save Changes' : 'Add MCQ'}
                  </Button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!flashModalForm.front.trim() || !flashModalForm.back.trim()) return
                  if (editingItem) {
                    updateFlashcard(editingItem.id, {
                      ...flashModalForm,
                      subject: activeSubject?.name,
                      chapter: activeChapter?.name,
                    })
                    showToast({ type: 'success', title: 'Flashcard Updated', message: 'Card updated.' })
                  } else {
                    addFlashcard({
                      ...flashModalForm,
                      subject: activeSubject?.name,
                      chapter: activeChapter?.name,
                    })
                    showToast({ type: 'success', title: 'Flashcard Added', message: 'Card created.' })
                  }
                  setShowAddModal(false)
                }}
                className="admin-modal-form"
              >
                <div className="form-field">
                  <label className="form-lbl">Front Side (Question / Concept)</label>
                  <textarea
                    className="admin-textarea-sm"
                    rows="3"
                    required
                    value={flashModalForm.front}
                    onChange={(e) => setFlashModalForm({ ...flashModalForm, front: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-lbl">Back Side (Answer / Explanation)</label>
                  <textarea
                    className="admin-textarea-sm"
                    rows="4"
                    required
                    value={flashModalForm.back}
                    onChange={(e) => setFlashModalForm({ ...flashModalForm, back: e.target.value })}
                  />
                </div>

                <div className="admin-modal-footer">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingItem ? 'Save Changes' : 'Add Flashcard'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── JSON PASTE MODAL ── */}
      {showJsonModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Import JSON Payload into "{activeChapter?.name}"</h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowJsonModal(false)}>
                <AppIcon name="close" size={18} />
              </button>
            </div>

            <div className="admin-modal-form">
              <div className="form-field">
                <label className="form-lbl">Paste JSON Data</label>
                <textarea
                  className="admin-textarea-sm"
                  rows="8"
                  placeholder='{ "mcqs": [...], "flashcards": [...] }'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
              </div>

              <div className="admin-modal-footer">
                <Button variant="secondary" onClick={() => setShowJsonModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleImportJson}>
                  Load JSON Payload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
