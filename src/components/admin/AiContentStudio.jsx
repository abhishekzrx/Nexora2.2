/**
 * AiContentStudio
 * Unified AI Content Studio: prompt generation + JSON injection in one workspace.
 * Supports MCQs and Flashcards. All local/mock — no backend.
 */
import { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { useAdminStore, injectMcqs, injectFlashcards } from '../../data/adminStore'
import {
  templatePresets,
  generatePrompt,
  parseJsonInput,
  validateJson,
  loadPromptHistory,
  savePromptHistory,
} from '../../utils/aiContentStudio'

const classOptions = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Graduate', 'Post Graduate', 'Other']
const examOptions = ['School Exam', 'Board Exam (CBSE)', 'Board Exam (State)', 'JEE Main', 'JEE Advanced', 'NEET', 'BPSC TRE', 'CTET', 'UPSC', 'SSC', 'Other']
const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Mixed']
const bloomOptions = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create', 'Mixed']
const styleOptions = ['', 'Standard MCQ', 'Assertion-Reason', 'Case Study Based', 'Match the Following', 'Diagram Based', 'Mixed']
const languageOptions = ['English', 'Hindi', 'English + Hindi', 'Hinglish', 'Bengali', 'Other']
const countOptions = [5, 10, 15, 20, 25, 30, 40, 50]

const defaultForm = {
  className: 'Class 12',
  examination: 'BPSC TRE',
  subject: '',
  chapter: '',
  difficulty: 'Medium',
  numQuestions: 10,
  topic: '',
  bloom: '',
  style: '',
  language: 'English',
  withExplanations: 'Yes',
  withNegative: 'No',
  withPreviousYear: 'No',
  randomness: '',
  specialInstructions: '',
}

function AiContentStudio({ onBack, onNavigate, preload }) {
  const { subjects, chapters } = useAdminStore()
  const [contentType, setContentType] = useState('mcqs')
  const [form, setForm] = useState(() => {
    if (preload && preload.subject && preload.chapter) {
      return { ...defaultForm, subject: preload.subject, chapter: preload.chapter, examination: preload.examination || defaultForm.examination }
    }
    return defaultForm
  })
  const [copied, setCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [processingMs, setProcessingMs] = useState(0)

  const chapterOptions = useMemo(() => chapters.filter((c) => !form.subject || c.subject === form.subject), [chapters, form.subject])

  useEffect(() => {
    setHistory(loadPromptHistory())
  }, [])

  const set = (key) => (event) => {
    const value = event.target.value
    setForm((current) => ({ ...current, [key]: value, ...(key === 'subject' ? { chapter: '' } : {}) }))
  }

  const applyTemplate = (preset) => {
    setForm((current) => ({ ...current, ...preset.values }))
  }

  const generatedPrompt = useMemo(() => generatePrompt(contentType, form), [contentType, form])

  const isConfigComplete = Boolean(form.subject && form.chapter && form.numQuestions > 0)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = generatedPrompt
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToHistory = () => {
    const entry = {
      id: Date.now(),
      contentType,
      form: { ...form },
      prompt: generatedPrompt,
      createdAt: new Date().toISOString(),
    }
    const next = [entry, ...history.filter((h) => h.id !== entry.id)]
    setHistory(next)
    savePromptHistory(next)
  }

  const handleReuse = (entry) => {
    setContentType(entry.contentType)
    setForm(entry.form)
  }

  const handleDeleteHistory = (id) => {
    const next = history.filter((h) => h.id !== id)
    setHistory(next)
    savePromptHistory(next)
  }

  // ── JSON validation ─────────────────────────────────────────────
  const validation = useMemo(() => {
    if (!jsonInput.trim()) return null
    const parsed = parseJsonInput(jsonInput)
    if (!parsed.ok) return { status: 'error', message: parsed.error, result: null, records: [] }
    const result = validateJson(contentType, parsed.data)
    return { status: result.invalid === 0 && result.duplicates === 0 ? 'valid' : 'warning', message: '', result, records: parsed.data }
  }, [jsonInput, contentType])

  const canInject = validation?.status === 'valid' && validation.result.valid > 0

  const handleInject = () => {
    if (!canInject || !validation) return
    const start = performance.now()
    const result = contentType === 'flashcards'
      ? injectFlashcards(validation.records)
      : injectMcqs(validation.records)
    const elapsed = Math.round(performance.now() - start)
    setProcessingMs(elapsed)
    setSummary(result)
    setJsonInput('')
  }

  const handleReset = () => {
    setForm(defaultForm)
    setJsonInput('')
    setSummary(null)
    setCopied(false)
  }

  const isFlashcards = contentType === 'flashcards'

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">AI Content Studio</div>
        <button type="button" className="admin-back-link" onClick={onBack}>
          <AppIcon name="back" size={16} />
          Back
        </button>
      </div>

      {/* ── Content Type Selector ─────────────────────────────────── */}
      <div className="studio-type-selector">
        <button
          type="button"
          className={`studio-type-btn${!isFlashcards ? ' active' : ''}`}
          onClick={() => { setContentType('mcqs'); setSummary(null); setJsonInput('') }}
        >
          <AppIcon name="mcqs" size={18} />
          <span>
            <strong>MCQs</strong>
            <small>Multiple choice questions</small>
          </span>
        </button>
        <button
          type="button"
          className={`studio-type-btn${isFlashcards ? ' active' : ''}`}
          onClick={() => { setContentType('flashcards'); setSummary(null); setJsonInput('') }}
        >
          <AppIcon name="flashcardsTab" size={18} />
          <span>
            <strong>Flashcards</strong>
            <small>Front / back study cards</small>
          </span>
        </button>
      </div>

      {/* ── Template Presets ──────────────────────────────────────── */}
      <div className="studio-presets">
        <span className="studio-presets-label"><AppIcon name="rocket" size={13} /> Templates</span>
        <div className="studio-presets-list">
          {templatePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="studio-preset-btn"
              onClick={() => applyTemplate(preset)}
            >
              <AppIcon name={preset.icon} size={13} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Prompt Configuration ──────────────────────────────────── */}
      <div className="studio-panel">
        <div className="studio-panel-title">
          <AppIcon name="settings" size={15} />
          Configure Prompt
        </div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stClass">Class *</label>
            <select id="stClass" className="admin-form-select" value={form.className} onChange={set('className')}>
              {classOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stExam">Examination *</label>
            <select id="stExam" className="admin-form-select" value={form.examination} onChange={set('examination')}>
              {examOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stSubject">Subject *</label>
            <select id="stSubject" className="admin-form-select" value={form.subject} onChange={set('subject')} required>
              <option value="">-- Select Subject --</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stChapter">Chapter *</label>
            <select id="stChapter" className="admin-form-select" value={form.chapter} onChange={set('chapter')} required>
              <option value="">-- Select Chapter --</option>
              {chapterOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stDifficulty">Difficulty *</label>
            <select id="stDifficulty" className="admin-form-select" value={form.difficulty} onChange={set('difficulty')}>
              {difficultyOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stCount">Number of {isFlashcards ? 'Cards' : 'Questions'} *</label>
            <select id="stCount" className="admin-form-select" value={form.numQuestions} onChange={set('numQuestions')}>
              {countOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="studio-form-divider">Optional Settings</div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stTopic">Topic / Subtopic</label>
            <input id="stTopic" type="text" className="admin-form-input" placeholder="e.g., Laws of Thermodynamics" value={form.topic} onChange={set('topic')} />
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stBloom">Bloom's Taxonomy</label>
            <select id="stBloom" className="admin-form-select" value={form.bloom} onChange={set('bloom')}>
              {bloomOptions.map((o) => <option key={o || 'none'} value={o}>{o || 'Any'}</option>)}
            </select>
          </div>
        </div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stStyle">Question Style</label>
            <select id="stStyle" className="admin-form-select" value={form.style} onChange={set('style')}>
              {styleOptions.map((o) => <option key={o || 'none'} value={o}>{o || 'Standard'}</option>)}
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stLang">Language</label>
            <select id="stLang" className="admin-form-select" value={form.language} onChange={set('language')}>
              {languageOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="studio-form-row studio-form-row-3">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stExpl">Include Explanations</label>
            <select id="stExpl" className="admin-form-select" value={form.withExplanations} onChange={set('withExplanations')}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stNeg">Negative Questions</label>
            <select id="stNeg" className="admin-form-select" value={form.withNegative} onChange={set('withNegative')}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stPrev">Previous Year Style</label>
            <select id="stPrev" className="admin-form-select" value={form.withPreviousYear} onChange={set('withPreviousYear')}>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
        </div>

        <div className="studio-form-row">
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stRand">Randomness / Diversity</label>
            <input id="stRand" type="text" className="admin-form-input" placeholder="e.g., high diversity" value={form.randomness} onChange={set('randomness')} />
          </div>
          <div className="studio-form-col">
            <label className="admin-form-label" htmlFor="stSpecial">Additional Instructions</label>
            <input id="stSpecial" type="text" className="admin-form-input" placeholder="e.g., avoid calculations" value={form.specialInstructions} onChange={set('specialInstructions')} />
          </div>
        </div>

        <div className="studio-actions">
          <Button variant="secondary" onClick={handleReset}>
            <AppIcon name="refresh" size={14} />
            Reset
          </Button>
          <Button variant="primary" onClick={handleSaveToHistory} disabled={!isConfigComplete}>
            <AppIcon name="bookmark" size={14} />
            Save to History
          </Button>
        </div>
      </div>

      {/* ── Generated Prompt ──────────────────────────────────────── */}
      <div className="studio-panel">
        <div className="studio-panel-title">
          <AppIcon name="document" size={15} />
          Generated Prompt
          <span className={`studio-status${isConfigComplete ? ' ready' : ''}`}>
            <span className={`studio-status-dot${isConfigComplete ? '' : ' pending'}`} />
            {isConfigComplete ? 'Ready' : 'Incomplete'}
          </span>
        </div>

        {isConfigComplete ? (
          <pre className="studio-prompt-output">{generatedPrompt}</pre>
        ) : (
          <div className="studio-prompt-empty">
            <AppIcon name="aiCoach" size={26} />
            <p>Select a subject and chapter to generate your prompt.</p>
          </div>
        )}

        <div className="studio-copy-row">
          <Button variant="primary" onClick={handleCopy} disabled={!isConfigComplete} className="studio-copy-btn">
            <AppIcon name={copied ? 'check' : 'document'} size={16} />
            {copied ? 'Copied!' : 'Copy Prompt'}
          </Button>
          {copied ? (
            <span className="studio-copy-success">
              <AppIcon name="check" size={13} />
              Copied to clipboard
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Prompt History ────────────────────────────────────────── */}
      {history.length > 0 ? (
        <div className="studio-panel">
          <div className="studio-panel-title">
            <AppIcon name="clock" size={15} />
            Prompt History
          </div>
          <div className="studio-history-list">
            {history.map((entry) => (
              <div className="studio-history-item" key={entry.id}>
                <div className="studio-history-info">
                  <strong>{entry.contentType === 'flashcards' ? 'Flashcards' : 'MCQs'} — {entry.form.subject || 'Any'} / {entry.form.chapter || 'Any'}</strong>
                  <small>{new Date(entry.createdAt).toLocaleString()}</small>
                </div>
                <div className="studio-history-actions">
                  <button type="button" className="studio-history-btn" onClick={() => handleReuse(entry)} title="Reuse prompt">
                    <AppIcon name="refresh" size={13} />
                  </button>
                  <button type="button" className="studio-history-btn" onClick={() => { setForm(entry.form); setContentType(entry.contentType) }} title="Edit configuration">
                    <AppIcon name="edit" size={13} />
                  </button>
                  <button type="button" className="studio-history-btn danger" onClick={() => handleDeleteHistory(entry.id)} title="Delete">
                    <AppIcon name="delete" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── JSON Injection Workspace ──────────────────────────────── */}
      <div className="studio-panel">
        <div className="studio-panel-title">
          <AppIcon name="upload" size={15} />
          JSON Injection — {isFlashcards ? 'Flashcard' : 'MCQ'} Schema
        </div>

        <textarea
          className="studio-json-input"
          placeholder={isFlashcards
            ? 'Paste AI-generated flashcard JSON here...\n[{"front":"...","back":"...","subject":"...","chapter":"..."}]'
            : 'Paste AI-generated MCQ JSON here...\n[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"...","subject":"...","chapter":"..."}]'}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          spellCheck={false}
        />

        {validation ? (
          <div className={`studio-validation studio-validation-${validation.status}`}>
            {validation.status === 'error' ? (
              <>
                <AppIcon name="warning" size={15} />
                <div>
                  <strong>Invalid JSON</strong>
                  <p>{validation.message}</p>
                </div>
              </>
            ) : (
              <>
                <AppIcon name={validation.status === 'valid' ? 'check' : 'warning'} size={15} />
                <div>
                  <strong>{validation.status === 'valid' ? 'Valid JSON' : 'Validation Warnings'}</strong>
                  <p>
                    {validation.result.valid} valid • {validation.result.invalid} invalid • {validation.result.duplicates} duplicates
                  </p>
                </div>
              </>
            )}
          </div>
        ) : null}

        {validation?.result?.errors?.length > 0 ? (
          <div className="studio-errors">
            {validation.result.errors.slice(0, 5).map((err) => (
              <div className="studio-error-item" key={err.index}>
                <strong>Record #{err.index}:</strong> {err.issues.join(', ')}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Import Preview ──────────────────────────────────────── */}
        {validation?.result ? (
          <div className="studio-preview">
            <div className="studio-preview-title">
              <AppIcon name="viewList" size={14} />
              Import Preview
            </div>
            <div className="studio-preview-grid">
              <div className="studio-preview-item">
                <span className="studio-preview-value">{validation.result.valid}</span>
                <span className="studio-preview-label">{isFlashcards ? 'Cards Found' : 'Questions Found'}</span>
              </div>
              <div className="studio-preview-item">
                <span className="studio-preview-value">{validation.result.duplicates}</span>
                <span className="studio-preview-label">Duplicates</span>
              </div>
              <div className="studio-preview-item">
                <span className="studio-preview-value">{validation.result.invalid}</span>
                <span className="studio-preview-label">Invalid</span>
              </div>
              <div className="studio-preview-item">
                <span className={`studio-preview-value${canInject ? ' green' : ''}`}>{canInject ? 'Ready' : 'Blocked'}</span>
                <span className="studio-preview-label">Ready for Import</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="studio-inject-row">
          <Button variant="primary" onClick={handleInject} disabled={!canInject} className="studio-inject-btn">
            <AppIcon name="upload" size={16} />
            Inject {isFlashcards ? 'Flashcards' : 'MCQs'}
          </Button>
        </div>
      </div>

      {/* ── Import Summary ────────────────────────────────────────── */}
      {summary ? (
        <div className="studio-summary">
          <div className="studio-summary-head">
            <span className="studio-summary-icon"><AppIcon name="check" size={18} /></span>
            <div>
              <div className="studio-summary-title">Import Complete</div>
              <div className="studio-summary-sub">Processed in {processingMs}ms</div>
            </div>
          </div>
          <div className="studio-summary-grid">
            <div className="studio-summary-item green"><span>{summary.imported}</span><small>Imported</small></div>
            <div className="studio-summary-item red"><span>{summary.failed}</span><small>Failed</small></div>
            <div className="studio-summary-item orange"><span>{summary.duplicates}</span><small>Duplicates Skipped</small></div>
            <div className="studio-summary-item blue"><span>{processingMs}ms</span><small>Processing Time</small></div>
          </div>
          <div className="studio-summary-meta">
            <span><AppIcon name="subjects" size={13} /> Last Subject: <strong>{summary.lastSubject || '—'}</strong></span>
            <span><AppIcon name="chapters" size={13} /> Last Chapter: <strong>{summary.lastChapter || '—'}</strong></span>
          </div>
          <div className="studio-summary-actions">
            <Button variant="primary" onClick={handleReset}>
              <AppIcon name="refresh" size={14} />
              Generate Again
            </Button>
            <Button variant="secondary" onClick={() => { setSummary(null); setJsonInput('') }}>
              <AppIcon name="upload" size={14} />
              Inject Another
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default AiContentStudio