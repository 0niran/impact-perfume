import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { fulfillOrder, type CartLine, type ShippingAddress } from '@/lib/orderFulfillment'
import { verifyPaidOrder } from '@/lib/pricingGuard'
import { buildOwnerAlertEmail, sendEmail } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'

/**
 * Paystack server-to-server webhook. Signed with HMAC-SHA512 of the raw body
 * using PAYSTACK_SECRET_KEY. Fires for every event regardless of whether the
 * customer's browser made it back to us, so it's the authoritative path for
 * order fulfilment.
 *
 * The fulfilment logic is idempotent — if the browser already verified and
 * the order is in Medusa, this is a no-op.
 *
 * Configure in Paystack dashboard:
 *   Settings → API Keys & Webhooks → Webhook URL
 *   https://impactperfumes.com/api/webhooks/paystack
 *
 * Events we care about:
 *   - charge.success  -> fulfil the order
 *   - charge.failed   -> log only (customer sees error on storefront)
 *   - refund.processed -> log only (manual reconciliation for now)
 */

interface PaystackCustomer {
  email?: string
  first_name?: string
  last_name?: string
}

/** Client-sent cart line; carries productId so the server can re-price it. */
interface PaystackLine extends CartLine {
  productId?: string
}

interface PaystackMetadata {
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: ShippingAddress
  lines?: PaystackLine[]
}

interface PaystackChargeData {
  reference: string
  amount: number
  currency?: string
  customer?: PaystackCustomer
  metadata?: PaystackMetadata
}

interface PaystackEvent {
  event: string
  data: PaystackChargeData
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('[paystack-webhook] missing PAYSTACK_SECRET_KEY')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const raw = await req.text()
  const sig = req.headers.get('x-paystack-signature')
  if (!sig) {
    return NextResponse.json({ ok: false, message: 'Missing signature' }, { status: 401 })
  }

  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex')
  // Constant-time compare to avoid timing attacks.
  let valid = expected.length === sig.length
  if (valid) {
    try {
      valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
    } catch {
      valid = false
    }
  }
  if (!valid) {
    console.warn('[paystack-webhook] signature mismatch')
    return NextResponse.json({ ok: false, message: 'Invalid signature' }, { status: 401 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[paystack-webhook] event received', {
    type: event.event,
    reference: event.data?.reference,
  })

  if (event.event === 'charge.success') {
    const d = event.data
    const md = d.metadata ?? {}

    if (!Array.isArray(md.lines) || md.lines.length === 0) {
      console.error('[paystack-webhook] charge.success missing line metadata — cannot fulfil', {
        reference: d.reference,
      })
      return NextResponse.json({ ok: true, skipped: 'no-lines' })
    }

    if (!md.shippingAddress) {
      console.error('[paystack-webhook] charge.success missing shipping metadata', {
        reference: d.reference,
      })
      return NextResponse.json({ ok: true, skipped: 'no-shipping' })
    }

    const fullName =
      md.customerName ??
      `${d.customer?.first_name ?? ''} ${d.customer?.last_name ?? ''}`.trim()

    // Paystack's inline `amount` is set client-side, and this webhook is an
    // independent fulfilment trigger. Re-price against Medusa AND assert the
    // captured amount matches the server total before fulfilling, so a
    // tampered client can't underpay and still get an order (audit H-1).
    if ((d.currency ?? 'NGN').toUpperCase() !== 'NGN') {
      console.error('[paystack-webhook] unexpected currency — refusing to fulfil', {
        reference: d.reference,
        currency: d.currency,
      })
      return NextResponse.json({ ok: true, skipped: 'currency-mismatch' })
    }

    const verified = await verifyPaidOrder(md.lines, 'NG', d.amount)
    if (!verified.ok) {
      console.error('[paystack-webhook] re-pricing/amount check failed — refusing to fulfil', {
        reference: d.reference,
        paidAmount: d.amount,
        message: verified.message,
      })
      // Retrying won't fix a pricing/amount mismatch, so ack to stop retries.
      return NextResponse.json({ ok: true, skipped: 'pricing-mismatch' })
    }

    try {
      const result = await fulfillOrder({
        reference: d.reference,
        regionId: 'NG',
        totalKobo: verified.totalMinor,
        currency: 'NGN',
        customerName: fullName,
        customerEmail: md.customerEmail ?? d.customer?.email ?? '',
        customerPhone: md.customerPhone ?? '',
        shippingAddress: md.shippingAddress,
        lines: verified.lines,
        paymentProvider: 'paystack',
        paymentRef: d.reference,
        source: 'webhook',
      })
      if (!result.ok) {
        // Order creation failed and the lock was released — 500 so Paystack retries.
        return NextResponse.json({ ok: false }, { status: 500 })
      }
    } catch (err) {
      console.error('[paystack-webhook] fulfilOrder threw', err)
      // Return 500 so Paystack retries
      return NextResponse.json({ ok: false }, { status: 500 })
    }
  } else if (event.event === 'charge.failed') {
    console.warn('[paystack-webhook] charge failed', { reference: event.data?.reference })
  } else if (event.event === 'refund.processed') {
    const d = event.data
    const amount = ((d.amount ?? 0) / 100).toLocaleString('en-NG')
    const cur = (d.currency ?? 'NGN').toUpperCase()
    console.warn('[paystack-webhook] refund processed — manual reconciliation required', {
      reference: d?.reference,
    })
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildOwnerAlertEmail({
        subjectPrefix: 'Refund',
        heading: `Refund processed · ${cur} ${amount}`,
        intro:
          'A Paystack payment was refunded. Update the order in Medusa and restock the item if it is being returned.',
        items: [
          {
            title: `Reference ${d?.reference ?? '(none)'}`,
            lines: [`Amount refunded: ${cur} ${amount}`, `Customer: ${d?.customer?.email ?? '(unknown)'}`],
          },
        ],
      }),
    }).catch((err) => console.error('[paystack-webhook] refund alert failed', err))
  }

  return NextResponse.json({ ok: true })
}
