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

export function getLocalNotes() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLocalNotes(notesList) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesList || []))
  } catch (err) {
    console.warn('Failed to save notes to localStorage:', err)
  }
}

function mapRowToNote(row) {
  if (!row) return null
  return {
    id: String(row.id || crypto.randomUUID()),
    courseId: String(row.course_id || row.courseId || ''),
    subjectId: String(row.subject_id || row.subjectId || ''),
    chapterId: String(row.chapter_id || row.chapterId || ''),
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
    course_id: String(courseId || data.courseId || ''),
    subject_id: String(subjectId || data.subjectId || ''),
    chapter_id: String(chapterId || data.chapterId || ''),
    title: String(data.title || '').trim() || 'Untitled Note',
    content: String(data.content || '').trim(),
    status: data.status || 'published',
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Convert an image File/Blob to a compressed/optimized base64 Data URL.
 * Automatically resizes large images (e.g. tablet camera photos / high-res diagrams)
 * so notes stay lightweight and load instantly.
 */
export async function fileToOptimizedDataUrl(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'))

    // Pass SVGs or GIFs directly without rasterizing
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return resolve(dataUrl)
      }

      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const compressedDataUrl = canvas.toDataURL(mimeType, quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const noteService = {
  getLocalNotes,
  saveLocalNotes,
  fileToOptimizedDataUrl,

  /**
   * Fetch notes scoped to Course, Subject, or Chapter.
   */
  async getNotes({ courseId = '', subjectId = '', chapterId = '' } = {}) {
    let dbNotes = []

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
      }
    } catch {
      // ignore network errors and fallback to local notes
    }

    // Merge with persistent local storage
    const localList = getLocalNotes().map(mapRowToNote)
    const filteredLocal = localList.filter((n) => {
      if (chapterId && String(n.chapterId).trim() !== String(chapterId).trim()) return false
      if (subjectId && String(n.subjectId).trim() !== String(subjectId).trim()) return false
      if (courseId && String(n.courseId).trim() !== String(courseId).trim()) return false
      return true
    })

    // Combine local + DB notes (DB overrides local if exists, local persists otherwise)
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
      return { success: true, data: mapRowToNote(found) }
    }

    return { success: false, error: 'Note not found' }
  },

  /**
   * Create a new note record in Supabase & LocalStorage
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

    // 2. Sync local memory store
    addNoteToStore(noteObject)

    // 3. Save to Supabase Cloud if available
    try {
      const res = await apiService.post('/notes', dbPayload)
      if (res.success) {
        const createdNote = Array.isArray(res.data) && res.data.length > 0 ? mapRowToNote(res.data[0]) : noteObject
        const finalList = [createdNote, ...localList.filter((n) => String(n.id) !== String(createdNote.id))]
        saveLocalNotes(finalList)
        addNoteToStore(createdNote)
        hydrateAdminStoreFromSupabase().catch(() => {})

        return {
          success: true,
          data: createdNote,
          message: 'Saved directly to Supabase cloud database.',
        }
      }

      return {
        success: true,
        data: noteObject,
        isLocalFallback: true,
        message: 'Saved to local storage successfully.',
      }
    } catch {
      return {
        success: true,
        data: noteObject,
        isLocalFallback: true,
        message: 'Saved to local storage successfully.',
      }
    }
  },

  /**
   * Update an existing note record in Supabase & LocalStorage
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
    const updatedNote = mapRowToNote({ ...existing, id, ...updatePayload })
    const updatedList = localList.map((n) => (String(n.id) === String(id) ? updatedNote : n))
    if (!localList.some((n) => String(n.id) === String(id))) {
      updatedList.unshift(updatedNote)
    }
    saveLocalNotes(updatedList)

    // 2. Sync in memory store
    updateNoteInStore(updatedNote)

    // 3. Update in Supabase Cloud if available
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
   * Upload an image to Supabase Storage, with automatic local fallback when bucket is absent
   */
  async uploadNoteImage(file, { courseId = 'general', chapterId = 'notes' } = {}) {
    if (!file) return { success: false, error: 'No file provided' }
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Please select a valid image (PNG, JPG, WEBP, GIF, SVG)' }
    }

    const MAX_SIZE = 12 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'Image size exceeds 12MB limit' }
    }

    // 1. Generate optimized local data URL
    let localDataUrl = ''
    try {
      localDataUrl = await fileToOptimizedDataUrl(file)
    } catch {
      // ignore
    }

    // 2. Attempt Supabase Storage Upload
    try {
      const cleanCourse = String(courseId || 'general').replace(/[^a-zA-Z0-9_-]/g, '')
      const cleanChapter = String(chapterId || 'notes').replace(/[^a-zA-Z0-9_-]/g, '')
      const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const storagePath = `${cleanCourse}/${cleanChapter}/${cleanFileName}`
      const bucket = 'notes-images'

      const uploadUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${bucket}/${storagePath}`
      const publicUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${storagePath}`

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
          isCloud: true,
          message: 'Uploaded to cloud storage successfully.',
        }
      }
    } catch {
      // network/bucket failure handled gracefully below
    }

    // 3. Fallback: If Supabase bucket is missing or unconfigured, return the optimized local Data URL
    if (localDataUrl) {
      return {
        success: true,
        url: localDataUrl,
        fileName: file.name,
        isLocalFallback: true,
        message: 'Image embedded directly into note.',
      }
    }

    return {
      success: false,
      error: 'Unable to process image file.',
    }
  },
}
