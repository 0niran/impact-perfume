import { describe, it, expect } from 'vitest'
import { COUNTRY_CODES, countryOptions } from '../constants'

describe('countryOptions (worldwide shipping selector)', () => {
  const options = countryOptions()

  it('returns one option per country code', () => {
    expect(options).toHaveLength(COUNTRY_CODES.length)
    expect(options.length).toBeGreaterThan(180)
  })

  it('resolves human-readable names for key markets', () => {
    const byCode = Object.fromEntries(options.map((o) => [o.code, o.name]))
    expect(byCode.CA).toBe('Canada')
    expect(byCode.NG).toBe('Nigeria')
    expect(byCode.US).toBe('United States')
    expect(byCode.GB).toBe('United Kingdom')
  })

  it('is sorted alphabetically by display name', () => {
    const names = options.map((o) => o.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  it('never emits an empty name (guards against a bad code)', () => {
    expect(options.every((o) => o.name.trim().length > 0)).toBe(true)
  })

  it('has no duplicate codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
  })
})
