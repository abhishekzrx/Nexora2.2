/**
 * McqManager
 * Enterprise AI Question Manager with workflow: Generate → Preview → Inject
 */
import { useMemo, useState, useCallback } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { useAdminStore, injectMcqs, getChaptersBySubject } from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { showToast } from '../../data/feedbackStore'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const LANGUAGES = ['English', 'Hindi']
const QUESTION_TYPES = ['MCQ', 'True/False']
const COGNITIVE_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze']
const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

const MCQ_TEMPLATES = {
  'Computer Networks': {
    'Introduction to Networks': [
      { q: 'What is the primary function of a router in a computer network?', options: ['Connect devices within a LAN', 'Route packets between different networks', 'Store network data', 'Encrypt network traffic'], correct: 'B' },
      { q: 'Which topology connects all devices to a central hub?', options: ['Bus', 'Ring', 'Star', 'Mesh'], correct: 'C' },
      { q: 'What does LAN stand for?', options: ['Local Area Network', 'Large Area Network', 'Long Access Node', 'Logical Area Network'], correct: 'A' },
      { q: 'Which device operates at the Physical layer of the OSI model?', options: ['Router', 'Switch', 'Hub', 'Gateway'], correct: 'C' },
      { q: 'What is the maximum length of a standard Ethernet cable segment?', options: ['100 meters', '500 meters', '1000 meters', '50 meters'], correct: 'A' },
    ],
    'OSI Model': [
      { q: 'How many layers are there in the OSI model?', options: ['5', '6', '7', '8'], correct: 'C' },
      { q: 'Which layer is responsible for routing and logical addressing?', options: ['Data Link', 'Network', 'Transport', 'Session'], correct: 'B' },
      { q: 'TCP operates at which OSI layer?', options: ['Network', 'Transport', 'Session', 'Application'], correct: 'B' },
      { q: 'Which layer ensures reliable data transfer?', options: ['Physical', 'Data Link', 'Network', 'Transport'], correct: 'D' },
      { q: 'At which layer does encryption typically occur?', options: ['Physical', 'Data Link', 'Network', 'Presentation'], correct: 'D' },
    ],
    'TCP/IP Protocol': [
      { q: 'Which protocol is connection-oriented?', options: ['UDP', 'TCP', 'ICMP', 'IP'], correct: 'B' },
      { q: 'What is the default port number for HTTP?', options: ['21', '80', '443', '25'], correct: 'B' },
      { q: 'Which protocol is used for email transmission?', options: ['FTP', 'SMTP', 'HTTP', 'SNMP'], correct: 'B' },
      { q: 'What does IP stand for?', options: ['Internet Protocol', 'Internal Process', 'Integrated Path', 'Interlayer Package'], correct: 'A' },
      { q: 'Which layer of the TCP/IP model corresponds to the OSI Network layer?', options: ['Application', 'Transport', 'Internet', 'Link'], correct: 'C' },
    ],
    'Network Security': [
      { q: 'Which algorithm is symmetric?', options: ['RSA', 'AES', 'ECC', 'DSA'], correct: 'B' },
      { q: 'What does VPN stand for?', options: ['Virtual Private Network', 'Very Personal Network', 'Verified Private Node', 'Vector Protected Network'], correct: 'A' },
      { q: 'Which protocol secures web traffic?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correct: 'C' },
      { q: 'What type of attack floods a server with traffic?', options: ['Phishing', 'DDoS', 'Malware', 'SQL Injection'], correct: 'B' },
      { q: 'Which is an example of a firewall?', options: ['Antivirus', 'Packet filter', 'Encryption key', 'Digital signature'], correct: 'B' },
    ],
  },
  Physics: {
    Mechanics: [
      { q: 'What is the SI unit of force?', options: ['Joule', 'Newton', 'Pascal', 'Watt'], correct: 'B' },
      { q: 'Which law states that for every action there is an equal and opposite reaction?', options: ['Newton\'s First Law', 'Newton\'s Second Law', 'Newton\'s Third Law', 'Law of Conservation'], correct: 'C' },
      { q: 'What is the acceleration due to gravity on Earth?', options: ['9.8 m/s²', '10 m/s²', '8.9 m/s²', '9.81 m/s²'], correct: 'A' },
      { q: 'Which quantity is a vector?', options: ['Mass', 'Temperature', 'Velocity', 'Time'], correct: 'C' },
      { q: 'What is the formula for kinetic energy?', options: ['mgh', '1/2 mv²', 'mv', 'Fd'], correct: 'B' },
    ],
    Thermodynamics: [
      { q: 'What is the first law of thermodynamics also known as?', options: ['Zeroth Law', 'Law of Conservation of Energy', 'Entropy Law', 'Carnot Principle'], correct: 'B' },
      { q: 'Which process occurs at constant temperature?', options: ['Isobaric', 'Isochoric', 'Isothermal', 'Adiabatic'], correct: 'C' },
      { q: 'What is the unit of entropy?', options: ['Joule', 'Joule/Kelvin', 'Watt', 'Pascal'], correct: 'B' },
      { q: 'Which law states that entropy of an isolated system always increases?', options: ['First Law', 'Second Law', 'Third Law', 'Zeroth Law'], correct: 'B' },
      { q: 'A Carnot engine operates between temperatures 400K and 300K. What is its efficiency?', options: ['25%', '30%', '33%', '50%'], correct: 'A' },
    ],
    Electromagnetism: [
      { q: 'What is the unit of electric current?', options: ['Volt', 'Ohm', 'Ampere', 'Watt'], correct: 'C' },
      { q: 'Which law relates current, voltage and resistance?', options: ['Faraday\'s Law', 'Ohm\'s Law', 'Coulomb\'s Law', 'Ampere\'s Law'], correct: 'B' },
      { q: 'What is the magnetic field inside a long straight solenoid?', options: ['Zero', 'Uniform and parallel to axis', 'Circular around wires', 'Radially outward'], correct: 'B' },
      { q: 'Which particle is responsible for electric current in metals?', options: ['Proton', 'Neutron', 'Electron', 'Photon'], correct: 'C' },
      { q: 'What does Lenz\'s law describe?', options: ['Direction of induced EMF', 'Magnetic field strength', 'Ohmic resistance', 'Capacitance'], correct: 'A' },
    ],
    Optics: [
      { q: 'What is the speed of light in vacuum?', options: ['3 × 10⁸ m/s', '3 × 10⁶ m/s', '3 × 10¹⁰ m/s', '3 × 10⁴ m/s'], correct: 'A' },
      { q: 'Which phenomenon causes a rainbow?', options: ['Reflection', 'Refraction and Dispersion', 'Diffraction', 'Interference'], correct: 'B' },
      { q: 'What is the focal length of a plane mirror?', options: ['Zero', 'Infinity', 'Equal to radius', 'Half the radius'], correct: 'B' },
      { q: 'Which lens is used to correct myopia?', options: ['Convex', 'Concave', 'Cylindrical', 'Bifocal'], correct: 'B' },
      { q: 'Total internal reflection occurs when light travels from?', options: ['Air to water', 'Water to air', 'Glass to water', 'Air to glass'], correct: 'B' },
    ],
  },
  Chemistry: {
    'Atomic Structure': [
      { q: 'Who proposed the Bohr model of the atom?', options: ['Rutherford', 'Bohr', 'Thomson', 'Dalton'], correct: 'B' },
      { q: 'What is the atomic number of Carbon?', options: ['4', '6', '8', '12'], correct: 'B' },
      { q: 'Which subatomic particle has no charge?', options: ['Electron', 'Proton', 'Neutron', 'Positron'], correct: 'C' },
      { q: 'What is the mass number of an atom with 6 protons and 7 neutrons?', options: ['6', '7', '13', '1'], correct: 'C' },
      { q: 'Which orbital can hold a maximum of 2 electrons?', options: ['s', 'p', 'd', 'f'], correct: 'A' },
    ],
    Bonding: [
      { q: 'What type of bond is formed by sharing electrons?', options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'], correct: 'B' },
      { q: 'Which compound has an ionic bond?', options: ['H₂O', 'NaCl', 'CO₂', 'CH₄'], correct: 'B' },
      { q: 'What is the bond angle in water?', options: ['90°', '104.5°', '109.5°', '120°'], correct: 'B' },
      { q: 'Which force is weakest?', options: ['Ionic bond', 'Covalent bond', 'Hydrogen bond', 'Metallic bond'], correct: 'C' },
      { q: 'What type of hybridization occurs in methane?', options: ['sp', 'sp²', 'sp³', 'sp³d'], correct: 'C' },
    ],
    'Organic Chemistry': [
      { q: 'What is the general formula for alkanes?', options: ['CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙHₙ'], correct: 'B' },
      { q: 'Which functional group is present in alcohols?', options: ['-COOH', '-OH', '-CHO', '-CO-'], correct: 'B' },
      { q: 'What is the IUPAC name of CH₃CH₂OH?', options: ['Methanol', 'Ethanol', 'Propanol', 'Butanol'], correct: 'B' },
      { q: 'Benzene has how many carbon atoms?', options: ['4', '5', '6', '7'], correct: 'C' },
      { q: 'Which is a saturated hydrocarbon?', options: ['Ethene', 'Ethyne', 'Ethane', 'Benzene'], correct: 'C' },
    ],
    'Chemical Reactions': [
      { q: 'What is a balanced chemical equation?', options: ['Equal atoms on both sides', 'Equal mass on both sides', 'Equal volume on both sides', 'Equal moles on both sides'], correct: 'A' },
      { q: 'Which type of reaction is: A + B → AB?', options: ['Decomposition', 'Combination', 'Displacement', 'Double displacement'], correct: 'B' },
      { q: 'What is the limiting reagent?', options: ['Reactant present in excess', 'Reactant completely consumed first', 'Product formed in least amount', 'Catalyst'], correct: 'B' },
      { q: 'In a redox reaction, oxidation involves?', options: ['Gain of electrons', 'Loss of electrons', 'Gain of protons', 'Loss of neutrons'], correct: 'B' },
      { q: 'What is the stoichiometric coefficient?', options: ['Molar mass', 'Number in balanced equation', 'Avogadro number', 'Gas constant'], correct: 'B' },
    ],
  },
  Biology: {
    'Cell Biology': [
      { q: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 'C' },
      { q: 'Which organelle is responsible for photosynthesis?', options: ['Mitochondria', 'Chloroplast', 'Ribosome', 'Nucleus'], correct: 'B' },
      { q: 'What is the basic unit of life?', options: ['Atom', 'Molecule', 'Cell', 'Tissue'], correct: 'C' },
      { q: 'Which structure controls cell activities?', options: ['Cytoplasm', 'Cell membrane', 'Nucleus', 'Mitochondria'], correct: 'C' },
      { q: 'Plant cells have which organelle that animal cells lack?', options: ['Mitochondria', 'Ribosome', 'Cell wall', 'Nucleus'], correct: 'C' },
    ],
    Genetics: [
      { q: 'What is the basic unit of heredity?', options: ['Chromosome', 'Gene', 'DNA', 'Protein'], correct: 'B' },
      { q: 'Who is known as the father of genetics?', options: ['Darwin', 'Mendel', 'Watson', 'Crick'], correct: 'B' },
      { q: 'DNA stands for?', options: ['Dinitrogen Acid', 'Deoxyribonucleic Acid', 'Dinucleotide Acid', 'Deoxyribose Nucleic Acid'], correct: 'B' },
      { q: 'How many chromosomes do humans have?', options: ['23', '46', '44', '48'], correct: 'B' },
      { q: 'Which base pairs with Adenine in DNA?', options: ['Guanine', 'Cytosine', 'Thymine', 'Uracil'], correct: 'C' },
    ],
    Ecology: [
      { q: 'What is an ecosystem?', options: ['A group of organisms', 'Interaction of organisms with environment', 'A single species', 'A habitat'], correct: 'B' },
      { q: 'Which is a producer in an ecosystem?', options: ['Herbivore', 'Carnivore', 'Plant', 'Decomposer'], correct: 'C' },
      { q: 'What percentage of energy is transferred from one trophic level to the next?', options: ['10%', '50%', '90%', '1%'], correct: 'A' },
      { q: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correct: 'C' },
      { q: 'What is biodiversity?', options: ['Variety of life forms', 'Number of species', 'Biomass', 'Population size'], correct: 'A' },
    ],
    'Human Physiology': [
      { q: 'Which organ pumps blood?', options: ['Lungs', 'Kidney', 'Heart', 'Liver'], correct: 'C' },
      { q: 'What is the largest organ in the human body?', options: ['Liver', 'Brain', 'Skin', 'Heart'], correct: 'C' },
      { q: 'Which blood cells fight infection?', options: ['RBC', 'WBC', 'Platelets', 'Plasma'], correct: 'B' },
      { q: 'What is the normal human body temperature?', options: ['36°C', '37°C', '38°C', '35°C'], correct: 'B' },
      { q: 'Which part of the brain controls breathing?', options: ['Cerebrum', 'Cerebellum', 'Medulla oblongata', 'Thalamus'], correct: 'C' },
    ],
  },
}

function getFallbackTemplates(subject) {
  const map = {
    'Computer Networks': MCQ_TEMPLATES['Computer Networks'],
    Physics: MCQ_TEMPLATES.Physics,
    Chemistry: MCQ_TEMPLATES.Chemistry,
    Biology: MCQ_TEMPLATES.Biology,
  }
  return map[subject] || Object.values(MCQ_TEMPLATES)[0] || {}
}

function generateMockMcqs(subject, chapter, count, opts = {}) {
  const templates = getFallbackTemplates(subject)
  const chapterTemplates = templates[chapter] || Object.values(templates)[0] || []
  const records = []
  const used = new Set()
  let idx = 0
  while (records.length < count) {
    const tpl = chapterTemplates[idx % chapterTemplates.length]
    if (!tpl) break
    idx++
    if (used.has(tpl.q)) continue
    used.add(tpl.q)
    records.push({
      question: tpl.q,
      optionA: tpl.options[0],
      optionB: tpl.options[1],
      optionC: tpl.options[2],
      optionD: tpl.options[3],
      correctAnswer: tpl.correct,
      explanation: opts.explanation || `This question tests your understanding of ${subject} - ${chapter}.`,
      difficulty: opts.difficulty || 'Easy',
      subject,
      chapter,
    })
  }
  return records
}

function McqFormFields({ form, setForm, subjects, courseId, onGenerate }) {
  const subjectList = subjects
  const chapterList = useMemo(() => {
    if (!form.subject) return []
    return getChaptersBySubject(form.subject)
  }, [form.subject])

  return (
    <div className="mcq-manager-form-card">
      <div className="mcq-manager-form-row">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Course</label>
          <input className="mcq-manager-form-input" readOnly value={courseId || ''} />
        </div>
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Subject</label>
          <select className="mcq-manager-form-select" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '' }))}>
            <option value="">Select Subject</option>
            {subjectList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="mcq-manager-form-row">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Chapter</label>
          <select className="mcq-manager-form-select" value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} disabled={!form.subject}>
            <option value="">Select Chapter</option>
            {chapterList.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Exam</label>
          <input className="mcq-manager-form-input" value={form.exam} onChange={(e) => setForm((f) => ({ ...f, exam: e.target.value }))} placeholder="e.g., Mid-Term" />
        </div>
      </div>
      <div className="mcq-manager-form-row">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Difficulty</label>
          <select className="mcq-manager-form-select" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Language</label>
          <select className="mcq-manager-form-select" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="mcq-manager-form-row">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Question Count</label>
          <input type="number" className="mcq-manager-form-input" min={1} max={50} value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))} />
        </div>
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Question Type</label>
          <select className="mcq-manager-form-select" value={form.questionType} onChange={(e) => setForm((f) => ({ ...f, questionType: e.target.value }))}>
            {QUESTION_TYPES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>
      <div className="mcq-manager-form-row">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Cognitive Level</label>
          <select className="mcq-manager-form-select" value={form.cognitiveLevel} onChange={(e) => setForm((f) => ({ ...f, cognitiveLevel: e.target.value }))}>
            {COGNITIVE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Topic Weightage</label>
          <input className="mcq-manager-form-input" value={form.topicWeightage} onChange={(e) => setForm((f) => ({ ...f, topicWeightage: e.target.value }))} placeholder="e.g., 30%" />
        </div>
      </div>

      {form.showOptional && (
        <div className="mcq-manager-optional-grid">
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Target Exam</label>
            <input className="mcq-manager-form-input" value={form.targetExam} onChange={(e) => setForm((f) => ({ ...f, targetExam: e.target.value }))} />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Exam Year</label>
            <input className="mcq-manager-form-input" value={form.examYear} onChange={(e) => setForm((f) => ({ ...f, examYear: e.target.value }))} placeholder="e.g., 2025" />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Bloom Level</label>
            <select className="mcq-manager-form-select" value={form.bloomLevel} onChange={(e) => setForm((f) => ({ ...f, bloomLevel: e.target.value }))}>
              <option value="">Select</option>
              {BLOOM_LEVELS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Difficulty Distribution</label>
            <input className="mcq-manager-form-input" value={form.difficultyDistribution} onChange={(e) => setForm((f) => ({ ...f, difficultyDistribution: e.target.value }))} placeholder="e.g., 30% Easy, 50% Medium, 20% Hard" />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Negative Marking</label>
            <input className="mcq-manager-form-input" value={form.negativeMarking} onChange={(e) => setForm((f) => ({ ...f, negativeMarking: e.target.value }))} placeholder="e.g., 0.25" />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Question Style</label>
            <input className="mcq-manager-form-input" value={form.questionStyle} onChange={(e) => setForm((f) => ({ ...f, questionStyle: e.target.value }))} placeholder="e.g., Conceptual" />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Concept Weight</label>
            <input className="mcq-manager-form-input" value={form.conceptWeight} onChange={(e) => setForm((f) => ({ ...f, conceptWeight: e.target.value }))} placeholder="e.g., High" />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Time Limit (sec)</label>
            <input type="number" className="mcq-manager-form-input" value={form.timeLimit} onChange={(e) => setForm((f) => ({ ...f, timeLimit: Number(e.target.value) }))} />
          </div>
          <div className="mcq-manager-form-field">
            <label className="mcq-manager-form-label">Expected Student Level</label>
            <input className="mcq-manager-form-input" value={form.expectedStudentLevel} onChange={(e) => setForm((f) => ({ ...f, expectedStudentLevel: e.target.value }))} placeholder="e.g., Beginner" />
          </div>
        </div>
      )}

      <div className="mcq-manager-form-row full">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Prompt Notes</label>
          <textarea className="mcq-manager-form-textarea" value={form.promptNotes} onChange={(e) => setForm((f) => ({ ...f, promptNotes: e.target.value }))} placeholder="Additional guidance for AI generation..." />
        </div>
      </div>
      <div className="mcq-manager-form-row full">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Explanation</label>
          <textarea className="mcq-manager-form-textarea" value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} placeholder="Explanation template for generated MCQs..." />
        </div>
      </div>
      <div className="mcq-manager-form-row full">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Memory Tips</label>
          <textarea className="mcq-manager-form-textarea" value={form.memoryTips} onChange={(e) => setForm((f) => ({ ...f, memoryTips: e.target.value }))} placeholder="Memory tips to include..." />
        </div>
      </div>
      <div className="mcq-manager-form-row full">
        <div className="mcq-manager-form-field">
          <label className="mcq-manager-form-label">Short Tricks</label>
          <textarea className="mcq-manager-form-textarea" value={form.shortTricks} onChange={(e) => setForm((f) => ({ ...f, shortTricks: e.target.value }))} placeholder="Short tricks to include..." />
        </div>
      </div>

      <div className="mcq-manager-optional-toggle" onClick={() => setForm((f) => ({ ...f, showOptional: !f.showOptional }))}>
        <AppIcon name={form.showOptional ? 'chevronDown' : 'chevronRight'} size={16} />
        {form.showOptional ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
      </div>

      <div className="mcq-manager-form-actions">
        <Button variant="primary" onClick={onGenerate} disabled={!form.subject || !form.chapter}>
          <AppIcon name="aiCoach" size={16} /> Generate Preview
        </Button>
      </div>
    </div>
  )
}

function PreviewMcqCard({ item, index, onUpdate, onRemove }) {
  const letters = ['A', 'B', 'C', 'D']
  return (
    <div className="mcq-manager-card">
      <div className="mcq-manager-card-header">
        <span className="mcq-manager-card-index">Q{index + 1}</span>
        <div className="mcq-manager-card-actions">
          <button type="button" className="mcq-manager-card-action danger" onClick={() => onRemove(item.id)} aria-label="Remove">
            <AppIcon name="close" size={14} />
          </button>
        </div>
      </div>
      <textarea className="mcq-manager-card-question-input" value={item.question} onChange={(e) => onUpdate(item.id, { question: e.target.value })} rows={2} />
      <div className="mcq-manager-options-grid">
        {letters.map((letter, _i) => {
          const optionKey = `option${letter}`
          return (
            <div key={letter} className={`mcq-manager-option${item.correctAnswer === letter ? ' selected' : ''}`} onClick={() => onUpdate(item.id, { correctAnswer: letter })}>
              <span className="mcq-manager-option-badge">{letter}</span>
              <input className="mcq-manager-option-input" value={item[optionKey]} onChange={(e) => onUpdate(item.id, { [optionKey]: e.target.value })} onClick={(e) => e.stopPropagation()} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function McqManager({ onBack }) {
  const { activeWorkspaceId: activeCourseId } = useWorkspaceStore()
  const subjects = useAdminStore().subjects
  const [form, setForm] = useState({
    subject: '',
    chapter: '',
    exam: '',
    difficulty: 'Easy',
    language: 'English',
    count: 10,
    questionType: 'MCQ',
    cognitiveLevel: 'Remember',
    topicWeightage: '',
    targetExam: '',
    examYear: '',
    bloomLevel: '',
    difficultyDistribution: '',
    negativeMarking: '',
    questionStyle: '',
    conceptWeight: '',
    timeLimit: '',
    expectedStudentLevel: '',
    promptNotes: '',
    explanation: '',
    memoryTips: '',
    shortTricks: '',
    showOptional: false,
  })
  const [preview, setPreview] = useState([])
  const [showConfirmInject, setShowConfirmInject] = useState(false)

  const handleGenerate = useCallback(() => {
    setTimeout(() => {
      const records = generateMockMcqs(form.subject, form.chapter, form.count, {
        difficulty: form.difficulty,
        explanation: form.explanation,
      })
      setPreview(records.map((r, i) => ({ ...r, id: `preview-mcq-${Date.now()}-${i}` })))
    }, 600)
  }, [form])

  const handleUpdatePreview = useCallback((id, patch) => {
    setPreview((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const handleRemovePreview = useCallback((id) => {
    setPreview((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleInject = useCallback(() => {
    if (preview.length === 0) return
    setShowConfirmInject(true)
  }, [preview.length])

  const confirmInject = useCallback(() => {
    setShowConfirmInject(false)
    const records = preview.map(({ id: _id, ...rest }) => rest)
    const result = injectMcqs(records)
    showToast({
      type: 'success',
      title: 'MCQs Injected',
      message: `${result.imported} MCQs Injected` + (result.duplicates > 0 ? ` | ${result.duplicates} duplicates skipped` : '') + (result.failed > 0 ? ` | ${result.failed} failed` : ''),
      duration: 4000,
    })
    setPreview([])
  }, [preview])

  return (
    <div className="mcq-manager-shell">
      <div className="mcq-manager-header">
        <div className="mcq-manager-title">
          <span className="mcq-manager-title-icon"><AppIcon name="quiz" size={18} /></span>
          MCQ Manager
        </div>
        {onBack && (
          <button type="button" className="admin-back-link" onClick={onBack}><AppIcon name="back" size={16} />Back</button>
        )}
      </div>

      <McqFormFields form={form} setForm={setForm} subjects={subjects} courseId={activeCourseId} onGenerate={handleGenerate} />

      <div className="mcq-manager-preview">
        <div className="mcq-manager-preview-header">
          <div className="mcq-manager-preview-title">
            <AppIcon name="viewList" size={16} /> Preview
            {preview.length > 0 && <span className="mcq-manager-preview-count">{preview.length}</span>}
          </div>
          {preview.length > 0 && (
            <Button variant="soft" onClick={handleInject}>
              <AppIcon name="upload" size={16} /> Inject MCQs
            </Button>
          )}
        </div>
        {preview.length === 0 ? (
          <div className="mcq-manager-preview-empty">
            <AppIcon name="quiz" size={28} />
            <p>Generate a preview to review questions before injection</p>
          </div>
        ) : (
          preview.map((item, i) => (
            <PreviewMcqCard key={item.id} item={item} index={i} onUpdate={handleUpdatePreview} onRemove={handleRemovePreview} />
          ))
        )}
      </div>

      {preview.length > 0 && (
        <div className="mcq-manager-inject-bar">
          <div className="mcq-manager-inject-info">
            Ready to inject <strong>{preview.length} MCQs</strong> into <strong>{form.subject} → {form.chapter}</strong>
          </div>
          <Button variant="primary" onClick={handleInject}>
            <AppIcon name="upload" size={16} /> Inject MCQs
          </Button>
        </div>
      )}

      {showConfirmInject && (
        <div className="mcq-manager-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmInject(false) }}>
          <div className="mcq-manager-confirm">
            <div className="mcq-manager-confirm-title">Inject MCQs?</div>
            <p className="mcq-manager-confirm-message">
              You are about to inject {preview.length} MCQs into <strong>{form.subject} → {form.chapter}</strong>. Duplicates will be skipped automatically.
            </p>
            <div className="mcq-manager-confirm-actions">
              <Button variant="secondary" onClick={() => setShowConfirmInject(false)}>Cancel</Button>
              <Button variant="primary" onClick={confirmInject}>Confirm Inject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
