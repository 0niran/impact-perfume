'use client'

import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import type { BespokeSubmitResult } from '@/app/bespoke/actions'

/**
 * Post-submit confirmation screen for the bespoke configurator. Shown once a
 * brief is accepted: it acknowledges the inquiry and, when a deposit is due,
 * offers the deposit payment. Purely presentational — the parent owns the
 * submit result, the deposit status, and the pay handler.
 */
export default function BespokeSuccess({
  result,
  depositStatus,
  onPayDeposit,
}: {
  result: BespokeSubmitResult
  depositStatus: 'idle' | 'loading' | 'paid'
  onPayDeposit: () => void
}) {
  const depositNaira = result.depositKobo ? formatPrice(result.depositKobo) : null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-12">
      <div>
        <p className="text-label uppercase tracking-[0.1em] text-accent">Brief Received</p>
        <h2 className="mt-3 font-display text-display-s text-bone">
          Your bespoke brief is in.
        </h2>
        <p className="mt-4 max-w-xl text-body text-stone">
          Reference: <span className="font-mono text-bone">{result.inquiryId}</span>.
          Our perfumer will review your composition and reach out within 24 hours
          to confirm details, samples, and the final price.
        </p>
      </div>

      {depositNaira ? (
        <div className="max-w-xl border border-stone/30 bg-mist/40 p-6">
          <p className="text-label uppercase tracking-[0.1em] text-stone">Secure your slot</p>
          <p className="mt-2 font-display text-h1 text-bone">{depositNaira}</p>
          <p className="mt-1 text-small text-stone">
            Deposit toward your order. Balance settled before delivery. Refundable up to 7 days.
          </p>
          <button
            onClick={onPayDeposit}
            disabled={depositStatus === 'loading' || depositStatus === 'paid'}
            className="mt-6 inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ height: 48 }}
          >
            {depositStatus === 'paid'
              ? 'Deposit Paid ✓'
              : depositStatus === 'loading'
                ? 'Processing…'
                : `Pay ${depositNaira} Deposit`}
          </button>
          {depositStatus === 'paid' && (
            <p className="mt-4 text-small text-success">
              Thank you, your deposit is recorded. You&apos;ll receive a confirmation email shortly.
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-xl border border-stone/30 bg-mist/40 p-6">
          <p className="text-label uppercase tracking-[0.1em] text-stone">Next step</p>
          <p className="mt-2 font-display text-h2 text-bone">We&apos;ll send your price</p>
          <p className="mt-2 text-small text-stone">
            Our perfumer will confirm pricing and a delivery schedule when they
            reach out.
          </p>
        </div>
      )}

      <div>
        <Link href="/" className="text-small text-stone hover:text-bone transition-colors">
          ← Back to the house
        </Link>
      </div>
    </div>
  )
}
