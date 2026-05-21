import { describe, it, expect } from 'vitest'
import { formatPrice, formatNaira, truncate } from '../format'

describe('formatPrice', () => {
  it('formats NGN as ₦ with no decimals', () => {
    expect(formatPrice(5_000_000, 'NGN')).toBe('₦50,000')
  })

  it('formats CAD with CA$ prefix and 2 decimals', () => {
    expect(formatPrice(6_500, 'CAD')).toBe('CA$65.00')
  })

  it('handles zero correctly', () => {
    expect(formatPrice(0, 'NGN')).toBe('₦0')
    expect(formatPrice(0, 'CAD')).toBe('CA$0.00')
  })

  it('handles fractional CAD amounts', () => {
    expect(formatPrice(6_550, 'CAD')).toBe('CA$65.50')
    expect(formatPrice(99, 'CAD')).toBe('CA$0.99')
  })

  it('defaults to NGN when currency is omitted', () => {
    expect(formatPrice(5_000_000)).toBe('₦50,000')
  })

  it('uppercases lowercase currency codes', () => {
    expect(formatPrice(5_000_000, 'ngn')).toBe('₦50,000')
    expect(formatPrice(6_500, 'cad')).toBe('CA$65.00')
  })

  it('falls back gracefully for unknown currencies', () => {
    const result = formatPrice(1000, 'GBP')
    expect(result).toMatch(/£10\.00/)
  })
})

describe('formatNaira (deprecated alias)', () => {
  it('still works for back-compat', () => {
    expect(formatNaira(5_000_000)).toBe('₦50,000')
  })
})

describe('truncate', () => {
  it('returns the input untouched when under limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis when over limit', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello wor…')
  })

  it('respects the exact max boundary', () => {
    expect(truncate('exact', 5)).toBe('exact')
    expect(truncate('exact!', 5)).toBe('exac…')
  })
})
