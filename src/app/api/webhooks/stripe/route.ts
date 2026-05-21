import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillOrder, type CartLine, type ShippingAddress } from '@/lib/orderFulfillment'
import { claimPayment } from '@/lib/processedPayment'

/**
 * Stripe webhook receiver. Verifies the request signature using
 * STRIPE_WEBHOOK_SECRET, then dispatches by event type. Idempotent against
 * the redirect-verify path via the processedPayment Sanity lock.
 *
 * Configure in Stripe dashboard:
 *   Developers → Webhooks → Add endpoint
 *   URL: https://impactperfumes.com/api/webhooks/stripe
 *   Events: payment_intent.succeeded, payment_intent.payment_failed,
 *           charge.refunded, charge.dispute.created
 *   Copy the signing secret into STRIPE_WEBHOOK_SECRET on Vercel.
 *
 * Important: in Next.js App Router we read the raw text body via req.text()
 * because Stripe's signature is computed over the raw payload.
 */

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey || !signingSecret) {
    console.error('[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  const raw = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ ok: false, message: 'Missing signature' }, { status: 401 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, signingSecret)
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed', err)
    return NextResponse.json({ ok: false, message: 'Invalid signature' }, { status: 401 })
  }

  console.log('[stripe-webhook] event received', { type: event.type, id: event.id })

  // Stripe explicitly recommends deduplicating by event.id — they may
  // replay the same event under retry conditions (audit M-2).
  const eventLockClaimed = await claimPayment(`stripe-event-${event.id}`, 'stripe', 'webhook')
  if (!eventLockClaimed) {
    return NextResponse.json({ ok: true, deduped: true })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const md = intent.metadata ?? {}

    let shippingAddress: ShippingAddress
    let lines: CartLine[]
    try {
      shippingAddress = JSON.parse(md.shippingAddress || '{}') as ShippingAddress
      const rawLines = JSON.parse(md.lines || '[]') as Array<{
        v: string; n: string; l?: string; q: number; p: number
      }>
      lines = rawLines.map((l) => ({
        variantId: l.v,
        productId: '',
        name: l.n,
        variantLabel: l.l ?? '',
        qty: l.q,
        unitPriceKobo: l.p,
      }))
    } catch (err) {
      console.error('[stripe-webhook] metadata parse failed', err)
      return NextResponse.json({ ok: true, skipped: 'metadata-parse' })
    }

    if (lines.length === 0) {
      console.warn('[stripe-webhook] payment_intent.succeeded with no lines metadata', {
        intentId: intent.id,
      })
      return NextResponse.json({ ok: true, skipped: 'no-lines' })
    }

    try {
      await fulfillOrder({
        reference: md.reference ?? intent.id,
        regionId: 'CA',
        totalKobo: intent.amount,
        currency: intent.currency.toUpperCase(),
        customerName: md.customerName ?? '',
        customerEmail: md.customerEmail ?? intent.receipt_email ?? '',
        customerPhone: md.customerPhone ?? '',
        shippingAddress,
        lines,
        paymentProvider: 'stripe',
        paymentRef: intent.id,
        source: 'webhook',
      })
    } catch (err) {
      console.error('[stripe-webhook] fulfilOrder threw', err)
      // 500 so Stripe retries with backoff
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent
    console.warn('[stripe-webhook] payment_intent.payment_failed', {
      intentId: intent.id,
      lastError: intent.last_payment_error?.message,
    })
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    console.warn('[stripe-webhook] charge.refunded — manual reconciliation required', {
      chargeId: charge.id,
      paymentIntent: charge.payment_intent,
    })
  } else if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    console.warn('[stripe-webhook] dispute created — action required in Stripe dashboard', {
      disputeId: dispute.id,
      amount: dispute.amount,
      reason: dispute.reason,
    })
  }

  return NextResponse.json({ ok: true })
}
