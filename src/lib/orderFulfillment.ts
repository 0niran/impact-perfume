/**
 * Shared post-payment fulfillment: create the Medusa draft order, send
 * confirmation + business notification emails. Used by both the Paystack
 * verify route (NGN) and the Stripe confirm route (CAD).
 */

import { buildCustomerEmail, buildBusinessEmail, sendEmail } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'
import { REGIONS, type RegionId } from '@/lib/region'

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

async function createMedusaOrder(input: FulfillmentInput): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const region = REGIONS[input.regionId]
  if (!backendUrl || !region.medusaRegionId) return

  const token = await getMedusaAdminToken()
  if (!token) {
    console.error('[orderFulfillment] No Medusa admin token; skipping draft order')
    return
  }

  const nameParts = input.customerName.trim().split(' ')
  const firstName = nameParts[0] || '-'
  const lastName = nameParts.slice(1).join(' ') || '-'

  const res = await fetch(`${backendUrl}/admin/draft-orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.customerEmail,
      region_id: region.medusaRegionId,
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
        unit_price: l.unitPriceKobo,
      })),
      metadata: {
        [`${input.paymentProvider}_reference`]: input.paymentRef,
        payment_status: 'paid',
        payment_provider: input.paymentProvider,
        customer_phone: input.customerPhone,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[orderFulfillment] Medusa draft order failed:', res.status, text)
  }
}

export async function fulfillOrder(input: FulfillmentInput): Promise<void> {
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

  await Promise.allSettled([
    createMedusaOrder(input),
    sendEmail({
      to: input.customerEmail,
      ...buildCustomerEmail(orderEmailData),
    }),
    sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildBusinessEmail(orderEmailData),
    }),
  ])
}
