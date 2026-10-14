/**
 * send-reminders — Supabase Edge Function (Cron-triggered)
 * Finds tomorrow's schedules and sends SMS reminders to residents.
 *
 * Scheduled via Supabase cron: runs daily at 6 PM (18:00 PHT).
 * SQL to set up the cron job in Supabase Dashboard → SQL Editor:
 *
 *   SELECT cron.schedule(
 *     'send-daily-reminders',
 *     '0 10 * * *',  -- 10:00 UTC = 18:00 PHT
 *     $$
 *     SELECT net.http_post(
 *       url := '<SUPABASE_URL>/functions/v1/send-reminders',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
 *       body := '{}'::jsonb
 *     );
 *     $$
 *   );
 *
 * Flow:
 *   1. Determine tomorrow's day_of_week
 *   2. Query active schedules for that day with route → purok info
 *   3. For each schedule, find residents in that purok
 *   4. Send SMS reminder via the send-sms function or directly via Semaphore
 *   5. Log everything to integration_logs
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WASTE_LABELS: Record<string, string> = {
  biodegradable: 'Biodegradable',
  non_biodegradable: 'Non-Biodegradable',
  recyclable: 'Recyclable',
  residual: 'Residual',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const semaphoreKey = Deno.env.get('SEMAPHORE_API_KEY')
    const senderName = Deno.env.get('SEMAPHORE_SENDER_NAME') || 'BasuraTrack'

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate tomorrow's day of week
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDay() // 0=Sun ... 6=Sat
    const tomorrowLabel = DAY_NAMES[tomorrowDay]

    // Fetch active schedules for tomorrow with route and purok info
    const { data: schedules, error: schErr } = await supabase
      .from('schedules')
      .select('*, route:routes(name, purok_id, purok:puroks(name))')
      .eq('day_of_week', tomorrowDay)
      .eq('active', true)

    if (schErr) throw schErr
    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No schedules for tomorrow', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalSent = 0

    for (const schedule of schedules) {
      const purokName = schedule.route?.purok?.name || 'your area'
      const wasteLabel = WASTE_LABELS[schedule.waste_type] || schedule.waste_type
      const timeStr = schedule.start_time?.slice(0, 5) || '6:00'

      // Build reminder message following the specified format
      const message = `BasuraTrack: Tomorrow, ${tomorrowLabel} ${timeStr}, collection for ${wasteLabel} in ${purokName}.`

      // Get residents in the purok
      const purokId = schedule.route?.purok_id
      if (!purokId) continue

      const { data: residents } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('role', 'resident')
        .eq('purok_id', purokId)
        .not('phone', 'is', null)

      if (!residents || residents.length === 0) continue

      // Send SMS to each resident
      for (const resident of residents) {
        if (!resident.phone) continue

        const requestPayload = {
          to: resident.phone,
          message,
          sender_name: senderName,
          type: 'reminder',
        }

        try {
          if (semaphoreKey) {
            const res = await fetch('https://api.semaphore.co/api/v4/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apikey: semaphoreKey,
                number: resident.phone,
                message,
                sendername: senderName,
              }),
            })

            const resData = await res.json()

            await supabase.from('integration_logs').insert({
              service: 'semaphore',
              action: 'send_reminder',
              reference_id: schedule.id,
              request_payload: requestPayload,
              response_payload: resData,
              status: res.ok ? 'success' : 'error',
              error: res.ok ? null : JSON.stringify(resData),
            })

            if (res.ok) totalSent++
          } else {
            // Log as pending when no API key
            await supabase.from('integration_logs').insert({
              service: 'semaphore',
              action: 'send_reminder',
              reference_id: schedule.id,
              request_payload: requestPayload,
              response_payload: { note: 'No SEMAPHORE_API_KEY configured — reminder not sent' },
              status: 'pending',
              error: 'No API key',
            })
          }
        } catch (err) {
          await supabase.from('integration_logs').insert({
            service: 'semaphore',
            action: 'send_reminder',
            reference_id: schedule.id,
            request_payload: requestPayload,
            status: 'error',
            error: (err as Error).message,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Reminders processed for ${tomorrowLabel}`,
        schedules_found: schedules.length,
        sms_sent: totalSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
