#!/usr/bin/env tsx
/**
 * Archive every order, whatever its state.
 *
 *   npm run archive-orders                                 # dry run
 *   npm run archive-orders -- --apply                      # archive what can be archived
 *   npm run archive-orders -- --apply --complete-pending   # also clear pending orders
 *
 * Clears the order list ahead of go-live so the first real customer order is
 * not sitting among test traffic.
 *
 * Archiving, not deleting: Medusa has no delete endpoint for orders, and it
 * should not — an order is an accounting record. Archiving takes them out of
 * the working list while leaving the history intact.
 *
 * Medusa only archives an order whose status is completed, canceled or draft
 * (order-module-service archive_). A pending order has to reach one of those
 * first, which --complete-pending does by completing it. That is a real state
 * change and there is no un-complete, so it is opt-in rather than the default.
 * Note that Medusa's own rejection message states the rule backwards — it names
 * the three allowed statuses as though they were the ones being refused — so
 * trust the behaviour, not the text.
 *
 * Completing moves no money. It does not capture, refund or notify: the backend
 * registers no order subscribers, so nothing is sent to the customer.
 */
import { adminFetch, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'

const APPLY = process.argv.includes('--apply')
const COMPLETE_PENDING = process.argv.includes('--complete-pending')

/** The only statuses Medusa will archive from. */
const ARCHIVABLE = new Set(['completed', 'canceled', 'draft'])

interface Order {
  id: string
  display_id: number
  status: string
  payment_status?: string
  fulfillment_status?: string
  created_at: string
}

async function allOrders(): Promise<Order[]> {
  const out: Order[] = []
  for (let offset = 0; ; offset += 100) {
    const j = await adminFetch(
      `/admin/orders?limit=100&offset=${offset}` +
        `&fields=id,display_id,status,payment_status,fulfillment_status,created_at`
    )
    const batch: Order[] = j.orders ?? []
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

const tally = (orders: Order[]) =>
  orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

async function main() {
  console.log(`\nArchive orders  ·  ${MEDUSA_BACKEND_URL}${APPLY ? '' : '  (dry run)'}\n`)

  const orders = await allOrders()
  const open = orders.filter((o) => o.status !== 'archived')
  const ready = open.filter((o) => ARCHIVABLE.has(o.status))
  const blocked = open.filter((o) => !ARCHIVABLE.has(o.status))

  console.log(`  orders found: ${orders.length}`)
  console.log(`  already archived: ${orders.length - open.length}`)
  console.log(`  archivable as they stand: ${ready.length}`, JSON.stringify(tally(ready)))
  console.log(`  blocked by status: ${blocked.length}`, JSON.stringify(tally(blocked)))

  if (blocked.length && !COMPLETE_PENDING) {
    console.log(
      `\n  Medusa archives only completed, canceled or draft orders. Pass\n` +
        `  --complete-pending to complete the ${blocked.length} blocked order(s) first.`
    )
  }

  const plan = COMPLETE_PENDING ? [...ready, ...blocked] : ready
  if (!plan.length) {
    console.log('\n  Nothing to do.\n')
    return
  }
  if (!APPLY) {
    console.log(`\n  Dry run. Would archive ${plan.length} order(s).\n`)
    return
  }

  let completed = 0
  let archived = 0
  const failed: { order: Order; step: string; reason: string }[] = []

  for (const o of plan) {
    const needsCompleting = !ARCHIVABLE.has(o.status)
    try {
      if (needsCompleting) {
        await adminFetch(`/admin/orders/${o.id}/complete`, { method: 'POST' })
        completed++
      }
      await adminFetch(`/admin/orders/${o.id}/archive`, { method: 'POST' })
      archived++
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      failed.push({ order: o, step: needsCompleting ? 'complete' : 'archive', reason })
    }
  }

  if (completed) console.log(`\n  completed first: ${completed}`)
  console.log(`  archived: ${archived}`)
  if (failed.length) {
    // An order Medusa refuses is worth seeing rather than counting.
    console.log(`  refused: ${failed.length}`)
    failed.forEach((f) =>
      console.log(`    #${f.order.display_id} (${f.order.status}) at ${f.step}: ${f.reason}`)
    )
  }
  console.log()
}

main().catch((err) => {
  console.error('\nfailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
