import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The payment idempotency lock. Two callers can arrive for one payment — the
 * redirect-verify path and the provider webhook — and only one may fulfil.
 *
 * These assert the money-path contract, not the storage. The lock moved from a
 * Sanity document (whose duplicate-id 409 stood in for "already claimed") to a
 * Redis SET NX, which is atomic and purpose-built; the behaviour below is what
 * must not change.
 */
const mockSet = vi.fn()
const mockGet = vi.fn()
const mockDel = vi.fn()
let configured = true

vi.mock('@/lib/redis', () => ({
  get redis() {
    return configured ? { set: mockSet, get: mockGet, del: mockDel } : null
  },
  get isRedisConfigured() {
    return configured
  },
}))

import { claimPayment, releasePayment, recordMedusaOrderId } from '../processedPayment'

beforeEach(() => {
  vi.clearAllMocks()
  configured = true
})

describe('claimPayment', () => {
  it('returns true for the first caller', async () => {
    mockSet.mockResolvedValue('OK')
    expect(await claimPayment('ref-1', 'paystack', 'verify')).toBe(true)
  })

  it('returns false when the key already exists', async () => {
    // Upstash returns null when NX finds the key present.
    mockSet.mockResolvedValue(null)
    expect(await claimPayment('ref-1', 'paystack', 'webhook')).toBe(false)
  })

  it('claims atomically with NX and an expiry', async () => {
    // NX is the entire guard: without it there is a race between reading and
    // writing, which is exactly what this lock exists to close.
    mockSet.mockResolvedValue('OK')
    await claimPayment('ref-1', 'stripe', 'verify')
    const [, , opts] = mockSet.mock.calls[0]
    expect(opts).toMatchObject({ nx: true })
    expect(opts.ex).toBeGreaterThan(0)
  })

  it('fails open when Redis errors, so a paid order is never lost', async () => {
    mockSet.mockRejectedValue(new Error('connection reset'))
    expect(await claimPayment('ref-1', 'stripe', 'webhook')).toBe(true)
  })

  it('fails open when Redis is not configured', async () => {
    configured = false
    expect(await claimPayment('ref-1', 'stripe', 'webhook')).toBe(true)
  })

  it('namespaces the key and strips unsafe characters from the reference', async () => {
    mockSet.mockResolvedValue('OK')
    await claimPayment('ref/with spaces:and*stars', 'paystack', 'verify')
    const [key] = mockSet.mock.calls[0]
    expect(key).toMatch(/^processed-payment:/)
    expect(key.replace(/^processed-payment:/, '')).toMatch(/^[a-zA-Z0-9_-]+$/)
  })

  it('records provider, source, reference and timestamp', async () => {
    mockSet.mockResolvedValue('OK')
    await claimPayment('ref-2', 'stripe', 'webhook')
    const [, value] = mockSet.mock.calls[0]
    expect(value).toMatchObject({ reference: 'ref-2', provider: 'stripe', source: 'webhook' })
    expect(value.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('releasePayment', () => {
  it('deletes the key so a retry can re-attempt fulfilment', async () => {
    await releasePayment('ref-1')
    expect(mockDel).toHaveBeenCalledWith('processed-payment:ref-1')
  })

  it('never throws — a failed release must not fail the request', async () => {
    mockDel.mockRejectedValue(new Error('nope'))
    await expect(releasePayment('ref-1')).resolves.toBeUndefined()
  })
})

describe('recordMedusaOrderId', () => {
  it('annotates the existing lock and keeps an expiry', async () => {
    mockGet.mockResolvedValue({ reference: 'ref-1', provider: 'stripe', source: 'verify' })
    await recordMedusaOrderId('ref-1', 'order_123')
    const [, value, opts] = mockSet.mock.calls[0]
    expect(value).toMatchObject({ reference: 'ref-1', medusaOrderId: 'order_123' })
    expect(opts.ex).toBeGreaterThan(0)
  })

  it('does nothing when the lock has already expired', async () => {
    mockGet.mockResolvedValue(null)
    await recordMedusaOrderId('ref-1', 'order_123')
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('never throws — tracing metadata must not fail a payment', async () => {
    mockGet.mockRejectedValue(new Error('nope'))
    await expect(recordMedusaOrderId('ref-1', 'order_1')).resolves.toBeUndefined()
  })
})
