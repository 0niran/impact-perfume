'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { useCartStore } from '@/store/cartStore'

export interface PickItem {
  number: number
  descriptor?: string
  color: string
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
}

/**
 * Build-your-own discovery set: pick exactly `requiredCount` numbers, then add
 * the set to the cart as a single flat-priced line. The chosen numbers ride
 * along in the cart line's label so they appear on the order and emails.
 */
export default function DiscoverySetBuilder({ items, requiredCount, setLine }: DiscoverySetBuilderProps) {
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
        className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-10"
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
              title={item.descriptor}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center border transition-colors',
                isSelected
                  ? 'border-accent bg-accent/10'
                  : disabled
                    ? 'border-stone/15 opacity-40 cursor-not-allowed'
                    : 'border-stone/25 hover:border-stone'
              )}
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{ background: `radial-gradient(ellipse at center, ${item.color}2b 0%, transparent 70%)` }}
                aria-hidden="true"
              />
              <span className="relative font-display text-h3 text-bone">{item.number}</span>
              {isSelected && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-ink" aria-hidden="true">
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
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
