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

// ─── New: create a Stripe Checkout Session ────────────────────────────────

export async function createCheckoutSession(
  space: string,
  name: string,
  plate: string,
  method: 'card' | 'pix',
) {
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
    .maybeSingle()

  if (existing) {
    return { error: 'This spot is already occupied' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    method === 'pix' ? ['pix'] : ['card']

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: paymentMethodTypes,
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
    mode: 'payment',
    success_url: `${appUrl}/Parking?session_id={CHECKOUT_SESSION_ID}&space=${space}&status=success`,
    cancel_url: `${appUrl}/Parking?space=${space}&status=cancelled`,
    metadata: {
      space,
      name,
      plate,
      user_id: user.id,
    },
  }

  // Pix QR codes expire — limit session to 10 minutes
  if (method === 'pix') {
    sessionParams.expires_at = Math.floor(Date.now() / 1000) + 60 * 30 // Stripe minimum is 30 min
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return { url: session.url, sessionId: session.id }
}

// ─── New: verify a completed session on success redirect ──────────────────

export async function verifyAndFinalizeSession(sessionId: string) {
  const supabase = await createClient()

  console.log('🔍 [Server] Buscando sessão Stripe:', sessionId)
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  console.log('💳 [Server] Status pagamento:', session.payment_status)

  if (session.payment_status !== 'paid') {
    console.log('❌ [Server] Pagamento não confirmado')
    return { error: 'Payment not confirmed yet' }
  }

  const { space, name, plate } = session.metadata as {
    space: string
    name: string
    plate: string
  }
  console.log('📝 [Server] Dados da sessão:', { space, name, plate })

  const { data: existing } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  console.log('🔍 [Server] Vaga já existe?', existing)

  if (existing) {
    console.log('⚠️ [Server] Vaga já ocupada, retornando existente')
    return { space, name, plate, alreadySaved: true }
  }

  console.log('📝 [Server] Inserindo no Supabase:', { space, name, plate })
  const { error } = await supabase.from('parking_spot').insert([{ space, name, plate }])

  if (error) {
    console.log('❌ [Server] Erro Supabase:', error)
    return { error: error.message }
  }

  console.log('✅ [Server] Vaga salva com sucesso!')
  return { space, name, plate }
}