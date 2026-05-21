import { describe, it, expect } from 'vitest'
import {
  REGIONS,
  DEFAULT_REGION_ID,
  getRegion,
  formatPrice,
  formatPriceFromCurrency,
  getShippingThreshold,
} from '../region'

describe('getRegion', () => {
  it('returns the matching region for NG', () => {
    expect(getRegion('NG').id).toBe('NG')
    expect(getRegion('NG').currency).toBe('NGN')
    expect(getRegion('NG').paymentProvider).toBe('paystack')
  })

  it('returns the matching region for CA', () => {
    expect(getRegion('CA').id).toBe('CA')
    expect(getRegion('CA').currency).toBe('CAD')
    expect(getRegion('CA').paymentProvider).toBe('stripe')
  })

  it('falls back to default for unknown ids', () => {
    expect(getRegion('XX' as 'NG' | 'CA').id).toBe(DEFAULT_REGION_ID)
    expect(getRegion(null).id).toBe(DEFAULT_REGION_ID)
    expect(getRegion(undefined).id).toBe(DEFAULT_REGION_ID)
    expect(getRegion('').id).toBe(DEFAULT_REGION_ID)
  })

  it('default region is Nigeria', () => {
    expect(DEFAULT_REGION_ID).toBe('NG')
  })
})

describe('region.formatPrice (region-based formatter)', () => {
  it('returns "Coming soon" for zero amount', () => {
    expect(formatPrice(0, REGIONS.NG)).toBe('Coming soon')
    expect(formatPrice(0, REGIONS.CA)).toBe('Coming soon')
  })

  it('formats NGN with no fraction digits', () => {
    expect(formatPrice(5_000_000, REGIONS.NG)).toBe('₦50,000')
  })

  it('formats CAD with 2 fraction digits', () => {
    expect(formatPrice(6_500, REGIONS.CA)).toMatch(/\$65/)
  })
})

describe('formatPriceFromCurrency', () => {
  it('routes to the right region by currency', () => {
    expect(formatPriceFromCurrency(5_000_000, 'NGN')).toBe('₦50,000')
    expect(formatPriceFromCurrency(6_500, 'CAD')).toMatch(/\$65/)
  })

  it('falls back to default region for unknown currencies', () => {
    // Unknown currency uses default (NGN) formatter
    expect(formatPriceFromCurrency(5_000_000, 'USD')).toBe('₦50,000')
  })
})

describe('getShippingThreshold', () => {
  it('returns the NGN threshold', () => {
    expect(getShippingThreshold('NGN')).toBe(5_000_000)
  })

  it('returns the CAD threshold', () => {
    expect(getShippingThreshold('CAD')).toBe(15_000)
  })

  it('is case-insensitive', () => {
    expect(getShippingThreshold('ngn')).toBe(5_000_000)
    expect(getShippingThreshold('cad')).toBe(15_000)
  })

  it('returns 0 for unknown currencies', () => {
    expect(getShippingThreshold('USD')).toBe(0)
    expect(getShippingThreshold('')).toBe(0)
  })
})

describe('REGIONS shape', () => {
  it('every region has the required fields', () => {
    for (const region of Object.values(REGIONS)) {
      expect(region.id).toBeTruthy()
      expect(region.currency).toBeTruthy()
      expect(region.currencyCode).toBeTruthy()
      expect(region.paymentProvider).toBeTruthy()
      expect(region.freeDeliveryThresholdMinor).toBeGreaterThanOrEqual(0)
    }
  })
})
