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
import { getExamProfile, getActiveExamKey, setActiveExam, resolveExamProfile } from '../../data/examProfiles'
import { getRelevantPYQs, analyzePYQs } from '../../data/pyqRepository'
import { getCourseConfig } from '../../data/courseConfigs'
import { generateExamPrompt, buildMCQPrompt, validateBPSCBatch, buildTargetedRegenerationPrompt, autoFixBPSCItems } from '../../utils/aiContentStudio'

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

  const [selectedSubjectId, setSelectedSubjectId] = useState(() => {
    return currentCourseSubjects[0]?.id || ''
  })

  // Ensure selectedSubjectId is valid for current course
  useEffect(() => {
    if (currentCourseSubjects.length > 0) {
      if (!selectedSubjectId || !currentCourseSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(currentCourseSubjects[0].id)
      }
    } else {
      setSelectedSubjectId('')
    }
  }, [currentCourseSubjects, selectedSubjectId])

  const activeSubject = useMemo(() => {
    return currentCourseSubjects.find((s) => s.id === selectedSubjectId) || currentCourseSubjects[0] || null
  }, [currentCourseSubjects, selectedSubjectId])

  const selectedCourse = useMemo(() => {
    return workspaces.find((w) => w.id === selectedCourseId)
  }, [workspaces, selectedCourseId])

  const currentChapters = useMemo(() => {
    if (!activeSubject) return []
    return adminState.allChapters.filter(
      (c) =>
        (c.subjectId === activeSubject.id || c.subject_id === activeSubject.id || c.subject === activeSubject.name) &&
        (!selectedCourseId || c.courseId === selectedCourseId)
    )
  }, [adminState.allChapters, activeSubject, selectedCourseId])

  const [selectedChapterId, setSelectedChapterId] = useState(() => {
    return currentChapters[0]?.id || ''
  })

  // Ensure selectedChapterId is valid for current subject
  useEffect(() => {
    if (currentChapters.length > 0) {
      if (!selectedChapterId || !currentChapters.some((c) => c.id === selectedChapterId)) {
        setSelectedChapterId(currentChapters[0].id)
      }
    } else {
      setSelectedChapterId('')
    }
  }, [currentChapters, selectedChapterId])

  const activeChapter = useMemo(() => {
    return currentChapters.find((c) => c.id === selectedChapterId) || currentChapters[0] || null
  }, [currentChapters, selectedChapterId])

  // Chapter Description state (loaded automatically when a chapter of any subject is chosen)
  const [chapterDescription, setChapterDescription] = useState('')

  useEffect(() => {
    if (activeChapter) {
      const found = adminState.allChapters.find(
        (c) => c.id === activeChapter.id
      )
      setChapterDescription(found?.desc || found?.description || activeChapter?.desc || activeChapter?.description || '')
    } else {
      setChapterDescription('')
    }
  }, [activeChapter, adminState.allChapters])

  // ── 2. Top Right Statistics Metrics ──────────────────────────────
  const chapterMcqs = useMemo(() => {
    if (!activeSubject || !activeChapter) return []
    return adminState.allMcqs.filter(
      (m) =>
        (m.chapter_id === activeChapter.id || m.chapterId === activeChapter.id) &&
        (m.subject_id === activeSubject.id || m.subjectId === activeSubject.id)
    )
  }, [adminState.allMcqs, activeSubject, activeChapter])

  const chapterFlashcards = useMemo(() => {
    if (!activeSubject || !activeChapter) return []
    return adminState.allFlashcards.filter(
      (f) =>
        (f.chapter_id === activeChapter.id || f.chapterId === activeChapter.id) &&
        (f.subject_id === activeSubject.id || f.subjectId === activeSubject.id)
    )
  }, [adminState.allFlashcards, activeSubject, activeChapter])

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

  // ── 4. Course-aware Exam Profile State ─────────────────────────
  const [activeExamKey, setActiveExamKey] = useState(() => getActiveExamKey())
  const activeExamProfile = useMemo(() => resolveExamProfile(selectedCourse || selectedCourseId), [selectedCourse, selectedCourseId])

  const courseConfig = useMemo(() => getCourseConfig(selectedCourseId), [selectedCourseId])

  const applyCourseConfig = useCallback((courseId) => {
    const profile = resolveExamProfile(courseId)
    const nextExamKey = profile.key || 'GENERIC'
    setActiveExamKey(nextExamKey)
    setActiveExam(nextExamKey)

    if (profile && profile.defaultDifficulty) {
      setMcqDifficulty(profile.defaultDifficulty)
      setFlashDifficulty(profile.defaultDifficulty)
    }
    if (profile && profile.defaultQuestionType) {
      setQuestionType(profile.defaultQuestionType)
    }
  }, [setActiveExam])

  const handleCourseChange = useCallback((newCourseId) => {
    setSelectedCourseId(newCourseId)
    setActiveWorkspace(newCourseId)
    applyCourseConfig(newCourseId)

    const subs = adminState.allSubjects.filter((s) => s.courseId === newCourseId)
    const firstSubId = subs[0]?.id || ''
    setSelectedSubjectId(firstSubId)
    const chs = adminState.allChapters.filter(
      (c) => (c.subjectId === firstSubId || c.subject_id === firstSubId) && c.courseId === newCourseId
    )
    setSelectedChapterId(chs[0]?.id || '')
  }, [adminState.allSubjects, adminState.allChapters, setActiveWorkspace, applyCourseConfig])

  // ── 5. Generator Parameters ─────────────────────────────────────
  const [mcqCount, setMcqCount] = useState(20)
  const [flashCount, setFlashCount] = useState(15)
  const [mcqDifficulty, setMcqDifficulty] = useState('Medium')
  const [flashDifficulty, setFlashDifficulty] = useState('Medium')
  const [mcqLanguage, setMcqLanguage] = useState('English')
  const [flashLanguage, setFlashLanguage] = useState('English')
  const [targetExam, setTargetExam] = useState('')
  const [flashDeckName, setFlashDeckName] = useState('')
  const [conceptFocus, setConceptFocus] = useState('')

  const [showDescDetails, setShowDescDetails] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPromptPreview, setShowPromptPreview] = useState(false)

  const [questionType, setQuestionType] = useState('Mixed')
  const [cognitiveLevel, setCognitiveLevel] = useState('Mixed')
  const [topicFocus, setTopicFocus] = useState('')
  const [examPattern, setExamPattern] = useState('')
  const [explanationRequired, setExplanationRequired] = useState('Yes')
  const [negativeMarking, setNegativeMarking] = useState('')
  const [languageStyle, setLanguageStyle] = useState('Academic')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const [factualDepth, setFactualDepth] = useState('')
  const [cognitiveStyle, setCognitiveStyle] = useState('')
  const [biharIntegration, setBiharIntegration] = useState('')
  const [pyqInfluence, setPyqInfluence] = useState('')
  const [pyqInclusion, setPyqInclusion] = useState('')

  // Sync exam-specific defaults when profile changes
  useEffect(() => {
    if (activeExamProfile && activeExamProfile.key !== 'GENERIC') {
      setFactualDepth(activeExamProfile.defaultFactualDepth || '')
      setCognitiveStyle(activeExamProfile.defaultCognitiveStyle || '')
      setBiharIntegration(activeExamProfile.defaultBiharIntegration || '')
      setPyqInfluence(activeExamProfile.defaultPyqInfluence || '')
      setPyqInclusion(activeExamProfile.defaultPyqInclusion || '')
      if (activeExamProfile.defaultDifficulty) {
        setMcqDifficulty(activeExamProfile.defaultDifficulty)
        setFlashDifficulty(activeExamProfile.defaultDifficulty)
      }
      if (activeExamProfile.defaultQuestionType) {
        setQuestionType(activeExamProfile.defaultQuestionType)
      }
    }
  }, [activeExamProfile])

  const finalQuantity = useMemo(() => {
    return contentMode === 'mcqs' ? mcqCount : flashCount
  }, [contentMode, mcqCount, flashCount])

  const courseTitle = selectedCourse?.name || 'Selected Course'
  const subjectTitle = activeSubject?.name || 'Selected Subject'
  const chapterTitle = activeChapter?.name || 'Selected Chapter'

  const matchedPYQs = useMemo(() => {
    if (contentMode !== 'mcqs' || !activeExamProfile || !activeSubject || !activeChapter) return []
    return getRelevantPYQs({
      courseId: selectedCourseId,
      exam: activeExamProfile.key,
      subject: activeSubject.name,
      chapter: activeChapter.name,
      topic: topicFocus,
    })
  }, [contentMode, activeExamProfile, activeSubject, activeChapter, selectedCourseId, topicFocus])

  const pyqAnalysis = useMemo(() => analyzePYQs(matchedPYQs), [matchedPYQs])

  const generatedPromptText = useMemo(() => {
    try {
      if (contentMode === 'mcqs') {
        return generateExamPrompt('mcqs', {
          courseTitle,
          subjectTitle,
          chapterTitle,
          chapterDescription,
          contentMode,
          finalQuantity,
          mcqDifficulty,
          flashDifficulty,
          mcqLanguage,
          flashLanguage,
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
          activeExamProfileKey: activeExamProfile?.key,
          factualDepth,
          cognitiveStyle,
          biharIntegration,
          pyqInfluence,
          pyqInclusion,
        }, matchedPYQs, pyqAnalysis)
      }

      return generateExamPrompt('flashcards', {
        courseTitle,
        subjectTitle,
        chapterTitle,
        chapterDescription,
        contentMode,
        finalQuantity,
        mcqDifficulty,
        flashDifficulty,
        mcqLanguage,
        flashLanguage,
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
        activeExamProfileKey: activeExamProfile?.key,
        factualDepth,
        cognitiveStyle,
        biharIntegration,
        pyqInfluence,
        pyqInclusion,
      }, [], null)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[ChapterMcqInjection] Prompt generation failed:', err)
      }
      return `Prompt generation failed: ${err?.message || 'Unknown error'}`
    }
  }, [
    contentMode,
    courseTitle,
    subjectTitle,
    chapterTitle,
    chapterDescription,
    finalQuantity,
    mcqDifficulty,
    flashDifficulty,
    mcqLanguage,
    flashLanguage,
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
    activeExamProfile,
    factualDepth,
    cognitiveStyle,
    biharIntegration,
    pyqInfluence,
    pyqInclusion,
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
  }, [selectedCourseId, selectedSubjectId, selectedChapterId, contentMode])

  // ── 6. JSON State & Handlers ─────────────────────────────────
  const [copied, setCopied] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonStatus, setJsonStatus] = useState('empty')
  const [jsonError, setJsonError] = useState(null)
  const [jsonItemCount, setJsonItemCount] = useState(0)
  const [bpscValidationResult, setBpscValidationResult] = useState(null)

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
          if (contentMode === 'mcqs' && activeExamProfile?.key === 'BPSC_PRELIMS') {
            const bpscVal = validateBPSCBatch(activeItems)
            setBpscValidationResult(bpscVal)
            if (bpscVal.invalidCount > 0) {
              setJsonStatus('warning')
              setJsonError(`${bpscVal.validCount} of ${bpscVal.total} passed BPSC 15-check validation (${bpscVal.invalidCount} failed).`)
              setJsonItemCount(bpscVal.validCount)
              setCurrentPayload(bpscVal.passedItems)
              setInjectionStatus(bpscVal.validCount > 0 ? 'ready' : 'idle')
              setInjectionResult(null)
              return true
            } else {
              setJsonStatus('valid')
              setJsonError(null)
              setJsonItemCount(bpscVal.validCount)
              setCurrentPayload(bpscVal.passedItems)
              setInjectionStatus('ready')
              setInjectionResult(null)
              return true
            }
          }

          setBpscValidationResult(null)
          setJsonStatus('valid')
          setJsonError(null)
          setJsonItemCount(activeItems.length)
          setCurrentPayload(activeItems)
          setInjectionStatus('ready')
          setInjectionResult(null)
          return true
        }

        setBpscValidationResult(null)
        setJsonStatus('invalid')
        setJsonError(`JSON does not contain ${contentMode} payload.`)
        setJsonItemCount(0)
        setCurrentPayload(null)
        return false
      } catch (err) {
        setBpscValidationResult(null)
        setJsonStatus('invalid')
        setJsonError(err.message)
        setJsonItemCount(0)
        setCurrentPayload(null)
        return false
      }
    },
    [contentMode, activeExamProfile],
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

    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    if (!isUuid(activeSubject.id) || !isUuid(activeChapter.id)) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Subject or Chapter is missing a valid database UUID.' })
      return
    }

    if (activeSubject.courseId && activeSubject.courseId !== selectedCourseId) {
      showToast({ type: 'error', title: 'Hierarchy Error', message: 'Selected Subject does not belong to the selected Course.' })
      return
    }

    const chapSubId = activeChapter.subject_id || activeChapter.subjectId
    if (chapSubId && String(chapSubId) !== String(activeSubject.id)) {
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
        {
          subjectName: activeSubject.name,
          chapterName: activeChapter.name,
          exam_profile: activeExamProfile?.key || 'GENERIC',
          prompt_version: activeExamProfile?.promptVersion || 'generic-v1',
        }
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
    <div className="chapter-mcq-injection-shell smart-viewport">
      {/* ── TOP UNIFIED CONTEXT & METRICS STRIP ── */}
      <div className="smart-context-strip">
        <div className="context-select-group">
          {/* 1. Course */}
          <div className="smart-select-pill" title="Selected Course">
            <span className="pill-prefix">Course:</span>
            <select
              className="smart-inline-select"
              value={selectedCourseId}
              title={selectedCourse?.name || 'Select Course'}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id} title={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Subject */}
          <div className="smart-select-pill" title="Selected Subject">
            <span className="pill-prefix">Subject:</span>
            <select
              className="smart-inline-select"
              value={selectedSubjectId}
              title={activeSubject?.name || 'Select Subject'}
              onChange={(e) => {
                const newSubId = e.target.value
                setSelectedSubjectId(newSubId)
                const chs = adminState.allChapters.filter(
                  (c) =>
                    (c.subjectId === newSubId || c.subject_id === newSubId || c.subject === activeSubject?.name) &&
                    c.courseId === selectedCourseId
                )
                setSelectedChapterId(chs[0]?.id || '')
              }}
              disabled={currentCourseSubjects.length === 0}
            >
              {currentCourseSubjects.map((s) => (
                <option key={s.id} value={s.id} title={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Chapter */}
          <div className="smart-select-pill chapter-pill" title="Selected Chapter">
            <span className="pill-prefix">Chapter:</span>
            <select
              className="smart-inline-select"
              value={selectedChapterId}
              title={activeChapter ? `Ch ${activeChapter.number}: ${activeChapter.name}` : 'Select Chapter'}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              disabled={currentChapters.length === 0}
            >
              {currentChapters.map((c) => (
                <option key={c.id} value={c.id} title={`Ch ${c.number}: ${c.name}`}>
                  Ch {c.number}: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Profile Badge */}
          {activeExamProfile && activeExamProfile.key === 'BPSC_PRELIMS' && (
            <span className="bpsc-mode-badge-pill" title="Post-68th BPSC Prelims rules active">
              ⭐ BPSC PRELIMS
            </span>
          )}
        </div>

        {/* Live Metrics Quick Badges */}
        <div className="metrics-strip-pills">
          <div className="metric-pill" title="MCQs in this chapter">
            <AppIcon name="mcqs" size={13} style={{ color: '#2E5CE6' }} />
            <span className="metric-val">{chapterMcqs.length}</span>
            <span className="metric-tag">MCQs</span>
          </div>
          <div className="metric-pill" title="Flashcards in this chapter">
            <AppIcon name="flashcardsTab" size={13} style={{ color: '#7C3AED' }} />
            <span className="metric-val">{chapterFlashcards.length}</span>
            <span className="metric-tag">Cards</span>
          </div>
          <div className="metric-pill" title="Notes in this chapter">
            <AppIcon name="document" size={13} style={{ color: '#F1621B' }} />
            <span className="metric-val">{chapterNotesCount}</span>
            <span className="metric-tag">Notes</span>
          </div>
          <div className="metric-pill readiness-pill" title="Chapter Readiness score">
            <AppIcon name="target" size={13} style={{ color: '#12B76A' }} />
            <span className="metric-val">{chapterHealthScore}%</span>
            <span className="metric-tag">Ready</span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE (2-COLUMN DIV SPLIT) ── */}
      <div className="main-workspace-grid compact-grid">
        {/* ── LEFT DIV: CONTENT GENERATOR PANEL ── */}
        <div className="prompt-builder-left-div smart-card">
          <div className="studio-card-header">
            <div className="studio-title-group">
              <AppIcon name="edit" size={16} className="studio-icon" />
              <span className="studio-title">AI Prompt Studio</span>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="segmented-switcher-sm">
              <button
                type="button"
                className={`seg-btn ${contentMode === 'mcqs' ? 'active' : ''}`}
                onClick={() => setContentMode('mcqs')}
              >
                <AppIcon name="mcqs" size={13} /> MCQs
              </button>
              <button
                type="button"
                className={`seg-btn ${contentMode === 'flashcards' ? 'active' : ''}`}
                onClick={() => setContentMode('flashcards')}
              >
                <AppIcon name="flashcardsTab" size={13} /> Cards
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyPrompt}
              className="copy-prompt-btn-sm"
              title="Copy prompt for external generation"
            >
              <AppIcon name={copied ? "check" : "copy"} size={14} />
              {copied ? 'Copied!' : 'Copy Prompt'}
            </Button>
          </div>

          {/* Form Scroll Area */}
          <div className="studio-form-scrollable">
            {/* Primary Parameters Row */}
            <div className="compact-params-grid">
              <div className="compact-field">
                <label className="compact-lbl">Quantity</label>
                <select
                  className="smart-form-select"
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

              <div className="compact-field">
                <label className="compact-lbl">Difficulty</label>
                <select
                  className="smart-form-select"
                  value={contentMode === 'mcqs' ? mcqDifficulty : flashDifficulty}
                  onChange={(e) => {
                    if (contentMode === 'mcqs') setMcqDifficulty(e.target.value)
                    else setFlashDifficulty(e.target.value)
                  }}
                >
                  {(activeExamProfile && activeExamProfile.difficulties && activeExamProfile.difficulties.length
                    ? activeExamProfile.difficulties
                    : ['Easy', 'Medium', 'Hard', 'Mixed']
                  ).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="compact-field">
                <label className="compact-lbl">Language</label>
                <select
                  className="smart-form-select"
                  value={contentMode === 'mcqs' ? mcqLanguage : flashLanguage}
                  onChange={(e) => {
                    if (contentMode === 'mcqs') setMcqLanguage(e.target.value)
                    else setFlashLanguage(e.target.value)
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="compact-field">
                <label className="compact-lbl">{contentMode === 'mcqs' ? 'Exam Focus' : 'Deck'}</label>
                <input
                  type="text"
                  className="smart-form-input"
                  placeholder={contentMode === 'mcqs' ? 'e.g. BPSC / GATE' : 'e.g. Core'}
                  value={contentMode === 'mcqs' ? targetExam : flashDeckName}
                  onChange={(e) => {
                    if (contentMode === 'mcqs') setTargetExam(e.target.value)
                    else setFlashDeckName(e.target.value)
                  }}
                />
              </div>
            </div>

            {/* Focus / Instructions Input */}
            <div className="compact-field full-width" style={{ marginTop: '8px' }}>
              <label className="compact-lbl">Special Instructions / Topic Focus</label>
              <input
                type="text"
                className="smart-form-input"
                placeholder="e.g. Focus on key personalities, movements, dates..."
                value={conceptFocus}
                onChange={(e) => setConceptFocus(e.target.value)}
              />
            </div>

            {/* Expandable Chapter Description Section */}
            <div className="accordion-card">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setShowDescDetails((prev) => !prev)}
              >
                <div className="acc-title-wrap">
                  <AppIcon name="document" size={13} />
                  <span>Chapter Description & Context</span>
                  {chapterDescription && <span className="auto-tag">✓ Loaded</span>}
                </div>
                <AppIcon name={showDescDetails ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} />
              </button>

              {showDescDetails && (
                <div className="accordion-content">
                  <textarea
                    className="compact-textarea"
                    rows="2"
                    placeholder="Chapter context and topics description..."
                    value={chapterDescription}
                    onChange={(e) => setChapterDescription(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Expandable Advanced Tuning Section */}
            <div className="accordion-card">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                <div className="acc-title-wrap">
                  <AppIcon name="settings" size={13} />
                  <span>Advanced Parameters & Calibration</span>
                </div>
                <AppIcon name={showAdvanced ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} />
              </button>

              {showAdvanced && (
                <div className="accordion-content">
                  <div className="advanced-mini-grid">
                    <div className="compact-field">
                      <label className="compact-lbl">Question Type</label>
                      <select
                        className="smart-form-select"
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                      >
                        {(activeExamProfile?.questionTypes?.length ? activeExamProfile.questionTypes : QUESTION_TYPES).map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>

                    <div className="compact-field">
                      <label className="compact-lbl">Cognitive Level</label>
                      <select
                        className="smart-form-select"
                        value={cognitiveLevel}
                        onChange={(e) => setCognitiveLevel(e.target.value)}
                      >
                        {COGNITIVE_LEVELS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="compact-field">
                      <label className="compact-lbl">Exam Pattern</label>
                      <select
                        className="smart-form-select"
                        value={examPattern}
                        onChange={(e) => setExamPattern(e.target.value)}
                      >
                        <option value="">Default Standard</option>
                        {EXAM_PATTERNS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="compact-field">
                      <label className="compact-lbl">Explanation</label>
                      <select
                        className="smart-form-select"
                        value={explanationRequired}
                        onChange={(e) => setExplanationRequired(e.target.value)}
                      >
                        <option value="Yes">Yes (Mandatory)</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {activeExamProfile && activeExamProfile.key !== 'GENERIC' && (
                      <>
                        <div className="compact-field">
                          <label className="compact-lbl">Bihar Target</label>
                          <select
                            className="smart-form-select"
                            value={biharIntegration}
                            onChange={(e) => setBiharIntegration(e.target.value)}
                          >
                            {(activeExamProfile.biharIntegrationOptions || ['Standard (22%)', 'High (35%)', 'Low (10%)']).map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        <div className="compact-field">
                          <label className="compact-lbl">PYQ Weight</label>
                          <select
                            className="smart-form-select"
                            value={pyqInfluence}
                            onChange={(e) => setPyqInfluence(e.target.value)}
                          >
                            {(activeExamProfile.pyqInfluenceOptions || ['Medium', 'High', 'Low']).map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Live Prompt Preview */}
            <div className="accordion-card prompt-preview-card">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setShowPromptPreview((prev) => !prev)}
              >
                <div className="acc-title-wrap">
                  <AppIcon name="code" size={13} />
                  <span>Prompt Blueprint Preview</span>
                </div>
                <AppIcon name={showPromptPreview ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} />
              </button>

              {showPromptPreview && (
                <div className="accordion-content">
                  <pre className="prompt-raw-preview">{generatedPromptText}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT DIV: INJECTION STATUS CARD WORKSPACE ── */}
        <div className="content-right-div smart-card">
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
            showPyqSection={contentMode === 'mcqs' && activeExamProfile && activeExamProfile.key !== 'GENERIC'}
            matchedPYQs={matchedPYQs}
            bpscValidationResult={contentMode === 'mcqs' && activeExamProfile?.key === 'BPSC_PRELIMS' ? bpscValidationResult : null}
            onAutoFix={() => {
              if (!currentPayload || !Array.isArray(currentPayload) || currentPayload.length === 0) return
              const fixed = autoFixBPSCItems(currentPayload)
              const formatted = JSON.stringify(fixed, null, 2)
              setJsonText(formatted)
              handleJsonChange(formatted)
              showToast({
                type: 'success',
                title: 'BPSC MCQs Auto-Fixed',
                message: 'Standardized Option E and repaired formatting across all MCQs!',
              })
            }}
            onRegenerateFailed={() => {
              if (!bpscValidationResult || bpscValidationResult.failedItems.length === 0) return
              const targetedPrompt = buildTargetedRegenerationPrompt({
                failedItems: bpscValidationResult.failedItems,
                course: courseTitle,
                subject: subjectTitle,
                chapter: chapterTitle,
                language: mcqLanguage,
              })
              navigator.clipboard.writeText(targetedPrompt)
              showToast({
                type: 'success',
                title: 'Targeted Prompt Copied',
                message: `Prompt to regenerate ${bpscValidationResult.failedItems.length} failed MCQs copied to clipboard!`,
              })
            }}
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
