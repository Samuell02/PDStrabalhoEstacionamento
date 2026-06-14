'use server'

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(
  space: string,
  name: string,
  plate: string
) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Vaga de Estacionamento ${space}`,
            description: `Responsável: ${name} | Placa: ${plate}`,
          },
          unit_amount: 1000, // R$ 10,00 em centavos
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: { space, name, plate },
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?space=${space}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
  })

  return { url: session.url }
}