import type { MedusaProduct, MedusaVariant, MedusaProductMetadata, TileEnrichment, Enrichment } from '@/types'
import { FALLBACK_COLOR } from '@/lib/constants'
import { REGIONS } from '@/lib/region'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

const DEFAULT_REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? ''

/**
 * Publishable key for the market whose medusaRegionId is given, so each region
 * reads availability from its own stock location. Falls back to the shared key
 * (unchanged behaviour) until per-market keys are configured.
 */
function keyForMedusaRegion(medusaRegionId?: string): string {
  if (medusaRegionId) {
    const region = Object.values(REGIONS).find((r) => r.medusaRegionId === medusaRegionId)
    if (region?.publishableKey) return region.publishableKey
  }
  return PUBLISHABLE_KEY
}

function storeHeaders(medusaRegionId?: string): Record<string, string> {
  return {
    'x-publishable-api-key': keyForMedusaRegion(medusaRegionId),
    'Content-Type': 'application/json',
  }
}

function withRegion(params: URLSearchParams, regionId?: string): string {
  const id = regionId ?? DEFAULT_REGION_ID
  if (id) params.set('region_id', id)
  // Medusa v2 store API omits product.metadata from the default field set, and
  // we also want inventory so the storefront can show out-of-stock. The `+`
  // keeps the default fields (incl. calculated_price) and adds these.
  if (!params.has('fields')) {
    params.set(
      'fields',
      '+metadata,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
    )
  }
  return params.toString()
}

/** A variant is in stock when inventory isn't tracked, backorder is on, or qty > 0. */
export function variantInStock(variant: MedusaVariant | undefined): boolean {
  if (!variant) return false
  if (variant.manage_inventory !== true) return true
  if (variant.allow_backorder === true) return true
  return (variant.inventory_quantity ?? 0) > 0
}

/**
 * Medusa stores images with its own origin (eg. localhost:9000 in dev, or
 * the container's internal address in Railway). Rewrite those URLs to use
 * the configured public backend URL so images resolve in the browser.
 */
export function normaliseImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const backend = new URL(BACKEND_URL)
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      parsed.hostname = backend.hostname
      parsed.port = backend.port
      parsed.protocol = backend.protocol
    }
    return parsed.toString()
  } catch {
    return url
  }
}

/** Returns the first usable product image URL, normalised for the browser */
export function getProductImage(product: MedusaProduct): string | null {
  const raw = product.images?.[0]?.url ?? product.thumbnail ?? null
  return normaliseImageUrl(raw)
}

export async function getMedusaProduct(
  handle: string,
  regionId?: string
): Promise<MedusaProduct | null> {
  if (!PUBLISHABLE_KEY) return null
  try {
    const params = new URLSearchParams({ handle, limit: '1' })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params, regionId)}`,
      { headers: storeHeaders(regionId), next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.products?.[0] as MedusaProduct) ?? null
  } catch {
    return null
  }
}

export async function getMedusaProducts(
  limit = 6,
  regionId?: string
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params, regionId)}`,
      { headers: storeHeaders(regionId), next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.products as MedusaProduct[]) ?? []
  } catch {
    return []
  }
}

/**
 * Resolve a Medusa category ID from its handle (eg. "signature", "oils").
 * Returns null when the category doesn't exist yet in Medusa Admin.
 */
async function getCategoryId(handle: string): Promise<string | null> {
  if (!PUBLISHABLE_KEY) return null
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/product-categories?handle=${handle}&limit=1`,
      { headers: storeHeaders(), next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.product_categories?.[0]?.id as string) ?? null
  } catch {
    return null
  }
}

export async function getProductsByCategory(
  categoryHandle: string,
  limit = 100,
  regionId?: string
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  try {
    const categoryId = await getCategoryId(categoryHandle)
    if (!categoryId) return []
    const params = new URLSearchParams({ limit: String(limit) })
    params.set('category_id[]', categoryId)
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params, regionId)}`,
      { headers: storeHeaders(regionId), next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.products as MedusaProduct[]) ?? []
  } catch {
    return []
  }
}

export async function getSignatureProducts(regionId?: string): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  return getProductsByCategory('signature', 100, regionId)
}

