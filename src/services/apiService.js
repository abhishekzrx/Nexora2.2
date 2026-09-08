/**
 * apiService.js
 * Centralized HTTP Client with native Supabase REST API support.
 * Standardized Response Contract: { success: boolean, data?: any, error?: string }
 */

import { env } from '../config/env.js'

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.replace(/^\/+/, '')
  let url
  if (cleanEndpoint.startsWith('http')) {
    url = cleanEndpoint
  } else if (cleanEndpoint.startsWith('auth/v1')) {
    url = `${env.supabaseUrl.replace(/\/+$/, '')}/${cleanEndpoint}`
  } else {
    const baseUrl = env.apiUrl.replace(/\/+$/, '')
    url = `${baseUrl}/${cleanEndpoint}`
  }

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
      let rawJson = null
      try {
        rawJson = JSON.parse(errText)
        if (rawJson.msg || rawJson.message || rawJson.error_description || rawJson.error || rawJson.hint) {
          errMsg = rawJson.msg || rawJson.message || rawJson.error_description || rawJson.error || rawJson.hint
        }
      } catch {
        // ignore non-json
      }
      return { success: false, error: errMsg, status: res.status, raw: rawJson, url }
    }

    // 204 No Content
    if (res.status === 204) {
      return { success: true, data: null, status: res.status }
    }

    const data = await res.json()
    return { success: true, data, status: res.status }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      return { success: false, error: `Request timed out after ${env.timeoutMs}ms`, status: 408, url }
    }
    return { success: false, error: err.message || 'Network request failed', status: 0, url }
  }
}

export const apiService = {
  get: (endpoint, headers) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: 'POST', body: JSON.stringify(body), headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers }),
  patch: (endpoint, body, headers) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body), headers }),
  delete: (endpoint, headers) => request(endpoint, { method: 'DELETE', headers }),
}
