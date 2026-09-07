import { describe, it, expect, vi, beforeEach } from 'vitest'

// Catalogue reads live in unstable_cache under a TAG. revalidatePath does not
// clear tagged entries, so flushing paths alone leaves every grid and PDP stale
// until the TTL lapses — the "my edit doesn't show until I refresh" bug. These
// tests exist to stop that regressing.
const revalidatePathMock = vi.fn()
const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
  revalidateTag: (...a: unknown[]) => revalidateTagMock(...a),
  // The route imports the tag constant from lib/medusa, which calls
  // unstable_cache at module load. Pass the function straight through.
  unstable_cache: (fn: unknown) => fn,
}))

const SECRET = 'test_medusa_webhook_secret'
vi.mock('@/lib/env', () => ({
  serverEnv: {
    get medusaWebhookSecret() {
      return SECRET
    },
    get cronSecret() {
      return undefined
    },
  },
}))

import { POST } from '../route'
import { CATALOGUE_CACHE_TAG } from '@/lib/medusa'

function req(body: unknown, auth: string | null = `Bearer ${SECRET}`) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth : null) },
    json: async () => body,
  } as never
}

beforeEach(() => {
  revalidatePathMock.mockClear()
  revalidateTagMock.mockClear()
})

describe('POST /api/webhooks/medusa', () => {
  it('flushes the catalogue cache TAG, not just paths', async () => {
    const res = await POST(req({ type: 'product.updated', data: { handle: 'no-5' } }))
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalledWith(CATALOGUE_CACHE_TAG)
  })

  it('still flushes the tag when the payload carries no handle', async () => {
    // Rejecting an unfamiliar payload shape would throw away a good
    // invalidation for no reason.
    const res = await POST(req({ type: 'product.updated', data: {} }))
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalledWith(CATALOGUE_CACHE_TAG)
  })

  it('maps a home-diffuser product to its own route, not just /home', async () => {
    await POST(
      req({
        type: 'product.updated',
        data: { handle: 'home-diffuser-oud-magnifique', categories: ['home-diffusers'] },
      })
    )
    const flushed = revalidatePathMock.mock.calls.map((c) => c[0])
    expect(flushed).toContain('/home-diffusers')
    expect(flushed).toContain('/home')
  })

  it('maps a number-series product to its PDP and the collection', async () => {
    await POST(req({ type: 'product.updated', data: { handle: 'no-5' } }))
    const flushed = revalidatePathMock.mock.calls.map((c) => c[0])
    expect(flushed).toContain('/no/5')
    expect(flushed).toContain('/no-series')
  })

  it('rejects an unauthorised call and flushes nothing', async () => {
    const res = await POST(req({ type: 'product.updated', data: { handle: 'no-5' } }, 'Bearer wrong'))
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
