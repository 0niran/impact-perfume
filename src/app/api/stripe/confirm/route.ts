import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillOrder, type CartLine, type ShippingAddress } from '@/lib/orderFulfillment'
import { SITE_CONFIG } from '@/lib/config'
import { unpackStripeLines } from '@/lib/stripeMetadata'

/**
 * Stripe return_url lands here after the customer confirms a payment.
 * Verifies the PaymentIntent server-side, fulfils the order from intent
 * metadata, then redirects to /order-confirmed?ref=…
 *
 * If the intent isn't successful (still processing, requires action, failed)
 * the customer is sent back to /checkout with an error.
 */
export async function GET(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const base = SITE_CONFIG.url
  if (!stripeKey) return NextResponse.redirect(`${base}/checkout?error=stripe_unconfigured`)

  const intentId = req.nextUrl.searchParams.get('payment_intent')
  if (!intentId) return NextResponse.redirect(`${base}/checkout?error=missing_intent`)

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-04-22.dahlia',
  })

  let intent: Stripe.PaymentIntent
  try {
    intent = await stripe.paymentIntents.retrieve(intentId)
  } catch (err) {
    console.error('[stripe.confirm] retrieve failed:', err)
    return NextResponse.redirect(`${base}/checkout?error=verify_failed`)
  }

  if (intent.status !== 'succeeded') {
    return NextResponse.redirect(
      `${base}/checkout?error=${encodeURIComponent(intent.status)}`
    )
  }

  const md = intent.metadata ?? {}
  const reference = md.reference ?? intent.id
  let shippingAddress: ShippingAddress
  let lines: CartLine[]
  try {
    shippingAddress = JSON.parse(md.shippingAddress || '{}') as ShippingAddress
    const rawLines = JSON.parse(unpackStripeLines(md) || '[]') as {
      v: string; n: string; l?: string; q: number; p: number
    }[]
    lines = rawLines.map((l) => ({
      variantId: l.v,
      name: l.n,
      variantLabel: l.l,
      qty: l.q,
      unitPriceKobo: l.p,
    }))
  } catch (err) {
    console.error('[stripe.confirm] metadata parse failed:', err)
    return NextResponse.redirect(`${base}/checkout?error=metadata_parse`)
  }

  await fulfillOrder({
    reference,
    regionId: 'CA',
    totalKobo: intent.amount,
    currency: intent.currency.toUpperCase(),
    customerName: md.customerName ?? '',
    customerEmail: md.customerEmail ?? (intent.receipt_email ?? ''),
    customerPhone: md.customerPhone ?? '',
    shippingAddress,
    lines,
    paymentProvider: 'stripe',
    paymentRef: intent.id,
  })

  return NextResponse.redirect(`${base}/order-confirmed?ref=${encodeURIComponent(reference)}`)
}
