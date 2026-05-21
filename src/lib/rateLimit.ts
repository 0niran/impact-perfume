import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Edge-friendly rate limiter backed by Upstash Redis (audit H-3, L-4).
 *
 * Gracefully no-ops when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * aren't configured so the storefront keeps working before the owner has
 * provisioned the integration via the Vercel Marketplace.
 *
 * Usage:
 *   const { ok, retryAfter } = await rateLimit(req, 'verify-payment',
 *     { limit: 10, window: '1 m' })
 *   if (!ok) return NextResponse.json(
 *     { ok: false, message: 'Too many requests.' },
 *     { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */

interface LimitConfig {
  limit: number
  /** Duration window — Upstash format like '1 m', '10 s', '1 h'. */
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
}

interface LimitResult {
  ok: boolean
  /** Seconds until the bucket has room again, when ok is false. */
  retryAfter: number
}

// Upstash provisioned via the Vercel Marketplace injects env vars under the
// legacy KV_REST_API_* naming (kept from when Vercel had its own KV product).
// A direct Upstash install uses the UPSTASH_REDIS_REST_* names. Accept either.
const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

// One Ratelimit instance per (route × config) so each route has its own
// rolling-window bucket. The cache keys the limiter by tag.
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(tag: string, config: LimitConfig): Ratelimit | null {
  if (!redis) return null
  const key = `${tag}::${config.limit}::${config.window}`
  const cached = limiterCache.get(key)
  if (cached) return cached
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: `ratelimit:${tag}`,
    analytics: false,
  })
  limiterCache.set(key, limiter)
  return limiter
}

/**
 * Read the client IP from Vercel's forwarded headers. Falls back to a
 * generic key so a misconfigured proxy doesn't accidentally turn limiting
 * off — every request would land in the same bucket.
 */
function clientKey(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'anon'
}

export async function rateLimit(
  req: NextRequest,
  tag: string,
  config: LimitConfig
): Promise<LimitResult> {
  const limiter = getLimiter(tag, config)
  // No Upstash configured → fail-open. Logged once per cold-start below.
  if (!limiter) {
    if (!_warned) {
      console.warn('[rateLimit] Upstash not configured — rate limiting disabled')
      _warned = true
    }
    return { ok: true, retryAfter: 0 }
  }
  const key = `${tag}:${clientKey(req)}`
  try {
    const res = await limiter.limit(key)
    if (res.success) return { ok: true, retryAfter: 0 }
    const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000))
    return { ok: false, retryAfter }
  } catch (err) {
    console.error('[rateLimit] limiter threw, failing open', err)
    return { ok: true, retryAfter: 0 }
  }
}

let _warned = false
