import { NextRequest, NextResponse } from 'next/server'
import { sanityWrite } from '@/sanity/client'
import { buildAbandonedCartEmail, sendEmail } from '@/lib/email'
import { serverEnv } from '@/lib/env'
import { bearerMatches } from '@/lib/bearerAuth'
import { rateLimit } from '@/lib/rateLimit'


interface PendingCartDoc {
  _id: string
  email: string
  region: 'NG' | 'CA'
  currency: string
  subtotalMinor: number
  lines: {
    variantId: string
    handle?: string
    name: string
    variantLabel?: string
    qty: number
    unitPriceMinor: number
    thumbnail?: string
  }[]
  createdAt: string
  remindersSent: number
}

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

  // No store, no pending carts to chase.
  if (!sanityWrite) return NextResponse.json({ ok: true, sent: 0, reason: 'no store configured' })

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Carts older than 1 hour, still pending, no reminder yet → send one and mark.
  // Audit L-2: only send to customers who explicitly consented at save time.
  const due = await sanityWrite.fetch<PendingCartDoc[]>(
    `*[
      _type == "pendingCart"
      && status == "pending"
      && consentToContact == true
      && remindersSent == 0
      && createdAt < $oneHourAgo
      && createdAt > $sevenDaysAgo
    ][0...50]`,
    { oneHourAgo, sevenDaysAgo }
  )

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
      await sanityWrite
        .patch(cart._id)
        .set({ remindersSent: 1, lastEmailedAt: new Date().toISOString() })
        .commit()
      sent++
    } catch (err) {
      console.error('[cron.abandoned-carts] send failed for', cart._id, err)
      failed++
    }
  }

  // Expire carts older than 7 days that never converted.
  const expired = await sanityWrite.fetch<{ _id: string }[]>(
    `*[
      _type == "pendingCart"
      && status == "pending"
      && createdAt < $sevenDaysAgo
    ]{ _id }`,
    { sevenDaysAgo }
  )
  for (const e of expired) {
    await sanityWrite.patch(e._id).set({ status: 'expired' }).commit()
  }

  return NextResponse.json({ ok: true, sent, failed, expired: expired.length })
}
