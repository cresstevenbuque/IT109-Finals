/**
 * Truck Service — CRUD operations for trucks table.
 * @module services/truckService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch all trucks with optional filtering.
 * @param {Object} [options]
 * @param {string} [options.search] - Filter by plate_no
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchTrucks({ search = '', status = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('trucks')
    .select('*', { count: 'exact' })
    .order('plate_no')

  if (search) query = query.ilike('plate_no', `%${search}%`)
  if (status) query = query.eq('status', status)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** @param {Object} truck */
export async function createTruck(truck) {
  const { data, error } = await supabase.from('trucks').insert(truck).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateTruck(id, updates) {
  const { data, error } = await supabase.from('trucks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteTruck(id) {
  const { error } = await supabase.from('trucks').delete().eq('id', id)
  if (error) throw error
}
