/**
 * Schedule Service — CRUD for schedules table.
 * @module services/scheduleService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch schedules with route/purok info.
 * @param {Object} [options]
 * @param {string} [options.wasteType]
 * @param {number} [options.dayOfWeek]
 * @param {string} [options.routeId]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=50]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchSchedules({ wasteType = '', dayOfWeek = null, routeId = '', page = 1, perPage = 50 } = {}) {
  let query = supabase
    .from('schedules')
    .select('*, route:routes(name, color, purok:puroks(name))', { count: 'exact' })
    .order('day_of_week')
    .order('start_time')

  if (wasteType) query = query.eq('waste_type', wasteType)
  if (dayOfWeek !== null && dayOfWeek !== '') query = query.eq('day_of_week', dayOfWeek)
  if (routeId) query = query.eq('route_id', routeId)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** Fetch today's schedules (by day_of_week). */
export async function fetchTodaySchedules() {
  const today = new Date().getDay()
  const { data, error } = await supabase
    .from('schedules')
    .select('*, route:routes(name, color, purok:puroks(name), collector:profiles!collector_id(full_name), truck:trucks(plate_no))')
    .eq('day_of_week', today)
    .eq('active', true)
    .order('start_time')
  if (error) throw error
  return data || []
}

/** Fetch schedules for a specific collector. */
export async function fetchCollectorSchedules(collectorId) {
  const today = new Date().getDay()
  const { data, error } = await supabase
    .from('schedules')
    .select('*, route:routes!inner(name, color, purok:puroks(name), collector_id)')
    .eq('route.collector_id', collectorId)
    .eq('day_of_week', today)
    .eq('active', true)
    .order('start_time')
  if (error) throw error
  return data || []
}

/** @param {Object} schedule */
export async function createSchedule(schedule) {
  const { data, error } = await supabase.from('schedules').insert(schedule).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateSchedule(id, updates) {
  const { data, error } = await supabase.from('schedules').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteSchedule(id) {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}
