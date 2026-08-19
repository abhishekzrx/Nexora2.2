/**
 * MCQPracticePage
 * Reusable MCQ practice screen with question grid, timer,
 * options, and submit bar.
 *
 * UX enhancements:
 * - Previous/Next controls moved inside the Question Card
 * - Mobile-only Exam Mode (Buddha icon toggle)
 * - Global Light/Dark theme for the MCQ page
 * - Exam Mode works with both themes
 * - Question state survives mode changes
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/mcqPractice.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import { useContentRegistry } from '../data/contentRegistry'
import AppIcon from '../components/ui/AppIcon'
import { testSession } from '../utils/navigation'
import { showToast } from '../data/feedbackStore'
import { mcqService } from '../services/mcqService'
import { getCurrentUserId, getUserId } from '../services/userService'
import { calculateAccuracy, calculateChapterMetrics } from '../services/mcqAnalyticsService'
import { useWorkspaceStore } from '../data/workspaceStore'
import { updateUserProgressStore } from '../data/progressStore'

function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const questions = [
  {
    id: 1,
    text: 'Which of the following is a connectionless transport layer protocol?',
    options: ['TCP', 'UDP', 'SCTP', 'SSL'],
    correct: 1,
    explanation: 'UDP (User Datagram Protocol) is a connectionless transport layer protocol that does not establish a connection before transmitting data.',
  },
  {
    id: 2,
    text: 'Which layer of the OSI model is responsible for routing?',
    options: ['Data Link Layer', 'Network Layer', 'Transport Layer', 'Session Layer'],
    correct: 1,
    explanation: 'The Network Layer is responsible for routing packets across networks using IP addressing.',
  },
  {
    id: 3,
    text: 'What does TCP stand for?',
    options: ['Transmission Control Protocol', 'Transfer Control Protocol', 'Transport Connection Protocol', 'Terminal Control Protocol'],
    correct: 0,
    explanation: 'TCP stands for Transmission Control Protocol, a connection-oriented transport protocol.',
  },
  {
    id: 4,
    text: 'Which protocol is used to resolve domain names to IP addresses?',
    options: ['HTTP', 'FTP', 'DNS', 'SMTP'],
    correct: 2,
    explanation: 'DNS (Domain Name System) resolves human-readable domain names to IP addresses.',
  },
  {
    id: 5,
    text: 'What is the default port for HTTPS?',
    options: ['80', '443', '8080', '21'],
    correct: 1,
    explanation: 'HTTPS uses port 443 by default, while HTTP uses port 80.',
  },
]

const THEME_KEY = 'mcq-practice-theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore
  }
  return 'dark'
}

function getIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 640
}

/**
 * QuestionPanel
 * Contains question text, options, Mark/Report, and internal navigation.
 * Memoized so it only re-renders when question-specific data changes.
 */
const QuestionPanel = memo(function QuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onSelectOption,
  onToggleMark,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  reviewMode,
  scrollRef,
  _theme,
  examMode,
  isMobile,
  animKey,
  animPhase,
  animDir,
}) {
  return (
    <div className={`question-panel${examMode && isMobile ? ' exam-mode' : ''}`}>
      <div className="qpanel-top">
        <div className="qpanel-title">
          Question {questionNumber} of {totalQuestions}
        </div>
        <div className="qpanel-actions">
          <button type="button" className="action-btn" onClick={onToggleMark} disabled={reviewMode} aria-label="Mark for review">
            <AppIcon name="bookmark" size={13} />
            Mark
          </button>
          <button type="button" className="action-btn report" disabled={reviewMode} aria-label="Report question">
            <AppIcon name="flag" size={13} />
            Report
          </button>
        </div>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="question-scroll" ref={scrollRef}>
        {/* Animated transition layer — keyed so it remounts on each
            question change and replays the enter animation. Only one
            question is ever rendered at a time. */}
        <div
          key={animKey}
          className={`question-anim q-anim-${animPhase} q-dir-${animDir}`}
        >
          <div className="question-text">{question.text}</div>

          <div className="options">
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedOption === optionIndex
              const reviewClass = reviewMode
                ? optionIndex === question.correct
                  ? ' review-correct'
                  : isSelected
                    ? ' review-wrong'
                    : ''
                : ''
              return (
                <button
                  key={option}
                  type="button"
                  className={`option${isSelected ? ' selected' : ''}${reviewClass}`}
                  onClick={() => onSelectOption(optionIndex)}
                  disabled={reviewMode}
                >
                  <div className="radio">
                    {isSelected ? <div className="radio-dot" /> : null}
                  </div>
                  {String.fromCharCode(65 + optionIndex)}. {option}
                </button>
              )
            })}
          </div>

          {reviewMode ? (
            <div className="explanation">
              <div className="explanation-title">
                <AppIcon name="lightbulb" size={16} />
                Explanation:
              </div>
              <div className="explanation-text">{question.explanation}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Internal question navigation footer */}
      <div className="qpanel-footer">
        <button
          type="button"
          className="qpanel-nav-btn prev"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous question"
        >
          <AppIcon name="back" size={16} />
          Previous
        </button>
        <span className="qpanel-counter" aria-live="polite">
          {questionNumber} / {totalQuestions}
        </span>
        <button
          type="button"
          className="qpanel-nav-btn next"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next question"
        >
          Next
          <AppIcon name="arrowForward" size={16} />
        </button>
      </div>
    </div>
  )
})

