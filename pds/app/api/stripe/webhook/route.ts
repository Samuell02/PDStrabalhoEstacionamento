/**
 * app/api/stripe/webhook/route.ts
 *
 * Receives Stripe events and finalises parking reservations after payment.
 *
 * Setup:
 *   1. Add STRIPE_WEBHOOK_SECRET to .env.local
 *      (from `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 *       or from the Stripe Dashboard → Webhooks)
 *   2. Events to listen for: checkout.session.completed
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

// Uses the service-role key to bypass RLS — required in webhook context
// because there is no user session available.
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  // ── Handle events ────────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Only process fully paid sessions (Pix may be 'unpaid' until async confirmation)
    if (session.payment_status !== 'paid') {
      console.log('[Webhook] Session not yet paid — waiting for payment_intent.succeeded')
      return NextResponse.json({ received: true })
    }

    await handlePaidSession(session)
  }

  // Pix payments are asynchronous: the session may arrive as 'unpaid' above,
  // and only become paid when this event fires.
  if (event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session
    await handlePaidSession(session)
  }

  // Payment failed or expired (Pix QR not scanned in time)
  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.warn('[Webhook] Async payment failed for session:', session.id)
    // Optionally: notify the user or clean up any pending records here
  }

  return NextResponse.json({ received: true })
}

// ── Shared handler for paid sessions ────────────────────────────────────────

async function handlePaidSession(session: Stripe.Checkout.Session) {
  const { space, name, plate, user_id } = (session.metadata ?? {}) as {
    space?: string
    name?: string
    plate?: string
    user_id?: string
  }

  if (!space || !name || !plate) {
    console.error('[Webhook] Missing metadata on session:', session.id)
    return
  }

  // Service-role client — bypasses RLS, works without a user session
  const supabase = getServiceSupabase()

  // Idempotent: skip if already saved (e.g. verifyAndFinalizeSession ran first)
  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  if (existing) {
    console.log(`[Webhook] Spot ${space} already saved — skipping`)
    return
  }

  const { error } = await supabase.from('parking_spot').insert([{ space, name, plate, user_id: user_id ?? null }])

  if (error) {
    console.error('[Webhook] DB insert error:', error.message)
    return
  }

  console.log(`[Webhook] ✅ Spot ${space} reserved for ${name} (${plate})`)
}