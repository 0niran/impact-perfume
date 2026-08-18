#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

// Signature Collection — Medusa v2 stores prices in MAJOR units (₦1 = 1).
const SIGNATURE_PRODUCTS = [
  {
    title: 'Enigma',
    handle: 'enigma',
    descriptor: 'Oriental Wood',
    tagline: 'Mysterious. Magnetic. Unforgettable.',
    scentFamily: 'Oriental',
    signatureColor: '#2C1810',
    signatureColorName: 'Dark Mahogany',
    topNotes: 'Bergamot, Black Pepper, Cardamom',
    heartNotes: 'Oud, Rose, Patchouli',
    baseNotes: 'Amber, Musk, Sandalwood',
    longevity: '5',
    sillage: '4',
    priceNgn: 80_000,
  },
  {
    title: 'OUD Osmosis Unlimited',
    handle: 'oud-osmosis-unlimited',
    descriptor: 'Rich Oud',
    tagline: 'Depth without limits.',
    scentFamily: 'Oud',
    signatureColor: '#1A0F08',
    signatureColorName: 'Smoked Oud',
    topNotes: 'Saffron, Rose',
    heartNotes: 'Oud, Cypriol',
    baseNotes: 'Amber, Benzoin, Musk',
    longevity: '5',
    sillage: '5',
    priceNgn: 100_000,
  },
  {
    title: 'Royale Silver',
    handle: 'royale-silver',
    descriptor: 'Fresh Elegance',
    tagline: 'Crowned with confidence.',
    scentFamily: 'Aromatic Fresh',
    signatureColor: '#8C9BAB',
    signatureColorName: 'Silver',
    topNotes: 'Bergamot, Lemon, Lavender',
    heartNotes: 'Geranium, Iris, Cedar',
    baseNotes: 'Vetiver, Musk, White Amber',
    longevity: '4',
    sillage: '3',
    priceNgn: 80_000,
  },
  {
    title: 'Solid OUD',
    handle: 'solid-oud',
    descriptor: 'Pure Oud',
    tagline: 'Raw. Grounding. Ancient.',
    scentFamily: 'Oud',
    signatureColor: '#0D0804',
    signatureColorName: 'Black Oud',
    topNotes: 'Incense, Leather',
    heartNotes: 'Oud, Cypriol, Vetiver',
    baseNotes: 'Sandalwood, Amber, Musk',
    longevity: '5',
    sillage: '4',
    priceNgn: 100_000,
  },
]

let _token: string | null = null

async function getToken(): Promise<string> {
  return adminAuthHeader()
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader(),
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body)}`)
  return body
}

async function productExists(handle: string): Promise<{ exists: boolean; id?: string }> {
  try {
    const data = await adminRequest(`/admin/products?handle=${handle}&limit=1`)
    if (data.products?.length > 0) return { exists: true, id: data.products[0].id }
    return { exists: false }
  } catch {
    return { exists: false }
  }
}

async function getOrCreateCategory(handle: string, name: string): Promise<string | null> {
  try {
    // Check if category exists
    const res = await adminRequest(`/admin/product-categories?handle=${handle}&limit=1`)
    if (res.product_categories?.length > 0) {
      console.log(`  Category "${name}" already exists (${res.product_categories[0].id})`)
      return res.product_categories[0].id
    }
    // Create it
    const created = await adminRequest('/admin/product-categories', {
      method: 'POST',
      body: JSON.stringify({ name, handle, is_active: true }),
    })
    console.log(`  Created category "${name}" (${created.product_category.id})`)
    return created.product_category.id
  } catch (err) {
    console.warn(`  Could not get/create category: ${err}`)
    return null
  }
}

async function assignToCategory(productId: string, categoryId: string) {
  try {
    await adminRequest(`/admin/products/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ categories: [{ id: categoryId }] }),
    })
  } catch {
    // Non-fatal — category assignment can be done manually in admin
  }
}

async function seedProduct(p: typeof SIGNATURE_PRODUCTS[number], categoryId: string | null) {
  const { exists, id: existingId } = await productExists(p.handle)

  if (exists) {
    console.log(`  "${p.title}" already exists — updating metadata...`)
    await adminRequest(`/admin/products/${existingId}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          descriptor: p.descriptor,
          tagline: p.tagline,
          scent_family: p.scentFamily,
          signature_color: p.signatureColor,
          signature_color_name: p.signatureColorName,
          top_notes: p.topNotes,
          heart_notes: p.heartNotes,
          base_notes: p.baseNotes,
          longevity: p.longevity,
          sillage: p.sillage,
          collection: 'signature',
        },
      }),
    })
    if (categoryId && existingId) await assignToCategory(existingId, categoryId)
    console.log(`  ✓ Updated "${p.title}"`)
    return
  }

  const payload = {
    title: p.title,
    subtitle: p.descriptor,
    handle: p.handle,
    description: `${p.tagline} A luxury Eau de Parfum from the Impact Signature Collection.`,
    status: 'published',
    metadata: {
      descriptor: p.descriptor,
      tagline: p.tagline,
      scent_family: p.scentFamily,
      signature_color: p.signatureColor,
      signature_color_name: p.signatureColorName,
      top_notes: p.topNotes,
      heart_notes: p.heartNotes,
      base_notes: p.baseNotes,
      longevity: p.longevity,
      sillage: p.sillage,
      collection: 'signature',
    },
    options: [{ title: 'Volume', values: ['100ml'] }],
    variants: [
      {
        title: `${p.title} — 100ml EDP`,
        sku: `${p.handle.toUpperCase()}-100ML`,
        prices: [{ amount: p.priceNgn, currency_code: 'ngn' }],
        options: { Volume: '100ml' },
      },
    ],
  }

  const result = await adminRequest('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const newId = result.product.id
  console.log(`  ✓ Created "${p.title}" (${newId})`)

  if (categoryId) await assignToCategory(newId, categoryId)
}

async function main() {
  console.log('Impact Perfumes — Signature Collection Seed')
  console.log('============================================\n')

  if (!MEDUSA_ADMIN_EMAIL) {
    console.error('Missing MEDUSA_ADMIN_EMAIL or MEDUSA_ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`Backend: ${MEDUSA_BACKEND_URL}`)
  console.log(`Admin:   ${MEDUSA_ADMIN_EMAIL}\n`)

  // Ensure the "signature" category exists
  console.log('1. Getting/creating Signature category...')
  const categoryId = await getOrCreateCategory('signature', 'Signature Collection')
  console.log()

  // Seed each product
  console.log('2. Seeding Signature products...')
  for (const product of SIGNATURE_PRODUCTS) {
    console.log(`\n  → ${product.title} (₦${product.priceNgn.toLocaleString('en-NG')})`)
    await seedProduct(product, categoryId)
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log('\nDone! All 4 Signature products are live in Medusa.')
  console.log('Check the Admin dashboard to verify and add product images.')
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
