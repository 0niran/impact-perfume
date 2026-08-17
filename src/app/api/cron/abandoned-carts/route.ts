import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { buildAbandonedCartEmail, sendEmail } from '@/lib/email'
import { serverEnv } from '@/lib/env'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

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
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Cron not configured.' }, { status: 500 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Carts older than 1 hour, still pending, no reminder yet → send one and mark.
  // Audit L-2: only send to customers who explicitly consented at save time.
  const due = await writeClient.fetch<PendingCartDoc[]>(
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
      await writeClient
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
  const expired = await writeClient.fetch<{ _id: string }[]>(
    `*[
      _type == "pendingCart"
      && status == "pending"
      && createdAt < $sevenDaysAgo
    ]{ _id }`,
    { sevenDaysAgo }
  )
  for (const e of expired) {
    await writeClient.patch(e._id).set({ status: 'expired' }).commit()
  }

  return NextResponse.json({ ok: true, sent, failed, expired: expired.length })
}
