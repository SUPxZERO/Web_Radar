import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import webpush from 'https://esm.sh/web-push@3.6.4'

// Set VAPID details for Web Push
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const vapidSubject = 'mailto:admin@spideytracker.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

serve(async (req) => {
  try {
    const payload = await req.json()

    // This function is triggered by a database webhook on the `interactions` table.
    // The payload format from Supabase Webhooks contains 'record' (the new row)
    const newInteraction = payload.record

    if (!newInteraction || !newInteraction.receiver_id) {
      return new Response('No receiver found in payload', { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the receiver's push tokens
    const { data: pushTokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', newInteraction.receiver_id)

    if (error || !pushTokens || pushTokens.length === 0) {
      return new Response('No push tokens found for user', { status: 200 })
    }

    // Determine notification message based on interaction type
    let title = 'Spidey Tracker'
    let message = 'You have a new interaction!'

    if (newInteraction.type === 'ping') {
      title = '🕷️ Spider-Sense Tingling!'
      message = 'A friend just pinged you!'
    } else if (newInteraction.type === 'bump') {
      title = '👊 Fist Bump!'
      message = 'You just bumped into a friend!'
    } else if (newInteraction.type === 'sos') {
      title = '🚨 SOS DISTRESS!'
      message = 'A friend needs your help immediately!'
    }

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192x192.png'
    })

    // Send push notification to all stored tokens for that user
    const pushPromises = pushTokens.map(async (row) => {
      try {
        await webpush.sendNotification(row.token, pushPayload)
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Token has expired or is no longer valid, delete it from DB
          await supabaseAdmin.from('push_tokens').delete().eq('token', row.token)
        } else {
          console.error('Error sending push notification:', err)
        }
      }
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
