'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

interface SignatureAddToCartProps {
  productId: string
  variantId: string
  productName: string
  priceMinor: number
  currency?: string
  imageUrl?: string
  className?: string
  handle?: string
  signatureColor?: string
  /** The variant's own label. Was hardcoded to '100ml EDP', so every signature
   *  product showed that size in the cart and on the confirmation email
   *  regardless of what was actually bought. */
  variantLabel?: string
  /** Defaults to true only so existing callers keep compiling; every real
   *  caller passes it. Without this the button was always live, so an
   *  out-of-stock signature scent could be added to the cart and was then
   *  refused by the server-side pricing guard at checkout — a dead end the
   *  customer had no warning of. */
  inStock?: boolean
}

export default function SignatureAddToCart({
  productId,
  variantId,
  productName,
  priceMinor,
  currency = 'NGN',
  imageUrl,
  className = '',
  handle,
  signatureColor,
  variantLabel = '100ml EDP',
  inStock = true,
}: SignatureAddToCartProps) {
  const [added, setAdded] = useState(false)
  const { add, setOpen } = useCartStore()

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!inStock) return
    add({
      variantId,
      productId,
      name: productName,
      variantLabel,
      unitPriceKobo: priceMinor,
      currency,
      qty: 1,
      thumbnail: imageUrl,
      color: signatureColor,
      handle,
      href: handle ? `/signature/${handle}` : undefined,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // Matches the Number Series / Oils treatment: the same red the rest of the
  // site uses for unavailable, rather than a silently dead button.
  if (!inStock) {
    return (
      <button
        disabled
        aria-disabled="true"
        className={`inline-flex cursor-not-allowed items-center justify-center border border-error/50 bg-transparent text-label uppercase tracking-[0.1em] text-error ${className}`}
        style={{ height: 44 }}
      >
        Out of stock
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className={`inline-flex items-center justify-center bg-ink text-label uppercase tracking-[0.1em] text-bone transition-opacity hover:opacity-90 ${className}`}
      style={{ height: 44 }}
    >
      {added ? 'Added' : 'Add to Cart'}
    </button>
  )
}
