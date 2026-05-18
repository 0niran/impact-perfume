'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useCartStore, cartSelectors } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'
import CartLineItem from './CartLineItem'

export default function CartDrawer() {
  const { lines, isOpen, setOpen, clear } = useCartStore()
  const subtotal = useCartStore(cartSelectors.subtotalMinor)
  const currency = useCartStore(cartSelectors.currency)
  const itemCount = useCartStore(cartSelectors.itemCount)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel, dark surface, text-bone inherited throughout */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-ink shadow-2xl transition-transform duration-300 ease-soft sm:w-[420px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-h3 text-bone">Your Cart</h2>
            {itemCount > 0 && (
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[9px] font-bold text-ink leading-none">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center text-stone hover:text-bone transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="text-stone/40">
                <path d="M4 4H8L13 27H32L37 11H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="33" r="2" fill="currentColor" />
                <circle cx="29" cy="33" r="2" fill="currentColor" />
              </svg>
              <p className="font-display text-h3 text-bone">Your cart is empty.</p>
              <p className="text-small text-stone">
                Add a fragrance from the collection to get started.
              </p>
              <Link
                href="/shop"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center border border-stone/40 px-6 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
                style={{ height: 44 }}
              >
                Browse the collection
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-stone/10">
              {lines.map((line) => (
                <li key={line.variantId} className="py-6 first:pt-0 last:pb-0">
                  <CartLineItem line={line} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upsell strip */}
        {lines.length > 0 && (
          <div className="border-t border-stone/10 bg-ink/40 px-6 py-4">
            <p className="text-label uppercase tracking-[0.08em] text-stone mb-1">
              Complete the set
            </p>
            <p className="text-small text-stone/60 mb-3">
              Pair your fragrance with a matching oil or home diffuser.
            </p>
            <Link
              href="/oils"
              onClick={() => setOpen(false)}
              className="inline-flex items-center text-small text-accent hover:underline underline-offset-2 transition-colors"
            >
              Shop Impact Oils →
            </Link>
          </div>
        )}

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-stone/20 bg-ink px-6 py-6">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-small uppercase tracking-[0.08em] text-stone">Subtotal</p>
              <p className="font-display text-h3 text-bone">{formatPrice(subtotal, currency)}</p>
            </div>
            <p className="text-small text-stone/60 mb-5">
              Shipping &amp; taxes calculated at checkout
            </p>

            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center bg-accent text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90"
              style={{ height: 52 }}
            >
              Proceed to Checkout
            </Link>

            <button
              onClick={clear}
              className="mt-3 w-full text-center text-small text-stone/60 hover:text-stone transition-colors"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}
