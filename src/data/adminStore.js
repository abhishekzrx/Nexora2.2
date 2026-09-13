/**
 * adminStore
 * Mutable in-memory cache for the Admin Content Management System.
 * Supabase is the authoritative source; local state is refreshed from
 * successful DB responses so the UI stays in sync without a reload.
 */
import { useSyncExternalStore } from 'react'
import { apiService } from '../services/apiService.js'
import {
  adminSubjects,
  allChapters,
  mcqRows,
  flashcardCards,
} from './adminData.js'
import { getActiveWorkspaceId, subscribe as subscribeWorkspace, getWorkspaces, updateWorkspaceMetadata } from './workspaceStore.js'
import { subjectService } from '../services/subjectService.js'
import { chapterService } from '../services/chapterService.js'
import { mcqService } from '../services/mcqService.js'
import { noteService, getLocalNotes } from '../services/noteService.js'
import { BPSC_PRELIMS_SUBJECTS, BPSC_PRELIMS_COURSE_ID } from './bpscPrelimsSeed.js'
import { BPSC_PRELIMS_CHAPTERS } from './bpscPrelimsChapters.js'

let listeners = []
let version = 0

const DEFAULT_COURSE_ID = 'bpsc-tre-4'

function getSeedSubjects() {
  const bpscPrelimsSeedSubs = BPSC_PRELIMS_SUBJECTS.map((s) => ({
    id: `s-bpsc-prelims-${s.order}`,
    courseId: BPSC_PRELIMS_COURSE_ID,
    name: s.name,
    icon: s.icon,
    desc: s.desc,
    status: 'active',
    locked: false,
    color: s.color,
    order: s.order,
    weightage: s.weightage,
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  }))

  return [
    ...adminSubjects.map((s) => ({
      ...s,
      courseId: DEFAULT_COURSE_ID,
      status: 'active',
      locked: false,
      color: '#F1621B',
      order: adminSubjects.findIndex((x) => x.id === s.id) + 1,
      stats: s.stats.map((st) => ({ ...st })),
    })),
    ...bpscPrelimsSeedSubs,
    {
      id: 's-cbse12-1',
      courseId: 'cbse-12-cs',
      name: 'Python Programming',
      icon: 'dataStructures',
      desc: 'Advanced Python functions, data structures, and file handling.',
      status: 'active',
      locked: false,
      color: '#2E5CE6',
      order: 1,
      stats: [{ value: '4', label: 'Chapters' }, { value: '50', label: 'MCQs' }, { value: '30', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-cbse12-2',
      courseId: 'cbse-12-cs',
      name: 'Database Querying (SQL)',
      icon: 'dbms',
      desc: 'Relational database management, DDL, DML, and SQL queries.',
      status: 'active',
      locked: false,
      color: '#2E5CE6',
      order: 2,
      stats: [{ value: '3', label: 'Chapters' }, { value: '40', label: 'MCQs' }, { value: '25', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-cbse11-1',
      courseId: 'cbse-11-ph',
      name: 'Kinematics & Laws of Motion',
      icon: 'physics',
      desc: 'Motion in a straight line, vectors, Newton laws, and friction.',
      status: 'active',
      locked: false,
      color: '#7C3AED',
      order: 1,
      stats: [{ value: '3', label: 'Chapters' }, { value: '30', label: 'MCQs' }, { value: '20', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
    {
      id: 's-ssc-1',
      courseId: 'ssc-cgl-computer',
      name: 'Computer Fundamentals',
      icon: 'computerNetworks',
      desc: 'Hardware components, operating system basics, and software.',
      status: 'active',
      locked: false,
      color: '#12B76A',
      order: 1,
      stats: [{ value: '2', label: 'Chapters' }, { value: '45', label: 'MCQs' }, { value: '25', label: 'Flashcards' }, { value: 'Active', label: 'Status' }],
    },
  ]
}

function getSeedChapters() {
  const bpscPrelimsSeedChapters = BPSC_PRELIMS_CHAPTERS.map((c) => ({
    id: `c-bpsc-prelims-${c.code.toLowerCase()}`,
    courseId: BPSC_PRELIMS_COURSE_ID,
    subject: c.subject,
    name: c.title,
    number: c.number,
    code: c.code,
    priority: c.priority,
    priorityLabel: c.priorityLabel,
    desc: c.description,
    status: 'active',
    locked: false,
    mcqs: 0,
    flashcards: 0,
    notes: 0,
  }))

  return [
    ...allChapters.map((c, i) => ({
      ...c,
      courseId: DEFAULT_COURSE_ID,
      status: 'active',
      locked: false,
      number: i + 1,
    })),
    ...bpscPrelimsSeedChapters,
    { id: 'c-cbse12-1', courseId: 'cbse-12-cs', subject: 'Python Programming', name: 'Functions & Recursion', number: 1, status: 'active', mcqs: 15, flashcards: 10, notes: 1 },
    { id: 'c-cbse12-2', courseId: 'cbse-12-cs', subject: 'Database Querying (SQL)', name: 'SQL Joins & Grouping', number: 1, status: 'active', mcqs: 20, flashcards: 12, notes: 1 },
    { id: 'c-cbse11-1', courseId: 'cbse-11-ph', subject: 'Kinematics & Laws of Motion', name: 'Vectors & Projectile Motion', number: 1, status: 'active', mcqs: 15, flashcards: 10, notes: 1 },
    { id: 'c-ssc-1', courseId: 'ssc-cgl-computer', subject: 'Computer Fundamentals', name: 'Hardware & Input Devices', number: 1, status: 'active', mcqs: 25, flashcards: 15, notes: 1 },
  ]
}

function getSeedMcqs() {
  return mcqRows.map((m) => ({ ...m, courseId: DEFAULT_COURSE_ID }))
}

function getSeedFlashcards() {
  return flashcardCards.map((f) => ({ ...f, courseId: DEFAULT_COURSE_ID }))
}

export function getSeedNotes() {
  return [
    {
      id: 'seed-note-cn-1',
      courseId: DEFAULT_COURSE_ID,
      subjectId: 'cn',
      subject: 'Computer Networks',
      chapterId: 'cn-1',
      chapterName: 'Introduction to Networks',
      title: 'Computer Networks Overview & OSI Reference Architecture',
      content: `# 🌐 Computer Networks Overview & OSI Reference Architecture

## 1. Executive Summary & Core Definitions
A **Computer Network** is an interconnected collection of autonomous computing nodes capable of exchanging data and sharing resources via wired or wireless transmission media.

### Network Topologies:
* **Star Topology:** All nodes connect to a central hub/switch. Easy to troubleshoot, single point of failure at hub.
* **Mesh Topology:** Every device has a dedicated point-to-point link to every other device. High redundancy, expensive ($N(N-1)/2$ physical channels).
* **Bus Topology:** Single backbone cable with drop lines and terminators. Low cable cost, collisions likely on heavy traffic.
* **Ring Topology:** Unidirectional token passing along repeaters. Deterministic latency, broken ring halts transmission.

---

## 2. OSI 7-Layer Model vs. TCP/IP Architecture
| OSI Layer | Key Protocols | Protocol Data Unit (PDU) | Primary Hardware |
| :--- | :--- | :--- | :--- |
| **7. Application** | HTTP, HTTPS, DNS, SMTP, FTP | Data / Message | Gateway |
| **6. Presentation** | SSL/TLS, ASCII, JPEG, MPEG | Data | Gateway |
| **5. Session** | RPC, NetBIOS, PPTP | Data | Gateway |
| **4. Transport** | TCP (Connection-oriented), UDP (Connectionless) | Segment (TCP) / Datagram (UDP) | L4 Switch / Firewall |
| **3. Network** | IPv4, IPv6, ICMP, ARP, OSPF, BGP | Packet | Router / L3 Switch |
| **2. Data Link** | Ethernet (802.3), Wi-Fi (802.11), PPP | Frame | Switch / Bridge |
| **1. Physical** | RS-232, 100BASE-T, Manchester Encoding | Bits | Hub / Repeater / Cables |

---

## 3. High-Yield Transmission Modes
1. **Simplex:** Unidirectional communication only (e.g., Keyboard to CPU, Television broadcast).
2. **Half-Duplex:** Bidirectional, but only one party transmits at a time (e.g., Walkie-Talkie).
3. **Full-Duplex:** Simultaneous bidirectional transmission (e.g., Telephone network, Switched Ethernet).`,
      type: 'TEXT',
      status: 'published',
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'seed-note-cn-2',
      courseId: DEFAULT_COURSE_ID,
      subjectId: 'cn',
      subject: 'Computer Networks',
      chapterId: 'cn-2',
      chapterName: 'OSI Model',
      title: 'OSI 7 Layers Deep Dive & Data Encapsulation Notes',
      content: `# 📡 OSI 7 Layers Deep Dive & Data Encapsulation

## 1. Encapsulation & Decapsulation
As user data travels down the protocol stack at the sender side, each layer attaches its own protocol control information (header/trailer) — this is **Data Encapsulation**.
* **Application/Presentation/Session:** Raw user payload + headers = Data
* **Transport:** Adds Source Port & Destination Port = Segment
* **Network:** Adds Source IP & Destination IP = Packet
* **Data Link:** Adds Source MAC, Destination MAC & CRC Trailer = Frame
* **Physical:** Encodes frame into physical electrical/optical/radio signals = Bits

---

## 2. IP Addressing & Subnetting Cheat Sheet
* **IPv4 Address Space:** 32 bits (4 octets, $2^{32} \\approx 4.29$ billion addresses).
* **Class A:** 0.0.0.0 to 127.255.255.255 (Default Subnet: 255.0.0.0 /8)
* **Class B:** 128.0.0.0 to 191.255.255.255 (Default Subnet: 255.255.0.0 /16)
* **Class C:** 192.0.0.0 to 223.255.255.255 (Default Subnet: 255.255.255.0 /24)
* **Class D (Multicast):** 224.0.0.0 to 239.255.255.255
* **Class E (Experimental):** 240.0.0.0 to 255.255.255.255
* **Loopback Address:** 127.0.0.1 (Used for local host interface diagnostics).

> 💡 **Subnet Formula:** Total usable hosts per subnet = $2^{(32 - \\text{prefix})} - 2$ (subtracting Network ID and Broadcast Address).`,
      type: 'TEXT',
      status: 'published',
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z',
    },
    {
      id: 'seed-note-dbms-1',
      courseId: DEFAULT_COURSE_ID,
      subjectId: 's-dbms-sql-1',
      subject: 'Database Management Systems (DBMS) and SQL',
      chapterId: '1',
      chapterName: 'DBMS Architecture & Data Independence',
      title: 'DBMS Architecture, Three-Schema & ACID Properties Study Notes',
      content: `# 🗄️ DBMS Architecture & Data Independence Study Notes

## 1. Database Architecture & Three-Schema SPARC
A Database Management System (DBMS) separates user applications from the physical storage layer using a **three-level architecture**:

1. **External Level (User Views):**
   * Individual end-user views tailored to specific applications.
   * Hides irrelevant schema details from unauthorized users.
2. **Conceptual Level (Logical Community View):**
   * Describes *what* data is stored in the entire database and relationships between entities.
   * Enforces semantic integrity constraints, types, and security rules.
3. **Internal Level (Physical Storage Schema):**
   * Describes *how* data is stored on secondary hardware (blocks, pages, B+ trees, clustering).

### Data Independence:
* **Logical Data Independence:** Ability to modify conceptual schema without changing external views/programs. (Harder to achieve).
* **Physical Data Independence:** Ability to modify physical storage schemas without changing conceptual schema. (Easier to achieve).

---

## 2. Transaction Management & The ACID Contract
* **Atomicity (All-or-Nothing):** Entire transaction finishes or rolls back completely. Maintained by Recovery Manager.
* **Consistency:** Database moves from one valid consistent state to another, satisfying all integrity constraints.
* **Isolation:** Concurrent transactions execute as if running in isolation. Managed by Concurrency Control (2PL, Timestamping).
* **Durability:** Committed state survives system crashes. Maintained by WAL (Write-Ahead Logging).

---

## 3. Normalization Quick Reference
* **1NF:** Eliminate repeating groups; ensure all attributes are atomic.
* **2NF:** 1NF + Eliminate partial functional dependencies (non-prime attributes must depend on full candidate key).
* **3NF:** 2NF + Eliminate transitive dependencies ($X \\to Y$ where $Y$ is non-prime $\\implies X$ is superkey).
* **BCNF:** For every non-trivial $X \\to Y$, $X$ must be a strict superkey.`,
      type: 'TEXT',
      status: 'published',
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-17T10:00:00.000Z',
    },
    {
      id: 'seed-note-py-1',
      courseId: 'cbse-12-cs',
      subjectId: 's-cbse12-1',
      subject: 'Python Programming',
      chapterId: 'c-cbse12-1',
      chapterName: 'Functions & Recursion',
      title: 'Python Functions, Scope & Recursion Revision Notes',
      content: `# 🐍 Python Functions & Scope Revision Notes

## 1. Function Arguments & Syntax
* **Positional Arguments:** Passed in exact order defined in function signature.
* **Default Arguments:** Default values specified in signature (\`def greet(name, msg="Hello")\`). Default arguments must follow non-default arguments.
* **Keyword Arguments:** Arguments passed by name (\`greet(msg="Hi", name="Alice")\`).
* **Variable-length Positional (\`*args\`):** Bundled into a **tuple**.
* **Variable-length Keyword (\`**kwargs\`):** Bundled into a **dictionary**.

---

## 2. LEGB Scope Rule
Python resolves variable identifiers in the following precedence:
1. **Local (L):** Names defined inside the active function body.
2. **Enclosing (E):** Names defined in outer/enclosing nested functions.
3. **Global (G):** Names defined at the module top level or marked with \`global\`.
4. **Built-in (B):** Predefined built-in names (e.g. \`print\`, \`len\`, \`range\`).`,
      type: 'TEXT',
      status: 'published',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    },
    {
      id: 'seed-note-ph-1',
      courseId: 'cbse-11-ph',
      subjectId: 's-cbse11-1',
      subject: 'Kinematics & Laws of Motion',
      chapterId: 'c-cbse11-1',
      chapterName: 'Vectors & Projectile Motion',
      title: 'Vectors, Equations of Motion & Projectile Motion Notes',
      content: `# ⚡ Vectors & Kinematics Study Notes

## 1. Kinematic Equations (Constant Acceleration)
* $v = u + at$
* $s = ut + \\frac{1}{2}at^2$
* $v^2 = u^2 + 2as$
* $s_n = u + \\frac{a}{2}(2n - 1)$ (Distance traveled in $n^{\\text{th}}$ second)

---

## 2. Projectile Motion (Launched at angle $\\theta$ with speed $u$)
* **Time of Flight ($T$):** $T = \\frac{2u \\sin\\theta}{g}$
* **Maximum Height ($H$):** $H = \\frac{u^2 \\sin^2\\theta}{2g}$
* **Horizontal Range ($R$):** $R = \\frac{u^2 \\sin(2\\theta)}{g}$
* **Maximum Range condition:** $\\theta = 45^\\circ \\implies R_{\\max} = \\frac{u^2}{g}$`,
      type: 'TEXT',
      status: 'published',
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    },
  ]
}

function getInitialNotes() {
  const seeds = getSeedNotes()
  const localList = typeof getLocalNotes === 'function' ? getLocalNotes() : []
  const map = new Map()
  seeds.forEach((n) => map.set(String(n.id), n))
  localList.forEach((n) => map.set(String(n.id), n))
  return Array.from(map.values())
}

// ── State ──────────────────────────────────────────────────────
let subjects = getSeedSubjects()
let chapters = getSeedChapters()
let mcqs = getSeedMcqs()
let flashcards = getSeedFlashcards()
let notes = getInitialNotes()

let snapshot = {
  allSubjects: subjects,
  allChapters: chapters,
  allMcqs: mcqs,
  allFlashcards: flashcards,
  allNotes: notes,
  subjects: [],
  chapters: [],
  mcqs: [],
  flashcards: [],
  notes: notes,
  activeCourseId: null,
}

let hydrationPromise = null

export async function hydrateAdminStoreFromSupabase() {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const [subjectsRes, chaptersRes, mcqsRes, flashcardsRes, notesRes] = await Promise.all([
        apiService.get('/subjects?limit=5000'),
        apiService.get('/chapters?limit=5000'),
        apiService.get('/mcqs?limit=5000'),
        apiService.get('/flashcards?limit=5000'),
        apiService.get('/notes?limit=5000').catch(() => ({ success: false })),
      ])

      if (subjectsRes.success && Array.isArray(subjectsRes.data)) {
        const mappedSubjects = subjectsRes.data.map((row) => ({
          ...row,
          id: row.id,
          courseId: row.course_id || row.courseId,
          course_id: row.course_id || row.courseId,
          name: row.name,
          icon: row.icon_type || 'chapters',
          desc: row.description || row.desc || '',
          color: row.color || '#F1621B',
          status: row.status || 'active',
          locked: false,
          order: Number(row.order) || 1,
          stats: [
            { value: '0', label: 'Chapters' },
            { value: '0', label: 'MCQs' },
            { value: '0', label: 'Flashcards' },
            { value: row.status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
          ],
        }))
        const remoteIds = new Set(mappedSubjects.map((s) => String(s.id)))
        const localOnly = subjects.filter((s) => !remoteIds.has(String(s.id)))
        subjects = [...mappedSubjects, ...localOnly]
      }

      if (chaptersRes.success && Array.isArray(chaptersRes.data)) {
        const mappedChapters = chaptersRes.data.map((c) => {
          const parentSub = subjects.find((s) => String(s.id) === String(c.subject_id))
          const resolvedCourseId = parentSub ? (parentSub.course_id || parentSub.courseId) : (c.course_id || c.courseId)
          return {
            ...c,
            id: c.id,
            courseId: resolvedCourseId,
            course_id: resolvedCourseId,
            subjectId: c.subject_id,
            subject_id: c.subject_id,
            subject: parentSub ? parentSub.name : (c.subject || c.subject_id),
            name: c.name,
            desc: c.description || c.desc || '',
            number: Number(c.number) || 1,
            code: c.chapter_code || c.code || '',
            priority: c.priority || 'M',
            status: c.status || 'active',
            mcqs: 0,
            flashcards: 0,
            notes: 0,
          }
        })
        const remoteIds = new Set(mappedChapters.map((c) => String(c.id)))
        const localOnly = chapters.filter((c) => !remoteIds.has(String(c.id)))
        chapters = [...mappedChapters, ...localOnly]
      }

      if (mcqsRes.success && Array.isArray(mcqsRes.data)) {
        const mappedMcqs = mcqsRes.data.map((m) => {
          const parentSub = subjects.find((s) => String(s.id) === String(m.subject_id))
          const resolvedCourseId = parentSub ? (parentSub.course_id || parentSub.courseId) : (m.course_id || m.courseId)
          const isBpsc = m.exam_profile === 'BPSC_PRELIMS' || (resolvedCourseId && String(resolvedCourseId).toLowerCase().includes('bpsc'))
          const optE = m.option_e || (isBpsc ? 'Not Attempted' : null)
          return {
            ...m,
            id: m.id,
            courseId: resolvedCourseId,
            course_id: resolvedCourseId,
            subject_id: m.subject_id,
            subjectId: m.subject_id,
            chapter_id: m.chapter_id,
            chapterId: m.chapter_id,
            subject: parentSub ? parentSub.name : (m.subject || m.subject_id),
            question: m.question,
            options: optE ? [m.option_a, m.option_b, m.option_c, m.option_d, optE] : [m.option_a, m.option_b, m.option_c, m.option_d],
            correct: m.correct_answer,
            correct_answer: m.correct_answer,
            correctAnswer: m.correct_answer,
            difficulty: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
            difficultyText: m.difficulty === 3 ? 'Hard' : m.difficulty === 1 ? 'Easy' : 'Medium',
            explanation: m.explanation || '',
            status: m.status || 'active',
          }
        })
        const remoteIds = new Set(mappedMcqs.map((m) => String(m.id)))
        const localOnly = mcqs.filter((m) => !remoteIds.has(String(m.id)))
        mcqs = [...mappedMcqs, ...localOnly]
      }

      if (flashcardsRes.success && Array.isArray(flashcardsRes.data)) {
        const mappedFlash = flashcardsRes.data.map((f) => {
          const parentSub = subjects.find((s) => String(s.id) === String(f.subject_id))
          const resolvedCourseId = parentSub ? (parentSub.course_id || parentSub.courseId) : (f.course_id || f.courseId)
          return {
            ...f,
            id: f.id,
            courseId: resolvedCourseId,
            course_id: resolvedCourseId,
            subject_id: f.subject_id,
            subjectId: f.subject_id,
            chapter_id: f.chapter_id,
            chapterId: f.chapter_id,
            subject: parentSub ? parentSub.name : (f.subject || f.subject_id),
            front: f.front,
            back: f.back,
            status: f.status || 'active',
          }
        })
        const remoteIds = new Set(mappedFlash.map((f) => String(f.id)))
        const localOnly = flashcards.filter((f) => !remoteIds.has(String(f.id)))
        flashcards = [...mappedFlash, ...localOnly]
      }

      if (notesRes.success && Array.isArray(notesRes.data) && notesRes.data.length > 0) {
        const map = new Map()
        getSeedNotes().forEach((n) => map.set(String(n.id), n))
        notesRes.data.forEach((n) => map.set(String(n.id), n))
        notes = Array.from(map.values())
      } else {
        notes = getInitialNotes()
      }

      recomputeAllSubjectStats()
      updateSnapshot()
      emit()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[adminStore] hydrateAdminStoreFromSupabase failed:', err)
      }
    } finally {
      hydrationPromise = null
    }
  })()
  return hydrationPromise
}

function updateSnapshot() {
  const activeCourseId = getActiveWorkspaceId()
  snapshot = {
    allSubjects: subjects,
    allChapters: chapters,
    allMcqs: mcqs,
    allFlashcards: flashcards,
    allNotes: notes,
    subjects: subjects.filter((s) => (s.courseId || s.course_id) === activeCourseId),
    chapters: chapters.filter((c) => (c.courseId || c.course_id) === activeCourseId),
    mcqs: mcqs.filter((m) => (m.courseId || m.course_id) === activeCourseId),
    flashcards: flashcards.filter((f) => (f.courseId || f.course_id) === activeCourseId),
    notes: notes.filter((n) => (n.courseId || n.course_id) === activeCourseId),
    activeCourseId,
    deleteMcqsByChapter: (chapterId) => deleteMcqsByChapter(chapterId),
    removeMcqsForChapterFromStore: (chapterId) => deleteMcqsByChapter(chapterId),
    removeMcqsFromStore: (ids) => removeMcqsFromStore(ids),
    updateMcqInStore: (mcq) => updateMcqInStore(mcq),
    injectMcqs: (records) => injectMcqs(records),
    injectFlashcards: (records) => injectFlashcards(records),
    injectMcqsIntoStore: (records) => injectMcqs(records),
    injectFlashcardsIntoStore: (records) => injectFlashcards(records),
  }
}

// Initialize snapshot
updateSnapshot()

// Auto-start background hydration
if (typeof window !== 'undefined') {
  hydrateAdminStoreFromSupabase().catch(() => {})
}

function emit() {
  updateSnapshot()
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getSnapshot() {
  return snapshot
}

let lastWorkspaces = [...getWorkspaces()]
let lastActiveCourseId = getActiveWorkspaceId()

subscribeWorkspace(() => {
  const currentWorkspaces = getWorkspaces()
  const currentIds = new Set(currentWorkspaces.map((w) => w.id))
  const deletedIds = lastWorkspaces.filter((w) => !currentIds.has(w.id)).map((w) => w.id)

  if (deletedIds.length > 0) {
    deletedIds.forEach((courseId) => {
      subjects = subjects.filter((s) => (s.courseId || s.course_id) !== courseId)
      chapters = chapters.filter((c) => (c.courseId || c.course_id) !== courseId)
      mcqs = mcqs.filter((m) => (m.courseId || m.course_id) !== courseId)
      flashcards = flashcards.filter((f) => (f.courseId || f.course_id) !== courseId)
    })
    recomputeAllSubjectStats()
  }

  const currentActiveCourseId = getActiveWorkspaceId()
  if (currentActiveCourseId !== lastActiveCourseId) {
    lastActiveCourseId = currentActiveCourseId
    if (currentActiveCourseId) {
      hydrationPromise = null
      hydrateAdminStoreFromSupabase()
    }
  }

  lastWorkspaces = [...currentWorkspaces]
  emit()
})

export function useAdminStore() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
useAdminStore.getState = getSnapshot
useAdminStore.setState = (partial) => {
  if (partial.allSubjects !== undefined) subjects = partial.allSubjects
  if (partial.allChapters !== undefined) chapters = partial.allChapters
  if (partial.allMcqs !== undefined) mcqs = partial.allMcqs
  if (partial.allFlashcards !== undefined) flashcards = partial.allFlashcards
  if (partial.allNotes !== undefined) notes = partial.allNotes
  if (partial.subjects !== undefined) subjects = partial.subjects
  if (partial.chapters !== undefined) chapters = partial.chapters
  if (partial.mcqs !== undefined) mcqs = partial.mcqs
  if (partial.flashcards !== undefined) flashcards = partial.flashcards
  if (partial.notes !== undefined) notes = partial.notes
  recomputeAllSubjectStats()
  emit()
}

// ── Helpers ───────────────────────────────────────────────────────
function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

export function matchContentToChapter(item, chapter) {
  if (!item || !chapter) return false

  const itemChapId = item.chapter_id || item.chapterId
  const chapId = chapter.id

  if (!itemChapId || !chapId || String(itemChapId) !== String(chapId)) {
    return false
  }

  const itemSubId = item.subject_id || item.subjectId
  const chapSubId = chapter.subject_id || chapter.subjectId
  if (itemSubId && chapSubId && String(itemSubId) !== String(chapSubId)) {
    return false
  }

  const itemCourseId = item.course_id || item.courseId
  const chapCourseId = chapter.course_id || chapter.courseId
  if (itemCourseId && chapCourseId && String(itemCourseId) !== String(chapCourseId)) {
    return false
  }

  return true
}

export function recomputeAllChapterStats() {
  chapters = chapters.map((ch) => {
    const matchingMcqs = mcqs.filter((m) => {
      const mCourseId = m.courseId || m.course_id
      const chCourseId = ch.courseId || ch.course_id
      if (mCourseId && chCourseId && String(mCourseId) !== String(chCourseId)) return false
      return matchContentToChapter(m, ch)
    })

    const matchingFlashcards = flashcards.filter((f) => {
      const fCourseId = f.courseId || f.course_id
      const chCourseId = ch.courseId || ch.course_id
      if (fCourseId && chCourseId && String(fCourseId) !== String(chCourseId)) return false
      return matchContentToChapter(f, ch)
    })

    const matchingNotes = notes.filter((n) => {
      const nCourseId = n.courseId || n.course_id
      const chCourseId = ch.courseId || ch.course_id
      if (nCourseId && chCourseId && String(nCourseId) !== String(chCourseId)) return false
      return (
        matchContentToChapter(n, ch) ||
        String(n.chapterId || n.chapter_id) === String(ch.id)
      )
    })

    const countMcqs = matchingMcqs.length
    const countFlashcards = matchingFlashcards.length
    const countNotes = matchingNotes.length

    return {
      ...ch,
      mcqs: countMcqs,
      totalMcqs: countMcqs,
      flashcards: countFlashcards,
      totalFlashcards: countFlashcards,
      notes: countNotes,
      totalNotes: countNotes,
    }
  })
}

function currentCourseId() {
  return getActiveWorkspaceId() || DEFAULT_COURSE_ID
}

export function recomputeSubjectStats(subject) {
  const subCourseId = subject.courseId || subject.course_id
  const subjectChapters = chapters.filter(
    (c) =>
      (!subCourseId || (c.courseId || c.course_id) === subCourseId) &&
      (c.subjectId === subject.id || c.subject_id === subject.id)
  )

  const subjectMcqs = mcqs.filter(
    (m) =>
      (!subCourseId || (m.courseId || m.course_id) === subCourseId) &&
      (m.subjectId === subject.id || m.subject_id === subject.id)
  )

  const subjectFlashcards = flashcards.filter(
    (f) =>
      (!subCourseId || (f.courseId || f.course_id) === subCourseId) &&
      (f.subjectId === subject.id || f.subject_id === subject.id)
  )

  const totalChapterMcqs = subjectChapters.reduce((sum, c) => sum + (c.mcqs || 0), 0)
  const finalMcqCount = subjectMcqs.length > 0 ? subjectMcqs.length : totalChapterMcqs

  subject.mcqs = finalMcqCount
  subject.totalMcqs = finalMcqCount
  subject.flashcards = subjectFlashcards.length
  subject.totalFlashcards = subjectFlashcards.length

  subject.stats = [
    { value: String(subjectChapters.length), label: 'Chapters' },
    { value: String(finalMcqCount), label: 'MCQs' },
    { value: String(subjectFlashcards.length), label: 'Flashcards' },
    { value: subject.status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
  ]
}

export function recomputeAllSubjectStats() {
  recomputeAllChapterStats()
  subjects.forEach(recomputeSubjectStats)
}

// ── Subject CRUD ──────────────────────────────────────────────────
export function addSubject({ name, icon, desc, color, status, courseId }) {
  const targetCourseId = courseId || currentCourseId()
  const courseSubjects = subjects.filter((s) => s.courseId === targetCourseId)
  const subject = {
    id: `s${nextId(subjects)}`,
    courseId: targetCourseId,
    name: name || 'New Subject',
    icon: icon || 'chapters',
    desc: desc || '',
    color: color || '#F1621B',
    status: status || 'active',
    locked: false,
    order: courseSubjects.length + 1,
    stats: [
      { value: '0', label: 'Chapters' },
      { value: '0', label: 'MCQs' },
      { value: '0', label: 'Flashcards' },
      { value: status === 'disabled' ? 'Disabled' : 'Active', label: 'Status' },
    ],
  }
  subjects = [...subjects, subject]
  updateWorkspaceMetadata(targetCourseId, 'subjects', subjects.filter((s) => s.courseId === targetCourseId).length)
  emit()
  return subject
}

export function seedDefaultSubjects(courseId) {
  const targetCourseId = courseId || currentCourseId()
  const templates = [
    { name: 'Physics', icon: 'chapters', desc: 'Mechanics, Electromagnetism, and Modern Physics', color: '#2E5CE6' },
    { name: 'Chemistry', icon: 'document', desc: 'Organic, Inorganic, and Physical Chemistry', color: '#12B76A' },
    { name: 'Mathematics', icon: 'analyticsTab', desc: 'Calculus, Algebra, Vector & 3D Geometry', color: '#7C3AED' },
    { name: 'Computer Science', icon: 'mcqs', desc: 'Python Programming, Data Structures, and Networking', color: '#F1621B' },
  ]
  templates.forEach((tmpl) => {
    if (!subjects.some((s) => s.courseId === targetCourseId && s.name.toLowerCase() === tmpl.name.toLowerCase())) {
      addSubject({ ...tmpl, status: 'active', courseId: targetCourseId })
    }
  })
}

export function updateSubject(id, { name, icon, desc, color, status }) {
  subjects = subjects.map((subject) => {
    if (subject.id !== id) return subject
    const updated = {
      ...subject,
      name: name || subject.name,
      icon: icon || subject.icon,
      desc: desc ?? subject.desc,
      color: color || subject.color,
      status: status || subject.status,
    }
    chapters = chapters.map((c) => (c.subject === subject.name && c.courseId === subject.courseId ? { ...c, subject: updated.name } : c))
    mcqs = mcqs.map((m) => (m.subject === subject.name && m.courseId === subject.courseId ? { ...m, subject: updated.name } : m))
    flashcards = flashcards.map((f) => (f.subject === subject.name && f.courseId === subject.courseId ? { ...f, subject: updated.name } : f))
    return updated
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteSubject(id) {
  const target = subjects.find((s) => s.id === id || s.name === id)
  let impacted = { name: '', chapters: 0, mcqs: 0, flashcards: 0 }
  if (target) {
    const isTargetChapter = (c) =>
      c.subjectId === target.id ||
      c.subject_id === target.id ||
      (c.subject && String(c.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const isTargetMcq = (m) =>
      m.subjectId === target.id ||
      m.subject_id === target.id ||
      (m.subject && String(m.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const isTargetFlashcard = (f) =>
      f.subjectId === target.id ||
      f.subject_id === target.id ||
      (f.subject && String(f.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

    const chapterCount = chapters.filter(isTargetChapter).length
    const mcqCount = mcqs.filter(isTargetMcq).length
    const flashcardCount = flashcards.filter(isTargetFlashcard).length
    impacted = { name: target.name, chapters: chapterCount, mcqs: mcqCount, flashcards: flashcardCount }

    chapters = chapters.filter((c) => !isTargetChapter(c))
    mcqs = mcqs.filter((m) => !isTargetMcq(m))
    flashcards = flashcards.filter((f) => !isTargetFlashcard(f))
  }
  subjects = subjects.filter((s) => s.id !== id && s.name !== id)
  if (target) {
    updateWorkspaceMetadata(target.courseId, 'subjects', subjects.filter((s) => s.courseId === target.courseId).length)
  }
  emit()
  return impacted
}

export function duplicateSubject(id) {
  const target = subjects.find((s) => s.id === id)
  if (!target) return
  const courseId = target.courseId
  const copy = {
    ...JSON.parse(JSON.stringify(target)),
    id: `s${nextId(subjects)}`,
    name: `${target.name} (Copy)`,
    status: 'active',
    locked: false,
    order: subjects.filter((s) => s.courseId === courseId).length + 1,
  }
  copy.stats = copy.stats.map((st) => ({ ...st }))
  subjects = [...subjects, copy]
  updateWorkspaceMetadata(courseId, 'subjects', subjects.filter((s) => s.courseId === courseId).length)
  emit()
  return copy
}

export function reorderSubjects(orderedIds) {
  subjects = subjects.map((s) => ({
    ...s,
    order: orderedIds.indexOf(s.id) + 1,
  }))
  emit()
}

export function setSubjectStatus(id, status) {
  subjects = subjects.map((s) => (s.id === id ? { ...s, status } : s))
  recomputeAllSubjectStats()
  emit()
}

export function toggleSubjectLock(id) {
  subjects = subjects.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
  emit()
}

export function getDeleteSubjectImpact(id) {
  const target = subjects.find((s) => s.id === id || s.name === id)
  if (!target) return { name: '', chapters: 0, mcqs: 0, flashcards: 0 }

  const isTargetChapter = (c) =>
    c.subjectId === target.id ||
    c.subject_id === target.id ||
    (c.subject && String(c.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  const isTargetMcq = (m) =>
    m.subjectId === target.id ||
    m.subject_id === target.id ||
    (m.subject && String(m.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  const isTargetFlashcard = (f) =>
    f.subjectId === target.id ||
    f.subject_id === target.id ||
    (f.subject && String(f.subject).trim().toLowerCase() === String(target.name).trim().toLowerCase())

  return {
    name: target.name,
    chapters: chapters.filter(isTargetChapter).length,
    mcqs: mcqs.filter(isTargetMcq).length,
    flashcards: flashcards.filter(isTargetFlashcard).length,
  }
}

// ── Chapter Overrides Persistence ──────────────────────────────────
const CHAPTER_OVERRIDES_KEY = 'nexora_chapter_overrides_v2'

export function getChapterOverrides() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAPTER_OVERRIDES_KEY) : null
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveChapterOverride(id, patch) {
  try {
    if (typeof localStorage === 'undefined') return
    const current = getChapterOverrides()
    const cleanId = String(id || patch?.id || '').trim().toLowerCase()
    const cleanCode = String(patch?.code || '').trim().toUpperCase()
    const cleanName = String(patch?.name || patch?.title || '').trim().toLowerCase()

    const overridePayload = {
      ...(patch.priority ? { priority: patch.priority } : {}),
      ...(patch.name ? { name: patch.name, title: patch.name } : {}),
      ...(patch.code ? { code: patch.code } : {}),
      ...(patch.desc !== undefined || patch.description !== undefined ? { desc: patch.desc || patch.description, description: patch.desc || patch.description } : {}),
      ...(patch.number !== undefined ? { number: Number(patch.number) } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.locked !== undefined ? { locked: Boolean(patch.locked) } : {}),
    }

    const updated = {
      ...current,
      ...(cleanId ? { [cleanId]: { ...current[cleanId], ...overridePayload } } : {}),
      ...(cleanCode ? { [`code_${cleanCode}`]: { ...current[`code_${cleanCode}`], ...overridePayload } } : {}),
      ...(cleanName ? { [`name_${cleanName}`]: { ...current[`name_${cleanName}`], ...overridePayload } } : {}),
    }
    localStorage.setItem(CHAPTER_OVERRIDES_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to save chapter override to localStorage:', err)
  }
}

export function applyChapterOverrides(chList) {
  if (!Array.isArray(chList)) return chList
  const overrides = getChapterOverrides()
  if (Object.keys(overrides).length === 0) return chList

  return chList.map((ch) => {
    if (!ch) return ch
    const chId = String(ch.id || '').trim().toLowerCase()
    const chCode = String(ch.code || '').trim().toUpperCase()
    const chName = String(ch.name || ch.title || '').trim().toLowerCase()

    const ov = overrides[chId] || (chCode ? overrides[`code_${chCode}`] : null) || (chName ? overrides[`name_${chName}`] : null)
    if (!ov) return ch

    return {
      ...ch,
      ...ov,
      priority: ov.priority || ch.priority,
      code: ov.code || ch.code,
      name: ov.name || ch.name,
      title: ov.name || ch.title || ch.name,
      desc: ov.desc || ov.description || ch.desc || ch.description,
      description: ov.desc || ov.description || ch.desc || ch.description,
      status: ov.status || ch.status,
      locked: ov.locked !== undefined ? Boolean(ov.locked) : ch.locked,
    }
  })
}

// ── Chapter CRUD ──────────────────────────────────────────────────
export function addChapter(data) {
  const targetCourseId = data.courseId || currentCourseId()
  const courseChapters = chapters.filter((c) => c.courseId === targetCourseId)
  const chapter = {
    id: data.id || `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    courseId: targetCourseId,
    subjectId: data.subjectId || data.subject || 'Computer Networks',
    subject: data.subject || data.subjectId || 'Computer Networks',
    name: data.name || 'New Chapter',
    desc: data.desc || data.description || '',
    mcqs: data.mcqs || 0,
    flashcards: data.flashcards || 0,
    notes: data.notes || 0,
    status: data.status || 'active',
    statusText: data.status === 'disabled' ? 'Disabled' : 'Active',
    locked: Boolean(data.locked),
    number: data.number ? Number(data.number) : courseChapters.length + 1,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  }
  chapters = [...chapters, chapter]
  recomputeAllSubjectStats()
  emit()
  return chapter
}

export function updateChapter(id, patch) {
  const cleanId = String(id || patch?.id || '').trim().toLowerCase()
  const patchName = String(patch?.name || patch?.title || '').trim().toLowerCase()
  const patchCode = String(patch?.code || '').trim().toUpperCase()
  const patchNumber = patch?.number !== undefined ? Number(patch?.number) : null

  // Save to persistent overrides
  saveChapterOverride(id, patch)

  chapters = chapters.map((chapter) => {
    const chId = String(chapter.id || '').trim().toLowerCase()
    const chName = String(chapter.name || chapter.title || '').trim().toLowerCase()
    const chCode = String(chapter.code || '').trim().toUpperCase()
    const chNumber = Number(chapter.number)

    const isIdMatch = cleanId && (chId === cleanId || chId.includes(cleanId) || cleanId.includes(chId))
    const isCodeMatch = patchCode && chCode && patchCode === chCode
    const isNameSubjectMatch = patchName && chName && patchName === chName && (
      !patch.subject || !chapter.subject || String(patch.subject).trim().toLowerCase() === String(chapter.subject).trim().toLowerCase()
    )
    const isNumberSubjectMatch = patchNumber && chNumber === patchNumber && (
      !patch.subject || !chapter.subject || String(patch.subject).trim().toLowerCase() === String(chapter.subject).trim().toLowerCase()
    )

    if (!isIdMatch && !isCodeMatch && !isNameSubjectMatch && !isNumberSubjectMatch) {
      return chapter
    }

    return {
      ...chapter,
      ...patch,
      name: patch.name || chapter.name,
      title: patch.name || chapter.title || chapter.name,
      number: patch.number !== undefined ? Number(patch.number) : chapter.number,
      code: patch.code !== undefined ? patch.code : chapter.code,
      priority: patch.priority !== undefined ? patch.priority : chapter.priority,
      desc: patch.desc !== undefined ? patch.desc : (patch.description !== undefined ? patch.description : chapter.desc),
      description: patch.desc !== undefined ? patch.desc : (patch.description !== undefined ? patch.description : chapter.description),
      status: patch.status || chapter.status || 'active',
      locked: patch.locked !== undefined ? Boolean(patch.locked) : Boolean(chapter.locked),
      subject: patch.subject || patch.subjectName || chapter.subject,
      subjectName: patch.subjectName || patch.subject || chapter.subjectName,
      subjectId: patch.subjectId || chapter.subjectId,
    }
  })

  recomputeAllSubjectStats()
  emit()
}

export function duplicateChapter(id) {
  const target = chapters.find((c) => c.id === id)
  if (!target) return
  const courseId = target.courseId
  const copy = {
    ...JSON.parse(JSON.stringify(target)),
    id: nextId(chapters),
    name: `${target.name} (Copy)`,
    status: 'active',
    locked: false,
    number: chapters.filter((c) => c.courseId === courseId && c.subject === target.subject).length + 1,
  }
  chapters = [...chapters, copy]
  recomputeAllSubjectStats()
  emit()
  return copy
}

export function reorderChapters(subjectName, orderedChapters) {
  const courseId = currentCourseId()
  const orderMap = new Map(orderedChapters.map((c, index) => [c.id, index + 1]))
  chapters = chapters.map((chapter) => {
    if (chapter.subject !== subjectName || chapter.courseId !== courseId) return chapter
    const newNumber = orderMap.get(chapter.id)
    return newNumber ? { ...chapter, number: newNumber } : chapter
  })
  emit()
}

export function setChapterStatus(id, status) {
  chapters = chapters.map((c) => {
    if (c.id !== id) return c
    const isActive = status === 'active'
    return {
      ...c,
      status: isActive ? 'success' : 'warning',
      statusText: isActive ? 'Active' : 'Disabled',
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function toggleChapterLock(id) {
  chapters = chapters.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c))
  emit()
}

export function deleteChapter(id) {
  const target = chapters.find((c) => c.id === id)
  let impacted = { name: '', subject: '', mcqs: 0, flashcards: 0 }
  if (target) {
    const mcqMatches = (m) =>
      String(m.chapterId || m.chapter_id) === String(id) &&
      (!target.subjectId && !target.subject_id ? true : String(m.subjectId || m.subject_id) === String(target.subjectId || target.subject_id)) &&
      (!target.courseId ? true : String(m.courseId || m.course_id) === String(target.courseId))

    const flashMatches = (f) =>
      String(f.chapterId || f.chapter_id) === String(id) &&
      (!target.subjectId && !target.subject_id ? true : String(f.subjectId || f.subject_id) === String(target.subjectId || target.subject_id)) &&
      (!target.courseId ? true : String(f.courseId || f.course_id) === String(target.courseId))

    const mcqCount = mcqs.filter(mcqMatches).length
    const flashcardCount = flashcards.filter(flashMatches).length
    impacted = { name: target.name, subject: target.subject, mcqs: mcqCount, flashcards: flashcardCount }
    mcqs = mcqs.filter((m) => !mcqMatches(m))
    flashcards = flashcards.filter((f) => !flashMatches(f))
  }
  chapters = chapters.filter((c) => c.id !== id)
  recomputeAllSubjectStats()
  emit()
  return impacted
}

export function getDeleteChapterImpact(id) {
  const target = chapters.find((c) => c.id === id)
  if (!target) return { name: '', subject: '', mcqs: 0, flashcards: 0 }
  const mcqMatches = (m) =>
    String(m.chapterId || m.chapter_id) === String(id) &&
    (!target.subjectId && !target.subject_id ? true : String(m.subjectId || m.subject_id) === String(target.subjectId || target.subject_id)) &&
    (!target.courseId ? true : String(m.courseId || m.course_id) === String(target.courseId))

  const flashMatches = (f) =>
    String(f.chapterId || f.chapter_id) === String(id) &&
    (!target.subjectId && !target.subject_id ? true : String(f.subjectId || f.subject_id) === String(target.subjectId || target.subject_id)) &&
    (!target.courseId ? true : String(f.courseId || f.course_id) === String(target.courseId))

  return {
    name: target.name,
    subject: target.subject,
    mcqs: mcqs.filter(mcqMatches).length,
    flashcards: flashcards.filter(flashMatches).length,
  }
}

// ── MCQ CRUD ──────────────────────────────────────────────────────
export function deleteSelectedMcqs(ids) {
  const idSet = new Set(ids)
  const removed = mcqs.filter((m) => idSet.has(m.id)).length
  mcqs = mcqs.filter((m) => !idSet.has(m.id))
  recomputeAllSubjectStats()
  emit()
  return removed
}

export function addMcq({ question, options, correct, difficulty, subject, chapter }) {
  const courseId = currentCourseId()
  const mcq = {
    id: nextId(mcqs),
    courseId,
    question: question || 'New question?',
    options: options || ['', '', '', ''],
    correct: correct || 0,
    subject: subject || 'Computer Networks',
    chapter: chapter || 'General',
    difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
    difficultyText: difficulty || 'Easy',
    attempts: '0',
    accuracy: '—',
  }
  mcqs = [...mcqs, mcq]
  recomputeAllSubjectStats()
  emit()
  return mcq
}

export function updateMcq(id, { question, options, correct, difficulty, subject, chapter }) {
  mcqs = mcqs.map((mcq) => {
    if (mcq.id !== id) return mcq
    return {
      ...mcq,
      question: question || mcq.question,
      options: options || mcq.options,
      correct: correct ?? mcq.correct,
      subject: subject || mcq.subject,
      chapter: chapter || mcq.chapter,
      difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
      difficultyText: difficulty || mcq.difficultyText,
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteMcq(id) {
  mcqs = mcqs.filter((m) => m.id !== id)
  recomputeAllSubjectStats()
  emit()
}

export function deleteMcqsByChapter(chapterId, subjectId, courseId) {
  const count = mcqs.filter(
    (m) =>
      String(m.chapterId || m.chapter_id) === String(chapterId) &&
      (!subjectId ? true : String(m.subjectId || m.subject_id) === String(subjectId)) &&
      (!courseId ? true : String(m.courseId || m.course_id) === String(courseId))
  ).length
  mcqs = mcqs.filter(
    (m) =>
      !(
        String(m.chapterId || m.chapter_id) === String(chapterId) &&
        (!subjectId ? true : String(m.subjectId || m.subject_id) === String(subjectId)) &&
        (!courseId ? true : String(m.courseId || m.course_id) === String(courseId))
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteMcqsBySubject(subjectId, courseId) {
  const cId = courseId || currentCourseId()
  const count = mcqs.filter(
    (m) =>
      String(m.subjectId || m.subject_id) === String(subjectId) &&
      (!cId ? true : String(m.courseId || m.course_id) === String(cId))
  ).length
  mcqs = mcqs.filter(
    (m) =>
      !(
        String(m.subjectId || m.subject_id) === String(subjectId) &&
        (!cId ? true : String(m.courseId || m.course_id) === String(cId))
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllMcqs() {
  const courseId = currentCourseId()
  const count = mcqs.filter((m) => (m.courseId || m.course_id) === courseId).length
  mcqs = mcqs.filter((m) => (m.courseId || m.course_id) !== courseId)
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Flashcard CRUD ────────────────────────────────────────────────
export function addFlashcard({ subject, chapter, subjectId, chapterId, front, back, courseId }) {
  const targetCourseId = courseId || currentCourseId()
  const flashcard = {
    id: nextId(flashcards),
    courseId: targetCourseId,
    course_id: targetCourseId,
    subjectId: subjectId || subject || 's-default',
    subject_id: subjectId || subject || 's-default',
    chapterId: chapterId || chapter || 'c-default',
    chapter_id: chapterId || chapter || 'c-default',
    subject: subject || subjectId || 'Subject',
    chapter: chapter || chapterId || 'General',
    front: front || 'New question?',
    back: back || 'Answer',
    views: '0 views',
  }
  flashcards = [...flashcards, flashcard]
  recomputeAllSubjectStats()
  emit()
  return flashcard
}

export function updateFlashcard(id, { subject, chapter, subjectId, chapterId, front, back }) {
  flashcards = flashcards.map((card) => {
    if (card.id !== id) return card
    return {
      ...card,
      subjectId: subjectId || card.subjectId,
      subject_id: subjectId || card.subject_id,
      chapterId: chapterId || card.chapterId,
      chapter_id: chapterId || card.chapter_id,
      subject: subject || card.subject,
      chapter: chapter || card.chapter,
      front: front || card.front,
      back: back || card.back,
    }
  })
  recomputeAllSubjectStats()
  emit()
}

export function deleteFlashcard(id) {
  flashcards = flashcards.filter((f) => f.id !== id)
  recomputeAllSubjectStats()
  emit()
}

export function deleteFlashcardsByChapter(chapterId, subjectId, courseId) {
  const cId = courseId || currentCourseId()
  const count = flashcards.filter(
    (f) =>
      String(f.chapterId || f.chapter_id) === String(chapterId) &&
      (!subjectId ? true : String(f.subjectId || f.subject_id) === String(subjectId)) &&
      (!cId ? true : String(f.courseId || f.course_id) === String(cId))
  ).length
  flashcards = flashcards.filter(
    (f) =>
      !(
        String(f.chapterId || f.chapter_id) === String(chapterId) &&
        (!subjectId ? true : String(f.subjectId || f.subject_id) === String(subjectId)) &&
        (!cId ? true : String(f.courseId || f.course_id) === String(cId))
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteFlashcardsBySubject(subjectId, courseId) {
  const cId = courseId || currentCourseId()
  const count = flashcards.filter(
    (f) =>
      String(f.subjectId || f.subject_id) === String(subjectId) &&
      (!cId ? true : String(f.courseId || f.course_id) === String(cId))
  ).length
  flashcards = flashcards.filter(
    (f) =>
      !(
        String(f.subjectId || f.subject_id) === String(subjectId) &&
        (!cId ? true : String(f.courseId || f.course_id) === String(cId))
      )
  )
  recomputeAllSubjectStats()
  emit()
  return count
}

export function deleteAllFlashcards() {
  const courseId = currentCourseId()
  const count = flashcards.filter((f) => (f.courseId || f.course_id) === courseId).length
  flashcards = flashcards.filter((f) => (f.courseId || f.course_id) !== courseId)
  recomputeAllSubjectStats()
  emit()
  return count
}

// ── Bulk injection (AI Content Studio) ────────────────────────────
export function injectMcqs(records) {
  const fallbackCourseId = currentCourseId()
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.question) {
      failed += 1
      return
    }
    const targetCourseId = record.course_id || record.courseId || fallbackCourseId
    const targetChapId = record.chapter_id || record.chapterId
    const targetSubId = record.subject_id || record.subjectId

    if (!targetChapId || !targetSubId) {
      failed += 1
      return
    }

    const exists = mcqs.some(
      (m) =>
        (record.id && String(m.id) === String(record.id)) ||
        (m.question &&
          record.question &&
          m.question.toLowerCase().trim() === String(record.question).toLowerCase().trim() &&
          String(m.chapter_id || m.chapterId) === String(targetChapId) &&
          String(m.subject_id || m.subjectId) === String(targetSubId) &&
          String(m.course_id || m.courseId) === String(targetCourseId))
    )
    if (exists) {
      duplicates += 1
      return
    }

    const options = Array.isArray(record.options)
      ? record.options
      : [record.optionA, record.optionB, record.optionC, record.optionD].map((o) => o || '')
    const correctMap = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
    const rawCorrect = record.correct !== undefined ? record.correct : (record.correct_answer !== undefined ? record.correct_answer : record.correctAnswer)
    const correct = typeof rawCorrect === 'number' ? rawCorrect : (correctMap[String(rawCorrect || 'A').trim().toUpperCase()] ?? 0)
    const difficulty = record.difficultyText || record.difficulty || 'Easy'

    mcqs = [
      ...mcqs,
      {
        id: record.id || nextId(mcqs),
        courseId: targetCourseId,
        course_id: targetCourseId,
        subject_id: targetSubId,
        chapter_id: targetChapId,
        subjectId: targetSubId,
        chapterId: targetChapId,
        question: record.question,
        options,
        option_a: options[0] || record.option_a || '',
        option_b: options[1] || record.option_b || '',
        option_c: options[2] || record.option_c || '',
        option_d: options[3] || record.option_d || '',
        correct,
        correct_answer: correct,
        subject: record.subject || targetSubId,
        chapter: record.chapter || targetChapId,
        difficulty: difficulty === 'Hard' ? 'danger' : difficulty === 'Medium' ? 'warning' : 'success',
        difficultyText: difficulty,
        attempts: record.attempts || '0',
        accuracy: record.accuracy || '—',
        explanation: record.explanation || '',
        exam_profile: record.exam_profile || 'GENERIC',
        prompt_version: record.prompt_version || 'generic-v1',
      },
    ]
    imported += 1
    lastSubject = record.subject || targetSubId
    lastChapter = record.chapter || targetChapId
  })

  recomputeAllSubjectStats()
  emit()
  return { imported, duplicates, failed, lastSubject, lastChapter, length: imported }
}

export function injectFlashcards(records) {
  const fallbackCourseId = currentCourseId()
  let imported = 0
  let duplicates = 0
  let failed = 0
  let lastSubject = ''
  let lastChapter = ''

  records.forEach((record) => {
    if (!record || !record.front || !record.back) {
      failed += 1
      return
    }
    const targetCourseId = record.course_id || record.courseId || fallbackCourseId
    const targetChapId = record.chapter_id || record.chapterId
    const targetSubId = record.subject_id || record.subjectId

    if (!targetChapId || !targetSubId) {
      failed += 1
      return
    }

    const exists = flashcards.some(
      (f) =>
        (record.id && String(f.id) === String(record.id)) ||
        (f.front &&
          record.front &&
          f.front.toLowerCase().trim() === String(record.front).toLowerCase().trim() &&
          String(f.chapter_id || f.chapterId) === String(targetChapId) &&
          String(f.subject_id || f.subjectId) === String(targetSubId) &&
          String(f.course_id || f.courseId) === String(targetCourseId))
    )
    if (exists) {
      duplicates += 1
      return
    }

    flashcards = [
      ...flashcards,
      {
        id: record.id || nextId(flashcards),
        courseId: targetCourseId,
        course_id: targetCourseId,
        subject_id: targetSubId,
        chapter_id: targetChapId,
        subjectId: targetSubId,
        chapterId: targetChapId,
        subject: record.subject || targetSubId,
        chapter: record.chapter || targetChapId,
        front: record.front,
        back: record.back,
        views: record.views || '0 views',
      },
    ]
    imported += 1
    lastSubject = record.subject || targetSubId
    lastChapter = record.chapter || targetChapId
  })

  recomputeAllSubjectStats()
  emit()
  return { imported, duplicates, failed, lastSubject, lastChapter, length: imported }
}

export { injectMcqs as injectMcqsIntoStore, injectFlashcards as injectFlashcardsIntoStore }

export function checkDuplicateMcqs(records, targetCourseId, targetSubjectId, targetChapterId) {
  const cId = targetCourseId || currentCourseId()
  const existingSet = new Set(
    mcqs
      .filter((m) => {
        if (cId && String(m.courseId || m.course_id) !== String(cId)) return false
        if (targetSubjectId && String(m.subjectId || m.subject_id) !== String(targetSubjectId)) return false
        if (targetChapterId && String(m.chapterId || m.chapter_id) !== String(targetChapterId)) return false
        return true
      })
      .map((m) => m.question.trim().toLowerCase())
  )
  return records.filter((r) => r.question && existingSet.has(r.question.trim().toLowerCase()))
}

export function checkDuplicateFlashcards(records, targetCourseId, targetSubjectId, targetChapterId) {
  const cId = targetCourseId || currentCourseId()
  const existingSet = new Set(
    flashcards
      .filter((f) => {
        if (cId && String(f.courseId || f.course_id) !== String(cId)) return false
        if (targetSubjectId && String(f.subjectId || f.subject_id) !== String(targetSubjectId)) return false
        if (targetChapterId && String(f.chapterId || f.chapter_id) !== String(targetChapterId)) return false
        return true
      })
      .map((f) => f.front.trim().toLowerCase())
  )
  return records.filter((r) => r.front && existingSet.has(r.front.trim().toLowerCase()))
}

export function getCounts() {
  const courseId = currentCourseId()
  return {
    subjects: subjects.filter((s) => (s.courseId || s.course_id) === courseId).length,
    chapters: chapters.filter((c) => (c.courseId || c.course_id) === courseId).length,
    mcqs: mcqs.filter((m) => (m.courseId || m.course_id) === courseId).length,
    flashcards: flashcards.filter((f) => (f.courseId || f.course_id) === courseId).length,
  }
}

export function getSubjectByName(name) {
  const courseId = currentCourseId()
  return subjects.find((s) => (s.name === name || s.id === name) && (s.courseId || s.course_id) === courseId) || null
}

export function getSubjectsByCourse(courseId) {
  return subjects.filter((s) => (s.courseId || s.course_id) === courseId)
}

export function getChaptersBySubject(subjectId) {
  const courseId = currentCourseId()
  return chapters
    .filter(
      (c) =>
        (c.subjectId === subjectId || c.subject_id === subjectId) &&
        (c.courseId || c.course_id) === courseId
    )
    .sort((a, b) => (a.number || 0) - (b.number || 0))
}

export function getChaptersBySubjectAndCourse(subjectId, courseId) {
  return chapters.filter(
    (c) =>
      (c.subjectId === subjectId || c.subject_id === subjectId) &&
      (c.courseId || c.course_id) === courseId
  ).sort((a, b) => (a.number || 0) - (b.number || 0))
}

export function getMcqsByChapterAndCourse(chapterId, subjectId, courseId) {
  return mcqs.filter((m) => {
    if (courseId && String(m.courseId || m.course_id) !== String(courseId)) return false
    if (subjectId && String(m.subject_id || m.subjectId) !== String(subjectId)) return false
    if (chapterId && String(m.chapter_id || m.chapterId) !== String(chapterId)) return false
    return true
  })
}

// ── Chapter ordering (reorder) ────────────────────────────────────
export function saveChapterOrder(subjectName, orderedChapters) {
  const courseId = currentCourseId()
  const orderMap = new Map(orderedChapters.map((c, index) => [c.id, index + 1]))
  chapters = chapters.map((chapter) => {
    if (chapter.subject !== subjectName || chapter.courseId !== courseId) return chapter
    const newNumber = orderMap.get(chapter.id)
    return newNumber ? { ...chapter, number: newNumber } : chapter
  })
  emit()
}

export function replaceSubjects(newSubjects) {
  subjects = Array.isArray(newSubjects) ? newSubjects : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceChapters(newChapters) {
  chapters = Array.isArray(newChapters) ? newChapters : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceMcqs(newMcqs) {
  mcqs = Array.isArray(newMcqs) ? newMcqs : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceFlashcards(newFlashcards) {
  flashcards = Array.isArray(newFlashcards) ? newFlashcards : []
  recomputeAllSubjectStats()
  emit()
}

export function replaceWorkspaces(newWorkspaces) {
  workspaces = Array.isArray(newWorkspaces) ? newWorkspaces : []
  emit()
}

export function removeMcqsFromStore(mcqIdsToRemove = []) {
  const idsSet = new Set(mcqIdsToRemove.map((id) => String(id)))
  mcqs = mcqs.filter((m) => !idsSet.has(String(m.id)))
  recomputeAllSubjectStats()
  emit()
}

export function removeMcqsForChapterFromStore(chapterId) {
  if (!chapterId) return
  mcqs = mcqs.filter((m) => String(m.chapterId || m.chapter_id) !== String(chapterId))
  recomputeAllSubjectStats()
  emit()
}

export function updateMcqInStore(updatedMcq) {
  if (!updatedMcq || !updatedMcq.id) return
  mcqs = mcqs.map((m) => {
    if (String(m.id) === String(updatedMcq.id)) {
      return { ...m, ...updatedMcq }
    }
    return m
  })
  recomputeAllSubjectStats()
  emit()
}

// ── Note CRUD ─────────────────────────────────────────────────────
export function replaceNotes(newNotes) {
  notes = Array.isArray(newNotes) ? newNotes : []
  recomputeAllSubjectStats()
  emit()
}

export function addNote(note) {
  if (!note || !note.id) return
  notes = [note, ...notes.filter((n) => String(n.id) !== String(note.id))]
  recomputeAllSubjectStats()
  emit()
}

export function updateNoteInStore(updatedNote) {
  if (!updatedNote || !updatedNote.id) return
  notes = notes.map((n) => (String(n.id) === String(updatedNote.id) ? { ...n, ...updatedNote } : n))
  recomputeAllSubjectStats()
  emit()
}

export function deleteNoteFromStore(noteId) {
  if (!noteId) return
  notes = notes.filter((n) => String(n.id) !== String(noteId))
  recomputeAllSubjectStats()
  emit()
}
