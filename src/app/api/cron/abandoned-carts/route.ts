import { NextRequest, NextResponse } from 'next/server'
import { listDueCarts, markReminded, pruneIndex } from '@/lib/pendingCart'
import { buildAbandonedCartEmail, sendEmail } from '@/lib/email'
import { serverEnv } from '@/lib/env'
import { bearerMatches } from '@/lib/bearerAuth'
import { rateLimit } from '@/lib/rateLimit'


// Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when it fires this
// route. Reject anything without a matching secret so the URL isn't open.
//
// Fails CLOSED (returns false) when CRON_SECRET is unset — refusing to run
// is better than running unauthenticated if env vars are misconfigured
// (audit H-2). Local-dev convenience is recovered by setting CRON_SECRET
// in .env.local.
function isAuthorised(req: NextRequest): boolean {
  const secret = serverEnv.cronSecret
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return bearerMatches(auth, secret)
}

export async function GET(req: NextRequest) {
  // Throttled BEFORE the auth check, so token guessing is limited too and not
  // just authenticated traffic. The limiter keys on client IP, so a flood from
  // one source cannot consume the real caller's allowance.
  const limit = await rateLimit(req, 'cron-abandoned-carts', { limit: 5, window: '1 h' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Cron not configured.' }, { status: 500 })
  }

  const ONE_HOUR = 60 * 60 * 1000

  // Carts saved more than an hour ago and not yet reminded. "Not yet reminded"
  // is simply "still in the index" — markReminded removes it, which is what
  // stops a second email. Consent was required to store the cart at all.
  const due = await listDueCarts(ONE_HOUR, 50)

  let sent = 0
  let failed = 0
  for (const cart of due) {
    try {
      const { subject, html } = buildAbandonedCartEmail({
        customerEmail: cart.email,
        currency: cart.currency,
        totalMinor: cart.subtotalMinor,
        items: cart.lines.map((l) => ({
          name: l.name,
          variantLabel: l.variantLabel,
          qty: l.qty,
          unitPriceMinor: l.unitPriceMinor,
        })),
      })
      await sendEmail({ to: cart.email, subject, html })
      await markReminded(cart.email)
      sent++
    } catch (err) {
      console.error('[cron.abandoned-carts] send failed for', cart.email, err)
      failed++
      // Left in the index deliberately: a transient mail failure should be
      // retried on the next run rather than silently dropping the cart.
    }
  }

  // The carts themselves expire on their own TTL; this only clears index
  // entries pointing at keys that have already gone.
  const pruned = await pruneIndex()

  return NextResponse.json({ ok: true, sent, failed, pruned })
}
