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
 * Prices come from the sheet too, in both currencies. An earlier version of
 * this script skipped them on the claim that the sheet already matched what was
 * live. That was wrong: only the Signature line and the home diffusers matched.
 * The sheet is authoritative for price exactly as it is for stock.
 *
 * The two currencies are independent figures, not one converted into the other.
 * Canadian prices are what the product sells for in Canada; reading them as an
 * exchange rate off the Nigerian price will look wrong and is not a fault.
 */
import { adminFetch, assertWriteAllowed, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'
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

/**
 * Products whose sheet price is not trusted, so price alone is left alone.
 *
 * The Perfume Oils carry CAD 60 — the same figure as a 100ml Number Series
 * perfume, which sells for four and a half times more in Nigeria. Every other
 * row in the sheet implies somewhere between 500 and 1000 naira to the dollar;
 * this one implies 167. It reads as a fill-down from the block above it rather
 * than a decision, and the owner confirmed it is wrong.
 *
 * Stock and status still sync for these. Only the price is held, and only until
 * the sheet carries a figure someone has actually chosen.
 */
const PRICE_HOLD: RegExp[] = [/^oil-no-\d+$/]

const priceHeld = (handle: string) => PRICE_HOLD.some((r) => r.test(handle))

interface Row { name: string; category: string; qty: number; ngn: number; cad: number }

/** "NGN45,000.00" and "$60" both reduce to a number; Medusa stores major units. */
const money = (cell: string | undefined) => Number(String(cell ?? '').replace(/[^\d.]/g, ''))

/** Excel writes CRLF and quotes the NGN price because it contains a comma. */
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
      const [name, category, qty, ngn, cad] = cells
      return {
        name: (name ?? '').trim(),
        category: (category ?? '').trim(),
        qty: Number(qty),
        ngn: money(ngn),
        cad: money(cad),
      }
    })
    .filter((r) => r.name && Number.isFinite(r.qty))
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

interface VariantPrice {
  amount: number
  currency_code: string
  /** Region- or customer-scoped prices carry rules; plain currency prices do not. */
  rules?: Record<string, unknown>
}

interface AdminProduct {
  id: string
  handle: string
  title: string
  status: string
  variants?: {
    id: string
    prices?: VariantPrice[]
    inventory_items?: { inventory_item_id: string }[]
  }[]
}

async function allProducts(): Promise<AdminProduct[]> {
  const out: AdminProduct[] = []
  for (let offset = 0; ; offset += 50) {
    const j = await adminFetch(
      `/admin/products?limit=50&offset=${offset}` +
        `&fields=id,handle,title,status,*variants.inventory_items,*variants.prices`
    )
    const batch: AdminProduct[] = j.products ?? []
    out.push(...batch)
    if (batch.length < 50) break
  }
  return out
}

const priceIn = (p: AdminProduct, currency: string): number | null => {
  const found = (p.variants?.[0]?.prices ?? []).filter((x) => x.currency_code === currency)
  return found.length === 1 ? found[0].amount : null
}

/**
 * Replace a variant's prices with the sheet's two figures.
 *
 * Sending `prices` replaces the whole set, which is what makes this idempotent
 * but also means a scoped price would be destroyed. Any variant carrying one is
 * skipped and reported rather than flattened.
 */
async function setPrices(p: AdminProduct, ngn: number, cad: number): Promise<'ok' | 'scoped'> {
  const variant = p.variants?.[0]
  if (!variant) return 'scoped'
  const scoped = (variant.prices ?? []).some((x) => x.rules && Object.keys(x.rules).length > 0)
  if (scoped) return 'scoped'
  await adminFetch(`/admin/products/${p.id}/variants/${variant.id}`, {
    method: 'POST',
    body: JSON.stringify({
      prices: [
        { amount: ngn, currency_code: 'ngn' },
        { amount: cad, currency_code: 'cad' },
      ],
    }),
  })
  return 'ok'
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
  // Fail before reading the catalogue rather than part-way through writing it.
  if (APPLY) assertWriteAllowed()

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

  const missingCad = rows.filter((r) => !Number.isFinite(r.cad) || r.cad <= 0)
  if (missingCad.length) {
    console.log(`\n  ROWS WITH NO CANADIAN PRICE (${missingCad.length}) — refusing to write:`)
    missingCad.forEach((r) => console.log(`    ${JSON.stringify(r.name)}`))
    console.log('\n  A product live in Canada with no CAD price cannot be bought there.')
    process.exit(1)
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

  // --- price changes -------------------------------------------------------
  const allPriceDiffs = [...targets.values()]
    .map((t) => ({
      t,
      ngnWas: priceIn(t.product, 'ngn'),
      cadWas: priceIn(t.product, 'cad'),
    }))
    .filter((c) => c.ngnWas !== c.t.row.ngn || c.cadWas !== c.t.row.cad)

  const held = allPriceDiffs.filter((c) => priceHeld(c.t.product.handle))
  const priceChanges = allPriceDiffs.filter((c) => !priceHeld(c.t.product.handle))

  console.log(`\n  price changes: ${priceChanges.length} of ${targets.size}`)
  for (const c of priceChanges) {
    const n = c.ngnWas === c.t.row.ngn ? '' : ` NGN ${c.ngnWas ?? '-'} -> ${c.t.row.ngn}`
    const d = c.cadWas === c.t.row.cad ? '' : ` CAD ${c.cadWas ?? '-'} -> ${c.t.row.cad}`
    console.log(`    ${c.t.product.handle.padEnd(28)}${n}${d}`)
  }
  if (held.length) {
    console.log(`\n  price HELD (sheet figure not trusted, see PRICE_HOLD): ${held.length}`)
    console.log(`    keeping NGN ${held[0].ngnWas ?? '-'} / CAD ${held[0].cadWas ?? '-'}, ` +
      `sheet says NGN ${held[0].t.row.ngn} / CAD ${held[0].t.row.cad}`)
    console.log(`    ${held.map((c) => c.t.product.handle).join(', ')}`)
  }

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

  let priced = 0
  const scopedSkips: string[] = []
  for (const c of priceChanges) {
    const result = await setPrices(c.t.product, c.t.row.ngn, c.t.row.cad)
    if (result === 'scoped') scopedSkips.push(c.t.product.handle)
    else priced++
  }
  console.log(`  prices set on ${priced} product(s) in both currencies`)
  if (scopedSkips.length) {
    console.log(`  skipped, carries a scoped price that replacing would destroy: ${scopedSkips.length}`)
    scopedSkips.forEach((h) => console.log(`    ${h}`))
  }

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
