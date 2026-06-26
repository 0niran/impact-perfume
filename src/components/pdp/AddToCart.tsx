'use client'

import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'

interface AddToCartProps {
  productId: string
  variantId: string
  productName: string
  priceKobo: number
  currency?: string
  signatureColor?: string
  imageUrl?: string
  variantLabel?: string
  handle?: string
  href?: string
  inStock?: boolean
}

export default function AddToCart({
  productId,
  variantId,
  productName,
  priceKobo,
  currency = 'NGN',
  signatureColor,
  imageUrl,
  variantLabel = '100ml EDP',
  handle,
  href,
  inStock = true,
}: AddToCartProps) {
  const [added, setAdded] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const primaryRef = useRef<HTMLDivElement>(null)
  const { add, setOpen } = useCartStore()

  useEffect(() => {
    const el = primaryRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleAdd() {
    if (!inStock) return
    add({
      variantId,
      productId,
      name: productName,
      variantLabel,
      unitPriceKobo: priceKobo,
      currency,
      qty: 1,
      color: signatureColor,
      thumbnail: imageUrl,
      handle,
      href,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      {/* Primary CTA, inline in InfoRail */}
      <div ref={primaryRef} className="flex flex-col gap-4">
        <div>
          <p className="font-display text-h1 leading-none text-bone">
            {priceKobo > 0 ? formatPrice(priceKobo, currency) : 'Price on request'}
          </p>
          <p className="mt-1.5 text-small text-bone/50">{variantLabel}</p>
        </div>

        <button
          onClick={handleAdd}
          disabled={!inStock}
          className={`inline-flex w-full sm:w-fit items-center justify-center px-10 text-label uppercase tracking-[0.1em] transition-all duration-300 ${
            inStock
              ? 'bg-accent text-ink hover:opacity-90 hover:-translate-y-px'
              : 'cursor-not-allowed border border-stone/30 bg-transparent text-stone'
          }`}
          style={{ height: 52 }}
        >
          {!inStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to Cart'}
        </button>
      </div>

      {/* Sticky mobile bar, appears when primary CTA scrolls out of view */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 border-t border-stone/20 bg-ink px-5 py-3 flex items-center justify-between gap-4 lg:hidden transition-transform duration-300 ${
          stickyVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div>
          <p className="text-small text-stone">{productName}</p>
          <p className="text-body font-medium text-bone">
            {priceKobo > 0 ? formatPrice(priceKobo, currency) : 'Price on request'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className={`shrink-0 flex items-center justify-center px-6 text-label uppercase tracking-[0.1em] transition-opacity ${
            inStock
              ? 'bg-accent text-ink hover:opacity-90'
              : 'cursor-not-allowed border border-stone/30 text-stone'
          }`}
          style={{ height: 48 }}
        >
          {!inStock ? 'Out of stock' : added ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </>
  )
}
