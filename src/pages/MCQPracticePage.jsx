/**
 * MCQPracticePage
 * Reusable MCQ practice screen with question grid, timer,
 * options, and submit bar. Reproduces htmlresource/mcq-practice.html.
 *
 * Stability: only the question content (text, options, selected state,
 * progress value) re-renders when navigating. The header, summary bar,
 * sidebar, nav buttons, and submit bar stay mounted and fixed.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/mcqPractice.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import { getSubject } from '../data/mockData'
import AppIcon from '../components/ui/AppIcon'

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

/**
 * QuestionPanel
 * Memoized so it only re-renders when the current question, its answer,
 * or the mark state changes. The surrounding layout stays untouched.
 */
const QuestionPanel = memo(function QuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onSelectOption,
  onToggleMark,
  scrollRef,
}) {
  return (
    <div className="question-panel">
      <div className="qpanel-top">
        <div className="qpanel-title">
          Question {questionNumber} of {totalQuestions}
        </div>
        <div className="qpanel-actions">
          <button type="button" className="action-btn" onClick={onToggleMark}>
            <AppIcon name="bookmark" size={13} />
            Mark
          </button>
          <button type="button" className="action-btn report">
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
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              className={`option${selectedOption === optionIndex ? ' selected' : ''}`}
              onClick={() => onSelectOption(optionIndex)}
            >
              <div className="radio">
                {selectedOption === optionIndex ? <div className="radio-dot" /> : null}
              </div>
              {String.fromCharCode(65 + optionIndex)}. {option}
            </button>
          ))}
        </div>

        {selectedOption !== undefined ? (
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
}) {
  const getQuestionClass = (index) => {
    if (answers[index] !== undefined) return 'answered'
    if (marked.has(index)) return 'marked'
    return ''
  }

  return (
    <aside className="sidebar">
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
const SummaryBar = memo(function SummaryBar({ totalQuestions, answeredCount, markedCount, notVisitedCount }) {
  return (
    <div className="summary-bar">
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

function MCQPracticePage({ subjectKey = 'computer-networks', chapter, onBack, onSubmit }) {
  const subject = getSubject(subjectKey)
  const subjectTitle = subject.title

  // Derive MCQ count from chapter meta (e.g. "20 MCQs • 8 Flashcards" → 20)
  const chapterMcqCount = chapter
    ? Number.parseInt(chapter.meta?.match(/(\d+)\s*MCQs?/i)?.[1] || '20', 10)
    : 20
  const totalQuestions = chapterMcqCount || 20

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [visited, setVisited] = useState(new Set([0]))
  const [timerOn, setTimerOn] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45)

  const questionScrollRef = useRef(null)

  const current = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const markedCount = marked.size
  const notVisitedCount = totalQuestions - visited.size

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
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }, [currentIndex])

  const toggleMark = useCallback(() => {
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(currentIndex)) {
        next.delete(currentIndex)
      } else {
        next.add(currentIndex)
      }
      return next
    })
  }, [currentIndex])

  const goTo = useCallback((index) => {
    setCurrentIndex(index)
    setVisited((prev) => new Set(prev).add(index))
    // Scroll only the question container back to the top — never the page.
    requestAnimationFrame(() => {
      if (questionScrollRef.current) {
        questionScrollRef.current.scrollTop = 0
      }
    })
  }, [])

  const toggleTimer = useCallback(() => {
    setTimerOn((prev) => !prev)
  }, [])

  return (
    <div className="mcq-shell">
      <PhoneFrame>
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              <AppIcon name="back" size={20} />
            </button>
            <div className="header-title">
              <h1>MCQ Practice</h1>
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
            >
              <AppIcon name={timerOn ? 'pause' : 'timer'} size={16} />
            </button>
          </div>
        </header>

        <main className="content">
          <SummaryBar
            totalQuestions={totalQuestions}
            answeredCount={answeredCount}
            markedCount={markedCount}
            notVisitedCount={notVisitedCount}
          />

          <div className="main-layout">
            <Sidebar
              totalQuestions={totalQuestions}
              currentIndex={currentIndex}
              answers={answers}
              marked={marked}
              onGoTo={goTo}
            />

            <QuestionPanel
              question={current}
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              selectedOption={answers[currentIndex]}
              onSelectOption={selectOption}
              onToggleMark={toggleMark}
              scrollRef={questionScrollRef}
            />
          </div>

          <div className="nav-buttons">
            <button
              type="button"
              className="nav-btn prev"
              onClick={() => goTo(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <AppIcon name="back" size={16} />
              Previous
            </button>
            <button
              type="button"
              className="nav-btn next"
              onClick={() => goTo(Math.min(totalQuestions - 1, currentIndex + 1))}
              disabled={currentIndex === totalQuestions - 1}
            >
              Next
              <AppIcon name="arrowForward" size={16} />
            </button>
          </div>
        </main>

        <div className="submit-bar">
          <div className="submit-left">
            <div className="submit-icon">
              <AppIcon name="submit" size={20} />
            </div>
            <div>
              <div className="submit-title">Answer 10 more questions to submit the test</div>
              <div className="submit-sub">You can submit the test after answering at least 10 questions.</div>
            </div>
          </div>
          <button type="button" className="submit-btn" onClick={onSubmit}>
            <AppIcon name="send" size={16} />
            Submit Test
          </button>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default MCQPracticePage