/**
 * Supabase Client — singleton instance used by all services.
 * Reads URL and anon key from environment variables set in .env.
 * @module services/supabaseClient
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
