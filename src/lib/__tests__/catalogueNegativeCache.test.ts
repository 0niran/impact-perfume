import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * A failed catalogue read must never be cached.
 *
 * The reads sit behind unstable_cache, which stores whatever the wrapped
 * function returns. When that function swallowed errors and returned null, the
 * null was cached like any other value and replayed for the full 120s TTL: one
 * slow response turned into two minutes of empty category pages, 404ing product
 * pages, and a sitemap with no products in it. That was observed for real —
 * three consecutive builds produced 124, 66 and 16 sitemap URLs from unchanged
 * code, and clearing .next/cache fixed it every time.
 *
 * The fix is that the cached function throws on a bad response, because
 * unstable_cache does not store a rejection. These tests stand on that
 * behaviour: the wrapped function must reject, not resolve to null.
 */

// Pass through, recording what the cached function does with a failure. The
// real unstable_cache caches a resolved value and does not cache a rejection,
// so "did it throw" is exactly the property that matters.
const cachedCalls: { threw: boolean }[] = []
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: never[]) => unknown) => {
    return async (...args: never[]) => {
      try {
        const out = await fn(...args)
        cachedCalls.push({ threw: false })
        return out
      } catch (e) {
        cachedCalls.push({ threw: true })
        throw e
      }
    }
  },
  revalidateTag: vi.fn(),
}))

const ENV = {
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: 'https://medusa.test',
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: 'pk_test',
  NEXT_PUBLIC_MEDUSA_REGION_ID: 'reg_test',
}

beforeEach(() => {
  cachedCalls.length = 0
  vi.resetModules()
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('catalogue reads do not cache failures', () => {
  it('lets a non-2xx response reject inside the cached function', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('upstream boom', { status: 503 }))
    )
    const { getMedusaProduct } = await import('../medusa')

    // The caller still sees the old contract.
    await expect(getMedusaProduct('no-1')).resolves.toBeNull()
    // But the cached layer saw a rejection, so there is nothing to replay.
    expect(cachedCalls).toEqual([{ threw: true }])
  })

  it('lets a network error reject inside the cached function', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    const { getProductsByCategory } = await import('../medusa')

    await expect(getProductsByCategory('oils')).resolves.toEqual([])
    expect(cachedCalls.every((c) => c.threw)).toBe(true)
    expect(cachedCalls.length).toBeGreaterThan(0)
  })

  it('caches a successful response normally', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ products: [{ id: 'p1', handle: 'no-1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    const { getMedusaProduct } = await import('../medusa')

    await expect(getMedusaProduct('no-1')).resolves.toMatchObject({ handle: 'no-1' })
    expect(cachedCalls).toEqual([{ threw: false }])
  })
})
