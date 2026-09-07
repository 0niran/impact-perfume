import { SITE_URL, SITE_CONFIG, REGION_PRESENCE } from '@/lib/config'

/**
 * Serialise structured data for embedding in an inline
 * `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is unsafe here: it does not escape `<`, `>` or `&`, so
 * any interpolated value that contains the literal `</script>` (or an HTML
 * comment opener) would terminate the script element and let arbitrary markup
 * through. Escaping those characters as JSON unicode escapes keeps the parsed
 * data byte-for-byte identical for schema.org consumers while guaranteeing the
 * serialised string can never break out of the surrounding tag.
 *
 * U+2028 / U+2029 are also escaped: they are valid in JSON strings but are line
 * terminators in a `<script>` context and can break some parsers.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'))
}

/** Schema.org requires absolute URLs. Product images may already be absolute. */
function absolute(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export interface ProductJsonLdInput {
  name: string
  description: string
  /** Path only, eg. /no/11. */
  path: string
  category: string
  imageUrl?: string | null
  sku?: string | null
  /** MINOR units, as the rest of the storefront carries prices. */
  priceMinor: number
  currency: string
  inStock: boolean
}

/**
 * Product structured data.
 *
 * Availability is derived, not assumed. It used to be hardcoded to InStock on
 * every product, which told Google the whole catalogue was buyable while most
 * of it was not \u2014 the sort of mismatch that costs rich-result eligibility and
 * sends shoppers to a dead "Out of stock" button from the search page.
 *
 * `image` matters too: Google will not grant a product rich result without one,
 * and both PDPs were already computing the image and then dropping it.
 */
export function buildProductJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
  const url = `${SITE_URL}${input.path}`
  const image = absolute(input.imageUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url,
    ...(image && { image: [image] }),
    ...(input.sku && { sku: input.sku }),
    brand: { '@type': 'Brand', name: SITE_CONFIG.name },
    category: input.category,
    ...(input.priceMinor > 0 && {
      offers: {
        '@type': 'Offer',
        price: (input.priceMinor / 100).toFixed(2),
        priceCurrency: input.currency,
        availability: input.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url,
        seller: { '@type': 'Organization', name: SITE_CONFIG.name },
      },
    }),
  }
}

/**
 * Breadcrumb trail. The PDPs already render a visual breadcrumb; this makes the
 * same hierarchy legible to a crawler, which is what turns a bare URL into a
 * "Number Series \u203a No. 11" line in the results page.
 */
export function buildBreadcrumbJsonLd(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  }
}

/**
 * Organisation identity, emitted once from the root layout.
 *
 * This is what lets a search engine treat the house as an entity rather than a
 * loose set of pages: it ties the name, logo, social profile and both markets'
 * contact numbers together. Without it there is nothing to attach a brand
 * knowledge panel to.
 */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.shortName,
    url: SITE_URL,
    logo: `${SITE_URL}/images/Logo.png`,
    image: `${SITE_URL}/opengraph-image`,
    description:
      'A luxury house of fragrance composing eaux de parfum, concentrated oils and home scents.',
    email: SITE_CONFIG.contact.email,
    sameAs: [SITE_CONFIG.social.instagram],
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: '1st Floor, 18 Oseni Street',
        addressLocality: 'Anthony Village',
        addressRegion: 'Lagos',
        addressCountry: 'NG',
      },
      {
        '@type': 'PostalAddress',
        streetAddress: '123 Longboat Run W',
        addressLocality: 'Brantford',
        addressRegion: 'ON',
        postalCode: 'N3T 0R8',
        addressCountry: 'CA',
      },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: REGION_PRESENCE.NG.phone,
        areaServed: 'NG',
        availableLanguage: 'English',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: REGION_PRESENCE.CA.phone,
        areaServed: 'CA',
        availableLanguage: 'English',
      },
    ],
  }
}

/** Site entity, so the brand name resolves to this domain. */
export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_URL,
    publisher: { '@type': 'Organization', name: SITE_CONFIG.name },
  }
}
