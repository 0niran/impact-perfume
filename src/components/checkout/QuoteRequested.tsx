'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { SITE_CONFIG } from '@/lib/config'

/** Where the panel leaves the address for this page to echo back. */
export const QUOTE_EMAIL_KEY = 'impact_quote_email'

/**
 * Terminal state for the Canadian shipping-quote path.
 *
 * It has one job to do well: make it unambiguous that nothing was charged and
 * that a human will follow up — otherwise the customer either waits for a
 * dispatch email that is not coming, or worries about a silent debit.
 *
 * It lives on its own route rather than inside the checkout panel because
 * clearing the cart trips the checkout page's empty-cart guard, which would
 * replace this confirmation with "Your cart is empty" the moment it rendered.
 */
export default function QuoteRequested() {
  const clear = useCartStore((s) => s.clear)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    // The request is captured server-side, so the cart has done its job.
    clear()
    try {
      const stored = sessionStorage.getItem(QUOTE_EMAIL_KEY)
      if (stored) setEmail(stored)
      // One-shot: a refresh should not keep echoing an old address.
      sessionStorage.removeItem(QUOTE_EMAIL_KEY)
    } catch {
      // sessionStorage unavailable (private mode) — the copy reads fine without it.
    }
  }, [clear])

  return (
    <div className="mx-auto max-w-[640px] py-6 text-center">
      <span
        aria-hidden
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 text-accent"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7.5 12 13l8-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>

      <h1 className="mt-6 font-display text-[28px] leading-tight text-bone">
        Your shipping quote is on its way
      </h1>

      <p className="mt-4 text-body text-stone">
        Thank you. We have your order and your delivery address, and we are working out the best
        way to get it to you.
      </p>

      <div className="mt-8 border border-stone/25 bg-mist/40 px-6 py-5 text-left">
        <p className="text-label uppercase tracking-[0.1em] text-bone/50">What happens next</p>
        <ol className="mt-4 flex flex-col gap-3 text-small text-bone/80">
          <li className="flex gap-3">
            <span className="text-accent">1.</span>
            <span>
              We email {email ? <span className="text-bone">{email}</span> : 'you'} within one
              business day with the shipping cost and your full total.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">2.</span>
            <span>That email carries a secure payment link. Nothing is charged until you use it.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">3.</span>
            <span>Once paid, we pack and dispatch, and send you tracking.</span>
          </li>
        </ol>
      </div>

      <p className="mt-6 text-small text-stone">
        No card details were taken and no payment has been made.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/no-series"
          className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90"
          style={{ height: 48 }}
        >
          Continue shopping
        </Link>
        <Link
          href={SITE_CONFIG.social.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center border border-stone/30 px-8 text-label uppercase tracking-[0.1em] text-bone/80 transition-colors hover:border-bone hover:text-bone"
          style={{ height: 48 }}
        >
          Ask us on WhatsApp
        </Link>
      </div>
    </div>
  )
}
