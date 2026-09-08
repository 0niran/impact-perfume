import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * The four product pages drifted apart because each was written separately.
 * The audit found real consequences, not just cosmetic ones:
 *
 *  - the Signature page had no stock check at all, so an out-of-stock scent
 *    could be added to the cart and was only refused at checkout
 *  - it also had no Product JSON-LD and no canonical
 *  - /products/[handle] — the page for candles, home and car diffusers and
 *    scenting machines — had neither, plus no delivery terms
 *
 * This asserts the floor every product page has to meet. It is deliberately
 * source-level: these are page compositions, not units, and the cheap check
 * that catches the next omission is "does this file wire the thing up".
 */
const PDPS = [
  'src/app/no/[number]/page.tsx',
  'src/app/oil/[number]/page.tsx',
  'src/app/signature/[handle]/page.tsx',
  'src/app/products/[handle]/page.tsx',
] as const

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

describe.each(PDPS)('%s', (rel) => {
  const src = read(rel)

  it('emits Product structured data', () => {
    expect(src).toContain('buildProductJsonLd')
  })

  it('emits a breadcrumb trail', () => {
    expect(src).toContain('buildBreadcrumbJsonLd')
  })

  it('declares a canonical url', () => {
    expect(src).toContain('canonical')
  })

  it('renders structured data server-side, not through next/script', () => {
    // next/script defaults to afterInteractive and injects from the client,
    // which leaves the markup out of the server response.
    if (src.includes('application/ld+json')) {
      expect(src).not.toMatch(/<Script[^>]*ld\+json/s)
    }
  })

  it('derives availability from stock rather than assuming it', () => {
    expect(src).toContain('variantInStock')
  })

  it('shows region-aware delivery terms', () => {
    expect(src).toContain('shippingCopyFor')
  })

  it('renders notes through the shared pyramid', () => {
    // Every page had notes; two of them drew their own markup for it.
    expect(src).toMatch(/NotesPyramid|InfoRail/)
  })

  it('offers reviews', () => {
    expect(src).toContain('ReviewsBlock')
  })
})

describe('signature buy box', () => {
  const src = read('src/components/signature/SignatureAddToCart.tsx')

  it('accepts stock state', () => {
    expect(src).toContain('inStock')
  })

  it('refuses to add when out of stock', () => {
    expect(src).toContain('if (!inStock) return')
  })

  it('does not hardcode a variant label', () => {
    // Every signature product used to carry "100ml EDP" into the cart and the
    // confirmation email regardless of the size actually bought.
    expect(src).not.toContain("variantLabel: '100ml EDP'")
  })
})
