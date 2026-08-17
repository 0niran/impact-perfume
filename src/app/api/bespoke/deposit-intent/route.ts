import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Stripe from 'stripe'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { getBespokeConfig } from '@/lib/bespokeConfig'
import { computeBespokeEstimate } from '@/lib/bespokePricing'

/**
 * Creates a Stripe PaymentIntent for a Canadian bespoke deposit.
 *
 * The deposit amount is recomputed here from the Medusa CAD config and never
 * trusted from the client (mirrors /api/stripe/create-intent). The intent is
 * stamped with kind:'bespoke-deposit' so the Stripe webhook skips it instead of
 * trying to fulfil a cart order. NG deposits keep using the Paystack inline flow.
 */

const bodySchema = z.object({
  volumeKey: z.string().min(1).max(40),
  bottleTypeKey: z.string().min(1).max(40),
  inscriptionKey: z.string().min(1).max(40).nullable(),
  quantity: z.number().int().positive().max(1000),
  inquiryId: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().max(200).optional(),
  customerName: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'bespoke-deposit-intent', { limit: 10, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ ok: false, message: 'Stripe is not configured.' }, { status: 500 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid selection.' }, { status: 400 })
  }
  const sel = parsed.data

  // Recompute the deposit from the CAD config. Null = CAD not priced yet, so
  // there's no live deposit to take — the customer goes down the quote path.
  const config = await getBespokeConfig('cad')
  if (!config) {
    return NextResponse.json(
      { ok: false, message: 'Bespoke pricing is not available for your region yet.' },
      { status: 400 }
    )
  }

  const estimate = computeBespokeEstimate(config, {
    volumeKey: sel.volumeKey,
    bottleTypeKey: sel.bottleTypeKey,
    inscriptionKey: sel.inscriptionKey,
    quantity: sel.quantity,
  })
  if (estimate.needsQuote || estimate.depositMinor <= 0) {
    return NextResponse.json(
      { ok: false, message: 'This order needs a custom quote.', needsQuote: estimate.needsQuote },
      { status: 400 }
    )
  }

  const reference = `impact-bespoke-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  try {
    const intent = await stripe.paymentIntents.create({
      amount: estimate.depositMinor, // CAD cents, server-derived
      currency: 'cad',
      receipt_email: sel.customerEmail,
      automatic_payment_methods: { enabled: true },
      metadata: {
        // The webhook keys off this to skip cart fulfilment for deposits.
        kind: 'bespoke-deposit',
        reference,
        inquiryId: sel.inquiryId ?? '',
        customerName: sel.customerName ?? '',
        customerEmail: sel.customerEmail ?? '',
        depositMinor: String(estimate.depositMinor),
        totalMinor: String(estimate.totalMinor),
      },
    })
    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      reference,
      depositMinor: estimate.depositMinor,
    })
  } catch (err) {
    console.error('[bespoke.deposit-intent] stripe create failed:', err)
    return NextResponse.json(
      { ok: false, message: 'Could not initialise payment. Please try again.' },
      { status: 502 }
    )
  }
}
