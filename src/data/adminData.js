/**
 * adminData
 * Hardcoded mock data for the Admin module.
 * No backend integration — purely frontend mock data.
 */

export const adminStats = [
  { icon: 'chapters', value: '8', label: 'Active Subjects', change: '↑ 2 this month' },
  { icon: 'document', value: '62', label: 'Total Chapters', change: '↑ 12 this month' },
  { icon: 'mcqs', value: '1.2K', label: 'Total MCQs', change: '↑ 340 this month' },
  { icon: 'flashcardsTab', value: '856', label: 'Total Flashcards', change: '↑ 180 this month' },
]

/**
 * CMS Workspace Overview Hero data.
 * Drives the premium hero section on the Admin Dashboard.
 */
export const workspaceStats = [
  { icon: 'subjects', value: '8', label: 'Subjects', trend: '+2', up: true },
  { icon: 'chapters', value: '62', label: 'Chapters', trend: '+12', up: true },
  { icon: 'mcqs', value: '1.2K', label: 'MCQs', trend: '+340', up: true },
  { icon: 'flashcardsTab', value: '856', label: 'Flashcards', trend: '+180', up: true },
]

export const workspaceHighlights = [
  { icon: 'chapters', label: 'New Chapters Added', value: '+12', tone: 'green' },
  { icon: 'mcqs', label: 'MCQs Added This Week', value: '+340', tone: 'orange' },
  { icon: 'flashcardsTab', label: 'Flashcards Pending Review', value: '24', tone: 'purple' },
  { icon: 'subjects', label: 'Active Subjects', value: '8', tone: 'blue' },
  { icon: 'target', label: 'Content Coverage', value: '72%', tone: 'green', progress: 72 },
]

export const quickActions = [
  { icon: 'add', label: 'Add Subject', modal: 'addSubject' },
  { icon: 'add', label: 'Add Chapter', modal: 'addChapter' },
  { icon: 'add', label: 'Add Flashcards', modal: 'addFlashcard' },
]

export const recentActivity = [
  { icon: 'chapters', strong: 'Physics', text: 'subject created', time: '2 hours ago' },
  { icon: 'mcqs', strong: '50 MCQs', text: 'injected to Thermodynamics chapter', time: '5 hours ago' },
  { icon: 'flashcardsTab', strong: 'Electromagnetism', text: 'chapter added', time: '1 day ago' },
]

