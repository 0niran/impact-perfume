import { NextRequest, NextResponse } from 'next/server'
import { fulfillOrder } from '@/lib/orderFulfillment'
import { getPickupLocation } from '@/lib/config'
import { verifyPaidOrder } from '@/lib/pricingGuard'
import { rateLimit } from '@/lib/rateLimit'
import { verifyPaymentBodySchema, formatZodError } from '@/lib/validation'
import { verifyDeliveryQuote } from '@/lib/deliveryQuote'

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data?: {
    status: string
    amount: number
    currency: string
    reference: string
  }
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'verify-payment', { limit: 10, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, message: 'Payment service not configured.' },
      { status: 500 }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = verifyPaymentBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const {
    reference,
    amountKobo,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    fulfillmentMethod,
    pickupLocationId,
    deliveryQuoteToken,
    lines,
  } = parsed.data

  const pickupLocation =
    fulfillmentMethod === 'pickup' ? getPickupLocation(pickupLocationId) : undefined

  // For a shipping order, the delivery fee + geocoded coordinates come from the
  // signed quote token, bound to this exact address. Never trust a client fee.
  const verifiedQuote =
    fulfillmentMethod !== 'pickup'
      ? verifyDeliveryQuote(deliveryQuoteToken, shippingAddress)
      : null

  // 1. Verify with Paystack
  let tx
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    const data: PaystackVerifyResponse = await res.json()

    if (!data.status || !data.data) {
      return NextResponse.json({ ok: false, message: 'Could not verify payment.' })
    }

    tx = data.data

    if (tx.status !== 'success') {
      return NextResponse.json({ ok: false, message: `Payment status: ${tx.status}.` })
    }

    if (Math.abs(tx.amount - amountKobo) > 1) {
      return NextResponse.json({ ok: false, message: 'Payment amount mismatch.' })
    }

    // Paystack settles in NGN; reject anything else rather than fulfil against
    // a currency the re-pricing guard assumes is NGN.
    if ((tx.currency ?? 'NGN').toUpperCase() !== 'NGN') {
      return NextResponse.json({ ok: false, message: 'Unexpected payment currency.' })
    }
  } catch {
    return NextResponse.json({ ok: false, message: 'Verification request failed.' }, { status: 500 })
  }

  // 2. Server-side re-pricing + amount assertion. Confirm the client-sent
  //    lines match Medusa's canonical prices AND that the amount Paystack
  //    captured equals the server total. Shared with the Paystack webhook so
  //    both fulfilment triggers enforce the same checks (audit H-1).
  const verified = await verifyPaidOrder(lines, 'NG', tx.amount, verifiedQuote?.rawFeeMinor ?? 0)
  if (!verified.ok) {
    console.error('[verify-payment] re-pricing/amount check failed — refusing to fulfil', {
      reference: tx.reference,
      paystackAmount: tx.amount,
      message: verified.message,
    })
    return NextResponse.json(
      {
        ok: false,
        message:
          'We received your payment but the order could not be verified. Please contact support with reference ' +
          tx.reference,
      },
      { status: 400 }
    )
  }

  // 3. Fulfill with SERVER-derived line prices and total.
  const fulfilment = await fulfillOrder({
    reference: tx.reference,
    regionId: 'NG',
    totalKobo: verified.totalMinor,
    currency: 'NGN',
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress: {
      address1: shippingAddress.address1,
      address2: shippingAddress.address2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    },
    lines: verified.lines,
    subtotalMinor: verified.subtotalMinor,
    deliveryFeeMinor: verified.deliveryFeeMinor,
    deliveryGeo: verifiedQuote ? { lat: verifiedQuote.lat, lng: verifiedQuote.lng } : undefined,
    paymentProvider: 'paystack',
    paymentRef: tx.reference,
    fulfillmentMethod: fulfillmentMethod ?? 'shipping',
    pickupLocationName: pickupLocation?.name,
  })

  if (!fulfilment.ok) {
    // Payment captured but order creation failed; the lock was released so the
    // Paystack webhook can retry. Tell the customer it's being finalised.
    return NextResponse.json(
      {
        ok: false,
        message:
          'Your payment went through, but we hit a snag finalising your order. No need to pay again — our team has been notified. Please contact support with reference ' +
          tx.reference,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, reference: tx.reference })
}
