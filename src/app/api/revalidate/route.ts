import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { serverEnv } from '@/lib/env'
import { bearerMatches } from '@/lib/bearerAuth'
import { rateLimit } from '@/lib/rateLimit'

/**
 * On-demand ISR invalidation. Use whenever Medusa data changes outside of
 * a deploy (price tweaks, image swaps, new products) and you don't want to
 * wait up to an hour for the cached PDP to refresh.
 *
 * Auth: Authorization: Bearer <token>, where <token> is EITHER
 *   CRON_SECRET            — ops use, eg. `npm run refresh-storefront`
 *   MEDUSA_WEBHOOK_SECRET  — the Medusa subscriber on Railway
 *
 * Accepting the Medusa secret here is what keeps CRON_SECRET off the Medusa
 * box. The deployed subscriber calls this route (not /api/webhooks/medusa), so
 * the only way to authenticate it used to be handing Railway CRON_SECRET — and
 * that same token also opens /api/cron/abandoned-carts, which emails the
 * customer list, and /api/cron/reconcile-orders, which reads Stripe payment
 * intents. A cache-flush caller has no business holding either.
 *
 * This grants the Medusa secret nothing new: it already flushes the same tags
 * through /api/webhooks/medusa. The widened surface is cache invalidation only.
 *
 * Usage:
 *   GET /api/revalidate?path=/no/1
 *   GET /api/revalidate?path=/shop&path=/oils  (repeat ?path for multiple)
 *   GET /api/revalidate?tag=products            (if you start using tags)
 *
 * Returns the list of paths that were flushed.
 */
export async function GET(req: NextRequest) {
  // Throttled BEFORE the auth check, so token guessing is limited too and not
  // just authenticated traffic. The limiter keys on client IP, so a flood from
  // one source cannot consume the real caller's allowance.
  const limit = await rateLimit(req, 'revalidate', { limit: 60, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  // Fails CLOSED when neither secret is set — refusing to flush is better than
  // letting anyone trigger cache regeneration when env vars are misconfigured
  // (audit H-2).
  const accepted = [serverEnv.cronSecret, serverEnv.medusaWebhookSecret].filter(
    (s): s is string => Boolean(s)
  )
  if (accepted.length === 0) {
    return NextResponse.json({ ok: false, message: 'Revalidation not configured.' }, { status: 503 })
  }
  const authorization = req.headers.get('authorization')
  // Every candidate is checked even after a match, so the time taken does not
  // reveal which secret was presented.
  const authorised = accepted.reduce(
    (ok, candidate) => bearerMatches(authorization, candidate) || ok,
    false
  )
  if (!authorised) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }

  const url = req.nextUrl
  // Bound both the count and the length. getAll() is unbounded, so without this
  // a single request could ask for thousands of invalidations and turn a cheap
  // call into an expensive one — and every flush pushes traffic past the Data
  // Cache to a single upstream container.
  const MAX_ENTRIES = 20
  const MAX_LENGTH = 200
  const clamp = (values: string[]) =>
    values.filter((v) => v.length > 0 && v.length <= MAX_LENGTH).slice(0, MAX_ENTRIES)

  const paths = clamp(url.searchParams.getAll('path'))
  const tags = clamp(url.searchParams.getAll('tag'))

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json({ ok: false, message: 'Provide ?path= or ?tag= (repeatable).' }, { status: 400 })
  }

  for (const p of paths) revalidatePath(p)
  for (const t of tags) revalidateTag(t)

  return NextResponse.json({ ok: true, paths, tags })
}
