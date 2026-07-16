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

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const APPLY = process.argv.includes('--apply')

const NG_CHANNEL = 'sc_01KQMBCSX02P4R54TFRC4XMYFY'
const CA_CHANNEL = 'sc_01KWZKFFPZMQX3N1FC86C3DKJW'

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

let token = ''

async function auth() {
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`auth failed ${res.status}`)
  token = (await res.json()).token
}

const H = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

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
        manage_inventory: false,
        prices: PRICES,
        options: { Set: 'Standard' },
      },
    ],
  })
  console.log(`  product "${set.title}" created (₦150,000 / CA$200, both channels)`)
}

async function main() {
  if (!BACKEND || !EMAIL || !PASSWORD) throw new Error('Missing Medusa admin env vars')
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN (pass --apply to write)\n')
  await auth()
  for (const set of SETS) {
    console.log(`== ${set.title} ==`)
    const catId = await ensureCategory(set.categoryName, `${set.handle}`)
    await ensureProduct(set, catId)
  }
  console.log('\nDone.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
