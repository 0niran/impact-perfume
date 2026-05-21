import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Sanity client BEFORE importing the module under test so the
// helper gets our spies attached.
const mockCreate = vi.fn()
const mockPatchSet = vi.fn().mockReturnThis()
const mockPatchCommit = vi.fn().mockResolvedValue({})
const mockPatch = vi.fn(() => ({ set: mockPatchSet, commit: mockPatchCommit }))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: mockCreate,
    patch: mockPatch,
  })),
}))

// Force the env so the module instantiates a (mocked) client.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test')
  vi.stubEnv('SANITY_API_WRITE_TOKEN', 'test-token')
  mockCreate.mockReset()
  mockPatchSet.mockClear()
  mockPatchCommit.mockClear()
  mockPatch.mockClear()
})

async function loadModule() {
  // Dynamic import so each test gets a fresh module against the latest mocks
  vi.resetModules()
  return await import('../processedPayment')
}

describe('claimPayment', () => {
  it('returns true when the lock is successfully created (first caller)', async () => {
    mockCreate.mockResolvedValueOnce({ _id: 'processed-payment-ref-1' })
    const { claimPayment } = await loadModule()
    const won = await claimPayment('ref-1', 'paystack', 'verify')
    expect(won).toBe(true)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('returns false when Sanity throws a 409 conflict (already processed)', async () => {
    const conflictErr = Object.assign(new Error('Conflict'), { statusCode: 409 })
    mockCreate.mockRejectedValueOnce(conflictErr)
    const { claimPayment } = await loadModule()
    const won = await claimPayment('ref-1', 'paystack', 'webhook')
    expect(won).toBe(false)
  })

  it('fails open (returns true) on non-conflict errors so payments are not lost', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network down'))
    const { claimPayment } = await loadModule()
    const won = await claimPayment('ref-1', 'stripe', 'verify')
    // Prefer a duplicate Medusa order over a missed order
    expect(won).toBe(true)
  })

  it('sanitizes special characters in the reference for the document id', async () => {
    mockCreate.mockResolvedValueOnce({})
    const { claimPayment } = await loadModule()
    await claimPayment('ref/1+special.chars', 'paystack', 'verify')
    const call = mockCreate.mock.calls[0][0]
    expect(call._id).toMatch(/^processed-payment-/)
    // Allowed chars only: a-zA-Z0-9_-
    expect(call._id).toMatch(/^[a-zA-Z0-9_-]+$/)
  })

  it('stores the provider, source, and timestamp on the lock document', async () => {
    mockCreate.mockResolvedValueOnce({})
    const { claimPayment } = await loadModule()
    await claimPayment('ref-2', 'stripe', 'webhook')
    const doc = mockCreate.mock.calls[0][0]
    expect(doc.provider).toBe('stripe')
    expect(doc.source).toBe('webhook')
    expect(doc.reference).toBe('ref-2')
    expect(doc.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('recordMedusaOrderId', () => {
  it('patches the lock doc with the Medusa order id', async () => {
    const { recordMedusaOrderId } = await loadModule()
    await recordMedusaOrderId('ref-1', 'order_abc')
    expect(mockPatch).toHaveBeenCalledWith('processed-payment-ref-1')
    expect(mockPatchSet).toHaveBeenCalledWith({ medusaOrderId: 'order_abc' })
    expect(mockPatchCommit).toHaveBeenCalled()
  })

  it('swallows errors silently — best-effort annotation', async () => {
    mockPatchCommit.mockRejectedValueOnce(new Error('boom'))
    const { recordMedusaOrderId } = await loadModule()
    await expect(recordMedusaOrderId('ref-1', 'order_abc')).resolves.toBeUndefined()
  })
})
