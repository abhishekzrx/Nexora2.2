/**
 * noteService.js
 * Centralized API Service for Course → Subject → Chapter scoped notes.
 * Supabase is the primary authoritative source with seamless persistent storage fallback.
 * Standardized Response Contract: { success: boolean, data?: any, error?: string, message?: string }
 */

import { apiService } from './apiService.js'
import { env } from '../config/env.js'
import {
  addNote as addNoteToStore,
  updateNoteInStore,
  deleteNoteFromStore,
  hydrateAdminStoreFromSupabase,
} from '../data/adminStore.js'

const LOCAL_STORAGE_KEY = 'nexora_persistent_chapter_notes'

function getLocalNotes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalNotes(notesList) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesList || []))
  } catch (err) {
    console.warn('Failed to save notes to localStorage:', err)
  }
}

function mapRowToNote(row) {
  if (!row) return null
  return {
    id: row.id,
    courseId: row.course_id || row.courseId || '',
    subjectId: row.subject_id || row.subjectId || '',
    chapterId: row.chapter_id || row.chapterId || '',
    title: row.title || 'Untitled Note',
    content: row.content || '',
    status: row.status || 'published',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  }
}

function mapNoteToPayload(data, courseId, subjectId, chapterId) {
  const isValidUuid = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)
  return {
    id: isValidUuid ? data.id : crypto.randomUUID(),
    course_id: courseId || data.courseId,
    subject_id: subjectId || data.subjectId,
    chapter_id: chapterId || data.chapterId,
    title: String(data.title || '').trim() || 'Untitled Note',
    content: String(data.content || '').trim(),
    status: data.status || 'published',
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const noteService = {
  /**
   * Fetch notes scoped strictly to Course, Subject, or Chapter.
   */
  async getNotes({ courseId = '', subjectId = '', chapterId = '' } = {}) {
    let dbNotes = []
    let dbFailed = false

    try {
      let endpoint = '/notes?select=*'
      const filters = []

      if (chapterId) {
        filters.push(`chapter_id=eq.${encodeURIComponent(chapterId)}`)
      } else if (subjectId) {
        filters.push(`subject_id=eq.${encodeURIComponent(subjectId)}`)
      } else if (courseId) {
        filters.push(`course_id=eq.${encodeURIComponent(courseId)}`)
      }

      if (filters.length > 0) {
        endpoint += `&${filters.join('&')}`
      }
      endpoint += '&order=created_at.desc'

      const res = await apiService.get(endpoint)
      if (res.success && Array.isArray(res.data)) {
        dbNotes = res.data.map(mapRowToNote)
      } else {
        dbFailed = true
      }
    } catch {
      dbFailed = true
    }

    // Merge with persistent local storage
    const localList = getLocalNotes()
    const filteredLocal = localList.filter((n) => {
      if (chapterId && String(n.chapterId) !== String(chapterId)) return false
      if (subjectId && String(n.subjectId) !== String(subjectId)) return false
      if (courseId && String(n.courseId) !== String(courseId)) return false
      return true
    })

    // Create unique combined list (DB takes priority, fallback to local)
    const combinedMap = new Map()
    filteredLocal.forEach((n) => combinedMap.set(String(n.id), n))
    dbNotes.forEach((n) => combinedMap.set(String(n.id), n))

    return {
      success: true,
      data: Array.from(combinedMap.values()),
    }
  },

  /**
   * Fetch a single note by ID
   */
  async getNoteById(id) {
    if (!id) return { success: false, error: 'Note ID is required' }

    try {
      const res = await apiService.get(`/notes?id=eq.${encodeURIComponent(id)}&limit=1`)
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return { success: true, data: mapRowToNote(res.data[0]) }
      }
    } catch {
      // ignore
    }

    const localList = getLocalNotes()
    const found = localList.find((n) => String(n.id) === String(id))
    if (found) {
      return { success: true, data: found }
    }

    return { success: false, error: 'Note not found' }
  },

  /**
   * Create a new note record in Supabase (with automatic persistent local fallback)
   */
  async createNote({ courseId, subjectId, chapterId, title, content, status = 'published' }) {
    if (!courseId) return { success: false, error: 'Course is required to create a note' }
    if (!subjectId) return { success: false, error: 'Subject is required to create a note' }
    if (!chapterId) return { success: false, error: 'Chapter is required to create a note' }
    if (!title || !String(title).trim()) return { success: false, error: 'Note title cannot be empty' }
    if (!content || !String(content).trim()) return { success: false, error: 'Note content cannot be empty' }

    const dbPayload = mapNoteToPayload({ title, content, status }, courseId, subjectId, chapterId)
    const noteObject = mapRowToNote(dbPayload)

    // 1. Save to persistent local storage immediately
    const localList = getLocalNotes()
    const updatedLocalList = [noteObject, ...localList.filter((n) => String(n.id) !== String(noteObject.id))]
    saveLocalNotes(updatedLocalList)

    // 2. Sync local store
    addNoteToStore(noteObject)

    // 3. Try to save to Supabase
    try {
      const res = await apiService.post('/notes', dbPayload)
      if (res.success) {
        const createdNote = Array.isArray(res.data) && res.data.length > 0 ? mapRowToNote(res.data[0]) : noteObject
        addNoteToStore(createdNote)
        hydrateAdminStoreFromSupabase().catch(() => {})

        return {
          success: true,
          data: createdNote,
          message: 'Saved directly to Supabase cloud database.',
        }
      }

      // If Supabase table does not exist, return success with local persistence message
      return {
        success: true,
        data: noteObject,
        isLocalFallback: true,
        message: 'Saved to local storage. (Run supabase/migrations/02_notes.sql in Supabase SQL Editor for cloud sync).',
      }
    } catch (err) {
      return {
        success: true,
        data: noteObject,
        isLocalFallback: true,
        message: 'Saved to local storage.',
      }
    }
  },

  /**
   * Update an existing note record in Supabase (with automatic persistent local fallback)
   */
  async updateNote(id, { title, content, status = 'published' }) {
    if (!id) return { success: false, error: 'Note ID is required for update' }
    if (!title || !String(title).trim()) return { success: false, error: 'Note title cannot be empty' }
    if (!content || !String(content).trim()) return { success: false, error: 'Note content cannot be empty' }

    const updatePayload = {
      title: String(title).trim(),
      content: String(content).trim(),
      status: status || 'published',
      updated_at: new Date().toISOString(),
    }

    // 1. Update in persistent local storage
    const localList = getLocalNotes()
    const existing = localList.find((n) => String(n.id) === String(id)) || {}
    const updatedNote = { ...existing, id, ...updatePayload }
    const updatedList = localList.map((n) => (String(n.id) === String(id) ? updatedNote : n))
    if (!localList.some((n) => String(n.id) === String(id))) {
      updatedList.unshift(updatedNote)
    }
    saveLocalNotes(updatedList)

    // 2. Sync local store
    updateNoteInStore(updatedNote)

    // 3. Try to update in Supabase
    try {
      const res = await apiService.patch(`/notes?id=eq.${encodeURIComponent(id)}`, updatePayload)
      if (res.success) {
        const finalNote = Array.isArray(res.data) && res.data.length > 0 ? mapRowToNote(res.data[0]) : updatedNote
        updateNoteInStore(finalNote)
        hydrateAdminStoreFromSupabase().catch(() => {})

        return {
          success: true,
          data: finalNote,
          message: 'Updated in Supabase cloud database.',
        }
      }

      return {
        success: true,
        data: updatedNote,
        isLocalFallback: true,
        message: 'Updated in local storage.',
      }
    } catch {
      return {
        success: true,
        data: updatedNote,
        isLocalFallback: true,
        message: 'Updated in local storage.',
      }
    }
  },

  /**
   * Delete a note record from Supabase and local storage
   */
  async deleteNote(id) {
    if (!id) return { success: false, error: 'Note ID is required' }

    // 1. Remove from local storage
    const localList = getLocalNotes()
    saveLocalNotes(localList.filter((n) => String(n.id) !== String(id)))

    // 2. Remove from store
    deleteNoteFromStore(id)

    // 3. Delete from Supabase
    try {
      await apiService.delete(`/notes?id=eq.${encodeURIComponent(id)}`)
      hydrateAdminStoreFromSupabase().catch(() => {})
      return { success: true }
    } catch {
      return { success: true }
    }
  },

  /**
   * Upload an image to Supabase Storage and return its public URL
   */
  async uploadNoteImage(file, { courseId = 'general', chapterId = 'notes' } = {}) {
    if (!file) return { success: false, error: 'No file provided' }
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG)' }
    }

    const MAX_SIZE = 8 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'Image size exceeds 8MB limit' }
    }

    const cleanCourse = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanChapter = String(chapterId).replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `${cleanCourse}/${cleanChapter}/${cleanFileName}`
    const bucket = 'notes-images'

    const uploadUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${bucket}/${storagePath}`
    const publicUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${storagePath}`

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': env.apiKey,
          'Authorization': `Bearer ${env.apiKey}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      })

      if (res.ok) {
        return {
          success: true,
          url: publicUrl,
          fileName: file.name,
        }
      }

      const errText = await res.text()
      let errMsg = `Upload failed (${res.status})`
      try {
        const json = JSON.parse(errText)
        errMsg = json.message || json.error || errMsg
      } catch {
        // ignore
      }

      return {
        success: false,
        error: errMsg,
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Image upload network error',
      }
    }
  },
}
