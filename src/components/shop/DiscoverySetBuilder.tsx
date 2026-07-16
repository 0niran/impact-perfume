'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/store/cartStore'

export interface PickItem {
  number: number
  descriptor?: string
  color: string
  imageUrl?: string
  /** Compact scent-notes line, eg. "Agarwood · Praline · Vanilla". */
  notes?: string
}

interface SetLine {
  variantId: string
  productId: string
  priceMinor: number
  currency: string
  handle: string
}

interface DiscoverySetBuilderProps {
  items: PickItem[]
  requiredCount: number
  setLine: SetLine
  /** Fallback bottle image for numbers without their own photo. */
  fallbackImage?: string
}

/**
 * Build-your-own discovery set: pick exactly `requiredCount` numbers, then add
 * the set to the cart as a single flat-priced line. Each pick shows its bottle
 * image and scent notes so the choice is informed; the chosen numbers ride
 * along in the cart line's label so they appear on the order and emails.
 */
export default function DiscoverySetBuilder({
  items,
  requiredCount,
  setLine,
  fallbackImage = '/images/no_series.png',
}: DiscoverySetBuilderProps) {
  const { add, setOpen } = useCartStore()
  const [selected, setSelected] = useState<number[]>([])
  const [added, setAdded] = useState(false)

  const atMax = selected.length >= requiredCount
  const complete = selected.length === requiredCount

  function toggle(n: number) {
    setAdded(false)
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n)
      if (prev.length >= requiredCount) return prev
      return [...prev, n]
    })
  }

  function handleAdd() {
    if (!complete) return
    const ordered = [...selected].sort((a, b) => a - b)
    add({
      variantId: setLine.variantId,
      productId: setLine.productId,
      name: 'Number Discovery Set',
      variantLabel: `Nos. ${ordered.join(', ')}`,
      unitPriceKobo: setLine.priceMinor,
      currency: setLine.currency,
      qty: 1,
      color: '#E4B250',
      handle: setLine.handle,
      href: '/number-discovery-set',
    })
    setAdded(true)
    setOpen(true)
    setSelected([])
  }

  return (
    <div className="pb-28">
      {/* Picker grid */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        role="listbox"
        aria-label={`Choose ${requiredCount} numbers`}
      >
        {items.map((item) => {
          const isSelected = selected.includes(item.number)
          const disabled = atMax && !isSelected
          return (
            <button
              key={item.number}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => toggle(item.number)}
              className={cn(
                'group flex flex-col overflow-hidden border text-left transition-colors',
                isSelected
                  ? 'border-accent bg-accent/[0.06]'
                  : disabled
                    ? 'border-stone/15 opacity-40 cursor-not-allowed'
                    : 'border-stone/20 hover:border-stone'
              )}
            >
              {/* Image */}
              <div className="relative aspect-[4/5] w-full bg-ink">
                <span
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{ background: `radial-gradient(ellipse at center, ${item.color}2b 0%, transparent 70%)` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 flex items-center justify-center p-5">
                  <div className="relative h-[86%] w-[78%]">
                    <Image
                      src={item.imageUrl || fallbackImage}
                      alt={`Impact No. ${item.number}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                </div>
                {/* Selection badge */}
                <span
                  className={cn(
                    'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                    isSelected ? 'border-accent bg-accent text-ink' : 'border-stone/40 text-transparent'
                  )}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5l2 2 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>

              {/* Meta */}
              <div className="border-t border-stone/15 px-3 py-3">
                <p className="font-display text-h3 text-bone">No. {item.number}</p>
                {item.descriptor && <p className="mt-0.5 text-small text-bone/70">{item.descriptor}</p>}
                {item.notes && <p className="mt-1 truncate text-label uppercase tracking-[0.06em] text-stone">{item.notes}</p>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Sticky summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone/20 bg-ink/95 backdrop-blur-sm">
        <div className="container-px mx-auto max-w-container flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-body text-bone">
              <span className="text-accent">{selected.length}</span> of {requiredCount} selected
            </p>
            <p className="text-small text-stone">
              {formatPrice(setLine.priceMinor, setLine.currency)} · 2ml each
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!complete}
            className="inline-flex items-center bg-accent px-6 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed sm:px-10"
            style={{ height: 48 }}
          >
            {added ? 'Added ✓' : complete ? 'Add set to cart' : `Pick ${requiredCount - selected.length} more`}
          </button>
        </div>
      </div>
    </div>
  )
}
