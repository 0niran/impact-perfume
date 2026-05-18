'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CategoryProduct } from '@/lib/medusa'
import { useCartStore } from '@/store/cartStore'
import { formatNaira } from '@/lib/format'

interface CategoryProductTileProps {
  product: CategoryProduct
  href: string
  variantLabel?: string
  fallbackImage?: string
}

export default function CategoryProductTile({
  product,
  href,
  variantLabel = '',
  fallbackImage,
}: CategoryProductTileProps) {
  const { add, setOpen } = useCartStore()
  const [added, setAdded] = useState(false)
  const canAdd = product.priceKobo > 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!canAdd) return
    add({
      variantId: product.variantId,
      productId: product.productId,
      name: product.title,
      variantLabel,
      unitPriceKobo: product.priceKobo,
      qty: 1,
      color: product.signatureColor,
      thumbnail: product.imageUrl ?? undefined,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const image = product.imageUrl ?? fallbackImage

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: product.signatureColor, aspectRatio: '4/5' }}
      >
        {image ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="relative h-[88%] w-[80%]">
              <Image
                src={image}
                alt={product.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[4rem] text-white/15 select-none">
            {product.title.charAt(0)}
          </span>
        )}

        {canAdd && (
          <button
            onClick={handleAdd}
            aria-label={`Add ${product.title} to cart`}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center bg-bone/95 text-ink shadow-sm opacity-0 transition-opacity duration-200 hover:bg-bone group-hover:opacity-100 focus:opacity-100"
          >
            {added ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5l3 3 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="border-t border-stone/15 bg-ink px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-body font-medium text-bone truncate">{product.title}</p>
          {canAdd && (
            <p className="text-small text-stone tabular-nums shrink-0">
              {formatNaira(product.priceKobo)}
            </p>
          )}
        </div>
        {product.descriptor && (
          <p className="text-small text-stone truncate">{product.descriptor}</p>
        )}
      </div>
    </Link>
  )
}
