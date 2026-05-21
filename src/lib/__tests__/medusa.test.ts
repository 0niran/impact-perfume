import { describe, it, expect, vi } from 'vitest'
import type { MedusaProduct } from '@/types'
import { getPrice, normaliseImageUrl } from '../medusa'

function product(overrides: Partial<MedusaProduct> = {}): MedusaProduct {
  return {
    id: 'prod_test',
    handle: 'no-1',
    title: 'Impact No. 1',
    variants: [],
    ...overrides,
  }
}

describe('getPrice — unit boundary (×100)', () => {
  it('multiplies calculated_amount by 100 (Medusa MAJOR → storefront MINOR)', () => {
    const p = product({
      variants: [
        {
          id: 'v1',
          calculated_price: {
            calculated_amount: 50_000, // Medusa stores ₦50,000 as 50000 (major)
            original_amount: 50_000,
            currency_code: 'ngn',
          },
        },
      ],
    })
    const result = getPrice(p, 'NGN')
    // Storefront expects minor units: 50,000 × 100 = 5,000,000 kobo
    expect(result.amount).toBe(5_000_000)
    expect(result.currency).toBe('NGN')
  })

  it('multiplies CAD calculated_amount by 100 too', () => {
    const p = product({
      variants: [
        {
          id: 'v1',
          calculated_price: {
            calculated_amount: 65, // Medusa stores CAD $65 as 65 (major)
            original_amount: 65,
            currency_code: 'cad',
          },
        },
      ],
    })
    const result = getPrice(p, 'CAD')
    // Storefront expects minor units: 65 × 100 = 6,500 cents
    expect(result.amount).toBe(6_500)
    expect(result.currency).toBe('CAD')
  })

  it('multiplies fallback prices[] entries by 100', () => {
    const p = product({
      variants: [
        {
          id: 'v1',
          prices: [
            { amount: 50_000, currency_code: 'ngn' },
            { amount: 65, currency_code: 'cad' },
          ],
        },
      ],
    })
    expect(getPrice(p, 'NGN').amount).toBe(5_000_000)
    expect(getPrice(p, 'CAD').amount).toBe(6_500)
  })

  it('returns zero when product has no variants', () => {
    expect(getPrice(product()).amount).toBe(0)
  })

  it('returns zero when variant has no prices', () => {
    expect(getPrice(product({ variants: [{ id: 'v1' }] })).amount).toBe(0)
  })

  it('uses first available price as last resort when currency not found', () => {
    const p = product({
      variants: [
        {
          id: 'v1',
          prices: [{ amount: 50_000, currency_code: 'ngn' }],
        },
      ],
    })
    // Requesting CAD but only NGN exists → returns NGN as fallback
    expect(getPrice(p, 'CAD').amount).toBe(5_000_000)
    expect(getPrice(p, 'CAD').currency).toBe('NGN')
  })

  it('prefers calculated_price over prices[]', () => {
    const p = product({
      variants: [
        {
          id: 'v1',
          calculated_price: { calculated_amount: 999, original_amount: 999, currency_code: 'ngn' },
          prices: [{ amount: 111, currency_code: 'ngn' }],
        },
      ],
    })
    expect(getPrice(p, 'NGN').amount).toBe(999 * 100)
  })
})

describe('normaliseImageUrl', () => {
  it('returns null for null/undefined/empty inputs', () => {
    expect(normaliseImageUrl(null)).toBeNull()
    expect(normaliseImageUrl(undefined)).toBeNull()
    expect(normaliseImageUrl('')).toBeNull()
  })

  it('returns the URL unchanged when not a localhost URL', () => {
    expect(
      normaliseImageUrl('https://impact-perfumes-medusa-production.up.railway.app/uploads/img.png')
    ).toBe('https://impact-perfumes-medusa-production.up.railway.app/uploads/img.png')
  })

  it('returns the original string for malformed URLs', () => {
    expect(normaliseImageUrl('not a url')).toBe('not a url')
  })
})

describe('normaliseImageUrl — localhost rewrite (env-stubbed)', () => {
  it('rewrites localhost host to the configured backend host', async () => {
    // BACKEND_URL is captured at module import time, so we stub env then
    // dynamic-import a fresh copy of the module.
    vi.resetModules()
    vi.stubEnv(
      'NEXT_PUBLIC_MEDUSA_BACKEND_URL',
      'https://impact-perfumes-medusa-production.up.railway.app'
    )
    const fresh = await import('../medusa')
    const result = fresh.normaliseImageUrl('http://localhost:9000/uploads/img.png')
    expect(result).not.toMatch(/localhost/)
    expect(result).toMatch(/impact-perfumes-medusa-production\.up\.railway\.app/)
    vi.unstubAllEnvs()
  })
})
