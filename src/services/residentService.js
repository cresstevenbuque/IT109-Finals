/**
 * Resident Service — CRUD for profiles with role='resident'.
 * @module services/residentService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch resident profiles.
 * @param {Object} [options]
 * @param {string} [options.search]
 * @param {string} [options.purokId]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchResidents({ search = '', purokId = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('profiles')
    .select('*, purok:puroks(name)', { count: 'exact' })
    .eq('role', 'resident')
    .order('full_name')

  if (search) query = query.ilike('full_name', `%${search}%`)
  if (purokId) query = query.eq('purok_id', purokId)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** Fetch all collectors. */
export async function fetchCollectors() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'collector')
    .order('full_name')
  if (error) throw error
  return data || []
}

/** @param {string} id @param {Object} updates */
export async function updateResident(id, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Fetch residents by purok (for SMS). */
export async function fetchResidentsByPurok(purokId) {
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'resident')

  if (purokId) query = query.eq('purok_id', purokId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}
