import { NextRequest, NextResponse } from 'next/server'
import { fulfillOrder, type ShippingAddress, type CartLine } from '@/lib/orderFulfillment'

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
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, message: 'Payment service not configured.' },
      { status: 500 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const { reference, amountKobo, customerName, customerEmail, customerPhone, shippingAddress, lines } = body

  if (!reference || typeof reference !== 'string') {
    return NextResponse.json({ ok: false, message: 'Missing payment reference.' }, { status: 400 })
  }
  if (!amountKobo || typeof amountKobo !== 'number' || amountKobo <= 0) {
    return NextResponse.json({ ok: false, message: 'Invalid order amount.' }, { status: 400 })
  }
  if (!customerEmail || typeof customerEmail !== 'string') {
    return NextResponse.json({ ok: false, message: 'Missing customer email.' }, { status: 400 })
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ ok: false, message: 'Order must contain items.' }, { status: 400 })
  }

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

    if (Math.abs(tx.amount - (amountKobo as number)) > 1) {
      return NextResponse.json({ ok: false, message: 'Payment amount mismatch.' })
    }
  } catch {
    return NextResponse.json({ ok: false, message: 'Verification request failed.' }, { status: 500 })
  }

  // 2. Fulfill order: Medusa draft + emails
  await fulfillOrder({
    reference: tx.reference,
    regionId: 'NG',
    totalKobo: amountKobo as number,
    currency: 'NGN',
    customerName: (customerName as string) ?? '',
    customerEmail: customerEmail as string,
    customerPhone: (customerPhone as string) ?? '',
    shippingAddress: shippingAddress as ShippingAddress,
    lines: lines as CartLine[],
    paymentProvider: 'paystack',
    paymentRef: tx.reference,
  })

  return NextResponse.json({ ok: true, reference: tx.reference })
}
