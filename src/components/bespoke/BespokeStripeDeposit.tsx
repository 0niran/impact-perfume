'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

/**
 * Canadian bespoke deposit via Stripe. Fetches a server-computed PaymentIntent
 * (amount derived from the Medusa CAD config, never the client), then confirms
 * it inline with `redirect: 'if_required'` so non-3DS cards resolve without
 * leaving the page — matching the NG Paystack deposit UX. 3DS cards redirect to
 * /bespoke?deposit=success, which the configurator surfaces on load.
 *
 * Loaded via next/dynamic only in the CA branch, so the @stripe/* bundles never
 * ship to Nigerian visitors.
 */

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise && PUBLISHABLE_KEY) stripePromise = loadStripe(PUBLISHABLE_KEY)
  return stripePromise
}

export interface BespokeDepositSelection {
  volumeKey: string
  bottleTypeKey: string
  inscriptionKey: string | null
  quantity: number
}

interface Props {
  selection: BespokeDepositSelection
  inquiryId?: string
  customerEmail: string
  customerName?: string
  /** Pre-formatted deposit amount for the button label, e.g. "CA$594.00". */
  depositLabel: string
  onPaid: () => void
}

export default function BespokeStripeDeposit({
  selection,
  inquiryId,
  customerEmail,
  customerName,
  depositLabel,
  onPaid,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stripe = useMemo(() => getStripe(), [])

  useEffect(() => {
    let cancelled = false
    if (!PUBLISHABLE_KEY) {
      setError('Card payments are not configured. Please contact us to pay your deposit.')
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/bespoke/deposit-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selection, inquiryId, customerEmail, customerName }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!data.ok || !data.clientSecret) {
          setError(data.message ?? 'Could not initialise payment.')
          return
        }
        setClientSecret(data.clientSecret)
      } catch {
        if (!cancelled) setError('Could not reach the payment service. Please try again.')
      }
    })()
    return () => {
      cancelled = true
    }
    // Selection is fixed once the brief is submitted, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return <p className="mt-4 text-small text-error">{error}</p>
  }
  if (!stripe || !clientSecret) {
    return <p className="mt-4 text-small text-stone">Preparing secure payment…</p>
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#E4B250',
            colorBackground: '#0a0a08',
            colorText: '#F2E6C8',
            colorDanger: '#8B2E2E',
            fontFamily: 'Manrope, system-ui, sans-serif',
            borderRadius: '0px',
          },
        },
      }}
    >
      <DepositForm depositLabel={depositLabel} onPaid={onPaid} />
    </Elements>
  )
}

function DepositForm({ depositLabel, onPaid }: { depositLabel: string; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError(null)
    setSubmitting(true)

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/bespoke?deposit=success` },
      // Resolve inline for cards that don't need 3DS; only redirect when required.
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaid()
      return
    }
    // A redirect-based method is taking over; Stripe navigates away.
    setSubmitting(false)
  }

  return (
    <form onSubmit={handlePay} className="mt-6 flex flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-small text-error">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="inline-flex items-center justify-center self-start bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ height: 48 }}
      >
        {submitting ? 'Processing…' : `Pay ${depositLabel} Deposit`}
      </button>
      <p className="text-small text-bone/40">Secured by Stripe. Your card details never touch our servers.</p>
    </form>
  )
}
