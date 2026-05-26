import { NextRequest, NextResponse } from 'next/server'
import { fulfillOrder, type CartLine } from '@/lib/orderFulfillment'
import { validateLinePricing } from '@/lib/pricingGuard'
import { rateLimit } from '@/lib/rateLimit'
import { verifyPaymentBodySchema, formatZodError } from '@/lib/validation'

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
    lines,
  } = parsed.data

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
  } catch {
    return NextResponse.json({ ok: false, message: 'Verification request failed.' }, { status: 500 })
  }

  // 2. Server-side re-pricing — confirm the client-sent line items match
  //    Medusa's canonical prices. Refuse fulfilment if they don't, since
  //    accepting the order would let the client choose the line totals
  //    written to Medusa (audit H-1).
  const validation = await validateLinePricing(
    lines.map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      qty: l.qty,
      unitPriceKobo: l.unitPriceKobo,
    })),
    'NG'
  )
  if (!validation.ok) {
    console.error('[verify-payment] pricing mismatch — refusing to fulfil', {
      reference: tx.reference,
      message: validation.message,
    })
    return NextResponse.json(
      {
        ok: false,
        message:
          'We received your payment but the prices in your cart no longer match. Please contact support with reference ' +
          tx.reference,
      },
      { status: 400 }
    )
  }
  if (Math.abs(validation.totalMinor - tx.amount) > 1) {
    console.error('[verify-payment] paystack amount disagrees with server total', {
      reference: tx.reference,
      paystackAmount: tx.amount,
      serverTotal: validation.totalMinor,
    })
    return NextResponse.json(
      {
        ok: false,
        message:
          'Order total mismatch. Please contact support with reference ' + tx.reference,
      },
      { status: 400 }
    )
  }

  // 3. Fulfill order with SERVER-derived line prices so an attacker
  //    can't seed cheap line items via the client.
  const safeLines: CartLine[] = lines.map((l, i) => ({
    variantId: l.variantId,
    name: l.name,
    variantLabel: l.variantLabel,
    qty: l.qty,
    unitPriceKobo: validation.lines[i]?.serverUnitPriceMinor ?? l.unitPriceKobo,
  }))

  await fulfillOrder({
    reference: tx.reference,
    regionId: 'NG',
    totalKobo: validation.totalMinor,
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
    lines: safeLines,
    paymentProvider: 'paystack',
    paymentRef: tx.reference,
  })

  return NextResponse.json({ ok: true, reference: tx.reference })
}
