/**
 * Collection Log Service — CRUD for collection_logs table.
 * @module services/collectionLogService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch collection logs with schedule/route info.
 * @param {Object} [options]
 * @param {string} [options.status]
 * @param {string} [options.dateFrom]
 * @param {string} [options.dateTo]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchCollectionLogs({ status = '', dateFrom = '', dateTo = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('collection_logs')
    .select('*, schedule:schedules(waste_type, start_time, end_time, route:routes(name, purok:puroks(name))), logger:profiles!logged_by(full_name)', { count: 'exact' })
    .order('collection_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('collection_date', dateFrom)
  if (dateTo) query = query.lte('collection_date', dateTo)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** @param {Object} log */
export async function createCollectionLog(log) {
  const { data, error } = await supabase.from('collection_logs').insert(log).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateCollectionLog(id, updates) {
  const { data, error } = await supabase.from('collection_logs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteCollectionLog(id) {
  const { error } = await supabase.from('collection_logs').delete().eq('id', id)
  if (error) throw error
}

/** Fetch dashboard stats. */
export async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('collection_logs')
    .select('status')
    .eq('collection_date', today)
  if (error) throw error
  
  const total = data?.length || 0
  const completed = data?.filter(l => l.status === 'completed').length || 0
  const delayed = data?.filter(l => l.status === 'delayed').length || 0
  const skipped = data?.filter(l => l.status === 'skipped').length || 0
  
  return { total, completed, delayed, skipped }
}
