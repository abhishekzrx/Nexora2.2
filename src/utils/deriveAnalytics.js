/**
 * deriveAnalytics
 * Derives analytics metrics from a subject's mock data.
 * This keeps the page component clean and data-driven.
 */

const clamp = (value) => Math.max(0, Math.min(100, value))

export function deriveAnalytics(subject) {
  const avg = Math.round(
    subject.chapters.reduce((sum, ch) => sum + ch.progress, 0) / subject.chapters.length,
  )
  const focus = subject.chapters.filter((ch) => ch.progress < 60).slice(0, 3)

  return {
    metrics: [
      { value: `${avg}%`, label: 'Accuracy', subtitle: 'Last 30 days' },
      { value: String(Math.max(1, subject.chapters.filter((ch) => ch.progress >= 80).length * 8)), label: 'Topics Mastered', subtitle: `Out of ${subject.chapters.length * 8}` },
      { value: String(7 + Math.round(subject.progress / 15)), label: 'Day Streak', subtitle: 'Days active' },
      { value: `${Math.max(8, Math.round(subject.progress / 4))}h`, label: 'Total Study Time', subtitle: 'This month' },
    ],
    trend: [avg - 10, avg - 4, avg, avg + 4, avg + 8, avg + 5, avg + 3].map(clamp),
    breakdown: subject.chapters.slice(0, 5).map((ch) => ({
      label: ch.title,
      meta: ch.meta.replace(' •', ''),
      value: ch.pct,
      width: ch.progress,
    })),
    focus: focus.length
      ? focus.map((ch) => ({ label: ch.title, value: `${ch.progress}%` }))
      : [{ label: 'Stay consistent', value: '60%' }],
    study: [
      { value: String(subject.counts.mcqs - 50), label: 'Questions Answered' },
      { value: `${Math.max(1, Math.round(subject.progress / 10))}h 15m`, label: 'Avg. Daily Study' },
      { value: String(Math.max(1, Math.round(subject.progress / 12))), label: 'Tests Completed' },
      { value: `${(1 + subject.progress / 100).toFixed(1)}x`, label: 'Improvement Rate' },
    ],
    timeSpent: [
      { name: 'MCQs', width: 65, hours: `${(subject.progress / 10).toFixed(1)}h` },
      { name: 'Notes', width: 45, hours: `${(subject.progress / 14).toFixed(1)}h` },
      { name: 'Flash', width: 35, hours: `${(subject.progress / 18).toFixed(1)}h` },
    ],
    achievements: [
      { icon: 'star', name: subject.badge },
      { icon: 'streak', name: '7-Day Streak' },
      { icon: 'hundred', name: 'Perfect Chapter' },
      { icon: 'rocket', name: 'Fast Learner' },
      { icon: 'target', name: '50 Questions' },
    ],
    mcqMetrics: [
      { value: String(subject.counts.mcqs - 80), label: 'Attempted', subtitle: 'Total MCQs' },
      { value: `${avg}%`, label: 'Correct', subtitle: 'Last 30 days' },
      { value: `${100 - avg}%`, label: 'Wrong', subtitle: 'Needs revision' },
      { value: String(Math.max(6, Math.round(subject.progress / 6))), label: 'Pending', subtitle: 'New questions' },
    ],
    flashMetrics: [
      { value: String(subject.counts.flashcards), label: 'Total Cards', subtitle: 'In the deck' },
      { value: String(Math.max(1, Math.round(subject.counts.flashcards / 2))), label: 'Due Today', subtitle: 'Review queue' },
      { value: String(Math.max(1, Math.round(subject.counts.flashcards * 0.7))), label: 'Reviewed', subtitle: 'This week' },
      { value: String(Math.max(1, Math.round(subject.counts.flashcards * 0.25))), label: 'Mastered', subtitle: 'Fully retained' },
    ],
    notesMetrics: [
      { value: String(Math.max(6, Math.round(subject.counts.chapters / 2))), label: 'Pinned Notes', subtitle: 'Quick access' },
      { value: String(subject.counts.chapters + 8), label: 'Total Notes', subtitle: 'Saved sessions' },
      { value: String(Math.max(3, Math.round(subject.progress / 12))), label: 'Updated', subtitle: 'This week' },
      { value: String(Math.max(1, Math.round(subject.progress / 30))), label: 'Shared', subtitle: 'Study group' },
    ],
    mcqList: subject.chapters.slice(0, 4).map((ch, i) => ({
      label: `${ch.title} set`,
      meta: `${18 - i} questions`,
      value: `${clamp(ch.progress + 4)}%`,
      width: clamp(ch.progress + 4),
    })),
    flashList: subject.chapters.slice(0, 4).map((ch, i) => ({
      label: ch.title,
      meta: `${12 + i} cards`,
      value: `${clamp(ch.progress)}%`,
      width: ch.progress,
    })),
    notesList: subject.chapters.slice(0, 4).map((ch, i) => ({
      label: `${ch.title} Notes`,
      meta: `Updated ${i + 1}h ago`,
      value: ['Pinned', 'Fresh', 'Shared', 'Saved'][i],
      width: clamp(90 - i * 10),
    })),
  }
}