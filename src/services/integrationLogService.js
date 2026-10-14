/**
 * Integration Log Service — read-only access to integration_logs table.
 * @module services/integrationLogService
 */
import { supabase } from '@/services/supabaseClient.js'

/**
 * Fetch integration logs for the admin Integrations page.
 * @param {Object} [options]
 * @param {string} [options.service] - Filter by service name
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=25]
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function fetchIntegrationLogs({ service = '', status = '', page = 1, perPage = 25 } = {}) {
  let query = supabase
    .from('integration_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (service) query = query.eq('service', service)
  if (status) query = query.eq('status', status)

  const from = (page - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}
