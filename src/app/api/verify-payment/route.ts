import { NextRequest, NextResponse } from 'next/server'
import { buildCustomerEmail, buildBusinessEmail, sendEmail } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'

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

interface ShippingAddress {
  address1: string
  address2?: string
  city: string
  state: string
  country: string
}

interface CartLine {
  variantId: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceKobo: number
}

async function getMedusaAdminToken(): Promise<string | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (!backendUrl || !email || !password) return null
  try {
    const res = await fetch(`${backendUrl}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const { token } = await res.json()
    return token ?? null
  } catch {
    return null
  }
}

async function createMedusaOrder(opts: {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  lines: CartLine[]
  reference: string
}): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const regionId = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
  if (!backendUrl || !regionId) return

  const token = await getMedusaAdminToken()
  if (!token) return

  const nameParts = opts.customerName.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || '-'

  await fetch(`${backendUrl}/admin/draft-orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.customerEmail,
      region_id: regionId,
      shipping_address: {
        first_name: firstName,
        last_name: lastName,
        phone: opts.customerPhone,
        address_1: opts.shippingAddress.address1,
        address_2: opts.shippingAddress.address2 ?? '',
        city: opts.shippingAddress.city,
        province: opts.shippingAddress.state,
        country_code: 'ng',
      },
      items: opts.lines.map((l) => ({
        variant_id: l.variantId,
        quantity: l.qty,
        unit_price: l.unitPriceKobo,
      })),
      metadata: {
        paystack_reference: opts.reference,
        payment_status: 'paid',
        customer_phone: opts.customerPhone,
      },
    }),
  })
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

  const orderData = {
    reference: tx.reference,
    customerName: (customerName as string) ?? '',
    customerEmail: customerEmail as string,
    customerPhone: (customerPhone as string) ?? '',
    shippingAddress: shippingAddress as ShippingAddress,
    items: (lines as CartLine[]).map((l) => ({
      name: l.name,
      variantLabel: l.variantLabel,
      qty: l.qty,
      unitPriceKobo: l.unitPriceKobo,
    })),
    totalKobo: amountKobo as number,
  }

  // 2. Create Medusa order + send emails — both fire-and-forget
  await Promise.allSettled([
    createMedusaOrder({
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      lines: lines as CartLine[],
      reference: tx.reference,
    }),
    sendEmail({
      to: orderData.customerEmail,
      ...buildCustomerEmail(orderData),
    }),
    sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildBusinessEmail(orderData),
    }),
  ])

  return NextResponse.json({ ok: true, reference: tx.reference })
}
