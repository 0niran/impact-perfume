#!/usr/bin/env tsx
/**
 * Adds a CAD price to each priced bespoke config variant so the Canadian
 * bespoke rail shows a live estimate instead of degrading to the quote path.
 *
 * The four bespoke-* products already exist (seeded NGN-only by
 * seed-bespoke-config.ts). This does NOT create anything — it looks up the
 * three priced products by handle, matches variants by their stable SKU, and
 * sets a CAD price on each.
 *
 * Medusa v2 REPLACE gotcha: posting `prices` overwrites the whole array, so a
 * naive CAD-only write would wipe the NGN price. Same as import-cad-prices.ts,
 * this reads the current prices, keeps every non-CAD entry, and re-posts NGN +
 * CAD together. Re-runnable: it overwrites the CAD price and leaves NGN intact.
 *
 * The rates on bespoke-config (deposit %, min qty, discount tiers) are
 * currency-agnostic metadata and already apply to CAD, so this touches only the
 * eight priced variants.
 *
 * Prices are in MAJOR units (Medusa v2 stores 110 for CAD 110); the reader
 * multiplies to MINOR at the app boundary.
 *
 * Dry-run by default (prints the planned change). Apply with:
 *   APPLY=1 npx tsx scripts/seed-bespoke-cad-prices.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const APPLY = process.env.APPLY === '1'

if (!BACKEND) {
  console.error('Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL in .env.local')
  process.exit(1)
}

/** SKU -> CAD price in MAJOR units. Edit here or in the admin afterwards. */
const CAD_BY_SKU: Record<string, number> = {
  'BSPOKE-BASE-50': 65,
  'BSPOKE-BASE-100': 110,
  'BSPOKE-BASE-200': 195,
  'BSPOKE-BOTTLE-GLOSS': 0,
  'BSPOKE-BOTTLE-MATTED': 15,
  'BSPOKE-INSCR-GOLD': 28,
  'BSPOKE-INSCR-SILVER': 25,
  'BSPOKE-INSCR-STICKER': 12,
}

const HANDLES = ['bespoke-base', 'bespoke-bottle', 'bespoke-inscription']

interface Price {
  amount: number
  currency_code: string
}
interface Variant {
  id: string
  sku?: string
  title?: string
  prices?: Price[]
}
async function admin(p: string, options: RequestInit = {}) {
  const res = await fetch(`${BACKEND}${p}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader(),
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function getProduct(handle: string): Promise<{ id: string; variants: Variant[] } | null> {
  const data = await admin(
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id,handle,*variants,*variants.prices`
  )
  const product = data.products?.[0]
  if (!product) return null
  return { id: product.id, variants: product.variants ?? [] }
}

/** Read-keep-append so the NGN price survives the REPLACE write. */
async function setCadPrice(productId: string, v: Variant, cad: number): Promise<'set' | 'unchanged'> {
  const existing = v.prices ?? []
  const currentCad = existing.find((p) => p.currency_code === 'cad')?.amount
  if (currentCad === cad) return 'unchanged'

  const otherPrices = existing
    .filter((p) => p.currency_code !== 'cad')
    .map((p) => ({ amount: p.amount, currency_code: p.currency_code }))
  const newPrices = [...otherPrices, { amount: cad, currency_code: 'cad' }]

  if (!APPLY) return 'set'
  await admin(`/admin/products/${productId}/variants/${v.id}`, {
    method: 'POST',
    body: JSON.stringify({ prices: newPrices }),
  })
  return 'set'
}

async function main() {
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — bespoke CAD prices\n`)

  let set = 0
  let unchanged = 0
  let missing = 0

  for (const handle of HANDLES) {
    const product = await getProduct(handle)
    if (!product) {
      console.log(`  MISSING product ${handle} — run seed-bespoke-config.ts first`)
      missing++
      continue
    }
    for (const v of product.variants) {
      const sku = v.sku ?? ''
      if (!(sku in CAD_BY_SKU)) continue
      const cad = CAD_BY_SKU[sku]
      const ngn = (v.prices ?? []).find((p) => p.currency_code === 'ngn')?.amount ?? '—'
      const result = await setCadPrice(product.id, v, cad)
      if (result === 'unchanged') {
        unchanged++
        console.log(`  ok     ${sku} CAD ${cad} (already set; NGN ${ngn} kept)`)
      } else {
        set++
        console.log(`  ${APPLY ? 'set   ' : 'would '} ${sku} -> CAD ${cad} (NGN ${ngn} kept)`)
      }
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Planned'}: ${set} set, ${unchanged} unchanged, ${missing} missing product(s).`)
  if (!APPLY) console.log('Re-run with APPLY=1 to write the changes.')
}

main().catch((err) => {
  console.error('\nFailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
