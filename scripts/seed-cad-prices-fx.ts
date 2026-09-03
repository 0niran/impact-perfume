#!/usr/bin/env tsx
/**
 * Bulk-set a CAD price on every product variant by converting its NGN price at
 * a fixed exchange rate. Intended for test/staging pricing while Canada is
 * being trialled — replace individual amounts with real pricing later.
 *
 *   CAD_major = round(NGN_major / NGN_PER_CAD)      (nearest whole dollar, min 1)
 *
 * The NGN price stays untouched. Any existing CAD price is overwritten. Stray
 * zero-amount prices in other currencies (e.g. a leftover eur: 0) are dropped.
 * Re-runnable and idempotent for a given rate.
 *
 * Rate — how many naira equal 1 CAD. Override the default with NGN_PER_CAD:
 *   NGN_PER_CAD=1180 npm run seed-cad-fx
 * Preview the conversions without writing anything:
 *   npm run seed-cad-fx -- --dry-run
 *
 * Requires MEDUSA_ADMIN_API_KEY in .env.local. Add CAD to the store's
 * supported currencies first (Admin -> Settings -> Store -> Currencies) so the
 * amounts also show up as editable in the admin UI.
 */

import { adminFetch } from './lib/medusaAdmin'

// Approximate NGN per 1 CAD. Pass the day's rate via NGN_PER_CAD for accuracy.
const DEFAULT_NGN_PER_CAD = 1200

const rate = Number(process.env.NGN_PER_CAD ?? DEFAULT_NGN_PER_CAD)
const dryRun = process.argv.includes('--dry-run')

// The bespoke configurator's CAD prices are hand-tuned config, not catalogue
// items — leave them to scripts/seed-bespoke-cad-prices.ts, never overwrite
// them with a blunt FX conversion.
const EXCLUDE_PREFIXES = ['bespoke-']
function isExcluded(handle: string): boolean {
  return EXCLUDE_PREFIXES.some((prefix) => handle.startsWith(prefix))
}

interface Price {
  amount: number
  currency_code: string
}
interface Variant {
  id: string
  prices?: Price[]
}
interface Product {
  id: string
  handle: string
  variants?: Variant[]
}

/** Nearest whole CAD dollar, never below 1. */
function toCad(ngnMajor: number): number {
  return Math.max(1, Math.round(ngnMajor / rate))
}

async function allProducts(): Promise<Product[]> {
  const out: Product[] = []
  let offset = 0
  while (true) {
    const data = await adminFetch(
      `/admin/products?limit=100&offset=${offset}&fields=id,handle,*variants,*variants.prices`
    )
    const products: Product[] = data.products ?? []
    out.push(...products)
    if (products.length < 100) break
    offset += 100
  }
  return out
}

async function setCadPrice(
  productId: string,
  variantId: string,
  cadMajor: number,
  existing: Price[]
): Promise<void> {
  // Preserve real non-CAD prices (NGN, etc.); drop the CAD we're replacing and
  // any junk zero-amount lines. Medusa v2 REPLACES the whole prices array.
  const kept = existing
    .filter((p) => p.currency_code !== 'cad' && p.amount > 0)
    .map((p) => ({ amount: p.amount, currency_code: p.currency_code }))
  const prices = [...kept, { amount: cadMajor, currency_code: 'cad' }]
  await adminFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'POST',
    body: JSON.stringify({ prices }),
  })
}

async function main() {
  if (!isFinite(rate) || rate <= 0) {
    console.error(
      `Invalid NGN_PER_CAD "${process.env.NGN_PER_CAD}". Pass a positive number of naira per 1 CAD.`
    )
    process.exit(1)
  }

  console.log(
    `Rate: ${rate} NGN = 1 CAD${dryRun ? '   (dry run — nothing will be written)' : ''}\n`
  )

  const products = await allProducts()
  console.log(`Scanning ${products.length} products…\n`)

  let updated = 0
  let skipped = 0
  let excluded = 0
  let failed = 0

  for (const p of products) {
    if (isExcluded(p.handle)) {
      excluded += (p.variants ?? []).length
      continue
    }
    for (const v of p.variants ?? []) {
      const prices = v.prices ?? []
      const ngn = prices.find((x) => x.currency_code === 'ngn')
      if (!ngn || !(ngn.amount > 0)) {
        skipped++
        continue
      }
      const cad = toCad(ngn.amount)
      const wasCad = prices.find((x) => x.currency_code === 'cad')?.amount

      if (dryRun) {
        const was = wasCad != null ? `  (was CA$${wasCad})` : ''
        console.log(`  ${p.handle.padEnd(28)} ₦${ngn.amount} -> CA$${cad}${was}`)
        updated++
        continue
      }

      try {
        await setCadPrice(p.id, v.id, cad, prices)
        process.stdout.write('.')
        updated++
      } catch (err) {
        process.stdout.write('x')
        console.error(
          `\n  ${p.handle} (${v.id}) failed: ${err instanceof Error ? err.message : err}`
        )
        failed++
      }
    }
  }

  console.log(
    `\n\nDone. ${dryRun ? 'Would update' : 'Updated'} ${updated}, ` +
      `skipped ${skipped} (no NGN price), excluded ${excluded} (bespoke config), failed ${failed}.`
  )
}

main().catch((err) => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
