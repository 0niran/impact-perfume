/**
 * Single source of truth for all site-level configuration.
 * Update values here, they propagate automatically across the codebase.
 */

export const SITE_CONFIG = {
  name: 'Impact Perfumes & Oils',
  shortName: 'Impact Perfumes',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://impactperfumes.com',
  locale: 'en_NG',

  contact: {
    email: 'sales@impactperfumes.com',
    phone: '+2349015900134',
    phoneDisplay: '+234 (0) 901 590 0134',
    address: {
      line1: '1st Floor, 18 Oseni Street',
      line2: 'Anthony Village, Lagos, Nigeria',
    },
  },

  social: {
    instagram: 'https://instagram.com/impact_perfumes',
    whatsapp: 'https://wa.me/2349015900134',
  },

  commerce: {
    // Free-delivery thresholds are per-region and live in lib/region.ts
    // (freeDeliveryThresholdMinor). Do not duplicate them here — a second copy
    // drifts (it was left at ₦50,000 after the NG threshold moved to ₦200,000).
    currency: 'NGN' as const,
    currencyLocale: 'en-NG' as const,
  },

  paystack: {
    scriptUrl: 'https://js.paystack.co/v1/inline.js',
    scriptId: 'paystack-inline',
  },
} as const

export type SiteConfig = typeof SITE_CONFIG

/**
 * Nigerian in-store pickup points. A customer choosing "pickup" at checkout
 * selects one of these instead of entering a delivery address. `address` is
 * recorded on the order (it satisfies ngShippingAddressSchema); `displayLines`
 * are what the storefront and confirmation emails show.
 */
export interface PickupLocation {
  id: string
  name: string
  displayLines: string[]
  address: {
    address1: string
    address2?: string
    city: string
    state: string
    country: 'Nigeria'
  }
}

export const NG_PICKUP_LOCATIONS: PickupLocation[] = [
  {
    id: 'anthony-village',
    name: 'Anthony Village',
    displayLines: ['1st Floor, 18 Oseni Street', 'Anthony Village, Lagos'],
    address: {
      address1: '1st Floor, 18 Oseni Street',
      city: 'Anthony Village',
      state: 'Lagos',
      country: 'Nigeria',
    },
  },
  {
    id: 'ikeja-city-mall',
    name: 'Ikeja City Mall',
    displayLines: ['Entrance 2, Ikeja City Mall', 'Opposite Nike Store', 'Ikeja, Lagos'],
    address: {
      address1: 'Entrance 2, Ikeja City Mall',
      address2: 'Opposite Nike Store',
      city: 'Ikeja',
      state: 'Lagos',
      country: 'Nigeria',
    },
  },
]

export function getPickupLocation(id: string | undefined | null): PickupLocation | undefined {
  if (!id) return undefined
  return NG_PICKUP_LOCATIONS.find((l) => l.id === id)
}
