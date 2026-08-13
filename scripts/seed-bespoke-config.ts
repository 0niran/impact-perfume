#!/usr/bin/env tsx
/**
 * Seeds the four draft Medusa products that drive bespoke pricing so every
 * price and rate is editable in the admin (nothing hardcoded in the app):
 *
 *   bespoke-base         base price per volume (50/100/200ml)
 *   bespoke-bottle       bottle-type surcharge (Gloss / Matted)
 *   bespoke-inscription  inscription surcharge (Gold / Silver / Rain sticker)
 *   bespoke-config       business rates, in product metadata
 *
 * All products are created as status='draft' and in NO sales channel, so they
 * never appear on the storefront. Variants are keyed by a stable SKU that the
 * reader (src/lib/bespokeConfig.ts) matches on.
 *
 * Idempotent and non-destructive: if a product handle already exists it is
 * SKIPPED, so re-running never clobbers prices the owner has since edited in
 * the admin. Delete a product in the admin to reseed it.
 *
 * Prices are in MAJOR units here (Medusa v2 stores 48000 for NGN 48,000); the
 * reader multiplies to MINOR at the app boundary.
 *
 *   npx tsx scripts/seed-bespoke-config.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!BACKEND || !EMAIL || !PASSWORD) {
  console.error('Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL / MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD in .env.local')
  process.exit(1)
}

interface VariantSeed {
  title: string
  sku: string
  amount: number // NGN, MAJOR units
}

interface ProductSeed {
  title: string
  handle: string
  optionTitle: string
  variants: VariantSeed[]
  metadata?: Record<string, string>
}

// Starting values. Base collapses the old 80,000/100ml x volume multiplier into
// absolute prices (0.6 / 1 / 1.8). Owner edits any of these in the admin.
const PRODUCTS: ProductSeed[] = [
  {
    title: 'Bespoke - Base (do not delete)',
    handle: 'bespoke-base',
    optionTitle: 'Volume',
    variants: [
      { title: '50ml', sku: 'BSPOKE-BASE-50', amount: 48000 },
      { title: '100ml', sku: 'BSPOKE-BASE-100', amount: 80000 },
      { title: '200ml', sku: 'BSPOKE-BASE-200', amount: 144000 },
    ],
  },
  {
    title: 'Bespoke - Bottle Type (do not delete)',
    handle: 'bespoke-bottle',
    optionTitle: 'Bottle Type',
    variants: [
      { title: 'Gloss Perfume Bottle', sku: 'BSPOKE-BOTTLE-GLOSS', amount: 0 },
      { title: 'Matted Perfume Bottle', sku: 'BSPOKE-BOTTLE-MATTED', amount: 10000 },
    ],
  },
  {
    title: 'Bespoke - Inscription (do not delete)',
    handle: 'bespoke-inscription',
    optionTitle: 'Inscription',
    variants: [
      { title: 'Gold foil embossed', sku: 'BSPOKE-INSCR-GOLD', amount: 20000 },
      { title: 'Silver foil embossed', sku: 'BSPOKE-INSCR-SILVER', amount: 18000 },
      { title: 'Rain Sticker Branded', sku: 'BSPOKE-INSCR-STICKER', amount: 8000 },
    ],
  },
  {
    title: 'Bespoke - Rates (do not delete)',
    handle: 'bespoke-config',
    optionTitle: 'Config',
    variants: [{ title: 'Rates', sku: 'BSPOKE-CONFIG', amount: 0 }],
    metadata: {
      deposit_pct: '50',
      quote_min_qty: '50',
      discount_tier1_min: '5',
      discount_tier1_pct: '5',
      discount_tier2_min: '12',
      discount_tier2_pct: '10',
    },
  },
]

async function login(): Promise<string> {
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
  const { token } = await res.json()
  if (!token) throw new Error('Admin login returned no token')
  return token
}

async function productExists(token: string, handle: string): Promise<boolean> {
  const res = await fetch(
    `${BACKEND}/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id,handle`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Lookup failed for ${handle}: ${res.status}`)
  const json = (await res.json()) as { products?: unknown[] }
  return (json.products?.length ?? 0) > 0
}

async function createProduct(token: string, seed: ProductSeed): Promise<void> {
  const body = {
    title: seed.title,
    handle: seed.handle,
    status: 'draft',
    // No sales_channels -> invisible to the storefront store API.
    options: [{ title: seed.optionTitle, values: seed.variants.map((v) => v.title) }],
    variants: seed.variants.map((v) => ({
      title: v.title,
      sku: v.sku,
      manage_inventory: false,
      options: { [seed.optionTitle]: v.title },
      prices: [{ currency_code: 'ngn', amount: v.amount }],
    })),
    ...(seed.metadata ? { metadata: seed.metadata } : {}),
  }
  const res = await fetch(`${BACKEND}/admin/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Create failed for ${seed.handle}: ${res.status} ${await res.text().catch(() => '')}`)
  }
}

async function main() {
  const token = await login()
  console.log('Authenticated. Seeding bespoke config products...\n')
  for (const seed of PRODUCTS) {
    if (await productExists(token, seed.handle)) {
      console.log(`  skip   ${seed.handle} (already exists, not overwriting)`)
      continue
    }
    await createProduct(token, seed)
    console.log(`  create ${seed.handle} (${seed.variants.length} variant${seed.variants.length === 1 ? '' : 's'})`)
  }
  console.log('\nDone. Edit prices/rates under Products in the Medusa admin.')
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
