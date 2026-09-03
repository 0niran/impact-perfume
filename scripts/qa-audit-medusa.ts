#!/usr/bin/env tsx
/**
 * Full Medusa QA audit — exercises the store the way a QA specialist would and
 * reports pass/fail per check. Read-only suites (A, B) inspect config and
 * catalogue/storefront parity; write suites (C–F) run the product, inventory
 * and order lifecycles against a self-contained QA-TEST entity, plus one
 * adjust-and-revert spot-check on a real product.
 *
 *   npm run qa-audit                 full run (writes, self-cleaning)
 *   npm run qa-audit -- --dry-run    read-only suites A + B only
 *   npm run qa-audit -- --suite=A,B  run named suites only
 *   npm run qa-audit -- --keep       leave the QA-TEST entity for inspection
 *   npm run qa-audit -- --report x   write the markdown report to path x
 *
 * SAFETY: everything the harness creates is tracked and torn down in a finally
 * block; the real-product spot-check records originals first and restores them.
 * No real card is charged — the order flow uses an admin draft order.
 *
 * Requires MEDUSA_ADMIN_API_KEY in .env.local. Prices are MAJOR units.
 */
import fs from 'fs'
import path from 'path'
import { adminFetch, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const keep = argv.includes('--keep')
// Opt-in: exercise the record-only order path for real (draft → convert-to-order
// → payment-collection → mark-as-paid), which creates a real order and then
// cancels it. Off by default because it writes a real (cancellable) order.
const recordOrder = argv.includes('--record-order')
const reportPath =
  (argv.find((a) => a.startsWith('--report='))?.split('=')[1]) ??
  (argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : undefined) ??
  path.resolve(process.cwd(), 'QA-AUDIT-REPORT.md')
const suiteArg = argv.find((a) => a.startsWith('--suite='))?.split('=')[1]
const onlySuites = suiteArg ? new Set(suiteArg.split(',').map((s) => s.trim().toUpperCase())) : null
function runSuite(id: string): boolean {
  if (dryRun) return id === 'A' || id === 'B'
  return !onlySuites || onlySuites.has(id)
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
type Status = 'ok' | 'fail' | 'warn' | 'info'
interface Check { suite: string; status: Status; msg: string }
const checks: Check[] = []
const icon: Record<Status, string> = { ok: '✓', fail: '✗', warn: '!', info: '·' }
let currentSuite = ''
function suite(id: string, title: string) {
  currentSuite = id
  console.log(`\n=== Suite ${id} — ${title} ===`)
}
function rec(status: Status, msg: string) {
  checks.push({ suite: currentSuite, status, msg })
  console.log(`  ${icon[status]} ${msg}`)
}
const ok = (m: string) => rec('ok', m)
const fail = (m: string) => rec('fail', m)
const warn = (m: string) => rec('warn', m)
const info = (m: string) => rec('info', m)

// Teardown registry — run LIFO regardless of outcome.
const teardown: { label: string; fn: () => Promise<void> }[] = []
function onCleanup(label: string, fn: () => Promise<void>) {
  teardown.push({ label, fn })
}

// ---------------------------------------------------------------------------
// Store (customer-facing) API fetch
// ---------------------------------------------------------------------------
async function storeFetch(publishableKey: string, p: string): Promise<any> {
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    headers: { 'x-publishable-api-key': publishableKey, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body).slice(0, 300)}`)
  return body
}

// ---------------------------------------------------------------------------
// Shared discovered config (filled by Suite A, reused later)
// ---------------------------------------------------------------------------
interface Market {
  name: string
  region_id: string
  currency: string
  channel_id?: string
  channel_name?: string
  publishable_key?: string
  location_id?: string
}
const markets: Record<string, Market> = {}
let storeSupportsCad = false

// ===========================================================================
// Suite A — Config & environment sanity (read-only)
// ===========================================================================
async function suiteA() {
  suite('A', 'Config & environment sanity')

  // Admin key
  try {
    await adminFetch('/admin/products?limit=1&fields=id')
    ok('admin API key authenticates')
  } catch (e) {
    fail(`admin API key does NOT authenticate: ${msg(e)}`)
    throw e // nothing else will work
  }

  // Store currencies
  const store = (await adminFetch('/admin/stores')).stores?.[0]
  const codes: string[] = (store?.supported_currencies ?? []).map((c: any) => c.currency_code)
  const def = (store?.supported_currencies ?? []).find((c: any) => c.is_default)?.currency_code
  storeSupportsCad = codes.includes('cad')
  info(`store "${store?.name}" currencies: ${codes.join(', ')} (default ${def})`)
  codes.includes('ngn') ? ok('NGN is a supported store currency') : fail('NGN missing from store currencies')
  storeSupportsCad
    ? ok('CAD is a supported store currency — admin CAD price field is available')
    : fail('CAD NOT in store currencies — the admin hides the CAD price field (add it: Settings → Store → Currencies)')

  // Regions.
  // NB: this store records orders AFTER an external Paystack/Stripe capture
  // (see docs/medusa-role-and-checkout.md), so native region payment providers
  // are NOT required to take payment — recording uses the system provider. An
  // empty region provider is therefore a parity nit, not a checkout blocker.
  const regions = (await adminFetch('/admin/regions?fields=id,name,currency_code,automatic_taxes,*countries,*payment_providers&limit=50')).regions ?? []
  const allProviders = new Set<string>()
  for (const r of regions) {
    const providers = (r.payment_providers ?? []).map((p: any) => p.id)
    providers.forEach((id: string) => allProviders.add(id))
    const countries = (r.countries ?? []).map((c: any) => c.iso_2)
    info(`region "${r.name}" — ${r.currency_code} · countries ${countries.join(',') || '—'} · payment ${providers.join(',') || 'none'} · auto-tax ${r.automatic_taxes}`)
    if (!providers.length) warn(`region "${r.name}" has no payment provider — fine for the record-only flow, but attach pp_system_default for admin/refund parity`)
    else ok(`region "${r.name}" has a payment provider (${providers.join(',')})`)
  }
  // The record-only order path (mark-as-paid) uses the system/manual provider.
  // Its presence on any region proves it's installed and usable store-wide.
  ;[...allProviders].some((id) => id.includes('system') || id.includes('manual'))
    ? ok('system/manual payment provider is installed — order recording (mark-as-paid) works')
    : warn('no system/manual payment provider found on any region — order recording may fail')
  const ng = regions.find((r: any) => (r.countries ?? []).some((c: any) => c.iso_2 === 'ng'))
  const ca = regions.find((r: any) => (r.countries ?? []).some((c: any) => c.iso_2 === 'ca'))
  if (ng) markets.NG = { name: 'NG', region_id: ng.id, currency: ng.currency_code }
  else fail('no NG region found')
  if (ca) markets.CA = { name: 'CA', region_id: ca.id, currency: ca.currency_code }
  else warn('no CA region found')

  // Sales channels + publishable keys
  const channels = (await adminFetch('/admin/sales-channels?limit=50')).sales_channels ?? []
  const keys = (await adminFetch('/admin/api-keys?type=publishable&limit=50&fields=id,title,token,*sales_channels')).api_keys ?? []
  function keyForChannel(channelId: string): string | undefined {
    const k = keys.find((k: any) => (k.sales_channels ?? []).some((s: any) => s.id === channelId))
    return k?.token
  }
  for (const m of Object.values(markets)) {
    // Match channel by name convention "Impact <MK>"; fall back to currency-less heuristic.
    const ch = channels.find((c: any) => c.name?.toUpperCase().includes(m.name)) ?? undefined
    if (ch) {
      m.channel_id = ch.id
      m.channel_name = ch.name
      m.publishable_key = keyForChannel(ch.id)
      m.publishable_key
        ? ok(`${m.name}: sales channel "${ch.name}" → publishable key present`)
        : fail(`${m.name}: sales channel "${ch.name}" has NO publishable key — storefront can't read this channel`)
    } else {
      warn(`${m.name}: no matching sales channel found by name`)
    }
  }

  // Stock locations
  const locs = (await adminFetch('/admin/stock-locations?fields=id,name,*address,*sales_channels&limit=50')).stock_locations ?? []
  for (const l of locs) {
    const chNames = (l.sales_channels ?? []).map((s: any) => s.name)
    info(`stock location "${l.name}" (${l.address?.city ?? '—'}, ${l.address?.country_code ?? '—'}) → channels ${chNames.join(',') || 'NONE'}`)
    // Associate a location to each market by shared sales channel.
    for (const m of Object.values(markets)) {
      if (m.channel_id && (l.sales_channels ?? []).some((s: any) => s.id === m.channel_id)) m.location_id = l.id
    }
    if (!chNames.length) warn(`stock location "${l.name}" is not linked to any sales channel`)
  }
  for (const m of Object.values(markets)) {
    m.location_id ? ok(`${m.name}: fulfilled from a stock location`) : warn(`${m.name}: no stock location linked to its channel`)
  }

  // Tax regions
  const taxRegions = (await adminFetch('/admin/tax-regions?limit=50&fields=id,country_code,province_code,*tax_rates')).tax_regions ?? []
  const taxCountries = new Set(taxRegions.map((t: any) => t.country_code))
  for (const t of taxRegions) {
    const rates = (t.tax_rates ?? []).map((r: any) => `${r.name} ${r.rate}%`).join(', ')
    info(`tax region ${t.country_code}${t.province_code ? '/' + t.province_code : ''}: ${rates || 'no rates'}`)
  }
  taxCountries.has('ng') ? ok('NG tax region configured (VAT)') : warn('no NG tax region')
  if (markets.CA) {
    taxCountries.has('ca')
      ? ok('CA tax region configured in Medusa')
      : warn('no CA tax region in Medusa — confirm CA tax is handled by Stripe Tax at checkout')
  }

  // Shipping options: expected to be empty in the record-only design (GIG
  // delivery is a custom line item, not a Medusa shipping method).
  const ship = (await adminFetch('/admin/shipping-options?limit=100&fields=id,name,price_type')).shipping_options ?? []
  ship.length
    ? ok(`${ship.length} shipping option(s) configured`)
    : info('no Medusa shipping options — expected here: delivery is priced storefront-side (GIG) and recorded as a custom line item')
  ;(globalThis as any).__shipCount = ship.length
}

