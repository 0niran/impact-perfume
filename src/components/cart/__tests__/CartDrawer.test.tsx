import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useCartStore, type CartLine } from '@/store/cartStore'

// Mock the region context so we don't need a provider.
// Free-delivery threshold mirrors the real NG region (see lib/region.ts).
vi.mock('@/lib/regionContext', () => ({
  useRegion: () => ({
    region: {
      id: 'NG',
      name: 'Nigeria',
      currency: 'NGN',
      freeDeliveryThresholdMinor: 20_000_000,
    },
    regionId: 'NG',
    setRegion: vi.fn(),
    availableRegions: [],
  }),
}))

import CartDrawer from '../CartDrawer'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: 'v1',
    productId: 'p1',
    name: 'Impact No. 5',
    variantLabel: '100ml EDP',
    unitPriceKobo: 5_000_000,
    currency: 'NGN',
    qty: 1,
    handle: 'no-5',
    href: '/no/5',
    ...overrides,
  }
}

beforeEach(() => {
  useCartStore.setState({ lines: [], isOpen: true })
})

describe('CartDrawer', () => {
  it('renders the empty state when cart is empty', () => {
    useCartStore.setState({ lines: [], isOpen: true })
    render(<CartDrawer />)
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('renders cart lines when items are present', () => {
    useCartStore.setState({ lines: [line()], isOpen: true })
    render(<CartDrawer />)
    expect(screen.getByText('Impact No. 5')).toBeInTheDocument()
  })

  it('shows the subtotal in the footer', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', unitPriceKobo: 5_000_000, qty: 1 }),
        line({ variantId: 'v2', unitPriceKobo: 2_500_000, qty: 2 }),
      ],
      isOpen: true,
    })
    render(<CartDrawer />)
    // 5,000,000 + (2,500,000 × 2) = 10,000,000 kobo = ₦100,000.
    // The free-shipping progress strip also shows a remaining-to-threshold
    // amount, so the subtotal text can appear more than once.
    expect(screen.getAllByText('₦100,000').length).toBeGreaterThan(0)
  })

  it('shows the oil cross-sell when no oils are in the cart', () => {
    useCartStore.setState({
      lines: [line({ handle: 'no-5', variantLabel: '100ml EDP' })],
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText(/shop perfume oils/i)).toBeInTheDocument()
    expect(screen.queryByText(/shop the number series/i)).not.toBeInTheDocument()
  })

  it('flips to Number Series cross-sell when an oil is in the cart (by handle)', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', handle: 'oil-no-12', variantLabel: '12ml · Concentrated Oil' }),
      ],
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText(/shop the number series/i)).toBeInTheDocument()
    expect(screen.queryByText(/shop perfume oils/i)).not.toBeInTheDocument()
  })

  it('detects oils by variant label even when handle is missing (back-compat)', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', handle: undefined, variantLabel: '12ml · Concentrated Oil' }),
      ],
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText(/shop the number series/i)).toBeInTheDocument()
  })

  it('renders the item count badge', () => {
    useCartStore.setState({
      lines: [
        line({ variantId: 'v1', qty: 2 }),
        line({ variantId: 'v2', qty: 3 }),
      ],
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText('5')).toBeInTheDocument() // 2 + 3
  })

  it('shows free-shipping progress when under threshold', () => {
    useCartStore.setState({
      lines: [line({ unitPriceKobo: 2_500_000, qty: 1 })],
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText(/for free delivery/i)).toBeInTheDocument()
  })

  it('shows "free delivery unlocked" when at or above threshold', () => {
    useCartStore.setState({
      lines: [line({ unitPriceKobo: 20_000_000, qty: 1 })], // exactly threshold (₦200,000)
      isOpen: true,
    })
    render(<CartDrawer />)
    expect(screen.getByText(/free delivery unlocked/i)).toBeInTheDocument()
  })
})
