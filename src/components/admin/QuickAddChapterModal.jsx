/**
 * QuickAddChapterModal.jsx
 * Pro EdTech AI-Powered Quick Chapter Generator & Bulk Database Inserter.
 * 
 * Workflow:
 * 1. Configure: Select Subject, set target chapter count, starting index & code prefix.
 * 2. Prompt: Copy tailored, high-precision prompt to ChatGPT / Claude / Gemini.
 * 3. Paste & Preview: Paste AI JSON with smart auto-parsing, validation & inline editing.
 * 4. 1-Click Save: Commit all chapters to Supabase DB and local store with real-time sync.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import {
  buildQuickChapterPrompt,
  parseQuickChaptersJson,
  deriveSubjectCodePrefix,
} from '../../utils/chapterPromptStudio'
import { chapterService } from '../../services/chapterService'
import { showToast } from '../../data/feedbackStore'
import { formatPriority, BPSC_PRIORITY_MAP } from '../../data/bpscPrelimsChapters'

const CHAPTER_COUNT_PRESETS = [4, 6, 8, 10, 12, 15, 20]
const EXAM_PRESETS = [
  'BPSC (Bihar Public Service Commission)',
  'UPSC / State PCS',
  'SSC CGL / CHSL',
  'CBSE Class 11 & 12',
  'GATE / Computer Science Engineering',
  'General Competitive Examination',
]

const SAMPLE_JSON_DEMO = `[
  {
    "number": 1,
    "code": "SCI-01",
    "name": "Physical Quantities, Measurements & Kinematics",
    "description": "Fundamental SI units, dimensional analysis, scalar and vector quantities, Newton's laws of motion, momentum, friction, and projectile trajectories with real-world applications.",
    "priority": "VH"
  },
  {
    "number": 2,
    "code": "SCI-02",
    "name": "Work, Energy, Power & Gravitation",
    "description": "Work-energy theorem, conservation laws, gravitational potential, orbital velocity, Kepler's laws, fluid dynamics, Pascal's principle, and Archimedes buoyancy.",
    "priority": "H"
  },
  {
    "number": 3,
    "code": "SCI-03",
    "name": "Thermodynamics, Waves & Sound",
    "description": "Laws of thermodynamics, heat engines, specific heat capacity, wave propagation, Doppler effect, acoustic resonance, and transverse versus longitudinal vibrations.",
    "priority": "M"
  }
]`

export default function QuickAddChapterModal({
  isOpen,
  onClose,
  activeCourseId,
  courseName = 'Course Workspace',
  subjects = [],
  chapters = [],
  preselectedSubjectId = '',
  onChaptersAdded,
  onNavigate,
}) {
  // ── Step State ──────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState(1) // 1: Config & Prompt, 2: Paste & Preview
  const [selectedSubjectId, setSelectedSubjectId] = useState(preselectedSubjectId || subjects[0]?.id || '')

  // Keep selected subject in sync when modal opens or preselectedSubjectId changes
  useEffect(() => {
    if (preselectedSubjectId && subjects.some((s) => s.id === preselectedSubjectId)) {
      setSelectedSubjectId(preselectedSubjectId)
    } else if (subjects.length > 0 && !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0]?.id || '')
    }
  }, [preselectedSubjectId, subjects, isOpen])

  const selectedSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null
  }, [subjects, selectedSubjectId])

  // Subject's existing chapters
  const existingSubjectChapters = useMemo(() => {
    if (!selectedSubject) return []
    return chapters.filter(
      (c) =>
        (c.subjectId && c.subjectId === selectedSubject.id) ||
        (c.subject_id && c.subject_id === selectedSubject.id) ||
        (c.subject && String(c.subject).trim().toLowerCase() === String(selectedSubject.name).trim().toLowerCase())
    )
  }, [chapters, selectedSubject])

  // Auto next chapter number
  const nextAvailableChapterNumber = useMemo(() => {
    if (!existingSubjectChapters || existingSubjectChapters.length === 0) return 1
    const maxNum = Math.max(...existingSubjectChapters.map((c) => Number(c.number) || 0), 0)
    return maxNum + 1
  }, [existingSubjectChapters])

  // ── Form Configuration States ───────────────────────────────────
  const [numChapters, setNumChapters] = useState(8)
  const [startingNumber, setStartingNumber] = useState(nextAvailableChapterNumber)
  const [codePrefix, setCodePrefix] = useState('')
  const [examTarget, setExamTarget] = useState('BPSC (Bihar Public Service Commission)')
  const [syllabusScope, setSyllabusScope] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')

  // When subject changes, auto-update starting number and recommended prefix
  useEffect(() => {
    if (selectedSubject) {
      const derived = deriveSubjectCodePrefix(selectedSubject.name)
      setCodePrefix(derived)
      setStartingNumber(nextAvailableChapterNumber)
      if (selectedSubject.desc && !syllabusScope) {
        setSyllabusScope(selectedSubject.desc)
      }
    }
  }, [selectedSubject, nextAvailableChapterNumber])

  // ── Prompt & AI Response State ─────────────────────────────────
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [rawJsonText, setRawJsonText] = useState('')
  const [parsedChapters, setParsedChapters] = useState([])
  const [parseError, setParseError] = useState('')
  const [isParsing, setIsParsing] = useState(false)

  // ── Insertion State ─────────────────────────────────────────────
  const [isInserting, setIsInserting] = useState(false)
  const [insertProgress, setInsertProgress] = useState({ current: 0, total: 0, chapterName: '' })
  const [insertionSummary, setInsertionSummary] = useState(null)

  // Generated Prompt (Derived dynamically)
  const generatedPrompt = useMemo(() => {
    if (!selectedSubject) return ''
    return buildQuickChapterPrompt({
      courseName,
      subjectName: selectedSubject.name,
      subjectDesc: selectedSubject.desc || '',
      numChapters: Number(numChapters) || 8,
      startingNumber: Number(startingNumber) || 1,
      codePrefix: codePrefix.trim().toUpperCase(),
      examTarget,
      syllabusScope,
      customInstructions,
    })
  }, [
    courseName,
    selectedSubject,
    numChapters,
    startingNumber,
    codePrefix,
    examTarget,
    syllabusScope,
    customInstructions,
  ])

  // Handle Copy Prompt
  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPrompt)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = generatedPrompt
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedPrompt(true)
      showToast({
        type: 'success',
        title: 'Prompt Copied!',
        message: 'Paste it directly into ChatGPT, Claude, or Gemini to generate structured chapters.',
      })
      setTimeout(() => setCopiedPrompt(false), 3000)
    } catch (err) {
      showToast({ type: 'error', title: 'Copy Failed', message: 'Please select and copy the prompt text manually.' })
    }
  }

  // Handle Parse JSON
  const handleParseJson = (textToParse = rawJsonText) => {
    setIsParsing(true)
    setParseError('')

    const res = parseQuickChaptersJson(
      textToParse,
      Number(startingNumber) || 1,
      codePrefix || deriveSubjectCodePrefix(selectedSubject?.name)
    )

    setIsParsing(false)

    if (!res.valid) {
      setParseError(res.error || 'Failed to parse JSON. Please check formatting.')
      setParsedChapters([])
      return false
    }

    setParsedChapters(res.chapters)
    setParseError('')
    showToast({
      type: 'success',
      title: 'Valid Chapters Parsed!',
      message: `Successfully parsed ${res.chapters.length} chapters. Review and click Add to Database.`,
    })
    return true
  }

  // Auto-parse on paste in the textarea
  const handleTextareaChange = (e) => {
    const val = e.target.value
    setRawJsonText(val)
    if (val.trim().length > 20 && (val.includes('[') || val.includes('{'))) {
      const res = parseQuickChaptersJson(
        val,
        Number(startingNumber) || 1,
        codePrefix || deriveSubjectCodePrefix(selectedSubject?.name)
      )
      if (res.valid) {
        setParsedChapters(res.chapters)
        setParseError('')
      } else {
        setParseError(res.error || '')
      }
    } else {
      setParsedChapters([])
      setParseError('')
    }
  }

  // Paste Demo Sample
  const handleLoadSample = () => {
    setRawJsonText(SAMPLE_JSON_DEMO)
    handleParseJson(SAMPLE_JSON_DEMO)
  }

  // Editable preview field handlers
  const handleUpdateChapterField = (index, field, value) => {
    setParsedChapters((prev) => {
      const copy = [...prev]
      const target = { ...copy[index], [field]: value }
      if (field === 'priority') {
        const meta = formatPriority(value)
        target.priorityLabel = meta.label || value
      }
      copy[index] = target
      return copy
    })
  }

  const handleDeletePreviewRow = (index) => {
    setParsedChapters((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddCustomRow = () => {
    const nextNum = parsedChapters.length > 0
      ? Math.max(...parsedChapters.map((c) => Number(c.number) || 0)) + 1
      : Number(startingNumber) || 1

    const prefix = codePrefix || deriveSubjectCodePrefix(selectedSubject?.name)
    const newChapter = {
      tempId: `custom-ch-${Date.now()}`,
      number: nextNum,
      code: `${prefix}-${String(nextNum).padStart(2, '0')}`,
      name: '',
      description: '',
      desc: '',
      priority: 'M',
      priorityLabel: 'Medium',
      status: 'active',
    }
    setParsedChapters((prev) => [...prev, newChapter])
  }

  // Commit / Add Chapters to Database
  const handleCommitToDatabase = async () => {
    if (!activeCourseId) {
      showToast({ type: 'error', title: 'Course Missing', message: 'Please select an active course workspace.' })
      return
    }
    if (!selectedSubject?.id) {
      showToast({ type: 'error', title: 'Subject Missing', message: 'Please select a valid subject.' })
      return
    }
    if (parsedChapters.length === 0) {
      showToast({ type: 'error', title: 'No Chapters', message: 'No valid chapters to add.' })
      return
    }

    // Validate that all chapters have titles
    const emptyTitleIndex = parsedChapters.findIndex((c) => !c.name || !c.name.trim())
    if (emptyTitleIndex !== -1) {
      showToast({
        type: 'error',
        title: 'Missing Chapter Title',
        message: `Chapter #${parsedChapters[emptyTitleIndex].number || emptyTitleIndex + 1} has no title. Please enter a title or remove the row.`,
      })
      return
    }

    setIsInserting(true)
    setInsertProgress({ current: 0, total: parsedChapters.length, chapterName: 'Starting database upload...' })

    const payloadList = parsedChapters.map((ch, idx) => ({
      name: ch.name.trim(),
      title: ch.name.trim(),
      number: Number(ch.number) || idx + 1,
      code: (ch.code || '').trim().toUpperCase(),
      priority: ch.priority || 'M',
      desc: ch.description || ch.desc || '',
      description: ch.description || ch.desc || '',
      status: ch.status || 'active',
      locked: false,
      subjectName: selectedSubject.name,
      subjectId: selectedSubject.id,
      courseId: activeCourseId,
    }))

    try {
      const res = await chapterService.createChaptersBulk(
        activeCourseId,
        selectedSubject.id,
        payloadList,
        (progress) => {
          setInsertProgress(progress)
        }
      )

      setIsInserting(false)

      if (res.success) {
        setInsertionSummary({
          success: true,
          addedCount: res.addedCount,
          total: res.totalRequested,
          cloudCount: res.cloudCount,
          subjectName: selectedSubject.name,
        })

        showToast({
          type: 'success',
          title: 'Chapters Added Successfully!',
          message: `${res.addedCount} chapters created and synced with database for "${selectedSubject.name}".`,
        })

        onChaptersAdded?.(res.data)
      } else {
        showToast({
          type: 'error',
          title: 'Database Insertion Error',
          message: res.error || 'Unable to save chapters to database.',
        })
      }
    } catch (err) {
      setIsInserting(false)
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'An unexpected error occurred during database upload.',
      })
    }
  }

  // Reset modal when closing or resetting
  const handleResetModal = () => {
    setActiveStep(1)
    setRawJsonText('')
    setParsedChapters([])
    setParseError('')
    setInsertionSummary(null)
    setIsInserting(false)
  }

  if (!isOpen) return null

  return (
    <div className="quick-chap-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isInserting) onClose() }}>
      <div className="quick-chap-modal-card">
        {/* ── Modal Header ── */}
        <div className="quick-chap-header">
          <div className="quick-chap-header-left">
            <div className="quick-chap-badge-pill">
              <AppIcon name="rocket" size={13} />
              <span>AI CURRICULUM DECOMPOSER</span>
            </div>
            <h3 className="quick-chap-title">
              ⚡ Quick Add Chapters with AI
            </h3>
            <p className="quick-chap-subtitle">
              Decompose whole subject syllabi into structured chapters with codes, descriptions, and exam priorities in 1 click.
            </p>
          </div>
          <button
            type="button"
            className="quick-chap-close-btn"
            onClick={onClose}
            disabled={isInserting}
            title="Close modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* ── Step Progress Indicator ── */}
        <div className="quick-chap-step-indicator">
          <button
            type="button"
            className={`quick-step-item${activeStep === 1 ? ' active' : ''}${parsedChapters.length > 0 ? ' completed' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            <span className="step-num">1</span>
            <span className="step-label">Configure & Copy Prompt</span>
          </button>
          <div className="step-divider" />
          <button
            type="button"
            className={`quick-step-item${activeStep === 2 ? ' active' : ''}`}
            onClick={() => setActiveStep(2)}
          >
            <span className="step-num">2</span>
            <span className="step-label">Paste JSON & Preview ({parsedChapters.length})</span>
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="quick-chap-body">
          {/* ════ SUCCESS SUMMARY VIEW ════ */}
          {insertionSummary ? (
            <div className="quick-chap-success-view">
              <div className="quick-success-icon-wrap">
                <AppIcon name="check" size={32} />
              </div>
              <h4 className="quick-success-title">
                {insertionSummary.addedCount} Chapters Added to Database!
              </h4>
              <p className="quick-success-desc">
                Successfully broken down and generated curriculum for{' '}
                <strong>{insertionSummary.subjectName}</strong> in <strong>{courseName}</strong>.
                {insertionSummary.cloudCount > 0 && ` (${insertionSummary.cloudCount} synced to Supabase Cloud)`}
              </p>

              <div className="quick-success-actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    handleResetModal()
                    setActiveStep(1)
                  }}
                >
                  <AppIcon name="add" size={14} /> Add Chapters for Another Subject
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onClose()
                    onNavigate?.('mcq-injection')
                  }}
                >
                  <AppIcon name="help" size={14} /> Inject MCQs to Chapters
                </Button>
                <Button
                  variant="primary"
                  onClick={onClose}
                >
                  <AppIcon name="check" size={14} /> View in Subject Workspace
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ════ STEP 1: CONFIGURE & PROMPT ════ */}
              {activeStep === 1 && (
                <div className="quick-chap-step-pane">
                  <div className="quick-chap-grid-2col">
                    {/* Left Col: Subject & Chapter Specs */}
                    <div className="quick-chap-form-box">
                      <div className="quick-box-title">
                        <AppIcon name="settings" size={14} />
                        <span>Syllabus Breakdown Configuration</span>
                      </div>

                      {/* 1. Target Subject Dropdown */}
                      <div className="quick-field">
                        <label className="quick-label">
                          <span>Target Subject *</span>
                          <span className="quick-label-hint">
                            {existingSubjectChapters.length} existing chapters
                          </span>
                        </label>
                        <select
                          className="quick-select"
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} ({chapters.filter((c) => c.subjectId === sub.id || c.subject === sub.name).length} chaps)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Number of Chapters with Quick Presets */}
                      <div className="quick-field">
                        <div className="quick-label-row">
                          <label className="quick-label">Divide Syllabus Into Chapters *</label>
                          <span className="quick-label-val">{numChapters} Chapters</span>
                        </div>
                        <div className="quick-presets-row">
                          {CHAPTER_COUNT_PRESETS.map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              className={`quick-cnt-pill${numChapters === cnt ? ' active' : ''}`}
                              onClick={() => setNumChapters(cnt)}
                            >
                              {cnt} Ch
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          className="quick-range-slider"
                          min="3"
                          max="30"
                          value={numChapters}
                          onChange={(e) => setNumChapters(Number(e.target.value))}
                        />
                      </div>

                      {/* 3. Starting Number & Code Prefix */}
                      <div className="quick-form-row-2">
                        <div className="quick-field">
                          <label className="quick-label">
                            <span>Starting Chapter #</span>
                            <span className="quick-tag-sub">Auto</span>
                          </label>
                          <input
                            type="number"
                            className="quick-input"
                            min="1"
                            value={startingNumber}
                            onChange={(e) => setStartingNumber(e.target.value)}
                          />
                        </div>

                        <div className="quick-field">
                          <label className="quick-label">Chapter Code Prefix</label>
                          <input
                            type="text"
                            className="quick-input"
                            placeholder="e.g. HIST, SCI, CN"
                            value={codePrefix}
                            onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                            style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      {/* 4. Target Exam / Standard */}
                      <div className="quick-field">
                        <label className="quick-label">Exam Standard / Course Level</label>
                        <select
                          className="quick-select"
                          value={examTarget}
                          onChange={(e) => setExamTarget(e.target.value)}
                        >
                          {EXAM_PRESETS.map((ex) => (
                            <option key={ex} value={ex}>{ex}</option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Custom Syllabus Scope / High-Yield Notes */}
                      <div className="quick-field">
                        <label className="quick-label">
                          <span>Syllabus Scope & Focus Notes (Optional)</span>
                        </label>
                        <textarea
                          className="quick-textarea"
                          rows={2}
                          placeholder="e.g. Include Ancient, Medieval, Modern & Bihar History; Focus on high-yield prelims topics..."
                          value={syllabusScope}
                          onChange={(e) => setSyllabusScope(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Right Col: Live Generated AI Prompt */}
                    <div className="quick-chap-prompt-box">
                      <div className="quick-prompt-head">
                        <div className="quick-prompt-title">
                          <AppIcon name="aiCoach" size={15} />
                          <span>Generated AI Prompt</span>
                        </div>
                        <div className="quick-prompt-actions">
                          <button
                            type="button"
                            className={`quick-copy-prompt-btn${copiedPrompt ? ' copied' : ''}`}
                            onClick={handleCopyPrompt}
                          >
                            <AppIcon name={copiedPrompt ? 'check' : 'copy'} size={14} />
                            <span>{copiedPrompt ? 'Copied to Clipboard!' : 'Copy AI Prompt'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="quick-prompt-code-wrap">
                        <pre className="quick-prompt-code">{generatedPrompt}</pre>
                      </div>

                      {/* External AI Launchers */}
                      <div className="quick-external-ai-dock">
                        <span className="quick-ai-dock-label">Open AI Studio:</span>
                        <div className="quick-ai-links">
                          <a
                            href="https://chatgpt.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quick-ai-link-chip chatgpt"
                            onClick={() => handleCopyPrompt()}
                          >
                            <span>ChatGPT ↗</span>
                          </a>
                          <a
                            href="https://claude.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quick-ai-link-chip claude"
                            onClick={() => handleCopyPrompt()}
                          >
                            <span>Claude ↗</span>
                          </a>
                          <a
                            href="https://gemini.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="quick-ai-link-chip gemini"
                            onClick={() => handleCopyPrompt()}
                          >
                            <span>Gemini ↗</span>
                          </a>
                        </div>
                      </div>

                      <div className="quick-next-step-bar">
                        <p className="quick-step-hint">
                          <strong>Step 1:</strong> Click "Copy AI Prompt", paste it into any AI, then click Next Step to paste the JSON output.
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => {
                            handleCopyPrompt()
                            setActiveStep(2)
                          }}
                        >
                          <span>Proceed to Paste JSON →</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════ STEP 2: PASTE & PREVIEW ════ */}
              {activeStep === 2 && (
                <div className="quick-chap-step-pane">
                  {/* JSON Paste Input Card */}
                  <div className="quick-paste-card">
                    <div className="quick-paste-head">
                      <div className="quick-paste-title">
                        <AppIcon name="document" size={15} />
                        <span>Paste AI Generated JSON Output</span>
                      </div>
                      <div className="quick-paste-tools">
                        <button
                          type="button"
                          className="quick-link-btn"
                          onClick={handleLoadSample}
                        >
                          <span>Load Sample Demo JSON</span>
                        </button>
                        <button
                          type="button"
                          className="quick-link-btn"
                          onClick={async () => {
                            try {
                              if (navigator?.clipboard?.readText) {
                                const text = await navigator.clipboard.readText()
                                setRawJsonText(text)
                                handleParseJson(text)
                              }
                            } catch {
                              showToast({ type: 'info', title: 'Clipboard', message: 'Press Ctrl+V to paste.' })
                            }
                          }}
                        >
                          <AppIcon name="copy" size={13} />
                          <span>Paste from Clipboard</span>
                        </button>
                        {rawJsonText && (
                          <button
                            type="button"
                            className="quick-link-btn danger"
                            onClick={() => {
                              setRawJsonText('')
                              setParsedChapters([])
                              setParseError('')
                            }}
                          >
                            <span>Clear</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      className="quick-json-textarea"
                      rows={6}
                      placeholder={`Paste the JSON output from ChatGPT / Claude / Gemini here...\n\nExample:\n[\n  {\n    "number": 1,\n    "code": "${codePrefix || 'SCI'}-01",\n    "name": "Kinematics & Laws of Motion",\n    "description": "Mechanics, force, work, energy and power...",\n    "priority": "VH"\n  }\n]`}
                      value={rawJsonText}
                      onChange={handleTextareaChange}
                    />

                    {/* Parse Error Alert */}
                    {parseError && (
                      <div className="quick-error-banner">
                        <AppIcon name="warning" size={15} />
                        <span>{parseError}</span>
                      </div>
                    )}

                    {/* Valid Parsing Success Banner */}
                    {parsedChapters.length > 0 && !parseError && (
                      <div className="quick-parsed-badge-banner">
                        <AppIcon name="check" size={15} />
                        <span>
                          <strong>{parsedChapters.length} Chapters parsed successfully</strong> for subject "{selectedSubject?.name}". Review and edit details below before uploading to database.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Interactive Editable Preview Table ── */}
                  {parsedChapters.length > 0 && (
                    <div className="quick-preview-section">
                      <div className="quick-preview-head">
                        <div className="quick-preview-title">
                          <AppIcon name="chapters" size={15} />
                          <span>Chapters Preview & Review ({parsedChapters.length} Total)</span>
                        </div>
                        <div className="quick-preview-tools">
                          <button
                            type="button"
                            className="quick-add-row-btn"
                            onClick={handleAddCustomRow}
                          >
                            <AppIcon name="add" size={13} />
                            <span>Add Chapter Row</span>
                          </button>
                        </div>
                      </div>

                      <div className="quick-preview-table-container">
                        <table className="quick-preview-table">
                          <thead>
                            <tr>
                              <th style={{ width: '60px' }}>#</th>
                              <th style={{ width: '100px' }}>Code</th>
                              <th style={{ width: '280px' }}>Chapter Title *</th>
                              <th style={{ width: '120px' }}>Priority</th>
                              <th>Syllabus Topics & Description</th>
                              <th style={{ width: '50px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedChapters.map((ch, idx) => {
                              const prioMeta = formatPriority(ch.priority)
                              return (
                                <tr key={ch.tempId || idx}>
                                  {/* 1. Order Number */}
                                  <td>
                                    <input
                                      type="number"
                                      className="quick-cell-input-num"
                                      min="1"
                                      value={ch.number || idx + 1}
                                      onChange={(e) => handleUpdateChapterField(idx, 'number', Number(e.target.value))}
                                    />
                                  </td>

                                  {/* 2. Code */}
                                  <td>
                                    <input
                                      type="text"
                                      className="quick-cell-input-code"
                                      value={ch.code || ''}
                                      onChange={(e) => handleUpdateChapterField(idx, 'code', e.target.value.toUpperCase())}
                                      placeholder="CODE"
                                    />
                                  </td>

                                  {/* 3. Name */}
                                  <td>
                                    <input
                                      type="text"
                                      className="quick-cell-input-title"
                                      value={ch.name || ''}
                                      onChange={(e) => handleUpdateChapterField(idx, 'name', e.target.value)}
                                      placeholder="Chapter title..."
                                      required
                                    />
                                  </td>

                                  {/* 4. Priority Dropdown */}
                                  <td>
                                    <select
                                      className={`quick-cell-select-prio prio-${(ch.priority || 'M').toLowerCase()}`}
                                      value={ch.priority || 'M'}
                                      onChange={(e) => handleUpdateChapterField(idx, 'priority', e.target.value)}
                                    >
                                      <option value="VH">VH (Very High)</option>
                                      <option value="H">H (High)</option>
                                      <option value="M">M (Medium)</option>
                                      <option value="L">L (Low)</option>
                                    </select>
                                  </td>

                                  {/* 5. Description */}
                                  <td>
                                    <textarea
                                      className="quick-cell-textarea-desc"
                                      rows={2}
                                      value={ch.description || ch.desc || ''}
                                      onChange={(e) => {
                                        handleUpdateChapterField(idx, 'description', e.target.value)
                                        handleUpdateChapterField(idx, 'desc', e.target.value)
                                      }}
                                      placeholder="Key topics and concepts covered in this chapter..."
                                    />
                                  </td>

                                  {/* 6. Delete Row */}
                                  <td>
                                    <button
                                      type="button"
                                      className="quick-cell-del-btn"
                                      onClick={() => handleDeletePreviewRow(idx)}
                                      title="Delete this chapter row"
                                    >
                                      <AppIcon name="delete" size={13} />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        {!insertionSummary && (
          <div className="quick-chap-footer">
            <div className="quick-footer-left">
              {activeStep === 2 && (
                <Button
                  variant="secondary"
                  onClick={() => setActiveStep(1)}
                  disabled={isInserting}
                >
                  <AppIcon name="back" size={14} /> Back to Configure
                </Button>
              )}
            </div>

            <div className="quick-footer-right">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isInserting}
              >
                Cancel
              </Button>

              {activeStep === 1 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleCopyPrompt()
                    setActiveStep(2)
                  }}
                >
                  <span>Next: Paste JSON →</span>
                </Button>
              )}

              {activeStep === 2 && (
                <Button
                  variant="primary"
                  onClick={handleCommitToDatabase}
                  disabled={isInserting || parsedChapters.length === 0}
                >
                  {isInserting ? (
                    <>
                      <div className="sm-spinner" />
                      <span>
                        Adding ({insertProgress.current}/{insertProgress.total})...
                      </span>
                    </>
                  ) : (
                    <>
                      <AppIcon name="check" size={15} />
                      <span>
                        🚀 Add {parsedChapters.length > 0 ? `${parsedChapters.length} ` : ''}Chapters to Database
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Progress Overlay during batch upload ── */}
        {isInserting && (
          <div className="quick-upload-progress-overlay">
            <div className="quick-progress-card">
              <div className="quick-progress-spinner-wrap">
                <div className="quick-big-spinner" />
              </div>
              <h4>Saving Chapters to Database...</h4>
              <p className="quick-progress-item-name">
                {insertProgress.chapterName || 'Inserting records...'}
              </p>
              <div className="quick-progress-track">
                <div
                  className="quick-progress-bar"
                  style={{
                    width: `${insertProgress.total > 0 ? (insertProgress.current / insertProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="quick-progress-counter">
                {insertProgress.current} of {insertProgress.total} completed
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
