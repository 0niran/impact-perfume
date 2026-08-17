/**
 * Reads the bespoke pricing config from Medusa so every price and rate is
 * editable in the admin with nothing hardcoded in the app. Four draft products
 * (hidden from the storefront) hold the values:
 *
 *   bespoke-base         3 variants (50/100/200ml)  -> base price per volume
 *   bespoke-bottle       2 variants (Gloss/Matted)  -> bottle-type surcharge
 *   bespoke-inscription  3 variants (Gold/Silver/Sticker) -> inscription surcharge
 *   bespoke-config       product metadata           -> business rates
 *
 * Variants are keyed by SKU (stable across renames); the display label comes
 * from the variant title, so the owner can retitle freely. Prices are read from
 * the admin API (variant.prices[] in MAJOR units) and multiplied to MINOR here.
 *
 * Wrapped in unstable_cache with the same TTL as the catalogue, so admin edits
 * appear within a couple of minutes without an admin login on every render.
 *
 * On any failure the reader returns null and callers degrade to the "we'll
 * confirm your price" quote path — it never falls back to hardcoded prices.
 */

import { unstable_cache } from 'next/cache'
import type { BespokeConfig, BespokeRates, PricedOption } from '@/lib/bespokePricing'
import { getMedusaAdminToken } from '@/lib/medusaAdmin'

const CONFIG_TTL_SECONDS = 120

/** Currencies the bespoke config can price in; matches Medusa currency codes. */
export type BespokeCurrency = 'ngn' | 'cad'

/** SKU -> stable option key + display order, per group. */
const VOLUME_SKUS: Record<string, string> = {
  'BSPOKE-BASE-50': '50',
  'BSPOKE-BASE-100': '100',
  'BSPOKE-BASE-200': '200',
}
const BOTTLE_SKUS: Record<string, string> = {
  'BSPOKE-BOTTLE-GLOSS': 'gloss',
  'BSPOKE-BOTTLE-MATTED': 'matted',
}
const INSCRIPTION_SKUS: Record<string, string> = {
  'BSPOKE-INSCR-GOLD': 'gold-foil',
  'BSPOKE-INSCR-SILVER': 'silver-foil',
  'BSPOKE-INSCR-STICKER': 'rain-sticker',
}

/** Conservative rate fallbacks, applied per-key only if the metadata is absent. */
const RATE_FALLBACK: BespokeRates = {
  depositPct: 50,
  quoteMinQty: 50,
  discountTiers: [],
}

interface AdminVariant {
  title?: string
  sku?: string
  prices?: Array<{ currency_code?: string; amount?: number }>
}
interface AdminProduct {
  handle?: string
  metadata?: Record<string, unknown> | null
  variants?: AdminVariant[]
}

async function fetchProduct(
  backendUrl: string,
  token: string,
  handle: string
): Promise<AdminProduct | null> {
  const url =
    `${backendUrl}/admin/products?handle=${encodeURIComponent(handle)}&limit=1` +
    `&fields=handle,metadata,*variants.prices,variants.title,variants.sku`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { products?: AdminProduct[] }
    return json.products?.[0] ?? null
  } catch {
    return null
  }
}

function priceMinor(variant: AdminVariant, currency: BespokeCurrency): number {
  const p = variant.prices?.find((x) => x.currency_code === currency)
  // Medusa v2 stores MAJOR units; the storefront works in MINOR (kobo/cents).
  return Math.round((p?.amount ?? 0) * 100)
}

/** Build the ordered PricedOption list for one group from its SKU->key map. */
function optionsFrom(
  product: AdminProduct | null,
  skuMap: Record<string, string>,
  currency: BespokeCurrency
): PricedOption[] {
  const bySku = new Map((product?.variants ?? []).map((v) => [v.sku ?? '', v]))
  const out: PricedOption[] = []
  // Preserve the map's declared order, not Medusa's variant order.
  for (const [sku, key] of Object.entries(skuMap)) {
    const v = bySku.get(sku)
    if (!v) continue
    out.push({ key, label: v.title?.trim() || key, priceMinor: priceMinor(v, currency) })
  }
  return out
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : fallback
}

function ratesFrom(product: AdminProduct | null): BespokeRates {
  const m = product?.metadata ?? {}
  const tiers: Array<{ minQty: number; pct: number }> = []
  // Tier metadata is discrete scalar keys so each is a simple number to edit.
  for (const i of [1, 2, 3]) {
    const min = m[`discount_tier${i}_min`]
    const pct = m[`discount_tier${i}_pct`]
    if (min != null && pct != null) {
      const minQty = toNumber(min, 0)
      const p = toNumber(pct, 0)
      if (minQty > 0 && p > 0) tiers.push({ minQty, pct: p })
    }
  }
  tiers.sort((a, b) => a.minQty - b.minQty)
  return {
    depositPct: toNumber(m.deposit_pct, RATE_FALLBACK.depositPct),
    quoteMinQty: toNumber(m.quote_min_qty, RATE_FALLBACK.quoteMinQty),
    discountTiers: tiers,
  }
}

async function readConfig(currency: BespokeCurrency): Promise<BespokeConfig | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!backendUrl) return null
  const token = await getMedusaAdminToken()
  if (!token) return null

  const [base, bottle, inscription, cfg] = await Promise.all([
    fetchProduct(backendUrl, token, 'bespoke-base'),
    fetchProduct(backendUrl, token, 'bespoke-bottle'),
    fetchProduct(backendUrl, token, 'bespoke-inscription'),
    fetchProduct(backendUrl, token, 'bespoke-config'),
  ])

  const volumes = optionsFrom(base, VOLUME_SKUS, currency)
  const bottleTypes = optionsFrom(bottle, BOTTLE_SKUS, currency)
  const inscriptions = optionsFrom(inscription, INSCRIPTION_SKUS, currency)

  // The two axes the estimate can't work without. Missing them = degrade to quote.
  // Also degrade when this currency has no base prices set yet (e.g. CAD before
  // the owner enters values in the admin) so we never quote a zero price — the
  // page falls back to the "we'll confirm your price" path instead.
  const priced = volumes.some((v) => v.priceMinor > 0)
  if (volumes.length === 0 || bottleTypes.length === 0 || !priced) {
    console.error('[bespokeConfig] missing/unpriced base or bottle; degrading to quote', {
      currency,
      volumes: volumes.length,
      bottleTypes: bottleTypes.length,
      inscriptions: inscriptions.length,
      priced,
    })
    return null
  }

  return { volumes, bottleTypes, inscriptions, rates: ratesFrom(cfg) }
}

/**
 * Cached bespoke config for a currency ('ngn' or 'cad'). unstable_cache keys on
 * the argument, so each currency gets its own entry under the shared tag (a
 * single revalidation busts both). Returns null when Medusa is unreachable, the
 * config products are missing, or this currency has no prices yet — callers show
 * the quote path in that case.
 */
export const getBespokeConfig = unstable_cache(
  (currency: BespokeCurrency = 'ngn') => readConfig(currency),
  ['bespoke-config'],
  { revalidate: CONFIG_TTL_SECONDS, tags: ['bespoke-config'] }
)
