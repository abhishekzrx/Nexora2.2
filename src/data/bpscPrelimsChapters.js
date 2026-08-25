/**
 * bpscPrelimsChapters.js
 * Canonical Chapter Specification for "BPSC PRE LIMS" (61 chapters across 8 subjects)
 * Derived strictly from "BPSC Prelims Syllabus and Weightage.pdf".
 */

import { apiService } from '../services/apiService.js'

export const BPSC_PRIORITY_MAP = {
  VH: { code: 'VH', label: 'Very High', tone: 'red', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  H: { code: 'H', label: 'High', tone: 'orange', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
  'H/M': { code: 'H/M', label: 'High / Medium', tone: 'yellow', bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' },
  M: { code: 'M', label: 'Medium', tone: 'blue', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  'L/M': { code: 'L/M', label: 'Low / Medium', tone: 'teal', bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' },
  L: { code: 'L', label: 'Low', tone: 'gray', bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' },
}

export function formatPriority(code) {
  if (!code) return { code: 'M', label: 'Medium', tone: 'blue' }
  const upper = String(code).toUpperCase().trim()
  return BPSC_PRIORITY_MAP[upper] || { code: upper, label: upper, tone: 'gray' }
}

export const BPSC_PRELIMS_CHAPTERS = [
  // ----------------------------------------------------
  // 01 — General Science (8 Chapters)
  // ----------------------------------------------------
  {
    code: 'SCI-01',
    number: 1,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Physics: Units, Measurements & Mechanics',
    aliases: ['physics: units, measurements & mechanics', 'units, measurements & mechanics', 'mechanics'],
    description: 'Covers SI units, fundamental/derived quantities, scalar/vector quantities, Newton’s laws of motion, work, power, energy, gravitation, projectile motion, fluid pressure, surface tension, viscosity, and scientific measuring instruments. Questions must test numerical units and physical law applications.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'SCI-02',
    number: 2,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Physics: Wave Motion, Sound, Light & Thermodynamics',
    aliases: ['physics: wave motion, sound, light & thermodynamics', 'wave motion, sound, light & thermodynamics', 'sound and light'],
    description: 'Encompasses transverse/longitudinal waves, electromagnetic spectrum, Doppler effect, reflection, refraction, total internal reflection, lens applications, wave optics, dispersion, heat transfer modes, thermal expansion, laws of thermodynamics, and everyday optical phenomena.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'SCI-03',
    number: 3,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Physics: Electricity, Magnetism & Modern Physics',
    aliases: ['physics: electricity, magnetism & modern physics', 'electricity, magnetism & modern physics', 'electricity and magnetism'],
    description: 'Focuses on Ohm’s law, electric circuits, resistance combinations, Coulomb’s law, magnetic fields, electromagnetic induction, transformers, radioactivity (alpha, beta, gamma decay), nuclear fission/fusion, semiconductors, and photoelectric effect.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'SCI-04',
    number: 4,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Chemistry: Matter, Atomic Structure & Chemical Bonding',
    aliases: ['chemistry: matter, atomic structure & chemical bonding', 'matter, atomic structure & chemical bonding', 'atomic structure'],
    description: 'Examines states of matter, physical/chemical changes, Dalton’s atomic theory, subatomic particles, isotopes/isobars, electronic configuration, periodic trends (electronegativity, ionization energy), and ionic/covalent/hydrogen bonding.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'SCI-05',
    number: 5,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Chemistry: Acids, Bases, Salts, Metals & Non-Metals',
    aliases: ['chemistry: acids, bases, salts, metals & non-metals', 'acids, bases, salts, metals & non-metals', 'acids and bases'],
    description: 'Details pH scale, indicators, neutralization reactions, buffer solutions, metallurgy extraction principles, alloys (Brass, Bronze, Solder, Stainless Steel), corrosion prevention, reactivity series, and chemical properties of non-metals (Carbon, Oxygen, Nitrogen, Halogens).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'SCI-06',
    number: 6,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Chemistry: Organic Chemistry & Everyday Chemistry',
    aliases: ['chemistry: organic chemistry & everyday chemistry', 'organic chemistry & everyday chemistry', 'organic chemistry'],
    description: 'Covers hydrocarbons (alkanes, alkenes, alkynes), functional groups, polymers (Nylon, Teflon, Bakelite), synthetic fibers, soaps and detergents, explosives, food preservatives, pharmaceuticals (antipyretics, antibiotics, analgesics), and industrial gases.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'SCI-07',
    number: 7,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Biology: Cell Biology, Genetics & Human Physiology',
    aliases: ['biology: cell biology, genetics & human physiology', 'cell biology, genetics & human physiology', 'human physiology'],
    description: 'Examines plant/animal cell organelles, mitosis/meiosis, DNA/RNA structures, Mendel’s genetics, genetic disorders, and major human organ systems: digestive, circulatory, respiratory, excretory, nervous, and endocrine systems (hormones and glands).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'SCI-08',
    number: 8,
    subject: 'General Science',
    subjectPrefix: 'SCI',
    title: 'Biology: Human Diseases, Nutrition, Plant Biology & Ecology',
    aliases: ['biology: human diseases, nutrition, plant biology & ecology', 'human diseases, nutrition, plant biology & ecology', 'diseases and nutrition'],
    description: 'Focuses on infectious/non-infectious diseases (bacterial, viral, protozoan, fungal), modes of transmission, vaccines, balanced diet, vitamins (deficiency diseases), carbohydrates/proteins/fats, plant tissues (Xylem, Phloem), photosynthesis, plant hormones, and ecosystems.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },

  // ----------------------------------------------------
  // 02 — Current Affairs (7 Chapters)
  // ----------------------------------------------------
  {
    code: 'CA-01',
    number: 1,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'National Political & Governance Events',
    aliases: ['national political & governance events', 'national political events', 'governance events'],
    description: 'Covers key central legislative enactments (e.g., new criminal codes: Bharatiya Nyaya Sanhita, BNSS, BSA), Supreme Court constitutional bench rulings, statutory appointments, commission reports, and national administrative initiatives.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'CA-02',
    number: 2,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'International Relations, Treaties & Organizations',
    aliases: ['international relations, treaties & organizations', 'international relations', 'treaties and organizations'],
    description: 'Encompasses bilateral exercises, global summits (G20, BRICS, SCO, ASEAN, UN agencies), international conflicts, trade agreements, foreign visits of heads of state, and global geopolitical shifts.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'CA-03',
    number: 3,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'Economic News, Indices, Surveys & Budgets',
    aliases: ['economic news, indices, surveys & budgets', 'economic news', 'budgets and surveys'],
    description: 'Covers Union Budget highlights, Economic Survey key data points, IMF/World Bank GDP projections, inflation metrics, RBI monetary policy actions, global indices (Human Development, Hunger, Innovation), and financial regulations.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'CA-04',
    number: 4,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'Science, Technology, Defence & Space Exploration',
    aliases: ['science, technology, defence & space exploration', 'science and technology', 'defence and space'],
    description: 'Focuses on ISRO missions (Chandrayaan, Gaganyaan, Aditya-L1), DRDO missile testings, defence exercises, AI/quantum initiatives, renewable energy breakthroughs, and emerging public health technologies.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'CA-05',
    number: 5,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'Environmental News, Conservation & Biodiversity',
    aliases: ['environmental news, conservation & biodiversity', 'environmental news', 'conservation and biodiversity'],
    description: 'Encompasses new Ramsar sites, tiger censuses, elephant reserves, COP climate summits, pollution mitigation policies, National Parks notifications, and international environmental protocols.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'CA-06',
    number: 6,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'Awards, Sports, Personalia & Important Days',
    aliases: ['awards, sports, personalia & important days', 'awards and sports', 'important days'],
    description: 'Focuses on major national/international honors (Bharat Ratna, Nobel Prizes, Oscar awards), Grand Slam tournaments, Olympic/Asian Games achievements, recent demises of eminent personalities, and UN-designated theme days.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'CA-07',
    number: 7,
    subject: 'Current Affairs',
    subjectPrefix: 'CA',
    title: 'Bihar State Current Affairs',
    aliases: ['bihar state current affairs', 'bihar current affairs', 'state current affairs'],
    description: 'Covers Bihar Budget highlights, Bihar Economic Survey, state welfare initiatives (Saat Nischay Part-2), infrastructural openings, GI tags, state sports honors, and regional administrative developments.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },

  // ----------------------------------------------------
  // 03 — Bihar Special Knowledge (7 Chapters)
  // ----------------------------------------------------
  {
    code: 'BHR-01',
    number: 1,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'Ancient & Medieval History of Bihar',
    aliases: ['ancient & medieval history of bihar', 'ancient history of bihar', 'medieval history of bihar'],
    description: 'Covers early kingdom formation in Magadha (Brihadratha, Haryanka, Shishunaga, Nanda dynasties), Maurya and Gupta rule in Bihar, ancient universities (Nalanda, Vikramshila), Pala art and architecture, Karnat dynasty of Mithila, and Sher Shah Suri’s administrative reforms and tomb at Sasaram.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'BHR-02',
    number: 2,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'Bihar’s Role in Modern History & Freedom Struggle',
    aliases: ['bihar’s role in modern history & freedom struggle', 'bihar role in freedom struggle', 'bihar modern history'],
    description: 'Encompasses the 1857 revolt in Bihar under Veer Kunwar Singh, the Santhal Pargana and Birsa Munda movements, Champaran Satyagraha (1917), Non-Cooperation and Khilafat in Bihar, Bihar Provincial Kisan Sabha (Swami Sahajanand Saraswati), Quit India Movement (Secret radio, Azad Dasta of Jayaprakash Narayan), and prominent regional freedom fighters (Dr. Rajendra Prasad, Anugrah Narayan Sinha).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'BHR-03',
    number: 3,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'Physical & Geomorphological Structure of Bihar',
    aliases: ['physical & geomorphological structure of bihar', 'physical geography of bihar', 'bihar geomorphology'],
    description: 'Focuses on Bihar’s geographical location, boundary states/countries, geological divisions (Dharwar rocks, Vindhyan rocks, Tertiary rocks, Quaternary alluvium), physiographic zones (Shiwalik range, Terai region, North & South Bihar alluvial plains), and major landform features.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'BHR-04',
    number: 4,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'River Systems, Hydrology & Drainage of Bihar',
    aliases: ['river systems, hydrology & drainage of bihar', 'bihar river systems', 'drainage of bihar'],
    description: 'Covers the Ganges river course in Bihar, northern tributaries (Gandak, Burhi Gandak, Kosi, Bagmati, Ghaghra), southern tributaries (Punpun, Son, Phalgu, Kiul), origin points, confluence locations, flood hazards (Kosi river avulsion), waterfalls (Kakolat, Telhar), and lakes (Kanwar Lake).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'BHR-05',
    number: 5,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'Climate, Soils, Forest Cover & Mineral Resources',
    aliases: ['climate, soils, forest cover & mineral resources', 'climate and soils of bihar', 'minerals of bihar'],
    description: 'Examines Bihar’s monsoon climate patterns, rainfall distribution, soil classifications (Bangar, Khadar, Terai, Balthar, Balsundari), State Forest Report statistics (forest cover percentage, protected areas: Valmiki National Park, Bhimbandh, Vikramshila Sanctuary), and mineral distribution (Pyrite in Rohtas, Mica in Gaya/Nawada, Limestone in Kaimur/Rohtas, Gold in Jamui).',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'BHR-06',
    number: 6,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'State Economy, Agriculture & Infrastructure',
    aliases: ['state economy, agriculture & infrastructure', 'bihar economy', 'agriculture and infrastructure of bihar'],
    description: 'Encompasses Bihar’s post-independence economic performance, regional GDP growth rates, agricultural roadmaps, primary crop production (Paddy, Wheat, Maize, Makhana, Litchi), irrigation canal networks (Sone, Gandak, Kosi canals), industrial policies, agro-industries, and major power/transportation infrastructure.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'BHR-07',
    number: 7,
    subject: 'Bihar Special Knowledge',
    subjectPrefix: 'BHR',
    title: 'Polity, Administrative Setup & Governance in Bihar',
    aliases: ['polity, administrative setup & governance in bihar', 'bihar polity', 'administration in bihar'],
    description: 'Covers the Bihar Legislative Assembly (243 seats), Legislative Council (75 seats), Parliamentary allocation (40 Lok Sabha, 16 Rajya Sabha seats), Panchayati Raj implementation in Bihar (50% reservation for women), municipal governance, and local administrative divisions.',
    priority: 'M',
    priorityLabel: 'Medium',
  },

  // ----------------------------------------------------
  // 04 — Indian History & Freedom Movement (12 Chapters)
  // ----------------------------------------------------
  {
    code: 'HIST-01',
    number: 1,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Prehistoric India & Indus Valley Civilization',
    aliases: [
      'prehistoric india & indus valley civilization',
      'prehistoric india',
      'indus valley civilization',
      'ancient india: prehistoric era to guptas',
      'harappa and chirand',
    ],
    description: 'Prehistoric cultures from the Paleolithic to Chalcolithic phases; major archaeological sites; Indus Valley Civilization including Harappa, Chirand and other important sites; urban planning, material culture and archaeological features.',
    detailedFocusAreas: [
      'Paleolithic, Mesolithic, Neolithic and Chalcolithic cultures',
      'Major prehistoric archaeological sites',
      'Indus Valley Civilization and important sites',
      'Harappa and Chirand',
      'Urban planning and material culture',
      'Archaeological features, discoveries and terminology',
      'Site-based factual distinctions',
    ],
    detailed_focus_areas: [
      'Paleolithic, Mesolithic, Neolithic and Chalcolithic cultures',
      'Major prehistoric archaeological sites',
      'Indus Valley Civilization and important sites',
      'Harappa and Chirand',
      'Urban planning and material culture',
      'Archaeological features, discoveries and terminology',
      'Site-based factual distinctions',
    ],
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'HIST-02',
    number: 2,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Vedic Age, Mahajanapadas & Rise of Magadha',
    aliases: [
      'vedic age, mahajanapadas & rise of magadha',
      'vedic age',
      'mahajanapadas',
      'rise of magadha',
    ],
    description: 'Early and Later Vedic society, Vedic literature and institutions; transition to the age of Mahajanapadas; major Mahajanapadas and the rise of Magadha.',
    detailedFocusAreas: [
      'Early Vedic period',
      'Later Vedic period',
      'Vedic literature',
      'Political and social institutions',
      'Mahajanapadas',
      'Rise of Magadha',
      'Important terminology and chronology',
    ],
    detailed_focus_areas: [
      'Early Vedic period',
      'Later Vedic period',
      'Vedic literature',
      'Political and social institutions',
      'Mahajanapadas',
      'Rise of Magadha',
      'Important terminology and chronology',
    ],
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'HIST-03',
    number: 3,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Buddhism & Jainism',
    aliases: [
      'buddhism & jainism',
      'heterodox religious movements (buddhism & jainism)',
      'heterodox religious movements',
      'buddhism',
      'jainism',
    ],
    description: 'Socio-religious conditions behind the rise of Buddhism and Jainism; life and teachings of Gautama Buddha and Mahavira; Buddhist and Jain philosophy, Tirthankaras, monastic traditions and important concepts.',
    detailedFocusAreas: [
      'Causes for the rise of Buddhism and Jainism',
      'Life and teachings of Gautama Buddha',
      'Life and teachings of Mahavira',
      'Buddhist philosophy and core doctrines',
      'Jain philosophy and core doctrines',
      'Jain Tirthankaras',
      'Monastic traditions',
      'Buddhist Councils',
      'Council venues, presidents and royal patrons',
    ],
    detailed_focus_areas: [
      'Causes for the rise of Buddhism and Jainism',
      'Life and teachings of Gautama Buddha',
      'Life and teachings of Mahavira',
      'Buddhist philosophy and core doctrines',
      'Jain philosophy and core doctrines',
      'Jain Tirthankaras',
      'Monastic traditions',
      'Buddhist Councils',
      'Council venues, presidents and royal patrons',
    ],
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'HIST-04',
    number: 4,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Mauryan, Gupta & Post-Gupta India',
    aliases: [
      'mauryan, gupta & post-gupta india',
      'mauryan empire',
      'gupta empire',
      'harshavardhana',
      'post-gupta india',
    ],
    description: 'Mauryan Empire, Chandragupta Maurya, administration, Ashokan edicts and imperial institutions; Gupta Empire, major rulers, art and literature; Harshavardhana and major developments after the Gupta period.',
    detailedFocusAreas: [
      'Chandragupta Maurya',
      'Mauryan administration',
      'Ashokan edicts',
      'Mauryan imperial institutions',
      'Gupta Empire and major rulers',
      'Gupta art and literature',
      'Harshavardhana',
      'Post-Gupta developments',
      'Rulers, inscriptions, art, literature and chronology',
    ],
    detailed_focus_areas: [
      'Chandragupta Maurya',
      'Mauryan administration',
      'Ashokan edicts',
      'Mauryan imperial institutions',
      'Gupta Empire and major rulers',
      'Gupta art and literature',
      'Harshavardhana',
      'Post-Gupta developments',
      'Rulers, inscriptions, art, literature and chronology',
    ],
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'HIST-05',
    number: 5,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Delhi Sultanate & Mughal Empire',
    aliases: [
      'delhi sultanate & mughal empire',
      'delhi sultanate',
      'mughal empire',
      'medieval dynasties & cultural history',
    ],
    description: 'Delhi Sultanate and major administrative reforms of Iltutmish, Alauddin Khilji and Muhammad bin Tughlaq; Mughal administration including Mansabdari and Todar Mal\'s revenue system; major Mughal rulers and religious policies.',
    detailedFocusAreas: [
      'Delhi Sultanate',
      'Administrative reforms of Iltutmish',
      'Administrative reforms of Alauddin Khilji',
      'Administrative reforms of Muhammad bin Tughlaq',
      'Mughal Empire',
      'Mansabdari system',
      'Todar Mal\'s revenue system',
      'Major Mughal rulers',
      'Mughal religious policies',
      'Administrative terminology and chronology',
    ],
    detailed_focus_areas: [
      'Delhi Sultanate',
      'Administrative reforms of Iltutmish',
      'Administrative reforms of Alauddin Khilji',
      'Administrative reforms of Muhammad bin Tughlaq',
      'Mughal Empire',
      'Mansabdari system',
      'Todar Mal\'s revenue system',
      'Major Mughal rulers',
      'Mughal religious policies',
      'Administrative terminology and chronology',
    ],
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'HIST-06',
    number: 6,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Medieval Cultural History: Vijayanagara, Marathas, Bhakti & Sufi Traditions',
    aliases: [
      'medieval cultural history: vijayanagara, marathas, bhakti & sufi traditions',
      'vijayanagara',
      'marathas',
      'bhakti and sufi traditions',
      'medieval cultural history',
    ],
    description: 'Vijayanagara Kingdom, Marathas, Bhakti and Sufi movements and their important saints and traditions. Focus on major personalities, teachings, cultural developments, literature and historical associations.',
    detailedFocusAreas: [
      'Vijayanagara Kingdom',
      'Maratha history',
      'Bhakti movement',
      'Sufi traditions',
      'Important saints and personalities',
      'Teachings and religious traditions',
      'Cultural developments',
      'Literature and historical associations',
    ],
    detailed_focus_areas: [
      'Vijayanagara Kingdom',
      'Maratha history',
      'Bhakti movement',
      'Sufi traditions',
      'Important saints and personalities',
      'Teachings and religious traditions',
      'Cultural developments',
      'Literature and historical associations',
    ],
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'HIST-07',
    number: 7,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Advent of Europeans & British Expansion',
    aliases: [
      'advent of europeans & british expansion',
      'advent of europeans',
      'british expansion',
    ],
    description: 'Arrival and establishment of Portuguese, Dutch, French and British trading settlements; Carnatic Wars; Battles of Plassey and Buxar; early British political expansion; Subsidiary Alliance and Doctrine of Lapse.',
    detailedFocusAreas: [
      'Portuguese settlements',
      'Dutch settlements',
      'French settlements',
      'British settlements',
      'Carnatic Wars',
      'Battle of Plassey',
      'Battle of Buxar',
      'Early British political expansion',
      'Subsidiary Alliance',
      'Doctrine of Lapse',
      'Treaties and colonial administrative arrangements',
    ],
    detailed_focus_areas: [
      'Portuguese settlements',
      'Dutch settlements',
      'French settlements',
      'British settlements',
      'Carnatic Wars',
      'Battle of Plassey',
      'Battle of Buxar',
      'Early British political expansion',
      'Subsidiary Alliance',
      'Doctrine of Lapse',
      'Treaties and colonial administrative arrangements',
    ],
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'HIST-08',
    number: 8,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Socio-Religious Reform, Peasant & Tribal Movements',
    aliases: [
      'socio-religious reform, peasant & tribal movements',
      'socio-religious reform movements & tribal/peasant uprisings',
      'socio-religious reform movements',
      'peasant and tribal movements',
    ],
    description: 'Nineteenth-century socio-religious reform movements including Brahmo Samaj, Arya Samaj, Satyashodhak Samaj and Young Bengal Movement; major reformers and associated journals; Santhal, Munda, Indigo and Pabna uprisings.',
    detailedFocusAreas: [
      'Brahmo Samaj',
      'Arya Samaj',
      'Satyashodhak Samaj',
      'Young Bengal Movement',
      'Major reformers',
      'Reform-related journals',
      'Santhal uprising',
      'Munda uprising',
      'Indigo movement',
      'Pabna movement',
      'Leaders, causes, regions and distinguishing features',
    ],
    detailed_focus_areas: [
      'Brahmo Samaj',
      'Arya Samaj',
      'Satyashodhak Samaj',
      'Young Bengal Movement',
      'Major reformers',
      'Reform-related journals',
      'Santhal uprising',
      'Munda uprising',
      'Indigo movement',
      'Pabna movement',
      'Leaders, causes, regions and distinguishing features',
    ],
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'HIST-09',
    number: 9,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Revolt of 1857 & Reorganization of British Rule',
    aliases: [
      'revolt of 1857 & reorganization of british rule',
      'the revolt of 1857',
      'revolt of 1857',
      '1857 uprising',
    ],
    description: 'Political, economic, military and immediate causes of the Revolt of 1857; major centres and regional leadership; course and characteristics of the revolt; reasons for its failure; consequences; Government of India Act 1858 and Queen\'s Proclamation.',
    detailedFocusAreas: [
      'Political causes',
      'Economic causes',
      'Military causes',
      'Immediate causes',
      'Major centres of the revolt',
      'Regional leaders',
      'Course and characteristics',
      'Reasons for failure',
      'Consequences of the revolt',
      'Government of India Act 1858',
      'Queen\'s Proclamation',
    ],
    detailed_focus_areas: [
      'Political causes',
      'Economic causes',
      'Military causes',
      'Immediate causes',
      'Major centres of the revolt',
      'Regional leaders',
      'Course and characteristics',
      'Reasons for failure',
      'Consequences of the revolt',
      'Government of India Act 1858',
      'Queen\'s Proclamation',
    ],
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'HIST-10',
    number: 10,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Indian National Congress: Moderates, Extremists & Early Nationalism',
    aliases: [
      'indian national congress: moderates, extremists & early nationalism',
      'indian national congress & moderate-extremist phase',
      'indian national congress',
      'moderate extremist phase',
      'early nationalism',
    ],
    description: 'Foundation of the Indian National Congress in 1885; Moderate strategies; rise of Extremism; Partition of Bengal and Swadeshi Movement; Surat Split; Morley-Minto Reforms and Lucknow Pact.',
    detailedFocusAreas: [
      'Foundation of the Indian National Congress',
      'Moderate leaders and methods',
      'Rise of Extremism',
      'Partition of Bengal',
      'Swadeshi Movement',
      'Surat Split',
      'Morley-Minto Reforms',
      'Lucknow Pact',
      'Congress sessions and leaders',
      'Political strategies and chronology',
    ],
    detailed_focus_areas: [
      'Foundation of the Indian National Congress',
      'Moderate leaders and methods',
      'Rise of Extremism',
      'Partition of Bengal',
      'Swadeshi Movement',
      'Surat Split',
      'Morley-Minto Reforms',
      'Lucknow Pact',
      'Congress sessions and leaders',
      'Political strategies and chronology',
    ],
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'HIST-11',
    number: 11,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Gandhian Era I: Rowlatt to Non-Cooperation (1917–1922)',
    aliases: [
      'gandhian era i: rowlatt to non-cooperation (1917–1922)',
      'gandhian era i',
      'gandhian era 1',
      'rowlatt to non-cooperation',
      'non-cooperation movement',
      'rowlatt act and non-cooperation',
    ],
    description: 'Gandhi\'s emergence in Indian politics; Rowlatt Act, Jallianwala Bagh, Non-Cooperation Movement and related developments; early Gandhian mass movements and the transition toward mass nationalism.',
    detailedFocusAreas: [
      'Gandhi\'s emergence in Indian politics',
      'Early Gandhian mass movements',
      'Rowlatt Act',
      'Rowlatt Satyagraha',
      'Jallianwala Bagh',
      'Non-Cooperation Movement',
      'Causes and programmes of Non-Cooperation',
      'Chauri Chaura and withdrawal of the movement',
      'Chronology, leaders, programmes and consequences',
    ],
    detailed_focus_areas: [
      'Gandhi\'s emergence in Indian politics',
      'Early Gandhian mass movements',
      'Rowlatt Act',
      'Rowlatt Satyagraha',
      'Jallianwala Bagh',
      'Non-Cooperation Movement',
      'Causes and programmes of Non-Cooperation',
      'Chauri Chaura and withdrawal of the movement',
      'Chronology, leaders, programmes and consequences',
    ],
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'HIST-12',
    number: 12,
    subject: 'Indian History',
    subjectPrefix: 'HIST',
    title: 'Gandhian Era II: Swaraj to Independence (1922–1947)',
    aliases: [
      'gandhian era ii: swaraj to independence (1922–1947)',
      'gandhian era 2',
      'swaraj to independence',
      'civil disobedience movement',
      'quit india movement',
      'freedom struggle',
    ],
    description: 'Swaraj Party, Simon Commission, Nehru Report, Civil Disobedience Movement, Round Table Conferences, Gandhi-Irwin Pact, Poona Pact, Government of India Act 1935, Quit India Movement, Cabinet Mission and Independence.',
    detailedFocusAreas: [
      'Swaraj Party',
      'Simon Commission',
      'Nehru Report',
      'Civil Disobedience Movement',
      'Dandi March and Salt Satyagraha',
      'Round Table Conferences',
      'Gandhi-Irwin Pact',
      'Poona Pact',
      'Government of India Act 1935',
      'Quit India Movement',
      'Cabinet Mission',
      'Transfer of power and Independence',
      'Chronological sequencing',
      'Important agreements and pacts',
      'Constitutional developments',
      'Movement leaders and consequences',
    ],
    detailed_focus_areas: [
      'Swaraj Party',
      'Simon Commission',
      'Nehru Report',
      'Civil Disobedience Movement',
      'Dandi March and Salt Satyagraha',
      'Round Table Conferences',
      'Gandhi-Irwin Pact',
      'Poona Pact',
      'Government of India Act 1935',
      'Quit India Movement',
      'Cabinet Mission',
      'Transfer of power and Independence',
      'Chronological sequencing',
      'Important agreements and pacts',
      'Constitutional developments',
      'Movement leaders and consequences',
    ],
    priority: 'VH',
    priorityLabel: 'Very High',
  },

  // ----------------------------------------------------
  // 05 — Geography & Environment (7 Chapters)
  // ----------------------------------------------------
  {
    code: 'GEO-01',
    number: 1,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'Physical Geography & Earth Systems',
    aliases: ['physical geography & earth systems', 'physical geography', 'earth systems'],
    description: 'Covers geomorphology (interior structure of the earth, plate tectonics, earthquakes, volcanoes, landforms created by rivers, wind, glaciers), climatology (atmospheric layers, planetary winds, pressure belts, cyclones), and oceanography (ocean relief, currents, tides, salinity).',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'GEO-02',
    number: 2,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'India: Physiography, Location & Climate',
    aliases: ['india: physiography, location & climate', 'indian physiography and climate', 'physiography of india'],
    description: 'Focuses on India\'s geographical extent, Tropic of Cancer, neighboring countries, the Himalayan mountain range, Peninsular plateau, Coastal plains, Island groups, and Indian Monsoon mechanisms (El Niño, La Niña, IOD).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'GEO-03',
    number: 3,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'India: River Systems, Lakes & Multipurpose Projects',
    aliases: ['india: river systems, lakes & multipurpose projects', 'indian river systems', 'river valley projects'],
    description: 'Encompasses Himalayan rivers (Indus, Ganges, Brahmaputra drainage networks), Peninsular rivers (Narmada, Tapi, Godavari, Krishna, Cauvery), river tributaries, origin points, major dams/multipurpose river valley projects, and national waterways.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'GEO-04',
    number: 4,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'India: Soils, Vegetation & Agriculture',
    aliases: ['india: soils, vegetation & agriculture', 'soils and agriculture of india', 'indian vegetation'],
    description: 'Examines soil classifications (Alluvial, Black, Red, Laterite), soil erosion, natural vegetation types (Tropical evergreen, Deciduous, Mangroves), cropping patterns (Kharif, Rabi, Zaid), major agricultural crops, Green Revolution, and irrigation methods.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'GEO-05',
    number: 5,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'India: Mineral, Energy & Industrial Resources',
    aliases: ['india: mineral, energy & industrial resources', 'indian mineral and energy resources', 'industrial regions of india'],
    description: 'Focuses on distribution of metallic/non-metallic minerals (Coal, Iron ore, Bauxite, Manganese, Petroleum), major energy projects (Thermal, Hydro, Nuclear, Solar), and industrial regions (Iron & Steel, Textiles, Chemicals).',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'GEO-06',
    number: 6,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'World Regional Geography & Cartographic Mapping',
    aliases: ['world regional geography & cartographic mapping', 'world regional geography', 'world mapping'],
    description: 'Covers continental features, major mountain ranges, straits, seas, landlocked countries, global river systems, desert regions, and mapping of geopolitical conflict zones.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'GEO-07',
    number: 7,
    subject: 'Geography & Environment',
    subjectPrefix: 'GEO',
    title: 'Environmental Ecology, Biodiversity & Climate Change',
    aliases: ['environmental ecology, biodiversity & climate change', 'environmental ecology', 'biodiversity and climate change'],
    description: 'Encompasses ecosystem structures, trophic levels, bioaccumulation, food webs, biodiversity hotspots, protected area networks (National Parks, Wildlife Sanctuaries, Biosphere Reserves), Project Tiger/Elephant, environmental conventions (UNFCCC, CBD, Ramsar, CITES), and climate change agreements.',
    priority: 'M',
    priorityLabel: 'Medium',
  },

  // ----------------------------------------------------
  // 06 — Indian Polity & Governance (8 Chapters)
  // ----------------------------------------------------
  {
    code: 'POL-01',
    number: 1,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Constitutional Framework & Preamble',
    aliases: ['constitutional framework & preamble', 'constitutional framework', 'preamble of india'],
    description: 'Examines the historical evolution of the Constitution (Acts of 1773 to 1947), Constituent Assembly debates and timeline, salient features of the Constitution, sources of the Constitution, Union and its Territory (Articles 1–4), Citizenship (Articles 5–11), and in-depth analysis of the Preamble.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'POL-02',
    number: 2,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Fundamental Rights, DPSP & Fundamental Duties',
    aliases: ['fundamental rights, dpsp & fundamental duties', 'fundamental rights', 'dpsp and duties'],
    description: 'Covers Part III (Articles 12–35, writ jurisdictions, reasonable restrictions), Part IV Directive Principles of State Policy (Socialistic, Gandhian, Liberal-intellectual principles), and Part IV-A Fundamental Duties (Article 51A). Items must test specific article numbers and landmark judicial doctrines.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'POL-03',
    number: 3,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Union Executive & Union Legislature',
    aliases: ['union executive & union legislature', 'president and parliament', 'union executive'],
    description: 'Focuses on the President (election, impeachment, pardoning power, ordinance-making powers), Vice-President, Prime Minister, Council of Ministers, and Parliament (Lok Sabha, Rajya Sabha, legislative procedure, parliamentary committees, motions, budget passing steps).',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'POL-04',
    number: 4,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'State Executive & State Legislature',
    aliases: ['state executive & state legislature', 'governor and state legislature', 'state executive'],
    description: 'Examines the Governor (constitutional role, discretionary powers), Chief Minister, State Cabinet, State Legislative Assembly (Vidhan Sabha), State Legislative Council (Vidhan Parishad composition and powers), and state legislative procedures.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'POL-05',
    number: 5,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Indian Judiciary (Supreme Court, High Courts & Subordinate Courts)',
    aliases: ['indian judiciary (supreme court, high courts & subordinate courts)', 'indian judiciary', 'supreme court and high courts'],
    description: 'Covers the Supreme Court (original, appellate, advisory, and writ jurisdictions, appointment via Collegium, removal of judges), High Courts, Subordinate Judiciary, judicial review, Public Interest Litigation (PIL), and judicial activism.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'POL-06',
    number: 6,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Panchayati Raj & Decentralization',
    aliases: ['panchayati raj & decentralization', 'panchayati raj', 'local self government'],
    description: 'Examines the 73rd and 74th Constitutional Amendment Acts, 11th and 12th Schedules, three-tier local governance structure, Balwant Rai Mehta/Ashok Mehta/L.M. Singhvi committee recommendations, and rural/urban local administration dynamics.',
    priority: 'VH',
    priorityLabel: 'Very High',
  },
  {
    code: 'POL-07',
    number: 7,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Constitutional & Non-Constitutional Bodies',
    aliases: ['constitutional & non-constitutional bodies', 'constitutional bodies', 'commissions of india'],
    description: 'Covers Election Commission of India, UPSC, SPSC, Finance Commission, CAG, Attorney General, NITI Aayog, NHRC, CIC, CVC, and National Commissions for SC/ST/OBC.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'POL-08',
    number: 8,
    subject: 'Indian Polity & Governance',
    subjectPrefix: 'POL',
    title: 'Emergency Provisions, Amendments & Schedules',
    aliases: ['emergency provisions, amendments & schedules', 'emergency provisions', 'constitutional amendments'],
    description: 'Encompasses National Emergency (Art 352), President’s Rule (Art 356), Financial Emergency (Art 360), constitutional amendment procedures (Art 368), landmark amendments, and all 12 Schedules.',
    priority: 'H',
    priorityLabel: 'High',
  },

  // ----------------------------------------------------
  // 07 — Indian Economy (6 Chapters)
  // ----------------------------------------------------
  {
    code: 'ECO-01',
    number: 1,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Macroeconomic Concepts & National Income',
    aliases: ['macroeconomic concepts & national income', 'national income', 'gdp and inflation'],
    description: 'Covers core economic definitions (GDP, NDP, GNP, NNP at factor cost vs market price), inflation types (WPI, CPI, headline vs core inflation), economic growth vs economic development indicators, and circular flow of income.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'ECO-02',
    number: 2,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Money, Banking & Monetary Policy',
    aliases: ['money, banking & monetary policy', 'banking in india', 'rbi monetary policy'],
    description: 'Focuses on the Reserve Bank of India (functions, quantitative and qualitative credit control tools: Repo rate, Reverse repo, CRR, SLR, Open Market Operations), commercial banking structure, non-performing assets (NPAs), and financial inclusion initiatives.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'ECO-03',
    number: 3,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Public Finance, Taxation & Fiscal Policy',
    aliases: ['public finance, taxation & fiscal policy', 'public finance', 'union budget and gst'],
    description: 'Encompasses Union Budget structure (Revenue account, Capital account, Fiscal deficit, Revenue deficit, Primary deficit), direct vs indirect taxation, GST architecture and council, and Finance Commission formula.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'ECO-04',
    number: 4,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Economic Planning, NITI Aayog & Schemes',
    aliases: ['economic planning, niti aayog & schemes', 'economic planning', 'five year plans and niti aayog'],
    description: 'Covers the history of Five-Year Plans in India (objectives, target vs actual growth rates, major outcomes), transition to NITI Aayog (governing council, strategy papers, composite indices), and major centrally sponsored flagship welfare and infrastructure schemes.',
    priority: 'H',
    priorityLabel: 'High',
  },
  {
    code: 'ECO-05',
    number: 5,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Agriculture, Industry & External Sector',
    aliases: ['agriculture, industry & external sector', 'indian agriculture and industry', 'foreign trade and bop'],
    description: 'Examines agricultural price policies (MSP, CACP), PDS system, industrial policies, FDI trends, foreign trade policy, balance of payments (current account vs capital account), foreign exchange reserves, and international trade organizations (WTO, IMF, World Bank).',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'ECO-06',
    number: 6,
    subject: 'Indian Economy',
    subjectPrefix: 'ECO',
    title: 'Demographics, Poverty & Unemployment',
    aliases: ['demographics, poverty & unemployment', 'poverty and unemployment', 'census and demographics'],
    description: 'Focuses on Census demographic trends (sex ratio, literacy, population density), poverty estimation committees (Lakdawala, Tendulkar, Rangarajan committees), multi-dimensional poverty index (MPI), and unemployment measurements (NSSO criteria: Usual Status, Current Weekly Status, Current Daily Status).',
    priority: 'H',
    priorityLabel: 'High',
  },

  // ----------------------------------------------------
  // 08 — General Mental Ability & Quantitative Aptitude (6 Chapters)
  // ----------------------------------------------------
  {
    code: 'APT-01',
    number: 1,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Basic Arithmetic: Percentages, Profit & Loss, Simple & Compound Interest',
    aliases: ['basic arithmetic: percentages, profit & loss, simple & compound interest', 'percentages, profit & loss', 'arithmetic and interest'],
    description: 'Covers percentage calculations, increase/decrease ratios, mark-up prices, discount structures, cost price/selling price computations, profit percentage, simple interest calculations, and annual/semi-annual compound interest formulas.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'APT-02',
    number: 2,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Ratio, Proportion, Averages & Mixtures',
    aliases: ['ratio, proportion, averages & mixtures', 'ratio and proportion', 'averages and mixtures'],
    description: 'Focuses on direct and inverse proportions, weighted averages, age calculation problems, partnership profit-sharing ratios, and alligation/mixture concentration problems.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'APT-03',
    number: 3,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Time, Work, Distance & Speed',
    aliases: ['time, work, distance & speed', 'time and work', 'distance and speed'],
    description: 'Encompasses time and work efficiency problems, pipes and cisterns, relative speed concepts, train crossing problems, and boat and stream movement calculations.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'APT-04',
    number: 4,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Algebra, Number Systems & Progression',
    aliases: ['algebra, number systems & progression', 'number systems', 'algebra and progression'],
    description: 'Covers basic algebraic identities, quadratic equations, divisibility rules, HCF and LCM, prime factors, arithmetic progression (AP), and geometric progression (GP).',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'APT-05',
    number: 5,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Geometry, Mensuration & Permutations',
    aliases: ['geometry, mensuration & permutations', 'mensuration and geometry', 'permutations and combinations'],
    description: 'Focuses on area/perimeter of 2D shapes (triangles, circles, quadrilaterals), surface area/volume of 3D solids (cubes, cylinders, spheres, cones), basic permutations and combinations, and probability calculations.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
  {
    code: 'APT-06',
    number: 6,
    subject: 'General Mental Ability & Quantitative Aptitude',
    subjectPrefix: 'APT',
    title: 'Logical Reasoning & Data Interpretation',
    aliases: ['logical reasoning & data interpretation', 'logical reasoning', 'data interpretation'],
    description: 'Covers number/letter series completion, coding-decoding, blood relations, direction sense tests, venn diagrams, syllogisms, seating arrangements, clock and calendar problems, and tabular/bar graph data interpretation.',
    priority: 'M',
    priorityLabel: 'Medium',
  },
]

export function getBpscChapterByCode(code) {
  if (!code) return null
  return BPSC_PRELIMS_CHAPTERS.find((c) => c.code.toLowerCase() === String(code).toLowerCase().trim()) || null
}

export function getBpscChapterMeta(name, code) {
  if (code) {
    const byCode = getBpscChapterByCode(code)
    if (byCode) return byCode
  }
  if (!name) return null
  const norm = String(name).toLowerCase().trim()

  // 1. Exact match on title or code
  const exact = BPSC_PRELIMS_CHAPTERS.find(
    (c) => c.title.toLowerCase().trim() === norm || c.code.toLowerCase().trim() === norm
  )
  if (exact) return exact

  // 2. Exact match on alias
  const aliasExact = BPSC_PRELIMS_CHAPTERS.find(
    (c) => c.aliases && c.aliases.some((a) => a.toLowerCase().trim() === norm)
  )
  if (aliasExact) return aliasExact

  // 3. Substring / partial match on alias
  return (
    BPSC_PRELIMS_CHAPTERS.find(
      (c) => c.aliases && c.aliases.some((a) => norm.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(norm))
    ) || null
  )
}

/**
 * Idempotent Seed Runner:
 * Reconciles/seeds all 61 BPSC PRE LIMS chapters in Supabase.
 * - Matches parent subject via Supabase UUID
 * - Preserves existing chapter UUIDs (such as Indian History Gandhi Era chapter)
 * - Safe against duplicate execution
 */
export async function seedBpscPrelimsChapters() {
  try {
    // 1. Fetch subjects under bpsc-prelims from Supabase
    const subRes = await apiService.get('/subjects?course_id=eq.bpsc-prelims')
    if (!subRes.success || !Array.isArray(subRes.data) || subRes.data.length === 0) {
      return { success: false, error: 'BPSC PRE LIMS subjects not found in Supabase' }
    }

    const dbSubjects = subRes.data
    const subjectIdMap = {}
    dbSubjects.forEach((s) => {
      subjectIdMap[s.name.toLowerCase().trim()] = s.id
    })

    // 2. Fetch all existing chapters for these subjects
    const subIds = dbSubjects.map((s) => s.id)
    const chapRes = await apiService.get(`/chapters?subject_id=in.(${subIds.map((id) => encodeURIComponent(id)).join(',')})`)
    const existingChapters = chapRes.success && Array.isArray(chapRes.data) ? chapRes.data : []

    let createdCount = 0
    let updatedCount = 0
    let preservedCount = 0

    for (const def of BPSC_PRELIMS_CHAPTERS) {
      // Find matching parent subject UUID
      const parentSubject = dbSubjects.find(
        (s) =>
          s.name.toLowerCase().trim() === def.subject.toLowerCase().trim() ||
          s.name.toLowerCase().includes(def.subjectPrefix.toLowerCase())
      )

      if (!parentSubject) {
        console.warn(`[bpscPrelimsChapters] Parent subject not found for chapter ${def.code} (${def.subject})`)
        continue
      }

      const parentSubjectId = parentSubject.id

      // Check if matching chapter already exists under this subject
      const matchedChapter = existingChapters.find((ex) => {
        if (ex.subject_id !== parentSubjectId) return false
        const exNameNorm = (ex.name || '').toLowerCase().trim()
        const defTitleNorm = def.title.toLowerCase().trim()
        const defCodeNorm = def.code.toLowerCase().trim()
        const exSlugNorm = (ex.slug || '').toLowerCase().trim()

        return (
          exNameNorm === defTitleNorm ||
          exSlugNorm.includes(defCodeNorm) ||
          (def.aliases && def.aliases.some((a) => exNameNorm === a.toLowerCase().trim() || exNameNorm.includes(a.toLowerCase().trim()))) ||
          Number(ex.number) === def.number
        )
      })

      const slug = `${def.code.toLowerCase()}-${def.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 80)

      if (matchedChapter) {
        // Safe UPDATE: Preserve matchedChapter.id so MCQs and notes remain intact
        preservedCount++
        const updatePayload = {
          name: def.title,
          number: def.number,
          description: def.description,
          slug,
          status: 'active',
        }

        await apiService.patch(`/chapters?id=eq.${matchedChapter.id}`, updatePayload)
        updatedCount++
      } else {
        // CREATE new chapter with real subject UUID
        const newId = crypto.randomUUID()
        const insertPayload = {
          id: newId,
          subject_id: parentSubjectId,
          name: def.title,
          number: def.number,
          description: def.description,
          slug,
          difficulty: def.priority === 'VH' ? 3 : def.priority === 'H' ? 2 : 1,
          status: 'active',
        }

        const createRes = await apiService.post('/chapters', insertPayload)
        if (createRes.success) {
          createdCount++
        } else {
          console.warn(`[bpscPrelimsChapters] Failed to insert ${def.code}:`, createRes.error)
        }
      }
    }

    return {
      success: true,
      totalExpected: BPSC_PRELIMS_CHAPTERS.length,
      created: createdCount,
      updated: updatedCount,
      preserved: preservedCount,
    }
  } catch (err) {
    console.error('[bpscPrelimsChapters] Error seeding chapters:', err)
    return { success: false, error: err.message }
  }
}
