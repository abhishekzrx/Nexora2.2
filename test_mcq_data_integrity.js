/**
 * test_mcq_data_integrity.js
 * Automated Diagnostic & Acceptance Test for MCQ Hierarchy and Isolation
 *
 * Enforces: COURSE -> SUBJECT -> CHAPTER -> MCQ
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
            reject(new Error(`Failed to parse response: ${body.slice(0, 100)}`))
          }
        })
      }
    )
    req.on('error', reject)
  })
}

async function runIntegrityAudit() {
  console.log('='.repeat(70))
  console.log('🔍 RUNNING MCQ DATA INTEGRITY & ISOLATION AUDIT')
  console.log('='.repeat(70))

  const [courses, subjects, chapters, mcqs] = await Promise.all([
    querySupabase('/workspaces'),
    querySupabase('/subjects'),
    querySupabase('/chapters'),
    querySupabase('/mcqs'),
  ])

  console.log(`\n📊 DATABASE SUMMARY:`)
  console.log(`- Courses / Workspaces: ${courses.length}`)
  console.log(`- Subjects:             ${subjects.length}`)
  console.log(`- Chapters:             ${chapters.length}`)
  console.log(`- Total MCQs:           ${mcqs.length}`)

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))
  const chapterMap = new Map(chapters.map((c) => [c.id, c]))

  let errors = 0
  let validCount = 0

  // 1. Audit every MCQ's hierarchy
  console.log(`\n[STEP 1] Validating MCQ -> Chapter -> Subject Hierarchy...`)
  mcqs.forEach((mcq) => {
    const chap = chapterMap.get(mcq.chapter_id)
    const sub = subjectMap.get(mcq.subject_id)

    if (!chap) {
      console.error(`❌ Orphan MCQ: ID ${mcq.id} has invalid chapter_id ${mcq.chapter_id}`)
      errors++
      return
    }

    if (!sub) {
      console.error(`❌ Orphan MCQ: ID ${mcq.id} has invalid subject_id ${mcq.subject_id}`)
      errors++
      return
    }

    if (String(chap.subject_id) !== String(mcq.subject_id)) {
      console.error(
        `❌ FK Mismatch: MCQ ${mcq.id} has subject_id "${mcq.subject_id}" (${sub.name}) but its chapter "${chap.name}" belongs to subject_id "${chap.subject_id}"!`
      )
      errors++
      return
    }

    validCount++
  })

  if (errors === 0) {
    console.log(`✅ PASSED: 100% of ${validCount} MCQs in Supabase have valid FK relationships!`)
  } else {
    console.error(`❌ FAILED: Found ${errors} corrupted MCQ records in Supabase!`)
  }

  // 2. Audit Chapter-by-Chapter distribution
  console.log(`\n[STEP 2] Auditing Chapter Isolation & Distribution:`)
  const subjectGroups = {}
  subjects.forEach((s) => {
    subjectGroups[s.id] = {
      name: s.name,
      chapters: chapters.filter((c) => c.subject_id === s.id),
      mcqCount: 0,
    }
  })

  mcqs.forEach((m) => {
    if (subjectGroups[m.subject_id]) {
      subjectGroups[m.subject_id].mcqCount++
    }
  })

  Object.values(subjectGroups).forEach((sg) => {
    console.log(`\n  📚 Subject: "${sg.name}" (Total MCQs: ${sg.mcqCount}, Chapters: ${sg.chapters.length})`)
    sg.chapters.forEach((c) => {
      const cMcqs = mcqs.filter((m) => m.chapter_id === c.id)
      const foreignMcqs = cMcqs.filter((m) => m.subject_id !== c.subject_id)
      if (foreignMcqs.length > 0) {
        console.error(`    ❌ Chapter "${c.name}": contains ${foreignMcqs.length} foreign MCQs!`)
        errors++
      } else {
        console.log(`    ✓ Chapter [${c.number}] "${c.name}": ${cMcqs.length} MCQs (0 cross-subject contamination)`)
      }
    })
  })

  // 3. Acceptance Test (Requirement 16) Verification
  console.log(`\n[STEP 3] Running Requirement 16 Acceptance Verification...`)
  // Check COA vs Computer Networks isolation
  const coaSubject = subjects.find((s) => s.name.toLowerCase().includes('computer organization') || s.name.toLowerCase().includes('coa'))
  const netSubject = subjects.find((s) => s.name.toLowerCase().includes('computer network'))

  if (netSubject && coaSubject) {
    const netChapterIds = new Set(chapters.filter((c) => c.subject_id === netSubject.id).map((c) => c.id))
    const coaChapterIds = new Set(chapters.filter((c) => c.subject_id === coaSubject.id).map((c) => c.id))

    const leakedToNet = mcqs.filter((m) => netChapterIds.has(m.chapter_id) && m.subject_id === coaSubject.id)
    const leakedToCoa = mcqs.filter((m) => coaChapterIds.has(m.chapter_id) && m.subject_id === netSubject.id)

    if (leakedToNet.length === 0 && leakedToCoa.length === 0) {
      console.log(`✅ ACCEPTANCE TEST PASSED: Zero cross-leakage between Computer Networks and COA.`)
    } else {
      console.error(`❌ ACCEPTANCE TEST FAILED: Leaked ${leakedToNet.length} COA MCQs into Net, ${leakedToCoa.length} Net MCQs into COA.`)
      errors++
    }
  }

  console.log('\n' + '='.repeat(70))
  if (errors === 0) {
    console.log('🎉 AUDIT COMPLETE: ALL CHECKS PASSED WITH 100% DATA INTEGRITY!')
    process.exit(0)
  } else {
    console.error(`💥 AUDIT FAILED WITH ${errors} ERRORS!`)
    process.exit(1)
  }
}

runIntegrityAudit().catch((err) => {
  console.error('Audit crashed:', err)
  process.exit(1)
})
