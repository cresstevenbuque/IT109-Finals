/**
 * Purok Service — CRUD operations for puroks table.
 * @module services/purokService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch all puroks, optionally filtered by search query.
 * @param {Object} [options]
 * @param {string} [options.search] - Filter by name
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.perPage=20] - Items per page
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchPuroks({ search = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('puroks')
    .select('*', { count: 'exact' })
    .order('name')

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/**
 * Fetch a single purok by ID.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchPurok(id) {
  const { data, error } = await supabase
    .from('puroks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Create a new purok.
 * @param {Object} purok - { name, description, center_lat, center_lng }
 * @returns {Promise<Object>}
 */
export async function createPurok(purok) {
  const { data, error } = await supabase
    .from('puroks')
    .insert(purok)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Update an existing purok.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updatePurok(id, updates) {
  const { data, error } = await supabase
    .from('puroks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a purok.
 * @param {string} id
 */
export async function deletePurok(id) {
  const { error } = await supabase.from('puroks').delete().eq('id', id)
  if (error) throw error
}
