/**
 * settingsStore.js
 * Centralized Settings Management for Nexora EdTech Platform.
 * Supports:
 * - App-wide Font Family selection (Nunito, Inter, Plus Jakarta Sans, Outfit, Poppins, DM Sans, Roboto, System Default)
 * - Typography sizing scales
 * - Dynamic Google Font loader & root CSS variable binding
 * - Persistence via localStorage
 */

import { useState, useEffect } from 'react'

export const APP_FONTS = [
  {
    id: 'nunito',
    name: 'Nunito',
    fontFamily: "'Nunito', sans-serif",
    googleFontQuery: 'Nunito:ital,wght@0,300..1000;1,300..1000',
    category: 'Top EdTech Standard',
    badge: 'Recommended',
    description: 'Ultra-friendly, rounded & highly readable — the signature standard used by Duolingo, Khan Academy & Quizlet.',
    previewHeadline: 'Empower Every Learner with Adaptive Practice',
    previewBody: 'Master complex concepts step-by-step with high-yield MCQs, intelligent flashcards, and conceptual study notes.',
  },
  {
    id: 'inter',
    name: 'Inter',
    fontFamily: "'Inter', sans-serif",
    googleFontQuery: 'Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900',
    category: 'Modern UI Precision',
    badge: 'Clean UI',
    description: 'High-density, pixel-perfect screen font engineered for analytics, complex tables, and high clarity.',
    previewHeadline: 'BPSC Prelims 2026: General Science & Ancient History',
    previewBody: 'Analyze subject weightage trends, PYQ distribution, and historical cutoff benchmarks with full confidence.',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    googleFontQuery: 'Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800',
    category: 'Premium Geometric',
    badge: 'Modern EdTech',
    description: 'Crisp geometric aesthetics with warm humanist touches for a state-of-the-art educational interface.',
    previewHeadline: 'Target Score: 112+ / 150 • 94.2% Chapter Mastery',
    previewBody: 'Experience seamless transitions between video lessons, timed mock tests, and smart spaced repetition.',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    fontFamily: "'Outfit', sans-serif",
    googleFontQuery: 'Outfit:wght@100..900',
    category: 'Contemporary Elegance',
    badge: 'Sleek',
    description: 'Contemporary geometric sans with distinctive modern proportions and refined heading hierarchy.',
    previewHeadline: 'Daily Study Sprint: 45 MCQs & 2 Flashcard Decks',
    previewBody: 'Build consistent study habits with daily streaks, revision triggers, and chapter diagnostic assessments.',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    fontFamily: "'Poppins', sans-serif",
    googleFontQuery: 'Poppins:ital,wght@0,300..800;1,300..800',
    category: 'Geometric Bold',
    badge: 'High Impact',
    description: 'Bold circular geometric curves that deliver maximum visual engagement and enthusiasm for learners.',
    previewHeadline: 'Chapter 04: Chemical Bonding & Atomic Structure',
    previewBody: 'Includes ionic bonds, covalent lattices, periodic trends, and 12 years of previous year exam questions.',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    fontFamily: "'DM Sans', sans-serif",
    googleFontQuery: 'DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000',
    category: 'Humanist Geometric',
    badge: 'High Readability',
    description: 'Low-contrast, unpretentious geometric grotesque optimized for effortless reading across mobile devices.',
    previewHeadline: 'All-India Mock Test Series • Rank #14 / 8,420',
    previewBody: 'Review detailed question-by-question explanations, time per question metrics, and negative marking analysis.',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    fontFamily: "'Roboto', sans-serif",
    googleFontQuery: 'Roboto:ital,wght@0,300..900;1,300..900',
    category: 'Structured Standard',
    badge: 'Classic',
    description: 'Google’s workhorse typeface featuring friendly open curves and natural reading rhythm.',
    previewHeadline: 'Curated Notes & High-Yield Concept Explanations',
    previewBody: 'Structured syllabus summaries aligned with the latest official exam commission guidelines and syllabus.',
  },
  {
    id: 'system',
    name: 'System Default',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    googleFontQuery: null,
    category: 'Native OS',
    badge: 'Zero Network',
    description: 'Uses your operating system’s native system font (San Francisco, Segoe UI, or Roboto) for instant rendering.',
    previewHeadline: 'Native System Typography & Fast Performance',
    previewBody: 'Optimized for zero extra network payload while blending natively with your operating system.',
  },
]

