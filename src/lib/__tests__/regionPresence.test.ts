import { describe, it, expect } from 'vitest'
import {
  REGION_PRESENCE,
  getRegionPresence,
  getPresenceForCurrency,
} from '@/lib/config'
import { buildBespokeCustomerEmail, type BespokeEmailData } from '@/lib/email'

/**
 * A Canadian customer reaching the Lagos line is a real support failure: an
 * international call they pay for, answered in a timezone that is five hours
 * ahead. These lock the market split so a future edit to config.ts cannot
 * quietly collapse the two markets back onto one number.
 */
describe('getRegionPresence', () => {
  it('returns the Canadian line for CA', () => {
    const presence = getRegionPresence('CA')
    expect(presence.phone).toBe('+12269666779')
    expect(presence.phoneDisplay).toBe('+1 (226) 966 6779')
    expect(presence.whatsapp).toBe('https://wa.me/12269666779')
  })

  it('returns the Nigerian line for NG', () => {
    const presence = getRegionPresence('NG')
    expect(presence.phone).toBe('+2349015900134')
    expect(presence.whatsapp).toBe('https://wa.me/2349015900134')
  })

  it('falls back to the head office for an unknown or missing region', () => {
    // The region arrives from a cookie, so it is not guaranteed to be valid.
    expect(getRegionPresence(undefined)).toBe(REGION_PRESENCE.NG)
    expect(getRegionPresence(null)).toBe(REGION_PRESENCE.NG)
    expect(getRegionPresence('')).toBe(REGION_PRESENCE.NG)
    expect(getRegionPresence('XX')).toBe(REGION_PRESENCE.NG)
    expect(getRegionPresence('ca')).toBe(REGION_PRESENCE.NG)
  })

  it('gives each market a distinct number and address', () => {
    expect(REGION_PRESENCE.CA.phone).not.toBe(REGION_PRESENCE.NG.phone)
    expect(REGION_PRESENCE.CA.whatsapp).not.toBe(REGION_PRESENCE.NG.whatsapp)
    expect(REGION_PRESENCE.CA.addressLines).not.toEqual(REGION_PRESENCE.NG.addressLines)
  })

  it('uses a wa.me link with no plus or spaces, which wa.me rejects', () => {
    for (const presence of Object.values(REGION_PRESENCE)) {
      expect(presence.whatsapp).toMatch(/^https:\/\/wa\.me\/\d{10,15}$/)
      // The wa.me path is the E.164 number without its leading plus.
      expect(presence.whatsapp).toBe(`https://wa.me/${presence.phone.replace('+', '')}`)
    }
  })
})

describe('getPresenceForCurrency', () => {
  it('treats a CAD order as Canadian', () => {
    expect(getPresenceForCurrency('CAD')).toBe(REGION_PRESENCE.CA)
    expect(getPresenceForCurrency('cad')).toBe(REGION_PRESENCE.CA)
  })

  it('treats everything else as the head office', () => {
    expect(getPresenceForCurrency('NGN')).toBe(REGION_PRESENCE.NG)
    expect(getPresenceForCurrency(undefined)).toBe(REGION_PRESENCE.NG)
    expect(getPresenceForCurrency(null)).toBe(REGION_PRESENCE.NG)
    expect(getPresenceForCurrency('USD')).toBe(REGION_PRESENCE.NG)
  })
})

describe('transactional email footer', () => {
  function data(overrides: Partial<BespokeEmailData> = {}): BespokeEmailData {
    return {
      inquiryId: 'inq_123',
      customerName: 'Amara Okafor',
      customerEmail: 'amara@example.com',
      customerPhone: '+234 901 590 0134',
      currency: 'NGN',
      quantity: 6,
      volumeLabel: '100ml',
      bottleTypeLabel: 'Matted',
      inscriptionLabel: 'Gold foil',
      engravingLine1: 'Amara',
      colorName: 'Oud Noir',
      city: 'Lagos',
      totalMinor: 51_300_000,
      depositMinor: 25_650_000,
      needsQuote: false,
      ...overrides,
    }
  }

  it('shows the Canadian number and address on a CAD order', () => {
    const { html } = buildBespokeCustomerEmail(data({ currency: 'CAD', city: 'Brantford' }))
    expect(html).toContain('+1 (226) 966 6779')
    expect(html).toContain('tel:+12269666779')
    expect(html).toContain('Brantford, ON N3T 0R8, Canada')
    expect(html).not.toContain('+234 (0) 901 590 0134')
  })

  it('shows the Nigerian number and address on an NGN order', () => {
    const { html } = buildBespokeCustomerEmail(data({ currency: 'NGN' }))
    expect(html).toContain('+234 (0) 901 590 0134')
    expect(html).toContain('Anthony Village, Lagos, Nigeria')
    expect(html).not.toContain('+1 (226) 966 6779')
  })
})
