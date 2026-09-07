import { NextRequest, NextResponse } from 'next/server'
import { shippingQuoteBodySchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import {
  buildShippingQuoteRequestEmail,
  buildOwnerAlertEmail,
  sendEmail,
  type AlertItem,
} from '@/lib/email'
import { formatPrice } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/config'

/**
 * Canadian shipping-quote requests.
 *
 * Canada has no live carrier rates, so delivery is priced per order. Charging
 * for goods and invoicing shipping afterwards would mean taking money before
 * the customer knows their total, so this endpoint deliberately moves NO money:
 * it records the request, acknowledges it to the customer, and alerts the
 * business to reply with a cost and a payment link.
 *
 * Because nothing is charged, the failure mode that matters is a silent drop —
 * the customer believing an order exists that we never saw. So the response is
 * only ok when the business notification was actually accepted.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Unauthenticated and it sends mail, so it is a spam vector. Same shape of
  // limit as the newsletter endpoint.
  const limit = await rateLimit(req, 'shipping-quote', { limit: 5, window: '10 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  const parsed = shippingQuoteBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Please check your details.' },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Trust the cart's own prices only for display in the notification. Nothing
  // is charged here, and the real total is quoted by a human afterwards, so
  // this figure is informational rather than authoritative.
  const itemsTotalMinor = data.lines.reduce((sum, l) => sum + l.unitPriceKobo * l.qty, 0)

  const delivery = data.deliverySameAsContact ? data.contactAddress : data.deliveryAddress
  const deliveryLines = delivery
    ? [
        delivery.address1,
        delivery.address2,
        [delivery.city, delivery.state, delivery.postalCode].filter(Boolean).join(', '),
        delivery.country,
      ].filter((l): l is string => Boolean(l && l.trim()))
    : []

  const itemLines = data.lines.map(
    (l) =>
      `${l.qty} × ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''} — ${formatPrice(
        l.unitPriceKobo * l.qty,
        data.currency
      )}`
  )

  const alertItems: AlertItem[] = [
    {
      title: 'Customer',
      lines: [
        data.customerName,
        data.customerEmail,
        data.customerPhone || 'No phone given',
      ].filter(Boolean),
    },
    {
      title: data.deliverySameAsContact
        ? 'Deliver to (same as contact address)'
        : 'Deliver to (different from contact address)',
      lines: deliveryLines.length ? deliveryLines : ['No address captured'],
    },
    {
      title: `Items — ${formatPrice(itemsTotalMinor, data.currency)} excluding shipping`,
      lines: itemLines,
    },
  ]

  // When the delivery address differs, include the contact address too so the
  // owner can sanity-check the pair before quoting.
  if (!data.deliverySameAsContact) {
    const c = data.contactAddress
    alertItems.splice(2, 0, {
      title: 'Contact address',
      lines: [
        c.address1,
        c.address2,
        [c.city, c.state, c.postalCode].filter(Boolean).join(', '),
        c.country,
      ].filter((l): l is string => Boolean(l && l.trim())),
    })
  }

  const owner = buildOwnerAlertEmail({
    subjectPrefix: 'Shipping quote needed',
    heading: `Canadian delivery for ${data.customerName}`,
    intro:
      'A customer has asked for a shipping quote. No payment has been taken. Reply with the ' +
      'delivery cost and a payment link for the full total.',
    items: alertItems,
  })

  try {
    // The business notification is the one that must land — without it the
    // request is lost. Send it first and fail loudly if it throws.
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: owner.subject,
      html: owner.html,
    })
  } catch (err) {
    console.error('[shipping-quote] business notification failed', err)
    return NextResponse.json(
      {
        ok: false,
        message:
          'We could not submit your request just now. Please try again, or message us on WhatsApp.',
      },
      { status: 502 }
    )
  }

  // The customer acknowledgement is best-effort: the request is already safely
  // with the business, so a mail failure here must not tell them it failed.
  try {
    const ack = buildShippingQuoteRequestEmail({
      customerName: data.customerName,
      deliveryLines,
      itemsTotalMinor,
      currency: data.currency,
    })
    await sendEmail({ to: data.customerEmail, subject: ack.subject, html: ack.html })
  } catch (err) {
    console.error('[shipping-quote] customer acknowledgement failed', err)
  }

  return NextResponse.json({ ok: true })
}
