import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The webhook is throttled BEFORE the auth check, so someone guessing tokens is
 * limited too — not just callers who already hold one. These tests pin that
 * ordering, because moving the guard below auth would silently reopen it.
 */
const rateLimitMock = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...a: unknown[]) => rateLimitMock(...a),
}))

const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: (...a: unknown[]) => revalidateTagMock(...a),
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

function req(auth: string | null = `Bearer ${SECRET}`) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth : null) },
    json: async () => ({ type: 'product.updated', data: { handle: 'no-5' } }),
  } as never
}

beforeEach(() => {
  rateLimitMock.mockReset()
  revalidateTagMock.mockReset()
})

describe('POST /api/webhooks/medusa rate limiting', () => {
  it('429s when over the limit, even with a valid token', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, retryAfter: 30 })
    const res = await POST(req())
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
    // Nothing was flushed — the request never reached the work.
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('throttles an UNAUTHENTICATED caller too, so token guessing is limited', async () => {
    rateLimitMock.mockResolvedValue({ ok: false, retryAfter: 30 })
    const res = await POST(req('Bearer wrong-token'))
    // 429 rather than 401 proves the guard runs before the auth check.
    expect(res.status).toBe(429)
  })

  it('passes through when under the limit', async () => {
    rateLimitMock.mockResolvedValue({ ok: true, retryAfter: 0 })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalled()
  })

  it('still rejects a bad token when under the limit', async () => {
    rateLimitMock.mockResolvedValue({ ok: true, retryAfter: 0 })
    const res = await POST(req('Bearer wrong-token'))
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })
})
