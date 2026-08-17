'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import type { BespokeSubmitResult } from '@/app/bespoke/actions'
import type { PaymentProvider } from '@/lib/region'
import type { BespokeDepositSelection } from './BespokeStripeDeposit'

// The Stripe deposit (CA) is lazy so the @stripe/* bundles never ship to NG
// visitors — they only load when a Canadian brief reaches the deposit step.
const BespokeStripeDeposit = dynamic(() => import('./BespokeStripeDeposit'), {
  ssr: false,
  loading: () => <p className="mt-4 text-small text-stone">Preparing secure payment…</p>,
})

/**
 * Post-submit confirmation screen for the bespoke configurator. Shown once a
 * brief is accepted: it acknowledges the inquiry and, when a deposit is due,
 * offers the deposit payment for the active market — Stripe Elements on the CA
 * rail, the Paystack inline button on NG. Presentational: the parent owns the
 * submit result, the deposit status, and the pay handlers.
 */
export default function BespokeSuccess({
  result,
  currency,
  paymentProvider,
  depositStatus,
  selection,
  customerEmail,
  customerName,
  onPayDeposit,
  onStripePaid,
}: {
  result: BespokeSubmitResult
  currency: 'NGN' | 'CAD'
  paymentProvider: PaymentProvider
  depositStatus: 'idle' | 'loading' | 'paid'
  selection: BespokeDepositSelection
  customerEmail: string
  customerName: string
  onPayDeposit: () => void
  onStripePaid: () => void
}) {
  const depositLabel = result.depositMinor ? formatPrice(result.depositMinor, currency) : null

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

      {depositLabel ? (
        <div className="max-w-xl border border-stone/30 bg-mist/40 p-6">
          <p className="text-label uppercase tracking-[0.1em] text-stone">Secure your slot</p>
          <p className="mt-2 font-display text-h1 text-bone">{depositLabel}</p>
          <p className="mt-1 text-small text-stone">
            Deposit toward your order. Balance settled before delivery. Refundable up to 7 days.
          </p>

          {paymentProvider === 'stripe' ? (
            depositStatus === 'paid' ? (
              <p className="mt-4 text-small text-success">
                Thank you, your deposit is recorded. You&apos;ll receive a confirmation email shortly.
              </p>
            ) : (
              <BespokeStripeDeposit
                selection={selection}
                inquiryId={result.inquiryId}
                customerEmail={customerEmail}
                customerName={customerName}
                depositLabel={depositLabel}
                onPaid={onStripePaid}
              />
            )
          ) : (
            <>
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
                    : `Pay ${depositLabel} Deposit`}
              </button>
              {depositStatus === 'paid' && (
                <p className="mt-4 text-small text-success">
                  Thank you, your deposit is recorded. You&apos;ll receive a confirmation email shortly.
                </p>
              )}
            </>
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
