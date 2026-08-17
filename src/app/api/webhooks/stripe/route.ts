import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillOrder, type CartLine, type ShippingAddress } from '@/lib/orderFulfillment'
import { claimPayment } from '@/lib/processedPayment'
import { unpackStripeLines } from '@/lib/stripeMetadata'
import { buildOwnerAlertEmail, sendEmail } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'
import { recordTaxTransaction } from '@/lib/tax'
import { serverEnv } from '@/lib/env'

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
  const stripeKey = serverEnv.stripeSecretKey
  const signingSecret = serverEnv.stripeWebhookSecret
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

    // Bespoke deposits are not cart orders — they carry no line metadata and
    // must not go through fulfilOrder. Parity with the NG deposit, which also
    // records nothing server-side; the charge lives in the Stripe dashboard and
    // the inquiry is already saved in Sanity.
    if (md.kind === 'bespoke-deposit') {
      console.log('[stripe-webhook] bespoke deposit paid', {
        intentId: intent.id,
        inquiryId: md.inquiryId || '(none)',
        reference: md.reference || '(none)',
      })
      return NextResponse.json({ ok: true, kind: 'bespoke-deposit' })
    }

    let shippingAddress: ShippingAddress
    let lines: CartLine[]
    try {
      shippingAddress = JSON.parse(md.shippingAddress || '{}') as ShippingAddress
      const rawLines = JSON.parse(unpackStripeLines(md) || '[]') as Array<{
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
      const result = await fulfillOrder({
        reference: md.reference ?? intent.id,
        regionId: 'CA',
        totalKobo: intent.amount,
        currency: intent.currency.toUpperCase(),
        customerName: md.customerName ?? '',
        customerEmail: md.customerEmail ?? intent.receipt_email ?? '',
        customerPhone: md.customerPhone ?? '',
        shippingAddress,
        lines,
        subtotalMinor: md.subtotalMinor ? Number(md.subtotalMinor) : undefined,
        taxMinor: md.taxMinor ? Number(md.taxMinor) : undefined,
        taxCalculationId: md.taxCalculationId || undefined,
        paymentProvider: 'stripe',
        paymentRef: intent.id,
        source: 'webhook',
      })
      // Record the collected tax for remittance (idempotent by reference).
      await recordTaxTransaction(stripe, md.taxCalculationId || undefined, md.reference ?? intent.id)
      if (!result.ok) {
        // Order creation failed and the lock was released — 500 so Stripe
        // retries with backoff.
        return NextResponse.json({ ok: false }, { status: 500 })
      }
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
    const amount = ((charge.amount_refunded ?? 0) / 100).toFixed(2)
    const cur = (charge.currency ?? '').toUpperCase()
    console.warn('[stripe-webhook] charge.refunded — manual reconciliation required', {
      chargeId: charge.id,
      paymentIntent: charge.payment_intent,
    })
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildOwnerAlertEmail({
        subjectPrefix: 'Refund',
        heading: `Refund processed · ${amount} ${cur}`,
        intro:
          'A Stripe charge was refunded. Update the order in Medusa and restock the item if it is being returned.',
        items: [
          {
            title: `Charge ${charge.id}`,
            lines: [
              `Amount refunded: ${amount} ${cur}`,
              `Reference: ${charge.metadata?.reference ?? '(none)'}`,
              `Payment intent: ${String(charge.payment_intent ?? '(none)')}`,
              `Customer: ${charge.billing_details?.email ?? charge.receipt_email ?? '(unknown)'}`,
            ],
          },
        ],
      }),
    }).catch((err) => console.error('[stripe-webhook] refund alert failed', err))
  } else if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    const amount = ((dispute.amount ?? 0) / 100).toFixed(2)
    const cur = (dispute.currency ?? '').toUpperCase()
    const dueBy = dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString().slice(0, 10)
      : '(none)'
    console.warn('[stripe-webhook] dispute created — action required in Stripe dashboard', {
      disputeId: dispute.id,
      amount: dispute.amount,
      reason: dispute.reason,
    })
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildOwnerAlertEmail({
        subjectPrefix: 'Dispute',
        heading: `Payment dispute · ${amount} ${cur}`,
        intro:
          'A customer disputed a Stripe payment. Respond with evidence in the Stripe dashboard before the deadline or the funds are lost.',
        items: [
          {
            title: `Dispute ${dispute.id}`,
            lines: [
              `Amount: ${amount} ${cur}`,
              `Reason: ${dispute.reason}`,
              `Evidence due by: ${dueBy}`,
              `Payment intent: ${String(dispute.payment_intent ?? '(none)')}`,
            ],
          },
        ],
      }),
    }).catch((err) => console.error('[stripe-webhook] dispute alert failed', err))
  }

  return NextResponse.json({ ok: true })
}
