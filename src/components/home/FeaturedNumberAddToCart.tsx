'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'

interface FeaturedNumberAddToCartProps {
  productId: string
  variantId: string
  productName: string
  priceKobo: number
  currency?: string
  signatureColor?: string
}

export default function FeaturedNumberAddToCart({
  productId,
  variantId,
  productName,
  priceKobo,
  currency = 'NGN',
  signatureColor,
}: FeaturedNumberAddToCartProps) {
  const [added, setAdded] = useState(false)
  const { add, setOpen } = useCartStore()

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    add({
      variantId,
      productId,
      name: productName,
      variantLabel: '100ml EDP',
      unitPriceKobo: priceKobo,
      currency,
      qty: 1,
      color: signatureColor,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAdd}
      className="mt-4 w-full border border-stone/30 px-4 text-label uppercase tracking-[0.08em] text-bone/80 transition-colors duration-200 hover:border-bone hover:text-bone"
      style={{ height: 40 }}
    >
      {added ? 'Added' : 'Add to Cart'}
    </button>
  )
}
