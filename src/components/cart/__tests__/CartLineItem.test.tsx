import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCartStore, type CartLine } from '@/store/cartStore'
import CartLineItem from '../CartLineItem'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: 'v1',
    productId: 'p1',
    name: 'Impact No. 5',
    variantLabel: '100ml EDP',
    unitPriceKobo: 5_000_000,
    currency: 'NGN',
    qty: 1,
    ...overrides,
  }
}

beforeEach(() => {
  useCartStore.setState({ lines: [line()], isOpen: true })
})

describe('CartLineItem', () => {
  it('renders the product name and variant label', () => {
    render(<CartLineItem line={line()} />)
    expect(screen.getByText('Impact No. 5')).toBeInTheDocument()
    expect(screen.getByText('100ml EDP')).toBeInTheDocument()
  })

  it('renders the line total (unit × qty)', () => {
    render(<CartLineItem line={line({ qty: 2, unitPriceKobo: 5_000_000 })} />)
    expect(screen.getByText('₦100,000')).toBeInTheDocument()
  })

  it('increments qty when + is clicked', async () => {
    const user = userEvent.setup()
    render(<CartLineItem line={line({ qty: 1 })} />)
    await user.click(screen.getByLabelText('Increase quantity'))
    expect(useCartStore.getState().lines[0].qty).toBe(2)
  })

  it('decrements qty when - is clicked', async () => {
    useCartStore.setState({ lines: [line({ qty: 3 })], isOpen: true })
    const user = userEvent.setup()
    render(<CartLineItem line={line({ qty: 3 })} />)
    await user.click(screen.getByLabelText('Decrease quantity'))
    expect(useCartStore.getState().lines[0].qty).toBe(2)
  })

  it('removes the line when - is clicked at qty 1', async () => {
    const user = userEvent.setup()
    render(<CartLineItem line={line({ qty: 1 })} />)
    await user.click(screen.getByLabelText('Decrease quantity'))
    expect(useCartStore.getState().lines).toHaveLength(0)
  })

  it('removes the line when "Remove" link is clicked', async () => {
    const user = userEvent.setup()
    render(<CartLineItem line={line()} />)
    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(useCartStore.getState().lines).toHaveLength(0)
  })

  it('renders the thumbnail when provided', () => {
    render(
      <CartLineItem
        line={line({ thumbnail: '/images/no_series.png' })}
      />
    )
    const img = screen.getByAltText('Impact No. 5') as HTMLImageElement
    expect(img).toBeInTheDocument()
  })

  // This previously asserted a fallback to /images/no_series.png — which is a
  // photo of an actual product. Any line without its own image (the discovery
  // sets, for one) therefore showed a picture of something the customer had not
  // bought. Showing no photo is correct; showing the wrong one is not.
  it('shows a neutral placeholder, not another product’s photo, when no thumbnail', () => {
    render(<CartLineItem line={line({ name: 'Signature Discovery Set', thumbnail: undefined })} />)
    expect(screen.queryByAltText('Signature Discovery Set')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Falls back to the item's own initial.
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders the line’s own thumbnail when it has one', () => {
    render(
      <CartLineItem
        line={line({ name: 'Signature Discovery Set', thumbnail: '/images/set.png' })}
      />
    )
    const img = screen.getByAltText('Signature Discovery Set') as HTMLImageElement
    expect(img.src).toMatch(/set\.png/)
  })
})
