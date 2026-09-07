import { describe, it, expect } from 'vitest'
import { shippingCopyFor } from '@/lib/shippingCopy'
import { REGIONS } from '@/lib/region'

/**
 * The PDP accordion, the cart progress bar, the header utility bar and the
 * server-side pricing guard must all quote the same number. They already read
 * one constant; these assert the customer-facing copy tracks it, so a change to
 * freeDeliveryThresholdMinor can never leave stale copy promising the old
 * threshold while checkout charges against the new one.
 */
describe('shippingCopyFor', () => {
  it('quotes the current Nigerian threshold', () => {
    const copy = shippingCopyFor(REGIONS.NG)
    expect(copy).toContain('₦300,000')
    expect(copy).toMatch(/Free delivery on orders over/i)
  })

  it('derives the figure rather than hardcoding it', () => {
    // Proves the copy follows the constant: no other assertion here would fail
    // if someone reintroduced a literal in the template.
    const doubled = shippingCopyFor({
      ...REGIONS.NG,
      freeDeliveryThresholdMinor: REGIONS.NG.freeDeliveryThresholdMinor * 2,
    })
    expect(doubled).toContain('₦600,000')
    expect(doubled).not.toContain('₦300,000')
  })

  it('never advertises a free-delivery threshold in Canada', () => {
    // CA is collection in Brantford or a per-order quote. There is no carrier
    // service to waive a fee on, so promising one advertises what we do not run.
    const copy = shippingCopyFor(REGIONS.CA)
    expect(copy).not.toMatch(/free delivery on orders over/i)
    expect(copy).toMatch(/Brantford/)
  })
})
