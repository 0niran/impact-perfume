import { describe, it, expect, vi, beforeEach } from 'vitest'

const revalidatePathMock = vi.fn()
const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
  revalidateTag: (...a: unknown[]) => revalidateTagMock(...a),
}))
vi.mock('@/lib/rateLimit', () => ({ rateLimit: async () => ({ ok: true, retryAfter: 0 }) }))

const SECRET = 'cron_secret_value'
vi.mock('@/lib/env', () => ({
  serverEnv: {
    get cronSecret() {
      return SECRET
    },
  },
}))

import { GET } from '../route'

function req(query: string) {
  const url = new URL(`https://example.test/api/revalidate?${query}`)
  return {
    nextUrl: url,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === 'authorization' ? `Bearer ${SECRET}` : null,
    },
  } as never
}

beforeEach(() => {
  revalidatePathMock.mockClear()
  revalidateTagMock.mockClear()
})

describe('GET /api/revalidate input bounds', () => {
  it('caps how many entries one request can flush', async () => {
    // getAll() is unbounded; without a cap a single call could ask for
    // thousands of invalidations and push all traffic to the origin.
    const many = Array.from({ length: 500 }, (_, i) => `tag=t${i}`).join('&')
    await GET(req(many))
    expect(revalidateTagMock.mock.calls.length).toBe(20)
  })

  it('drops absurdly long values', async () => {
    await GET(req(`tag=${'x'.repeat(5000)}&tag=good`))
    expect(revalidateTagMock.mock.calls.map((c) => c[0])).toEqual(['good'])
  })

  it('still flushes a normal request', async () => {
    await GET(req('tag=medusa-catalogue&tag=bespoke-config&path=/no/1'))
    expect(revalidateTagMock.mock.calls.map((c) => c[0])).toEqual([
      'medusa-catalogue',
      'bespoke-config',
    ])
    expect(revalidatePathMock).toHaveBeenCalledWith('/no/1')
  })
})
