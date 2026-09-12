#!/usr/bin/env tsx
/**
 * Archive every order, whatever its state.
 *
 *   npm run archive-orders              # dry run, changes nothing
 *   npm run archive-orders -- --apply   # writes
 *
 * Clears the order list ahead of go-live so the first real customer order is
 * order number one and nothing from testing is mistaken for trade.
 *
 * Archiving, not deleting: Medusa v2 has no delete endpoint for orders, and it
 * should not — an order is an accounting record. Archiving takes them out of
 * the working list while leaving the history intact and reversible.
 */
import { adminFetch, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'

const APPLY = process.argv.includes('--apply')

interface Order {
  id: string
  display_id: number
  status: string
  email?: string
  created_at: string
}

async function allOrders(): Promise<Order[]> {
  const out: Order[] = []
  for (let offset = 0; ; offset += 100) {
    const j = await adminFetch(
      `/admin/orders?limit=100&offset=${offset}&fields=id,display_id,status,email,created_at`
    )
    const batch: Order[] = j.orders ?? []
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

async function main() {
  console.log(`\nArchive orders  ·  ${MEDUSA_BACKEND_URL}${APPLY ? '' : '  (dry run)'}\n`)

  const orders = await allOrders()
  const open = orders.filter((o) => o.status !== 'archived')

  const byStatus = open.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  console.log(`  orders found: ${orders.length}`)
  console.log(`  already archived: ${orders.length - open.length}`)
  console.log(`  to archive: ${open.length}`)
  Object.entries(byStatus).forEach(([s, n]) => console.log(`    ${s}: ${n}`))

  if (!open.length) {
    console.log('\n  Nothing to do.\n')
    return
  }
  if (!APPLY) {
    console.log('\n  Dry run. Re-run with --apply to archive.\n')
    return
  }

  let done = 0
  const failed: { order: Order; reason: string }[] = []
  for (const o of open) {
    try {
      await adminFetch(`/admin/orders/${o.id}/archive`, { method: 'POST' })
      done++
    } catch (err) {
      failed.push({ order: o, reason: err instanceof Error ? err.message : String(err) })
    }
  }

  console.log(`\n  archived: ${done}`)
  if (failed.length) {
    // An order Medusa refuses to archive is worth seeing rather than counting.
    console.log(`  refused: ${failed.length}`)
    failed.forEach((f) => console.log(`    #${f.order.display_id} (${f.order.status}): ${f.reason}`))
  }
  console.log()
}

main().catch((err) => {
  console.error('\nfailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
