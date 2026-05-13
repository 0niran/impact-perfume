'use client'

import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/store/cartStore'
import { formatNaira } from '@/lib/format'

interface AddToCartProps {
  productId: string
  variantId: string
  productName: string
  priceKobo: number
  signatureColor?: string
}

export default function AddToCart({
  productId,
  variantId,
  productName,
  priceKobo,
  signatureColor,
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
    add({
      variantId,
      productId,
      name: productName,
      variantLabel: '100ml EDP',
      unitPriceKobo: priceKobo,
      qty: 1,
      color: signatureColor,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      {/* Primary CTA — inline in InfoRail */}
      <div ref={primaryRef} className="flex flex-col gap-4">
        {/* Price block — typographic, not a form element */}
        <div>
          <p className="font-display text-h1 leading-none text-accent">
            {priceKobo > 0 ? formatNaira(priceKobo) : 'Price on request'}
          </p>
          <p className="mt-1.5 text-small text-stone">100 ml · Eau de Parfum</p>
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex w-full sm:w-fit items-center justify-center bg-ink px-10 text-label uppercase tracking-[0.1em] text-bone transition-opacity duration-200 hover:opacity-90"
          style={{ height: 52 }}
        >
          {added ? 'Added to cart' : 'Add to Cart'}
        </button>
      </div>

      {/* Sticky mobile bar — appears when primary CTA scrolls out of view */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 border-t border-stone/20 bg-bone px-5 py-3 flex items-center justify-between gap-4 lg:hidden transition-transform duration-300 ${
          stickyVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div>
          <p className="text-small text-slate">{productName}</p>
          <p className="text-body font-medium">
            {priceKobo > 0 ? formatNaira(priceKobo) : 'Price on request'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="shrink-0 flex items-center justify-center bg-ink px-6 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
          style={{ height: 48 }}
        >
          {added ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </>
  )
}
