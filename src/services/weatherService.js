/**
 * Weather Service — fetches OpenWeather forecast from the frontend.
 * Uses the free OpenWeather 5-day/3-hour forecast API.
 *
 * Flow:
 *   1. Read API key from VITE_OPENWEATHER_API_KEY
 *   2. Call OpenWeather forecast for Butuan City coordinates
 *   3. Analyze next 24 hours for rain
 *   4. Return rain probability, banner message, and draft announcement
 *
 * @module services/weatherService
 */

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || ''
const LAT = import.meta.env.VITE_BARANGAY_LAT || '8.9475'
const LNG = import.meta.env.VITE_BARANGAY_LNG || '125.5406'

/**
 * Fetch weather forecast and check for rain in the next 24 hours.
 * @returns {Promise<Object>} Weather result with rain info and banner message
 */
export async function checkWeather() {
  if (!API_KEY) {
    return {
      rain_expected: false,
      rain_probability: 0,
      current_temp: null,
      current_description: '',
      banner_message: null,
      draft_announcement: null,
      error: 'No OpenWeather API key configured',
    }
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LNG}&appid=${API_KEY}&units=metric&cnt=8`

  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch weather')
  }

  const forecasts = data.list || []
  let rainExpected = false
  let maxRainProb = 0
  let rainDescription = ''

  for (const f of forecasts) {
    const pop = f.pop || 0
    const weather = f.weather?.[0]?.main || ''
    const desc = f.weather?.[0]?.description || ''

    if (pop > maxRainProb) maxRainProb = pop
    if (weather.toLowerCase().includes('rain') || pop > 0.5) {
      rainExpected = true
      rainDescription = desc
    }
  }

  const currentTemp = forecasts[0]?.main?.temp || null
  const currentDesc = forecasts[0]?.weather?.[0]?.description || ''

  return {
    rain_expected: rainExpected,
    rain_probability: Math.round(maxRainProb * 100),
    rain_description: rainDescription,
    current_temp: currentTemp ? Math.round(currentTemp) : null,
    current_description: currentDesc,
    banner_message: rainExpected
      ? `⚠️ Rain expected (${Math.round(maxRainProb * 100)}% chance): "${rainDescription}". Collection schedule may be affected.`
      : null,
    draft_announcement: rainExpected
      ? `Due to expected rainfall (${rainDescription}), garbage collection may be delayed today. Please secure your waste bins and wait for the collection truck.`
      : null,
  }
}
