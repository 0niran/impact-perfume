import { describe, it, expect, vi, beforeEach } from 'vitest'

const revalidateTagMock = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: (...a: unknown[]) => revalidateTagMock(...a),
}))
vi.mock('@/lib/rateLimit', () => ({ rateLimit: async () => ({ ok: true, retryAfter: 0 }) }))

const CRON = 'cron_secret_value'
const MEDUSA = 'medusa_webhook_secret_value'
let cron: string | undefined = CRON
let medusa: string | undefined = MEDUSA
vi.mock('@/lib/env', () => ({
  serverEnv: {
    get cronSecret() {
      return cron
    },
    get medusaWebhookSecret() {
      return medusa
    },
  },
}))

import { GET } from '../route'

function req(token?: string) {
  const url = new URL('https://example.test/api/revalidate?tag=medusa-catalogue')
  return {
    nextUrl: url,
    headers: {
      get: (k: string) =>
        k.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null,
    },
  } as never
}

beforeEach(() => {
  revalidateTagMock.mockClear()
  cron = CRON
  medusa = MEDUSA
})

/**
 * The Medusa subscriber on Railway calls THIS route (not /api/webhooks/medusa),
 * so before it accepted MEDUSA_WEBHOOK_SECRET the only way to authenticate it
 * was to put CRON_SECRET on the Medusa box — the same token that opens
 * /api/cron/abandoned-carts (emails the customer list) and
 * /api/cron/reconcile-orders (reads Stripe payment intents).
 */
describe('GET /api/revalidate auth', () => {
  it('accepts CRON_SECRET, for ops use', async () => {
    const res = await GET(req(CRON))
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalledWith('medusa-catalogue')
  })

  it('accepts MEDUSA_WEBHOOK_SECRET, so Railway never needs CRON_SECRET', async () => {
    const res = await GET(req(MEDUSA))
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalledWith('medusa-catalogue')
  })

  it('rejects an unrelated token', async () => {
    const res = await GET(req('not-a-real-secret-value-here'))
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('rejects a missing Authorization header', async () => {
    expect((await GET(req())).status).toBe(401)
  })

  it('still authenticates when only the Medusa secret is configured', async () => {
    cron = undefined
    expect((await GET(req(MEDUSA))).status).toBe(200)
  })

  it('still authenticates when only the cron secret is configured', async () => {
    medusa = undefined
    expect((await GET(req(CRON))).status).toBe(200)
  })

  it('fails closed with 503 when neither secret is set', async () => {
    // Refusing to flush beats letting anyone churn the cache on a
    // misconfigured deployment.
    cron = undefined
    medusa = undefined
    const res = await GET(req(CRON))
    expect(res.status).toBe(503)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })
})
