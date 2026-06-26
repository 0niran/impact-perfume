/**
 * Server-side re-pricing for checkout. Audit H-1.
 *
 * The browser cart sends each line's `unitPriceKobo` along with the
 * checkout request — but the browser is not a trusted source of price.
 * Before charging the customer or recording the order in Medusa, we
 * fetch each variant from Medusa using the store API (with region_id)
 * and read the same `calculated_price` value the storefront uses. If
 * the client-sent amounts don't match (after a tiny rounding tolerance)
 * we refuse the request.
 *
 * Why store API rather than admin: Medusa v2's pricing module is
 * decoupled from products, so `variant.prices` is no longer reliable
 * on admin reads. The store endpoint returns `calculated_price` already
 * resolved for the active region's currency — exactly what
 * lib/medusa.ts::getPrice() reads on the storefront. Using the same
 * source guarantees server and client see identical numbers.
 *
 * Used by both /api/stripe/create-intent (pre-payment) and
 * /api/verify-payment (post-payment).
 */

import { REGIONS, type RegionId } from '@/lib/region'
import type { CartLine } from '@/lib/orderFulfillment'

interface ClientLine {
  variantId: string
  /** Required so we can look the variant up via /store/products?id[]= */
  productId?: string
  qty: number
  unitPriceKobo: number
}

interface CalculatedPrice {
  calculated_amount?: number
  currency_code?: string
}

interface StoreVariant {
  id: string
  calculated_price?: CalculatedPrice
  inventory_quantity?: number
  manage_inventory?: boolean
  allow_backorder?: boolean
}

/** A variant is purchasable when stock isn't tracked, backorder is on, or there's enough on hand. */
export function isVariantPurchasable(variant: StoreVariant, qty: number): boolean {
  if (variant.manage_inventory !== true) return true
  if (variant.allow_backorder === true) return true
  return (variant.inventory_quantity ?? 0) >= qty
}

