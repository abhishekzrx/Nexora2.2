/**
 * knowledgeHierarchyService.js
 * Comprehensive Knowledge Structure & Concept Taxonomy Engine for Nexora.
 *
 * Implements the 6-Level Learning Taxonomy:
 * Level 1: Course / Examination
 * Level 2: Subject
 * Level 3: Chapter
 * Level 4: Topic
 * Level 5: Sub-topic / Concept
 * Level 6: Knowledge Point / Rule / Edge-case
 *
 * Provides:
 * - Pre-built conceptual taxonomies for core STEM, Humanities, Computer Science, and Competitive subjects.
 * - Dynamic Concept Deconstructor for any custom or user-defined chapter.
 * - Concept lookup, tagging, and coverage tracking.
 */

// ── Built-in Knowledge Domain Taxonomies ───────────────────────────
export const DOMAIN_KNOWLEDGE_TREES = {
  // Computer Science Domains
  'operating systems': {
    topics: [
      {
        id: 'os-top-1',
        name: 'Process & Thread Management',
        concepts: [
          {
            id: 'os-c-proc-lifecycle',
            name: 'Process States & State Transitions',
            knowledgePoints: ['PCB structure', 'Ready-Running-Waiting lifecycle', 'Context switching overhead', 'CPU vs I/O bound processes'],
          },
          {
            id: 'os-c-cpu-sched',
            name: 'CPU Scheduling Algorithms',
            knowledgePoints: ['FCFS & Convoy Effect', 'SJF & Shortest Remaining Time First (SRTF)', 'Round Robin & Quantum size tradeoff', 'Priority Scheduling & Aging', 'Multi-Level Feedback Queues'],
          },
          {
            id: 'os-c-threads',
            name: 'Threads & Concurrency',
            knowledgePoints: ['User vs Kernel-level threads', 'Multithreading models (M:1, 1:1, M:N)', 'Thread pools', 'Race conditions & Critical Section Problem'],
          },
          {
            id: 'os-c-sync',
            name: 'Process Synchronization & Deadlocks',
            knowledgePoints: ['Peterson’s algorithm', 'Semaphores (Counting vs Binary)', 'Mutex locks & Monitors', 'Classic problems (Dining Philosophers, Producer-Consumer)', '4 Coffman conditions for deadlock', 'Banker’s Algorithm & Resource Allocation Graph', 'Deadlock Detection vs Prevention vs Avoidance'],
          },
        ],
      },
      {
        id: 'os-top-2',
        name: 'Memory Management',
        concepts: [
          {
            id: 'os-c-mem-alloc',
            name: 'Contiguous Memory Allocation',
            knowledgePoints: ['Fixed vs Dynamic Partitioning', 'Internal vs External Fragmentation', 'First Fit, Best Fit, Worst Fit algorithms', 'Compaction techniques'],
          },
          {
            id: 'os-c-paging',
            name: 'Paging & Segmentation',
            knowledgePoints: ['Logical to Physical address translation', 'Page Table structure & inverted page tables', 'TLB (Translation Lookaside Buffer) hit/miss math', 'Effective Memory Access Time (EMAT)', 'Segmentation with paging'],
          },
          {
            id: 'os-c-virt-mem',
            name: 'Virtual Memory & Page Replacement',
            knowledgePoints: ['Demand Paging & Page Fault handling', 'FIFO replacement & Belady’s Anomaly', 'Optimal Page Replacement (OPT)', 'Least Recently Used (LRU) & Clock Algorithm', 'Thrashing & Working Set Model'],
          },
        ],
      },
      {
        id: 'os-top-3',
        name: 'Storage & File Systems',
        concepts: [
          {
            id: 'os-c-disk-sched',
            name: 'Disk Scheduling Algorithms',
            knowledgePoints: ['Seek time vs Rotational latency', 'FCFS, SSTF disk scheduling', 'SCAN (Elevator), C-SCAN, LOOK, C-LOOK', 'RAID levels (0, 1, 5, 6, 10)'],
          },
          {
            id: 'os-c-files',
            name: 'File Allocation & Directory Structures',
            knowledgePoints: ['Contiguous, Linked, and Indexed allocation', 'i-node architecture in UNIX', 'Free-space management (Bit vector, Linked list)'],
          },
        ],
      },
    ],
  },

  'computer networks': {
    topics: [
      {
        id: 'cn-top-1',
        name: 'Network Models & Physical Layer',
        concepts: [
          {
            id: 'cn-c-models',
            name: 'OSI vs TCP/IP Protocol Architectures',
            knowledgePoints: ['7-layer OSI duties & PDUs', 'Encapsulation & Decapsulation', 'Connection-oriented vs Connectionless services'],
          },
          {
            id: 'cn-c-phys-trans',
            name: 'Transmission & Bandwidth-Delay',
            knowledgePoints: ['Nyquist theorem & Shannon Capacity formula', 'Guided vs Unguided media', 'Propagation delay vs Transmission delay calculations', 'Bandwidth-Delay Product'],
          },
        ],
      },
      {
        id: 'cn-top-2',
        name: 'Data Link Layer & MAC',
        concepts: [
          {
            id: 'cn-c-framing-error',
            name: 'Error Detection & Correction',
            knowledgePoints: ['Parity check & 2D parity', 'Checksum calculation', 'Cyclic Redundancy Check (CRC) polynomial division', 'Hamming Code distance & correction'],
          },
          {
            id: 'cn-c-flow-control',
            name: 'Flow & Error Control Protocols',
            knowledgePoints: ['Stop-and-Wait ARQ & efficiency formula', 'Go-Back-N ARQ & window sizing', 'Selective Repeat ARQ & buffer requirements', 'Piggybacking'],
          },
          {
            id: 'cn-c-mac',
            name: 'Medium Access Control (MAC)',
            knowledgePoints: ['Pure vs Slotted ALOHA throughput', 'CSMA/CD (Collision Detection) & minimum frame size formula', 'CSMA/CA & Exponential Backoff algorithm', 'Ethernet framing & IEEE 802.3/802.11'],
          },
        ],
      },
      {
        id: 'cn-top-3',
        name: 'Network Layer & IP Addressing',
        concepts: [
          {
            id: 'cn-c-ip-sub',
            name: 'IPv4 Addressing, Subnetting & CIDR',
            knowledgePoints: ['Classful vs Classless (CIDR) addressing', 'Subnet mask & wildcard mask', 'FLSM vs VLSM calculations', 'Private vs Public IP ranges (RFC 1918)', 'NAT / PAT operations'],
          },
          {
            id: 'cn-c-routing',
            name: 'Routing Protocols & Algorithms',
            knowledgePoints: ['Distance Vector Routing & Count-to-Infinity problem', 'Link State Routing (Dijkstra algorithm)', 'RIP, OSPF, BGP protocols', 'ARP, RARP, ICMP message types', 'IPv6 header structure & differences from IPv4'],
          },
        ],
      },
      {
        id: 'cn-top-4',
        name: 'Transport & Application Layer',
        concepts: [
          {
            id: 'cn-c-transport',
            name: 'TCP vs UDP Protocols',
            knowledgePoints: ['TCP 3-way handshake & connection termination', 'TCP header flags & sequence/acknowledgement numbers', 'TCP Flow control (Sliding Window) vs Congestion control (Slow Start, AIMD)', 'UDP header & use cases (DNS, VoIP, Streaming)'],
          },
          {
            id: 'cn-c-app-proto',
            name: 'Application Layer Protocols',
            knowledgePoints: ['DNS resolution & hierarchy', 'HTTP / HTTPS & HTTP/2 / HTTP/3', 'FTP, SMTP, POP3, IMAP protocols', 'Socket programming basics'],
          },
        ],
      },
    ],
  },

  'database management systems (dbms)': {
    topics: [
      {
        id: 'dbms-top-1',
        name: 'Data Models & Relational Algebra',
        concepts: [
          {
            id: 'dbms-c-er',
            name: 'ER Modeling & Relational Mapping',
            knowledgePoints: ['Entities, Attributes (Multivalued, Composite, Derived)', 'Cardinality & Participation constraints', 'Weak Entity Sets & Identifying relationships', 'ER to Relational Table reduction rules'],
          },
          {
            id: 'dbms-c-rel-alg',
            name: 'Relational Algebra & Calculus',
            knowledgePoints: ['Selection (σ), Projection (π), Cartesian Product (×)', 'Joins (Theta, Equi, Natural, Outer joins)', 'Division operator (÷) for "for all" queries', 'Tuple Relational Calculus (TRC) vs Domain Relational Calculus (DRC)'],
          },
        ],
      },
      {
        id: 'dbms-top-2',
        name: 'SQL & Normalization',
        concepts: [
          {
            id: 'dbms-c-sql',
            name: 'SQL Queries, Joins & Subqueries',
            knowledgePoints: ['GROUP BY, HAVING, and aggregate functions', 'Correlated vs Uncorrelated subqueries', 'Window functions & CTEs', 'Integrity constraints (Primary, Foreign, Unique, Check)'],
          },
          {
            id: 'dbms-c-norm',
            name: 'Functional Dependencies & Normal Forms',
            knowledgePoints: ['Closure of attribute sets (F+) & Canonical cover', 'Candidate Key determination', '1NF, 2NF (Full functional dependency)', '3NF (Transitive dependency removal)', 'BCNF (Super key determinant condition)', 'Lossless Join Decomposition & Dependency Preservation tests'],
          },
        ],
      },
      {
        id: 'dbms-top-3',
        name: 'Transactions & Concurrency Control',
        concepts: [
          {
            id: 'dbms-c-acid',
            name: 'ACID Properties & Schedules',
            knowledgePoints: ['Atomicity, Consistency, Isolation, Durability', 'Conflict Serializability & Precedence Graph (Cycle detection)', 'View Serializability', 'Recoverable vs Cascading vs Cascadeless schedules'],
          },
          {
            id: 'dbms-c-concur',
            name: 'Concurrency Protocols & Recovery',
            knowledgePoints: ['Lock-based protocols (Shared vs Exclusive)', 'Two-Phase Locking (2PL, Strict 2PL, Rigorous 2PL)', 'Timestamp Ordering & Thomas Write Rule', 'WAL (Write-Ahead Logging) & ARIES recovery algorithm', 'B-Tree & B+ Tree indexing node calculations'],
          },
        ],
      },
    ],
  },

  // General Science (Physics, Chemistry, Biology)
  'general science': {
    topics: [
      {
        id: 'sci-top-phy-mech',
        name: 'Physics: Mechanics & General Properties of Matter',
        concepts: [
          {
            id: 'phy-c-units',
            name: 'Units, Dimensions & Measurement',
            knowledgePoints: ['Fundamental vs Derived SI units', 'Dimensional formula derivation & consistency', 'Scalar vs Vector algebra & dot/cross products'],
          },
          {
            id: 'phy-c-motion',
            name: 'Kinematics & Laws of Motion',
            knowledgePoints: ['Equations of motion under gravity', 'Newton’s 3 Laws & Inertia', 'Conservation of linear momentum & Impulse', 'Friction: Static, Limiting, Kinetic & rolling'],
          },
          {
            id: 'phy-c-work-energy',
            name: 'Work, Power, Energy & Gravitation',
            knowledgePoints: ['Work-Energy Theorem & Conservative forces', 'Kinetic vs Potential energy', 'Universal Gravitation Law & variation of g with altitude/depth', 'Escape velocity & Kepler’s planetary laws'],
          },
          {
            id: 'phy-c-fluids',
            name: 'Fluid Mechanics & Surface Tension',
            knowledgePoints: ['Pascal’s Law & Hydraulic lift', 'Archimedes’ principle & Buoyancy conditions', 'Surface tension & Capillary action', 'Bernoulli’s theorem & Viscosity (Poiseuille formula)'],
          },
        ],
      },
      {
        id: 'sci-top-phy-optics-thermo',
        name: 'Physics: Optics, Waves & Thermodynamics',
        concepts: [
          {
            id: 'phy-c-optics',
            name: 'Ray & Wave Optics',
            knowledgePoints: ['Laws of Reflection & Refraction (Snell’s Law)', 'Total Internal Reflection (TIR) & Critical angle', 'Lenses and Mirror formula & magnification', 'Dispersion, Scattering of light (Rayleigh law), and Rainbow formation'],
          },
          {
            id: 'phy-c-waves',
            name: 'Acoustics & Electromagnetic Spectrum',
            knowledgePoints: ['Transverse vs Longitudinal waves', 'Doppler Effect in sound', 'Speed of sound in different media', 'EM Spectrum order (Gamma -> Radio) and properties'],
          },
          {
            id: 'phy-c-thermo',
            name: 'Heat & Thermodynamics',
            knowledgePoints: ['Temperature scales conversion (C, F, K)', 'Modes of heat transfer (Conduction, Convection, Radiation)', 'Newton’s Law of Cooling', 'First & Second Laws of Thermodynamics & Carnot engine efficiency'],
          },
        ],
      },
      {
        id: 'sci-top-chem-core',
        name: 'Chemistry: Structure of Matter & Chemical Reactions',
        concepts: [
          {
            id: 'chem-c-atomic',
            name: 'Atomic Structure & Periodic Table',
            knowledgePoints: ['Subatomic particles (Proton, Neutron, Electron discovery)', 'Bohr model & Quantum numbers', 'Isotopes, Isobars, Isotones', 'Periodic trends: Atomic radius, Electronegativity, Ionization energy'],
          },
          {
            id: 'chem-c-bonding',
            name: 'Chemical Bonding & States of Matter',
            knowledgePoints: ['Ionic, Covalent, and Hydrogen bonding', 'Gas Laws (Boyle, Charles, Ideal Gas Equation PV=nRT)', 'Solid state crystal structures'],
          },
          {
            id: 'chem-c-acid-base',
            name: 'Acids, Bases, Salts & Metallurgy',
            knowledgePoints: ['Arrhenius, Bronsted-Lowry, Lewis theories', 'pH scale calculations & Indicators', 'Common salts (Baking Soda, Bleaching Powder, Plaster of Paris)', 'Ores, Extraction of metals, and Important Alloys (Brass, Bronze, Solder)'],
          },
        ],
      },
      {
        id: 'sci-top-bio-life',
        name: 'Biology: Cell Biology, Human Physiology & Ecology',
        concepts: [
          {
            id: 'bio-c-cell',
            name: 'Cell Structure & Genetics',
            knowledgePoints: ['Prokaryotic vs Eukaryotic cells', 'Organelles: Mitochondria, Ribosomes, Endoplasmic Reticulum, Golgi', 'Mitosis vs Meiosis stages', 'DNA/RNA structure & Mendel’s Laws of Inheritance'],
          },
          {
            id: 'bio-c-physio',
            name: 'Human Organ Systems & Nutrition',
            knowledgePoints: ['Digestive system & enzyme functions', 'Circulatory system: Blood groups, Heart cycle, RBC/WBC', 'Respiratory system & gas exchange', 'Endocrine system & major hormones (Insulin, Thyroxine, Adrenaline)'],
          },
          {
            id: 'bio-c-disease',
            name: 'Human Diseases, Immunity & Plant Physiology',
            knowledgePoints: ['Bacterial vs Viral vs Fungal vs Protozoan diseases', 'Vaccines & Antibodies', 'Photosynthesis (Light/Dark reactions)', 'Plant hormones (Auxin, Gibberellin, Cytokinin, Ethylene)'],
          },
        ],
      },
    ],
  },

  // Indian History
  'indian history': {
    topics: [
      {
        id: 'hist-top-ancient',
        name: 'Ancient Indian History',
        concepts: [
          {
            id: 'hist-c-ivc',
            name: 'Indus Valley Civilization (IVC)',
            knowledgePoints: ['Town planning & Great Bath', 'Major sites (Harappa, Mohenjodaro, Lothal, Kalibangan, Dholavira)', 'Trade, agriculture, seals, and script'],
          },
          {
            id: 'hist-c-vedic',
            name: 'Vedic Age & Mahajanapadas',
            knowledgePoints: ['Early vs Later Vedic society and literature', '16 Mahajanapadas & Rise of Magadha', 'Buddhism (Four Noble Truths, Councils) & Jainism (Triratnas, Sects)'],
          },
          {
            id: 'hist-c-maurya-gupta',
            name: 'Mauryan & Gupta Empires',
            knowledgePoints: ['Chandragupta Maurya & Ashoka’s Edicts/Dhamma', 'Arthashastra & Mauryan Administration', 'Gupta Golden Age: Art, Literature, Science (Aryabhata, Kalidasa)', 'Harshavardhana & Post-Gupta kingdoms'],
          },
        ],
      },
      {
        id: 'hist-top-medieval',
        name: 'Medieval Indian History',
        concepts: [
          {
            id: 'hist-c-delhi-sultanate',
            name: 'Delhi Sultanate',
            knowledgePoints: ['Slave dynasty (Iltutmish, Balban)', 'Alauddin Khilji’s market reforms & military conquests', 'Muhammad bin Tughlaq’s experiments', 'Administration, architecture & Iqta system'],
          },
          {
            id: 'hist-c-mughal',
            name: 'Mughal Empire & Regional Kingdoms',
            knowledgePoints: ['Babur & Humayun foundations', 'Akbar’s Mansabdari system, Navratnas & Religious policy (Sulh-i-Kul)', 'Shah Jahan’s Architecture & Aurangzeb’s Deccan policy', 'Vijayanagara Empire & Maratha administration (Shivaji’s Ashtapradhan)'],
          },
          {
            id: 'hist-c-bhakti-sufi',
            name: 'Bhakti & Sufi Movements',
            knowledgePoints: ['Alvars & Nayanars', 'Major saints (Kabir, Guru Nanak, Mirabai, Shankaracharya, Ramanuja)', 'Sufi Silsilas (Chishti, Suhrawardi)'],
          },
        ],
      },
      {
        id: 'hist-top-modern',
        name: 'Modern Indian History & Freedom Struggle',
        concepts: [
          {
            id: 'hist-c-british-expansion',
            name: 'British Expansion & Land Revenue Policies',
            knowledgePoints: ['Battle of Plassey (1757) & Buxar (1764)', 'Subsidiary Alliance & Doctrine of Lapse', 'Permanent Settlement, Ryotwari & Mahalwari systems', 'Drain of Wealth Theory (Dadabhai Naoroji)'],
          },
          {
            id: 'hist-c-revolt-1857',
            name: 'Revolt of 1857 & Socio-Religious Reforms',
            knowledgePoints: ['Causes, major leaders (Kunwar Singh, Rani Laxmibai, Nana Saheb)', 'Brahmo Samaj, Arya Samaj, Ramakrishna Mission, Aligarh Movement', 'Satyashodhak Samaj & Jyotirao Phule'],
          },
          {
            id: 'hist-c-inm-mass',
            name: 'National Movement & Gandhian Era',
            knowledgePoints: ['Formation of INC (1885) & Moderate vs Extremist phase', 'Swadeshi Movement (1905) & Surat Split (1907)', 'Non-Cooperation Movement (1920-22) & Chauri Chaura', 'Civil Disobedience Movement (1930) & Dandi March', 'Quit India Movement (1942), INA, and Partition (Cabinet Mission, Mountbatten Plan)'],
          },
        ],
      },
    ],
  },

  // Indian Polity
  'indian polity': {
    topics: [
      {
        id: 'pol-top-const-found',
        name: 'Constitutional Framework',
        concepts: [
          {
            id: 'pol-c-making-sources',
            name: 'Making of Constitution & Sources',
            knowledgePoints: ['Constituent Assembly committees & drafting', 'Borrowed features from world constitutions', 'Preamble philosophy & basic structure doctrine (Kesavananda Bharati case)'],
          },
          {
            id: 'pol-c-fr-fd-dpsp',
            name: 'Fundamental Rights, DPSPs & Fundamental Duties',
            knowledgePoints: ['Articles 12-35 (Right to Equality, Freedom, Religion, Constitutional Remedies - Writs)', 'DPSPs (Articles 36-51, Gandhian/Socialist/Liberal principles)', 'Fundamental Duties (Article 51A, 42nd & 86th Amendments)'],
          },
        ],
      },
      {
        id: 'pol-top-exec-legis',
        name: 'Union & State Government',
        concepts: [
          {
            id: 'pol-c-president-gov',
            name: 'President, Governor & Council of Ministers',
            knowledgePoints: ['Presidential elections, powers, ordinances (Art 123), and pardoning powers (Art 72)', 'Governor’s constitutional & discretionary powers (Art 213, 356)', 'Prime Minister & Cabinet collective responsibility (Art 75)'],
          },
          {
            id: 'pol-c-parliament',
            name: 'Parliament & State Legislatures',
            knowledgePoints: ['Lok Sabha vs Rajya Sabha powers & composition', 'Legislative procedure: Money Bill vs Financial Bill vs Ordinary Bill', 'Parliamentary Committees (PAC, Estimates Committee)', 'Anti-Defection Law (10th Schedule)'],
          },
          {
            id: 'pol-c-judiciary',
            name: 'Supreme Court, High Courts & Judicial Review',
            knowledgePoints: ['Jurisdiction of Supreme Court (Original, Appellate, Advisory - Art 143)', 'Collegium system & Appointment of judges', 'Judicial Review & Public Interest Litigation (PIL)'],
          },
        ],
      },
      {
        id: 'pol-top-local-bodies',
        name: 'Local Governance & Constitutional Bodies',
        concepts: [
          {
            id: 'pol-c-panchayat',
            name: 'Panchayati Raj & Municipalities',
            knowledgePoints: ['73rd & 74th Constitutional Amendment Acts', '11th & 12th Schedules & Functional items', 'Balwant Rai Mehta & Ashok Mehta committees', 'State Election Commission & State Finance Commission'],
          },
          {
            id: 'pol-c-bodies',
            name: 'Constitutional & Statutory Bodies',
            knowledgePoints: ['Election Commission of India (Art 324)', 'UPSC & State PSCs (Art 315-323)', 'Comptroller and Auditor General (CAG - Art 148)', 'Finance Commission (Art 280)', 'Attorney General & NITI Aayog'],
          },
        ],
      },
    ],
  },
}