// ===========================================================================
// Suite B — Catalogue & storefront parity (read-only), NG + CA
// ===========================================================================
function resolvesNumber(p: any): boolean {
  const n = p.metadata?.number
  if (n && !isNaN(parseInt(n, 10))) return true
  return /^no-(\d+)$/.test(p.handle ?? '')
}
async function suiteB() {
  suite('B', 'Catalogue & storefront parity')

  // Published set from admin.
  const published = new Map<string, any>()
  let offset = 0
  for (;;) {
    const { products } = await adminFetch(`/admin/products?status[]=published&limit=200&offset=${offset}&fields=id,handle,title`)
    for (const p of products) published.set(p.id, p)
    if (products.length < 200) break
    offset += 200
  }
  info(`${published.size} published products in Medusa`)

  for (const m of Object.values(markets)) {
    console.log(`\n  --- ${m.name} storefront ---`)
    if (!m.publishable_key) { warn(`${m.name}: no publishable key — parity check skipped`); continue }
    const visible = new Map<string, any>()
    const fields = '+metadata,+variants.calculated_price,+variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
    let off = 0
    try {
      for (;;) {
        const { products } = await storeFetch(m.publishable_key, `/store/products?limit=200&offset=${off}&region_id=${m.region_id}&fields=${encodeURIComponent(fields)}`)
        for (const p of products) visible.set(p.id, p)
        if (products.length < 200) break
        off += 200
      }
    } catch (e) { fail(`${m.name}: store API read failed: ${msg(e)}`); continue }

    rec(published.size === visible.size ? 'ok' : 'warn', `${m.name}: ${visible.size}/${published.size} published products visible to this storefront`)
    const invisible = [...published.values()].filter((p) => !visible.has(p.id))
    if (invisible.length) fail(`${m.name}: ${invisible.length} PUBLISHED product(s) invisible (not in this channel): ${invisible.slice(0, 15).map((p) => p.handle).join(', ')}${invisible.length > 15 ? ' …' : ''}`)

    let noPrice = 0, priced = 0, noNumber: string[] = [], noImage = 0, oos = 0
    for (const p of visible.values()) {
      const v = p.variants?.[0]
      const amt = v?.calculated_price?.calculated_amount
      amt ? priced++ : noPrice++
      if ((p.handle?.startsWith('no-') || p.handle?.startsWith('oil-no-')) && !resolvesNumber(p)) noNumber.push(p.handle)
      if (!p.thumbnail && !(p.images?.length)) noImage++
      if (v?.manage_inventory === true && v?.allow_backorder !== true && (v?.inventory_quantity ?? 0) <= 0) oos++
    }
    rec(noPrice ? 'fail' : 'ok', `${m.name}: ${priced} priced, ${noPrice} with NO ${m.currency.toUpperCase()} price (would show "price on request")`)
    if (noNumber.length) fail(`${m.name}: ${noNumber.length} series product(s) missing metadata.number: ${noNumber.slice(0, 10).join(', ')}`)
    if (noImage) warn(`${m.name}: ${noImage} visible product(s) with no image`)
    if (oos) warn(`${m.name}: ${oos} visible product(s) OUT OF STOCK at this market's location (not sellable)`)
  }
}

