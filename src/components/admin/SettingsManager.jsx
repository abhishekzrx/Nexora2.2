/**
 * SettingsManager.jsx
 * Comprehensive Admin Settings & Typography Studio for Nexora.
 * Allows instant customization of app-wide font family (featuring Nunito, Inter, Plus Jakarta Sans, etc.),
 * typography scales, and interactive learner experience toggles.
 */

import { useState } from 'react'
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'
import { useSettingsStore } from '../../data/settingsStore'
import { useFeedback } from '../../data/feedbackStore'

function SettingsManager() {
  const {
    settings,
    fonts,
    currentFont,
    setFontFamily,
    setFontSizeScale,
    toggleSetting,
    resetSettings,
  } = useSettingsStore()

  const { showToast } = useFeedback()
  const [activeTab, setActiveTab] = useState('typography') // 'typography', 'experience', 'about'

  const handleSelectFont = (fontId) => {
    setFontFamily(fontId)
    const fontObj = fonts.find((f) => f.id === fontId)
    showToast({
      type: 'success',
      title: 'Font Family Applied',
      message: `"${fontObj?.name || fontId}" is now active across the entire platform.`,
    })
  }

  const handleReset = () => {
    resetSettings()
    showToast({
      type: 'info',
      title: 'Settings Reset',
      message: 'Platform settings restored to default standard (Nunito font).',
    })
  }

  return (
    <div className="admin-settings-container">
      {/* ── Top Hero Header ── */}
      <div className="admin-settings-hero">
        <div className="admin-settings-hero-left">
          <div className="admin-settings-icon-badge">
            <AppIcon name="settings" size={24} />
          </div>
          <div>
            <div className="admin-settings-badge-pill">Global Configuration</div>
            <h1 className="admin-settings-title">Platform Settings & Typography Studio</h1>
            <p className="admin-settings-sub">
              Customize app-wide typography, font families, study mode parameters, and interface aesthetics.
            </p>
          </div>
        </div>

        <div className="admin-settings-hero-actions">
          <Button variant="secondary" onClick={handleReset}>
            <AppIcon name="refresh" size={14} /> Reset Defaults
          </Button>
        </div>
      </div>

      {/* ── Settings Tab Navigation ── */}
      <div className="admin-settings-tab-bar">
        <button
          type="button"
          className={`admin-settings-tab-btn${activeTab === 'typography' ? ' active' : ''}`}
          onClick={() => setActiveTab('typography')}
        >
          <AppIcon name="edit" size={15} />
          <span>App Typography & Fonts</span>
          <span className="admin-tab-count-pill">{fonts.length}</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab-btn${activeTab === 'experience' ? ' active' : ''}`}
          onClick={() => setActiveTab('experience')}
        >
          <AppIcon name="target" size={15} />
          <span>Learner Experience & Practice</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab-btn${activeTab === 'about' ? ' active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <AppIcon name="info" size={15} />
          <span>System & Environment</span>
        </button>
      </div>

      {/* ════ TAB 1: TYPOGRAPHY & FONT SELECTION ════ */}
      {activeTab === 'typography' && (
        <div className="admin-settings-tab-content">
          {/* Active Font Summary Banner */}
          <div className="admin-font-current-banner">
            <div className="admin-font-current-info">
              <span className="admin-font-current-label">CURRENT ACTIVE APP FONT:</span>
              <h3 className="admin-font-current-name" style={{ fontFamily: currentFont.fontFamily }}>
                {currentFont.name} <span className="admin-font-current-tag">{currentFont.badge}</span>
              </h3>
              <p className="admin-font-current-desc">{currentFont.description}</p>
            </div>
            <div className="admin-font-quick-sample" style={{ fontFamily: currentFont.fontFamily }}>
              <span className="sample-large">Aa Bb Gg 123</span>
              <span className="sample-hint">Live rendered on all student & admin views</span>
            </div>
          </div>

          {/* Grid of Top Standard EdTech Fonts */}
          <div className="admin-settings-section-header">
            <div>
              <h3 className="admin-settings-sec-title">Standard EdTech Font Library</h3>
              <p className="admin-settings-sec-sub">
                Select from industry-leading educational typography used by top learning platforms worldwide.
              </p>
            </div>
          </div>

          <div className="admin-fonts-grid">
            {fonts.map((font) => {
              const isSelected = settings.fontId === font.id
              const isRecommended = font.id === 'nunito'

              return (
                <div
                  key={font.id}
                  className={`admin-font-card${isSelected ? ' selected' : ''}${isRecommended ? ' recommended' : ''}`}
                  onClick={() => handleSelectFont(font.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectFont(font.id)
                    }
                  }}
                >
                  <div className="admin-font-card-header">
                    <div>
                      <div className="admin-font-category">{font.category}</div>
                      <h4 className="admin-font-name" style={{ fontFamily: font.fontFamily }}>
                        {font.name}
                      </h4>
                    </div>

                    <div className="admin-font-badges">
                      {isRecommended && <span className="font-badge rec-badge">Top EdTech</span>}
                      {isSelected ? (
                        <span className="font-badge active-badge">
                          <AppIcon name="check" size={12} /> Active
                        </span>
                      ) : (
                        <span className="font-badge select-hint">Click to Apply</span>
                      )}
                    </div>
                  </div>

                  <div className="admin-font-preview-box" style={{ fontFamily: font.fontFamily }}>
                    <div className="admin-font-preview-headline">{font.previewHeadline}</div>
                    <div className="admin-font-preview-body">{font.previewBody}</div>
                  </div>

                  <div className="admin-font-card-footer">
                    <p className="admin-font-desc-text">{font.description}</p>
                    <button
                      type="button"
                      className={`admin-font-select-btn${isSelected ? ' active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectFont(font.id)
                      }}
                    >
                      {isSelected ? '✓ Currently Applied' : `Use ${font.name}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Live Component Preview Laboratory */}
          <div className="admin-settings-section-header" style={{ marginTop: '32px' }}>
            <div>
              <h3 className="admin-settings-sec-title">Live Component Typography Laboratory</h3>
              <p className="admin-settings-sec-sub">
                Visualizing headers, question cards, and priority badges in <strong>{currentFont.name}</strong>.
              </p>
            </div>
          </div>

          <div className="admin-live-preview-lab" style={{ fontFamily: currentFont.fontFamily }}>
            {/* Column 1: Chapter & Priority Chips Preview */}
            <div className="admin-lab-card">
              <div className="admin-lab-card-title">Chapter Row & Solid Rounded Priority Chips</div>
              <div className="admin-lab-chapter-row">
                <div className="admin-lab-ch-num">01</div>
                <div className="admin-lab-ch-info">
                  <div className="admin-lab-ch-title-line">
                    <span className="admin-lab-ch-title">Physics: Units, Measurements & Mechanics</span>
                    <span className="admin-lab-prio-chip prio-vh">VERY HIGH</span>
                  </div>
                  <div className="admin-lab-ch-sub">52 MCQs • 18 Flashcards • 94% Attempt Coverage</div>
                </div>
              </div>

              <div className="admin-lab-chapter-row">
                <div className="admin-lab-ch-num">02</div>
                <div className="admin-lab-ch-info">
                  <div className="admin-lab-ch-title-line">
                    <span className="admin-lab-ch-title">Wave Motion, Sound, Light & Optics</span>
                    <span className="admin-lab-prio-chip prio-h">HIGH</span>
                  </div>
                  <div className="admin-lab-ch-sub">48 MCQs • 14 Flashcards • 82% Attempt Coverage</div>
                </div>
              </div>

              <div className="admin-lab-chapter-row">
                <div className="admin-lab-ch-num">03</div>
                <div className="admin-lab-ch-info">
                  <div className="admin-lab-ch-title-line">
                    <span className="admin-lab-ch-title">Chemical Bonding & Molecular Structures</span>
                    <span className="admin-lab-prio-chip prio-m">MEDIUM</span>
                  </div>
                  <div className="admin-lab-ch-sub">36 MCQs • 10 Flashcards • 65% Attempt Coverage</div>
                </div>
              </div>

              <div className="admin-lab-chapter-row">
                <div className="admin-lab-ch-num">04</div>
                <div className="admin-lab-ch-info">
                  <div className="admin-lab-ch-title-line">
                    <span className="admin-lab-ch-title">Environmental Chemistry & Atmospheric Air</span>
                    <span className="admin-lab-prio-chip prio-l">LOW</span>
                  </div>
                  <div className="admin-lab-ch-sub">24 MCQs • 8 Flashcards • 40% Attempt Coverage</div>
                </div>
              </div>
            </div>

            {/* Column 2: Question & Options Preview */}
            <div className="admin-lab-card">
              <div className="admin-lab-card-title">Interactive MCQ Practice Question</div>
              <div className="admin-lab-mcq-box">
                <div className="admin-lab-mcq-tag-row">
                  <span className="admin-lab-mcq-badge">Question #14 • BPSC Prelims PYQ</span>
                  <span className="admin-lab-prio-chip prio-h">HIGH PRIORITY</span>
                </div>
                <p className="admin-lab-mcq-question">
                  Which of the following electromagnetic waves possesses the highest frequency in the electromagnetic spectrum?
                </p>
                <div className="admin-lab-options-list">
                  <div className="admin-lab-option">
                    <span className="admin-lab-opt-key">A</span>
                    <span>Infrared radiation</span>
                  </div>
                  <div className="admin-lab-option correct">
                    <span className="admin-lab-opt-key">B</span>
                    <span>Gamma rays (γ-rays) ✓</span>
                  </div>
                  <div className="admin-lab-option">
                    <span className="admin-lab-opt-key">C</span>
                    <span>Ultraviolet rays</span>
                  </div>
                  <div className="admin-lab-option">
                    <span className="admin-lab-opt-key">D</span>
                    <span>Microwaves</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ TAB 2: LEARNER EXPERIENCE & PRACTICE ════ */}
      {activeTab === 'experience' && (
        <div className="admin-settings-tab-content">
          <div className="admin-settings-section-header">
            <div>
              <h3 className="admin-settings-sec-title">Practice & Assessment Engine</h3>
              <p className="admin-settings-sec-sub">
                Control test engine behavior, automated progression, timer displays, and audio-haptic feedback.
              </p>
            </div>
          </div>

          <div className="admin-settings-cards-grid">
            <div className="admin-setting-item-card">
              <div className="admin-setting-item-info">
                <div className="admin-setting-item-icon" style={{ background: '#EEF2FF', color: '#2E5CE6' }}>
                  <AppIcon name="clock" size={20} />
                </div>
                <div>
                  <h4 className="admin-setting-item-title">Question Stopwatch & Countdown Timer</h4>
                  <p className="admin-setting-item-desc">
                    Display elapsed time and benchmark pacing per question during student practice sessions.
                  </p>
                </div>
              </div>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={settings.showQuestionTimer}
                  onChange={() => toggleSetting('showQuestionTimer')}
                />
                <span className="admin-slider round" />
              </label>
            </div>

            <div className="admin-setting-item-card">
              <div className="admin-setting-item-info">
                <div className="admin-setting-item-icon" style={{ background: '#E9F9F1', color: '#12B76A' }}>
                  <AppIcon name="check" size={20} />
                </div>
                <div>
                  <h4 className="admin-setting-item-title">Auto-Advance on Answer Selection</h4>
                  <p className="admin-setting-item-desc">
                    Automatically scroll or advance to next question after selecting an option in rapid review mode.
                  </p>
                </div>
              </div>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={settings.autoAdvanceMcq}
                  onChange={() => toggleSetting('autoAdvanceMcq')}
                />
                <span className="admin-slider round" />
              </label>
            </div>

            <div className="admin-setting-item-card">
              <div className="admin-setting-item-info">
                <div className="admin-setting-item-icon" style={{ background: '#FFF1E6', color: '#F1621B' }}>
                  <AppIcon name="analyticsTab" size={20} />
                </div>
                <div>
                  <h4 className="admin-setting-item-title">Audio & Sound FX</h4>
                  <p className="admin-setting-item-desc">
                    Play cheerful auditory chimes on correct question mastery and streak milestones.
                  </p>
                </div>
              </div>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={() => toggleSetting('soundEffects')}
                />
                <span className="admin-slider round" />
              </label>
            </div>

            <div className="admin-setting-item-card">
              <div className="admin-setting-item-info">
                <div className="admin-setting-item-icon" style={{ background: '#F1EDFC', color: '#7C3AED' }}>
                  <AppIcon name="target" size={20} />
                </div>
                <div>
                  <h4 className="admin-setting-item-title">Font Size Scaling Scale</h4>
                  <p className="admin-setting-item-desc">
                    Adjust text density for comfortable reading across laptops, tablets, and high-DPI displays.
                  </p>
                </div>
              </div>
              <div className="admin-scale-buttons">
                {['compact', 'medium', 'spacious'].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className={`admin-scale-btn${settings.fontSizeScale === scale ? ' active' : ''}`}
                    onClick={() => setFontSizeScale(scale)}
                  >
                    {scale.charAt(0).toUpperCase() + scale.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ TAB 3: SYSTEM & ENVIRONMENT ════ */}
      {activeTab === 'about' && (
        <div className="admin-settings-tab-content">
          <div className="admin-settings-section-header">
            <div>
              <h3 className="admin-settings-sec-title">System & Storage Information</h3>
              <p className="admin-settings-sec-sub">Technical details and local persistence cache health.</p>
            </div>
          </div>

          <div className="admin-sys-info-card">
            <div className="admin-sys-row">
              <span className="admin-sys-key">App Framework:</span>
              <span className="admin-sys-val">Vite 8.2 + React 19 Engine</span>
            </div>
            <div className="admin-sys-row">
              <span className="admin-sys-key">Active Typography Engine:</span>
              <span className="admin-sys-val">Google Fonts Dynamic CSS Injection</span>
            </div>
            <div className="admin-sys-row">
              <span className="admin-sys-key">Current Font Family:</span>
              <span className="admin-sys-val">{currentFont.name} ({currentFont.fontFamily})</span>
            </div>
            <div className="admin-sys-row">
              <span className="admin-sys-key">Cloud Backend:</span>
              <span className="admin-sys-val">Supabase Database REST API (Chapters, MCQs, Flashcards)</span>
            </div>
            <div className="admin-sys-row">
              <span className="admin-sys-key">Local Cache Key:</span>
              <span className="admin-sys-val"><code>nexora_app_settings_v2</code></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsManager
