#!/usr/bin/env tsx
/**
 * One-shot migration: Medusa v2 stores prices in MAJOR units (₦50,000 → 50000,
 * CAD $65 → 65), but the original seed wrote MINOR units (₦50,000 → 5,000,000
 * kobo). Divide every existing variant price by 100 so the admin and order
 * subtotals reflect the real amounts.
 *
 * Safety:
 *   - Dry-run by default. Prints intended changes and exits.
 *   - Pass --apply to mutate.
 *   - Idempotency guard: if any NGN amount is already < 1000 OR a CAD amount
 *     is already < 100, the script assumes prices are already in major units
 *     and aborts before touching anything.
 *
 * Usage:
 *   npm run migrate-prices                 # dry-run
 *   npm run migrate-prices -- --apply      # for real
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

const APPLY = process.argv.includes('--apply')

let _token: string | null = null
async function getToken(): Promise<string> {
  return adminAuthHeader()
}

async function admin(p: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader(),
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

interface Price { amount: number; currency_code: string }
interface Variant { id: string; title: string; prices?: Price[] }
interface Product { id: string; handle: string; title: string; variants?: Variant[] }

async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = []
  let offset = 0
  while (true) {
    const data = await admin(`/admin/products?limit=100&offset=${offset}&fields=handle,title,*variants,*variants.prices`)
    const products = (data.products ?? []) as Product[]
    all.push(...products)
    if (products.length < 100) break
    offset += 100
  }
  return all
}

function looksAlreadyMigrated(products: Product[]): { migrated: boolean; reason?: string } {
  for (const p of products) {
    for (const v of p.variants ?? []) {
      for (const pr of v.prices ?? []) {
        if (pr.amount === 0) continue
        if (pr.currency_code === 'ngn' && pr.amount < 1000) {
          return { migrated: true, reason: `${p.handle} NGN already ${pr.amount}` }
        }
        if (pr.currency_code === 'cad' && pr.amount < 100) {
          return { migrated: true, reason: `${p.handle} CAD already ${pr.amount}` }
        }
      }
    }
  }
  return { migrated: false }
}

async function updateVariantPrices(productId: string, variantId: string, prices: Price[]) {
  await admin(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'POST',
    body: JSON.stringify({ prices: prices.map((p) => ({ amount: p.amount, currency_code: p.currency_code })) }),
  })
}

async function main() {
  if (!MEDUSA_ADMIN_EMAIL) {
    console.error('Missing MEDUSA_ADMIN_EMAIL or MEDUSA_ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`Medusa: ${MEDUSA_BACKEND_URL}`)
  console.log(`Mode:   ${APPLY ? 'APPLY (writing changes)' : 'dry-run (no writes)'}`)
  console.log('Loading products…\n')

  const products = await fetchAllProducts()
  console.log(`Found ${products.length} products.\n`)

  const guard = looksAlreadyMigrated(products)
  if (guard.migrated) {
    console.error(`Migration looks already applied — ${guard.reason}.`)
    console.error('Refusing to divide again. Inspect prices in Medusa admin if this is unexpected.')
    process.exit(1)
  }

  let variantCount = 0
  let priceCount = 0
  let failed = 0

  for (const p of products) {
    for (const v of p.variants ?? []) {
      const original = v.prices ?? []
      if (!original.length) continue

      const next: Price[] = original.map((pr) => ({
        amount: Math.round(pr.amount / 100),
        currency_code: pr.currency_code,
      }))

      const summary = next
        .map((pr, i) => `${pr.currency_code.toUpperCase()} ${original[i].amount}→${pr.amount}`)
        .join(', ')
      console.log(`  ${p.handle.padEnd(24)} ${v.id}  ${summary}`)

      variantCount++
      priceCount += next.length

      if (APPLY) {
        try {
          await updateVariantPrices(p.id, v.id, next)
        } catch (err) {
          failed++
          console.error(`    ✗ failed: ${err instanceof Error ? err.message : err}`)
        }
      }
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`  Variants planned: ${variantCount}`)
  console.log(`  Prices planned:   ${priceCount}`)
  if (APPLY) {
    console.log(`  Failed:           ${failed}`)
    console.log(`  ${failed === 0 ? '✓ all writes succeeded' : '⚠ some writes failed — review output above'}`)
  } else {
    console.log('  (dry-run — re-run with --apply to write)')
  }
  console.log('────────────────────────────────────────')
}

main().catch((err) => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
