'use client'

import { useCartStore, cartSelectors } from '@/store/cartStore'
import { Container } from '@/components/layout'
import Link from 'next/link'
import CheckoutForm from '@/components/checkout/CheckoutForm'

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines)

  if (!lines.length) {
    return (
      <Container className="flex flex-col items-center justify-center py-32 text-center">
        <p className="font-display text-h1 text-slate">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center bg-ink px-8 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
          style={{ height: 52 }}
        >
          Browse the collection
        </Link>
      </Container>
    )
  }

  return (
    <Container className="py-12 md:py-20">
      <h1 className="mb-10 font-display text-h1">Checkout</h1>
      <CheckoutForm />
    </Container>
  )
}
