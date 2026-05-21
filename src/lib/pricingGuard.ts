/**
 * Server-side re-pricing for checkout. Audit H-1.
 *
 * The browser cart sends each line's `unitPriceKobo` along with the
 * checkout request — but the browser is not a trusted source of price.
 * Before charging the customer or recording the order in Medusa, we
 * fetch each variant from Medusa using the admin API and compute the
 * canonical price in the active region's currency. If the client-sent
 * amounts don't match (after small rounding tolerance), we refuse the
 * request.
 *
 * Used by both /api/stripe/create-intent (pre-payment) and
 * /api/verify-payment (post-payment).
 */

import { REGIONS, type RegionId } from '@/lib/region'

interface ClientLine {
  variantId: string
  qty: number
  unitPriceKobo: number
}

interface AdminPrice {
  amount: number
  currency_code: string
}

interface AdminVariant {
  id: string
  prices?: AdminPrice[]
}

interface AdminProduct {
  id: string
  variants?: AdminVariant[]
}

export interface ServerLine extends ClientLine {
  /** Server-derived price in MINOR units (kobo / cents) */
  serverUnitPriceMinor: number
}

export interface PriceValidationResult {
  ok: boolean
  lines: ServerLine[]
  /** Sum of server-derived totals in MINOR units. */
  totalMinor: number
  /** Currency code (uppercase) used for all line items */
  currency: string
  message?: string
}

let _adminToken: string | null = null
async function getAdminToken(): Promise<string | null> {
  if (_adminToken) return _adminToken
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (!url || !email || !password) return null
  try {
    const res = await fetch(`${url}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const { token } = await res.json()
    _adminToken = token ?? null
    return _adminToken
  } catch {
    return null
  }
}

async function fetchVariant(
  variantId: string,
  token: string
): Promise<AdminVariant | null> {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) return null
  try {
    // Medusa v2 admin variants endpoint with prices field
    const res = await fetch(
      `${url}/admin/products?variants_id[]=${variantId}&fields=*variants,*variants.prices&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { products?: AdminProduct[] }
    const product = data.products?.[0]
    return product?.variants?.find((v) => v.id === variantId) ?? null
  } catch {
    return null
  }
}

/**
 * Re-derive each line's price from Medusa and compare to what the client
 * sent. Tolerates a 1-unit-in-MINOR difference for rounding.
 *
 * Returns { ok: true, totalMinor, lines } on success — caller should
 * use `serverUnitPriceMinor` for any downstream charge / order line.
 *
 * Returns { ok: false, message } when:
 *   - Medusa is unreachable / unconfigured (defaults to fail-closed so
 *     no charge happens when we can't verify)
 *   - A variant doesn't exist
 *   - A variant has no price in the region's currency
 *   - A line's client-sent amount differs from the server-derived one
 */
export async function validateLinePricing(
  lines: ClientLine[],
  regionId: RegionId
): Promise<PriceValidationResult> {
  const region = REGIONS[regionId]
  const targetCurrency = region.currencyCode

  const empty: PriceValidationResult = {
    ok: false,
    lines: [],
    totalMinor: 0,
    currency: targetCurrency.toUpperCase(),
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return { ...empty, message: 'Cart is empty.' }
  }

  const token = await getAdminToken()
  if (!token) {
    console.error('[pricingGuard] cannot reach Medusa to verify prices')
    return { ...empty, message: 'Could not verify pricing. Please try again.' }
  }

  const serverLines: ServerLine[] = []
  let totalMinor = 0

  for (const line of lines) {
    if (!line.variantId || typeof line.variantId !== 'string') {
      return { ...empty, message: 'Invalid line item.' }
    }
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) {
      return { ...empty, message: 'Invalid quantity.' }
    }

    const variant = await fetchVariant(line.variantId, token)
    if (!variant) {
      return { ...empty, message: `Product ${line.variantId} is no longer available.` }
    }

    const regionalPrice = variant.prices?.find(
      (p) => p.currency_code === targetCurrency
    )
    if (!regionalPrice) {
      return {
        ...empty,
        message: `Product ${line.variantId} is not available in ${targetCurrency.toUpperCase()}.`,
      }
    }

    // Medusa stores MAJOR units; the storefront contract is MINOR units.
    const serverUnitPriceMinor = regionalPrice.amount * 100

    // Allow a 1-MINOR-unit tolerance for rounding (mostly defensive — the
    // storefront's lib/medusa.ts uses the same ×100 conversion so values
    // should match exactly).
    if (Math.abs(serverUnitPriceMinor - line.unitPriceKobo) > 1) {
      console.warn('[pricingGuard] client price mismatch', {
        variantId: line.variantId,
        clientUnitPriceKobo: line.unitPriceKobo,
        serverUnitPriceMinor,
      })
      return {
        ...empty,
        message: 'Cart price has changed. Please refresh and try again.',
      }
    }

    serverLines.push({ ...line, serverUnitPriceMinor })
    totalMinor += serverUnitPriceMinor * line.qty
  }

  return {
    ok: true,
    lines: serverLines,
    totalMinor,
    currency: targetCurrency.toUpperCase(),
  }
}
