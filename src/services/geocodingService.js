/**
 * Geocoding Service — Nominatim geocoding with rate limiting and caching.
 * Respects Nominatim usage policy: User-Agent header, max 1 req/sec.
 * @module services/geocodingService
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'BasuraTrack/1.0 (barangay-garbage-scheduler)'

/** Simple in-memory cache to avoid duplicate requests. */
const cache = new Map()

/** Track last request time for rate limiting. */
let lastRequestTime = 0

/**
 * Wait to respect Nominatim's 1 request/second policy.
 */
async function rateLimitWait() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed))
  }
  lastRequestTime = Date.now()
}

/**
 * Geocode an address string to lat/lng using Nominatim.
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number, display_name: string}|null>}
 *   Returns null if no results found.
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) return null

  // Check cache first
  const cacheKey = address.toLowerCase().trim()
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  await rateLimitWait()

  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'ph',
    })

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) throw new Error(`Nominatim error: ${response.status}`)

    const results = await response.json()

    if (results.length === 0) return null

    const result = {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      display_name: results[0].display_name,
    }

    cache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('Geocoding failed:', err.message)
    return null
  }
}

/**
 * Reverse geocode lat/lng to an address string.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lng) {
  await rateLimitWait()
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
    })

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) return null
    const result = await response.json()
    return result.display_name || null
  } catch {
    return null
  }
}
