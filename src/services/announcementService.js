/**
 * Announcement Service — CRUD for announcements table.
 * @module services/announcementService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch announcements.
 * @param {Object} [options]
 * @param {string} [options.search]
 * @param {string} [options.purokId]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=20]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchAnnouncements({ search = '', purokId = '', page = 1, perPage = 20 } = {}) {
  let query = supabase
    .from('announcements')
    .select('*, purok:puroks(name), author:profiles!created_by(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('title', `%${search}%`)
  if (purokId) query = query.eq('purok_id', purokId)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

/** @param {Object} announcement */
export async function createAnnouncement(announcement) {
  const { data, error } = await supabase.from('announcements').insert(announcement).select().single()
  if (error) throw error
  return data
}

/** @param {string} id @param {Object} updates */
export async function updateAnnouncement(id, updates) {
  const { data, error } = await supabase.from('announcements').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** @param {string} id */
export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}
