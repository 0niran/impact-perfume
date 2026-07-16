/**
 * One-off recovery for Stripe (CA) payments that were captured but whose Medusa
 * order never got created (the "insufficient_inventory + poisoned lock" bug).
 *
 * For each reference it: looks up the PaymentIntent on Stripe, rebuilds the
 * fulfilment input from its metadata, clears the stale Sanity idempotency lock,
 * then re-runs fulfillOrder (which now creates the order, captures, and emails).
 *
 * Run it with the production env available (Stripe + Medusa admin + Sanity):
 *
 *   STRIPE_SECRET_KEY=sk_live_... \
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL=... MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
 *   NEXT_PUBLIC_MEDUSA_REGION_ID_CA=... NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=... \
 *   NEXT_PUBLIC_SANITY_PROJECT_ID=... SANITY_API_WRITE_TOKEN=... RESEND_API_KEY=... \
 *   npx tsx scripts/recover-stripe-orders.ts
 *
 * Pass references as args to override the default list:
 *   npx tsx scripts/recover-stripe-orders.ts impact-ca-... impact-ca-...
 *
 * Preview without writing anything (recommended first pass):
 *   npx tsx scripts/recover-stripe-orders.ts --dry-run
 *
 * Safe to re-run: an order that already exists is skipped by the idempotency
 * lock, and verifyPaidOrder still re-prices + re-checks stock before fulfilling.
 */
import Stripe from 'stripe'
import { fulfillOrder, type CartLine, type ShippingAddress } from '../src/lib/orderFulfillment'
import { unpackStripeLines } from '../src/lib/stripeMetadata'
import { releasePayment } from '../src/lib/processedPayment'

// The references whose Stripe payments are missing a Medusa order.
const DEFAULT_REFERENCES = [
  'impact-ca-1782354544253-03fbed43',
  'impact-ca-1779807374144-0a426982',
  'impact-ca-1779397195430-tovmvt',
  'impact-ca-1779397094567-zsukla',
]

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is required')
  const stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' })

  // --dry-run reports what each reference would do (captured? amount? lines?)
  // without releasing any lock or creating any order. Run this first.
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const refArgs = args.filter((a) => a !== '--dry-run')
  const references = refArgs.length ? refArgs : DEFAULT_REFERENCES
  if (dryRun) console.log('DRY RUN — no locks released, no orders created.\n')

  for (const reference of references) {
    console.log(`\n=== ${reference} ===`)
    // Find the PaymentIntent by its reference metadata.
    const search = await stripe.paymentIntents.search({
      query: `metadata['reference']:'${reference}'`,
      limit: 1,
    })
    const intent = search.data[0]
    if (!intent) {
      console.warn('  no PaymentIntent found — skipping')
      continue
    }
    if (intent.status !== 'succeeded') {
      console.warn(`  intent status is "${intent.status}" (not succeeded) — skipping`)
      continue
    }

    const md = intent.metadata ?? {}
    let shippingAddress: ShippingAddress
    let lines: CartLine[]
    try {
      shippingAddress = JSON.parse(md.shippingAddress || '{}') as ShippingAddress
      const raw = JSON.parse(unpackStripeLines(md) || '[]') as Array<{
        v: string; n: string; l?: string; q: number; p: number
      }>
      lines = raw.map((l) => ({
        variantId: l.v,
        name: l.n,
        variantLabel: l.l,
        qty: l.q,
        unitPriceKobo: l.p,
      }))
    } catch (err) {
      console.error('  metadata parse failed — skipping', err)
      continue
    }
    if (lines.length === 0) {
      console.warn('  no line metadata — skipping')
      continue
    }

    if (dryRun) {
      const total = lines.reduce((s, l) => s + l.unitPriceKobo * l.qty, 0)
      console.log(`  WOULD RECOVER — ${intent.currency.toUpperCase()} ${intent.amount} captured`)
      console.log(`    email: ${md.customerEmail ?? intent.receipt_email ?? '(none)'}`)
      console.log(`    lines: ${lines.length} (metadata total ${total})`)
      console.log(`    PaymentIntent: ${intent.id}`)
      continue
    }

    // Clear the poisoned lock so fulfillOrder can re-attempt.
    await releasePayment(reference)

    const result = await fulfillOrder({
      reference,
      regionId: 'CA',
      totalKobo: intent.amount,
      currency: intent.currency.toUpperCase(),
      customerName: md.customerName ?? '',
      customerEmail: md.customerEmail ?? intent.receipt_email ?? '',
      customerPhone: md.customerPhone ?? '',
      shippingAddress,
      lines,
      paymentProvider: 'stripe',
      paymentRef: intent.id,
      source: 'verify',
    })
    console.log(result.ok ? '  ✓ recovered — order created' : '  ✗ still failing (check logs above)')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
