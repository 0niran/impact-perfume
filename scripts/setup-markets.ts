/**
 * Set up separate NG / CA inventory in Medusa (per-market stock).
 *
 * Target: NG reads/decrements the Lagos location; CA reads/decrements a new
 * Canada location. Each market has its own sales channel + publishable key so
 * the store API reports and reserves the right pool.
 *
 * This script is IDEMPOTENT and DRY-RUN BY DEFAULT — it only reports the plan
 * and writes nothing. Re-run with --apply to actually create/link resources:
 *
 *   npx tsx scripts/setup-markets.ts            # dry run (safe, read-only)
 *   npx tsx scripts/setup-markets.ts --apply    # perform the changes
 *
 * It does, in order:
 *   1. Ensure a "Canada" stock location (with the CA address).
 *   2. Ensure an "Impact CA" sales channel, linked to the Canada location.
 *   3. Add every product to the CA channel (a publishable key only returns
 *      products in its channel — without this the CA storefront is empty).
 *   4. Ensure a "Storefront-CA" publishable key on the CA channel.
 *   5. Ensure a Canada-location inventory level (qty 0) on every inventory item.
 *
 * NG keeps the existing default sales channel + Lagos location + current key.
 * Prints the CA sales-channel id and publishable key to drop into Vercel env.
 *
 * Medusa admin endpoints used are the v2 shapes; if the first --apply run has a
 * create rejected, the dry run will already have validated auth + all reads.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

const APPLY = process.argv.includes('--apply')

// --- CA location address (shipping + Stripe Tax origin). ---
const CA_LOCATION_NAME = 'Canada'
const CA_LOCATION_ADDRESS = {
  address_1: '123 Longboat Run W',
  city: 'Brantford',
  province: 'ON',
  postal_code: 'N3T 0R8',
  country_code: 'ca',
}
const CA_CHANNEL_NAME = 'Impact CA'
const CA_KEY_TITLE = 'Storefront-CA'
const CA_INITIAL_QTY = 0 // stock the Canada location separately once inventory lands

function headers() {
  return { Authorization: adminAuthHeader(), 'Content-Type': 'application/json' }
}

async function get(pathname: string) {
  const res = await fetch(`${BACKEND}${pathname}`, { headers: headers() })
  if (!res.ok) throw new Error(`GET ${pathname} → ${res.status} ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function mutate(method: string, pathname: string, body: unknown): Promise<unknown> {
  if (!APPLY) {
    console.log(`  [dry-run] would ${method} ${pathname}`)
    return null
  }
  const res = await fetch(`${BACKEND}${pathname}`, { method, headers: headers(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json().catch(() => ({}))
}

async function listAll(pathname: string, key: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  let offset = 0
  for (;;) {
    const sep = pathname.includes('?') ? '&' : '?'
    const page = await get(`${pathname}${sep}limit=200&offset=${offset}`)
    const items = (page[key] as Record<string, unknown>[]) ?? []
    out.push(...items)
    if (items.length < 200) break
    offset += 200
  }
  return out
}

async function main() {
  if (!BACKEND) throw new Error('Missing Medusa admin env vars')
  console.log(APPLY ? 'APPLY MODE — changes will be written.\n' : 'DRY RUN — no changes. Re-run with --apply to execute.\n')

  // 1) Canada stock location
  console.log('== Stock location ==')
  const locations = (await get('/admin/stock-locations?limit=100')).stock_locations ?? []
  let canada = locations.find((l: { name: string }) => l.name.toLowerCase() === CA_LOCATION_NAME.toLowerCase())
  if (canada) {
    console.log(`  exists: "${canada.name}" (${canada.id})`)
  } else {
    console.log(`  create "${CA_LOCATION_NAME}" @ ${CA_LOCATION_ADDRESS.address_1}, ${CA_LOCATION_ADDRESS.city}`)
    const created = (await mutate('POST', '/admin/stock-locations', {
      name: CA_LOCATION_NAME,
      address: CA_LOCATION_ADDRESS,
    })) as { stock_location?: { id: string; name: string } } | null
    canada = created?.stock_location ?? null
    if (canada) console.log(`  created (${canada.id})`)
  }

  // 2) CA sales channel + link to Canada location
  console.log('\n== Sales channel ==')
  const channels = (await get('/admin/sales-channels?limit=100')).sales_channels ?? []
  let caChannel = channels.find((c: { name: string }) => c.name.toLowerCase() === CA_CHANNEL_NAME.toLowerCase())
  if (caChannel) {
    console.log(`  exists: "${caChannel.name}" (${caChannel.id})`)
  } else {
    console.log(`  create "${CA_CHANNEL_NAME}"`)
    const created = (await mutate('POST', '/admin/sales-channels', {
      name: CA_CHANNEL_NAME,
      description: 'Canadian storefront (CAD) inventory pool',
    })) as { sales_channel?: { id: string; name: string } } | null
    caChannel = created?.sales_channel ?? null
    if (caChannel) console.log(`  created (${caChannel.id})`)
  }

  if (canada && caChannel) {
    const linked = (await get(`/admin/sales-channels/${caChannel.id}?fields=*stock_locations`)).sales_channel?.stock_locations ?? []
    if (linked.some((l: { id: string }) => l.id === canada.id)) {
      console.log('  channel already linked to Canada location')
    } else {
      console.log('  link channel → Canada location')
      await mutate('POST', `/admin/stock-locations/${canada.id}/sales-channels`, { add: [caChannel.id] })
    }
  } else {
    console.log('  [dry-run] link channel → Canada location (after both are created)')
  }

  // 3) Add all products to the CA channel
  console.log('\n== Products in CA channel ==')
  const products = await listAll('/admin/products', 'products')
  console.log(`  ${products.length} products total`)
  if (caChannel) {
    const inChannel = await listAll(`/admin/products?sales_channel_id[]=${caChannel.id}`, 'products')
    const missing = products.filter((p) => !inChannel.some((q) => q.id === p.id)).map((p) => p.id as string)
    console.log(`  ${inChannel.length} already in channel, ${missing.length} to add`)
    if (missing.length) {
      // Add in batches to keep request bodies reasonable.
      for (let i = 0; i < missing.length; i += 50) {
        await mutate('POST', `/admin/sales-channels/${caChannel.id}/products`, { add: missing.slice(i, i + 50) })
      }
    }
  } else {
    console.log(`  [dry-run] would add ${products.length} products to the CA channel`)
  }

  // 4) CA publishable key
  console.log('\n== Publishable key ==')
  const keys = (await get('/admin/api-keys?type=publishable&limit=100')).api_keys ?? []
  let caKey = keys.find((k: { title: string }) => k.title === CA_KEY_TITLE)
  if (caKey) {
    console.log(`  exists: "${caKey.title}" token=${(caKey.token ?? caKey.redacted ?? '').slice(0, 14)}…`)
  } else {
    console.log(`  create publishable key "${CA_KEY_TITLE}"`)
    const created = (await mutate('POST', '/admin/api-keys', { title: CA_KEY_TITLE, type: 'publishable' })) as {
      api_key?: { id: string; token: string }
    } | null
    caKey = created?.api_key ?? null
    if (caKey && caChannel) {
      await mutate('POST', `/admin/api-keys/${caKey.id}/sales-channels`, { add: [caChannel.id] })
      console.log(`  created + linked to CA channel — token: ${caKey.token}`)
    }
  }

  // 5) Canada-location inventory levels (qty 0) on every inventory item
  console.log('\n== Inventory levels at Canada ==')
  const invItems = await listAll('/admin/inventory-items?fields=id,*location_levels', 'inventory_items')
  console.log(`  ${invItems.length} inventory items`)
  if (canada) {
    let missing = 0
    for (const item of invItems) {
      const levels = (item.location_levels as { location_id: string }[]) ?? []
      if (levels.some((l) => l.location_id === canada.id)) continue
      missing++
      await mutate('POST', `/admin/inventory-items/${item.id}/location-levels`, {
        location_id: canada.id,
        stocked_quantity: CA_INITIAL_QTY,
      })
    }
    console.log(`  ${missing} needed a Canada level (qty ${CA_INITIAL_QTY})`)
  } else {
    console.log(`  [dry-run] would ensure a Canada level on ${invItems.length} items (qty ${CA_INITIAL_QTY})`)
  }

  console.log('\n== Next: set in Vercel (Production) ==')
  console.log(`  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA = ${caKey?.token ?? '<CA key token>'}`)
  console.log(`  (CA sales channel id: ${caChannel?.id ?? '<created on --apply>'})`)
  console.log('\nDone.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
