import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCartStore } from '@/store/cartStore'
import AddToCart from '../AddToCart'

beforeEach(() => {
  useCartStore.setState({ lines: [], isOpen: false })
  window.localStorage.clear()
})

describe('AddToCart (PDP)', () => {
  it('renders the formatted price and Add to Cart button', () => {
    render(
      <AddToCart
        productId="p1"
        variantId="v1"
        productName="Impact No. 5"
        priceMinor={5_000_000}
        currency="NGN"
      />
    )
    // Component renders price twice — primary CTA + sticky mobile bar
    expect(screen.getAllByText('₦50,000').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /add to cart/i }).length).toBeGreaterThan(0)
  })

  it('adds a line to the cart with all metadata when clicked', async () => {
    const user = userEvent.setup()
    render(
      <AddToCart
        productId="p1"
        variantId="v1"
        productName="Impact No. 5"
        priceMinor={5_000_000}
        currency="NGN"
        signatureColor="#A8137C"
        imageUrl="/images/no_series.png"
        handle="no-5"
        href="/no/5"
      />
    )
    const buttons = screen.getAllByRole('button', { name: /add to cart/i })
    await user.click(buttons[0])

    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      productId: 'p1',
      variantId: 'v1',
      name: 'Impact No. 5',
      unitPriceKobo: 5_000_000,
      currency: 'NGN',
      qty: 1,
      handle: 'no-5',
      href: '/no/5',
      thumbnail: '/images/no_series.png',
      color: '#A8137C',
    })
  })

  it('opens the cart drawer after adding', async () => {
    const user = userEvent.setup()
    render(
      <AddToCart
        productId="p1"
        variantId="v1"
        productName="Impact No. 5"
        priceMinor={5_000_000}
        currency="NGN"
      />
    )
    await user.click(screen.getAllByRole('button', { name: /add to cart/i })[0])
    expect(useCartStore.getState().isOpen).toBe(true)
  })

  it('mirrors the add into recently-viewed when handle+href are provided', async () => {
    const user = userEvent.setup()
    render(
      <AddToCart
        productId="p1"
        variantId="v1"
        productName="Impact No. 5"
        priceMinor={5_000_000}
        handle="no-5"
        href="/no/5"
      />
    )
    await user.click(screen.getAllByRole('button', { name: /add to cart/i })[0])
    const recently = window.localStorage.getItem('impact-recently-viewed-v1')
    expect(recently).toBeTruthy()
    expect(JSON.parse(recently!)[0].handle).toBe('no-5')
  })

  it('renders "Price on request" when price is 0', () => {
    render(
      <AddToCart
        productId="p1"
        variantId="v1"
        productName="Bespoke"
        priceMinor={0}
        currency="NGN"
      />
    )
    expect(screen.getAllByText(/price on request/i).length).toBeGreaterThan(0)
  })
})
