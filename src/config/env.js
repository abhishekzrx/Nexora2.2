/**
 * Centralized Environment Configuration
 * Safely parses Supabase and API environment variables.
 */

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {})

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://hlvpnlzessihmpcfjokk.supabase.co'
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdnBubHplc3NpaG1wY2Zqb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTI5MDksImV4cCI6MjEwMDAyODkwOX0.Zg8TW3-Z6BBSUgrimklZZVj7DV_SpmgLS5D7KLLpUkU'

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  apiUrl: metaEnv.VITE_API_URL || `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`,
  apiKey: metaEnv.VITE_API_KEY || supabaseAnonKey,
  timeoutMs: Number(metaEnv.VITE_API_TIMEOUT) || 15000,
  isDev: metaEnv.DEV || false,
}

export function validateEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.warn('[Env] Supabase credentials not found in environment; operating in fallback mode.')
    return false
  }
  return true
}
