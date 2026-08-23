/**
 * FormattedQuestionText.jsx
 * Clean, standard MCQ question stem renderer.
 */
import React from 'react'
import { cleanQuestionText } from '../../utils/questionParser'

export default function FormattedQuestionText({ text = '', question = null, className = '' }) {
  const rawText = text || question?.text || question?.question || ''
  const cleaned = cleanQuestionText(rawText)

  return (
    <div className={`structured-q-container standard-q-container ${className}`}>
      {cleaned || 'Question text not available.'}
    </div>
  )
}
