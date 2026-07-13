/**
 * Shared post-payment fulfillment: create a real Medusa order, send
 * confirmation + business notification emails. Used by both the Paystack
 * verify route (NGN) and the Stripe confirm route (CAD).
 *
 * Medusa v2 doesn't expose a direct "create order" admin endpoint. The
 * supported flow for "I already captured payment externally, record this
 * as a finalised order" is:
 *
 *   1. POST /admin/draft-orders                            -> draft
 *   2. POST /admin/draft-orders/{id}/convert-to-order      -> real order
 *   3. POST /admin/payment-collections                     -> payment collection
 *   4. POST /admin/payment-collections/{id}/mark-as-paid   -> captured
 *
 * Storefront amounts are in MINOR units (kobo / cents) but Medusa v2
 * stores prices in MAJOR units (₦50,000 → 50000, CAD $65 → 65). We divide
 * by 100 here at the write boundary.
 */

import { buildCustomerEmail, buildBusinessEmail, sendEmail } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'
import { REGIONS, type RegionId } from '@/lib/region'
import { claimPayment, releasePayment, recordMedusaOrderId, type PaymentSource } from '@/lib/processedPayment'

export interface ShippingAddress {
  address1: string
  address2?: string
  city: string
  state: string
  /** Postal / ZIP code. Optional for NG, required for CA. */
  postalCode?: string
  country: string
}

export interface CartLine {
  variantId: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceKobo: number
}

export interface FulfillmentInput {
  reference: string
  regionId: RegionId
  totalKobo: number
  currency: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: ShippingAddress
  lines: CartLine[]
  paymentProvider: 'paystack' | 'stripe'
  paymentRef: string
  /**
   * Where this call originated. Used for the idempotency log. Defaults to
   * 'verify' (the browser-redirect path); webhook callers should pass 'webhook'.
   */
  source?: PaymentSource
}

async function getMedusaAdminToken(): Promise<string | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (!backendUrl || !email || !password) {
    console.error('[orderFulfillment] Missing Medusa admin env vars', {
      hasBackend: Boolean(backendUrl),
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
    })
    return null
  }
  try {
    const res = await fetch(`${backendUrl}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[orderFulfillment] Medusa auth failed', { status: res.status, body: text.slice(0, 300) })
      return null
    }
    const { token } = await res.json()
    return token ?? null
  } catch (err) {
    console.error('[orderFulfillment] Medusa auth threw', err instanceof Error ? err.message : err)
    return null
  }
}

async function createMedusaOrder(input: FulfillmentInput): Promise<string | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const region = REGIONS[input.regionId]
  if (!backendUrl || !region.medusaRegionId) {
    console.error('[orderFulfillment] Missing backend URL or region id', {
      hasBackend: Boolean(backendUrl),
      regionId: input.regionId,
      medusaRegionId: region.medusaRegionId,
      reference: input.reference,
    })
    return null
  }

  const token = await getMedusaAdminToken()
  if (!token) return null

  const nameParts = input.customerName.trim().split(' ')
  const firstName = nameParts[0] || '-'
  const lastName = nameParts.slice(1).join(' ') || '-'

  // 1) Create the draft
  const draftBody = {
    email: input.customerEmail,
    region_id: region.medusaRegionId,
    // Attribute the order to this market's sales channel so the reservation /
    // decrement draws from that channel's stock location. Omitted (backend
    // default channel) when unset, keeping current behaviour.
    ...(region.salesChannelId ? { sales_channel_id: region.salesChannelId } : {}),
    shipping_address: {
      first_name: firstName,
      last_name: lastName,
      phone: input.customerPhone,
      address_1: input.shippingAddress.address1,
      address_2: input.shippingAddress.address2 ?? '',
      city: input.shippingAddress.city,
      province: input.shippingAddress.state,
      postal_code: input.shippingAddress.postalCode ?? '',
      country_code: region.countryCode.toLowerCase(),
    },
    items: input.lines.map((l) => ({
      variant_id: l.variantId,
      quantity: l.qty,
      // Medusa v2 expects MAJOR units; storefront tracks MINOR units.
      unit_price: Math.round(l.unitPriceKobo / 100),
    })),
    metadata: {
      [`${input.paymentProvider}_reference`]: input.paymentRef,
      payment_status: 'paid',
      payment_provider: input.paymentProvider,
      customer_phone: input.customerPhone,
      reference: input.reference,
      // The structured country_code stays the region default (the CAD region
      // may only allow Canada), so record the real destination here for the
      // CAD/international rail. The confirmation emails also show it.
      shipping_country: input.shippingAddress.country,
    },
  }

  const draftRes = await fetch(`${backendUrl}/admin/draft-orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(draftBody),
  })

  if (!draftRes.ok) {
    const text = await draftRes.text().catch(() => '')
    console.error('[orderFulfillment] draft creation failed', {
      status: draftRes.status,
      body: text.slice(0, 800),
      reference: input.reference,
      regionId: input.regionId,
      lineCount: input.lines.length,
    })
    return null
  }

  const draftJson = await draftRes.json().catch(() => ({} as Record<string, unknown>))
  const draftOrder = (draftJson as { draft_order?: { id?: string } }).draft_order
  const draftId = draftOrder?.id ?? (draftJson as { id?: string }).id
  if (!draftId) {
    console.error('[orderFulfillment] draft response missing id', {
      body: JSON.stringify(draftJson).slice(0, 500),
      reference: input.reference,
    })
    return null
  }

  // 2) Promote draft to a real order so it shows up under Orders, not Draft Orders
  const convRes = await fetch(
    `${backendUrl}/admin/draft-orders/${draftId}/convert-to-order`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    }
  )

  if (!convRes.ok) {
    const text = await convRes.text().catch(() => '')
    console.error('[orderFulfillment] convert-to-order failed', {
      status: convRes.status,
      body: text.slice(0, 800),
      draftId,
      reference: input.reference,
    })
    return null
  }

  const conv = await convRes.json().catch(() => ({} as Record<string, unknown>))
  const orderId = (conv as { order?: { id?: string } }).order?.id ?? draftId
  console.log('[orderFulfillment] order created', {
    orderId,
    reference: input.reference,
    regionId: input.regionId,
    total: input.totalKobo,
    currency: input.currency,
  })

  // 3) Capture payment so the order shows as Paid (not "Not paid").
  //    Medusa v2 expects MAJOR units on payment-collection amounts too.
  const captureAmount = Math.round(input.totalKobo / 100)
  const pcRes = await fetch(`${backendUrl}/admin/payment-collections`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, amount: captureAmount }),
  })

  if (!pcRes.ok) {
    const text = await pcRes.text().catch(() => '')
    console.error('[orderFulfillment] payment-collection create failed', {
      status: pcRes.status,
      body: text.slice(0, 800),
      orderId,
      reference: input.reference,
    })
    return orderId
  }

  const pcJson = await pcRes.json().catch(() => ({} as Record<string, unknown>))
  const paymentCollectionId =
    (pcJson as { payment_collection?: { id?: string } }).payment_collection?.id ??
    (pcJson as { id?: string }).id
  if (!paymentCollectionId) {
    console.error('[orderFulfillment] payment-collection response missing id', {
      body: JSON.stringify(pcJson).slice(0, 500),
      orderId,
      reference: input.reference,
    })
    return orderId
  }

  const markRes = await fetch(
    `${backendUrl}/admin/payment-collections/${paymentCollectionId}/mark-as-paid`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    }
  )

  if (!markRes.ok) {
    const text = await markRes.text().catch(() => '')
    console.error('[orderFulfillment] mark-as-paid failed', {
      status: markRes.status,
      body: text.slice(0, 800),
      paymentCollectionId,
      orderId,
      reference: input.reference,
    })
    return orderId
  }

  console.log('[orderFulfillment] payment captured', {
    orderId,
    paymentCollectionId,
    amount: captureAmount,
    reference: input.reference,
  })
  return orderId
}

