#!/usr/bin/env tsx
/**
 * One-shot Canada launch script:
 *
 *   1. Creates (or reuses) a Canada region in Medusa with CAD currency.
 *   2. Walks every Number Series + Oil product and adds a CAD price to
 *      the first variant. Conversion rate is parameterised; default
 *      treats CAD ~= NGN × 0.0011 (so ₦50,000 → ~CAD $55).
 *   3. Prints the new region_id at the end — drop it into
 *      NEXT_PUBLIC_MEDUSA_REGION_ID_CA on Vercel + .env.local.
 *
 * Idempotent: re-running won't duplicate the region or stack CAD prices,
 * it merges by currency_code.
 *
 * Run: npm run setup-ca
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

// Conversion: 1 NGN ≈ 0.0011 CAD. Both currencies use 2 decimals → smallest-unit
// math is identical (kobo × rate = cents). Override with the CAD_RATE env var.
const CAD_RATE = parseFloat(process.env.CAD_RATE ?? '0.0011')

let _token: string | null = null
async function getToken(): Promise<string> {
  return adminAuthHeader()
}

async function admin(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
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

interface MedusaRegion {
  id: string
  name: string
  currency_code: string
  countries?: { iso_2: string }[]
}

async function findRegionByName(name: string): Promise<MedusaRegion | null> {
  const data = await admin('/admin/regions?limit=100')
  const regions: MedusaRegion[] = data.regions ?? []
  return regions.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? null
}

async function ensureCanadaRegion(): Promise<MedusaRegion> {
  const existing = await findRegionByName('Canada')
  if (existing) {
    console.log(`  ✓ Canada region exists: ${existing.id}`)
    return existing
  }

  console.log('  → Creating Canada region…')
  const created = await admin('/admin/regions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Canada',
      currency_code: 'cad',
      countries: ['ca'],
      automatic_taxes: true,
    }),
  })
  const region = created.region as MedusaRegion
  console.log(`  ✓ Created region: ${region.id}`)
  return region
}

interface MedusaPrice {
  id?: string
  amount: number
  currency_code: string
  region_id?: string
}

interface MedusaVariant {
  id: string
  title: string
  prices?: MedusaPrice[]
}

interface MedusaProduct {
  id: string
  handle: string
  title: string
  variants?: MedusaVariant[]
}

async function listProductsByCategoryHandle(handle: string): Promise<MedusaProduct[]> {
  const cat = await admin(`/admin/product-categories?handle=${handle}&limit=1`)
  const categoryId = cat.product_categories?.[0]?.id
  if (!categoryId) return []
  const data = await admin(`/admin/products?category_id[]=${categoryId}&limit=200&fields=*variants,*variants.prices`)
  return (data.products ?? []) as MedusaProduct[]
}

async function setCadPriceOnVariant(variantId: string, productId: string, ngnAmount: number) {
  const cadAmount = Math.round(ngnAmount * CAD_RATE)
  if (cadAmount <= 0) return
  // Refresh the variant's prices array, replacing any existing CAD entry
  const data = await admin(`/admin/products/${productId}?fields=*variants,*variants.prices`)
  const product = data.product as MedusaProduct
  const variant = product.variants?.find((v) => v.id === variantId)
  if (!variant) return
  const otherPrices = (variant.prices ?? []).filter((p) => p.currency_code !== 'cad')
  const newPrices = [
    ...otherPrices.map((p) => ({ amount: p.amount, currency_code: p.currency_code })),
    { amount: cadAmount, currency_code: 'cad' },
  ]
  await admin(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'POST',
    body: JSON.stringify({ prices: newPrices }),
  })
}

async function priceProductsForCanada(products: MedusaProduct[], label: string) {
  console.log(`\n  ${label} (${products.length} products)`)
  let updated = 0
  let skipped = 0
  let failed = 0
  for (const p of products) {
    const variant = p.variants?.[0]
    if (!variant) { skipped++; continue }
    const ngn = (variant.prices ?? []).find((pr) => pr.currency_code === 'ngn')
    if (!ngn) { skipped++; continue }
    try {
      await setCadPriceOnVariant(variant.id, p.id, ngn.amount)
      updated++
      process.stdout.write('.')
    } catch (err) {
      failed++
      process.stdout.write('x')
      console.error(`\n    failed ${p.handle}: ${err instanceof Error ? err.message : err}`)
    }
  }
  console.log(`\n  ${label}: ${updated} updated, ${skipped} skipped, ${failed} failed`)
}

async function main() {
  console.log('Impact Perfumes — Canada Launch Setup')
  console.log('=====================================\n')
  console.log(`Backend:    ${MEDUSA_BACKEND_URL}`)
  console.log(`NGN → CAD:  × ${CAD_RATE} (override with CAD_RATE env var)\n`)

  const region = await ensureCanadaRegion()

  const [numbers, oils, signature] = await Promise.all([
    listProductsByCategoryHandle('number-collection'),
    listProductsByCategoryHandle('oils'),
    listProductsByCategoryHandle('signature'),
  ])

  await priceProductsForCanada(numbers, 'Number Series')
  await priceProductsForCanada(oils, 'Oils')
  await priceProductsForCanada(signature, 'Signature')

  console.log('\n────────────────────────────────────────')
  console.log(`Canada region ID: ${region.id}`)
  console.log('────────────────────────────────────────')
  console.log('\nNext steps:')
  console.log(`  1. Add to .env.local and Vercel env vars:`)
  console.log(`     NEXT_PUBLIC_MEDUSA_REGION_ID_CA=${region.id}`)
  console.log(`  2. Tune CAD prices in Medusa admin if the placeholder rate is off.`)
  console.log(`  3. Build the Stripe Payment Element in checkout, then flip`)
  console.log(`     CA.checkoutEnabled = true in src/lib/region.ts.\n`)
}

main().catch((err) => {
  console.error('\nSetup failed:', err)
  process.exit(1)
})