const SETTINGS_STORAGE_KEY = 'nexora_app_settings_v2'

const DEFAULT_SETTINGS = {
  fontId: 'nunito', // Default to Nunito as requested
  fontSizeScale: 'medium', // 'compact', 'medium', 'spacious'
  themeMode: 'light',
  soundEffects: true,
  hapticFeedback: true,
  autoAdvanceMcq: true,
  showQuestionTimer: true,
}

let currentSettings = { ...DEFAULT_SETTINGS }
const listeners = new Set()

function loadStoredSettings() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.warn('[settingsStore] Failed to load settings from storage:', err)
  }
  return DEFAULT_SETTINGS
}

function saveStoredSettings(settings) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[settingsStore] Failed to save settings to storage:', err)
  }
}

// Inject Google Font link if not present
export function ensureGoogleFontLoaded(fontId) {
  if (typeof document === 'undefined') return
  const fontObj = APP_FONTS.find((f) => f.id === fontId)
  if (!fontObj || !fontObj.googleFontQuery) return

  const linkId = `google-font-${fontObj.id}`
  if (document.getElementById(linkId)) return

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontObj.googleFontQuery}&display=swap`
  document.head.appendChild(link)
}

// Apply font and CSS tokens globally
export function applySettingsGlobally(settings = currentSettings) {
  if (typeof document === 'undefined') return

  const fontObj = APP_FONTS.find((f) => f.id === settings.fontId) || APP_FONTS[0]
  if (fontObj.googleFontQuery) {
    ensureGoogleFontLoaded(fontObj.id)
  }

  // Update root CSS variable
  document.documentElement.style.setProperty('--font-family', fontObj.fontFamily)
  document.documentElement.setAttribute('data-app-font', fontObj.id)
  document.body.style.fontFamily = fontObj.fontFamily

  // Apply Font Scale
  const scaleMap = {
    compact: '14px',
    medium: '16px',
    spacious: '17px',
  }
  document.documentElement.style.setProperty('--app-base-font-size', scaleMap[settings.fontSizeScale] || '16px')
}

// Initialize on load
currentSettings = loadStoredSettings()
if (typeof window !== 'undefined') {
  applySettingsGlobally(currentSettings)
}

export function updateSettings(partial) {
  currentSettings = { ...currentSettings, ...partial }
  saveStoredSettings(currentSettings)
  applySettingsGlobally(currentSettings)
  listeners.forEach((l) => l(currentSettings))
}

export function resetSettings() {
  currentSettings = { ...DEFAULT_SETTINGS }
  saveStoredSettings(currentSettings)
  applySettingsGlobally(currentSettings)
  listeners.forEach((l) => l(currentSettings))
}

export function getSettings() {
  return currentSettings
}

export function useSettingsStore() {
  const [settings, setSettings] = useState(currentSettings)

  useEffect(() => {
    const handler = (newSettings) => setSettings(newSettings)
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  return {
    settings,
    fonts: APP_FONTS,
    currentFont: APP_FONTS.find((f) => f.id === settings.fontId) || APP_FONTS[0],
    setFontFamily: (fontId) => updateSettings({ fontId }),
    setFontSizeScale: (fontSizeScale) => updateSettings({ fontSizeScale }),
    setThemeMode: (themeMode) => updateSettings({ themeMode }),
    toggleSetting: (key) => updateSettings({ [key]: !settings[key] }),
    updateSettings,
    resetSettings,
  }
}
