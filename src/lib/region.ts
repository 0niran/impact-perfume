/**
 * Region + currency configuration for multi-market commerce.
 *
 * Nigeria (NGN, Paystack) is the primary market; Canada (CAD, Stripe) is the
 * diaspora market. Each region maps to a Medusa region_id, a currency, and a
 * payment provider.
 *
 * Add a region: extend REGIONS, add its env var binding, add CA prices to
 * Medusa products. Frontend reads everything from this single source.
 */

export type RegionId = 'NG' | 'CA'
export type Currency = 'NGN' | 'CAD'
export type PaymentProvider = 'paystack' | 'stripe'

export interface Region {
  id: RegionId
  name: string
  countryCode: string
  currency: Currency
  /** ISO 4217 lower-case, matches Medusa */
  currencyCode: 'ngn' | 'cad'
  /** Locale used for Intl.NumberFormat output */
  locale: string
  medusaRegionId: string | undefined
  /**
   * Publishable API key scoped to this market's sales channel. Determines which
   * stock location the storefront reads availability from. Falls back to the
   * shared key until a per-market key is provisioned.
   */
  publishableKey: string | undefined
  /**
   * Sales channel id for this market. When set, orders are attributed to it so
   * inventory reserves/decrements from that channel's location. Undefined uses
   * the backend default channel.
   */
  salesChannelId: string | undefined
  paymentProvider: PaymentProvider
  /** Whether this region can complete checkout end-to-end today */
  checkoutEnabled: boolean
  /** Free-delivery threshold expressed in the smallest currency unit */
  freeDeliveryThresholdMinor: number
  /**
   * How orders actually reach the customer in this market. Drives customer-facing
   * promises, so it must describe what we can genuinely do today.
   *
   * 'carrier'        — we ship, and waive the fee above freeDeliveryThresholdMinor
   *                    (Nigeria, via GIG).
   * 'pickup-or-quote'— collection is free, and shipping is priced per order and
   *                    quoted before payment (Canada). A market on this model has
   *                    no shipping service to promise, so "free delivery over X"
   *                    must not be shown — the threshold below is still used to
   *                    waive any fee that does get charged, but it is not a
   *                    customer promise.
   */
  deliveryModel: 'carrier' | 'pickup-or-quote'
}

export const REGIONS: Record<RegionId, Region> = {
  NG: {
    id: 'NG',
    name: 'Nigeria',
    countryCode: 'NG',
    currency: 'NGN',
    currencyCode: 'ngn',
    locale: 'en-NG',
    medusaRegionId: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
    publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    salesChannelId: process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID,
    paymentProvider: 'paystack',
    checkoutEnabled: true,
    freeDeliveryThresholdMinor: 20_000_000, // ₦200,000
    deliveryModel: 'carrier',
  },
  CA: {
    id: 'CA',
    name: 'Canada',
    countryCode: 'CA',
    currency: 'CAD',
    currencyCode: 'cad',
    locale: 'en-CA',
    medusaRegionId: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_CA,
    // Own key + channel so CA reads/decrements the Canada location. Falls back
    // to the shared key until NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA is set, so
    // this deploys with no behaviour change (CA keeps reading the shared pool).
    publishableKey:
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA ??
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    salesChannelId: process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID_CA,
    paymentProvider: 'stripe',
    checkoutEnabled: true,
    freeDeliveryThresholdMinor: 15_000, // CA$150
    // Collection in Brantford, or shipping quoted per order. No carrier service
    // to promise, so no free-delivery threshold is advertised.
    deliveryModel: 'pickup-or-quote',
  },
}

export const DEFAULT_REGION_ID: RegionId = 'NG'

export function getRegion(id: RegionId | string | null | undefined): Region {
  if (id && id in REGIONS) return REGIONS[id as RegionId]
  return REGIONS[DEFAULT_REGION_ID]
}

/**
 * Money formatting lives in one place: formatPrice(amountMinor, currency) in
 * @/lib/format. Import it there rather than re-adding a region-based variant.
 */

/** Free-shipping threshold for a given ISO currency code (uppercase). Falls back to 0. */
export function getShippingThreshold(currency: string): number {
  const region = Object.values(REGIONS).find((r) => r.currency === currency.toUpperCase())
  return region?.freeDeliveryThresholdMinor ?? 0
}
