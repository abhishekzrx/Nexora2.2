/**
 * AdminContentManager
 * Content Manager screen: tab navigation + tab panels.
 * All icons go through the global AppIcon system.
 */
import { useState } from 'react'
import AppIcon from '../ui/AppIcon'
import AdminSubjectsTab from './AdminSubjectsTab'
import AdminChaptersTab from './AdminChaptersTab'
import AdminMcqsTab from './AdminMcqsTab'
import AdminFlashcardsTab from './AdminFlashcardsTab'
import AdminAnalyticsTab from './AdminAnalyticsTab'

const tabs = [
  { key: 'subjects', icon: 'chapters', label: 'Subjects' },
  { key: 'chapters', icon: 'document', label: 'Chapters & Ordering' },
  { key: 'mcqs', icon: 'mcqs', label: 'MCQs' },
  { key: 'flashcards', icon: 'flashcardsTab', label: 'Flashcards' },
  { key: 'analytics', icon: 'analytics', label: 'Analytics' },
]

function AdminContentManager({ onOpenModal, onNavigate }) {
  const [activeTab, setActiveTab] = useState('subjects')

  return (
    <>
      <div className="admin-page-header">
        <div className="admin-page-title">Content Manager</div>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <AppIcon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'subjects' ? <AdminSubjectsTab onOpenModal={onOpenModal} /> : null}
      {activeTab === 'chapters' ? <AdminChaptersTab onOpenModal={onOpenModal} /> : null}
      {activeTab === 'mcqs' ? <AdminMcqsTab onOpenModal={onOpenModal} /> : null}
      {activeTab === 'flashcards' ? <AdminFlashcardsTab onOpenModal={onOpenModal} /> : null}
      {activeTab === 'analytics' ? <AdminAnalyticsTab /> : null}
    </>
  )
}

export default AdminContentManager