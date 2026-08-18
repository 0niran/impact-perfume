/**
 * Catalogue health check. Read-only.
 *
 * Catches the class of mistake that silently hides a product from customers:
 * a published product that is not in the storefront's sales channel, is missing
 * a price, has no resolvable number for the tile grids, or is out of stock.
 *
 *   npm run audit:catalogue
 *
 * It compares what Medusa has PUBLISHED (admin API) against what the storefront
 * actually SERVES (store API with the market's publishable key + region). The
 * gap between those two is exactly what broke the oils page: products can be
 * published and priced yet invisible because they were never added to the
 * storefront's sales channel — the store API can't see them, so only this
 * admin-vs-store diff can.
 *
 * Audits NG always; audits CA too when the CA env vars are set. Exits non-zero
 * when it finds a hard problem (an invisible published product, or a missing
 * price) so it can gate a deploy later.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

let hardProblems = 0
interface Variant {
  calculated_price?: { calculated_amount?: number }
  inventory_quantity?: number
  manage_inventory?: boolean
  allow_backorder?: boolean
}
interface Product {
  id: string
  handle: string
  title?: string
  status?: string
  thumbnail?: string | null
  images?: { url: string }[]
  metadata?: { number?: string } | null
  variants?: Variant[]
}

/** Same rule the storefront uses (lib/medusa.ts resolveNumber). */
function resolvesNumber(p: Product): boolean {
  const n = p.metadata?.number
  if (n && !isNaN(parseInt(n, 10))) return true
  return /^no-(\d+)$/.test(p.handle)
}

async function adminPublished(): Promise<Map<string, Product>> {
  const out = new Map<string, Product>()
  let offset = 0
  for (;;) {
    const res = await fetch(
      `${BACKEND}/admin/products?status[]=published&limit=200&offset=${offset}&fields=id,handle,title,status`,
      { headers: { Authorization: adminAuthHeader() } }
    )
    if (!res.ok) throw new Error(`admin products ${res.status}`)
    const { products } = (await res.json()) as { products: Product[] }
    for (const p of products) out.set(p.id, p)
    if (products.length < 200) break
    offset += 200
  }
  return out
}

async function storeVisible(publishableKey: string, regionId: string): Promise<Map<string, Product>> {
  const out = new Map<string, Product>()
  let offset = 0
  const fields =
    '+metadata,+variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
  for (;;) {
    const url =
      `${BACKEND}/store/products?limit=200&offset=${offset}` +
      `&region_id=${regionId}&fields=${encodeURIComponent(fields)}`
    const res = await fetch(url, {
      headers: { 'x-publishable-api-key': publishableKey, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`store products ${res.status} ${(await res.text()).slice(0, 200)}`)
    const { products } = (await res.json()) as { products: Product[] }
    for (const p of products) out.set(p.id, p)
    if (products.length < 200) break
    offset += 200
  }
  return out
}

function line(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`)
}

async function auditMarket(
  name: string,
  publishableKey: string | undefined,
  regionId: string | undefined,
  published: Map<string, Product>
): Promise<void> {
  console.log(`\n=== ${name} storefront ===`)
  if (!publishableKey || !regionId) {
    line('•', 'not configured (no publishable key / region id) — skipped')
    return
  }
  const visible = await storeVisible(publishableKey, regionId)
  console.log(`  ${published.size} published in Medusa · ${visible.size} visible to this storefront`)

  // 1) Hard: published but invisible (not in this channel, or unpublished race).
  const invisible = [...published.values()].filter((p) => !visible.has(p.id))
  if (invisible.length) {
    hardProblems += invisible.length
    line('✗', `${invisible.length} PUBLISHED product(s) NOT visible on ${name} — add them to this sales channel:`)
    for (const p of invisible.slice(0, 40)) console.log(`       - ${p.handle}`)
    if (invisible.length > 40) console.log(`       … and ${invisible.length - 40} more`)
  } else {
    line('✓', 'every published product is visible on this storefront')
  }

  // 2) Per visible product: price, number, image, stock.
  const noPrice: string[] = []
  const noNumber: string[] = []
  const noImage: string[] = []
  const outOfStock: string[] = []
  for (const p of visible.values()) {
    const v = p.variants?.[0]
    if (!v?.calculated_price?.calculated_amount) noPrice.push(p.handle)
    // Only series products land on the number grids; flag the ones that would drop.
    if ((p.handle.startsWith('no-') || p.handle.startsWith('oil-no-')) && !resolvesNumber(p)) {
      noNumber.push(p.handle)
    }
    if (!p.thumbnail && !(p.images?.length)) noImage.push(p.handle)
    if (v?.manage_inventory === true && v?.allow_backorder !== true && (v?.inventory_quantity ?? 0) <= 0) {
      outOfStock.push(p.handle)
    }
  }

  if (noPrice.length) {
    hardProblems += noPrice.length
    line('✗', `${noPrice.length} visible product(s) with NO price (show "price on request"): ${noPrice.slice(0, 20).join(', ')}`)
  } else line('✓', 'every visible product has a price')

  if (noNumber.length) {
    hardProblems += noNumber.length
    line('✗', `${noNumber.length} series product(s) hidden from the grid (missing metadata.number): ${noNumber.slice(0, 20).join(', ')}`)
  } else line('✓', 'every series product resolves a number for the grid')

  if (outOfStock.length) {
    line('!', `${outOfStock.length} visible product(s) OUT OF STOCK (not sellable): ${outOfStock.slice(0, 20).join(', ')}${outOfStock.length > 20 ? ' …' : ''}`)
  }
  if (noImage.length) {
    line('!', `${noImage.length} visible product(s) with no image (using placeholder)`)
  }
}

async function main() {
  if (!BACKEND) throw new Error('Missing Medusa admin env vars in .env.local')
  const published = await adminPublished()

  await auditMarket('NG', process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_MEDUSA_REGION_ID, published)
  await auditMarket(
    'CA',
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA,
    process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_CA,
    published
  )

  console.log('')
  if (hardProblems) {
    console.log(`FAIL — ${hardProblems} issue(s) that hide or break a product. See ✗ lines above.`)
    process.exit(1)
  }
  console.log('PASS — every published product is visible, priced, and grid-ready. (! lines are advisory.)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
