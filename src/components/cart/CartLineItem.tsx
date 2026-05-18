'use client'

import Image from 'next/image'
import { useCartStore, type CartLine } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'
import { FALLBACK_SWATCH_COLOR } from '@/lib/constants'

interface CartLineItemProps {
  line: CartLine
}

export default function CartLineItem({ line }: CartLineItemProps) {
  const { remove, setQty } = useCartStore()

  return (
    <div className="flex gap-4">
      {/* Thumbnail */}
      <div
        className="relative h-24 w-[68px] shrink-0 overflow-hidden"
        style={{ backgroundColor: line.thumbnail ? '#1D1B16' : (line.color ?? FALLBACK_SWATCH_COLOR) }}
        aria-hidden="true"
      >
        {line.thumbnail ? (
          <Image
            src={line.thumbnail}
            alt={line.name}
            fill
            sizes="68px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-brand text-[32px] leading-none text-white/20 select-none">
            {line.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body font-medium leading-snug text-bone truncate">{line.name}</p>
            <p className="mt-0.5 text-small text-stone">{line.variantLabel}</p>
          </div>
          <p className="shrink-0 text-body font-medium text-bone tabular-nums">
            {formatPrice(line.unitPriceKobo * line.qty, line.currency)}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Qty stepper */}
          <div className="flex items-center border border-stone/30">
            <button
              onClick={() =>
                line.qty > 1
                  ? setQty(line.variantId, line.qty - 1)
                  : remove(line.variantId)
              }
              className="flex h-7 w-7 items-center justify-center text-stone hover:text-bone transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-6 text-center text-small text-bone tabular-nums">{line.qty}</span>
            <button
              onClick={() => setQty(line.variantId, line.qty + 1)}
              className="flex h-7 w-7 items-center justify-center text-stone hover:text-bone transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            onClick={() => remove(line.variantId)}
            className="text-small text-stone/60 hover:text-stone transition-colors underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
