import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The webhook must accept ONLY MEDUSA_WEBHOOK_SECRET.
 *
 * CRON_SECRET also unlocks the cron routes, which email customers and list
 * Stripe payment intents. This endpoint's token has to live in the Medusa
 * deployment, so accepting CRON_SECRET here would put a far more powerful key
 * in a system that only needs to flush a cache.
 */
vi.mock('@/lib/rateLimit', () => ({ rateLimit: async () => ({ ok: true, retryAfter: 0 }) }))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))

const CRON = 'the_cron_secret_value'
const WEBHOOK = 'the_webhook_secret_value'
const env = vi.hoisted(() => ({ webhook: undefined as string | undefined }))

vi.mock('@/lib/env', () => ({
  serverEnv: {
    get medusaWebhookSecret() {
      return env.webhook
    },
    get cronSecret() {
      return CRON
    },
  },
}))

import { POST } from '../route'

function req(auth: string) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth : null) },
    json: async () => ({ type: 'product.updated', data: { handle: 'no-5' } }),
  } as never
}

beforeEach(() => {
  env.webhook = WEBHOOK
})

describe('POST /api/webhooks/medusa secret scope', () => {
  it('accepts MEDUSA_WEBHOOK_SECRET', async () => {
    expect((await POST(req(`Bearer ${WEBHOOK}`))).status).toBe(200)
  })

  it('REJECTS CRON_SECRET, even though it is set', async () => {
    // The whole point: no fallback to the more powerful key.
    expect((await POST(req(`Bearer ${CRON}`))).status).toBe(401)
  })

  it('fails closed with 503 when no webhook secret is configured', async () => {
    env.webhook = undefined
    // Notably it does NOT quietly start accepting CRON_SECRET instead.
    expect((await POST(req(`Bearer ${CRON}`))).status).toBe(503)
  })
})
