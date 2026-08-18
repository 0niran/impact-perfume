import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock orderFulfillment so we can assert calls without hitting Medusa
const fulfillOrderMock = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/orderFulfillment', () => ({
  fulfillOrder: fulfillOrderMock,
}))

// Mock the re-pricing gate; its own logic is covered in pricingGuard.test.ts.
const verifyPaidOrderMock = vi.fn()
vi.mock('@/lib/pricingGuard', () => ({
  verifyPaidOrder: (...args: unknown[]) => verifyPaidOrderMock(...args),
}))

// Spy on the email layer so we can assert the customer refund confirmation.
const sendEmailMock = vi.fn().mockResolvedValue({ ok: true })
const buildRefundEmailMock = vi.fn().mockReturnValue({ subject: 'refund', html: '<r>' })
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  buildOwnerAlertEmail: vi.fn().mockReturnValue({ subject: 'o', html: '<o>' }),
  buildRefundEmail: (...args: unknown[]) => buildRefundEmailMock(...args),
}))

const SECRET = 'test_paystack_secret'

beforeEach(() => {
  vi.stubEnv('PAYSTACK_SECRET_KEY', SECRET)
  fulfillOrderMock.mockClear()
  sendEmailMock.mockClear()
  buildRefundEmailMock.mockClear()
  verifyPaidOrderMock.mockReset()
  verifyPaidOrderMock.mockResolvedValue({
    ok: true,
    totalMinor: 5_000_000,
    lines: [
      { variantId: 'v1', name: 'Impact No. 1', variantLabel: '100ml EDP', qty: 1, unitPriceKobo: 5_000_000 },
    ],
  })
})

function signedRequest(body: object, secret = SECRET, badSig = false): Request {
  const raw = JSON.stringify(body)
  const sig = badSig
    ? 'a'.repeat(128)
    : crypto.createHmac('sha512', secret).update(raw).digest('hex')
  return new Request('https://example.com/api/webhooks/paystack', {
    method: 'POST',
    headers: {
      'x-paystack-signature': sig,
      'Content-Type': 'application/json',
    },
    body: raw,
  })
}

async function callRoute(req: Request) {
  vi.resetModules()
  const { POST } = await import('../route')
  return POST(req as unknown as Parameters<typeof POST>[0])
}

