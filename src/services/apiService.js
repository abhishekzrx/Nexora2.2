/**
 * apiService.js
 * Centralized HTTP Client with native Supabase REST API support.
 * Standardized Response Contract: { success: boolean, data?: any, error?: string }
 */

import { env } from '../config/env'

async function request(endpoint, options = {}) {
  const baseUrl = env.apiUrl.replace(/\/+$/, '')
  const cleanEndpoint = endpoint.replace(/^\/+/, '')
  const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${baseUrl}/${cleanEndpoint}`

  const headers = {
    'Content-Type': 'application/json',
    'apikey': env.apiKey,
    'Authorization': `Bearer ${env.apiKey}`,
    'Prefer': 'return=representation',
    ...options.headers,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), env.timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const errText = await res.text()
      let errMsg = `HTTP Error ${res.status}: ${res.statusText}`
      try {
        const json = JSON.parse(errText)
        if (json.message || json.error || json.hint) {
          errMsg = json.message || json.error || json.hint
        }
      } catch {
        // ignore
      }
      return { success: false, error: errMsg }
    }

    // 204 No Content
    if (res.status === 204) {
      return { success: true, data: null }
    }

    const data = await res.json()
    // If Supabase returns single row array for return=representation, unwrap or pass
    return { success: true, data }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      return { success: false, error: `Request timed out after ${env.timeoutMs}ms` }
    }
    return { success: false, error: err.message || 'Network request failed' }
  }
}

export const apiService = {
  get: (endpoint, headers) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),
  patch: (endpoint, body, headers) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body), headers }),
  delete: (endpoint, headers) => request(endpoint, { method: 'DELETE', headers }),
}
