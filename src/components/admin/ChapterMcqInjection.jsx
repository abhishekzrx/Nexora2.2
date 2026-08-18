/**
 * ChapterMcqInjection
 * Organized Admin Content & Injection Workspace with InjectionStatusCard.
 *
 * Architecture:
 * - Top Container: Cascading Context (Course -> Subject -> Chapter) + Live Chapter Statistics
 * - Below Main 2-Column Split:
 *   - LEFT DIV: Content Generator with advanced prompt options
 *   - RIGHT DIV: InjectionStatusCard (JSON input, validation, injection)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import InjectionStatusCard from './InjectionStatusCard'
import {
  useAdminStore,
  addMcq,
  updateMcq,
  addFlashcard,
  updateFlashcard,
} from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { showToast } from '../../data/feedbackStore'
import { mcqService } from '../../services/mcqService'

const LANGUAGES = ['English', 'Hindi', 'Hinglish']

const QUESTION_TYPES = ['Conceptual', 'Numerical', 'Application-based', 'Mixed']
const COGNITIVE_LEVELS = ['Recall', 'Understanding', 'Application', 'Analysis', 'Mixed']
const EXAM_PATTERNS = ['Previous-year style', 'Competitive exam', 'Board exam', 'Custom']
const LANGUAGE_STYLES = ['Simple', 'Academic', 'Exam-oriented']

const SUBJECT_DOMAINS = {
  'digital electronics': [
    { name: 'Number Systems & Boolean Algebra' },
    { name: 'Logic Gates & Minimization (K-Maps)' },
    { name: 'Combinational Logic Circuits' },
    { name: 'Sequential Logic Circuits & Flip-Flops' },
  ],
  'computer organization & architecture (coa)': [
    { name: 'Machine Instructions & Addressing Modes' },
    { name: 'ALU, Data Path & Control Unit Design' },
    { name: 'Memory Hierarchy & Cache Mapping' },
    { name: 'Pipelining & I/O Interface' },
  ],
  'operating systems': [
    { name: 'Processes, Threads & CPU Scheduling' },
    { name: 'Process Synchronization & Deadlocks' },
    { name: 'Memory Management & Virtual Memory' },
    { name: 'File Systems & I/O Protection' },
  ],
  'database management systems (dbms)': [
    { name: 'ER Modeling & Relational Algebra' },
    { name: 'SQL Queries, Joins & Subqueries' },
    { name: 'Normalization & Functional Dependencies' },
    { name: 'Transaction Processing & Concurrency' },
  ],
  'computer networks': [
    { name: 'Network Fundamentals & Architecture' },
    { name: 'Physical & Data Link Layer' },
    { name: 'Network Layer & IP Addressing' },
    { name: 'Transport & Application Layer' },
  ],
  'python programming': [
    { name: 'Data Types, Control Flow & Loops' },
    { name: 'Functions, Modules & Recursion' },
    { name: 'File Handling & Exception Management' },
    { name: 'Object-Oriented Programming (OOP)' },
  ],
  'physics': [
    { name: 'Physical World, Units & Measurements' },
    { name: 'Kinematics & Laws of Motion' },
    { name: 'Work, Energy & Power' },
    { name: 'Gravitation & Fluid Mechanics' },
  ],
  'chemistry': [
    { name: 'Some Basic Concepts & Atomic Structure' },
    { name: 'Chemical Bonding & Molecular Structure' },
    { name: 'States of Matter & Thermodynamics' },
    { name: 'Equilibrium & Redox Reactions' },
  ],
}

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
      (c) =>
        (c.subject === activeSubject.name || c.subjectId === activeSubject.id) &&
        (!selectedCourseId || c.courseId === selectedCourseId)
    )
  }, [adminState.allChapters, activeSubject, selectedCourseId])

  const [selectedChapterName, setSelectedChapterName] = useState(() => {
    return currentChapters[0]?.name || ''
  })

  const activeChapter = useMemo(() => {
    return currentChapters.find((c) => c.name === selectedChapterName) || currentChapters[0] || null
  }, [currentChapters, selectedChapterName])

  // Chapter Description state (loaded automatically when a chapter of any subject is chosen)
  const [chapterDescription, setChapterDescription] = useState('')

  useEffect(() => {
    if (activeChapter) {
      const found = adminState.allChapters.find(
        (c) =>
          (c.name === activeChapter.name || c.id === activeChapter.id) &&
          (!selectedCourseId || c.courseId === selectedCourseId)
      )
      setChapterDescription(found?.desc || found?.description || activeChapter?.desc || activeChapter?.description || '')
    } else {
      setChapterDescription('')
    }
  }, [activeChapter, adminState.allChapters, selectedCourseId])

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
  const [contentMode, setContentMode] = useState('mcqs')

  // ── 4. Generator Parameters ─────────────────────────────────────
  const [mcqCount, setMcqCount] = useState(20)
  const [flashCount, setFlashCount] = useState(15)
  const [mcqDifficulty, setMcqDifficulty] = useState('Medium')
  const [flashDifficulty, setFlashDifficulty] = useState('Medium')
  const [mcqLanguage, setMcqLanguage] = useState('English')
  const [flashLanguage, setFlashLanguage] = useState('English')
  const [targetExam, setTargetExam] = useState('')
  const [flashDeckName, setFlashDeckName] = useState('')
  const [conceptFocus, setConceptFocus] = useState('')

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [questionType, setQuestionType] = useState('Mixed')
  const [cognitiveLevel, setCognitiveLevel] = useState('Mixed')
  const [topicFocus, setTopicFocus] = useState('')
  const [examPattern, setExamPattern] = useState('')
  const [explanationRequired, setExplanationRequired] = useState('Yes')
  const [negativeMarking, setNegativeMarking] = useState('')
  const [languageStyle, setLanguageStyle] = useState('Academic')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const finalQuantity = useMemo(() => {
    return contentMode === 'mcqs' ? mcqCount : flashCount
  }, [contentMode, mcqCount, flashCount])

  const courseTitle = selectedCourse?.name || 'Selected Course'
  const subjectTitle = activeSubject?.name || 'Selected Subject'
  const chapterTitle = activeChapter?.name || 'Selected Chapter'

  const generatedPromptText = useMemo(() => {
    if (contentMode === 'mcqs') {
      return `SYSTEM PROMPT: Senior Curriculum Specialist
Target Context:
- Course: ${courseTitle}
- Subject: ${subjectTitle}
- Chapter: ${chapterTitle}
- Chapter Description: ${chapterDescription || 'N/A'}
- Content Type: MCQs
- Quantity: ${finalQuantity}
- Difficulty: ${mcqDifficulty}
- Language: ${mcqLanguage}
- Exam Benchmark: ${targetExam || 'N/A'}
- Question Type: ${questionType}
- Cognitive Level: ${cognitiveLevel}
- Topic Focus: ${topicFocus || 'N/A'}
- Exam Pattern: ${examPattern || 'N/A'}
- Explanation Required: ${explanationRequired}
- Negative Marking: ${negativeMarking || 'N/A'}
- Language Style: ${languageStyle}
- Special Instructions: ${specialInstructions || 'N/A'}
FORMAT: Return ONLY a valid JSON array with keys "question", "options" (array of 4), "correct" (A/B/C/D), "difficulty", and "explanation".`
    }

    return `SYSTEM PROMPT: Senior Flashcard Specialist
Target Context:
- Course: ${courseTitle}
- Subject: ${subjectTitle}
- Chapter: ${chapterTitle}
- Chapter Description: ${chapterDescription || 'N/A'}
- Content Type: Flashcards
- Quantity: ${finalQuantity}
- Difficulty: ${flashDifficulty}
- Language: ${flashLanguage}
- Deck Name: ${flashDeckName || 'N/A'}
- Language Style: ${languageStyle}
- Special Instructions: ${specialInstructions || 'N/A'}
FORMAT: Return ONLY a valid JSON object with keys "front" and "back".`
  }, [
    contentMode,
    courseTitle,
    subjectTitle,
    chapterTitle,
    chapterDescription,
    finalQuantity,
    mcqDifficulty,
    mcqLanguage,
    targetExam,
    questionType,
    cognitiveLevel,
    topicFocus,
    examPattern,
    explanationRequired,
    negativeMarking,
    languageStyle,
    specialInstructions,
    flashDeckName,
    flashDifficulty,
    flashLanguage,
  ])

  // ── 5. Injection State Lifecycle & Request Isolation ──────────────────────
  const [injectionStatus, setInjectionStatus] = useState('idle')
  const [injectionError, setInjectionError] = useState(null)
  const [injectionResult, setInjectionResult] = useState(null)
  const [currentPayload, setCurrentPayload] = useState(null)

  const currentRequestIdRef = useRef(0)

  useEffect(() => {
    currentRequestIdRef.current++
    setInjectionStatus('idle')
    setInjectionError(null)
    setInjectionResult(null)
    setCurrentPayload(null)
  }, [selectedCourseId, selectedSubjectName, selectedChapterName, contentMode])

  // ── 6. JSON State & Handlers ─────────────────────────────────
  const [copied, setCopied] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonStatus, setJsonStatus] = useState('empty')
  const [jsonError, setJsonError] = useState(null)
  const [jsonItemCount, setJsonItemCount] = useState(0)

  const validateAndParse = useCallback(
    (raw) => {
      try {
        const parsed = JSON.parse(raw)
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

        const activeItems = contentMode === 'mcqs' ? mcqItems : flashItems
        if (activeItems.length > 0) {
          setJsonStatus('valid')
          setJsonError(null)
          setJsonItemCount(activeItems.length)
          setCurrentPayload(activeItems)
          setInjectionStatus('ready')
          setInjectionResult(null)
          return true
        }

        setJsonStatus('invalid')
        setJsonError(`JSON does not contain ${contentMode} payload.`)
        setJsonItemCount(0)
        setCurrentPayload(null)
        return false
      } catch (err) {
        setJsonStatus('invalid')
        setJsonError(err.message)
        setJsonItemCount(0)
        setCurrentPayload(null)
        return false
      }
    },
    [contentMode],
  )

  const handleJsonChange = useCallback(
    (text) => {
      setJsonText(text)
      if (!text.trim()) {
        setJsonStatus('empty')
        setJsonError(null)
        setJsonItemCount(0)
        setCurrentPayload(null)
        setInjectionStatus('idle')
        return
      }
      validateAndParse(text)
    },
    [validateAndParse],
  )

  useEffect(() => {
    if (!jsonText.trim()) {
      setJsonStatus('empty')
      setJsonError(null)
      setJsonItemCount(0)
      setCurrentPayload(null)
      setInjectionStatus('idle')
      return
    }
    validateAndParse(jsonText)
  }, [jsonText, validateAndParse])

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(generatedPromptText)
    setCopied(true)
    showToast({
      type: 'success',
      title: '✓ Prompt Copied',
      message: `Prompt for ${contentMode.toUpperCase()} copied to clipboard.`,
    })
    setTimeout(() => setCopied(false), 2000)
  }, [generatedPromptText, contentMode])

  const handleClearJson = useCallback(() => {
    setJsonText('')
    setJsonStatus('empty')
    setJsonError(null)
    setJsonItemCount(0)
    setCurrentPayload(null)
    setInjectionStatus('idle')
  }, [])

  useEffect(() => {
    if (!jsonText.trim()) {
      setJsonStatus('empty')
      setJsonError(null)
      setJsonItemCount(0)
      setCurrentPayload(null)
      setInjectionStatus('idle')
      return
    }
    validateAndParse(jsonText)
  }, [jsonText, validateAndParse])

  // Backend Injection Handler
  const handlePerformInjection = async () => {
    if (injectionStatus === 'injecting') return
    if (!currentPayload || (Array.isArray(currentPayload) && currentPayload.length === 0)) {
      showToast({ type: 'warning', title: 'No Payload', message: 'Please load valid JSON first.' })
      return
    }

    if (!selectedCourseId || !activeSubject || !activeChapter) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Please select a valid Course, Subject, and Chapter.' })
      return
    }

    if (activeSubject.courseId !== selectedCourseId) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Selected Subject does not belong to the selected Course.' })
      return
    }

    if (activeChapter.subjectId && activeChapter.subjectId !== activeSubject.id) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Selected Chapter does not belong to the selected Subject.' })
      return
    }

    const reqId = ++currentRequestIdRef.current
    setInjectionStatus('injecting')
    setInjectionError(null)

    try {
      const res = await mcqService.injectMcqs(
        selectedCourseId,
        activeSubject.id,
        activeChapter.id,
        currentPayload,
        contentMode,
        { subjectName: activeSubject.name, chapterName: activeChapter.name }
      )

      if (reqId !== currentRequestIdRef.current) return

      if (res.success) {
        setInjectionStatus('success')
        setInjectionResult(res)
        setJsonText('')
        setJsonStatus('empty')
        setJsonError(null)
        setJsonItemCount(0)
        setCurrentPayload(null)
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

  // ── 7. Store Search & Modal State ─────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, _setEditingItem] = useState(null)

  const [mcqModalForm, setMcqModalForm] = useState({ question: '', options: ['', '', '', ''], correct: 0, difficulty: 'Medium' })
  const [flashModalForm, setFlashModalForm] = useState({ front: '', back: '' })

  return (
    <div className="chapter-mcq-injection-shell">
      {/* ── TOP CONTAINER: Context Selectors + Live Chapter Statistics ── */}
      <div className="top-context-stats-container">
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
                title={selectedCourse?.name || 'Select Course'}
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
                  <option key={w.id} value={w.id} title={w.name}>
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
                title={activeSubject?.name || 'Select Subject'}
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
                  <option key={s.id || s.name} value={s.name} title={s.name}>
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
                title={activeChapter ? `Ch ${activeChapter.number}: ${activeChapter.name}` : 'Select Chapter'}
                onChange={(e) => setSelectedChapterName(e.target.value)}
                disabled={currentChapters.length === 0}
              >
                {currentChapters.map((c) => (
                  <option key={c.id || c.name} value={c.name} title={`Ch ${c.number}: ${c.name}`}>
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
        {/* ── LEFT DIV: CONTENT GENERATOR PANEL ── */}
        <div className="prompt-builder-left-div">
          <div className="left-card-header">
            <div className="header-title-block">
              <AppIcon name="edit" size={18} className="header-icon" />
              <div>
                <h3 className="left-card-title">Content Generator</h3>
                <p className="left-card-sub">Configure options, then copy prompt to generate externally.</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleCopyPrompt}
              className="copy-prompt-btn"
            >
              <AppIcon name={copied ? "check" : "copy"} size={16} />
              {copied ? '✓ Prompt Copied' : 'Copy Prompt'}
            </Button>
          </div>

          {/* Target Context Summary Badge Bar */}
          <div className="prompt-context-summary-pill">
            <div className="summary-chip">
              <span className="chip-label">Course:</span> <strong>{courseTitle}</strong>
            </div>
            <div className="summary-chip">
              <span className="chip-label">Subject:</span> <strong>{subjectTitle}</strong>
            </div>
            <div className="summary-chip">
              <span className="chip-label">Chapter:</span> <strong>{chapterTitle}</strong>
            </div>
            <div className={`summary-chip ${chapterDescription ? 'desc-attached' : 'desc-empty'}`}>
              <AppIcon name={chapterDescription ? 'check' : 'help'} size={12} />
              <span>{chapterDescription ? 'Description Attached' : 'No Description'}</span>
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

          {/* Primary Fields Grid */}
          <div className="gen-form-grid">
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
                Chapter Description{' '}
                <span className="opt-badge auto-loaded-badge">
                  <AppIcon name="check" size={10} /> Auto-loaded from Chapter
                </span>
              </label>
              <textarea
                className="admin-textarea-sm prompt-desc-textarea"
                rows="2"
                placeholder="Chapter description loaded automatically when a chapter is selected..."
                value={chapterDescription}
                onChange={(e) => setChapterDescription(e.target.value)}
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

          {/* Advanced Prompt Options */}
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            <AppIcon name={showAdvanced ? "remove" : "add"} size={16} />
            {showAdvanced ? 'Hide Advanced Prompt Options' : 'Advanced Prompt Options'}
          </button>

          {showAdvanced && (
            <div className="advanced-options-grid">
              <div className="form-field">
                <label className="form-lbl">Question Type</label>
                <select
                  className="admin-select-sm"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  {QUESTION_TYPES.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-lbl">Cognitive Level</label>
                <select
                  className="admin-select-sm"
                  value={cognitiveLevel}
                  onChange={(e) => setCognitiveLevel(e.target.value)}
                >
                  {COGNITIVE_LEVELS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-lbl">Exam Pattern</label>
                <select
                  className="admin-select-sm"
                  value={examPattern}
                  onChange={(e) => setExamPattern(e.target.value)}
                >
                  <option value="">None</option>
                  {EXAM_PATTERNS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-lbl">Explanation Required</label>
                <select
                  className="admin-select-sm"
                  value={explanationRequired}
                  onChange={(e) => setExplanationRequired(e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-lbl">Language Style</label>
                <select
                  className="admin-select-sm"
                  value={languageStyle}
                  onChange={(e) => setLanguageStyle(e.target.value)}
                >
                  {LANGUAGE_STYLES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-lbl">Negative Marking</label>
                <input
                  type="text"
                  className="admin-input-sm"
                  placeholder="e.g. 0.25 marks"
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.value)}
                />
              </div>

              <div className="form-field full-width">
                <label className="form-lbl">Topic Focus</label>
                <input
                  type="text"
                  className="admin-input-sm"
                  placeholder="e.g. TCP/IP, OSI Layers"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                />
              </div>

              <div className="form-field full-width">
                <label className="form-lbl">Special Instructions</label>
                <textarea
                  className="admin-textarea-sm"
                  rows="2"
                  placeholder="Any additional instructions for the generator..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT DIV: INJECTION STATUS CARD WORKSPACE ── */}
        <div className="content-right-div">
          <InjectionStatusCard
            chapterName={activeChapter?.name || 'Selected Chapter'}
            chapterDescription={chapterDescription}
            injectionType={contentMode === 'mcqs' ? 'MCQs' : 'Flashcards'}
            jsonText={jsonText}
            onJsonChange={handleJsonChange}
            jsonStatus={jsonStatus}
            jsonError={jsonError}
            jsonItemCount={jsonItemCount}
            injectionStatus={injectionStatus}
            payload={currentPayload}
            error={injectionError}
            result={injectionResult}
            onInject={handlePerformInjection}
            onClearJson={handleClearJson}
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
    </div>
  )
}
