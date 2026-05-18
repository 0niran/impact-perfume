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
    /** Free delivery threshold in kobo (₦50,000 = 5,000,000 kobo) */
    freeDeliveryThresholdKobo: 5_000_000,
    freeDeliveryDisplay: '₦50,000',
    currency: 'NGN' as const,
    currencyLocale: 'en-NG' as const,
  },

  paystack: {
    scriptUrl: 'https://js.paystack.co/v1/inline.js',
    scriptId: 'paystack-inline',
  },
} as const

export type SiteConfig = typeof SITE_CONFIG
