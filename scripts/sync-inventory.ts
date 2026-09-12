#!/usr/bin/env tsx
/**
 * Bring Medusa in line with the inventory sheet.
 *
 *   npm run sync-inventory              # dry run, changes nothing
 *   npm run sync-inventory -- --apply   # writes
 *
 * docs/Impact Perfume Inventory.csv is the source of truth for what the shop
 * sells. Every row is matched to a product, its stock is set in both markets,
 * and every other published product is moved to draft so the storefront offers
 * only what is really on the shelf.
 *
 * Deliberately NOT a price sync. The sheet's NGN prices already match what is
 * live — checked row by row before this was written — and prices reach two
 * currencies and two regions, which is a different job with different failure
 * modes. If prices ever need to change, that belongs in its own script.
 */
import { adminFetch, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'
import fs from 'fs'
import path from 'path'

const APPLY = process.argv.includes('--apply')
const CSV = path.resolve(process.cwd(), 'docs/Impact Perfume Inventory.csv')

/**
 * Rows whose name does not mechanically resolve to a handle.
 *
 * The sheet writes "CAR DIFFUSER FRUITY" where the catalogue titles it "Fruity
 * Car Diffuser", so word order alone defeats a normalised title match. These
 * were confirmed against the live catalogue rather than guessed.
 */
const EXPLICIT: Record<string, string[]> = {
  'CAR DIFFUSER FRUITY': ['car-diffuser-fruity'],
  'OUD OSMOSIS': ['oud-osmosis-unlimited'],
  'HOME DIFFUSER OUD MAGNIFIQUE': ['home-diffuser-oud-magnifique'],
  'HOME DIFFUSER CITRUS MIX': ['home-diffuser-citrus-mix'],
  'HOME DIFFUSER FRUITY': ['home-diffuser-fruity'],
  'HOME DIFFUSSER BERRY ISLAND': ['home-diffuser-no-1'],
  // One sheet row, two catalogue products, one unit each — the owner's call.
  'GIFT SET': ['deluxe-gift-box', 'corporate-gift-box'],
}

/**
 * Published products the sheet does not list but which stay published.
 *
 * The discovery sets are bundles assembled from stock that is already counted
 * row by row, so they are not separate inventory. The candles were left off the
 * sheet rather than discontinued.
 */
const KEEP_PUBLISHED = new Set([
  'discovery-set',
  'number-discovery-set',
  'signature-discovery-set',
  'candle-no-1',
  'candle-no-5',
  'candle-no-11',
  'candle-no-13',
  'candle-no-18',
])

interface Row { name: string; category: string; qty: number; ngn: number }

/** Excel writes CRLF and quotes the price because it contains a comma. */
function parseCsv(text: string): Row[] {
  return text
    .replace(/\r/g, '')
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const cells: string[] = []
      let cur = ''
      let quoted = false
      for (const ch of line) {
        if (ch === '"') quoted = !quoted
        else if (ch === ',' && !quoted) { cells.push(cur); cur = '' }
        else cur += ch
      }
      cells.push(cur)
      const [name, category, qty, price] = cells
      return {
        name: (name ?? '').trim(),
        category: (category ?? '').trim(),
        qty: Number(qty),
        ngn: Number(String(price ?? '').replace(/[^\d.]/g, '')),
      }
    })
    .filter((r) => r.name && Number.isFinite(r.qty))
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

interface AdminProduct {
  id: string
  handle: string
  title: string
  status: string
  variants?: { id: string; inventory_items?: { inventory_item_id: string }[] }[]
}

async function allProducts(): Promise<AdminProduct[]> {
  const out: AdminProduct[] = []
  for (let offset = 0; ; offset += 100) {
    const j = await adminFetch(
      `/admin/products?limit=100&offset=${offset}&fields=id,handle,title,status,*variants.inventory_items`
    )
    const batch: AdminProduct[] = j.products ?? []
    out.push(...batch)
    if (batch.length < 100) break
  }
  return out
}

/** Stock locations, resolved by name so this keeps working if ids change. */
async function locations(): Promise<{ id: string; name: string }[]> {
  const { stock_locations } = await adminFetch('/admin/stock-locations?limit=50&fields=id,name')
  const ng = stock_locations.find((l: any) => /hq|lagos|impact perfume/i.test(l.name))
  const ca = stock_locations.find((l: any) => /canada|brantford/i.test(l.name))
  const missing = [!ng && 'Nigeria', !ca && 'Canada'].filter(Boolean)
  if (missing.length) throw new Error(`Could not resolve stock location(s): ${missing.join(', ')}`)
  return [ng, ca]
}

