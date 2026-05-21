import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore, cartSelectors, type CartLine } from '../cartStore'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: 'v1',
    productId: 'p1',
    name: 'Impact No. 1',
    variantLabel: '100ml EDP',
    unitPriceKobo: 5_000_000,
    currency: 'NGN',
    qty: 1,
    ...overrides,
  }
}

beforeEach(() => {
  // Reset persistent store between tests
  useCartStore.setState({ lines: [], isOpen: false })
  window.localStorage.clear()
})

describe('cartStore.add', () => {
  it('adds a new line', () => {
    useCartStore.getState().add(line())
    expect(useCartStore.getState().lines).toHaveLength(1)
  })

  it('increments qty when adding the same variant', () => {
    useCartStore.getState().add(line({ qty: 1 }))
    useCartStore.getState().add(line({ qty: 2 }))
    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(3)
  })

  it('keeps distinct variants separate', () => {
    useCartStore.getState().add(line({ variantId: 'v1' }))
    useCartStore.getState().add(line({ variantId: 'v2' }))
    expect(useCartStore.getState().lines).toHaveLength(2)
  })

  it('replaces the cart when adding a line with a different currency', () => {
    useCartStore.getState().add(line({ currency: 'NGN' }))
    useCartStore.getState().add(line({ variantId: 'v2', currency: 'CAD', unitPriceKobo: 6_500 }))
    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0].currency).toBe('CAD')
  })

  it('mirrors handle+href into recently-viewed localStorage', () => {
    useCartStore.getState().add(
      line({ handle: 'no-1', href: '/no/1', thumbnail: '/images/no_series.png' })
    )
    const stored = window.localStorage.getItem('impact-recently-viewed-v1')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].handle).toBe('no-1')
    expect(parsed[0].href).toBe('/no/1')
    expect(parsed[0].title).toBe('Impact No. 1')
  })

  it('does NOT write to recently-viewed when handle or href are missing', () => {
    useCartStore.getState().add(line()) // no handle/href
    expect(window.localStorage.getItem('impact-recently-viewed-v1')).toBeNull()
  })
})

describe('cartStore.remove', () => {
  it('removes a line by variantId', () => {
    useCartStore.getState().add(line({ variantId: 'v1' }))
    useCartStore.getState().add(line({ variantId: 'v2' }))
    useCartStore.getState().remove('v1')
    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0].variantId).toBe('v2')
  })

  it('is a no-op for unknown variantId', () => {
    useCartStore.getState().add(line())
    useCartStore.getState().remove('does-not-exist')
    expect(useCartStore.getState().lines).toHaveLength(1)
  })
})

describe('cartStore.setQty', () => {
  it('updates the qty of a line', () => {
    useCartStore.getState().add(line({ qty: 1 }))
    useCartStore.getState().setQty('v1', 5)
    expect(useCartStore.getState().lines[0].qty).toBe(5)
  })
})

describe('cartStore.clear', () => {
  it('empties all lines', () => {
    useCartStore.getState().add(line({ variantId: 'v1' }))
    useCartStore.getState().add(line({ variantId: 'v2' }))
    useCartStore.getState().clear()
    expect(useCartStore.getState().lines).toHaveLength(0)
  })
})

describe('cartSelectors', () => {
  it('subtotalMinor sums unit_price × qty across lines', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', unitPriceKobo: 5_000_000, qty: 2 }),
        line({ variantId: 'v2', unitPriceKobo: 2_500_000, qty: 1 }),
      ],
    })
    expect(cartSelectors.subtotalMinor(useCartStore.getState())).toBe(12_500_000)
  })

  it('itemCount sums qty', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', qty: 2 }),
        line({ variantId: 'v2', qty: 3 }),
      ],
    })
    expect(cartSelectors.itemCount(useCartStore.getState())).toBe(5)
  })

  it('currency reads from first line, defaults to NGN', () => {
    expect(cartSelectors.currency(useCartStore.getState())).toBe('NGN') // empty
    useCartStore.getState().add(line({ currency: 'CAD' }))
    expect(cartSelectors.currency(useCartStore.getState())).toBe('CAD')
  })
})
