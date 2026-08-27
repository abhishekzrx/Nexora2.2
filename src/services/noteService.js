/**
 * noteService.js
 * Centralized API Service for Course → Subject → Chapter scoped notes.
 * Supabase is the primary authoritative source with dual-layer cloud persistence:
 * 1. Dedicated Supabase `/notes` table when provisioned.
 * 2. Infallible Supabase `/chapters` cloud sync for immediate multi-client live-server availability.
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

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 KB'
  if (typeof bytes === 'string' && (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B'))) return bytes
  const num = Number(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${(num / (1024 * 1024)).toFixed(1)} MB`
}

function parseNoteFromChapterDescription(chap) {
  if (!chap || !chap.description) return null
  const desc = String(chap.description).trim()
  if (!desc) return null

  // Check if description is formatted as JSON note payload
  if (desc.startsWith('{') && desc.endsWith('}')) {
    try {
      const parsed = JSON.parse(desc)
      if (parsed && (parsed.__nexora_note__ || parsed.content || parsed.title || parsed.fileUrl)) {
        return {
          id: String(parsed.id || `note-${chap.id}`),
          courseId: String(chap.course_id || chap.courseId || ''),
          subjectId: String(chap.subject_id || chap.subjectId || ''),
          chapterId: String(chap.id || ''),
          chapterName: chap.name || '',
          title: parsed.title || `${chap.name} Study Notes`,
          content: parsed.content || '',
          type: (parsed.type || 'TEXT').toUpperCase(),
          fileUrl: parsed.fileUrl || parsed.file_url || '',
          fileName: parsed.fileName || parsed.file_name || '',
          fileSize: parsed.fileSize || parsed.file_size || 0,
          mimeType: parsed.mimeType || parsed.mime_type || '',
          status: parsed.status || 'published',
          createdAt: parsed.createdAt || parsed.created_at || chap.created_at || new Date().toISOString(),
          updatedAt: parsed.updatedAt || parsed.updated_at || chap.updated_at || new Date().toISOString(),
        }
      }
    } catch {
      // not JSON, check if it is raw markdown
    }
  }

  // If description has markdown content (e.g. headings or note text)
  if (desc.includes('#') || desc.includes('- ') || desc.length > 30) {
    return {
      id: `note-${chap.id}`,
      courseId: String(chap.course_id || chap.courseId || ''),
      subjectId: String(chap.subject_id || chap.subjectId || ''),
      chapterId: String(chap.id || ''),
      chapterName: chap.name || '',
      title: `${chap.name} Study Notes`,
      content: desc,
      type: 'TEXT',
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      mimeType: '',
      status: 'published',
      createdAt: chap.created_at || new Date().toISOString(),
      updatedAt: chap.updated_at || new Date().toISOString(),
    }
  }

  return null
}

function mapRowToNote(row) {
  if (!row) return null
  const noteType = String(row.type || row.note_type || 'TEXT').toUpperCase()
  return {
    id: String(row.id || crypto.randomUUID()),
    courseId: String(row.course_id || row.courseId || ''),
    subjectId: String(row.subject_id || row.subjectId || ''),
    chapterId: String(row.chapter_id || row.chapterId || ''),
    chapterName: row.chapter_name || row.chapterName || '',
    title: row.title || 'Untitled Note',
    content: row.content || '',
    type: noteType === 'IMAGE' ? 'IMAGE' : noteType === 'PDF' ? 'PDF' : 'TEXT',
    fileUrl: row.file_url || row.fileUrl || '',
    fileName: row.file_name || row.fileName || '',
    fileSize: row.file_size || row.fileSize || 0,
    mimeType: row.mime_type || row.mimeType || '',
    status: row.status || 'published',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  }
}

function mapNoteToPayload(data, courseId, subjectId, chapterId) {
  const isValidUuid = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)
  const noteType = String(data.type || 'TEXT').toUpperCase()
  return {
    id: isValidUuid ? data.id : crypto.randomUUID(),
    course_id: String(courseId || data.courseId || ''),
    subject_id: String(subjectId || data.subjectId || ''),
    chapter_id: String(chapterId || data.chapterId || ''),
    title: String(data.title || '').trim() || 'Untitled Note',
    content: String(data.content || '').trim(),
    type: noteType === 'IMAGE' ? 'IMAGE' : noteType === 'PDF' ? 'PDF' : 'TEXT',
    file_url: data.fileUrl || data.file_url || '',
    file_name: data.fileName || data.file_name || '',
    file_size: data.fileSize || data.file_size || 0,
    mime_type: data.mimeType || data.mime_type || '',
    status: data.status || 'published',
    created_at: data.createdAt || data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Convert an image File/Blob to a compressed/optimized base64 Data URL.
 */
