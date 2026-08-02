/**
 * MCQPracticePage
 * Reusable MCQ practice screen with question grid, timer,
 * options, and submit bar. Reproduces htmlresource/mcq-practice.html.
 */
import { useState } from 'react'
import '../styles/mcqPractice.css'
import PhoneFrame from '../components/layout/PhoneFrame'
import { getSubject } from '../data/mockData'

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

  const current = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const markedCount = marked.size
  const notVisitedCount = totalQuestions - visited.size

  const selectOption = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const toggleMark = () => {
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(currentIndex)) {
        next.delete(currentIndex)
      } else {
        next.add(currentIndex)
      }
      return next
    })
  }

  const goTo = (index) => {
    setCurrentIndex(index)
    setVisited((prev) => new Set(prev).add(index))
  }

  const getQuestionClass = (index) => {
    if (answers[index] !== undefined) return 'answered'
    if (marked.has(index)) return 'marked'
    return ''
  }

  return (
    <div className="mcq-shell">
      <PhoneFrame>
        <header className="header">
          <div className="header-left">
            <button type="button" className="back-btn" onClick={onBack} aria-label="Go back">
              ←
            </button>
            <div className="header-title">
              <h1>MCQ Practice</h1>
              <p>{chapter ? `${subjectTitle} • Chapter ${chapter.num}` : subjectTitle}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="timer-box">
              <div className="timer-top">
                <span className="clock">⏱</span> 00:29:45
              </div>
              <div className="timer-label">Time Left</div>
            </div>
            <button type="button" className="pause-btn" aria-label="Pause">
              ❚❚
            </button>
          </div>
        </header>

        <main className="content">
          <div className="summary-bar">
            <div className="summary-item">
              <div className="summary-icon icon-total">☰</div>
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
              <div className="summary-icon icon-marked">⚑</div>
              <div>
                <div className="summary-num">{markedCount}</div>
                <div className="summary-label">Marked</div>
              </div>
            </div>
            <div className="summary-divider" />
            <div className="summary-item">
              <div className="summary-icon icon-notvisited">◷</div>
              <div>
                <div className="summary-num">{notVisitedCount}</div>
                <div className="summary-label">Not Visited</div>
              </div>
            </div>
          </div>

          <div className="main-layout">
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
                    onClick={() => goTo(i)}
                  >
                    {i + 1}
                    {marked.has(i) ? <span className="flag-mini">⚑</span> : null}
                  </button>
                ))}
              </div>

              <div className="quick-jump-divider">
                <div className="quick-jump-title">⊚ Quick Jump</div>
                <select className="select-question" value={currentIndex} onChange={(e) => goTo(Number(e.target.value))}>
                  <option value="">Select Question</option>
                  {Array.from({ length: totalQuestions }, (_, i) => (
                    <option key={i} value={i}>Question {i + 1}</option>
                  ))}
                </select>
              </div>
            </aside>

            <div className="question-panel">
              <div className="qpanel-top">
                <div className="qpanel-title">Question {currentIndex + 1} of {totalQuestions}</div>
                <div className="qpanel-actions">
                  <button type="button" className="action-btn" onClick={toggleMark}>
                    🔖 Mark
                  </button>
                  <button type="button" className="action-btn report">⚑ Report</button>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
              </div>

              <div className="question-text">{current.text}</div>

              <div className="options">
                {current.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    className={`option${answers[currentIndex] === optionIndex ? ' selected' : ''}`}
                    onClick={() => selectOption(optionIndex)}
                  >
                    <div className="radio">
                      {answers[currentIndex] === optionIndex ? <div className="radio-dot" /> : null}
                    </div>
                    {String.fromCharCode(65 + optionIndex)}. {option}
                  </button>
                ))}
              </div>

              {answers[currentIndex] !== undefined ? (
                <div className="explanation">
                  <div className="explanation-title">💡 Explanation:</div>
                  <div className="explanation-text">{current.explanation}</div>
                </div>
              ) : null}

              <div className="nav-buttons">
                <button
                  type="button"
                  className="nav-btn prev"
                  onClick={() => goTo(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="nav-btn next"
                  onClick={() => goTo(Math.min(totalQuestions - 1, currentIndex + 1))}
                  disabled={currentIndex === totalQuestions - 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </main>

        <div className="submit-bar">
          <div className="submit-left">
            <div className="submit-icon">📋</div>
            <div>
              <div className="submit-title">Answer 10 more questions to submit the test</div>
              <div className="submit-sub">You can submit the test after answering at least 10 questions.</div>
            </div>
          </div>
          <button type="button" className="submit-btn" onClick={onSubmit}>➤ Submit Test</button>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default MCQPracticePage