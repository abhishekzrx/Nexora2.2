/**
 * FlashcardManager
 * AI-powered Flashcard generation, preview and injection.
 */
import { useMemo, useState, useCallback } from 'react'
import Button from '../ui/Button'
import AppIcon from '../ui/AppIcon'
import { useAdminStore, getChaptersBySubject } from '../../data/adminStore'
import { useWorkspaceStore } from '../../data/workspaceStore'
import { showToast } from '../../data/feedbackStore'
import { mcqService } from '../../services/mcqService'
import { useMemberStore } from '../../data/memberStore'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const FLASHCARD_TEMPLATES = {
  'Computer Networks': {
    'Introduction to Networks': [
      { front: 'What is a computer network?', back: 'A group of interconnected devices that communicate and share resources.' },
      { front: 'Define bandwidth.', back: 'The maximum rate of data transfer across a network path, measured in bits per second.' },
      { front: 'What is a node in networking?', back: 'Any device connected to a network, such as a computer, printer, or router.' },
      { front: 'What is latency?', back: 'The delay between sending data and receiving a response, usually measured in milliseconds.' },
      { front: 'What is throughput?', back: 'The actual amount of data successfully transmitted over a network in a given time.' },
    ],
    'OSI Model': [
      { front: 'What does OSI stand for?', back: 'Open Systems Interconnection — a conceptual model for network communications.' },
      { front: 'Name the 7 layers of the OSI model.', back: 'Physical, Data Link, Network, Transport, Session, Presentation, Application.' },
      { front: 'Which OSI layer is responsible for routing?', back: 'The Network Layer (Layer 3).' },
      { front: 'At which layer does TCP operate?', back: 'Transport Layer (Layer 4).' },
      { front: 'What is the function of the Presentation layer?', back: 'Translation, encryption, and compression of data.' },
    ],
    'TCP/IP Protocol': [
      { front: 'What does TCP stand for?', back: 'Transmission Control Protocol — a connection-oriented protocol for reliable data transfer.' },
      { front: 'What does IP stand for?', back: 'Internet Protocol — responsible for addressing and routing packets.' },
      { front: 'What is the default port for HTTPS?', back: '443.' },
      { front: 'Difference between TCP and UDP?', back: 'TCP is connection-oriented and reliable; UDP is connectionless and faster but unreliable.' },
      { front: 'What is a socket?', back: 'An endpoint for sending or receiving data across a network, defined by an IP address and port number.' },
    ],
    'Network Security': [
      { front: 'What is a firewall?', back: 'A security device that monitors and filters incoming and outgoing network traffic.' },
      { front: 'Define encryption.', back: 'The process of converting data into a coded form to prevent unauthorized access.' },
      { front: 'What is a DDoS attack?', back: 'Distributed Denial of Service — flooding a server with traffic from multiple sources.' },
      { front: 'What does SSL/TLS provide?', back: 'Secure communication over a computer network through encryption.' },
      { front: 'What is phishing?', back: 'A social engineering attack to trick users into revealing sensitive information.' },
    ],
  },
  Physics: {
    Mechanics: [
      { front: 'What is Newton\'s First Law?', back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.' },
      { front: 'What is the formula for acceleration?', back: 'a = (v - u) / t, where v is final velocity, u is initial velocity, and t is time.' },
      { front: 'Define momentum.', back: 'The product of mass and velocity: p = mv.' },
      { front: 'What is the SI unit of energy?', back: 'Joule (J).' },
      { front: 'What is projectile motion?', back: 'The motion of an object thrown into the air, subject to only the acceleration of gravity.' },
    ],
    Thermodynamics: [
      { front: 'What is the Zeroth Law of Thermodynamics?', back: 'If two systems are each in thermal equilibrium with a third system, they are in thermal equilibrium with each other.' },
      { front: 'What is entropy?', back: 'A measure of disorder or randomness in a system; it always increases in an isolated system.' },
      { front: 'What is specific heat capacity?', back: 'The amount of heat required to raise the temperature of 1 gram of a substance by 1°C.' },
      { front: 'What is an adiabatic process?', back: 'A process in which no heat is exchanged between the system and its surroundings.' },
      { front: 'What is Carnot efficiency?', back: 'The maximum possible efficiency of a heat engine operating between two temperatures.' },
    ],
    Electromagnetism: [
      { front: 'What is Coulomb\'s Law?', back: 'The force between two charges is proportional to the product of charges and inversely proportional to the square of the distance between them.' },
      { front: 'What is Faraday\'s Law?', back: 'The induced EMF in a circuit is equal to the rate of change of magnetic flux through it.' },
      { front: 'Define electric current.', back: 'The flow of electric charge, measured in amperes (A).' },
      { front: 'What is Lenz\'s Law?', back: 'The direction of induced current opposes the change in magnetic flux that produced it.' },
      { front: 'What is Ohm\'s Law?', back: 'V = IR — voltage equals current times resistance.' },
    ],
    Optics: [
      { front: 'What is refraction?', back: 'The bending of light as it passes from one medium to another with a different density.' },
      { front: 'What is Snell\'s Law?', back: 'n₁ sin θ₁ = n₂ sin θ₂ — describes the relationship between angles of incidence and refraction.' },
      { front: 'What is total internal reflection?', back: 'Complete reflection of light back into a medium when it hits the boundary at an angle greater than the critical angle.' },
      { front: 'What is a convex lens?', back: 'A lens that converges light rays to a focal point; thicker in the middle than at the edges.' },
      { front: 'What is the dispersion of light?', back: 'The splitting of white light into its constituent colors due to different wavelengths refracting by different amounts.' },
    ],
  },
  Chemistry: {
    'Atomic Structure': [
      { front: 'What is an atom?', back: 'The smallest unit of an element that retains the chemical properties of that element.' },
      { front: 'Who discovered the electron?', back: 'J.J. Thomson in 1897 using cathode ray tube experiments.' },
      { front: 'What is the Aufbau principle?', back: 'Electrons fill atomic orbitals of the lowest available energy levels before occupying higher levels.' },
      { front: 'What is the Heisenberg Uncertainty Principle?', back: 'It is impossible to simultaneously know both the exact position and exact momentum of an electron.' },
      { front: 'What are isotopes?', back: 'Atoms of the same element with the same number of protons but different numbers of neutrons.' },
    ],
    Bonding: [
      { front: 'What is an ionic bond?', back: 'A chemical bond formed through the electrostatic attraction between oppositely charged ions.' },
      { front: 'What is a covalent bond?', back: 'A chemical bond formed by the sharing of electron pairs between atoms.' },
      { front: 'What is electronegativity?', back: 'A measure of an atom\'s ability to attract electrons in a chemical bond.' },
      { front: 'What is a hydrogen bond?', back: 'A weak attraction between a hydrogen atom bonded to a highly electronegative atom and another electronegative atom.' },
      { front: 'What is hybridization?', back: 'The concept of mixing atomic orbitals to form new hybrid orbitals suitable for bonding.' },
    ],
    'Organic Chemistry': [
      { front: 'What is an alkane?', back: 'A saturated hydrocarbon with only single bonds between carbon atoms; general formula CnH₂n₊₂.' },
      { front: 'What is a functional group?', back: 'A specific group of atoms within a molecule that is responsible for the characteristic chemical reactions.' },
      { front: 'What is isomerism?', back: 'The phenomenon where compounds have the same molecular formula but different structural arrangements.' },
      { front: 'What is aromaticity?', back: 'A property of cyclic, planar structures with delocalized pi electrons following Hückel\'s rule (4n+2).' },
      { front: 'What is a substitution reaction?', back: 'A reaction where one functional group in a chemical compound is replaced by another functional group.' },
    ],
    'Chemical Reactions': [
      { front: 'What is a balanced chemical equation?', back: 'An equation where the number of atoms of each element is the same on both sides of the equation.' },
      { front: 'What is a catalyst?', back: 'A substance that increases the rate of a chemical reaction without being consumed.' },
      { front: 'What is oxidation?', back: 'Loss of electrons, gain of oxygen, or loss of hydrogen in a chemical reaction.' },
      { front: 'What is an exothermic reaction?', back: 'A reaction that releases energy, usually in the form of heat.' },
      { front: 'What is the limiting reagent?', back: 'The reactant that is completely consumed first and limits the amount of product formed.' },
    ],
  },
  Biology: {
    'Cell Biology': [
      { front: 'What is the cell theory?', back: 'All living organisms are composed of cells, and the cell is the basic unit of life.' },
      { front: 'What is the function of mitochondria?', back: 'Powerhouse of the cell — produces ATP through cellular respiration.' },
      { front: 'What is the Golgi apparatus?', back: 'An organelle that modifies, sorts, and packages proteins for secretion or delivery.' },
      { front: 'What is osmosis?', back: 'The diffusion of water molecules across a semipermeable membrane from a region of lower solute concentration to higher solute concentration.' },
      { front: 'What is active transport?', back: 'The movement of molecules across a membrane against a concentration gradient, requiring energy (ATP).' },
    ],
    Genetics: [
      { front: 'What is DNA?', back: 'Deoxyribonucleic Acid — the molecule that carries genetic instructions for life.' },
      { front: 'What is a gene?', back: 'A unit of heredity; a sequence of DNA that codes for a specific protein or trait.' },
      { front: 'What is a chromosome?', back: 'A long DNA molecule with part or all of the genetic material of an organism.' },
      { front: 'What is transcription?', back: 'The process of making an RNA copy of a gene\'s DNA sequence.' },
      { front: 'What is translation?', back: 'The process of converting mRNA into a protein at the ribosome.' },
    ],
    Ecology: [
      { front: 'What is an ecosystem?', back: 'A community of living organisms interacting with their physical environment.' },
      { front: 'What is a food chain?', back: 'A linear sequence showing the flow of energy from producers to consumers to decomposers.' },
      { front: 'What is a biome?', back: 'A large community of plants and animals that occupies a distinct region defined by its climate.' },
      { front: 'What is biodiversity?', back: 'The variety of life in the world or in a particular habitat or ecosystem.' },
      { front: 'What is a keystone species?', back: 'A species on which other species in an ecosystem largely depend; its removal would dramatically change the ecosystem.' },
    ],
    'Human Physiology': [
      { front: 'What is homeostasis?', back: 'The maintenance of a stable internal environment despite external changes.' },
      { front: 'What is the function of red blood cells?', back: 'To transport oxygen from lungs to tissues and carry carbon dioxide back to the lungs.' },
      { front: 'What is the role of the kidneys?', back: 'To filter blood, remove waste products, and regulate water and electrolyte balance.' },
      { front: 'What is the cardiac cycle?', back: 'The sequence of events in one complete heartbeat, including contraction (systole) and relaxation (diastole).' },
      { front: 'What are hormones?', back: 'Chemical messengers secreted by endocrine glands that regulate body functions.' },
    ],
  },
}

function getFallbackFlashcards(subject) {
  const map = {
    'Computer Networks': FLASHCARD_TEMPLATES['Computer Networks'],
    Physics: FLASHCARD_TEMPLATES.Physics,
    Chemistry: FLASHCARD_TEMPLATES.Chemistry,
    Biology: FLASHCARD_TEMPLATES.Biology,
  }
  return map[subject] || Object.values(FLASHCARD_TEMPLATES)[0] || {}
}

function generateMockFlashcards(subject, chapter, count) {
  const templates = getFallbackFlashcards(subject)
  const chapterTemplates = templates[chapter] || Object.values(templates)[0] || []
  const cards = []
  const used = new Set()
  let idx = 0
  while (cards.length < count) {
    const tpl = chapterTemplates[idx % chapterTemplates.length]
    if (!tpl) break
    idx++
    if (used.has(tpl.front)) continue
    used.add(tpl.front)
    cards.push({
      front: tpl.front,
      back: tpl.back,
      subject,
      chapter,
    })
  }
  return cards
}

function FlashcardFormFields({ form, setForm, subjects, courseId, onGenerate }) {
  const chapterList = useMemo(() => {
    if (!form.subject) return []
    return getChaptersBySubject(form.subject)
  }, [form.subject])

  return (
    <div className="flashcard-manager-form-card">
      <div className="flashcard-manager-form-row">
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Course</label>
          <input className="flashcard-manager-form-input" readOnly value={courseId || ''} />
        </div>
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Subject</label>
          <select className="flashcard-manager-form-select" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, chapter: '' }))}>
            <option value="">Select Subject</option>
            {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flashcard-manager-form-row">
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Chapter</label>
          <select className="flashcard-manager-form-select" value={form.chapter} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value }))} disabled={!form.subject}>
            <option value="">Select Chapter</option>
            {chapterList.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Count</label>
          <input type="number" className="flashcard-manager-form-input" min={1} max={50} value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flashcard-manager-form-row">
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Difficulty</label>
          <select className="flashcard-manager-form-select" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flashcard-manager-form-field" />
      </div>
      <div className="flashcard-manager-form-row full">
        <div className="flashcard-manager-form-field">
          <label className="flashcard-manager-form-label">Prompt Notes</label>
          <textarea className="flashcard-manager-form-textarea" value={form.promptNotes} onChange={(e) => setForm((f) => ({ ...f, promptNotes: e.target.value }))} placeholder="Additional guidance for AI generation..." />
        </div>
      </div>
      <div className="flashcard-manager-form-actions">
        <Button variant="primary" onClick={onGenerate} disabled={!form.subject || !form.chapter}>
          <AppIcon name="aiCoach" size={16} /> Generate Preview
        </Button>
      </div>
    </div>
  )
}

