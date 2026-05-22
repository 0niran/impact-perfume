import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Stripe from 'stripe'
import { validateLinePricing } from '@/lib/pricingGuard'
import { rateLimit } from '@/lib/rateLimit'
import { stripeCreateIntentBodySchema, formatZodError } from '@/lib/validation'

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

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = stripeCreateIntentBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const { lines, customerName, customerEmail, customerPhone, shippingAddress } = parsed.data

  // Server-side re-pricing — refuse to create an intent if client prices
  // disagree with Medusa (audit H-1).
  const validation = await validateLinePricing(
    lines.map((l) => ({
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
        customerName,
        customerEmail,
        customerPhone: customerPhone ?? '',
        // Metadata values must be strings; stringify the structured fields.
        // Stripe limits metadata to 50 keys, 500 chars each — well under our typical payload.
        shippingAddress: JSON.stringify(shippingAddress),
        // Persist SERVER-derived prices in metadata so the webhook /
        // confirm route uses verified amounts at fulfilment time.
        lines: JSON.stringify(
          lines.map((l, i) => ({
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
