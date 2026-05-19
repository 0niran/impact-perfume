import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

interface CartLineDTO {
  variantId: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceKobo: number
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json(
      { ok: false, message: 'Stripe is not configured.' },
      { status: 500 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const { lines, currency, customerName, customerEmail, customerPhone, shippingAddress } = body

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ ok: false, message: 'Cart is empty.' }, { status: 400 })
  }
  if (typeof currency !== 'string' || !['cad', 'CAD'].includes(currency)) {
    return NextResponse.json(
      { ok: false, message: 'Stripe checkout currently supports CAD only.' },
      { status: 400 }
    )
  }
  if (!customerEmail || typeof customerEmail !== 'string') {
    return NextResponse.json({ ok: false, message: 'Email is required.' }, { status: 400 })
  }

  const typedLines = lines as CartLineDTO[]
  const total = typedLines.reduce((s, l) => s + l.unitPriceKobo * l.qty, 0)
  if (total <= 0) {
    return NextResponse.json({ ok: false, message: 'Invalid order total.' }, { status: 400 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  const reference = `impact-ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'cad',
      receipt_email: customerEmail,
      automatic_payment_methods: { enabled: true },
      metadata: {
        reference,
        customerName: typeof customerName === 'string' ? customerName.slice(0, 200) : '',
        customerEmail,
        customerPhone: typeof customerPhone === 'string' ? customerPhone.slice(0, 50) : '',
        // Metadata values must be strings; stringify the structured fields.
        // Stripe limits metadata to 50 keys, 500 chars each — well under our typical payload.
        shippingAddress: JSON.stringify(shippingAddress ?? {}),
        lines: JSON.stringify(
          typedLines.map((l) => ({
            v: l.variantId,
            n: l.name,
            l: l.variantLabel,
            q: l.qty,
            p: l.unitPriceKobo,
          }))
        ),
      },
    })

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      reference,
    })
  } catch (err) {
    console.error('[stripe.create-intent] failed:', err)
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : 'Could not initialise payment.',
      },
      { status: 500 }
    )
  }
}
