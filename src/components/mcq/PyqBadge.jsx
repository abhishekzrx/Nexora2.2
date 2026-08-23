/**
 * PyqBadge.jsx
 * Compact, glowing badge highlighting PYQs in question headers, cards, and practice views.
 */
import React from 'react'
import { extractPyqInfo } from '../../utils/questionParser'

export default function PyqBadge({ question, className = '', size = 'md' }) {
  const pyqInfo = extractPyqInfo(question)
  if (!pyqInfo) return null

  return (
    <span
      className={`pyq-highlight-badge size-${size} ${className}`}
      title={`Previous Year Question: ${pyqInfo.label}`}
    >
      <span className="pyq-star-icon">⭐</span>
      <span className="pyq-badge-text">{pyqInfo.label}</span>
    </span>
  )
}