export async function fulfillOrder(input: FulfillmentInput): Promise<{ ok: boolean }> {
  // Idempotency: webhook and redirect-verify can fire for the same payment.
  // First caller to claim the lock proceeds; later callers no-op.
  const won = await claimPayment(
    input.reference,
    input.paymentProvider,
    input.source ?? 'verify'
  )
  if (!won) {
    console.log('[orderFulfillment] payment already processed, skipping', {
      reference: input.reference,
      source: input.source ?? 'verify',
    })
    return { ok: true }
  }

  // Create the Medusa order FIRST. If it fails, release the lock so a retry
  // (provider webhook) can re-attempt, and do NOT send a confirmation for an
  // order that doesn't exist. This is the fix for paid-but-missing orders:
  // previously the lock was claimed up front and a failed create poisoned it.
  const orderId = await createMedusaOrder(input)
  if (!orderId) {
    await releasePayment(input.reference)
    console.error('[orderFulfillment] order creation failed; released lock for retry', {
      reference: input.reference,
      regionId: input.regionId,
      paymentProvider: input.paymentProvider,
    })
    return { ok: false }
  }
  recordMedusaOrderId(input.reference, orderId).catch(() => undefined)

  const orderEmailData = {
    reference: input.reference,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    shippingAddress: input.shippingAddress,
    items: input.lines.map((l) => ({
      name: l.name,
      variantLabel: l.variantLabel,
      qty: l.qty,
      unitPriceKobo: l.unitPriceKobo,
    })),
    totalKobo: input.totalKobo,
    currency: input.currency,
  }

  // Emails are best-effort — a send failure must not fail an order that the
  // customer already paid for and that now exists in Medusa.
  const results = await Promise.allSettled([
    sendEmail({ to: input.customerEmail, ...buildCustomerEmail(orderEmailData) }),
    sendEmail({ to: SITE_CONFIG.contact.email, ...buildBusinessEmail(orderEmailData) }),
  ])
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const label = ['customerEmail', 'businessEmail'][i] ?? 'unknown'
      console.error(`[orderFulfillment] ${label} rejected`, {
        reason: r.reason instanceof Error ? r.reason.message : r.reason,
        reference: input.reference,
      })
    }
  })
  return { ok: true }
}
