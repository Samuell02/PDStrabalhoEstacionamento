'use server'

import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

// ─── Existing actions ──────────────────────────────────────────────────────

export async function getParkings() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.user_metadata?.is_admin === true

  const { data, error } = await supabase
    .from('parking_spot')
    .select(isAdmin ? 'space, name, plate' : 'space')

  if (error) {
    return { error: error.message }
  }

  return { data, isAdmin }
}

export async function removeParking(space: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('parking_spot')
    .delete()
    .eq('space', space)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function createParking(space: string, name: string, plate: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .single()

  if (existing) {
    return { error: 'This spot is already occupied' }
  }

  const { error } = await supabase.from('parking_spot').insert([{ space, name, plate }])

  if (error) {
    if (error.message.includes('unique_space')) {
      return { error: 'This spot is already occupied' }
    }
    return { error: error.message }
  }
}

// ─── Stripe Checkout Session ───────────────────────────────────────────────

/**
 * Creates a Stripe Checkout Session for card, Pix or Boleto.
 *
 * Boleto requires:
 *  - A Stripe Customer with name, email and CPF as a tax_id (br_cpf)
 *  - `cpf` param (11 digits) must be provided when method === 'boleto'
 *
 * The spot is NOT written to the DB here — the webhook does that after
 * payment confirmation (required for boleto's delayed-notification flow).
 */
export async function createCheckoutSession(
  space: string,
  name: string,
  plate: string,
  method: 'card' | 'pix' | 'boleto',
  cpf?: string, // required for boleto
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Guard: spot must still be free
  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  if (existing) {
    return { error: 'This spot is already occupied' }
  }

  // Boleto validation
  if (method === 'boleto') {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      return { error: 'CPF inválido. Informe os 11 dígitos para pagamento via boleto.' }
    }
  }

const appUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_APP_URL;

    
  const baseParams: Stripe.Checkout.SessionCreateParams = {
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Vaga ${space.toUpperCase()} — Estacionamento`,
            description: `Reserva para ${name} · Placa ${plate.toUpperCase()}`,
          },
          unit_amount: 1000, // R$ 10,00
        },
        quantity: 1,
      },
    ],
    mode: 'payment' as const,
    success_url: `${appUrl}/Parking?session_id={CHECKOUT_SESSION_ID}&space=${space}&status=success`,
    cancel_url: `${appUrl}/Parking?space=${space}&status=cancelled`,
    metadata: { space, name, plate, user_id: user.id },
  }

  // ── Card ────────────────────────────────────────────────────────────────
  if (method === 'card') {
    const session = await stripe.checkout.sessions.create({
      ...baseParams,
      payment_method_types: ['card'],
    })
    return { url: session.url, sessionId: session.id }
  }

  // ── Pix ─────────────────────────────────────────────────────────────────
  if (method === 'pix') {
    const session = await stripe.checkout.sessions.create({
      ...baseParams,
      payment_method_types: ['pix'],
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // Stripe minimum is 30 min
    })
    return { url: session.url, sessionId: session.id }
  }

  // ── Boleto ───────────────────────────────────────────────────────────────
  // Stripe requires a Customer with CPF registered as a tax_id for boleto.
  const cleanCpf = cpf!.replace(/\D/g, '')

  // Reuse existing customer for this email, or create a new one
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 })
  let customer = customers.data[0]

  if (!customer) {
    customer = await stripe.customers.create({
      name,
      email: user.email!,
      tax_id_data: [{ type: 'br_cpf', value: cleanCpf }],
      metadata: { supabase_user_id: user.id },
    })
  } else {
    // Update name in case it changed; tax_ids are immutable after creation
    await stripe.customers.update(customer.id, { name })
  }

  const session = await stripe.checkout.sessions.create({
    ...baseParams,
    payment_method_types: ['boleto'],
    customer: customer.id,
    payment_method_options: {
      boleto: { expires_after_days: 3 },
    },
  })

  return { url: session.url, sessionId: session.id }
}

// ─── Verify session on success redirect ───────────────────────────────────

/**
 * Called when Stripe redirects back to success_url.
 *
 * Card / Pix (instant):
 *   payment_status === 'paid' → spot may already be saved by the webhook.
 *   If not (webhook hasn't fired yet), we save it here as a fallback.
 *   Both paths are idempotent.
 *
 * Boleto (delayed notification):
 *   payment_status === 'unpaid' on redirect — the boleto PDF was issued but
 *   the customer hasn't paid yet. Per Stripe's recommendation we do NOT save
 *   the spot here. The webhook's async_payment_succeeded event will do that
 *   once the bank confirms payment (up to 3 business days).
 *   We return isPending: true so the UI can show an appropriate message.
 */
export async function verifyAndFinalizeSession(sessionId: string) {
  const supabase = await createClient()

  console.log('🔍 [Server] Buscando sessão Stripe:', sessionId)
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  console.log('💳 [Server] Status:', session.payment_status, '| Método:', session.payment_method_types)

  const isBoleto = session.payment_method_types?.includes('boleto')

  // ── Boleto: never finalize on redirect ─────────────────────────────────
  if (isBoleto) {
    const { space, name, plate } = session.metadata as { space: string; name: string; plate: string }

    if (session.payment_status === 'unpaid') {
      // Expected: boleto issued, awaiting payment at the bank
      console.log('🕐 [Server] Boleto emitido — aguardando pagamento')
      return { space, name, plate, isPending: true }
    }

    if (session.payment_status === 'paid') {
      // Rare: boleto paid so quickly the redirect already shows paid.
      // Webhook will also fire — idempotency guard prevents double insert.
      console.log('✅ [Server] Boleto já pago — salvando como fallback')
      return await saveSpot(session, supabase)
    }
  }

  // ── Card / Pix: must be paid ────────────────────────────────────────────
  if (session.payment_status !== 'paid') {
    console.log('❌ [Server] Pagamento não confirmado')
    return { error: 'Payment not confirmed yet' }
  }

  return await saveSpot(session, supabase)
}

// ─── Internal helper ──────────────────────────────────────────────────────

async function saveSpot(
  session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { space, name, plate } = session.metadata as { space: string; name: string; plate: string }

  console.log('📝 [Server] Dados da sessão:', { space, name, plate })

  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  if (existing) {
    // Webhook already saved it — just return so the UI can update
    console.log('⚠️ [Server] Vaga já salva pelo webhook — retornando existente')
    return { space, name, plate, alreadySaved: true }
  }

  // Fallback: webhook hasn't fired yet — save here (idempotent with webhook)
  console.log('📝 [Server] Inserindo no Supabase (fallback):', { space, name, plate })
  const { error } = await supabase.from('parking_spot').insert([{ space, name, plate }])

  if (error) {
    console.log('❌ [Server] Erro Supabase:', error)
    return { error: error.message }
  }

  console.log('✅ [Server] Vaga salva com sucesso!')
  return { space, name, plate }
}