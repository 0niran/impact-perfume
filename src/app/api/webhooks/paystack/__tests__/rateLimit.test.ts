import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The payment webhooks are throttled BEFORE the signature check, matching
 * /api/webhooks/medusa.
 *
 * The HMAC is computed on every request that reaches the handler, so an
 * unauthenticated flood otherwise buys unbounded work on the endpoint that
 * fulfils orders. These tests pin the ordering: moving the guard below the
 * signature check would silently reopen it, and nothing else would fail.
 */
const rateLimitMock = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...a: unknown[]) => rateLimitMock(...a),
}))

const SECRET = 'test_paystack_secret'
vi.mock('@/lib/env', () => ({
  serverEnv: {
    get paystackSecretKey() {
      return SECRET
    },
  },
}))

vi.mock('@/lib/orderFulfillment', () => ({ fulfillOrder: vi.fn() }))
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  buildOwnerAlertEmail: () => ({ subject: 's', html: 'h' }),
  buildRefundEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/processedPayment', () => ({
  claimPayment: vi.fn().mockResolvedValue(true),
  releasePayment: vi.fn(),
  recordMedusaOrderId: vi.fn(),
}))

import { POST } from '../route'

function req(body = '{}', headers: Record<string, string> = {}) {
  return {
    text: async () => body,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  rateLimitMock.mockResolvedValue({ ok: true, retryAfter: 0 })
})

describe('POST /api/webhooks/paystack rate limiting', () => {
  it('returns 429 without verifying a signature', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, retryAfter: 30 })
    const res = await POST(req('{}', { 'x-paystack-signature': 'anything' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('throttles a request carrying no signature at all', async () => {
    // The point of limiting first: an attacker sending garbage never reaches
    // the HMAC, so the flood costs us nothing per request.
    rateLimitMock.mockResolvedValue({ ok: false, retryAfter: 5 })
    const res = await POST(req('garbage'))
    expect(res.status).toBe(429)
  })

  it('is consulted before the request body is even read', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, retryAfter: 1 })
    const text = vi.fn()
    await POST({ text, headers: { get: () => null } } as never)
    expect(rateLimitMock).toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
  })

  it('still rejects a bad signature when within the limit', async () => {
    const res = await POST(req('{}', { 'x-paystack-signature': 'deadbeef' }))
    expect(res.status).toBe(401)
  })

  it('allows well above the providers real retry volume', async () => {
    await POST(req('{}', { 'x-paystack-signature': 'x' }))
    const [, , opts] = rateLimitMock.mock.calls[0]
    expect(opts.limit).toBeGreaterThanOrEqual(60)
  })
})