/**
 * Sidebar
 * Memoized — the question grid and legend never re-render on navigation.
 */
const Sidebar = memo(function Sidebar({
  totalGridSize = 20,
  availableCount = 5,
  currentIndex,
  answers,
  marked,
  onGoTo,
  onUnavailableClick,
  theme,
}) {
  const getQuestionClass = (index) => {
    if (index >= availableCount) return ' unavailable'
    if (answers[index] !== undefined) return ' answered'
    if (marked.has(index)) return ' marked'
    return ''
  }

  return (
    <aside className={`sidebar theme-${theme}`}>
      <h2>Questions ({availableCount}/{totalGridSize})</h2>
      <div className="legend">
        <div className="legend-item"><span className="legend-dot dot-answered" />Answered</div>
        <div className="legend-item"><span className="legend-dot dot-notanswered" />Not Answered</div>
        <div className="legend-item"><span className="legend-dot dot-marked" />Marked</div>
        <div className="legend-item"><span className="legend-dot dot-unavailable" />Unavailable</div>
      </div>

      <div className="qgrid">
        {Array.from({ length: totalGridSize }, (_, i) => {
          const isAvailable = i < availableCount
          return (
            <button
              key={i}
              type="button"
              className={`qbtn${getQuestionClass(i)}${i === currentIndex ? ' current' : ''}`}
              onClick={() => {
                if (isAvailable) {
                  onGoTo(i)
                } else {
                  onUnavailableClick?.(i + 1)
                }
              }}
              title={isAvailable ? `Question ${i + 1}` : `Question ${i + 1} is unavailable`}
            >
              {i + 1}
              {marked.has(i) ? (
                <span className="flag-mini">
                  <AppIcon name="flag" size={7} />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="quick-jump-divider">
        <div className="quick-jump-title">
          <AppIcon name="quickJump" size={12} />
          Quick Jump
        </div>
        <select
          className="select-question"
          value={currentIndex < availableCount ? currentIndex : ''}
          onChange={(e) => {
            const idx = Number(e.target.value)
            if (idx < availableCount) {
              onGoTo(idx)
            } else {
              onUnavailableClick?.(idx + 1)
            }
          }}
        >
          <option value="">Select Question</option>
          {Array.from({ length: totalGridSize }, (_, i) => (
            <option key={i} value={i} disabled={i >= availableCount}>
              Question {i + 1} {i >= availableCount ? ' (Unavailable)' : ''}
            </option>
          ))}
        </select>
      </div>
    </aside>
  )
})

/**
 * SummaryBar
 * Memoized — only re-renders when the answer/mark/visited counts change.
 */
const SummaryBar = memo(function SummaryBar({ totalQuestions, answeredCount, markedCount, notVisitedCount, theme }) {
  return (
    <div className={`summary-bar theme-${theme}`}>
      <div className="summary-item">
        <div className="summary-icon icon-total">
          <AppIcon name="viewList" size={15} />
        </div>
        <div>
          <div className="summary-num">{totalQuestions}</div>
          <div className="summary-label">Total Qs</div>
        </div>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <div className="summary-icon icon-answered">{answeredCount}</div>
        <div>
          <div className="summary-num">{answeredCount}</div>
          <div className="summary-label">Answered</div>
        </div>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <div className="summary-icon icon-marked">
          <AppIcon name="flag" size={15} />
        </div>
        <div>
          <div className="summary-num">{markedCount}</div>
          <div className="summary-label">Marked</div>
        </div>
      </div>
      <div className="summary-divider" />
      <div className="summary-item">
        <div className="summary-icon icon-notvisited">
          <AppIcon name="notVisited" size={14} />
        </div>
        <div>
          <div className="summary-num">{notVisitedCount}</div>
          <div className="summary-label">Not Visited</div>
        </div>
      </div>
    </div>
  )
})

function MCQPracticePage({ subjectKey = 'computer-networks', chapter, onBack, onSubmit, reviewMode = false }) {
  const registry = useContentRegistry()
  const { activeWorkspaceId } = useWorkspaceStore()
  const subject = registry.subjectCatalog[subjectKey] || null
  const subjectTitle = subject?.title || 'Subject'

  const [dbQuestions, setDbQuestions] = useState([])
  const [userProgressMap, setUserProgressMap] = useState(new Map())
  const [mcqError, setMcqError] = useState(null)
  const [loadingMcqs, setLoadingMcqs] = useState(false)
  const [isReviewModeState, setIsReviewModeState] = useState(reviewMode)

  useEffect(() => {
    setIsReviewModeState(reviewMode)
  }, [reviewMode])

  useEffect(() => {
    let isMounted = true
    let abortController = null

    async function loadRemoteMcqsAndProgress() {
      setDbQuestions([])
      setUserProgressMap(new Map())
      setMcqError(null)
      setLoadingMcqs(true)

      if (!activeWorkspaceId) {
        setLoadingMcqs(false)
        return
      }

      const subjectId = subject?.subjectId || subjectKey
      const chapterId = chapter?.id || null
      const userId = getUserId()

      const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

      if (!chapterId || !isUuid(chapterId)) {
        setLoadingMcqs(false)
        setDbQuestions([])
        setUserProgressMap(new Map())
        setMcqError('Unable to load MCQs: chapter information is missing.')
        return
      }

      abortController = new AbortController()

      try {
        const [mcqRes, progressRes] = await Promise.all([
          mcqService.getMcqs(activeWorkspaceId, subjectId, chapterId),
          mcqService.getUserProgress(userId, chapterId),
        ])

        if (!isMounted || abortController.signal.aborted) return

        if (mcqRes.success && Array.isArray(mcqRes.data)) {
          const seenIds = new Set()
          const validList = []

          // Defensive client-side filter enforcing mcq.chapter_id === chapterId
          const filteredMcqs = mcqRes.data.filter((m) => m && String(m.chapter_id || m.chapterId) === String(chapterId))

          filteredMcqs.forEach((m, idx) => {
            if (!m) return
            const qId = m.id || `q-${idx + 1}`
            if (seenIds.has(qId)) return

            const questionText = m.question || m.text
            if (!questionText || typeof questionText !== 'string') return

            const rawOpts = m.options || [m.option_a || m.optionA, m.option_b || m.optionB, m.option_c || m.optionC, m.option_d || m.optionD].filter(Boolean)
            const opts = rawOpts.length >= 2 ? rawOpts : ['Option A', 'Option B', 'Option C', 'Option D']

            let correctIdx = 0
            if (typeof m.correct === 'number') correctIdx = m.correct
            else if (typeof m.correct_answer === 'number') correctIdx = m.correct_answer
            else if (typeof m.correct_answer === 'string' || typeof m.correctAnswer === 'string') {
              const strKey = String(m.correct_answer || m.correctAnswer || 'A').trim().toUpperCase()
              const map = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
              correctIdx = map[strKey] ?? 0
            }

            seenIds.add(qId)
            validList.push({
              id: qId,
              text: questionText,
              options: opts,
              correct: correctIdx,
              explanation: m.explanation || 'No detailed explanation provided for this question.',
              chapterId: m.chapter_id || chapterId,
              subjectId: m.subject_id || subjectId,
            })
          })

          setDbQuestions(validList)

          const pMap = new Map()
          if (progressRes.success && Array.isArray(progressRes.data)) {
            progressRes.data.forEach((p) => {
              if (p && p.mcq_id) {
                pMap.set(p.mcq_id, p)
              }
            })
          }
          setUserProgressMap(pMap)
          setMcqError(null)
        } else {
          setDbQuestions([])
          setUserProgressMap(new Map())
          setMcqError(mcqRes.error || 'Failed to load MCQs from database')
        }
      } catch (err) {
        if (!isMounted || abortController?.signal.aborted) return
        const message = err.message || 'Network request failed'
        if (import.meta.env.DEV) {
          console.warn('[MCQPracticePage] MCQ/Progress load error:', message)
        }
        setDbQuestions([])
        setUserProgressMap(new Map())
        setMcqError(message)
      } finally {
        if (isMounted && !abortController?.signal.aborted) {
          setLoadingMcqs(false)
        }
      }
    }

    loadRemoteMcqsAndProgress()
    return () => {
      isMounted = false
      if (abortController) {
        abortController.abort()
      }
    }
  }, [activeWorkspaceId, subjectKey, subjectTitle, subject, chapter])

  // Practice session pool logic with persistent question retirement & mastery prioritization
  const { activeQuestions, newCount, practicedCount, masteredCount, totalPool } = useMemo(() => {
    const poolSize = dbQuestions.length
    if (loadingMcqs || poolSize === 0) {
      return { activeQuestions: [], newCount: 0, practicedCount: 0, masteredCount: 0, totalPool: 0 }
    }

    const masteredList = []
    const unseenList = []
    const incorrectList = []

    dbQuestions.forEach((q) => {
      const progress = userProgressMap.get(q.id)
      const status = progress ? progress.status : 'UNSEEN'

      if (status === 'MASTERED') {
        masteredList.push(q)
      } else if (status === 'INCORRECT') {
        incorrectList.push(q)
      } else {
        unseenList.push(q)
      }
    })

    if (isReviewModeState) {
      const reviewList = masteredList.length > 0 ? masteredList : dbQuestions
      return {
        activeQuestions: reviewList,
        newCount: 0,
        practicedCount: reviewList.length,
        masteredCount: masteredList.length,
        totalPool: poolSize,
      }
    }

    // Normal Practice Mode: Exclude MASTERED, prioritize UNSEEN, then INCORRECT
    const shuffledUnseen = shuffleArray(unseenList)
    const shuffledIncorrect = shuffleArray(incorrectList)
    const eligiblePool = [...shuffledUnseen, ...shuffledIncorrect]

    const targetSize = Math.min(20, eligiblePool.length)
    const selected = eligiblePool.slice(0, targetSize)

    const sessionUnseenCount = selected.filter((q) => {
      const p = userProgressMap.get(q.id)
      return !p || p.status === 'UNSEEN'
    }).length

    return {
      activeQuestions: selected,
      newCount: sessionUnseenCount,
      practicedCount: selected.length - sessionUnseenCount,
      masteredCount: masteredList.length,
      totalPool: poolSize,
    }
  }, [dbQuestions, userProgressMap, loadingMcqs, isReviewModeState])

  const availableCount = activeQuestions.length
  const totalGridSize = availableCount

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState(() =>
    isReviewModeState ? { ...testSession.answers } : {},
  )
  const [marked, setMarked] = useState(() => {
    if (isReviewModeState) return new Set(testSession.marked)
    return new Set()
  })
  const [visited, setVisited] = useState(() => {
    if (isReviewModeState) return new Set(testSession.visited)
    return new Set([0])
  })
  const [timerOn, setTimerOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45)
  const [theme, setTheme] = useState(getInitialTheme)
  const [examMode, setExamMode] = useState(false)
  const [isMobile, setIsMobile] = useState(getIsMobile)

  // ── Question transition state ──────────────────────────────
  const [displayed, setDisplayed] = useState(0)
  const [phase, setPhase] = useState('in')
  const [dir, setDir] = useState('next')
  const directionRef = useRef('next')

  const questionScrollRef = useRef(null)

  const current = activeQuestions[displayed] || activeQuestions[0] || questions[0]
  const answeredCount = Object.keys(answers).length
  const markedCount = marked.size
  const notVisitedCount = Math.max(0, totalGridSize - visited.size)

  const handleUnavailableClick = useCallback((qNum) => {
    showToast({
      type: 'warning',
      title: 'Question Unavailable',
      message: `Question #${qNum} is not available in the database for this chapter. Admin can inject more MCQs in Admin Panel.`,
      duration: 4000,
    })
  }, [])

  // Persist theme preference
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // Track mobile viewport
  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalStep, setEvalStep] = useState(0)

  const evalStages = useMemo(() => [
    'Analyzing your answers',
    'Calculating accuracy',
    'Reviewing your performance',
    'Identifying learning patterns',
    'Preparing results',
  ], [])

  // Timer countdown — only runs while timerOn is true and not evaluating.
  useEffect(() => {
    if (!timerOn || isEvaluating) return undefined
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [timerOn, isEvaluating])

  useEffect(() => {
    if (currentIndex === displayed) return undefined
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplayed(currentIndex)
      setPhase('in')
      return undefined
    }
    setPhase('out')
    const t = setTimeout(() => {
      setDisplayed(currentIndex)
      setPhase('in')
    }, 180)
    return () => clearTimeout(t)
  }, [currentIndex, displayed])

  useEffect(() => {
    if (questionScrollRef.current) {
      questionScrollRef.current.scrollTop = 0
    }
  }, [displayed])

  useEffect(() => {
    if (!isReviewModeState) {
      testSession.result = null
      testSession.questions = null
    }
  }, [isReviewModeState])

  const formattedTime = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600)
    const m = Math.floor((secondsLeft % 3600) / 60)
    const s = secondsLeft % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [secondsLeft])

  const selectOption = useCallback((optionIndex) => {
    if (isReviewModeState || isEvaluating) return
    setAnswers((prev) => ({ ...prev, [displayed]: optionIndex }))
  }, [displayed, isReviewModeState, isEvaluating])

  const toggleMark = useCallback(() => {
    if (isReviewModeState || isEvaluating) return
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(displayed)) {
        next.delete(displayed)
      } else {
        next.add(displayed)
      }
      return next
    })
  }, [displayed, isReviewModeState, isEvaluating])

  const goTo = useCallback((index, direction = 'fade') => {
    if (index >= availableCount) {
      handleUnavailableClick(index + 1)
      return
    }
    directionRef.current = direction
    setDir(direction)
    setCurrentIndex(index)
    setVisited((prev) => new Set(prev).add(index))
    requestAnimationFrame(() => {
      if (questionScrollRef.current) {
        questionScrollRef.current.scrollTop = 0
      }
    })
  }, [availableCount, handleUnavailableClick])

  const goPrev = useCallback(() => {
    goTo(Math.max(0, currentIndex - 1), 'prev')
  }, [currentIndex, goTo])

  const goNext = useCallback(() => {
    if (currentIndex + 1 < availableCount) {
      goTo(currentIndex + 1, 'next')
    } else {
      handleUnavailableClick(currentIndex + 2)
    }
  }, [currentIndex, availableCount, goTo, handleUnavailableClick])

  const toggleTimer = useCallback(() => {
    if (isReviewModeState || isEvaluating) return
    setTimerOn((prev) => !prev)
  }, [isReviewModeState, isEvaluating])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const toggleExamMode = useCallback(() => {
    setExamMode((prev) => !prev)
  }, [])

  // Finalize attempt and update persistent user progress in Supabase
  const finalizeSubmission = useCallback(async (questionList) => {
    const userId = getUserId()
    const chapterId = chapter?.id || dbQuestions[0]?.chapterId || 'ch-default'

    let correctCount = 0
    let incorrectCount = 0
    let attemptedCount = 0
    let newlyMastered = 0

    const progressUpdates = []
    const newProgressMap = new Map(userProgressMap)

    questionList.forEach((q, idx) => {
      const chosen = answers[idx]
      if (chosen === undefined || chosen === null) return
      attemptedCount += 1

      const existing = userProgressMap.get(q.id) || {
        attempts: 0,
        correct_count: 0,
        incorrect_count: 0,
        status: 'UNSEEN',
      }

      const isCorrect = chosen === q.correct
      if (isCorrect) {
        correctCount += 1
        if (existing.status !== 'MASTERED') {
          newlyMastered += 1
        }
      } else {
        incorrectCount += 1
      }

      const newStatus = isCorrect ? 'MASTERED' : 'INCORRECT'

      const updatedRecord = {
        user_id: userId,
        mcq_id: q.id,
        chapter_id: q.chapterId || chapterId,
        status: newStatus,
        attempts: (existing.attempts || 0) + 1,
        correct_count: (existing.correct_count || 0) + (isCorrect ? 1 : 0),
        incorrect_count: (existing.incorrect_count || 0) + (isCorrect ? 0 : 1),
        last_attempted_at: new Date().toISOString(),
      }

      progressUpdates.push(updatedRecord)
      newProgressMap.set(q.id, updatedRecord)
    })

    if (progressUpdates.length > 0) {
      const saveRes = await mcqService.updateUserProgress(userId, progressUpdates)

      if (!saveRes.success) {
        setIsEvaluating(false)
        showToast({
          type: 'error',
          title: 'Progress Save Failed',
          message: saveRes.error || 'Failed to save question progress to database. Questions were not retired.',
          duration: 5000,
        })
        return
      }

      // Update global reactive progressStore so dashboard and chapter analytics recalculate reactively
      updateUserProgressStore(progressUpdates)
    }

    // Persisted to database successfully -> Update local component state
    setUserProgressMap(newProgressMap)

    const totalCount = questionList.length
    const unansweredCount = totalCount - attemptedCount
    const score = correctCount
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0

    const pastAttempts = Array.isArray(testSession.attemptHistoryData) ? testSession.attemptHistoryData : []
    const prevAttempt = pastAttempts.length > 0 ? pastAttempts[pastAttempts.length - 1] : null

    let currentTotalMastered = 0
    dbQuestions.forEach((q) => {
      const p = newProgressMap.get(q.id)
      if (p && p.status === 'MASTERED') {
        currentTotalMastered += 1
      }
    })

    const remainingEligible = Math.max(0, totalPool - currentTotalMastered)

    const currentAttemptRecord = {
      id: `att-${Date.now()}`,
      timestamp: Date.now(),
      subjectKey,
      subjectTitle: subjectTitle || subjectKey,
      chapterId: chapter?.id || null,
      chapterTitle: chapter?.num ? `Chapter ${chapter.num}: ${chapter.title || chapter.name || 'Chapter'}` : (chapter?.title || chapter?.name || 'Chapter Practice'),
      total: totalCount,
      attempted: attemptedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      skipped: unansweredCount,
      score,
      percentage,
      accuracy,
      questionIds: questionList.map((q) => q.id),
    }

    testSession.subjectKey = subjectKey
    testSession.chapter = chapter
    testSession.answers = { ...answers }
    testSession.marked = new Set(marked)
    testSession.visited = new Set(visited)
    testSession.questions = questionList
    testSession.mode = isReviewModeState ? 'review' : 'practice'
    const initialSeconds = 29 * 60 + 45
    testSession.timeTakenSeconds = Math.max(0, initialSeconds - secondsLeft)
    testSession.attemptHistory = [...(testSession.attemptHistory || []), percentage]
    const updatedHistory = [...pastAttempts, currentAttemptRecord]
    testSession.attemptHistoryData = updatedHistory

    try {
      localStorage.setItem('nexora_recent_mcq_attempts', JSON.stringify(updatedHistory))
    } catch {
      // ignore
    }

    const progressValues = Array.from(newProgressMap.values())
    const chapterMetrics = calculateChapterMetrics(totalPool, progressValues)

    testSession.result = {
      total: totalCount,
      attempted: attemptedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      unanswered: unansweredCount,
      score,
      percentage,
      accuracy,
      totalPool: chapterMetrics.totalMcqs,
      poolSize: chapterMetrics.totalMcqs,
      masteredCount: chapterMetrics.masteredMcqs,
      totalMastered: chapterMetrics.masteredMcqs,
      incorrectCount: chapterMetrics.incorrectMcqs,
      unseenCount: chapterMetrics.unseenMcqs,
      remainingUnmastered: chapterMetrics.remainingUnmastered,
      remainingEligible: chapterMetrics.remainingUnmastered,
      remainingUnpracticed: chapterMetrics.remainingUnmastered,
      uniquePracticedTotal: chapterMetrics.masteredMcqs + chapterMetrics.incorrectMcqs,
      masteryPercentage: chapterMetrics.masteryPercentage,
      state: chapterMetrics.state,
      newlyMasteredCount: newlyMastered,
      prevAttemptAccuracy: prevAttempt ? prevAttempt.accuracy : null,
      scoreDelta: prevAttempt ? accuracy - prevAttempt.accuracy : null,
    }

    setIsEvaluating(false)
    onSubmit?.()
  }, [answers, marked, visited, subjectKey, chapter, secondsLeft, totalPool, dbQuestions, userProgressMap, isReviewModeState, onSubmit])

  const handleSubmit = () => {
    if (isEvaluating) return
    setIsEvaluating(true)
    setEvalStep(0)

    const questionList = activeQuestions.map((q) => ({
      id: q.id,
      correct: q.correct,
      text: q.text,
      options: q.options,
      explanation: q.explanation,
    }))

    let step = 0
    const interval = setInterval(() => {
      step += 1
      if (step < evalStages.length) {
        setEvalStep(step)
      } else {
        clearInterval(interval)
        finalizeSubmission(questionList)
      }
    }, 240)
  }

  // Locked content cannot be practiced
  const isLocked = subject?.locked || chapter?.locked || false
  if (isLocked && !reviewMode) {
    return (
      <div className={`mcq-shell theme-${theme}`}>
        <PhoneFrame>
          <header className="header">
            <div className="header-left">
              <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
                <AppIcon name="back" size={20} />
              </button>
              <div className="header-title">
                <h1>Content Locked</h1>
                <p>{subjectTitle}</p>
              </div>
            </div>
          </header>
          <main className="content">
            <div className="acad-empty" style={{ marginTop: 24 }}>
              <AppIcon name="lock" size={28} />
              <p>This content is locked by the administrator.</p>
              <button type="button" className="btn btn-primary" onClick={onBack}>
                Go Back
              </button>
            </div>
          </main>
        </PhoneFrame>
      </div>
    )
  }

  return (
    <div className={`mcq-shell theme-${theme}${examMode && isMobile ? ' exam-mode' : ''}`}>
      <PhoneFrame>
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              <AppIcon name="back" size={20} />
            </button>
            <div className="header-title">
              <h1>{isReviewModeState ? 'Review Answers' : 'MCQ Practice'}</h1>
              <p>{chapter ? `${subjectTitle} • Chapter ${chapter.num || chapter.number || 1}` : subjectTitle}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="timer-box">
              <div className="timer-top">
                <span className="clock">
                  <AppIcon name="timer" size={14} />
                </span>
                {' '}{formattedTime}
              </div>
              <div className="timer-label">Time Left</div>
            </div>
            <button
              type="button"
              className={`pause-btn${timerOn ? ' timer-active' : ''}`}
              onClick={toggleTimer}
              aria-label={timerOn ? 'Pause timer' : 'Start timer'}
              disabled={isReviewModeState || isEvaluating}
            >
              <AppIcon name={timerOn ? 'pause' : 'timer'} size={16} />
            </button>
            {/* Exam Mode toggle */}
            <button
              type="button"
              className={`exam-toggle${examMode ? ' active' : ''}`}
              onClick={toggleExamMode}
              aria-label={examMode ? 'Exit exam mode' : 'Enter exam mode'}
              title={examMode ? 'Exit Exam Mode' : 'Exam Mode'}
            >
              <AppIcon name="examMode" size={18} />
            </button>
            {/* Theme toggle */}
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              <AppIcon name={theme === 'dark' ? 'lightMode' : 'darkMode'} size={18} />
            </button>
          </div>
        </header>

        <main className="content">
          {mcqError && (
            <div className="mcq-error-banner" role="alert">
              <AppIcon name="warning" size={18} />
              <div>
                <strong>Unable to load MCQs</strong>
                <span>{mcqError}</span>
              </div>
              <button type="button" className="mcq-error-dismiss" onClick={() => setMcqError(null)} aria-label="Dismiss">
                <AppIcon name="close" size={16} />
              </button>
            </div>
          )}

          {loadingMcqs ? (
            <div className="mcq-state-card">
              <div className="mcq-spinner" />
              <p>Loading questions from database...</p>
            </div>
          ) : totalPool === 0 ? (
            <div className="mcq-state-card empty">
              <AppIcon name="viewList" size={40} />
              <h2>No Practice Questions Available</h2>
              <p>This chapter doesn't have MCQs available in the database yet.</p>
              <button type="button" className="btn btn-primary" onClick={onBack}>
                Go Back
              </button>
            </div>
          ) : totalPool > 0 && availableCount === 0 && !isReviewModeState ? (
            <div className="mcq-state-card mastered-completion" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                You've mastered all available MCQs in this chapter
              </h2>
              <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px' }}>
                You answered all {totalPool} questions correctly! They have been retired from normal practice.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsReviewModeState(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                  <AppIcon name="reviewAnswers" size={16} />
                  Review Mastered Questions
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onBack}
                  style={{ padding: '10px 20px' }}
                >
                  Back to Chapter
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Pool & Session Info Banner */}
              <div className="pool-info-banner">
                <div className="pool-info-pill">
                  <span className="pill-dot pool-dot" />
                  <strong>MCQ Pool:</strong> {totalPool} Questions ({masteredCount} Mastered)
                </div>
                <div className="pool-info-pill">
                  <span className="pill-dot session-dot" />
                  <strong>{isReviewModeState ? 'Review Session:' : 'Practice Session:'}</strong> {availableCount} Questions ({newCount} Unseen, {practicedCount} Re-attempt)
                </div>
              </div>

              {/* Hide summary bar and sidebar in mobile exam mode */}
              {!(examMode && isMobile) && (
                <SummaryBar
                  totalQuestions={totalGridSize}
                  answeredCount={answeredCount}
                  markedCount={markedCount}
                  notVisitedCount={notVisitedCount}
                  theme={theme}
                />
              )}

              <div className="main-layout">
                {!(examMode && isMobile) && (
                  <Sidebar
                    totalGridSize={totalGridSize}
                    availableCount={availableCount}
                    currentIndex={currentIndex}
                    answers={answers}
                    marked={marked}
                    onGoTo={goTo}
                    onUnavailableClick={handleUnavailableClick}
                    theme={theme}
                  />
                )}

                <QuestionPanel
                  question={current}
                  questionNumber={displayed + 1}
                  totalQuestions={availableCount}
                  selectedOption={answers[displayed]}
                  onSelectOption={selectOption}
                  onToggleMark={toggleMark}
                  onPrev={goPrev}
                  onNext={goNext}
                  hasPrev={displayed > 0}
                  hasNext={displayed < availableCount - 1}
                  reviewMode={reviewMode}
                  scrollRef={questionScrollRef}
                  theme={theme}
                  examMode={examMode}
                  isMobile={isMobile}
                  animKey={displayed}
                  animPhase={phase}
                  animDir={dir}
                />
              </div>
            </>
          )}
        </main>

        {!(examMode && isMobile) && totalPool > 0 && (
          <div className="submit-bar">
            <div className="submit-left">
              <div className="submit-icon">
                <AppIcon name={reviewMode ? 'reviewAnswers' : 'submit'} size={20} />
              </div>
              <div>
                <div className="submit-title">
                  {reviewMode ? 'Review complete' : `Session progress: ${answeredCount} of ${availableCount} answered`}
                </div>
                <div className="submit-sub">
                  {reviewMode
                    ? 'You can go back to your results at any time.'
                    : 'Submit your test when ready to view detailed performance metrics.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="submit-btn"
              onClick={reviewMode ? onBack : handleSubmit}
              disabled={isEvaluating}
            >
              <AppIcon name={reviewMode ? 'back' : 'send'} size={16} />
              {reviewMode ? 'Back to Results' : 'Submit Test'}
            </button>
          </div>
        )}
      </PhoneFrame>

      {/* Submission Evaluation State Overlay */}
      {isEvaluating && (
        <div className="eval-overlay" role="dialog" aria-label="Evaluating Performance">
          <div className="eval-card">
            <div className="eval-spinner-wrap">
              <div className="eval-spinner" />
              <div className="eval-sparkle">✨</div>
            </div>
            <h3 className="eval-title">Evaluating Your Performance</h3>
            <p className="eval-subtitle">{evalStages[evalStep]}</p>

            <div className="eval-steps">
              {evalStages.map((stage, idx) => (
                <div key={stage} className={`eval-step-item ${idx <= evalStep ? 'active' : ''}`}>
                  <span className="eval-step-icon">
                    {idx < evalStep ? '✓' : idx === evalStep ? '●' : '○'}
                  </span>
                  <span className="eval-step-label">{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MCQPracticePage

