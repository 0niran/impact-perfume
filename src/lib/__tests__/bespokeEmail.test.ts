import { describe, it, expect } from 'vitest'
import {
  buildBespokeCustomerEmail,
  buildBespokeTeamEmail,
  type BespokeEmailData,
} from '@/lib/email'

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

describe('bespoke customer email', () => {
  it('states plainly that nothing has been charged', () => {
    // A bespoke submit takes no payment. If that is not explicit the customer
    // either thinks they bought something or waits for a charge that never comes.
    const { html } = buildBespokeCustomerEmail(data())
    expect(html).toMatch(/Nothing has been charged/i)
  })

  it('labels the figure an estimate, not a total due', () => {
    const { html } = buildBespokeCustomerEmail(data())
    expect(html).toMatch(/An estimate, not a charge/i)
  })

  it('shows the design and the money in the customer currency', () => {
    const { html } = buildBespokeCustomerEmail(data())
    expect(html).toContain('Matted')
    expect(html).toContain('Gold foil')
    expect(html).toMatch(/₦513,000/)
    expect(html).toMatch(/₦256,500/)
  })

  it('promises a tailored quote instead of a price on large orders', () => {
    const { html } = buildBespokeCustomerEmail(
      data({ quantity: 60, totalMinor: 0, depositMinor: undefined, needsQuote: true })
    )
    expect(html).toMatch(/tailored quote/i)
    // No invented total when we have not priced it.
    expect(html).not.toMatch(/₦0/)
  })

  it('escapes customer-supplied text', () => {
    const { html } = buildBespokeCustomerEmail(data({ notes: '<img src=x onerror=alert(1)>' }))
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })
})

describe('bespoke team email', () => {
  it('puts the customer and the order shape in the subject', () => {
    const { subject } = buildBespokeTeamEmail(data())
    expect(subject).toContain('Amara Okafor')
    expect(subject).toContain('6 x 100ml')
  })

  it('flags a quote-required order in the subject, where it cannot be missed', () => {
    const { subject, html } = buildBespokeTeamEmail(
      data({ quantity: 60, totalMinor: 0, depositMinor: undefined, needsQuote: true })
    )
    expect(subject).toMatch(/QUOTE needed/)
    expect(html).toMatch(/quote threshold/i)
  })

  it('carries contact details so it can be actioned from the inbox', () => {
    const { html } = buildBespokeTeamEmail(data())
    expect(html).toContain('amara@example.com')
    expect(html).toContain('+234 901 590 0134')
  })

  it('warns that replying does not reach the customer', () => {
    const { html } = buildBespokeTeamEmail(data())
    expect(html).toMatch(/does not reach the customer/i)
  })

  it('escapes customer-supplied text', () => {
    const { html } = buildBespokeTeamEmail(data({ inspiration: '<script>alert(1)</script>' }))
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})