// ── Dynamic Concept Deconstructor for Custom Chapters ─────────────
/**
 * Automatically decomposes any chapter (by title and description) into
 * structured Topics -> Concepts -> Knowledge Points when no static domain map exists.
 */
export function decomposeChapterIntoKnowledgeTree(chapterTitle = '', chapterDesc = '', subjectName = '') {
  const cleanTitle = String(chapterTitle || '').trim()
  const cleanDesc = String(chapterDesc || '').trim()
  const cleanSubj = String(subjectName || '').toLowerCase()

  // 1. Check if we match a pre-built domain
  for (const [domainKey, domainTree] of Object.entries(DOMAIN_KNOWLEDGE_TREES)) {
    if (cleanSubj.includes(domainKey) || cleanTitle.toLowerCase().includes(domainKey)) {
      // Find matching topics within domain
      const matchedTopics = domainTree.topics.filter((t) => {
        const tLower = t.name.toLowerCase()
        const titleLower = cleanTitle.toLowerCase()
        const words = cleanTitle.toLowerCase().split(/[\s,&/-]+/).filter((w) => w.length > 3)
        return tLower.includes(titleLower) || titleLower.includes(tLower) || words.some((w) => tLower.includes(w))
      })

      if (matchedTopics.length > 0) {
        return {
          source: 'domain_matched',
          chapterTitle: cleanTitle,
          subjectName: subjectName,
          topics: matchedTopics,
        }
      }
    }
  }

  // 2. Synthesize dynamic hierarchy from chapter title & description
  // Split description by commas, semicolons, or sentence periods into key phrases
  const rawPhrases = cleanDesc
    ? cleanDesc.split(/[.;,•–—\n]+/).map((s) => s.trim()).filter((s) => s.length > 3)
    : [cleanTitle]

  const topics = []
  const titleKeywords = cleanTitle.split(/[:\-,&]+/).map((s) => s.trim()).filter(Boolean)

  titleKeywords.forEach((tk, idx) => {
    const topicId = `dyn-top-${idx + 1}`
    const relevantPhrases = rawPhrases.filter((p) => p.toLowerCase().includes(tk.toLowerCase()))
    const conceptList = relevantPhrases.length > 0 ? relevantPhrases : [tk]

    const concepts = conceptList.slice(0, 4).map((cText, cIdx) => {
      const cId = `dyn-c-${idx + 1}-${cIdx + 1}`
      return {
        id: cId,
        name: cText.length > 45 ? `${cText.slice(0, 45)}...` : cText,
        fullName: cText,
        knowledgePoints: [
          `Fundamental principles and definitions of ${cText}`,
          `Governing rules, properties, and exceptions in ${cText}`,
          `Practical application, scenario analysis & numericals for ${cText}`,
          `Common student misconceptions & edge cases in ${cText}`,
        ],
      }
    })

    topics.push({
      id: topicId,
      name: tk,
      concepts,
    })
  })

  // Ensure at least 2 structured topics and 4 concepts
  if (topics.length === 0 || (topics.length === 1 && topics[0].concepts.length < 2)) {
    topics.push({
      id: 'dyn-top-foundations',
      name: `${cleanTitle} Foundations & Core Theory`,
      concepts: [
        {
          id: 'dyn-c-found-1',
          name: 'Core Definitions & Governing Principles',
          knowledgePoints: ['Standard definitions & terminology', 'Governing laws and primary classifications', 'Key formulas and equations'],
        },
        {
          id: 'dyn-c-found-2',
          name: 'Properties, Properties Comparison & Rules',
          knowledgePoints: ['Distinguishing characteristics', 'Direct vs inverse relationships', 'Boundary and operating conditions'],
        },
      ],
    })
    topics.push({
      id: 'dyn-top-advanced',
      name: `${cleanTitle} Applications & Problem Solving`,
      concepts: [
        {
          id: 'dyn-c-adv-1',
          name: 'Applied Scenarios & Case Problems',
          knowledgePoints: ['Real-world use cases', 'Numerical problem solving', 'Process tracing and step analysis'],
        },
        {
          id: 'dyn-c-adv-2',
          name: 'Exceptions, Edge Cases & Common Misconceptions',
          knowledgePoints: ['Frequent student traps', 'Edge conditions and limits', 'Counter-examples and multiple-statement reasoning'],
        },
      ],
    })
  }

  return {
    source: 'synthesized',
    chapterTitle: cleanTitle,
    subjectName,
    topics,
  }
}

