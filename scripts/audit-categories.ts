/**
 * Report which products have no category, and list the categories that exist.
 *
 *   npx tsx scripts/audit-categories.ts
 *
 * Read-only. Reads admin credentials from .env.local via dotenv.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

let token = ''

async function auth(): Promise<void> {
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`admin auth failed ${res.status}`)
  token = (await res.json()).token
}

function headers() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface Category {
  id: string
  name: string
  handle?: string
}

interface Product {
  id: string
  title: string
  handle?: string
  status?: string
  categories?: { id: string; name: string }[]
}

async function allCategories(): Promise<Category[]> {
  const res = await fetch(
    `${BACKEND}/admin/product-categories?limit=200&fields=id,name,handle`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`list categories ${res.status}`)
  return ((await res.json()) as { product_categories: Category[] }).product_categories
}

async function allProducts(): Promise<Product[]> {
  const out: Product[] = []
  let offset = 0
  for (;;) {
    const res = await fetch(
      `${BACKEND}/admin/products?limit=100&offset=${offset}&fields=id,title,handle,status,categories.id,categories.name`,
      { headers: headers() }
    )
    if (!res.ok) throw new Error(`list products ${res.status}`)
    const { products } = (await res.json()) as { products: Product[] }
    out.push(...products)
    if (products.length < 100) break
    offset += 100
  }
  return out
}

async function main() {
  if (!BACKEND || !EMAIL || !PASSWORD) throw new Error('Missing Medusa admin env vars in .env.local')
  await auth()

  const [categories, products] = await Promise.all([allCategories(), allProducts()])

  console.log(`\n=== CATEGORIES (${categories.length}) ===`)
  for (const c of categories) {
    console.log(`  ${c.name}  [${c.id}]  handle=${c.handle ?? '—'}`)
  }

  const uncategorised = products.filter((p) => (p.categories ?? []).length === 0)
  console.log(`\n=== PRODUCTS: ${products.length} total, ${uncategorised.length} with NO category ===`)
  for (const p of uncategorised) {
    console.log(`  [${p.status}] ${p.title}  (handle=${p.handle ?? '—'})  id=${p.id}`)
  }

  console.log(`\n=== ALL PRODUCTS → categories ===`)
  for (const p of products) {
    const cats = (p.categories ?? []).map((c) => c.name).join(', ') || '—NONE—'
    console.log(`  ${p.title}: ${cats}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
