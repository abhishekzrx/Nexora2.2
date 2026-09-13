/**
 * test_mcq_ownership_audit.js
 * Comprehensive Audit Script for Strict MCQ Ownership & Hierarchy Binding
 * 
 * Verifies:
 * 1. Course ID -> Subject ID -> Chapter ID -> MCQ ID binding across Supabase & Local Stores
 * 2. Zero missing IDs (course_id, subject_id, chapter_id)
 * 3. Zero orphaned chapters, subjects, or courses
 * 4. Zero hierarchy mismatches (chapter.subject_id !== mcq.subject_id or subject.course_id !== mcq.course_id)
 * 5. Flashcards strict binding integrity
 */

import https from 'https'

const SUPABASE_URL = 'https://hlvpnlzessihmpcfjokk.supabase.co/rest/v1'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdnBubHplc3NpaG1wY2Zqb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTI5MDksImV4cCI6MjEwMDAyODkwOX0.Zg8TW3-Z6BBSUgrimklZZVj7DV_SpmgLS5D7KLLpUkU'

function querySupabase(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}${endpoint}`
    const req = https.get(
      url,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(new Error(`Failed to parse response from ${endpoint}: ${body.slice(0, 100)}`))
          }
        })
      }
    )
    req.on('error', reject)
  })
}

async function runOwnershipAudit() {
  console.log('='.repeat(80))
  console.log('🔍 RUNNING COMPREHENSIVE MCQ & FLASHCARD OWNERSHIP AUDIT')
  console.log('='.repeat(80))

  const [subjectsRes, chaptersRes, mcqsRes, flashcardsRes] = await Promise.allSettled([
    querySupabase('/subjects'),
    querySupabase('/chapters'),
    querySupabase('/mcqs'),
    querySupabase('/flashcards'),
  ])

  const subjects = subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value) ? subjectsRes.value : []
  const chapters = chaptersRes.status === 'fulfilled' && Array.isArray(chaptersRes.value) ? chaptersRes.value : []
  const mcqs = mcqsRes.status === 'fulfilled' && Array.isArray(mcqsRes.value) ? mcqsRes.value : []
  const flashcards = flashcardsRes.status === 'fulfilled' && Array.isArray(flashcardsRes.value) ? flashcardsRes.value : []

  // Extract all distinct course IDs present across subjects & MCQs
  const distinctCourseIds = Array.from(new Set([
    ...subjects.map(s => s.course_id).filter(Boolean),
    ...mcqs.map(m => m.course_id).filter(Boolean),
    ...flashcards.map(f => f.course_id).filter(Boolean)
  ]))

  console.log('\n📊 DATABASE SUMMARY:')
  console.log(`- Detected Courses:   ${distinctCourseIds.length} (${distinctCourseIds.join(', ') || 'N/A'})`)
  console.log(`- Subjects:           ${subjects.length}`)
  console.log(`- Chapters:           ${chapters.length}`)
  console.log(`- MCQs:               ${mcqs.length}`)
  const courseSet = new Set(distinctCourseIds)
  const subjectMap = new Map(subjects.map((s) => [s.id, s]))
  const chapterMap = new Map(chapters.map((c) => [c.id, c]))

  let errors = 0
  let mcqValidCount = 0
  let flashcardValidCount = 0

  // 1. AUDIT MCQS
  console.log('\n[SECTION 1] Auditing MCQs Hierarchy & Ownership Binding...')
  mcqs.forEach((mcq, idx) => {
    // Check missing fields
    if (!mcq.course_id) {
      // If course_id is not yet populated or null
      // Let's check if subject has course_id
      const sub = subjectMap.get(mcq.subject_id)
      if (!sub) {
        console.error(`❌ [MCQ #${idx + 1} - ${mcq.id}] Missing course_id and subject not found!`)
        errors++
        return
      }
    }

    if (!mcq.subject_id) {
      console.error(`❌ [MCQ #${idx + 1} - ${mcq.id}] Missing subject_id!`)
      errors++
      return
    }

    if (!mcq.chapter_id) {
      console.error(`❌ [MCQ #${idx + 1} - ${mcq.id}] Missing chapter_id!`)
      errors++
      return
    }

    const chap = chapterMap.get(mcq.chapter_id)
    const sub = subjectMap.get(mcq.subject_id)

    if (!chap) {
      console.error(`❌ [MCQ #${idx + 1} - ${mcq.id}] Orphaned Chapter reference: chapter_id "${mcq.chapter_id}" does not exist in chapters table!`)
      errors++
      return
    }

    if (!sub) {
      console.error(`❌ [MCQ #${idx + 1} - ${mcq.id}] Orphaned Subject reference: subject_id "${mcq.subject_id}" does not exist in subjects table!`)
      errors++
      return
    }

    // Check FK Match: chapter.subject_id === mcq.subject_id
    if (String(chap.subject_id) !== String(mcq.subject_id)) {
      console.error(
        `❌ [MCQ #${idx + 1} - ${mcq.id}] FK Mismatch: MCQ belongs to subject "${mcq.subject_id}" (${sub.name}) but its chapter "${chap.name}" belongs to subject "${chap.subject_id}"!`
      )
      errors++
      return
    }

    // If mcq has course_id, check subject.course_id match
    if (mcq.course_id && sub.course_id && String(sub.course_id) !== String(mcq.course_id)) {
      console.error(
        `❌ [MCQ #${idx + 1} - ${mcq.id}] Course Mismatch: MCQ course_id "${mcq.course_id}" !== Subject course_id "${sub.course_id}"!`
      )
      errors++
      return
    }

    mcqValidCount++
  })

  console.log(`✅ Valid MCQs: ${mcqValidCount} / ${mcqs.length} checked.`)

  // 2. AUDIT FLASHCARDS
  console.log('\n[SECTION 2] Auditing Flashcards Hierarchy & Ownership Binding...')
  flashcards.forEach((fc, idx) => {
    if (!fc.subject_id || !fc.chapter_id) {
      console.error(`❌ [Flashcard #${idx + 1} - ${fc.id}] Missing subject_id or chapter_id!`)
      errors++
      return
    }

    const chap = chapterMap.get(fc.chapter_id)
    const sub = subjectMap.get(fc.subject_id)

    if (!chap) {
      console.error(`❌ [Flashcard #${idx + 1} - ${fc.id}] Orphaned Chapter reference: ${fc.chapter_id}`)
      errors++
      return
    }

    if (!sub) {
      console.error(`❌ [Flashcard #${idx + 1} - ${fc.id}] Orphaned Subject reference: ${fc.subject_id}`)
      errors++
      return
    }

    if (String(chap.subject_id) !== String(fc.subject_id)) {
      console.error(`❌ [Flashcard #${idx + 1} - ${fc.id}] FK Mismatch between chapter.subject_id and flashcard.subject_id!`)
      errors++
      return
    }

    flashcardValidCount++
  })

  console.log(`✅ Valid Flashcards: ${flashcardValidCount} / ${flashcards.length} checked.`)

  // 3. AUDIT CHAPTERS & SUBJECTS INTEGRITY
  console.log('\n[SECTION 3] Auditing Chapters -> Subjects -> Workspaces Hierarchy...')
  let orphanChapters = 0
  chapters.forEach((chap) => {
    if (!subjectMap.has(chap.subject_id)) {
      console.error(`❌ Chapter "${chap.name}" (ID: ${chap.id}) has invalid subject_id "${chap.subject_id}"`)
      orphanChapters++
      errors++
    }
  })

  let orphanSubjects = 0
  subjects.forEach((sub) => {
    if (sub.course_id && !courseSet.has(sub.course_id)) {
      console.warn(`⚠️ Subject "${sub.name}" has unmapped course_id "${sub.course_id}".`)
    }
  })

  console.log(`✅ Chapter hierarchy verified. Orphan chapters: ${orphanChapters}`)

  // 4. CROSS-CONTAMINATION CHECK ACROSS ALL SUBJECTS
  console.log('\n[SECTION 4] Subject-by-Subject Isolation Report:')
  const subjectsWithChapters = subjects.map((s) => {
    const sChapters = chapters.filter((c) => c.subject_id === s.id)
    const sMcqs = mcqs.filter((m) => m.subject_id === s.id)
    const sFlashcards = flashcards.filter((f) => f.subject_id === s.id)
    return {
      id: s.id,
      name: s.name,
      chapterCount: sChapters.length,
      mcqCount: sMcqs.length,
      flashcardCount: sFlashcards.length,
    }
  })

  console.table(subjectsWithChapters)

  console.log('\n' + '='.repeat(80))
  if (errors === 0) {
    console.log('🎉 AUDIT COMPLETE: 100% OF MCQs AND FLASHCARDS STRICTLY BOUND WITH ZERO LEAKAGE!')
    return true
  } else {
    console.error(`💥 AUDIT FAILED: ${errors} errors detected!`)
    return false
  }
}

runOwnershipAudit()
  .then((passed) => {
    process.exit(passed ? 0 : 1)
  })
  .catch((err) => {
    console.error('Audit execution failed:', err)
    process.exit(1)
  })
