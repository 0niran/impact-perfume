'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CategoryProduct } from '@/lib/medusa'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'

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
  const priceAmount = product.priceMinor ?? product.priceKobo
  const currency = product.currency ?? 'NGN'
  // Undefined inStock is treated as available (static/legacy items).
  const inStock = product.inStock !== false
  const canAdd = priceAmount > 0 && inStock

  const image = product.imageUrl ?? fallbackImage

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!canAdd) return
    add({
      variantId: product.variantId,
      productId: product.productId,
      name: product.title,
      variantLabel,
      unitPriceKobo: priceAmount,
      currency,
      qty: 1,
      thumbnail: image,
      color: product.signatureColor,
      handle: product.handle,
      href,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden border border-stone/15 bg-ink focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        {/* Subtle signature-color glow for product identity */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background: `radial-gradient(ellipse at center, ${product.signatureColor}33 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />

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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-stone/25 font-display text-[2.25rem] text-bone/45 transition-transform duration-500 group-hover:scale-[1.04]">
              {product.title.charAt(0)}
            </span>
            <span className="text-label uppercase tracking-[0.16em] text-stone/50">Impact</span>
          </div>
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
          {priceAmount > 0 && (
            <p className={`text-small tabular-nums shrink-0 ${inStock ? 'text-stone' : 'text-stone/50 line-through'}`}>
              {formatPrice(priceAmount, currency)}
            </p>
          )}
        </div>
        {!inStock ? (
          <p className="text-small text-error">Sold out</p>
        ) : product.descriptor ? (
          <p className="text-small text-stone truncate">{product.descriptor}</p>
        ) : null}
      </div>
    </Link>
  )
}
