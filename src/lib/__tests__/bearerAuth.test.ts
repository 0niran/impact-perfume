import { describe, it, expect } from 'vitest'
import { bearerMatches } from '@/lib/bearerAuth'

const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

describe('bearerMatches', () => {
  it('accepts the exact token', () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(bearerMatches(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(bearerMatches('Bearer nope', SECRET)).toBe(false)
  })

  // The reason this helper exists: a secret pasted into a hosting dashboard
  // picks up a newline, and every request 401s with nothing to explain why.
  it('tolerates whitespace around the stored secret', () => {
    expect(bearerMatches(`Bearer ${SECRET}`, `${SECRET}\n`)).toBe(true)
    expect(bearerMatches(`Bearer ${SECRET}`, `  ${SECRET}  `)).toBe(true)
  })

  it('tolerates whitespace around the sent header', () => {
    expect(bearerMatches(`Bearer ${SECRET}\n`, SECRET)).toBe(true)
    expect(bearerMatches(`  Bearer   ${SECRET}  `, SECRET)).toBe(true)
  })

  it('accepts any case of the Bearer scheme', () => {
    expect(bearerMatches(`bearer ${SECRET}`, SECRET)).toBe(true)
    expect(bearerMatches(`BEARER ${SECRET}`, SECRET)).toBe(true)
  })

  it('fails closed when no secret is configured', () => {
    expect(bearerMatches(`Bearer ${SECRET}`, undefined)).toBe(false)
    expect(bearerMatches(`Bearer ${SECRET}`, '')).toBe(false)
    // A secret that is only whitespace is not a secret.
    expect(bearerMatches('Bearer    ', '   ')).toBe(false)
  })

  it('rejects a missing or malformed header', () => {
    expect(bearerMatches(null, SECRET)).toBe(false)
    expect(bearerMatches('', SECRET)).toBe(false)
    expect(bearerMatches(SECRET, SECRET)).toBe(false) // no scheme
    expect(bearerMatches(`Basic ${SECRET}`, SECRET)).toBe(false)
  })

  it('rejects a token that merely starts with the secret', () => {
    expect(bearerMatches(`Bearer ${SECRET}extra`, SECRET)).toBe(false)
    expect(bearerMatches(`Bearer ${SECRET.slice(0, 10)}`, SECRET)).toBe(false)
  })
})
