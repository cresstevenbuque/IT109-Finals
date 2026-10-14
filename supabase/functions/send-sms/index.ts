/**
 * send-sms — Supabase Edge Function
 * Sends SMS via Semaphore API (Philippine SMS gateway).
 * Falls back to Resend email if SEMAPHORE_API_KEY is not set.
 * Logs every request/response to integration_logs.
 *
 * Invoked by the frontend via supabase.functions.invoke('send-sms', { body })
 *
 * Request body:
 *   { type: 'announcement'|'reminder'|'status_update',
 *     to?: string,           // phone number (for single SMS)
 *     purok_id?: string,     // send to all residents in purok
 *     message?: string,      // custom message
 *     title?: string,        // announcement title
 *     body?: string,         // announcement body
 *     announcement_id?: string }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const semaphoreKey = Deno.env.get('SEMAPHORE_API_KEY')
    const senderName = Deno.env.get('SEMAPHORE_SENDER_NAME') || 'BasuraTrack'
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const resendFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@basuratrack.app'

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await req.json()
    const { type, to, purok_id, message, title, body: msgBody } = body

    // Determine recipients
    let recipients: { phone?: string; email?: string; name: string }[] = []

    if (to) {
      // Single recipient
      recipients.push({ phone: to, name: 'Recipient' })
    } else if (purok_id) {
      // All residents in a purok
      const { data } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('role', 'resident')
        .eq('purok_id', purok_id)
      recipients = (data || []).map((r: any) => ({ phone: r.phone, name: r.full_name }))
    } else {
      // All residents
      const { data } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('role', 'resident')
      recipients = (data || []).map((r: any) => ({ phone: r.phone, name: r.full_name }))
    }

    const smsMessage = message || `BasuraTrack: ${title}\n${msgBody}`
    let totalSent = 0
    let totalFailed = 0

    for (const recipient of recipients) {
      if (!recipient.phone) continue

      const requestPayload = {
        to: recipient.phone,
        message: smsMessage,
        sender_name: senderName,
      }

      try {
        if (semaphoreKey) {
          // ─── Send via Semaphore ─────────────────────────
          const semRes = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apikey: semaphoreKey,
              number: recipient.phone,
              message: smsMessage,
              sendername: senderName,
            }),
          })

          const semData = await semRes.json()

          // Log to integration_logs
          await supabase.from('integration_logs').insert({
            service: 'semaphore',
            action: 'send_sms',
            reference_id: body.announcement_id || null,
            request_payload: requestPayload,
            response_payload: semData,
            status: semRes.ok ? 'success' : 'error',
            error: semRes.ok ? null : JSON.stringify(semData),
          })

          if (semRes.ok) totalSent++
          else totalFailed++
        } else if (resendKey) {
          // ─── Fallback: Send via Resend email ────────────
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: resendFrom,
              to: ['resident@example.com'], // Would need actual email
              subject: `BasuraTrack: ${title || 'Notification'}`,
              text: smsMessage,
            }),
          })

          const emailData = await emailRes.json()

          await supabase.from('integration_logs').insert({
            service: 'resend',
            action: 'send_email',
            reference_id: body.announcement_id || null,
            request_payload: requestPayload,
            response_payload: emailData,
            status: emailRes.ok ? 'success' : 'error',
            error: emailRes.ok ? null : JSON.stringify(emailData),
          })

          if (emailRes.ok) totalSent++
          else totalFailed++
        } else {
          // No API key configured — log as pending
          await supabase.from('integration_logs').insert({
            service: 'semaphore',
            action: 'send_sms',
            reference_id: body.announcement_id || null,
            request_payload: requestPayload,
            response_payload: { note: 'No SEMAPHORE_API_KEY or RESEND_API_KEY configured' },
            status: 'pending',
            error: 'No SMS/email API key configured',
          })
          totalFailed++
        }
      } catch (err) {
        await supabase.from('integration_logs').insert({
          service: 'semaphore',
          action: 'send_sms',
          request_payload: requestPayload,
          status: 'error',
          error: err.message,
        })
        totalFailed++
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent, failed: totalFailed, total: recipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
