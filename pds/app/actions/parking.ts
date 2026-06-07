'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Service-role client — bypasses RLS entirely, no user session needed
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

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

export async function createCheckoutSession(
  space: string,
  name: string,
  plate: string,
  method: 'card' | 'pix' | 'boleto',
  cpf?: string,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Use service role for guard check so RLS doesn't interfere
  const serviceSupabase = getServiceSupabase()
  const { data: existing } = await serviceSupabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  if (existing) {
    return { error: 'This spot is already occupied' }
  }

  if (method === 'boleto') {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      return { error: 'CPF inválido. Informe os 11 dígitos para pagamento via boleto.' }
    }
  }

  const appUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXT_PUBLIC_APP_URL

  const baseParams = {
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Vaga ${space.toUpperCase()} — Estacionamento`,
            description: `Reserva para ${name} · Placa ${plate.toUpperCase()}`,
          },
          unit_amount: 1000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment' as const,
    success_url: `${appUrl}/Parking?session_id={CHECKOUT_SESSION_ID}&space=${space}&status=success`,
    cancel_url: `${appUrl}/Parking?space=${space}&status=cancelled`,
    metadata: { space, name, plate, user_id: user.id },
  }

  if (method === 'card') {
    const session = await stripe.checkout.sessions.create({
      ...baseParams,
      payment_method_types: ['card'],
    })
    return { url: session.url, sessionId: session.id }
  }

  if (method === 'pix') {
    const session = await stripe.checkout.sessions.create({
      ...baseParams,
      payment_method_types: ['pix'],
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    })
    return { url: session.url, sessionId: session.id }
  }

  // Boleto
  const cleanCpf = cpf!.replace(/\D/g, '')
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

export async function verifyAndFinalizeSession(sessionId: string) {
  console.log('🔍 [Server] Buscando sessão Stripe:', sessionId)
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  console.log('💳 [Server] Status:', session.payment_status, '| Método:', session.payment_method_types)

  const isBoleto = session.payment_method_types?.includes('boleto')

  if (isBoleto) {
    const { space, name, plate } = session.metadata as { space: string; name: string; plate: string }

    if (session.payment_status === 'unpaid') {
      console.log('🕐 [Server] Boleto emitido — aguardando pagamento')
      return { space, name, plate, isPending: true }
    }

    if (session.payment_status === 'paid') {
      console.log('✅ [Server] Boleto já pago — salvando como fallback')
      return await saveSpot(session)
    }
  }

  if (session.payment_status !== 'paid') {
    console.log('❌ [Server] Pagamento não confirmado:', session.payment_status)
    return { error: 'Payment not confirmed yet' }
  }

  return await saveSpot(session)
}

// ─── Internal helper ──────────────────────────────────────────────────────

async function saveSpot(
  session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>,
) {
  const { space, name, plate } = session.metadata as { space: string; name: string; plate: string }

  console.log('📝 [Server] saveSpot chamado para vaga:', space)

  // Always use service role — bypasses RLS, works without user session
  const supabase = getServiceSupabase()

  const { data: existing, error: selectError } = await supabase
    .from('parking_spot')
    .select('id')
    .eq('space', space)
    .maybeSingle()

  console.log('🔍 [Server] Vaga já existe?', existing, '| Erro select:', selectError)

  if (existing) {
    console.log('⚠️ [Server] Vaga já salva — retornando existente')
    return { space, name, plate, alreadySaved: true }
  }

  console.log('📝 [Server] Inserindo no Supabase:', { space, name, plate })
  const { error } = await supabase.from('parking_spot').insert([{ space, name, plate }])

  if (error) {
    console.log('❌ [Server] Erro no insert:', error.message, error.code, error.details)
    return { error: error.message }
  }

  console.log('✅ [Server] Vaga salva com sucesso!')
  return { space, name, plate }
}