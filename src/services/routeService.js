/**
 * Route Service — CRUD for routes and route_stops tables.
 * @module services/routeService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch all routes with joined purok, truck, and collector names.
 * @param {Object} [options]
 * @param {string} [options.search]
 * @param {string} [options.purokId]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchRoutes({ search = '', purokId = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('routes')
    .select('*, purok:puroks(name), truck:trucks(plate_no), collector:profiles!collector_id(full_name)', { count: 'exact' })
    .order('name')

  if (search) query = query.ilike('name', `%${search}%`)
  if (purokId) query = query.eq('purok_id', purokId)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** Fetch a single route with its stops. */
export async function fetchRouteWithStops(id) {
  const { data, error } = await supabase
    .from('routes')
    .select('*, purok:puroks(name), truck:trucks(plate_no), collector:profiles!collector_id(full_name), route_stops(id, stop_order, label, lat, lng)')
    .eq('id', id)
    .single()

  if (error) throw error
  if (data?.route_stops) {
    data.route_stops.sort((a, b) => a.stop_order - b.stop_order)
  }
  return data
}

/** @param {Object} route */
export async function createRoute(route) {
  const { data, error } = await supabase.from('routes').insert(route).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateRoute(id, updates) {
  const { data, error } = await supabase.from('routes').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteRoute(id) {
  const { error } = await supabase.from('routes').delete().eq('id', id)
  if (error) throw error
}

// ─── Route Stops ───────────────────────────────────────────

/** Fetch stops for a route, ordered. */
export async function fetchRouteStops(routeId) {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('stop_order')
  if (error) throw error
  return data || []
}

/** Create a new stop. */
export async function createRouteStop(stop) {
  const { data, error } = await supabase.from('route_stops').insert(stop).select().single()
  if (error) throw error
  return data
}

/** Update a stop (label, lat, lng, stop_order). */
export async function updateRouteStop(id, updates) {
  const { data, error } = await supabase.from('route_stops').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Delete a stop. */
export async function deleteRouteStop(id) {
  const { error } = await supabase.from('route_stops').delete().eq('id', id)
  if (error) throw error
}

/** Batch-update stop orders (for drag reorder). */
export async function reorderStops(stops) {
  const updates = stops.map((s, i) =>
    supabase.from('route_stops').update({ stop_order: i + 1 }).eq('id', s.id)
  )
  await Promise.all(updates)
}
