/**
 * Missed Pickup Report Service — CRUD for missed_pickup_reports table.
 * @module services/missedPickupService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch missed pickup reports.
 * @param {Object} [options]
 * @param {string} [options.status]
 * @param {string} [options.residentId] - Filter to a specific resident
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchMissedPickups({ status = '', residentId = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('missed_pickup_reports')
    .select('*, resident:profiles!resident_id(full_name, phone), purok:puroks(name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (residentId) query = query.eq('resident_id', residentId)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** @param {Object} report */
export async function createMissedPickup(report) {
  const { data, error } = await supabase.from('missed_pickup_reports').insert(report).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateMissedPickup(id, updates) {
  const { data, error } = await supabase.from('missed_pickup_reports').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteMissedPickup(id) {
  const { error } = await supabase.from('missed_pickup_reports').delete().eq('id', id)
  if (error) throw error
}
