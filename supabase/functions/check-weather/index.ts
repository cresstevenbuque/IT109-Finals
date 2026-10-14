/**
 * check-weather — Supabase Edge Function
 * Checks the OpenWeather forecast for barangay coordinates.
 * Returns rain probability and a suggested banner message.
 *
 * Called by the frontend: supabase.functions.invoke('check-weather')
 *
 * Flow:
 *   1. Read barangay lat/lng from env or use Butuan City defaults
 *   2. Call OpenWeather 3-hour forecast API for the next 24 hours
 *   3. Check for rain in the forecast
 *   4. Return weather data + banner suggestion
 *   5. Log to integration_logs
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openWeatherKey = Deno.env.get('OPENWEATHER_API_KEY')

    if (!openWeatherKey) {
      return new Response(
        JSON.stringify({ error: 'OPENWEATHER_API_KEY not configured', rain_expected: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Butuan City default coordinates
    const lat = Deno.env.get('BARANGAY_LAT') || '8.9475'
    const lng = Deno.env.get('BARANGAY_LNG') || '125.5406'

    // Call OpenWeather 5-day/3-hour forecast API
    const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${openWeatherKey}&units=metric&cnt=8`

    const requestPayload = { lat, lng, endpoint: 'forecast', cnt: 8 }

    const weatherRes = await fetch(weatherUrl)
    const weatherData = await weatherRes.json()

    if (!weatherRes.ok) {
      await supabase.from('integration_logs').insert({
        service: 'openweather',
        action: 'forecast',
        request_payload: requestPayload,
        response_payload: weatherData,
        status: 'error',
        error: weatherData.message || 'API error',
      })

      return new Response(
        JSON.stringify({ error: weatherData.message, rain_expected: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Analyze forecast for rain
    const forecasts = weatherData.list || []
    let rainExpected = false
    let maxRainProb = 0
    let rainDescription = ''

    for (const f of forecasts) {
      const pop = f.pop || 0 // Probability of precipitation (0-1)
      const weather = f.weather?.[0]?.main || ''
      const desc = f.weather?.[0]?.description || ''

      if (pop > maxRainProb) maxRainProb = pop
      if (weather.toLowerCase().includes('rain') || pop > 0.5) {
        rainExpected = true
        rainDescription = desc
      }
    }

    // Build response
    const currentTemp = forecasts[0]?.main?.temp || null
    const currentDesc = forecasts[0]?.weather?.[0]?.description || ''

    const result = {
      rain_expected: rainExpected,
      rain_probability: Math.round(maxRainProb * 100),
      rain_description: rainDescription,
      current_temp: currentTemp,
      current_description: currentDesc,
      banner_message: rainExpected
        ? `⚠️ Rain expected (${Math.round(maxRainProb * 100)}% chance): "${rainDescription}". Collection may be delayed.`
        : null,
      draft_announcement: rainExpected
        ? `Due to expected rainfall (${rainDescription}), garbage collection may be delayed today. Please secure your waste bins and wait for the collection truck. We apologize for any inconvenience.`
        : null,
    }

    // Log successful call
    await supabase.from('integration_logs').insert({
      service: 'openweather',
      action: 'forecast',
      request_payload: requestPayload,
      response_payload: {
        rain_expected: result.rain_expected,
        rain_probability: result.rain_probability,
        temp: currentTemp,
        description: currentDesc,
      },
      status: 'success',
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, rain_expected: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
