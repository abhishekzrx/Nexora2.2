/**
 * AdminInjectMcqs
 * Form screen for injecting MCQs into chapters.
 * All icons go through the global AppIcon system.
 */
import { useState } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { chaptersData } from '../../data/adminData'

function AdminInjectMcqs({ onCancel, onSuccess }) {
  const [subject, setSubject] = useState('')
  const [chapterOptions, setChapterOptions] = useState([])

  const handleSubjectChange = (value) => {
    setSubject(value)
    setChapterOptions(value ? chaptersData[value] || [] : [])
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSuccess('✓ MCQs injected successfully!')
  }

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Inject MCQs</div>
      </div>

      <div className="admin-card" style={{ maxWidth: '100%' }}>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="adminSubjectSelect">Select Subject *</label>
            <select
              id="adminSubjectSelect"
              className="admin-form-select"
              value={subject}
              onChange={(event) => handleSubjectChange(event.target.value)}
              required
            >
              <option value="">-- Select Subject --</option>
              <option value="cn">Computer Networks</option>
              <option value="ph">Physics</option>
              <option value="ch">Chemistry</option>
              <option value="bio">Biology</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="adminChapterSelect">Select Chapter(s) *</label>
            <select id="adminChapterSelect" className="admin-form-select" multiple required>
              {chapterOptions.length > 0 ? (
                chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))
              ) : (
                <option value="">-- Select a subject first --</option>
              )}
            </select>
            <div className="admin-form-hint">Hold Ctrl/Cmd to select multiple chapters</div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="adminMcqTextarea">MCQ File or Paste Questions *</label>
            <textarea
              id="adminMcqTextarea"
              className="admin-form-textarea"
              placeholder="Paste MCQs in JSON format or upload file..."
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="adminDifficulty">Difficulty Level</label>
            <select id="adminDifficulty" className="admin-form-select" defaultValue="Mixed">
              <option>Mixed</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="adminQuestionCount">Number of Questions</label>
            <input
              id="adminQuestionCount"
              type="number"
              className="admin-form-input"
              placeholder="Auto-detected from file"
              disabled
            />
          </div>

          <div className="admin-form-actions">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary">
              <AppIcon name="upload" size={16} />
              Inject MCQs
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

export default AdminInjectMcqs