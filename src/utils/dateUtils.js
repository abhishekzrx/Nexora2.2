/**
 * dateUtils.js
 * Utility functions for Course Exam Date calculations and countdowns.
 */

/**
 * Calculates remaining days from present day until an exam target date.
 * @param {string|Date} examDateInput - YYYY-MM-DD string or Date object
 * @returns {object} { daysRemaining, formattedDate, isPast, isToday, statusText, badgeColor }
 */
export function calculateExamCountdown(examDateInput) {
  if (!examDateInput) {
    return {
      daysRemaining: null,
      formattedDate: 'Unscheduled',
      isPast: false,
      isToday: false,
      statusText: 'Exam Date Unscheduled',
      badgeColor: '#64748B', // Slate
    }
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Handle string YYYY-MM-DD or ISO string safely without timezone offset shift
    let examDate
    if (typeof examDateInput === 'string') {
      const cleanStr = examDateInput.split('T')[0]
      if (cleanStr.length === 10 && cleanStr.includes('-')) {
        const [year, month, day] = cleanStr.split('-').map(Number)
        examDate = new Date(year, month - 1, day)
      } else {
        examDate = new Date(examDateInput)
      }
    } else {
      examDate = new Date(examDateInput)
    }

    examDate.setHours(0, 0, 0, 0)

    if (isNaN(examDate.getTime())) {
      return {
        daysRemaining: null,
        formattedDate: 'Unscheduled',
        isPast: false,
        isToday: false,
        statusText: 'Exam Date Unscheduled',
        badgeColor: '#64748B',
      }
    }

    const diffMs = examDate.getTime() - today.getTime()
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24))

    const options = { month: 'short', day: 'numeric', year: 'numeric' }
    const formattedDate = examDate.toLocaleDateString('en-US', options)

    if (daysRemaining === 0) {
      return {
        daysRemaining: 0,
        formattedDate,
        isPast: false,
        isToday: true,
        statusText: '🎯 Exam Day Today!',
        badgeColor: '#DC2626', // Red
      }
    } else if (daysRemaining > 0) {
      return {
        daysRemaining,
        formattedDate,
        isPast: false,
        isToday: false,
        statusText: `${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left`,
        badgeColor: daysRemaining <= 14 ? '#EA580C' : daysRemaining <= 30 ? '#F59E0B' : '#16A34A',
      }
    } else {
      const daysAgo = Math.abs(daysRemaining)
      return {
        daysRemaining,
        formattedDate,
        isPast: true,
        isToday: false,
        statusText: `Concluded (${daysAgo}d ago)`,
        badgeColor: '#64748B',
      }
    }
  } catch (err) {
    return {
      daysRemaining: null,
      formattedDate: 'Unscheduled',
      isPast: false,
      isToday: false,
      statusText: 'Exam Date Unscheduled',
      badgeColor: '#64748B',
    }
  }
}
