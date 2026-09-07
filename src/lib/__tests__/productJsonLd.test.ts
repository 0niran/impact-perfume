import { describe, it, expect } from 'vitest'
import {
  buildProductJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  jsonLdScript,
} from '@/lib/jsonLd'
import { SITE_URL } from '@/lib/config'

function product(overrides: Partial<Parameters<typeof buildProductJsonLd>[0]> = {}) {
  return buildProductJsonLd({
    name: 'Impact No. 11',
    description: 'Sicilian sunlight on cool wood.',
    path: '/no/11',
    category: 'Fragrance',
    imageUrl: 'https://cdn.example.com/no-11.png',
    sku: 'NO-11-100',
    priceMinor: 4_200_000,
    currency: 'NGN',
    inStock: true,
    ...overrides,
  })
}

describe('buildProductJsonLd', () => {
  it('reports OutOfStock when the variant is not available', () => {
    // The whole point of the change: availability used to be hardcoded to
    // InStock, so Google was told the entire catalogue was buyable while most
    // of it was not.
    const offers = product({ inStock: false }).offers as Record<string, unknown>
    expect(offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('reports InStock when the variant is available', () => {
    const offers = product({ inStock: true }).offers as Record<string, unknown>
    expect(offers.availability).toBe('https://schema.org/InStock')
  })

  it('includes the product image, without which there is no rich result', () => {
    expect(product().image).toEqual(['https://cdn.example.com/no-11.png'])
  })

  it('absolutises a relative image path', () => {
    expect(product({ imageUrl: '/images/no_series.png' }).image).toEqual([
      `${SITE_URL}/images/no_series.png`,
    ])
  })

  it('omits image and sku rather than emitting empty values', () => {
    const data = product({ imageUrl: null, sku: null })
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('sku')
  })

  it('converts minor units to a major-unit price string', () => {
    const offers = product({ priceMinor: 4_200_000 }).offers as Record<string, unknown>
    expect(offers.price).toBe('42000.00')
    expect(offers.priceCurrency).toBe('NGN')
  })

  it('omits offers entirely when there is no price', () => {
    // "Price on request" is a real state here; an Offer with price 0 would
    // advertise the product as free.
    expect(product({ priceMinor: 0 })).not.toHaveProperty('offers')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('numbers the trail from one and absolutises each item', () => {
    const data = buildBreadcrumbJsonLd([
      { name: 'Number Series', path: '/no-series' },
      { name: 'No. 11', path: '/no/11' },
    ])
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Number Series', item: `${SITE_URL}/no-series` },
      { '@type': 'ListItem', position: 2, name: 'No. 11', item: `${SITE_URL}/no/11` },
    ])
  })
})

describe('buildOrganizationJsonLd', () => {
  it('carries a contact point for each market', () => {
    const points = buildOrganizationJsonLd().contactPoint as Array<Record<string, unknown>>
    expect(points.map((p) => p.areaServed).sort()).toEqual(['CA', 'NG'])
    expect(points.find((p) => p.areaServed === 'CA')?.telephone).toBe('+12269666779')
  })
})

describe('jsonLdScript', () => {
  it('cannot break out of the surrounding script tag', () => {
    const html = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' })
    expect(html).not.toContain('</script>')
    expect(html).not.toContain('<img')
  })

  it('still parses back to the original data', () => {
    const value = { name: 'A & B <c>', nested: { path: '/no/11' } }
    expect(JSON.parse(jsonLdScript(value))).toEqual(value)
  })
})
