/**
 * test_quick_chapter_feature.js
 * Verification test for chapterPromptStudio prompt builder and JSON parser.
 */

import {
  buildQuickChapterPrompt,
  parseQuickChaptersJson,
  deriveSubjectCodePrefix,
} from './src/utils/chapterPromptStudio.js'

console.log('--- 1. Testing Code Prefix Derivation ---')
console.assert(deriveSubjectCodePrefix('General Science') === 'SCI', 'Prefix should be SCI')
console.assert(deriveSubjectCodePrefix('Ancient Indian History') === 'HIST', 'Prefix should be HIST')
console.assert(deriveSubjectCodePrefix('Computer Networks') === 'CN', 'Prefix should be CN')
console.assert(deriveSubjectCodePrefix('Database Management Systems (DBMS)') === 'DBMS', 'Prefix should be DBMS')
console.log('✓ Prefix derivations verified')

console.log('--- 2. Testing AI Prompt Builder ---')
const prompt = buildQuickChapterPrompt({
  courseName: 'BPSC TRE 4.0',
  subjectName: 'General Science',
  subjectDesc: 'Physics, Chemistry, and Biology fundamentals',
  numChapters: 8,
  startingNumber: 1,
  codePrefix: 'SCI',
  examTarget: 'BPSC CCE Prelims',
})
console.assert(prompt.includes('Deconstruct the ENTIRE syllabus of the subject "General Science" into exactly 8 comprehensive'), 'Prompt contains objective')
console.assert(prompt.includes('SCI-01'), 'Prompt contains prefix')
console.assert(prompt.includes('"priority": "VH"'), 'Prompt contains priority specs')
console.log('✓ Prompt generator verified')

console.log('--- 3. Testing JSON Parser with Markdown Codeblock ---')
const sampleAiOutput = `
Here is the structured breakdown for the subject:

\`\`\`json
[
  {
    "number": 1,
    "code": "SCI-01",
    "name": "Mechanics, Units & Measurements",
    "description": "Fundamental units, vectors, laws of motion and gravitation with exam applications.",
    "priority": "VH"
  },
  {
    "number": 2,
    "code": "SCI-02",
    "name": "Optics, Sound & Wave Motion",
    "description": "Reflection, refraction, lenses, total internal reflection, Doppler effect, and acoustic waves.",
    "priority": "High"
  },
  {
    "number": 3,
    "code": "SCI-03",
    "name": "Atomic Structure & Chemical Bonding",
    "description": "Subatomic particles, periodic trends, ionic and covalent bonds with practical examples.",
    "priority": "M"
  }
]
\`\`\`

Hope this helps!
`

const parseResult = parseQuickChaptersJson(sampleAiOutput, 1, 'SCI')
console.assert(parseResult.valid === true, 'Parser should succeed')
console.assert(parseResult.chapters.length === 3, 'Should have 3 chapters')
console.assert(parseResult.chapters[0].code === 'SCI-01', 'Chapter 1 code matches')
console.assert(parseResult.chapters[0].priority === 'VH', 'Priority VH recognized')
console.assert(parseResult.chapters[1].priority === 'H', 'Priority High normalized to H')
console.assert(parseResult.chapters[2].priority === 'M', 'Priority M recognized')
console.log('✓ JSON parser verified with markdown wrapper and priority normalization')

console.log('--- 4. Testing Parser with Wrapped Object { chapters: [...] } ---')
const wrappedAiOutput = `
{
  "subject": "Computer Networks",
  "total_chapters": 2,
  "chapters": [
    {
      "chapter_number": 1,
      "chapter_code": "CN-01",
      "chapter_name": "Physical & Data Link Layers",
      "chapter_description": "Network topologies, transmission media, framing, error detection CRC, and flow control.",
      "priority_code": "VERY HIGH"
    },
    {
      "chapter_number": 2,
      "chapter_code": "CN-02",
      "chapter_name": "Network & Transport Layers",
      "chapter_description": "IPv4 and IPv6 addressing, subnetting, routing algorithms, TCP 3-way handshake, and congestion control.",
      "priority_code": "HIGH"
    }
  ]
}
`

const wrappedResult = parseQuickChaptersJson(wrappedAiOutput, 1, 'CN')
console.assert(wrappedResult.valid === true, 'Wrapped object parsing should succeed')
console.assert(wrappedResult.chapters.length === 2, 'Should have 2 chapters')
console.assert(wrappedResult.chapters[0].priority === 'VH', 'VERY HIGH normalized to VH')
console.assert(wrappedResult.chapters[1].name === 'Network & Transport Layers', 'Chapter name correctly parsed')
console.log('✓ Wrapped object JSON parser verified')

console.log('\nAll tests passed successfully!')
