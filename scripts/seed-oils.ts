#!/usr/bin/env tsx
/**
 * Seeds the 50 Impact Oils into Medusa.
 * Each oil mirrors the corresponding Number Series fragrance but in 12ml concentrated-oil form.
 *
 * Idempotent: re-running skips products that already exist by handle, and merges metadata
 * onto existing products without overwriting unrelated fields.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import fs from 'fs'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

// Placeholder price — owner sets real prices in Medusa admin
const PLACEHOLDER_PRICE_NGN = 2500000 // ₦25,000 for 12ml oil (vs ₦50k for 100ml EDP)

interface SeedOil {
  number: number
  handle: string
  title: string
  descriptor: string
  scentFamily: string
  signatureColor: string
  signatureColorName: string
  tagline: string
  topNotes: string[]
  heartNotes: string[]
  baseNotes: string[]
  volume: string
  concentration: string
}

let _token: string | null = null

async function getToken(): Promise<string> {
  if (_token) return _token
  const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MEDUSA_ADMIN_EMAIL, password: MEDUSA_ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  _token = data.token as string
  return _token
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function findProductByHandle(handle: string): Promise<{ id: string } | null> {
  try {
    const data = await adminRequest(`/admin/products?handle=${handle}&limit=1`)
    if (!data.products?.length) return null
    return { id: data.products[0].id }
  } catch {
    return null
  }
}

async function findOrCreateCategory(handle: string, name: string): Promise<string | null> {
  try {
    const list = await adminRequest(`/admin/product-categories?handle=${handle}&limit=1`)
    if (list.product_categories?.length) return list.product_categories[0].id as string
    const created = await adminRequest('/admin/product-categories', {
      method: 'POST',
      body: JSON.stringify({ name, handle, is_active: true }),
    })
    return created.product_category?.id ?? null
  } catch (err) {
    console.error(`  Failed to ensure category ${handle}:`, err)
    return null
  }
}

async function createOilProduct(oil: SeedOil, categoryId: string | null): Promise<string> {
  const variantTitle = `${oil.title} - ${oil.volume}`
  const productData: Record<string, unknown> = {
    title: oil.title,
    subtitle: oil.descriptor,
    handle: oil.handle,
    description: `${oil.tagline} A ${oil.volume} ${oil.concentration} from the Impact Oils line — same fragrance composition as Impact No. ${oil.number}, in concentrated alcohol-free form.`,
    status: 'published',
    options: [{ title: 'Volume', values: [oil.volume] }],
    variants: [
      {
        title: variantTitle,
        sku: `${oil.handle.toUpperCase()}-${oil.volume.replace('ml', 'ML')}`,
        prices: [{ amount: PLACEHOLDER_PRICE_NGN, currency_code: 'ngn' }],
        options: { Volume: oil.volume },
      },
    ],
  }

  if (categoryId) productData.categories = [{ id: categoryId }]

  const result = await adminRequest('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
  return result.product.id
}

async function updateProductMetadata(productId: string, oil: SeedOil) {
  const metadata: Record<string, string> = {
    descriptor: oil.descriptor,
    tagline: oil.tagline,
    scent_family: oil.scentFamily,
    signature_color: oil.signatureColor,
    signature_color_name: oil.signatureColorName,
    number: String(oil.number),
    concentration: oil.concentration,
    top_notes: oil.topNotes.join(', '),
    heart_notes: oil.heartNotes.join(', '),
    base_notes: oil.baseNotes.join(', '),
  }
  await adminRequest(`/admin/products/${productId}`, {
    method: 'POST',
    body: JSON.stringify({ metadata }),
  })
}

async function main() {
  console.log('Impact Perfumes — Oils Seed')
  console.log('===========================\n')
  console.log(`Backend: ${MEDUSA_BACKEND_URL}\n`)

  const dataPath = path.join(process.cwd(), 'data', 'oils.seed.json')
  const raw = fs.readFileSync(dataPath, 'utf-8')
  const { products }: { products: SeedOil[] } = JSON.parse(raw)
  console.log(`Found ${products.length} oils in seed file.\n`)

  console.log('Ensuring "oils" category exists…')
  const categoryId = await findOrCreateCategory('oils', 'Impact Oils')
  console.log(categoryId ? `  ✓ category id: ${categoryId}` : '  ⚠️  category creation failed — products will not be assigned to a category\n')

  let created = 0
  let updated = 0
  let failed = 0

  for (const oil of products) {
    process.stdout.write(`  Oil No. ${String(oil.number).padStart(2, '0')} ${oil.handle.padEnd(12)} — `)
    try {
      const existing = await findProductByHandle(oil.handle)
      if (existing) {
        await updateProductMetadata(existing.id, oil)
        console.log('✓ metadata refreshed (already exists)')
        updated++
      } else {
        const id = await createOilProduct(oil, categoryId)
        await updateProductMetadata(id, oil)
        console.log(`✓ created (${id})`)
        created++
      }
    } catch (err) {
      console.log(`✗ FAILED — ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`  Created: ${created}`)
  console.log(`  Refreshed: ${updated}`)
  console.log(`  Failed: ${failed}`)
  console.log('────────────────────────────────────────\n')
  console.log('Done. Set real prices in Medusa admin when ready.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