describe('POST /api/webhooks/paystack — signature verification', () => {
  it('rejects requests missing the signature header (401)', async () => {
    const req = new Request('https://example.com/api/webhooks/paystack', {
      method: 'POST',
      body: JSON.stringify({ event: 'charge.success' }),
    })
    const res = await callRoute(req)
    expect(res.status).toBe(401)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('rejects requests with an invalid signature (401)', async () => {
    const req = signedRequest({ event: 'charge.success', data: { reference: 'abc' } }, SECRET, true)
    const res = await callRoute(req)
    expect(res.status).toBe(401)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('rejects requests signed with a different secret (401)', async () => {
    const req = signedRequest(
      { event: 'charge.success', data: { reference: 'abc' } },
      'wrong-secret'
    )
    const res = await callRoute(req)
    expect(res.status).toBe(401)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('returns 500 when PAYSTACK_SECRET_KEY is unset', async () => {
    vi.stubEnv('PAYSTACK_SECRET_KEY', '')
    const req = signedRequest({ event: 'charge.success' })
    const res = await callRoute(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/webhooks/paystack — event handling', () => {
  const baseSuccess = {
    event: 'charge.success',
    data: {
      reference: 'ref-test-1',
      amount: 5_000_000,
      currency: 'NGN',
      customer: { email: 'test@example.com', first_name: 'Test', last_name: 'User' },
      metadata: {
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '+234 800 000 0000',
        shippingAddress: {
          address1: '12 Test St',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
        },
        lines: [
          {
            variantId: 'v1',
            productId: 'p1',
            name: 'Impact No. 1',
            variantLabel: '100ml EDP',
            qty: 1,
            unitPriceKobo: 5_000_000,
            currency: 'NGN',
          },
        ],
        amountKobo: 5_000_000,
      },
    },
  }

  it('calls fulfillOrder on a valid charge.success event', async () => {
    const res = await callRoute(signedRequest(baseSuccess))
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).toHaveBeenCalledTimes(1)
    const call = fulfillOrderMock.mock.calls[0][0]
    expect(call.reference).toBe('ref-test-1')
    expect(call.paymentProvider).toBe('paystack')
    expect(call.source).toBe('webhook')
    expect(call.lines).toHaveLength(1)
  })

  it('skips fulfilment when lines metadata is missing', async () => {
    const evt = {
      ...baseSuccess,
      data: { ...baseSuccess.data, metadata: { ...baseSuccess.data.metadata, lines: undefined } },
    }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('refuses fulfilment when re-pricing/amount check fails (underpayment)', async () => {
    verifyPaidOrderMock.mockResolvedValueOnce({
      ok: false,
      message: 'Amount paid does not match the order total.',
      totalMinor: 5_000_000,
      lines: [],
    })
    const res = await callRoute(signedRequest(baseSuccess))
    expect(res.status).toBe(200) // ack so Paystack stops retrying
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('passes the captured amount to the re-pricing gate', async () => {
    await callRoute(signedRequest(baseSuccess))
    expect(verifyPaidOrderMock).toHaveBeenCalledWith(
      expect.any(Array),
      'NG',
      5_000_000,
      // Delivery fee: 0 here — no valid quote token on this fixture.
      0
    )
  })

  it('skips fulfilment when shippingAddress metadata is missing', async () => {
    const evt = {
      ...baseSuccess,
      data: {
        ...baseSuccess.data,
        metadata: { ...baseSuccess.data.metadata, shippingAddress: undefined },
      },
    }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('does not call fulfillOrder for charge.failed events', async () => {
    const evt = { event: 'charge.failed', data: { reference: 'ref-test-1' } }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('does not call fulfillOrder for refund.processed events', async () => {
    const evt = { event: 'refund.processed', data: { reference: 'ref-test-1' } }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(fulfillOrderMock).not.toHaveBeenCalled()
  })

  it('emails the customer a branded refund confirmation when Paystack has their email', async () => {
    const evt = {
      event: 'refund.processed',
      data: {
        reference: 'ref-9',
        amount: 5_000_000,
        currency: 'NGN',
        customer: { email: 'jane@example.com', first_name: 'Jane', last_name: 'Doe' },
      },
    }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(buildRefundEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'ref-9', amountMinor: 5_000_000, currency: 'NGN', customerName: 'Jane Doe' })
    )
    const recipients = sendEmailMock.mock.calls.map((c: unknown[]) => (c[0] as { to: string }).to)
    expect(recipients).toContain('jane@example.com')
  })

  it('skips the customer refund email when Paystack has no customer email', async () => {
    const evt = { event: 'refund.processed', data: { reference: 'ref-10', amount: 100, currency: 'NGN' } }
    const res = await callRoute(signedRequest(evt))
    expect(res.status).toBe(200)
    expect(buildRefundEmailMock).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid JSON body', async () => {
    const raw = 'not-json'
    const sig = crypto.createHmac('sha512', SECRET).update(raw).digest('hex')
    const req = new Request('https://example.com/api/webhooks/paystack', {
      method: 'POST',
      headers: { 'x-paystack-signature': sig, 'Content-Type': 'application/json' },
      body: raw,
    })
    const res = await callRoute(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 to trigger Paystack retry when fulfillment throws', async () => {
    fulfillOrderMock.mockRejectedValueOnce(new Error('Medusa down'))
    const res = await callRoute(signedRequest(baseSuccess))
    expect(res.status).toBe(500)
  })

  it('returns 500 when fulfilment reports failure (order not created)', async () => {
    fulfillOrderMock.mockResolvedValueOnce({ ok: false })
    const res = await callRoute(signedRequest(baseSuccess))
    expect(res.status).toBe(500)
  })
})
