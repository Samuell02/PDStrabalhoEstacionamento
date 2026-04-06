import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: Request) {
  const { name, plate, space } = await req.json()

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Parking ${space}`,
            },
            unit_amount: 1000, // R$10,00
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
      metadata: {
        name,
        plate,
        space,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao criar pagamento' })
  }
}