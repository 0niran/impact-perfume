'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/store/cartStore'

interface AddToCartButtonProps {
  variantId: string
  productId: string
  name: string
  variantLabel?: string
  priceMinor: number
  currency: string
  handle: string
  href: string
  thumbnail?: string | null
  color?: string
}

/** Add a single product to the cart. */
export default function AddToCartButton({
  variantId,
  productId,
  name,
  variantLabel = '',
  priceMinor,
  currency,
  handle,
  href,
  thumbnail,
  color,
}: AddToCartButtonProps) {
  const { add, setOpen } = useCartStore()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    add({
      variantId,
      productId,
      name,
      variantLabel,
      unitPriceKobo: priceMinor,
      currency,
      qty: 1,
      thumbnail: thumbnail ?? undefined,
      color,
      handle,
      href,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="inline-flex items-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90"
      style={{ height: 52 }}
    >
      {added ? 'Added ✓' : `Add to cart — ${formatPrice(priceMinor, currency)}`}
    </button>
  )
}
