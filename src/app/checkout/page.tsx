'use client'

import { useCartStore, cartSelectors } from '@/store/cartStore'
import { Container } from '@/components/layout'
import Link from 'next/link'
import CheckoutForm from '@/components/checkout/CheckoutForm'

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines)

  if (!lines.length) {
    return (
      <div className="bg-cream min-h-screen">
        <Container className="flex flex-col items-center justify-center py-32 text-center">
          <p className="font-display text-h1 text-ink/50">Your cart is empty.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center bg-ink px-8 text-label uppercase tracking-[0.1em] text-bone hover:opacity-80 transition-opacity"
            style={{ height: 52 }}
          >
            Browse the collection
          </Link>
        </Container>
      </div>
    )
  }

  return (
    <div className="bg-cream min-h-screen">
      <Container className="py-12 md:py-20">
        <div className="mb-8">
          <p className="text-label uppercase tracking-[0.14em] text-ink/40">Secure Checkout</p>
          <h1 className="mt-2 font-display text-[32px] leading-none text-ink">Complete Your Order</h1>
        </div>
        <CheckoutForm />
      </Container>
    </div>
  )
}
