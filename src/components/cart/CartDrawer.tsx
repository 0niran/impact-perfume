'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useCartStore, cartSelectors } from '@/store/cartStore'
import { formatPrice } from '@/lib/format'
import { getShippingThreshold } from '@/lib/region'
import { useRegion } from '@/lib/regionContext'
import { RecentlyViewedRail } from '@/components/pdp/RecentlyViewed'
import CartLineItem from './CartLineItem'

export default function CartDrawer() {
  const { lines, isOpen, setOpen, clear } = useCartStore()
  const subtotal = useCartStore(cartSelectors.subtotalMinor)
  const currency = useCartStore(cartSelectors.currency)
  const itemCount = useCartStore(cartSelectors.itemCount)
  const { region } = useRegion()

  // The cross-sell suggests pairing with an oil. Suppress it when the cart
  // already contains one — either via stored handle (new lines) or via the
  // variant label (older persisted lines).
  const hasOilInCart = lines.some(
    (l) =>
      l.handle?.startsWith('oil-no-') ||
      /oil/i.test(l.variantLabel ?? '')
  )
  const cartHandles = lines.map((l) => l.handle).filter(Boolean) as string[]

  const [saveEmail, setSaveEmail] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [saveConsent, setSaveConsent] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleSaveCart(e: React.FormEvent) {
    e.preventDefault()
    if (!saveEmail.trim() || lines.length === 0 || !saveConsent) return
    setSaveStatus('loading')
    try {
      const res = await fetch('/api/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: saveEmail.trim(),
          region: region.id,
          currency,
          subtotalMinor: subtotal,
          consentToContact: saveConsent,
          lines: lines.map((l) => ({
            variantId: l.variantId,
            productId: l.productId,
            name: l.name,
            variantLabel: l.variantLabel,
            qty: l.qty,
            unitPriceMinor: l.unitPriceKobo,
            thumbnail: l.thumbnail,
          })),
        }),
      })
      const data = await res.json()
      setSaveStatus(data.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }

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

        {/* Scrollable body — lines plus every supporting section. The footer
            stays pinned so the customer can always see the checkout CTA. */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-6 text-center">
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
                href="/no-series"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center border border-stone/40 px-6 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
                style={{ height: 44 }}
              >
                Browse the collection
              </Link>
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-stone/10 px-6 py-6">
                {lines.map((line) => (
                  <li key={line.variantId} className="py-6 first:pt-0 last:pb-0">
                    <CartLineItem line={line} />
                  </li>
                ))}
              </ul>

              {/* Free-shipping progress */}
              {(() => {
                // Only a carrier market has a delivery fee to waive. In Canada
                // collection is free and shipping is quoted per order, so a
                // "spend more for free delivery" nudge promises a service that
                // does not exist.
                if (region.deliveryModel !== 'carrier') return null
                const threshold = getShippingThreshold(currency)
                if (threshold <= 0) return null
                const remaining = Math.max(0, threshold - subtotal)
                const pct = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 0
                const qualified = remaining === 0
                return (
                  <div className="border-t border-stone/10 bg-ink/40 px-6 py-4">
                    <p className="text-small text-bone mb-2">
                      {qualified
                        ? 'Free delivery unlocked.'
                        : <>Add <span className="font-medium text-accent">{formatPrice(remaining, currency)}</span> for free delivery.</>}
                    </p>
                    <div className="h-[3px] w-full bg-stone/20 overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Recently viewed */}
              <RecentlyViewedRail
                variant="drawer"
                title="Recently viewed"
                excludeHandles={cartHandles}
              />

              {/* Upsell strip — flip to Number Series once the cart already has an oil */}
              <div className="border-t border-stone/10 bg-ink/40 px-6 py-4">
                <p className="text-label uppercase tracking-[0.08em] text-stone mb-1">
                  Complete the set
                </p>
                {hasOilInCart ? (
                  <>
                    <p className="text-small text-stone/60 mb-3">
                      Pair your oil with the full-strength Number Series.
                    </p>
                    <Link
                      href="/no-series"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center text-small text-accent hover:underline underline-offset-2 transition-colors"
                    >
                      Shop the Number Series →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-small text-stone/60 mb-3">
                      Pair your fragrance with a matching oil or home diffuser.
                    </p>
                    <Link
                      href="/oils"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center text-small text-accent hover:underline underline-offset-2 transition-colors"
                    >
                      Shop Perfume Oils →
                    </Link>
                  </>
                )}
              </div>

              {/* Save cart for later */}
              {saveStatus !== 'saved' && (
                <div className="border-t border-stone/10 bg-ink/40 px-6 py-4">
                  <form onSubmit={handleSaveCart}>
                    <label htmlFor="cart-save-email" className="text-label uppercase tracking-[0.08em] text-stone mb-2 block">
                      Save cart, finish later
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="cart-save-email"
                        type="email"
                        required
                        value={saveEmail}
                        onChange={(e) => setSaveEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 border border-stone/30 bg-white/5 px-3 py-2 text-small text-bone placeholder:text-stone/50 focus:border-accent focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={saveStatus === 'loading'}
                        className="shrink-0 border border-stone/40 px-4 text-label uppercase tracking-[0.08em] text-bone hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                      >
                        {saveStatus === 'loading' ? '…' : 'Save'}
                      </button>
                    </div>
                    {saveStatus === 'error' && (
                      <p className="mt-2 text-label text-error">Couldn&apos;t save. Try again later.</p>
                    )}
                    <label className="mt-3 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveConsent}
                        onChange={(e) => setSaveConsent(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 accent-accent cursor-pointer"
                        required
                      />
                      <span className="text-label text-stone/70 leading-snug">
                        Send me one reminder if I don&apos;t finish checkout. We&apos;ll only contact you about this cart.
                      </span>
                    </label>
                  </form>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="border-t border-stone/10 bg-accent/10 px-6 py-3">
                  <p className="text-small text-bone">
                    Cart saved. Finish whenever you&apos;re ready.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

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