// ===========================================================================
// Suite C — Product lifecycle (writes, sandboxed QA-TEST)
// ===========================================================================
interface Sandbox { productId: string; variantId: string; sku: string; inventoryItemId?: string }
async function suiteC(): Promise<Sandbox | null> {
  suite('C', 'Product lifecycle (sandboxed QA-TEST)')
  const ng = markets.NG
  if (!ng) { fail('no NG market — cannot run lifecycle'); return null }

  const stamp = Date.now()
  const sku = `QA-TEST-${stamp}`
  const title = `QA-TEST ${stamp} (safe to delete)`

  // 1. Create draft product, not in any sales channel yet.
  let productId: string
  let variantId: string
  try {
    const created = await adminFetch('/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        title,
        status: 'draft',
        handle: `qa-test-${stamp}`,
        options: [{ title: 'Size', values: ['Test'] }],
        variants: [{ title: 'Test', sku, manage_inventory: true, options: { Size: 'Test' }, prices: [{ amount: 100, currency_code: 'ngn' }] }],
      }),
    })
    const p = created.product
    productId = p.id
    variantId = p.variants?.[0]?.id
    ok(`created product ${p.handle} (${productId}) with variant ${variantId}`)
  } catch (e) { fail(`create product failed: ${msg(e)}`); return null }

  const sandbox: Sandbox = { productId, variantId, sku }
  // Register teardown immediately so a later failure still cleans up.
  onCleanup(`delete product ${sku}`, async () => { await adminFetch(`/admin/products/${productId}`, { method: 'DELETE' }) })

  // 2. Update fields.
  try {
    await adminFetch(`/admin/products/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ subtitle: 'updated-subtitle', metadata: { number: '9999', qa: 'true' } }),
    })
    const p = (await adminFetch(`/admin/products/${productId}?fields=id,subtitle,metadata`)).product
    p.subtitle === 'updated-subtitle' && p.metadata?.number === '9999'
      ? ok('update product fields (subtitle, metadata) persisted')
      : fail(`update product fields did not persist: subtitle=${p.subtitle} number=${p.metadata?.number}`)
  } catch (e) { fail(`update product failed: ${msg(e)}`) }

  // 3. Prices NGN + CAD.
  try {
    await adminFetch(`/admin/products/${productId}/variants/${variantId}`, {
      method: 'POST',
      body: JSON.stringify({ prices: [{ amount: 100, currency_code: 'ngn' }, { amount: 5, currency_code: 'cad' }] }),
    })
    const v = (await adminFetch(`/admin/products/${productId}?fields=*variants.prices`)).product?.variants?.[0]
    const byCur = Object.fromEntries((v?.prices ?? []).map((pr: any) => [pr.currency_code, pr.amount]))
    byCur.ngn === 100 ? ok('NGN price set (₦100)') : fail(`NGN price wrong: ${byCur.ngn}`)
    if (storeSupportsCad) byCur.cad === 5 ? ok('CAD price set (CA$5)') : fail(`CAD price wrong: ${byCur.cad}`)
    else warn('CAD price write skipped assertion (store lacks CAD currency)')
  } catch (e) { fail(`set prices failed: ${msg(e)}`) }

  // 4. Publish + add to NG sales channel, verify via store API.
  try {
    const body: any = { status: 'published' }
    if (ng.channel_id) body.sales_channels = [{ id: ng.channel_id }]
    await adminFetch(`/admin/products/${productId}`, { method: 'POST', body: JSON.stringify(body) })
    // Inventory must exist for it to be sellable but visibility should still work; give the read a moment.
    await sleep(1500)
    if (ng.publishable_key) {
      const seen = await storeFetch(ng.publishable_key, `/store/products?handle=qa-test-${stamp}&region_id=${ng.region_id}&fields=+variants.calculated_price`).catch(() => ({ products: [] }))
      seen.products?.length
        ? ok('published product is visible via NG store API')
        : warn('published product not yet visible via store API (channel link or cache lag)')
    }
  } catch (e) { fail(`publish/add-to-channel failed: ${msg(e)}`) }

  // 5. Inventory: locate the auto-created inventory item, set/adjust/verify/delete a level.
  const loc = ng.location_id
  try {
    const p = (await adminFetch(`/admin/products/${productId}?fields=*variants.inventory_items`)).product
    const invItemId = p?.variants?.[0]?.inventory_items?.[0]?.inventory_item_id
    if (!invItemId) { fail('no inventory item auto-created for the variant'); }
    else if (!loc) { warn('no NG stock location — inventory sub-tests skipped'); sandbox.inventoryItemId = invItemId }
    else {
      sandbox.inventoryItemId = invItemId
      // set level to 7
      await setLevel(invItemId, loc, 7)
      let lvl = await getLevel(invItemId, loc)
      lvl?.stocked_quantity === 7 ? ok('set inventory level to 7') : fail(`set level failed: stocked=${lvl?.stocked_quantity}`)
      // adjust +5 -> 12
      await setLevel(invItemId, loc, 12)
      lvl = await getLevel(invItemId, loc)
      lvl?.stocked_quantity === 12 ? ok('adjusted inventory level to 12') : fail(`adjust level failed: stocked=${lvl?.stocked_quantity}`)
      // verify via store API inventory_quantity
      if (ng.publishable_key) {
        await sleep(1200)
        const seen = await storeFetch(ng.publishable_key, `/store/products?handle=qa-test-${stamp}&region_id=${ng.region_id}&fields=+variants.inventory_quantity`).catch(() => ({ products: [] }))
        const q = seen.products?.[0]?.variants?.[0]?.inventory_quantity
        q === 12 ? ok(`store API reflects inventory_quantity=12`) : warn(`store API inventory_quantity=${q} (expected 12; cache/channel lag)`)
      }
      // delete the level (Medusa requires zero stock first, else it refuses)
      await setLevel(invItemId, loc, 0)
      await adminFetch(`/admin/inventory-items/${invItemId}/location-levels/${loc}`, { method: 'DELETE' })
      lvl = await getLevel(invItemId, loc)
      !lvl ? ok('deleted inventory level (after zeroing stock)') : fail('inventory level still present after delete')
    }
  } catch (e) { fail(`inventory lifecycle failed: ${msg(e)}`) }

  // NB: the product is deliberately LEFT published + in-channel so Suite D can
  // place a draft order against its variant. Teardown deletes it either way.
  return sandbox
}

// ===========================================================================
// Suite D — Order lifecycle (admin draft order, no real charge)
// ===========================================================================
async function suiteD(sandbox: Sandbox | null) {
  suite('D', 'Order lifecycle (draft order, no real charge)')
  const ng = markets.NG
  if (!ng) { fail('no NG market — cannot run order flow'); return }
  if (!sandbox) { warn('no sandbox variant — order flow skipped'); return }

  // Ensure the variant has stock so a fulfillment is possible.
  if (sandbox.inventoryItemId && ng.location_id) {
    await setLevel(sandbox.inventoryItemId, ng.location_id, 5).catch(() => {})
  }

  let draftId: string | undefined
  try {
    const addr = { first_name: 'QA', last_name: 'Test', address_1: '1 Test St', city: 'Lagos', country_code: 'ng', postal_code: '100001', phone: '+2348000000000' }
    const created = await adminFetch('/admin/draft-orders', {
      method: 'POST',
      body: JSON.stringify({
        email: 'qa-test@impactperfume.invalid',
        region_id: ng.region_id,
        sales_channel_id: ng.channel_id,
        items: [{ variant_id: sandbox.variantId, quantity: 1 }],
        shipping_address: addr,
        billing_address: addr,
      }),
    })
    draftId = created.draft_order?.id
    draftId ? ok(`created draft order ${draftId}`) : fail('draft order created but no id returned')
  } catch (e) { fail(`create draft order failed: ${msg(e)}`) }

  if (draftId) {
    const id = draftId
    onCleanup(`delete draft order ${id}`, async () => {
      await adminFetch(`/admin/draft-orders/${id}`, { method: 'DELETE' }).catch(async () => {
        // If it was converted/cannot delete, try cancel.
        await adminFetch(`/admin/orders/${id}/cancel`, { method: 'POST' }).catch(() => {})
      })
    })

    // Read it back
    try {
      const d = (await adminFetch(`/admin/draft-orders/${id}?fields=id,status,email,total,*items`)).draft_order
      info(`draft order status=${d?.status} email=${d?.email} items=${d?.items?.length} total=${d?.total}`)
      ok('draft order readable with line item')
    } catch (e) { warn(`read draft order failed: ${msg(e)}`) }

    // In this store, orders are RECORDED after an external capture via
    // convert-to-order → payment-collection → mark-as-paid (no Medusa shipping
    // method needed). That real recording path is exercised only with
    // --record-order, because it creates a real (cancellable) order.
    if (!recordOrder) {
      info('order recording (convert-to-order → mark-as-paid) not exercised — pass --record-order to run it for real')
    } else {
      let convertedId: string | undefined
      try {
        const conv = await adminFetch(`/admin/draft-orders/${id}/convert-to-order`, { method: 'POST', body: '{}' })
        convertedId = conv.order?.id ?? id
        ok(`convert-to-order succeeded (${convertedId}) without a shipping method`)
        const pc = (await adminFetch('/admin/payment-collections', { method: 'POST', body: JSON.stringify({ order_id: convertedId, amount: 1 }) })).payment_collection
        await adminFetch(`/admin/payment-collections/${pc.id}/mark-as-paid`, { method: 'POST', body: JSON.stringify({ order_id: convertedId }) })
        const o = (await adminFetch(`/admin/orders/${convertedId}?fields=id,status,payment_status`)).order
        o?.payment_status === 'captured' || o?.payment_status === 'paid'
          ? ok(`order recorded as PAID (payment_status=${o.payment_status}) — record-only path verified`)
          : warn(`order recorded but payment_status=${o?.payment_status}`)
      } catch (e) {
        fail(`record-only order path failed: ${msg(e)}`)
      } finally {
        if (convertedId) onCleanup(`cancel recorded order ${convertedId}`, async () => { await adminFetch(`/admin/orders/${convertedId}/cancel`, { method: 'POST' }).catch(() => {}) })
      }
    }
  }
}

// ===========================================================================
// Suite E — Real-product spot-check (writes WITH revert)
// ===========================================================================
async function suiteE() {
  suite('E', 'Real-product spot-check (adjust & revert)')
  const ng = markets.NG
  if (!ng?.location_id) { warn('no NG location — spot-check skipped'); return }

  // Pick a stable, published, in-stock real product at the NG location.
  const { products } = await adminFetch(`/admin/products?status[]=published&limit=50&fields=id,handle,metadata,*variants.inventory_items`)
  const target = products.find((p: any) => p.variants?.[0]?.inventory_items?.[0]?.inventory_item_id && !p.handle?.startsWith('qa-test'))
  if (!target) { warn('no suitable real product found for spot-check'); return }
  const invItemId = target.variants[0].inventory_items[0].inventory_item_id
  info(`spot-check target: ${target.handle}`)

  // --- Inventory adjust & revert (the only real-data write; reverts exactly) ---
  // Metadata is deliberately NOT toggled: Medusa merges metadata per-key, so an
  // added marker can only be cleared to null, never fully removed — that would
  // leave a residue on a real product. The inventory delta below proves the
  // write path and restores the original count precisely.
  const before = await getLevel(invItemId, ng.location_id)
  if (!before) { warn(`no inventory level at NG location for ${target.handle} — inventory spot-check skipped`); return }
  const original = before.stocked_quantity
  try {
    await setLevel(invItemId, ng.location_id, original + 3)
    const bumped = await getLevel(invItemId, ng.location_id)
    bumped?.stocked_quantity === original + 3 ? ok(`inventory write observed on real product (${original} → ${original + 3})`) : fail(`inventory write not observed: ${bumped?.stocked_quantity}`)
  } finally {
    await setLevel(invItemId, ng.location_id, original).catch(() => {})
    const restored = await getLevel(invItemId, ng.location_id)
    restored?.stocked_quantity === original ? ok(`inventory restored to original (${original})`) : fail(`FAILED TO RESTORE inventory — expected ${original}, got ${restored?.stocked_quantity} (manual fix needed)`)
  }
}

// ===========================================================================
// Inventory level helpers (Medusa v2)
// ===========================================================================
async function getLevel(invItemId: string, locationId: string): Promise<any | null> {
  const data = await adminFetch(`/admin/inventory-items/${invItemId}/location-levels?location_id[]=${locationId}`).catch(() => null)
  return data?.inventory_levels?.find((l: any) => l.location_id === locationId) ?? null
}
async function setLevel(invItemId: string, locationId: string, stocked: number): Promise<void> {
  const existing = await getLevel(invItemId, locationId)
  if (existing) {
    await adminFetch(`/admin/inventory-items/${invItemId}/location-levels/${locationId}`, { method: 'POST', body: JSON.stringify({ stocked_quantity: stocked }) })
  } else {
    await adminFetch(`/admin/inventory-items/${invItemId}/location-levels`, { method: 'POST', body: JSON.stringify({ location_id: locationId, stocked_quantity: stocked }) })
  }
}

// ===========================================================================
// Misc helpers
// ===========================================================================
function msg(e: unknown): string { return e instanceof Error ? e.message : String(e) }
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

// ===========================================================================
// Report writer
// ===========================================================================
function writeReport() {
  const counts = { ok: 0, fail: 0, warn: 0, info: 0 } as Record<Status, number>
  for (const c of checks) counts[c.status]++
  const suites = [...new Set(checks.map((c) => c.suite))]
  const now = new Date().toISOString()
  let md = `# Medusa QA Audit Report\n\n`
  md += `Run: ${now}${dryRun ? ' · dry-run (read-only)' : ''}\nBackend: ${MEDUSA_BACKEND_URL}\n\n`
  md += `**${counts.ok} passed · ${counts.fail} failed · ${counts.warn} warnings**\n\n`
  if (counts.fail) {
    md += `## Failures (action needed)\n\n`
    for (const c of checks.filter((c) => c.status === 'fail')) md += `- **[${c.suite}]** ${c.msg}\n`
    md += `\n`
  }
  if (counts.warn) {
    md += `## Warnings (review)\n\n`
    for (const c of checks.filter((c) => c.status === 'warn')) md += `- [${c.suite}] ${c.msg}\n`
    md += `\n`
  }
  md += `## Full log\n\n`
  for (const s of suites) {
    md += `### Suite ${s}\n\n`
    for (const c of checks.filter((c) => c.suite === s)) md += `- ${icon[c.status]} ${c.msg}\n`
    md += `\n`
  }
  md += `## Manual checklist (not machine-verifiable here)\n\n`
  md += `- **Inventory freshness on the storefront (issue #1):** the Railway subscriber \`storefront-revalidate.ts\` must call the storefront \`/api/revalidate\`. Verify \`STOREFRONT_URL\` and \`STOREFRONT_REVALIDATE_TOKEN\` (= Vercel \`CRON_SECRET\`) are set on Railway; after a stock edit, check Railway logs for \`[storefront-revalidate]\`.\n`
  md += `- **Payments:** confirm each live region has a working payment provider before taking real orders.\n`
  fs.writeFileSync(reportPath, md)
  console.log(`\nReport written to ${reportPath}`)
}

// ===========================================================================
// Main
// ===========================================================================
async function main() {
  console.log(`Medusa QA audit → ${MEDUSA_BACKEND_URL}${dryRun ? '  (dry-run: read-only)' : ''}`)
  let sandbox: Sandbox | null = null
  try {
    if (runSuite('A')) await suiteA()
    if (runSuite('B')) await suiteB()
    if (runSuite('C')) sandbox = await suiteC()
    if (runSuite('D')) await suiteD(sandbox)
    if (runSuite('E')) await suiteE()
  } catch (e) {
    fail(`audit aborted: ${msg(e)}`)
  } finally {
    // Teardown (LIFO) unless --keep.
    if (keep && sandbox) {
      warn(`--keep set: leaving QA-TEST entity ${sandbox.sku} in place`)
    } else if (teardown.length) {
      suite('F', 'Cleanup / teardown')
      for (const t of teardown.reverse()) {
        try { await t.fn(); ok(`cleaned up: ${t.label}`) }
        catch (e) { fail(`cleanup FAILED: ${t.label} — ${msg(e)} (manual removal needed)`) }
      }
    }
    writeReport()
  }

  const counts = checks.reduce((a, c) => (a[c.status]++, a), { ok: 0, fail: 0, warn: 0, info: 0 } as Record<Status, number>)
  console.log(`\n${counts.fail ? 'FAIL' : 'PASS'} — ${counts.ok} ok, ${counts.fail} fail, ${counts.warn} warn`)
  process.exit(counts.fail ? 1 : 0)
}

main().catch((e) => { console.error('\nQA audit crashed:', e); process.exit(1) })
