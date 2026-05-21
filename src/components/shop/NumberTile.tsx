'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { TileEnrichment } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'

const DEFAULT_FALLBACK = '/images/no_series.png'

interface NumberTileProps {
  tile: TileEnrichment
  hrefBase?: string
  titlePrefix?: string
  variantLabel?: string
  fallbackImage?: string
}

export default function NumberTile({
  tile,
  hrefBase = '/no',
  titlePrefix = 'No.',
  variantLabel = '100ml EDP',
  fallbackImage = DEFAULT_FALLBACK,
}: NumberTileProps) {
  const { number, descriptor, signatureColor, imageUrl, productId, variantId, priceMinor, currency } = tile
  const priceAmount = priceMinor ?? tile.priceKobo
  const lineCurrency = currency ?? 'NGN'
  const { add, setOpen } = useCartStore()
  const [added, setAdded] = useState(false)

  const canAdd = Boolean(productId && variantId && priceAmount && priceAmount > 0)
  const productImage = imageUrl ?? fallbackImage

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!canAdd) return
    add({
      variantId: variantId!,
      productId: productId!,
      name: `Impact ${titlePrefix} ${number}`,
      variantLabel,
      unitPriceKobo: priceAmount!,
      currency: lineCurrency,
      qty: 1,
      thumbnail: productImage,
      color: signatureColor,
      handle: tile.productHandle,
      href: `${hrefBase}/${number}`,
    })
    setAdded(true)
    setOpen(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <Link
      href={`${hrefBase}/${number}`}
      className="group relative block overflow-hidden border border-stone/15 bg-ink focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={`Impact ${titlePrefix} ${number} ${descriptor}`}
    >
      <div className="relative" style={{ aspectRatio: '4 / 5' }}>
        {/* Subtle signature-color glow behind the bottle for product identity */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background: `radial-gradient(ellipse at center, ${signatureColor}33 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="relative h-[88%] w-[80%]">
            <Image
              src={productImage}
              alt={`Impact ${titlePrefix} ${number}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        </div>

        {canAdd && (
          <button
            onClick={handleAdd}
            aria-label={`Add Impact ${titlePrefix} ${number} to cart`}
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
          <p className="text-body font-medium text-bone">
            {titlePrefix} {number}
          </p>
          {canAdd && (
            <p className="text-small text-stone tabular-nums">{formatPrice(priceAmount!, lineCurrency)}</p>
          )}
        </div>
        {descriptor && (
          <p className="text-small text-stone truncate">{descriptor}</p>
        )}
      </div>
    </Link>
  )
}
