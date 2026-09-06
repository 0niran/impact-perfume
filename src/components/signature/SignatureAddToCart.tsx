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
}: SignatureAddToCartProps) {
  const [added, setAdded] = useState(false)
  const { add, setOpen } = useCartStore()

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    add({
      variantId,
      productId,
      name: productName,
      variantLabel: '100ml EDP',
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