function PreviewFlashcardCard({ item, index, onUpdate, onRemove }) {
  return (
    <div className="flashcard-manager-card">
      <div className="flashcard-manager-card-header">
        <span className="flashcard-manager-card-index">Card {index + 1}</span>
        <div className="flashcard-manager-card-actions">
          <button type="button" className="flashcard-manager-card-action danger" onClick={() => onRemove(item.id)} aria-label="Remove">
            <AppIcon name="close" size={14} />
          </button>
        </div>
      </div>
      <div className="flashcard-manager-card-face">
        <div className="flashcard-manager-card-face-label">Front</div>
        <textarea className="flashcard-manager-card-face-input" value={item.front} onChange={(e) => onUpdate(item.id, { front: e.target.value })} rows={2} />
        <div className="flashcard-manager-card-divider" />
        <div className="flashcard-manager-card-face-label">Back</div>
        <textarea className="flashcard-manager-card-face-input" value={item.back} onChange={(e) => onUpdate(item.id, { back: e.target.value })} rows={2} />
      </div>
    </div>
  )
}

export default function FlashcardManager({ onBack }) {
  const { activeWorkspaceId: activeCourseId } = useWorkspaceStore()
  const { isSuperAdmin, isViewingAs } = useMemberStore()
  const subjects = useAdminStore().subjects
  const [form, setForm] = useState({
    subject: '',
    chapter: '',
    count: 10,
    difficulty: 'Easy',
    promptNotes: '',
  })
  const [preview, setPreview] = useState([])

  const handleGenerate = useCallback(() => {
    setTimeout(() => {
      const cards = generateMockFlashcards(form.subject, form.chapter, form.count)
      setPreview(cards.map((c, i) => ({ ...c, id: `preview-card-${Date.now()}-${i}` })))
    }, 600)
  }, [form])

  const handleUpdatePreview = useCallback((id, patch) => {
    setPreview((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const handleRemovePreview = useCallback((id) => {
    setPreview((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleInject = useCallback(async () => {
    if (!isSuperAdmin || isViewingAs) {
      showToast({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only Super Admin is authorized to upload or inject flashcards.',
      })
      return
    }

    if (preview.length === 0) return
    const records = preview.map(({ id: _id, ...rest }) => rest)
    const subject = subjects.find((s) => s.name === form.subject)
    const chapter = getChaptersBySubject(form.subject).find((c) => c.name === form.chapter)
    const courseId = activeCourseId
    const subjectId = subject?.id || form.subject
    const chapterId = chapter?.id || form.chapter

    try {
      const res = await mcqService.injectMcqs(courseId, subjectId, chapterId, records, 'flashcards', {
        subjectName: form.subject,
        chapterName: form.chapter,
      })
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Flashcards Injected',
          message: `${res.count || records.length} Flashcards Injected`,
          duration: 4000,
        })
      } else {
        showToast({
          type: 'error',
          title: 'Injection Failed',
          message: res.error || 'Unable to inject flashcards.',
          duration: 4000,
        })
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Injection Failed',
        message: err.message || 'An unexpected error occurred.',
        duration: 4000,
      })
    }
    setPreview([])
  }, [preview, form.subject, form.chapter, subjects, activeCourseId])

  return (
    <div className="flashcard-manager-shell">
      <div className="flashcard-manager-header">
        <div className="flashcard-manager-title">
          <span className="flashcard-manager-title-icon"><AppIcon name="flashcardsTab" size={18} /></span>
          Flashcard Manager
        </div>
        {onBack && (
          <button type="button" className="admin-back-link" onClick={onBack}><AppIcon name="back" size={16} />Back</button>
        )}
      </div>

      <FlashcardFormFields form={form} setForm={setForm} subjects={subjects} courseId={activeCourseId} onGenerate={handleGenerate} />

      <div className="flashcard-manager-preview">
        <div className="flashcard-manager-preview-header">
          <div className="flashcard-manager-preview-title">
            <AppIcon name="viewList" size={16} /> Preview
            {preview.length > 0 && <span className="flashcard-manager-preview-count">{preview.length}</span>}
          </div>
          {preview.length > 0 && (
            <Button variant="soft" onClick={handleInject}>
              <AppIcon name="upload" size={16} /> Inject Flashcards
            </Button>
          )}
        </div>
        {preview.length === 0 ? (
          <div className="flashcard-manager-preview-empty">
            <AppIcon name="flashcardsTab" size={28} />
            <p>Generate a preview to review cards before injection</p>
          </div>
        ) : (
          <div className="flashcard-manager-cards-grid">
            {preview.map((item, i) => (
              <PreviewFlashcardCard key={item.id} item={item} index={i} onUpdate={handleUpdatePreview} onRemove={handleRemovePreview} />
            ))}
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="flashcard-manager-inject-bar">
          <div className="flashcard-manager-inject-info">
            Ready to inject <strong>{preview.length} Flashcards</strong> into <strong>{form.subject} → {form.chapter}</strong>
          </div>
          <Button variant="primary" onClick={handleInject}>
            <AppIcon name="upload" size={16} /> Inject Flashcards
          </Button>
        </div>
      )}
    </div>
  )
}
