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
    email: 'hello@impactperfumes.com',
    phone: '+2349015900134',
    phoneDisplay: '+234 (0) 901 590 0134',
    address: {
      line1: '1st Floor, 18 Oseni Street',
      line2: 'Anthony Village, Lagos, Nigeria',
    },
  },

  social: {
    instagram: 'https://instagram.com/impact_perfumes',
    // WhatsApp is per-market and lives in REGION_PRESENCE below. A second copy
    // here would drift the moment one market's number changes, which is exactly
    // how the free-delivery threshold went stale.
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
 * Per-market presence. The footer, pickup instructions and confirmation emails
 * must show the address of the market the visitor is shopping, not the Lagos
 * head office in every case — a Canadian customer told to collect in Anthony
 * Village is a support ticket at best.
 *
 * `whatsapp` is part of this for the same reason the phone number is: a
 * Canadian tapping the chat button should reach the Canadian line, not an
 * international number that costs them to dial and answers in another timezone.
 *
 * Keyed by RegionId. Kept here rather than in lib/region.ts so region.ts stays
 * a pure commerce/currency description with no presentational content.
 */
export const REGION_PRESENCE = {
  NG: {
    addressLines: ['1st Floor, 18 Oseni Street', 'Anthony Village, Lagos, Nigeria'],
    phone: '+2349015900134',
    phoneDisplay: '+234 (0) 901 590 0134',
    whatsapp: 'https://wa.me/2349015900134',
  },
  CA: {
    addressLines: ['123 Longboat Run W', 'Brantford, ON N3T 0R8, Canada'],
    phone: '+12269666779',
    phoneDisplay: '+1 (226) 966 6779',
    whatsapp: 'https://wa.me/12269666779',
  },
} as const

export type RegionPresence = (typeof REGION_PRESENCE)[keyof typeof REGION_PRESENCE]

/**
 * The registered companies behind each market.
 *
 * These are what a customer contracts with and what controls their data, so
 * they appear on the Terms and Privacy pages. The trading name in SITE_CONFIG
 * is what the storefront, footer and emails show; this is the legal name and
 * must match the registration certificate exactly.
 *
 * Defined once so the two legal documents cannot disagree about who the
 * seller is. A null number renders as a visible placeholder rather than being
 * dropped: Nigerian companies must show their RC number on official
 * communications, so a missing one should be obvious, not silent.
 */
export const LEGAL_ENTITIES = {
  NG: {
    name: 'Impact Arabian Perfumes and Oil Ltd',
    registrationLabel: 'RC',
    registrationNumber: null as string | null,
  },
  CA: {
    name: 'Impact Arabian Perfumes and Oils',
    registrationLabel: 'Business Identification No.',
    registrationNumber: '1001430614' as string | null,
  },
} as const

/** "RC 123456", or a visible placeholder while the number is outstanding. */
export function registrationLine(entity: (typeof LEGAL_ENTITIES)[keyof typeof LEGAL_ENTITIES]): string {
  return `${entity.registrationLabel} ${entity.registrationNumber ?? '[NUMBER PENDING]'}`
}

/**
 * Presence for a market, falling back to Nigeria (the head office) for anything
 * unrecognised. Callers should never index REGION_PRESENCE directly: the region
 * can arrive from a cookie, so it is not guaranteed to be a valid key.
 */
export function getRegionPresence(regionId: string | undefined | null): RegionPresence {
  if (regionId === 'CA') return REGION_PRESENCE.CA
  return REGION_PRESENCE.NG
}

/**
 * Presence inferred from an order's currency.
 *
 * Transactional emails are built off an order, which carries a currency but no
 * region id, and threading a region through every template would duplicate a
 * fact the currency already settles: a CAD order is a Canadian order. Anything
 * that is not CAD gets the Lagos details, so a missing or odd currency degrades
 * to the head office rather than to the wrong market.
 */
export function getPresenceForCurrency(currency: string | undefined | null): RegionPresence {
  return currency?.toUpperCase() === 'CAD' ? REGION_PRESENCE.CA : REGION_PRESENCE.NG
}

/** Canonical absolute origin. Single source of truth for absolute URLs. */
export const SITE_URL = SITE_CONFIG.url

/**
 * The domain the store will ultimately be served from, once DNS is cut over
 * from the legacy WordPress host to Vercel.
 */
const CANONICAL_HOST = 'impactperfumes.com'

/**
 * Whether this deployment is the real, public storefront.
 *
 * Derived from NEXT_PUBLIC_SITE_URL rather than a separate "is live" flag, on
 * purpose: the domain cutover already changes that variable, so search-engine
 * visibility flips as a natural consequence of the switch instead of being a
 * second step somebody has to remember. Preview and vercel.app deployments are
 * never the canonical host, so they are never indexable.
 *
 * Search visibility is one-way in practice — getting the pre-launch domain
 * indexed creates duplicate content that competes with the real domain and
 * takes weeks for Google to drop — so the safe default is "not indexable", and
 * only an exact canonical-host match opts in.
 */
export const IS_CANONICAL_DOMAIN: boolean = (() => {
  try {
    const host = new URL(SITE_CONFIG.url).host.toLowerCase()
    return host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}`
  } catch {
    return false
  }
})()

export type PickupCountry = 'Nigeria' | 'Canada'

/**
 * Parameterised on country so each market's list stays narrowly typed. The NG
 * checkout builds an order whose address must be `country: 'Nigeria'`, and
 * keeping that in the type stops a Canadian collection point being handed to
 * the Nigerian rail.
 */
export interface PickupLocation<C extends PickupCountry = PickupCountry> {
  id: string
  name: string
  displayLines: string[]
  address: {
    address1: string
    address2?: string
    city: string
    state: string
    country: C
  }
  /** Shown under the address so a customer knows when they can actually collect. */
  collectionNote?: string
}

/**
 * Nigerian in-store pickup points. A customer choosing "pickup" at checkout
 * selects one of these instead of entering a delivery address. `address` is
 * recorded on the order (it satisfies ngShippingAddressSchema); `displayLines`
 * are what the storefront and confirmation emails show.
 */
export const NG_PICKUP_LOCATIONS: PickupLocation<'Nigeria'>[] = [
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
]

/**
 * Canadian collection point. This is the same Brantford address that acts as
 * the CA stock location and tax origin, so what a customer is told matches
 * where the inventory actually is.
 */
export const CA_PICKUP_LOCATIONS: PickupLocation<'Canada'>[] = [
  {
    id: 'brantford',
    name: 'Brantford, Ontario',
    displayLines: ['123 Longboat Run W', 'Brantford, ON N3T 0R8'],
    address: {
      address1: '123 Longboat Run W',
      city: 'Brantford',
      state: 'ON',
      country: 'Canada',
    },
    collectionNote:
      'We will email you as soon as your order is ready, and arrange a collection time that suits you.',
  },
]

/** Any market's collection point, for display and order records. */
export function getPickupLocation(id: string | undefined | null): PickupLocation | undefined {
  if (!id) return undefined
  return [...NG_PICKUP_LOCATIONS, ...CA_PICKUP_LOCATIONS].find((l) => l.id === id)
}

/**
 * Nigeria-only lookup. The NG checkout composes an address that must be
 * `country: 'Nigeria'`, so it resolves through this rather than the generic
 * helper, and the compiler enforces it.
 */
export function getNgPickupLocation(
  id: string | undefined | null
): PickupLocation<'Nigeria'> | undefined {
  if (!id) return undefined
  return NG_PICKUP_LOCATIONS.find((l) => l.id === id)
}
