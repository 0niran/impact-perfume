import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client.
 *
 * Upstash provisioned through the Vercel Marketplace injects its env vars
 * under the legacy KV_REST_API_* names, kept from when Vercel had its own KV
 * product. A direct Upstash install uses UPSTASH_REDIS_REST_*. Accept either,
 * so the storefront works whichever way it was provisioned.
 *
 * Null when unconfigured. Callers decide what that means for them — the rate
 * limiter lets traffic through, the payment lock allows fulfilment. Both are
 * deliberate: refusing a customer because a cache is down is worse than the
 * thing the cache was protecting against.
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

export const redis = url && token ? new Redis({ url, token }) : null
