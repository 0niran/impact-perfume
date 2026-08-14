import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fulfillOrder, type FulfillmentInput } from '../orderFulfillment'
import { claimPayment, releasePayment, recordMedusaOrderId } from '@/lib/processedPayment'
import { sendEmail, buildCustomerEmail, buildBusinessEmail, buildOwnerAlertEmail } from '@/lib/email'
import { createShipment, gigTrackingUrl } from '@/lib/gig'
import { findLowStockAfterOrder } from '@/lib/lowStock'
import { ngInclusiveVat } from '@/lib/tax'

/**
 * Tests for the shared post-payment money path (fulfillOrder). Covers the
 * behaviours that protect a customer who has already paid: idempotency, the
 * "create order first, only then email" ordering, the lock release on failure,
 * the MINOR->MAJOR (÷100) write boundary, NG-inclusive vs CA-added tax, GIG
 * booking gating, and best-effort emails.
 *
 * Side-effecting collaborators are mocked; region is stubbed as data; the pure
 * tax module runs for real so the recorded amounts are the real conversions.
 */

vi.mock('@/lib/email', () => ({
  buildCustomerEmail: vi.fn(),
  buildBusinessEmail: vi.fn(),
  buildOwnerAlertEmail: vi.fn(),
  sendEmail: vi.fn(),
}))
vi.mock('@/lib/processedPayment', () => ({
  claimPayment: vi.fn(),
  releasePayment: vi.fn(),
  recordMedusaOrderId: vi.fn(),
}))
vi.mock('@/lib/gig', () => ({
  createShipment: vi.fn(),
  gigTrackingUrl: vi.fn(),
}))
vi.mock('@/lib/lowStock', () => ({
  findLowStockAfterOrder: vi.fn(),
  LOW_STOCK_THRESHOLD: 5,
}))
vi.mock('@/lib/region', () => ({
  REGIONS: {
    NG: {
      id: 'NG', countryCode: 'NG', currencyCode: 'ngn', currency: 'NGN',
      medusaRegionId: 'reg_ng', salesChannelId: undefined, paymentProvider: 'paystack',
    },
    CA: {
      id: 'CA', countryCode: 'CA', currencyCode: 'cad', currency: 'CAD',
      medusaRegionId: 'reg_ca', salesChannelId: undefined, paymentProvider: 'stripe',
    },
  },
}))

interface Call {
  url: string
  method: string
  body: Record<string, unknown> | undefined
}

let calls: Call[]

