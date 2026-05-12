import type { MedusaProduct, MedusaProductMetadata, TileEnrichment, Enrichment } from '@/types'
import { FALLBACK_COLOR } from '@/lib/constants'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
  process.env.MEDUSA_ADMIN_API_KEY ??
  ''

// NGN region — required by Medusa v2 store API to return calculated_price
const REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? ''

function storeHeaders(): Record<string, string> {
  return {
    'x-publishable-api-key': PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
  }
}

function withRegion(params: URLSearchParams): string {
  if (REGION_ID) params.set('region_id', REGION_ID)
  return params.toString()
}

/**
 * Medusa stores images with its own origin (e.g. localhost:9000 in dev, or
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
  handle: string
): Promise<MedusaProduct | null> {
  if (!PUBLISHABLE_KEY) return null
  try {
    const params = new URLSearchParams({ handle, limit: '1' })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params)}`,
      { headers: storeHeaders(), next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json.products?.[0] as MedusaProduct) ?? null
  } catch {
    return null
  }
}

export async function getMedusaProducts(
  limit = 6
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params)}`,
      { headers: storeHeaders(), next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.products as MedusaProduct[]) ?? []
  } catch {
    return []
  }
}

/**
 * Resolve a Medusa category ID from its handle (e.g. "signature", "oils").
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

/**
 * Fetch products assigned to a named Medusa category.
 * Falls back to an empty array if the category doesn't exist yet.
 * Category handles to create in Medusa Admin:
 *   number-collection | signature | oils | home-fragrance | gifts | discovery
 */
export async function getProductsByCategory(
  categoryHandle: string,
  limit = 100
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  try {
    const categoryId = await getCategoryId(categoryHandle)
    if (!categoryId) return []
    const params = new URLSearchParams({ limit: String(limit) })
    params.set('category_id[]', categoryId)
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params)}`,
      { headers: storeHeaders(), next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.products as MedusaProduct[]) ?? []
  } catch {
    return []
  }
}

/** Fetch Signature products — strictly from the "signature" Medusa category */
export async function getSignatureProducts(): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  return getProductsByCategory('signature')
}

/** Fetch all Number Series products — first from Medusa category, falls back to handle prefix */
export async function getAllNumberSeriesProducts(
  limit = 100
): Promise<MedusaProduct[]> {
  if (!PUBLISHABLE_KEY) return []
  const fromCategory = await getProductsByCategory('number-collection', limit)
  if (fromCategory.length > 0) return fromCategory
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    const res = await fetch(
      `${BACKEND_URL}/store/products?${withRegion(params)}`,
      { headers: storeHeaders(), next: { revalidate: 60 } }
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

/** Derive the number from metadata or fall back to parsing the handle (no-{N}) */
function resolveNumber(p: MedusaProduct, m: MedusaProductMetadata): number {
  if (m.number) {
    const n = parseInt(m.number, 10)
    if (!isNaN(n)) return n
  }
  const match = p.handle?.match(/^no-(\d+)$/)
  if (match) return parseInt(match[1], 10)
  return NaN
}

/** Map a product's metadata to a TileEnrichment for the shop wall */
export function toTileEnrichment(p: MedusaProduct): TileEnrichment | null {
  const m: MedusaProductMetadata = p.metadata ?? {}
  const num = resolveNumber(p, m)
  if (isNaN(num)) return null
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
  }
}

/** Map a product's metadata to a full Enrichment for the PDP */
export function toEnrichment(p: MedusaProduct): Enrichment | null {
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

export interface CategoryProduct {
  handle: string
  title: string
  descriptor: string
  signatureColor: string
  tagline: string
  priceKobo: number
  imageUrl: string | null
}

/** Map a generic (non-Number-Series) Medusa product to a display card */
export function toCategoryProduct(p: MedusaProduct): CategoryProduct {
  const m: MedusaProductMetadata = p.metadata ?? {}
  return {
    handle: p.handle,
    title: p.title,
    descriptor: m.descriptor ?? p.subtitle ?? '',
    signatureColor: m.signature_color ?? FALLBACK_COLOR,
    tagline: m.tagline ?? '',
    priceKobo: getNGNPriceRaw(p),
    imageUrl: getProductImage(p),
  }
}

/** Internal price helper used before getNGNPrice is declared */
function getNGNPriceRaw(product: MedusaProduct): number {
  const variant = product.variants?.[0]
  if (!variant) return 0
  if (variant.calculated_price?.calculated_amount) {
    return variant.calculated_price.calculated_amount
  }
  return variant.prices?.find((p) => p.currency_code === 'ngn')?.amount ?? 0
}

/** Returns the NGN price in kobo from calculated_price (preferred) or prices fallback */
export function getNGNPrice(product: MedusaProduct): number {
  const variant = product.variants?.[0]
  if (!variant) return 0

  // Medusa v2 with region_id: use calculated_price
  if (variant.calculated_price?.calculated_amount) {
    return variant.calculated_price.calculated_amount
  }

  // Fallback: scan prices array (no region passed)
  return (
    variant.prices?.find((p) => p.currency_code === 'ngn')?.amount ?? 0
  )
}
