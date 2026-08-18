/**
 * Add Mystikal and Prestige to the Spray Perfumes category so all signature
 * sprays are consistently dual-listed. Idempotent: skips a product that is
 * already in the category.
 *
 *   npx tsx scripts/add-spray-category.ts
 *
 * Reads admin credentials from .env.local via dotenv.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

const SPRAY_CATEGORY_ID = 'pcat_01KR1F65F2NT210W8WWPHN5E7Y' // Spray Perfumes
const TARGET_TITLES = ['Mystikal', 'Prestige']

function headers() {
  return { Authorization: adminAuthHeader(), 'Content-Type': 'application/json' }
}

interface Product {
  id: string
  title: string
  categories?: { id: string; name: string }[]
}

async function findProduct(title: string): Promise<Product | null> {
  const res = await fetch(
    `${BACKEND}/admin/products?q=${encodeURIComponent(title)}&limit=20&fields=id,title,categories.id,categories.name`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`search "${title}" ${res.status}`)
  const { products } = (await res.json()) as { products: Product[] }
  return products.find((p) => p.title.toLowerCase() === title.toLowerCase()) ?? null
}

async function main() {
  if (!BACKEND) throw new Error('Missing Medusa admin env vars in .env.local')

  const toAdd: string[] = []
  for (const title of TARGET_TITLES) {
    const p = await findProduct(title)
    if (!p) {
      console.error(`  NOT FOUND: ${title}`)
      continue
    }
    const already = (p.categories ?? []).some((c) => c.id === SPRAY_CATEGORY_ID)
    if (already) {
      console.log(`  already in Spray Perfumes: ${p.title}`)
    } else {
      console.log(`  will add: ${p.title} (${p.id})`)
      toAdd.push(p.id)
    }
  }

  if (toAdd.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const res = await fetch(`${BACKEND}/admin/product-categories/${SPRAY_CATEGORY_ID}/products`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ add: toAdd }),
  })
  if (!res.ok) {
    throw new Error(`add-to-category failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  console.log(`Done. Added ${toAdd.length} product(s) to Spray Perfumes.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