export async function getAllNumberSeriesProducts(
  limit = 100,
  regionId?: string
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  const fromCategory = await getProductsByCategory('number-collection', limit, regionId)
  if (fromCategory.length > 0) return fromCategory
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params, regionId)}`,
      { headers: storeHeaders(regionId), next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    const all = (json.products as MedusaProduct[]) ?? []
    return all.filter((p) => p.handle?.startsWith('no-'))
  } catch {
    return []
  }
}

function splitNotes(raw?: string): string[] | undefined {
  if (!raw) return undefined
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts : undefined
}

function resolveNumber(p: MedusaProduct, m: MedusaProductMetadata): number {
  if (m.number) {
    const n = parseInt(m.number, 10)
    if (!isNaN(n)) return n
  }
  const match = p.handle?.match(/^no-(\d+)$/)
  if (match) return parseInt(match[1], 10)
  return NaN
}

/**
 * Extract the price for a product variant in the active region's currency.
 * When `region_id` was passed on the fetch, Medusa returns `calculated_price`
 * already in the right currency. Without it, fall back to scanning the prices
 * array for the matching currency code.
 *
 * Medusa v2 stores prices in MAJOR units (₦50,000 → 50000, CAD $65 → 65).
 * The rest of the storefront — formatPrice, Paystack, Stripe — works in
 * MINOR units. We multiply by 100 here at the read boundary so the contract
 * stays consistent everywhere downstream.
 */
export function getPrice(
  product: MedusaProduct,
  currency: string = 'NGN'
): { amount: number; currency: string } {
  const cur = currency.toLowerCase()
  const variant = product.variants?.[0]
  if (!variant) return { amount: 0, currency: cur.toUpperCase() }

  // Medusa v2 with region_id: calculated_price is in the region's currency
  const calc = variant.calculated_price
  if (calc?.calculated_amount && (!calc.currency_code || calc.currency_code === cur)) {
    return {
      amount: calc.calculated_amount * 100,
      currency: (calc.currency_code ?? cur).toUpperCase(),
    }
  }

  // Fallback: scan the prices array for the right currency
  const direct = variant.prices?.find((p) => p.currency_code === cur)
  if (direct) {
    return { amount: direct.amount * 100, currency: direct.currency_code.toUpperCase() }
  }

  // Last resort: first available price
  const first = variant.prices?.[0]
  if (first) {
    return { amount: first.amount * 100, currency: first.currency_code.toUpperCase() }
  }

  return { amount: 0, currency: cur.toUpperCase() }
}

/** @deprecated Use getPrice(product, currency) instead */
export function getNGNPrice(product: MedusaProduct): number {
  return getPrice(product, 'NGN').amount
}

/** Map a product's metadata to a TileEnrichment for the shop wall */
export function toTileEnrichment(
  p: MedusaProduct,
  currency: string = 'NGN'
): TileEnrichment | null {
  const m: MedusaProductMetadata = p.metadata ?? {}
  const num = resolveNumber(p, m)
  if (isNaN(num)) return null
  const variant = p.variants?.[0]
  const price = getPrice(p, currency)
  return {
    productHandle: p.handle,
    number: num,
    descriptor: m.descriptor ?? p.subtitle ?? '',
    scentFamily: m.scent_family,
    signatureColor: m.signature_color ?? FALLBACK_COLOR,
    signatureColorName: m.signature_color_name,
    tagline: m.tagline,
    topNotes: splitNotes(m.top_notes),
    heartNotes: splitNotes(m.heart_notes),
    baseNotes: splitNotes(m.base_notes),
    imageUrl: getProductImage(p) ?? undefined,
    productId: p.id,
    variantId: variant?.id ?? p.handle,
    priceMinor: price.amount,
    currency: price.currency,
    // legacy alias for any not-yet-migrated callers
    priceKobo: price.amount,
    inStock: variantInStock(variant),
  }
}

/**
 * Map Medusa products into number tiles, logging (server-side) any product
 * that gets dropped or looks misconfigured. A number tile is only shown when
 * its number resolves (metadata.number, or a "no-<n>" / "oil-no-<n>" handle),
 * so a product missing that would otherwise vanish from the grid with no
 * trace. This surfaces the reason in the Vercel function logs instead.
 *
 * `context` is a short label for the grid (eg. "oils") used in the log line.
 * Returns the surviving tiles unsorted — the caller sorts by number.
 */
export function buildTiles(
  products: MedusaProduct[],
  currency: string,
  context: string
): TileEnrichment[] {
  const tiles: TileEnrichment[] = []
  for (const p of products) {
    const tile = toTileEnrichment(p, currency)
    if (!tile) {
      console.warn(
        `[catalogue] "${p.handle ?? p.id}" is hidden from the ${context} grid: ` +
          `no resolvable number. Set metadata.number in Medusa Admin ` +
          `(or give it a "no-<n>" / "oil-no-<n>" handle).`
      )
      continue
    }
    if (!tile.priceMinor) {
      console.warn(
        `[catalogue] "${p.handle}" shows on the ${context} grid with no ` +
          `${currency.toUpperCase()} price. Add a ${currency.toUpperCase()} price in Medusa Admin.`
      )
    }
    tiles.push(tile)
  }
  return tiles
}

export interface CategoryProduct {
  handle: string
  title: string
  descriptor: string
  signatureColor: string
  tagline: string
  priceMinor: number
  currency: string
  imageUrl: string | null
  productId: string
  variantId: string
  /** @deprecated retained while call sites migrate */
  priceKobo: number
  /** Undefined is treated as in stock by consumers */
  inStock?: boolean
}

/** Map a generic Medusa product to a display card */
export function toCategoryProduct(
  p: MedusaProduct,
  currency: string = 'NGN'
): CategoryProduct {
  const m: MedusaProductMetadata = p.metadata ?? {}
  const variant = p.variants?.[0]
  const price = getPrice(p, currency)
  return {
    handle: p.handle,
    title: p.title,
    descriptor: m.descriptor ?? p.subtitle ?? '',
    signatureColor: m.signature_color ?? FALLBACK_COLOR,
    tagline: m.tagline ?? '',
    priceMinor: price.amount,
    currency: price.currency,
    imageUrl: getProductImage(p),
    productId: p.id,
    variantId: variant?.id ?? p.handle ?? p.id,
    priceKobo: price.amount,
    inStock: variantInStock(variant),
  }
}

/** Map a product's metadata to a full Enrichment for the PDP */
export function toEnrichment(
  p: MedusaProduct,
  currency: string = 'NGN'
): Enrichment | null {
  const m: MedusaProductMetadata = p.metadata ?? {}
  const num = resolveNumber(p, m)
  if (isNaN(num)) return null
  return {
    productHandle: p.handle,
    number: num,
    descriptor: m.descriptor ?? p.subtitle ?? p.title ?? '',
    scentFamily: m.scent_family,
    signatureColor: m.signature_color ?? FALLBACK_COLOR,
    signatureColorName: m.signature_color_name,
    tagline: m.tagline,
    longevity: m.longevity ? parseInt(m.longevity, 10) : undefined,
    sillage: m.sillage ? parseInt(m.sillage, 10) : undefined,
    topNotes: splitNotes(m.top_notes),
    heartNotes: splitNotes(m.heart_notes),
    baseNotes: splitNotes(m.base_notes),
  }
}
