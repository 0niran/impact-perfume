import { describe, it, expect } from 'vitest'
import { packStripeLines, unpackStripeLines } from '@/lib/stripeMetadata'

const STRIPE_VALUE_LIMIT = 500

function lineArray(count: number): string {
  return JSON.stringify(
    Array.from({ length: count }, (_, i) => ({
      v: `variant_01KQX7DN9401MS0AKJ13KWHNY${i}`,
      n: `Impact No. ${i + 1}`,
      l: '100ml · Eau de Parfum',
      q: 1,
      p: 6500,
    }))
  )
}

describe('stripe metadata line chunking', () => {
  it('keeps a small cart in the single `lines` key (backwards compatible)', () => {
    const serialized = lineArray(1)
    const packed = packStripeLines(serialized)
    expect(Object.keys(packed)).toEqual(['lines'])
    expect(packed.lines).toBe(serialized)
  })

  it('splits a large cart across numbered keys, each under Stripe’s 500-char limit', () => {
    const serialized = lineArray(6) // ~720 chars — the size that broke checkout
    const packed = packStripeLines(serialized)
    expect(Object.keys(packed).length).toBeGreaterThan(1)
    for (const value of Object.values(packed)) {
      expect(value.length).toBeLessThanOrEqual(STRIPE_VALUE_LIMIT)
    }
  })

  it('round-trips a large cart back to the original payload', () => {
    const serialized = lineArray(50) // max cart
    const packed = packStripeLines(serialized)
    expect(unpackStripeLines(packed)).toBe(serialized)
    expect(JSON.parse(unpackStripeLines(packed))).toHaveLength(50)
  })

  it('reads a legacy single-key intent unchanged', () => {
    const serialized = lineArray(2)
    expect(unpackStripeLines({ lines: serialized })).toBe(serialized)
  })

  it('handles empty / missing metadata safely', () => {
    expect(unpackStripeLines({})).toBe('')
    expect(unpackStripeLines(null)).toBe('')
    expect(unpackStripeLines(undefined)).toBe('')
    expect(packStripeLines('').lines).toBe('')
  })
})
