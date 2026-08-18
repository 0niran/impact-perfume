#!/usr/bin/env tsx
/**
 * Normalises Medusa product categories so their handles match what the storefront expects.
 *
 * Storefront expects these category handles:
 *   number-collection · signature · oils · home-diffusers · scent-candles
 *   scenting-machines · car-diffusers · gifts · discovery
 *
 * Renames the closest existing matches to the canonical handles, then creates any missing.
 * Existing duplicates (e.g. "spray-perfumes" alongside "impact-number-series-perfumes")
 * are flagged but not deleted — review manually in the Medusa admin.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

interface CanonicalCategory {
  handle: string
  name: string
  description?: string
  aliases: string[]
}

const CANONICAL: CanonicalCategory[] = [
  {
    handle: 'number-collection',
    name: 'Number Collection',
    description: '50 numbered Eau de Parfum signatures, 100ml each.',
    aliases: ['impact-number-series-perfumes', 'spray-perfumes', 'number-series'],
  },
  {
    handle: 'signature',
    name: 'Signature Collection',
    description: 'Named, not numbered. Composed for those who already know who they are.',
    aliases: [],
  },
  {
    handle: 'oils',
    name: 'Impact Oils',
    description: 'Alcohol-free perfume oils. Intensely concentrated. 12ml.',
    aliases: ['perfume-oils', 'impact-oils'],
  },
  {
    handle: 'home-diffusers',
    name: 'Home Diffusers',
    description: 'Reed diffusers for the home.',
    aliases: ['home-fragrance', 'reed-diffusers'],
  },
  {
    handle: 'scent-candles',
    name: 'Scent Candles',
    description: 'Hand-poured candles in signature fragrances.',
    aliases: ['candles'],
  },
  {
    handle: 'scenting-machines',
    name: 'Scenting Machines',
    description: 'Cold-air diffusion machines for hotels, offices, and large spaces.',
    aliases: ['diffusion-machines'],
  },
  {
    handle: 'car-diffusers',
    name: 'Car Diffusers',
    description: 'Vent-mounted clip-on diffusers, up to 60 days per refill.',
    aliases: [],
  },
  {
    handle: 'gifts',
    name: 'Gift Sets',
    description: 'Curated gift boxes in signature packaging.',
    aliases: ['gift-sets'],
  },
  {
    handle: 'discovery',
    name: 'Discovery Sets',
    description: 'Miniature sample sets — start here to find your Number.',
    aliases: ['discovery-set', 'discovery-sets'],
  },
]

let _token: string | null = null

async function getToken(): Promise<string> {
  return adminAuthHeader()
}

async function adminRequest(p: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
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

interface MedusaCategory {
  id: string
  handle: string
  name: string
  product_count?: number
}

async function listCategories(): Promise<MedusaCategory[]> {
  const data = await adminRequest('/admin/product-categories?limit=100')
  return (data.product_categories ?? []) as MedusaCategory[]
}

async function countProductsInCategory(categoryId: string): Promise<number> {
  const data = await adminRequest(
    `/admin/products?category_id[]=${categoryId}&limit=1`
  )
  return data.count ?? 0
}

async function renameCategory(id: string, handle: string, name: string, description?: string) {
  await adminRequest(`/admin/product-categories/${id}`, {
    method: 'POST',
    body: JSON.stringify({ handle, name, ...(description ? { description } : {}) }),
  })
}

async function createCategory(handle: string, name: string, description?: string) {
  await adminRequest('/admin/product-categories', {
    method: 'POST',
    body: JSON.stringify({ handle, name, is_active: true, ...(description ? { description } : {}) }),
  })
}

async function main() {
  console.log('Impact Perfumes — Category Cleanup')
  console.log('===================================\n')
  console.log(`Backend: ${MEDUSA_BACKEND_URL}\n`)

  const existing = await listCategories()
  console.log(`Found ${existing.length} existing categories.\n`)

  const byHandle = new Map(existing.map((c) => [c.handle, c]))
  const used = new Set<string>()

  let renamed = 0
  let created = 0
  let skipped = 0
  const orphans: { cat: MedusaCategory; productCount: number }[] = []

  for (const canon of CANONICAL) {
    process.stdout.write(`  ${canon.handle.padEnd(20)} — `)

    if (byHandle.has(canon.handle)) {
      console.log('✓ already canonical, skipping')
      used.add(byHandle.get(canon.handle)!.id)
      skipped++
      continue
    }

    // Find an alias to rename
    const aliasMatch = canon.aliases
      .map((a) => byHandle.get(a))
      .find((c): c is MedusaCategory => Boolean(c) && !used.has(c!.id))

    if (aliasMatch) {
      try {
        await renameCategory(aliasMatch.id, canon.handle, canon.name, canon.description)
        console.log(`✓ renamed "${aliasMatch.handle}" → "${canon.handle}"`)
        used.add(aliasMatch.id)
        renamed++
      } catch (err) {
        console.log(`✗ rename failed: ${err instanceof Error ? err.message : err}`)
      }
    } else {
      try {
        await createCategory(canon.handle, canon.name, canon.description)
        console.log('✓ created')
        created++
      } catch (err) {
        console.log(`✗ create failed: ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  // Flag leftover categories that weren't claimed by any canonical mapping
  for (const c of existing) {
    if (used.has(c.id)) continue
    if (CANONICAL.some((canon) => canon.handle === c.handle)) continue
    const count = await countProductsInCategory(c.id)
    orphans.push({ cat: c, productCount: count })
  }

  if (orphans.length > 0) {
    console.log('\nUnmapped categories (review manually):')
    for (const { cat, productCount } of orphans) {
      console.log(`  • ${cat.handle.padEnd(35)} "${cat.name}"  (${productCount} products)`)
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`  Renamed:  ${renamed}`)
  console.log(`  Created:  ${created}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Orphans:  ${orphans.length}`)
  console.log('────────────────────────────────────────\n')
}

main().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
