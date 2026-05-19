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
  paymentProvider: PaymentProvider
  /** Whether this region can complete checkout end-to-end today */
  checkoutEnabled: boolean
  /** Free-delivery threshold expressed in the smallest currency unit */
  freeDeliveryThresholdMinor: number
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
    paymentProvider: 'paystack',
    checkoutEnabled: true,
    freeDeliveryThresholdMinor: 5_000_000, // 50,000 NGN
  },
  CA: {
    id: 'CA',
    name: 'Canada',
    countryCode: 'CA',
    currency: 'CAD',
    currencyCode: 'cad',
    locale: 'en-CA',
    medusaRegionId: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_CA,
    paymentProvider: 'stripe',
    checkoutEnabled: true,
    freeDeliveryThresholdMinor: 15_000, // 150 CAD
  },
}

export const DEFAULT_REGION_ID: RegionId = 'NG'

export function getRegion(id: RegionId | string | null | undefined): Region {
  if (id && id in REGIONS) return REGIONS[id as RegionId]
  return REGIONS[DEFAULT_REGION_ID]
}

export function formatPrice(amountMinor: number, region: Region): string {
  if (amountMinor === 0) return 'Coming soon'
  return new Intl.NumberFormat(region.locale, {
    style: 'currency',
    currency: region.currency,
    maximumFractionDigits: region.currency === 'NGN' ? 0 : 2,
  }).format(amountMinor / 100)
}

/** Shorthand when a price is known to be in NGN but we still want generic formatting */
export function formatPriceFromCurrency(amountMinor: number, currency: Currency | string): string {
  const region = Object.values(REGIONS).find((r) => r.currency === currency) ?? REGIONS[DEFAULT_REGION_ID]
  return formatPrice(amountMinor, region)
}

/** Free-shipping threshold for a given ISO currency code (uppercase). Falls back to 0. */
export function getShippingThreshold(currency: string): number {
  const region = Object.values(REGIONS).find((r) => r.currency === currency.toUpperCase())
  return region?.freeDeliveryThresholdMinor ?? 0
}
