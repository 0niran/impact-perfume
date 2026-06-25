import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock orderFulfillment so we can assert calls without hitting Medusa
const fulfillOrderMock = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/orderFulfillment', () => ({
  fulfillOrder: fulfillOrderMock,
}))

// Mock Stripe so we control constructEvent's behaviour without needing
// real signing. The route calls `new Stripe(...)`, so the default export
// must be constructable.
const constructEventMock = vi.fn()
class StripeStub {
  webhooks = { constructEvent: constructEventMock }
}
vi.mock('stripe', () => ({
  default: StripeStub,
}))

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_xxx')
  fulfillOrderMock.mockClear()
  constructEventMock.mockReset()
})

function request(body = '{}', sig: string | null = 't=1,v1=sig'): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sig !== null) headers['stripe-signature'] = sig
  return new Request('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  })
}

async function callRoute(req: Request) {
  vi.resetModules()
  const { POST } = await import('../route')
  return POST(req as unknown as Parameters<typeof POST>[0])
}

describe('POST /api/webhooks/stripe — signature verification', () => {
  it('rejects requests with no signature header (401)', async () => {
    const res = await callRoute(request('{}', null))
    expect(res.status).toBe(401)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('rejects when stripe.webhooks.constructEvent throws (invalid signature)', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })
    const res = await callRoute(request('{}'))
    expect(res.status).toBe(401)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('returns 500 when STRIPE_WEBHOOK_SECRET is unset', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    const res = await callRoute(request('{}'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/webhooks/stripe — event handling', () => {
  const validIntent = {
    id: 'pi_test_123',
    amount: 6_500,
    currency: 'cad',
    metadata: {
      reference: 'ref-stripe-1',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+1 416 555 0142',
      shippingAddress: JSON.stringify({
        address1: '123 King St',
        city: 'Toronto',
        state: 'ON',
        postalCode: 'M5H 1A1',
        country: 'Canada',
      }),
      lines: JSON.stringify([
        { v: 'v1', n: 'Impact No. 5', l: '100ml EDP', q: 1, p: 6_500 },
      ]),
    },
    receipt_email: 'jane@example.com',
  }

  it('calls fulfillOrder on payment_intent.succeeded with valid metadata', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: { object: validIntent },
    })
    const res = await callRoute(request())
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).toHaveBeenCalledTimes(1)
    const call = fulfillOrderMock.mock.calls[0][0]
    expect(call.reference).toBe('ref-stripe-1')
    expect(call.paymentProvider).toBe('stripe')
    expect(call.source).toBe('webhook')
    expect(call.regionId).toBe('CA')
    expect(call.lines).toHaveLength(1)
    expect(call.lines[0].variantId).toBe('v1')
  })

  it('returns 500 when fulfilment reports failure (order not created)', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: { object: validIntent },
    })
    fulfillOrderMock.mockResolvedValueOnce({ ok: false })
    const res = await callRoute(request())
    expect(res.status).toBe(500)
  })

  it('skips fulfilment when metadata.lines is empty', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: {
        object: { ...validIntent, metadata: { ...validIntent.metadata, lines: '[]' } },
      },
    })
    const res = await callRoute(request())
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('skips fulfilment when metadata parsing fails', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: {
        object: { ...validIntent, metadata: { lines: 'not-json', shippingAddress: '{}' } },
      },
    })
    const res = await callRoute(request())
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('does not call fulfillOrder for payment_intent.payment_failed', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.payment_failed',
      id: 'evt_1',
      data: { object: { ...validIntent, last_payment_error: { message: 'declined' } } },
    })
    const res = await callRoute(request())
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('does not call fulfillOrder for charge.refunded', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'charge.refunded',
      id: 'evt_1',
      data: { object: { id: 'ch_1', payment_intent: 'pi_1' } },
    })
    const res = await callRoute(request())
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('returns 500 when fulfilment throws (so Stripe retries)', async () => {
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: { object: validIntent },
    })
    fulfillOrderMock.mockRejectedValueOnce(new Error('Medusa down'))
    const res = await callRoute(request())
    expect(res.status).toBe(500)
  })

  it('falls back to receipt_email when metadata.customerEmail is missing', async () => {
    const intent = {
      ...validIntent,
      metadata: { ...validIntent.metadata, customerEmail: undefined },
    }
    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_1',
      data: { object: intent },
    })
    await callRoute(request())
    const call = fulfillOrderMock.mock.calls[0][0]
    expect(call.customerEmail).toBe('jane@example.com')
  })
})