async function setStock(inventoryItemId: string, locationId: string, qty: number) {
  // A level may or may not exist yet; creating one that exists is a 4xx, so try
  // the update first and fall back to creating it.
  try {
    await adminFetch(`/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`, {
      method: 'POST',
      body: JSON.stringify({ stocked_quantity: qty }),
    })
  } catch {
    await adminFetch(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
      method: 'POST',
      body: JSON.stringify({ location_id: locationId, stocked_quantity: qty }),
    })
  }
}

async function main() {
  console.log(`\nInventory sync  ·  ${MEDUSA_BACKEND_URL}${APPLY ? '' : '  (dry run)'}\n`)

  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'))
  const products = await allProducts()
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  const byTitle = new Map(products.map((p) => [norm(p.title), p]))
  console.log(`  sheet rows: ${rows.length}    products in Medusa: ${products.length}`)

  // --- resolve every row to one or more products ---------------------------
  const targets = new Map<string, { product: AdminProduct; qty: number; row: Row }>()
  const unmatched: Row[] = []
  for (const row of rows) {
    const explicit = EXPLICIT[squash(row.name).toUpperCase()]
    let handles: string[] | undefined = explicit
    if (!handles) {
      const n = row.name.match(/^100ml Perfume No (\d+)$/i)
      const o = row.name.match(/^Oil No (\d+)$/i)
      if (n) handles = [`no-${n[1]}`]
      else if (o) handles = [`oil-no-${o[1]}`]
    }
    const found = handles
      ? handles.map((h) => byHandle.get(h)).filter(Boolean as unknown as (p: AdminProduct | undefined) => p is AdminProduct)
      : [byTitle.get(norm(row.name))].filter(Boolean as unknown as (p: AdminProduct | undefined) => p is AdminProduct)
    if (!found.length) { unmatched.push(row); continue }
    for (const p of found) targets.set(p.id, { product: p, qty: row.qty, row })
  }

  if (unmatched.length) {
    console.log(`\n  UNRESOLVED ROWS (${unmatched.length}) — nothing will be written until these are mapped:`)
    unmatched.forEach((r) => console.log(`    ${JSON.stringify(r.name)}  [${r.category}]`))
    console.log('\n  Add them to EXPLICIT in this script, or correct the sheet.')
    process.exit(1)
  }

  // --- what changes --------------------------------------------------------
  const toDraft = products.filter(
    (p) => p.status === 'published' && !targets.has(p.id) && !KEEP_PUBLISHED.has(p.handle)
  )
  const toPublish = [...targets.values()].filter((t) => t.product.status !== 'published')

  console.log(`\n  sheet rows resolved to ${targets.size} product(s)`)
  console.log(`  stock to set (both markets): ${targets.size}`)
  console.log(`  to publish (listed but not live): ${toPublish.length}`)
  toPublish.forEach((t) => console.log(`    + ${t.product.handle} (${t.product.status})`))
  console.log(`  to draft (live but not listed): ${toDraft.length}`)
  toDraft.slice(0, 15).forEach((p) => console.log(`    - ${p.handle}`))
  if (toDraft.length > 15) console.log(`    … and ${toDraft.length - 15} more`)
  console.log(`  kept published though absent from the sheet: ${[...KEEP_PUBLISHED].length}`)

  if (!APPLY) {
    console.log('\n  Dry run. Re-run with --apply to write.\n')
    return
  }

  // --- write ---------------------------------------------------------------
  const [ng, ca] = await locations()
  console.log(`\n  stock locations: ${ng.name} / ${ca.name}`)

  let stocked = 0
  for (const { product, qty } of targets.values()) {
    const invId = product.variants?.[0]?.inventory_items?.[0]?.inventory_item_id
    if (!invId) { console.log(`    WARN ${product.handle}: no inventory item, skipped`); continue }
    await setStock(invId, ng.id, qty)
    await setStock(invId, ca.id, qty)
    if (product.status !== 'published') {
      await adminFetch(`/admin/products/${product.id}`, {
        method: 'POST',
        body: JSON.stringify({ status: 'published' }),
      })
    }
    stocked++
  }
  console.log(`  stock set on ${stocked} product(s) in both markets`)

  let drafted = 0
  for (const p of toDraft) {
    await adminFetch(`/admin/products/${p.id}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'draft' }),
    })
    drafted++
  }
  console.log(`  moved to draft: ${drafted}`)
  console.log('\n  Done. Run `npm run refresh-storefront` to clear the catalogue cache.\n')
}

main().catch((err) => {
  console.error('\nfailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