interface StoreProduct {
  id: string
  variants?: StoreVariant[]
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

/**
 * Fetch every product in `productIds` from Medusa store API with the
 * region context attached, so `calculated_price` is populated.
 */
async function fetchProducts(
  productIds: string[],
  medusaRegionId: string
): Promise<StoreProduct[]> {
  const backend = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const publishable = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (!backend || !publishable) return []

  // Medusa v2 store API populates `variants.calculated_price` automatically
  // when `region_id` is passed. Additively request the inventory fields too
  // (the `+` keeps the default field set, including calculated_price) so we
  // can refuse out-of-stock lines before charging.
  const params = new URLSearchParams()
  for (const id of productIds) params.append('id[]', id)
  params.set('region_id', medusaRegionId)
  params.set('limit', String(productIds.length))
  params.set(
    'fields',
    '+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
  )

  try {
    const res = await fetch(`${backend}/store/products?${params.toString()}`, {
      headers: {
        'x-publishable-api-key': publishable,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[pricingGuard] store API returned', res.status)
      return []
    }
    const data = (await res.json()) as { products?: StoreProduct[] }
    return data.products ?? []
  } catch (err) {
    console.error('[pricingGuard] store API fetch failed', err)
    return []
  }
}

/**
 * Re-derive each line's price from Medusa and compare to what the
 * client sent. Tolerates a 1-unit-in-MINOR difference for rounding.
 *
 * Returns { ok: true, totalMinor, lines } on success — caller should
 * use `serverUnitPriceMinor` for any downstream charge / order line.
 *
 * Returns { ok: false, message } when:
 *   - Medusa is unreachable / unconfigured (fails closed so no charge
 *     happens when we can't verify)
 *   - A line is missing productId (legacy cart state)
 *   - A variant doesn't exist on the named product
 *   - A variant has no calculated price in the region's currency
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

  for (const line of lines) {
    if (!line.variantId || typeof line.variantId !== 'string') {
      return { ...empty, message: 'Invalid line item.' }
    }
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) {
      return { ...empty, message: 'Invalid quantity.' }
    }
    if (!line.productId) {
      return {
        ...empty,
        message: 'Cart is out of date. Please refresh and try again.',
      }
    }
  }

  const medusaRegionId = region.medusaRegionId
  if (!medusaRegionId) {
    console.error('[pricingGuard] no Medusa region id configured for', regionId)
    return { ...empty, message: 'Could not verify pricing. Please try again.' }
  }

  const productIds = Array.from(
    new Set(lines.map((l) => l.productId).filter(Boolean) as string[])
  )
  const products = await fetchProducts(productIds, medusaRegionId)
  if (products.length === 0) {
    return { ...empty, message: 'Could not verify pricing. Please try again.' }
  }

  const variantIndex = new Map<string, StoreVariant>()
  for (const p of products) {
    for (const v of p.variants ?? []) {
      variantIndex.set(v.id, v)
    }
  }

  const serverLines: ServerLine[] = []
  let totalMinor = 0

  for (const line of lines) {
    const variant = variantIndex.get(line.variantId)
    if (!variant) {
      return {
        ...empty,
        message: `Product ${line.variantId} is no longer available.`,
      }
    }

    // Refuse out-of-stock lines here, at the payment boundary. Otherwise we'd
    // charge the customer and then Medusa would reject the order on
    // `insufficient_inventory`, losing a paid order.
    if (!isVariantPurchasable(variant, line.qty)) {
      return {
        ...empty,
        message: 'One or more items in your cart are out of stock. Please review your cart.',
      }
    }

    const calc = variant.calculated_price
    const amountMajor = calc?.calculated_amount
    if (typeof amountMajor !== 'number') {
      return {
        ...empty,
        message: `Product ${line.variantId} is not available in ${targetCurrency.toUpperCase()}.`,
      }
    }
    if (calc?.currency_code && calc.currency_code.toLowerCase() !== targetCurrency) {
      return {
        ...empty,
        message: `Product ${line.variantId} is not available in ${targetCurrency.toUpperCase()}.`,
      }
    }

    // Medusa stores MAJOR units; the storefront contract is MINOR units.
    const serverUnitPriceMinor = amountMajor * 100

    // Allow a 1-MINOR-unit tolerance for rounding.
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

export interface VerifiedOrder {
  ok: boolean
  message?: string
  /** Server-derived total in MINOR units. */
  totalMinor: number
  /** Server-priced lines, shaped for fulfillOrder. */
  lines: CartLine[]
}

/**
 * Gate for fulfilling a *paid* order from any trigger (browser redirect OR
 * provider webhook). Runs two checks that must both pass:
 *
 *   1. Re-price every line against Medusa (rejects client-tampered prices).
 *   2. Assert the amount actually paid equals the server-derived total.
 *
 * Check 2 matters because the Paystack inline `amount` is set client-side, so
 * without it a customer could pay ₦1 for a full cart and still be fulfilled by
 * the webhook. Returns server-priced lines so the order record never trusts
 * client-sent prices.
 */
export async function verifyPaidOrder(
  rawLines: Array<{
    variantId: string
    productId?: string
    name: string
    variantLabel?: string
    qty: number
    unitPriceKobo: number
  }>,
  regionId: RegionId,
  paidAmountMinor: number
): Promise<VerifiedOrder> {
  const validation = await validateLinePricing(
    rawLines.map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      qty: l.qty,
      unitPriceKobo: l.unitPriceKobo,
    })),
    regionId
  )
  if (!validation.ok) {
    return { ok: false, message: validation.message, totalMinor: 0, lines: [] }
  }
  // Allow a 1-MINOR-unit tolerance for rounding between provider and Medusa.
  if (Math.abs(validation.totalMinor - paidAmountMinor) > 1) {
    return {
      ok: false,
      message: 'Amount paid does not match the order total.',
      totalMinor: validation.totalMinor,
      lines: [],
    }
  }
  const lines: CartLine[] = rawLines.map((l, i) => ({
    variantId: l.variantId,
    name: l.name,
    variantLabel: l.variantLabel,
    qty: l.qty,
    unitPriceKobo: validation.lines[i]?.serverUnitPriceMinor ?? l.unitPriceKobo,
  }))
  return { ok: true, totalMinor: validation.totalMinor, lines }
}
