import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Stripe from 'stripe'
import { validateLinePricing } from '@/lib/pricingGuard'
import { rateLimit } from '@/lib/rateLimit'
import { stripeCreateIntentBodySchema, formatZodError } from '@/lib/validation'
import { packStripeLines } from '@/lib/stripeMetadata'
import { computeStripeTax } from '@/lib/tax'

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
      productId: l.productId,
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
  const subtotal = validation.totalMinor
  if (subtotal <= 0) {
    return NextResponse.json({ ok: false, message: 'Invalid order total.' }, { status: 400 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  // Add Canadian tax at checkout (no-op unless STRIPE_TAX_ENABLED and ship-to CA).
  // Fail closed: if the tax engine is on but errors, don't silently undercharge.
  let tax
  try {
    tax = await computeStripeTax(stripe, {
      subtotalMinor: subtotal,
      currency: 'cad',
      lines: validation.lines.map((l) => ({
        variantId: l.variantId,
        amountMinor: l.serverUnitPriceMinor * l.qty,
        qty: l.qty,
      })),
      address: {
        line1: shippingAddress.address1,
        line2: shippingAddress.address2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        countryCode: shippingAddress.countryCode ?? '',
      },
    })
  } catch (err) {
    console.error('[stripe.create-intent] tax calculation failed:', err)
    return NextResponse.json(
      { ok: false, message: 'Could not calculate tax. Please try again.' },
      { status: 502 }
    )
  }
  const total = tax.totalMinor

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
        // Server-derived money, persisted so the fulfilment path records verified
        // amounts. Metadata values must be strings.
        subtotalMinor: String(subtotal),
        taxMinor: String(tax.taxMinor),
        taxCalculationId: tax.calculationId ?? '',
        // Stripe limits metadata to 50 keys, 500 chars each — well under our typical payload.
        shippingAddress: JSON.stringify(shippingAddress),
        // Persist SERVER-derived prices in metadata so the webhook /
        // confirm route uses verified amounts at fulfilment time. The line
        // array is chunked across numbered keys to stay under Stripe's
        // 500-char-per-value metadata limit on larger carts.
        ...packStripeLines(
          JSON.stringify(
            lines.map((l, i) => ({
              v: l.variantId,
              n: l.name,
              l: l.variantLabel,
              q: l.qty,
              p: validation.lines[i]?.serverUnitPriceMinor ?? l.unitPriceKobo,
            }))
          )
        ),
      },
    })

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      reference,
      subtotalMinor: subtotal,
      taxMinor: tax.taxMinor,
      totalMinor: total,
      currency: 'CAD',
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
