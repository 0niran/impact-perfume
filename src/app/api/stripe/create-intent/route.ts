import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Stripe from 'stripe'
import { validateLinePricing } from '@/lib/pricingGuard'
import { rateLimit } from '@/lib/rateLimit'

interface CartLineDTO {
  variantId: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceKobo: number
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'stripe-create-intent', { limit: 10, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

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

  // Server-side re-pricing — refuse to create an intent if client prices
  // disagree with Medusa (audit H-1).
  const validation = await validateLinePricing(
    typedLines.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      unitPriceKobo: l.unitPriceKobo,
    })),
    'CA'
  )
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.message ?? 'Could not verify pricing.' },
      { status: 400 }
    )
  }
  const total = validation.totalMinor
  if (total <= 0) {
    return NextResponse.json({ ok: false, message: 'Invalid order total.' }, { status: 400 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  // Cryptographically random suffix so refs aren't predictable (audit M-4).
  const reference = `impact-ca-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

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
        // Persist SERVER-derived prices in metadata so the webhook /
        // confirm route uses verified amounts at fulfilment time.
        lines: JSON.stringify(
          typedLines.map((l, i) => ({
            v: l.variantId,
            n: l.name,
            l: l.variantLabel,
            q: l.qty,
            p: validation.lines[i]?.serverUnitPriceMinor ?? l.unitPriceKobo,
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
    // Log the full error server-side but return a generic message to the
    // client so internal Stripe state isn't leaked (audit M-3).
    console.error('[stripe.create-intent] failed:', err)
    return NextResponse.json(
      { ok: false, message: 'Could not initialise payment. Please try again.' },
      { status: 500 }
    )
  }
}
