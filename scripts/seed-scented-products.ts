/**
 * Seed number-based Candles + Home/Car Diffusers into Medusa.
 *
 *   npx tsx scripts/seed-scented-products.ts            # dry run
 *   npx tsx scripts/seed-scented-products.ts --apply    # create
 *
 * For each of the 5 chosen Number Series scents we create a Scent Candle, a
 * Home Diffuser and a Car Diffuser, carrying that number's notes. Idempotent
 * (skips a handle that already exists). Prices:
 *   - Diffusers (home + car): ₦25,000 / CA$30
 *   - Scent candles:          ₦20,000 / CA$20
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const APPLY = process.argv.includes('--apply')

const NG = 'sc_01KQMBCSX02P4R54TFRC4XMYFY'
const CA = 'sc_01KWZKFFPZMQX3N1FC86C3DKJW'
const NUMBERS = [1, 5, 11, 13, 18]

const CATS = [
  { kind: 'candle', label: 'Scent Candle', catHandle: 'scent-candles', handlePrefix: 'candle-no-', size: '250g Soy Wax', image: '/images/candle.png', prices: [{ amount: 20000, currency_code: 'ngn' }, { amount: 20, currency_code: 'cad' }] },
  { kind: 'home', label: 'Home Diffuser', catHandle: 'home-diffusers', handlePrefix: 'home-diffuser-no-', size: '100ml Reed', image: '/images/Difusser.png', prices: [{ amount: 25000, currency_code: 'ngn' }, { amount: 30, currency_code: 'cad' }] },
  { kind: 'car', label: 'Car Diffuser', catHandle: 'car-diffusers', handlePrefix: 'car-diffuser-no-', size: '8ml Vent', image: '/images/car.png', prices: [{ amount: 25000, currency_code: 'ngn' }, { amount: 30, currency_code: 'cad' }] },
]

let token = ''
async function auth() {
  const r = await fetch(`${BE}/auth/user/emailpass`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })
  if (!r.ok) throw new Error(`auth ${r.status}`)
  token = (await r.json()).token
}
const H = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
async function get(p: string) { const r = await fetch(`${BE}${p}`, { headers: H() }); if (!r.ok) throw new Error(`GET ${p} ${r.status}`); return r.json() }
async function post(p: string, b: unknown) {
  if (!APPLY) { console.log(`  [dry-run] POST ${p}`); return null }
  const r = await fetch(`${BE}${p}`, { method: 'POST', headers: H(), body: JSON.stringify(b) })
  if (!r.ok) throw new Error(`POST ${p} ${r.status} ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

interface NumMeta { number: number; descriptor?: string; scent_family?: string; top_notes?: string; heart_notes?: string; base_notes?: string; signature_color?: string }

async function main() {
  if (!BE || !EMAIL || !PASSWORD) throw new Error('Missing Medusa admin env')
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN (pass --apply)\n')
  await auth()

  // Category ids
  const catId: Record<string, string> = {}
  for (const c of CATS) {
    const found = (await get(`/admin/product-categories?handle=${c.catHandle}&limit=1`)).product_categories?.[0]
    if (!found) throw new Error(`category ${c.catHandle} not found`)
    catId[c.catHandle] = found.id
  }

  // Notes for the chosen numbers
  const meta: Record<number, NumMeta> = {}
  for (const n of NUMBERS) {
    const p = (await get(`/admin/products?handle=no-${n}&limit=1&fields=handle,*metadata`)).products?.[0]
    const m = p?.metadata ?? {}
    meta[n] = { number: n, descriptor: m.descriptor, scent_family: m.scent_family, top_notes: m.top_notes, heart_notes: m.heart_notes, base_notes: m.base_notes, signature_color: m.signature_color }
  }

  let created = 0, skipped = 0
  for (const n of NUMBERS) {
    const m = meta[n]
    const first = (s?: string) => (s ? s.split(',')[0].trim() : '')
    const tileNotes = [first(m.top_notes), first(m.heart_notes), first(m.base_notes)].filter(Boolean).join(' · ')
    for (const c of CATS) {
      const handle = `${c.handlePrefix}${n}`
      const exists = (await get(`/admin/products?handle=${handle}&limit=1`)).products?.[0]
      if (exists) { console.log(`  skip ${handle} (exists)`); skipped++; continue }
      const title = `No. ${n} ${c.label}`
      const description = `Impact No. ${n} — ${m.scent_family ?? m.descriptor ?? 'signature scent'}, in a ${c.label.toLowerCase()}.` +
        (m.top_notes ? ` Top: ${m.top_notes}.` : '') + (m.heart_notes ? ` Heart: ${m.heart_notes}.` : '') + (m.base_notes ? ` Base: ${m.base_notes}.` : '')
      await post('/admin/products', {
        title, handle, description, status: 'published',
        thumbnail: c.image,
        categories: [{ id: catId[c.catHandle] }],
        sales_channels: [{ id: NG }, { id: CA }],
        options: [{ title: 'Size', values: [c.size] }],
        variants: [{ title: c.size, manage_inventory: false, prices: c.prices, options: { Size: c.size } }],
        metadata: {
          number: String(n),
          descriptor: tileNotes || m.descriptor || '',
          scent_family: m.scent_family ?? '',
          top_notes: m.top_notes ?? '',
          heart_notes: m.heart_notes ?? '',
          base_notes: m.base_notes ?? '',
          signature_color: m.signature_color ?? '',
        },
      })
      console.log(`  created ${handle} — "${title}" (${c.prices.map((p) => `${p.currency_code}:${p.amount}`).join(' / ')})`)
      created++
    }
  }
  console.log(`\nDone. created ${created}, skipped ${skipped}.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