function stubFetch(opts: { failDraft?: boolean } = {}) {
  calls = []
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    calls.push({ url: u, method, body })

    if (u.endsWith('/auth/user/emailpass')) return json({ token: 'tok' })
    if (u.includes('/convert-to-order')) return json({ order: { id: 'order_1' } })
    if (u.endsWith('/admin/draft-orders')) {
      if (opts.failDraft) return json({ message: 'boom' }, 500)
      return json({ draft_order: { id: 'draft_1' } })
    }
    if (u.includes('/mark-as-paid')) return json({})
    if (u.endsWith('/admin/payment-collections')) return json({ payment_collection: { id: 'pc_1' } })
    if (u.includes('/admin/orders/') && method === 'GET') return json({ order: { metadata: {} } })
    if (u.includes('/admin/orders/')) return json({ order: { id: 'order_1' } })
    return json({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function draftBody(): any {
  return calls.find((c) => c.url.endsWith('/admin/draft-orders') && c.method === 'POST')?.body
}
function madeCall(match: string) {
  return calls.some((c) => c.url.includes(match) && c.method === 'POST')
}

const NG_PICKUP: FulfillmentInput = {
  reference: 'impact-ng-1',
  regionId: 'NG',
  totalKobo: 5_000_000, // ₦50,000
  currency: 'NGN',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  customerPhone: '+2348000000000',
  shippingAddress: { address1: 'Ikoyi Store', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
  lines: [{ variantId: 'v1', name: 'No. 5', qty: 2, unitPriceKobo: 2_500_000 }], // ₦25,000 each
  paymentProvider: 'paystack',
  paymentRef: 'ps_ref_1',
  fulfillmentMethod: 'pickup',
  pickupLocationName: 'Ikoyi',
  source: 'verify',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://medusa.test')
  vi.stubEnv('MEDUSA_ADMIN_EMAIL', 'admin@impact.test')
  vi.stubEnv('MEDUSA_ADMIN_PASSWORD', 'secret')
  // Default happy behaviours; individual tests override.
  vi.mocked(claimPayment).mockResolvedValue(true)
  vi.mocked(releasePayment).mockResolvedValue(undefined as never)
  vi.mocked(recordMedusaOrderId).mockResolvedValue(undefined as never)
  vi.mocked(sendEmail).mockResolvedValue({ ok: true } as never)
  vi.mocked(buildCustomerEmail).mockReturnValue({ subject: 'c', html: '<c>' } as never)
  vi.mocked(buildBusinessEmail).mockReturnValue({ subject: 'b', html: '<b>' } as never)
  vi.mocked(buildOwnerAlertEmail).mockReturnValue({ subject: 'o', html: '<o>' } as never)
  vi.mocked(createShipment).mockResolvedValue(null)
  vi.mocked(gigTrackingUrl).mockImplementation((w: string) => `https://track.example/${w}`)
  vi.mocked(findLowStockAfterOrder).mockResolvedValue([])
})

describe('fulfillOrder — idempotency', () => {
  it('no-ops when the payment lock is already held (returns ok, no order, no email)', async () => {
    stubFetch()
    vi.mocked(claimPayment).mockResolvedValue(false)

    const res = await fulfillOrder(NG_PICKUP)

    expect(res).toEqual({ ok: true })
    expect(madeCall('/admin/draft-orders')).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(releasePayment).not.toHaveBeenCalled()
  })
})

describe('fulfillOrder — order creation failure', () => {
  it('releases the lock and returns ok:false without emailing when the draft fails', async () => {
    stubFetch({ failDraft: true })

    const res = await fulfillOrder(NG_PICKUP)

    expect(res).toEqual({ ok: false })
    expect(releasePayment).toHaveBeenCalledWith('impact-ng-1')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('fulfillOrder — NG happy path', () => {
  it('creates + captures the order, records it, and sends both emails', async () => {
    stubFetch()

    const res = await fulfillOrder(NG_PICKUP)

    expect(res).toEqual({ ok: true })
    expect(madeCall('/admin/draft-orders')).toBe(true)
    expect(madeCall('/convert-to-order')).toBe(true)
    expect(madeCall('/mark-as-paid')).toBe(true)
    expect(recordMedusaOrderId).toHaveBeenCalledWith('impact-ng-1', 'order_1')
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('writes MAJOR units to Medusa (÷100 boundary)', async () => {
    stubFetch()
    await fulfillOrder(NG_PICKUP)

    const draft = draftBody()
    expect(draft.items[0].unit_price).toBe(25_000) // ₦25,000, not 2_500_000
    expect(draft.items[0].quantity).toBe(2)
    const pc = calls.find((c) => c.url.endsWith('/admin/payment-collections'))?.body as any
    expect(pc.amount).toBe(50_000) // ₦50,000, not 5_000_000
  })

  it('records NG VAT as inclusive in the order metadata', async () => {
    stubFetch()
    await fulfillOrder(NG_PICKUP)

    const md = draftBody().metadata
    expect(md.tax_inclusive).toBe('true')
    expect(md.total_minor).toBe('5000000')
    expect(md.tax_minor).toBe(String(ngInclusiveVat(5_000_000)))
    expect(Number(md.subtotal_minor) + Number(md.tax_minor)).toBe(5_000_000)
  })
})

describe('fulfillOrder — CA rail', () => {
  const CA_ORDER: FulfillmentInput = {
    ...NG_PICKUP,
    reference: 'impact-ca-1',
    regionId: 'CA',
    currency: 'CAD',
    totalKobo: 22_600, // CA$226 (200 + 26 tax)
    subtotalMinor: 20_000,
    taxMinor: 2_600,
    paymentProvider: 'stripe',
    paymentRef: 'pi_1',
    shippingAddress: {
      address1: '123 King St', city: 'Toronto', state: 'Ontario',
      postalCode: 'M5H 1A1', country: 'Canada',
    },
  }

  it('records CA tax as added (not inclusive) using the checkout tax value', async () => {
    stubFetch()
    await fulfillOrder(CA_ORDER)

    const md = draftBody().metadata
    expect(md.tax_inclusive).toBe('false')
    expect(md.tax_minor).toBe('2600')
    expect(md.subtotal_minor).toBe('20000')
    expect(md.total_minor).toBe('22600')
  })

  it('uses the CA region + lowercase country code', async () => {
    stubFetch()
    await fulfillOrder(CA_ORDER)

    const draft = draftBody()
    expect(draft.region_id).toBe('reg_ca')
    expect(draft.shipping_address.country_code).toBe('ca')
  })
})

describe('fulfillOrder — GIG booking gating', () => {
  const NG_SHIPPING: FulfillmentInput = {
    ...NG_PICKUP,
    reference: 'impact-ng-ship',
    fulfillmentMethod: 'shipping',
    deliveryFeeMinor: 150_000, // ₦1,500
    totalKobo: 5_150_000,
    deliveryGeo: { lat: 6.45, lng: 3.42 },
    shippingAddress: { address1: '15 Bourdillon', city: 'Ikoyi', state: 'Lagos', country: 'Nigeria' },
  }

  it('books a shipment, persists the waybill, and adds delivery as a line', async () => {
    stubFetch()
    vi.mocked(createShipment).mockResolvedValue({ waybill: 'WB123', labelUrl: 'https://l/label.pdf' } as never)

    await fulfillOrder(NG_SHIPPING)

    expect(createShipment).toHaveBeenCalledTimes(1)
    expect(madeCall('/admin/orders/')).toBe(true) // waybill persisted onto the order
    const emailData = vi.mocked(buildCustomerEmail).mock.calls[0][0] as any
    expect(emailData.gigWaybill).toBe('WB123')
    const deliveryLine = draftBody().items.find((i: any) => i.title?.includes('Delivery'))
    expect(deliveryLine.unit_price).toBe(1_500)
  })

  it('does not book GIG for pickup orders', async () => {
    stubFetch()
    await fulfillOrder(NG_PICKUP)
    expect(createShipment).not.toHaveBeenCalled()
  })

  it('does not book GIG when coordinates are missing', async () => {
    stubFetch()
    await fulfillOrder({ ...NG_SHIPPING, deliveryGeo: undefined })
    expect(createShipment).not.toHaveBeenCalled()
  })
})

describe('fulfillOrder — emails are best-effort', () => {
  it('still succeeds when a confirmation email throws', async () => {
    stubFetch()
    vi.mocked(sendEmail).mockRejectedValue(new Error('smtp down'))

    const res = await fulfillOrder(NG_PICKUP)

    expect(res).toEqual({ ok: true })
    expect(sendEmail).toHaveBeenCalled()
  })
})
