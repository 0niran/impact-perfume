import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { buildOwnerAlertEmail, sendEmail, type AlertItem } from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'
import { getMedusaAdminToken } from '@/lib/medusaAdmin'
import { serverEnv } from '@/lib/env'

/**
 * Payment/order reconciliation. Catches the "paid but no Medusa order" class of
 * failure automatically instead of by customer complaint.
 *
 * For a lookback window it lists every SUCCEEDED Stripe PaymentIntent and every
 * SUCCESSFUL Paystack transaction, then diffs them against the references
 * recorded on recent Medusa orders. Anything captured but missing an order is
 * emailed to the business inbox so it can be recovered.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Fails CLOSED
 * when CRON_SECRET is unset (same posture as the abandoned-carts cron).
 *
 * Schedule via vercel.json (see repo root). Manual run:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://impactperfumes.com/api/cron/reconcile-orders?days=14"
 *
 * Note: reads up to 100 payments per provider per run. At current volume that
 * covers well over the default 14-day window; widen paging here if volume grows.
 */

function isAuthorised(req: NextRequest): boolean {
  const secret = serverEnv.cronSecret
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

/** Every reference-like string recorded on Medusa orders created since `since`. */
async function fulfilledReferences(since: Date): Promise<Set<string> | null> {
  const backend = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const token = await getMedusaAdminToken()
  if (!backend || !token) return null
  const refs = new Set<string>()
  try {
    const res = await fetch(
      `${backend}/admin/orders?limit=100&order=-created_at&fields=id,created_at,metadata`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    if (!res.ok) return null
    const { orders = [] } = (await res.json()) as {
      orders?: { created_at: string; metadata?: Record<string, unknown> }[]
    }
    for (const o of orders) {
      if (new Date(o.created_at) < since) continue
      const md = o.metadata ?? {}
      for (const key of ['reference', 'stripe_reference', 'paystack_reference']) {
        const v = md[key]
        if (typeof v === 'string' && v) refs.add(v)
      }
    }
    return refs
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }

  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 14))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const sinceUnix = Math.floor(since.getTime() / 1000)

  const fulfilled = await fulfilledReferences(since)
  if (!fulfilled) {
    return NextResponse.json(
      { ok: false, message: 'Could not read Medusa orders — skipping to avoid false alarms.' },
      { status: 503 }
    )
  }

  const gaps: AlertItem[] = []
  let checkedStripe = 0
  let checkedPaystack = 0

  // --- Stripe (CAD) ---
  const stripeKey = serverEnv.stripeSecretKey
  if (stripeKey) {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })
    try {
      const list = await stripe.paymentIntents.list({ created: { gte: sinceUnix }, limit: 100 })
      for (const pi of list.data) {
        if (pi.status !== 'succeeded') continue
        checkedStripe++
        const ref = pi.metadata?.reference ?? ''
        if ((ref && fulfilled.has(ref)) || fulfilled.has(pi.id)) continue
        gaps.push({
          title: `Stripe · ${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`,
          lines: [
            `Reference: ${ref || '(none)'}`,
            `Payment intent: ${pi.id}`,
            `Customer: ${pi.receipt_email ?? pi.metadata?.customerEmail ?? '(unknown)'}`,
            `Captured: ${new Date(pi.created * 1000).toISOString().slice(0, 10)}`,
          ],
        })
      }
    } catch (err) {
      console.error('[reconcile] Stripe list failed', err)
    }
  }

  // --- Paystack (NGN) ---
  const paystackKey = serverEnv.paystackSecretKey
  if (paystackKey) {
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction?status=success&perPage=100&from=${since.toISOString()}`,
        { headers: { Authorization: `Bearer ${paystackKey}` } }
      )
      const json = (await res.json()) as {
        data?: {
          reference: string
          amount: number
          currency?: string
          paid_at?: string
          customer?: { email?: string }
        }[]
      }
      for (const tx of json.data ?? []) {
        checkedPaystack++
        if (fulfilled.has(tx.reference)) continue
        gaps.push({
          title: `Paystack · ${(tx.currency ?? 'NGN').toUpperCase()} ${(tx.amount / 100).toLocaleString('en-NG')}`,
          lines: [
            `Reference: ${tx.reference}`,
            `Customer: ${tx.customer?.email ?? '(unknown)'}`,
            `Captured: ${(tx.paid_at ?? '').slice(0, 10) || '(unknown)'}`,
          ],
        })
      }
    } catch (err) {
      console.error('[reconcile] Paystack list failed', err)
    }
  }

  if (gaps.length > 0) {
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      ...buildOwnerAlertEmail({
        subjectPrefix: 'Reconciliation',
        heading: `${gaps.length} paid order${gaps.length === 1 ? '' : 's'} missing from Medusa`,
        intro: `These payments were captured in the last ${days} days but have no matching Medusa order. Recover them with scripts/recover-stripe-orders.ts (Stripe) or by re-checking the Paystack webhook.`,
        items: gaps,
      }),
    }).catch((err) => console.error('[reconcile] alert send failed', err))
  }

  return NextResponse.json({
    ok: true,
    days,
    checkedStripe,
    checkedPaystack,
    fulfilledReferences: fulfilled.size,
    gaps: gaps.length,
  })
}
