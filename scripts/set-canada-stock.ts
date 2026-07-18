/**
 * Set the Canada stock location's quantity for every inventory item.
 *
 *   npx tsx scripts/set-canada-stock.ts        # sets every Canada level to 20
 *   npx tsx scripts/set-canada-stock.ts 50     # or any quantity you pass
 *
 * Idempotent: updates the Canada level where it exists, creates it (at the
 * given qty) where it doesn't. NG / Lagos stock is never touched. Reads admin
 * credentials from .env.local via dotenv.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

// The Canada stock location provisioned by scripts/setup-markets.ts.
const CANADA_LOCATION_ID = 'sloc_01KWZKFF9NG2YPYG78Z8Y7YBPH'

const QTY = Number.parseInt(process.argv[2] ?? '20', 10)

let token = ''

async function auth(): Promise<void> {
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`admin auth failed ${res.status}`)
  token = (await res.json()).token
}

function headers() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface InventoryItem {
  id: string
  sku?: string
  location_levels?: { location_id: string }[]
}

async function allInventoryItems(): Promise<InventoryItem[]> {
  const out: InventoryItem[] = []
  let offset = 0
  for (;;) {
    const res = await fetch(
      `${BACKEND}/admin/inventory-items?limit=200&offset=${offset}&fields=id,sku,*location_levels`,
      { headers: headers() }
    )
    if (!res.ok) throw new Error(`list inventory-items ${res.status}`)
    const { inventory_items } = (await res.json()) as { inventory_items: InventoryItem[] }
    out.push(...inventory_items)
    if (inventory_items.length < 200) break
    offset += 200
  }
  return out
}

async function main() {
  if (!BACKEND || !EMAIL || !PASSWORD) throw new Error('Missing Medusa admin env vars in .env.local')
  if (!Number.isInteger(QTY) || QTY < 0) throw new Error(`Invalid quantity "${process.argv[2]}"`)

  await auth()
  const items = await allInventoryItems()
  console.log(`Setting Canada stock to ${QTY} across ${items.length} inventory items…`)

  let updated = 0
  let created = 0
  let failed = 0
  for (const item of items) {
    const has = (item.location_levels ?? []).some((l) => l.location_id === CANADA_LOCATION_ID)
    const url = has
      ? `${BACKEND}/admin/inventory-items/${item.id}/location-levels/${CANADA_LOCATION_ID}`
      : `${BACKEND}/admin/inventory-items/${item.id}/location-levels`
    const body = has
      ? { stocked_quantity: QTY }
      : { location_id: CANADA_LOCATION_ID, stocked_quantity: QTY }
    const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    if (!res.ok) {
      failed++
      console.error(`  FAIL ${item.sku ?? item.id}: ${res.status} ${(await res.text()).slice(0, 150)}`)
    } else if (has) {
      updated++
    } else {
      created++
    }
  }
  console.log(`Done. updated ${updated}, created ${created}, failed ${failed}.`)
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
