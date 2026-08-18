/**
 * Create the two discovery-set categories + products in Medusa.
 *
 *   npx tsx scripts/setup-discovery-sets.ts            # dry run
 *   npx tsx scripts/setup-discovery-sets.ts --apply    # create
 *
 * Idempotent (matches on handle). Both sets are priced ₦150,000 / CA$200,
 * published, added to the NG + CA sales channels, and NOT inventory-tracked
 * (assembled to order). The Number set is the build-your-own "pick 8" set; the
 * Signature set is curated. Reads admin creds from .env.local.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const APPLY = process.argv.includes('--apply')

const NG_CHANNEL = 'sc_01KQMBCSX02P4R54TFRC4XMYFY'
const CA_CHANNEL = 'sc_01KWZKFFPZMQX3N1FC86C3DKJW'
const LAGOS = 'sloc_01KR1CDBQ1Z6G5EK251JRBNMQ7'
const CANADA = 'sloc_01KWZKFF9NG2YPYG78Z8Y7YBPH'
const INIT_QTY = 20 // starting stock per location; warehouse adjusts

const SETS = [
  {
    handle: 'number-discovery-set',
    title: 'Number Discovery Set',
    categoryName: 'Number Discovery Set',
    description: 'Choose any 8 from the Number Series as 2ml samples. Build your own discovery set.',
  },
  {
    handle: 'signature-discovery-set',
    title: 'Signature Discovery Set',
    categoryName: 'Signature Discovery Set',
    description: 'A curated set of Signature Scents in sample sizes.',
  },
]

const PRICES = [
  { amount: 150000, currency_code: 'ngn' },
  { amount: 200, currency_code: 'cad' },
]

const H = () => ({ Authorization: adminAuthHeader(), 'Content-Type': 'application/json' })

async function get(p: string) {
  const res = await fetch(`${BACKEND}${p}`, { headers: H() })
  if (!res.ok) throw new Error(`GET ${p} → ${res.status}`)
  return res.json()
}

async function post(p: string, body: unknown) {
  if (!APPLY) {
    console.log(`  [dry-run] POST ${p}`)
    return null
  }
  const res = await fetch(`${BACKEND}${p}`, { method: 'POST', headers: H(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`POST ${p} → ${res.status} ${(await res.text()).slice(0, 400)}`)
  return res.json()
}

async function ensureCategory(name: string, handle: string): Promise<string | null> {
  const existing = (await get(`/admin/product-categories?handle=${handle}&limit=1`)).product_categories?.[0]
  if (existing) {
    console.log(`  category "${name}" exists (${existing.id})`)
    return existing.id
  }
  const created = (await post('/admin/product-categories', {
    name,
    handle,
    is_active: true,
    is_internal: false,
  })) as { product_category?: { id: string } } | null
  const id = created?.product_category?.id ?? null
  console.log(`  category "${name}" created (${id ?? 'dry-run'})`)
  return id
}

async function ensureProduct(set: (typeof SETS)[number], categoryId: string | null) {
  const existing = (await get(`/admin/products?handle=${set.handle}&limit=1`)).products?.[0]
  if (existing) {
    console.log(`  product "${set.title}" exists (${existing.id}) — skipping create`)
    return
  }
  await post('/admin/products', {
    title: set.title,
    handle: set.handle,
    description: set.description,
    status: 'published',
    ...(categoryId ? { categories: [{ id: categoryId }] } : {}),
    sales_channels: [{ id: NG_CHANNEL }, { id: CA_CHANNEL }],
    options: [{ title: 'Set', values: ['Standard'] }],
    variants: [
      {
        title: 'Standard',
        manage_inventory: true,
        prices: PRICES,
        options: { Set: 'Standard' },
      },
    ],
  })

  // Stock the tracked variant at both locations.
  if (APPLY) {
    const p = (await get(`/admin/products?handle=${set.handle}&limit=1&fields=id,*variants.inventory_items`)).products?.[0]
    const iid = p?.variants?.[0]?.inventory_items?.[0]?.inventory_item_id
    if (iid) {
      for (const loc of [LAGOS, CANADA]) {
        await post(`/admin/inventory-items/${iid}/location-levels`, { location_id: loc, stocked_quantity: INIT_QTY })
      }
    } else {
      console.warn(`  ! no inventory item for ${set.handle}; stock not set`)
    }
  }
  console.log(`  product "${set.title}" created (₦150,000 / CA$200, tracked ${INIT_QTY}@Lagos + ${INIT_QTY}@Canada)`)
}

async function main() {
  if (!BACKEND) throw new Error('Missing Medusa admin env vars')
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN (pass --apply to write)\n')
  for (const set of SETS) {
    console.log(`== ${set.title} ==`)
    const catId = await ensureCategory(set.categoryName, `${set.handle}`)
    await ensureProduct(set, catId)
  }
  console.log('\nDone.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