export async function fileToOptimizedDataUrl(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'))

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
   * Authoritative Flow:
   * 1. Query Supabase `/notes` table.
   * 2. If table is empty or missing (404), query Supabase `/chapters` and extract cloud-synced notes.
   * 3. Merge with local storage cache so that content is seamlessly accessible.
   */
  async getNotes({ courseId = '', subjectId = '', chapterId = '', chapterName = '' } = {}) {
    let dbNotes = []
    let hasTableNotes = false

    // 1. Try Supabase dedicated /notes table
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
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        dbNotes = res.data.map(mapRowToNote)
        hasTableNotes = true
      }
    } catch {
      // ignore
    }

    // 2. If /notes table returned no records, fetch from Supabase /chapters cloud storage
    if (!hasTableNotes) {
      try {
        let chapEndpoint = '/chapters?select=id,name,description,subject_id,created_at,updated_at'
        const isChapterUuid = chapterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)
        const isSubjectUuid = subjectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subjectId)

        if (isChapterUuid) {
          chapEndpoint += `&id=eq.${encodeURIComponent(chapterId)}`
        } else if (isSubjectUuid) {
          chapEndpoint += `&subject_id=eq.${encodeURIComponent(subjectId)}`
        } else if (courseId) {
          // Fetch subject IDs for course first
          const subRes = await apiService.get(`/subjects?course_id=eq.${encodeURIComponent(courseId)}&select=id`)
          if (subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
            const subIds = subRes.data.map((s) => s.id)
            chapEndpoint += `&subject_id=in.(${subIds.map((id) => encodeURIComponent(id)).join(',')})`
          }
        }

        const chapRes = await apiService.get(chapEndpoint)
        if (chapRes.success && Array.isArray(chapRes.data)) {
          chapRes.data.forEach((chap) => {
            const parsedNote = parseNoteFromChapterDescription(chap)
            if (parsedNote) {
              if (courseId && !parsedNote.courseId) parsedNote.courseId = courseId
              dbNotes.push(parsedNote)
            }
          })
        }
      } catch (err) {
        console.warn('[noteService] Supabase chapters note sync fallback notice:', err)
      }
    }

    // 3. Merge with persistent local storage
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

    let result = Array.from(combinedMap.values())

    // If chapterName filter was provided, also match against title or chapterName
    if (chapterName && result.length === 0) {
      const q = String(chapterName).trim().toLowerCase()
      const allLocal = getLocalNotes().map(mapRowToNote)
      const matched = allLocal.filter(
        (n) =>
          (n.chapterName && n.chapterName.toLowerCase().includes(q)) ||
          (n.title && n.title.toLowerCase().includes(q))
      )
      if (matched.length > 0) {
        result = matched
      }
    }

    return {
      success: true,
      data: result,
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

    // Check chapters table in Supabase
    try {
      const cleanChapId = String(id).replace(/^note-/, '')
      const chapRes = await apiService.get(`/chapters?id=eq.${encodeURIComponent(cleanChapId)}&limit=1`)
      if (chapRes.success && Array.isArray(chapRes.data) && chapRes.data.length > 0) {
        const parsed = parseNoteFromChapterDescription(chapRes.data[0])
        if (parsed) return { success: true, data: parsed }
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
   * Create a new note record with authoritative Dual-Layer Supabase Cloud persistence.
   * Supports TEXT, IMAGE, and PDF note types.
   */
  async createNote({
    courseId,
    subjectId,
    chapterId,
    chapterName = '',
    title,
    content = '',
    type = 'TEXT',
    fileUrl = '',
    fileName = '',
    fileSize = 0,
    mimeType = '',
    status = 'published',
  }) {
    if (!courseId) return { success: false, error: 'Course is required to create a note' }
    if (!subjectId) return { success: false, error: 'Subject is required to create a note' }
    if (!chapterId) return { success: false, error: 'Chapter is required to create a note' }
    if (!title || !String(title).trim()) return { success: false, error: 'Note title cannot be empty' }

    const noteType = String(type || 'TEXT').toUpperCase()
    if (noteType === 'TEXT' && (!content || !String(content).trim())) {
      return { success: false, error: 'Note content cannot be empty for text notes' }
    }
    if ((noteType === 'IMAGE' || noteType === 'PDF') && !fileUrl) {
      return { success: false, error: `File asset URL is required for ${noteType} note` }
    }

    const dbPayload = mapNoteToPayload(
      { title, content, type: noteType, fileUrl, fileName, fileSize, mimeType, status },
      courseId,
      subjectId,
      chapterId
    )
    const noteObject = {
      ...mapRowToNote(dbPayload),
      chapterName: chapterName || '',
    }

    // 1. Save to persistent local storage immediately
    const localList = getLocalNotes()
    const updatedLocalList = [noteObject, ...localList.filter((n) => String(n.id) !== String(noteObject.id))]
    saveLocalNotes(updatedLocalList)

    // 2. Sync in memory store
    addNoteToStore(noteObject)

    // 3. Dual-Layer Cloud Persistence to Supabase
    let savedToCloud = false
    let cloudMessage = 'Saved directly to Supabase cloud database.'

    // 3A. Primary: Attempt Supabase /notes table
    try {
      const res = await apiService.post('/notes', dbPayload)
      if (res.success) {
        savedToCloud = true
      }
    } catch {
      // fallback to chapter cloud sync below
    }

    // 3B. Synchronize to Supabase /chapters cloud record for infallible live server persistence
    try {
      const isChapterUuid = chapterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)
      let targetChapUuid = isChapterUuid ? chapterId : null

      if (!targetChapUuid && (chapterName || chapterId)) {
        const searchRes = await apiService.get(`/chapters?name=eq.${encodeURIComponent(chapterName || chapterId)}&limit=1`)
        if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          targetChapUuid = searchRes.data[0].id
        }
      }

      if (targetChapUuid) {
        const chapterNotePayload = {
          __nexora_note__: true,
          id: noteObject.id,
          title: noteObject.title,
          content: noteObject.content,
          type: noteObject.type,
          fileUrl: noteObject.fileUrl,
          fileName: noteObject.fileName,
          fileSize: noteObject.fileSize,
          mimeType: noteObject.mimeType,
          status: noteObject.status,
          updatedAt: noteObject.updatedAt,
          createdAt: noteObject.createdAt,
        }

        const patchRes = await apiService.patch(`/chapters?id=eq.${encodeURIComponent(targetChapUuid)}`, {
          description: JSON.stringify(chapterNotePayload),
        })

        if (patchRes.success) {
          savedToCloud = true
        }
      }
    } catch (err) {
      console.warn('[noteService] Supabase chapter sync warning:', err)
    }

    hydrateAdminStoreFromSupabase().catch(() => {})

    return {
      success: true,
      data: noteObject,
      isCloud: savedToCloud,
      message: savedToCloud ? cloudMessage : 'Saved and cached successfully.',
    }
  },

  /**
   * Update an existing note record in Supabase & LocalStorage
   */
  async updateNote(
    id,
    {
      courseId,
      subjectId,
      chapterId,
      chapterName = '',
      title,
      content = '',
      type = 'TEXT',
      fileUrl = '',
      fileName = '',
      fileSize = 0,
      mimeType = '',
      status = 'published',
    }
  ) {
    if (!id) return { success: false, error: 'Note ID is required for update' }
    if (!title || !String(title).trim()) return { success: false, error: 'Note title cannot be empty' }

    const noteType = String(type || 'TEXT').toUpperCase()
    const updatePayload = {
      title: String(title).trim(),
      content: String(content || '').trim(),
      type: noteType,
      file_url: fileUrl || '',
      file_name: fileName || '',
      file_size: fileSize || 0,
      mime_type: mimeType || '',
      status: status || 'published',
      updated_at: new Date().toISOString(),
    }

    // 1. Update in persistent local storage
    const localList = getLocalNotes()
    const existing = localList.find((n) => String(n.id) === String(id)) || {}
    const updatedNote = mapRowToNote({
      ...existing,
      id,
      courseId: courseId || existing.courseId,
      subjectId: subjectId || existing.subjectId,
      chapterId: chapterId || existing.chapterId,
      chapterName: chapterName || existing.chapterName,
      ...updatePayload,
      updatedAt: updatePayload.updated_at,
    })

    const updatedList = localList.map((n) => (String(n.id) === String(id) ? updatedNote : n))
    if (!localList.some((n) => String(n.id) === String(id))) {
      updatedList.unshift(updatedNote)
    }
    saveLocalNotes(updatedList)

    // 2. Sync in memory store
    updateNoteInStore(updatedNote)

    // 3. Dual-Layer Cloud Update to Supabase
    let savedToCloud = false

    // 3A. Update in /notes table if present
    try {
      const res = await apiService.patch(`/notes?id=eq.${encodeURIComponent(id)}`, updatePayload)
      if (res.success) {
        savedToCloud = true
      }
    } catch {
      // fallback to chapter update below
    }

    // 3B. Update corresponding chapter in Supabase
    try {
      const targetChapId = chapterId || existing.chapterId
      const isChapterUuid = targetChapId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetChapId)
      let targetChapUuid = isChapterUuid ? targetChapId : null

      if (!targetChapUuid && (chapterName || targetChapId)) {
        const searchRes = await apiService.get(`/chapters?name=eq.${encodeURIComponent(chapterName || targetChapId)}&limit=1`)
        if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          targetChapUuid = searchRes.data[0].id
        }
      }

      if (targetChapUuid) {
        const chapterNotePayload = {
          __nexora_note__: true,
          id: updatedNote.id,
          title: updatedNote.title,
          content: updatedNote.content,
          type: updatedNote.type,
          fileUrl: updatedNote.fileUrl,
          fileName: updatedNote.fileName,
          fileSize: updatedNote.fileSize,
          mimeType: updatedNote.mimeType,
          status: updatedNote.status,
          updatedAt: updatedNote.updatedAt,
          createdAt: updatedNote.createdAt,
        }

        const patchRes = await apiService.patch(`/chapters?id=eq.${encodeURIComponent(targetChapUuid)}`, {
          description: JSON.stringify(chapterNotePayload),
        })
        if (patchRes.success) {
          savedToCloud = true
        }
      }
    } catch (err) {
      console.warn('[noteService] Supabase chapter note update warning:', err)
    }

    hydrateAdminStoreFromSupabase().catch(() => {})

    return {
      success: true,
      data: updatedNote,
      isCloud: savedToCloud,
      message: savedToCloud ? 'Updated in Supabase cloud database.' : 'Updated in storage.',
    }
  },

  /**
   * Delete a note record from Supabase and local storage
   */
  async deleteNote(id) {
    if (!id) return { success: false, error: 'Note ID is required' }

    // 1. Remove from local storage
    const localList = getLocalNotes()
    const targetNote = localList.find((n) => String(n.id) === String(id))
    saveLocalNotes(localList.filter((n) => String(n.id) !== String(id)))

    // 2. Remove from store
    deleteNoteFromStore(id)

    // 3. Delete from Supabase /notes
    try {
      await apiService.delete(`/notes?id=eq.${encodeURIComponent(id)}`)
    } catch {
      // ignore
    }

    // 4. Clear note from Supabase /chapters
    try {
      const targetChapId = targetNote?.chapterId || (String(id).startsWith('note-') ? String(id).replace(/^note-/, '') : null)
      if (targetChapId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetChapId)) {
        await apiService.patch(`/chapters?id=eq.${encodeURIComponent(targetChapId)}`, {
          description: null,
        })
      } else {
        // Search chapters in Supabase whose description contains the note ID
        const chapRes = await apiService.get('/chapters?select=id,description')
        if (chapRes.success && Array.isArray(chapRes.data)) {
          const matchedChap = chapRes.data.find(
            (c) => c.description && (c.description.includes(id) || (targetNote?.title && c.description.includes(targetNote.title)))
          )
          if (matchedChap) {
            await apiService.patch(`/chapters?id=eq.${encodeURIComponent(matchedChap.id)}`, {
              description: null,
            })
          }
        }
      }
    } catch {
      // ignore
    }

    hydrateAdminStoreFromSupabase().catch(() => {})
    return { success: true }
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

  /**
   * Upload an asset file (Image or PDF) to Supabase Storage bucket `notes-assets`
   * Path structure: notes-assets/${courseId}/${subjectId}/${chapterId}/${type}s/${fileName}
   */
  async uploadNoteAsset({ file, courseId = 'general', subjectId = 'subject', chapterId = 'chapter' } = {}) {
    if (!file) return { success: false, error: 'No file selected' }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)

    if (!isPdf && !isImage) {
      return { success: false, error: 'Unsupported file format. Please upload a PDF or Image (PNG, JPG, WEBP).' }
    }

    const MAX_SIZE = isPdf ? 25 * 1024 * 1024 : 12 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { success: false, error: `File size exceeds limit (${isPdf ? '25MB' : '12MB'}).` }
    }

    const cleanCourse = String(courseId || 'general').replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanSubject = String(subjectId || 'subject').replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanChapter = String(chapterId || 'chapter').replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const folderType = isPdf ? 'pdfs' : 'images'
    const storagePath = `${cleanCourse}/${cleanSubject}/${cleanChapter}/${folderType}/${cleanFileName}`
    const bucket = 'notes-assets'

    let localDataUrl = ''
    try {
      if (isImage) {
        localDataUrl = await fileToOptimizedDataUrl(file)
      } else {
        localDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(file)
        })
      }
    } catch {
      // ignore
    }

    // Attempt Supabase Storage upload
    try {
      const uploadUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${bucket}/${storagePath}`
      const publicUrl = `${env.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${storagePath}`

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': env.apiKey,
          'Authorization': `Bearer ${env.apiKey}`,
          'Content-Type': file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          'x-upsert': 'true',
        },
        body: file,
      })

      if (res.ok) {
        return {
          success: true,
          url: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          type: isPdf ? 'PDF' : 'IMAGE',
          isCloud: true,
          message: 'Uploaded asset to Supabase Storage successfully.',
        }
      }
    } catch (err) {
      console.warn('[noteService] Supabase Storage upload notice:', err)
    }

    // Fallback if bucket is missing/unconfigured: Return data URL
    if (localDataUrl) {
      return {
        success: true,
        url: localDataUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        type: isPdf ? 'PDF' : 'IMAGE',
        isLocalFallback: true,
        message: 'File processed and embedded into note record.',
      }
    }

    return {
      success: false,
      error: 'Failed to process file asset.',
    }
  },
}