/**
 * Retrieves flattened list of all concepts for a chapter.
 */
export function getFlatConceptsForChapter(chapter, subjectTitle = '') {
  if (!chapter) return []
  const tree = decomposeChapterIntoKnowledgeTree(
    chapter.title || chapter.name || '',
    chapter.description || chapter.desc || '',
    subjectTitle || chapter.subject || ''
  )

  const flat = []
  tree.topics.forEach((top) => {
    (top.concepts || []).forEach((c) => {
      flat.push({
        id: c.id,
        name: c.name,
        fullName: c.fullName || c.name,
        topicId: top.id,
        topicName: top.name,
        knowledgePoints: c.knowledgePoints || [],
      })
    })
  })
  return flat
}

/**
 * Tags an incoming question with its closest matching concept in the chapter.
 */
export function tagQuestionWithConcept(questionObj, chapterConcepts = []) {
  if (!questionObj || chapterConcepts.length === 0) return null

  const qText = `${questionObj.question || questionObj.text || ''} ${questionObj.explanation || ''}`.toLowerCase()

  let bestMatch = chapterConcepts[0]
  let maxScore = 0

  chapterConcepts.forEach((concept) => {
    let score = 0
    const cTokens = concept.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    cTokens.forEach((t) => {
      if (qText.includes(t)) score += 3
    })

    ;(concept.knowledgePoints || []).forEach((kp) => {
      const kpTokens = kp.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      kpTokens.forEach((kt) => {
        if (qText.includes(kt)) score += 1
      })
    })

    if (score > maxScore) {
      maxScore = score
      bestMatch = concept
    }
  })

  return {
    conceptId: bestMatch.id,
    conceptName: bestMatch.name,
    topicId: bestMatch.topicId,
    topicName: bestMatch.topicName,
    matchConfidence: maxScore > 0 ? 'high' : 'default',
  }
}