export const adminSubjects = [
  {
    id: 's-cpp-oop-1',
    name: 'C++ Programming and Object-Oriented Programming (OOP)',
    icon: 'dataStructures',
    desc: 'Identifiers, tokens, modular functions, pointers, dynamic memory allocation, OOP principles, constructors, inheritance architectures, polymorphism, virtual functions and C++ file streams.',
    stats: [
      { value: '12', label: 'Chapters' },
      { value: '240', label: 'MCQs' },
      { value: '180', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  },
  {
    id: 'cn',
    name: 'Computer Networks',
    icon: 'computerNetworks',
    desc: 'Comprehensive guide to network protocols, OSI model, TCP/IP architectures and systems',
    stats: [
      { value: '10', label: 'Chapters' },
      { value: '200', label: 'MCQs' },
      { value: '150', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  },
  {
    id: 'os',
    name: 'Operating Systems',
    icon: 'operatingSystems',
    desc: 'Process management, concurrency, memory allocation, deadlocks, and virtual memory',
    stats: [
      { value: '8', label: 'Chapters' },
      { value: '180', label: 'MCQs' },
      { value: '120', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  },
  {
    id: 'dbms',
    name: 'Database Management System (DBMS)',
    icon: 'dbms',
    desc: 'Relational algebra, SQL queries, normalization, transaction processing, and ER modeling',
    stats: [
      { value: '9', label: 'Chapters' },
      { value: '220', label: 'MCQs' },
      { value: '160', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  },
  {
    id: 'coa',
    name: 'Computer Organization & Architecture (COA)',
    icon: 'computerOrganization',
    desc: 'CPU design, instruction sets, ALU, memory hierarchy, cache mapping, and I/O interface',
    stats: [
      { value: '7', label: 'Chapters' },
      { value: '160', label: 'MCQs' },
      { value: '110', label: 'Flashcards' },
      { value: 'Active', label: 'Status' },
    ],
  },
]

export const chaptersData = {
  's-cpp-oop-1': [
    { id: 1, chapter_code: 'CHP 1.1', name: 'C++ Fundamentals & Token Structure', desc: 'Identifiers, reserved keywords, primitive and user-defined data types, constants, arithmetic, relational, logical, bitwise, assignment and conditional operators, expression evaluation, implicit and explicit type casting, and standard stream I/O using cin, cout and cerr.' },
    { id: 2, chapter_code: 'CHP 1.2', name: 'Decision Branching & Loop Execution', desc: 'Conditional control flow using if, if-else, nested if and switch-case; iterative execution using for, while and do-while loops; break, continue and goto statements; nested-loop mechanics and execution tracing.' },
    { id: 3, chapter_code: 'CHP 1.3', name: 'Modular Functions & Parameter Passing', desc: 'Function prototypes, declaration and definition, pass-by-value, pass-by-reference and pass-by-pointer, default and constant arguments, inline functions, call-stack processing, recursion and variable-scope rules.' },
    { id: 4, chapter_code: 'CHP 1.4', name: 'One-Dimensional Arrays & Vectors', desc: 'Array declaration, initialization, contiguous memory allocation, indexing, traversal, linear and binary searching, array sorting and bounds checking. Includes the basic use and conceptual understanding of vector-like sequence structures.' },
    { id: 5, chapter_code: 'CHP 1.5', name: 'Multi-Dimensional Arrays & Matrices', desc: 'Two-dimensional array syntax, row-major and column-major address calculation, matrix addition, multiplication and transposition, diagonal processing, and passing multidimensional arrays to functions.' },
    { id: 6, chapter_code: 'CHP 1.6', name: 'Pointers & Address Arithmetic', desc: 'Pointer variables, reference and dereference operators, pointer arithmetic, array-pointer relationship, pointers to pointers, constant pointers, null pointers, wild pointers and void pointers.' },
    { id: 7, chapter_code: 'CHP 1.7', name: 'Dynamic Memory Allocation', desc: 'Free-store concepts, heap versus stack memory, dynamic allocation using new and delete, new[] and delete[], memory-leak prevention, dangling-pointer mitigation and dynamic-array handling.' },
    { id: 8, chapter_code: 'CHP 1.8', name: 'Structures & User-Defined Types', desc: 'Structure definition and declaration, member access using dot and arrow operators, structure pointers, nested structures, arrays of structures, structure parameters, union memory layouts and enum types.' },
    { id: 9, chapter_code: 'CHP 1.9', name: 'Object-Oriented Principles & Classes', desc: 'Core OOP principles including abstraction, encapsulation, data hiding, inheritance and polymorphism; class syntax, member variables and functions, private/public/protected access specifiers, scope resolution and static members.' },
    { id: 10, chapter_code: 'CHP 1.10', name: 'Constructors & Object Lifecycle', desc: 'Default, parameterized and copy constructors, shallow versus deep copy, initialization lists, constructor overloading, destructor execution order and dynamic object initialization.' },
    { id: 11, chapter_code: 'CHP 1.11', name: 'Inheritance Architectures', desc: 'Base and derived classes, public/protected/private inheritance, single, multiple, multilevel, hierarchical and hybrid inheritance, the diamond problem, virtual base classes and base-constructor execution order.' },
    { id: 12, chapter_code: 'CHP 1.12', name: 'Polymorphism, Virtual Functions & Streams', desc: 'Function and operator overloading, compile-time versus run-time polymorphism, virtual and pure virtual functions, abstract classes, dynamic binding through vtable/vptr, C++ file streams using ifstream, ofstream and fstream, and file-pointer navigation using seekg, seekp, tellg and tellp.' },
  ],
  cn: [
    { id: 1, name: 'Introduction to Networks', desc: 'Network basics and fundamentals' },
    { id: 2, name: 'OSI Model', desc: 'Seven layer OSI model deep dive' },
    { id: 3, name: 'TCP/IP Protocol', desc: 'TCP/IP stack and protocols' },
    { id: 4, name: 'Network Security', desc: 'Firewalls, encryption and security' },
  ],
  ph: [
    { id: 1, name: 'Mechanics', desc: 'Motion, forces and energy' },
    { id: 2, name: 'Thermodynamics', desc: 'Heat, energy and systems' },
    { id: 3, name: 'Electromagnetism', desc: 'Electric and magnetic fields' },
    { id: 4, name: 'Optics', desc: 'Light and wave properties' },
  ],
  ch: [
    { id: 1, name: 'Atomic Structure', desc: 'Atoms and periodic table' },
    { id: 2, name: 'Bonding', desc: 'Ionic, covalent and metallic bonding' },
    { id: 3, name: 'Organic Chemistry', desc: 'Carbon compounds and reactions' },
    { id: 4, name: 'Chemical Reactions', desc: 'Equations and balancing' },
  ],
  bio: [
    { id: 1, name: 'Cell Biology', desc: 'Cell structure and function' },
    { id: 2, name: 'Genetics', desc: 'DNA, heredity and evolution' },
    { id: 3, name: 'Ecology', desc: 'Ecosystems and biodiversity' },
    { id: 4, name: 'Human Physiology', desc: 'Body systems and functions' },
  ],
}

export const allChapters = [
  { name: 'Introduction to Networks', subject: 'Computer Networks', desc: 'Network basics and fundamentals', mcqs: 20, flashcards: 15, status: 'success', statusText: 'Active' },
  { name: 'OSI Model', subject: 'Computer Networks', desc: 'Seven layer OSI model deep dive', mcqs: 25, flashcards: 18, status: 'success', statusText: 'Active' },
  { name: 'Thermodynamics', subject: 'Physics', desc: 'Heat, energy and thermodynamic systems', mcqs: 30, flashcards: 22, status: 'success', statusText: 'Active' },
  { name: 'Electromagnetism', subject: 'Physics', desc: 'Electric and magnetic fields', mcqs: 28, flashcards: 20, status: 'warning', statusText: 'Draft' },
]

export const mcqRows = [
  { question: 'What is a subnet mask?', chapter: 'Intro to Networks', subject: 'Computer Networks', difficulty: 'success', difficultyText: 'Easy', attempts: '2,340', accuracy: '87%' },
  { question: 'Explain the function of TCP', chapter: 'OSI Model', subject: 'Computer Networks', difficulty: 'warning', difficultyText: 'Medium', attempts: '1,890', accuracy: '62%' },
]

export const flashcardCards = [
  { subject: 'Computer Networks', chapter: 'Intro to Networks', front: 'What is bandwidth?', back: 'The maximum rate of data transfer across a network path', views: '1,240 views' },
]

export const analyticsSummary = [
  { value: '8', label: 'Total Subjects' },
  { value: '62', label: 'Total Chapters' },
  { value: '1,240', label: 'Total MCQs' },
  { value: '856', label: 'Total Flashcards' },
]

export const subjectBreakdown = [
  { subject: 'Computer Networks', chapters: 10, mcqs: 200, flashcards: 150, quality: '8.7/10', status: 'success', statusText: 'Complete' },
  { subject: 'Physics', chapters: 12, mcqs: 280, flashcards: 220, quality: '8.4/10', status: 'success', statusText: 'Complete' },
  { subject: 'Chemistry', chapters: 14, mcqs: 320, flashcards: 250, quality: '8.2/10', status: 'success', statusText: 'Complete' },
  { subject: 'Biology', chapters: 16, mcqs: 340, flashcards: 280, quality: '8.1/10', status: 'success', statusText: 'Complete' },
]

export const qualityMetrics = [
  { value: '340', label: 'Hard Difficulty' },
  { value: '620', label: 'Medium Difficulty' },
  { value: '280', label: 'Easy Difficulty' },
  { value: '72.3%', label: 'Avg Accuracy Rate' },
]