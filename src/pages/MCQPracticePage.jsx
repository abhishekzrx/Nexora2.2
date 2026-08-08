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

        {reviewMode || selectedOption !== undefined ? (
          <div className="explanation">
            <div className="explanation-title">
              <AppIcon name="lightbulb" size={16} />
              Explanation:
            </div>
            <div className="explanation-text">{question.explanation}</div>
          </div>
        ) : null}
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
  totalQuestions,
  currentIndex,
  answers,
  marked,
  onGoTo,
  theme,
}) {
  const getQuestionClass = (index) => {
    if (answers[index] !== undefined) return 'answered'
    if (marked.has(index)) return 'marked'
    return ''
  }

  return (
    <aside className={`sidebar theme-${theme}`}>
      <h2>Questions ({totalQuestions})</h2>
      <div className="legend">
        <div className="legend-item"><span className="legend-dot dot-answered" />Answered</div>
        <div className="legend-item"><span className="legend-dot dot-notanswered" />Not Answered</div>
        <div className="legend-item"><span className="legend-dot dot-marked" />Marked</div>
        <div className="legend-item"><span className="legend-dot dot-notvisited" />Not Visited</div>
      </div>

      <div className="qgrid">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`qbtn${getQuestionClass(i)}${i === currentIndex ? ' current' : ''}`}
            onClick={() => onGoTo(i)}
          >
            {i + 1}
            {marked.has(i) ? (
              <span className="flag-mini">
                <AppIcon name="flag" size={7} />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="quick-jump-divider">
        <div className="quick-jump-title">
          <AppIcon name="quickJump" size={12} />
          Quick Jump
        </div>
        <select
          className="select-question"
          value={currentIndex}
          onChange={(e) => onGoTo(Number(e.target.value))}
        >
          <option value="">Select Question</option>
          {Array.from({ length: totalQuestions }, (_, i) => (
            <option key={i} value={i}>Question {i + 1}</option>
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
  const subject = registry.subjectCatalog[subjectKey] || null
  const subjectTitle = subject?.title || 'Subject'

  const chapterMcqCount = chapter
    ? Number.parseInt(chapter.meta?.match(/(\d+)\s*MCQs?/i)?.[1] || '20', 10)
    : 20
  const totalQuestions = chapterMcqCount || 20

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState(() =>
    reviewMode ? { ...testSession.answers } : {},
  )
  const [marked, setMarked] = useState(() => {
    if (reviewMode) return new Set(testSession.marked)
    return new Set()
  })
  const [visited, setVisited] = useState(() => {
    if (reviewMode) return new Set(testSession.visited)
    return new Set([0])
  })
  const [timerOn, setTimerOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45)
  const [theme, setTheme] = useState(getInitialTheme)
  const [examMode, setExamMode] = useState(false)
  const [isMobile, setIsMobile] = useState(getIsMobile)

  const questionScrollRef = useRef(null)

  const current = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const markedCount = marked.size
  const notVisitedCount = totalQuestions - visited.size

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

  // Timer countdown — only runs while timerOn is true.
  useEffect(() => {
    if (!timerOn) return undefined
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [timerOn])

  const formattedTime = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600)
    const m = Math.floor((secondsLeft % 3600) / 60)
    const s = secondsLeft % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [secondsLeft])

  const selectOption = useCallback((optionIndex) => {
    if (reviewMode) return
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }, [currentIndex, reviewMode])

  const toggleMark = useCallback(() => {
    if (reviewMode) return
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(currentIndex)) {
        next.delete(currentIndex)
      } else {
        next.add(currentIndex)
      }
      return next
    })
  }, [currentIndex, reviewMode])

  const goTo = useCallback((index) => {
    setCurrentIndex(index)
    setVisited((prev) => new Set(prev).add(index))
    requestAnimationFrame(() => {
      if (questionScrollRef.current) {
        questionScrollRef.current.scrollTop = 0
      }
    })
  }, [])

  const goPrev = useCallback(() => {
    goTo(Math.max(0, currentIndex - 1))
  }, [currentIndex, goTo])

  const goNext = useCallback(() => {
    goTo(Math.min(totalQuestions - 1, currentIndex + 1))
  }, [currentIndex, goTo, totalQuestions])

  const toggleTimer = useCallback(() => {
    if (reviewMode) return
    setTimerOn((prev) => !prev)
  }, [reviewMode])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const toggleExamMode = useCallback(() => {
    setExamMode((prev) => !prev)
  }, [])

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

  const handleSubmit = () => {
    testSession.subjectKey = subjectKey
    testSession.chapter = chapter
    testSession.answers = { ...answers }
    testSession.marked = new Set(marked)
    testSession.visited = new Set(visited)
    testSession.mode = 'practice'
    onSubmit?.()
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
              <h1>{reviewMode ? 'Review Answers' : 'MCQ Practice'}</h1>
              <p>{chapter ? `${subjectTitle} • Chapter ${chapter.num}` : subjectTitle}</p>
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
              disabled={reviewMode}
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
          {/* Hide summary bar and sidebar in mobile exam mode */}
          {!(examMode && isMobile) && (
            <SummaryBar
              totalQuestions={totalQuestions}
              answeredCount={answeredCount}
              markedCount={markedCount}
              notVisitedCount={notVisitedCount}
              theme={theme}
            />
          )}

          <div className="main-layout">
            {!(examMode && isMobile) && (
              <Sidebar
                totalQuestions={totalQuestions}
                currentIndex={currentIndex}
                answers={answers}
                marked={marked}
                onGoTo={goTo}
                theme={theme}
              />
            )}

            <QuestionPanel
              question={current}
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              selectedOption={answers[currentIndex]}
              onSelectOption={selectOption}
              onToggleMark={toggleMark}
              onPrev={goPrev}
              onNext={goNext}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < totalQuestions - 1}
              reviewMode={reviewMode}
              scrollRef={questionScrollRef}
               theme={theme}
               examMode={examMode}
               isMobile={isMobile}
            />
          </div>

          {/* External nav-buttons removed — navigation is now inside QuestionPanel */}
        </main>

        {!(examMode && isMobile) && (
          <div className="submit-bar">
            <div className="submit-left">
              <div className="submit-icon">
                <AppIcon name={reviewMode ? 'reviewAnswers' : 'submit'} size={20} />
              </div>
              <div>
                <div className="submit-title">
                  {reviewMode ? 'Review complete' : 'Answer 10 more questions to submit the test'}
                </div>
                <div className="submit-sub">
                  {reviewMode
                    ? 'You can go back to your results at any time.'
                    : 'You can submit the test after answering at least 10 questions.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="submit-btn"
              onClick={reviewMode ? onBack : handleSubmit}
            >
              <AppIcon name={reviewMode ? 'back' : 'send'} size={16} />
              {reviewMode ? 'Back to Results' : 'Submit Test'}
            </button>
          </div>
        )}
      </PhoneFrame>
    </div>
  )
}

export default MCQPracticePage
