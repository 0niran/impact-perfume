'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useCartStore, cartSelectors, type CartLine } from '@/store/cartStore'
import { toCartLinePayload } from '@/lib/cartPayload'
import { formatPrice } from '@/lib/format'
import { countryOptions } from '@/lib/constants'
import { FORM_STYLES } from '@/lib/shopUtils'
import { SITE_CONFIG } from '@/lib/config'
import CartLineItem from '@/components/cart/CartLineItem'

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null> | null = null
function getStripe() {
  if (!stripePromise && PUBLISHABLE_KEY) {
    stripePromise = loadStripe(PUBLISHABLE_KEY)
  }
  return stripePromise
}

interface ShippingDraft {
  name: string
  email: string
  phone: string
  country: string // ISO alpha-2 code
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
}

function emptyDraft(): ShippingDraft {
  return {
    name: '', email: '', phone: '',
    country: 'CA', // CAD rail defaults to Canada; visitor can change it
    address1: '', address2: '', city: '', state: '', postalCode: '',
  }
}

export default function StripeCheckoutPanel() {
  const lines = useCartStore((s) => s.lines)
  const subtotal = useCartStore(cartSelectors.subtotalMinor)
  const currency = useCartStore(cartSelectors.currency)

  const [draft, setDraft] = useState<ShippingDraft>(emptyDraft)
  const [step, setStep] = useState<'details' | 'payment'>('details')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totals, setTotals] = useState<{ subtotal: number; tax: number; total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countries = useMemo(() => countryOptions(), [])

  if (!PUBLISHABLE_KEY) {
    return (
      <Container>
        <p className="text-body text-bone">
          Stripe is not yet configured. Please contact us to complete your order.
        </p>
        <Link href={SITE_CONFIG.social.whatsapp} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink" style={{ height: 48 }}>
          Chat on WhatsApp
        </Link>
      </Container>
    )
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const required: [keyof ShippingDraft, string][] = [
      ['name', 'Full name'],
      ['email', 'Email'],
      ['country', 'Country'],
      ['address1', 'Street address'],
      ['city', 'City'],
      ['state', 'State / province'],
      ['postalCode', 'Postal / ZIP code'],
    ]
    for (const [key, label] of required) {
      if (!draft[key].trim()) {
        setError(`${label} is required.`)
        return
      }
    }

    // Persist the human-readable country name (matches the NG rail, which
    // sends 'Nigeria') so emails and the order record read cleanly.
    const countryName = countries.find((c) => c.code === draft.country)?.name ?? draft.country

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          customerName: draft.name,
          customerEmail: draft.email,
          customerPhone: draft.phone,
          shippingAddress: {
            address1: draft.address1,
            address2: draft.address2,
            city: draft.city,
            state: draft.state,
            postalCode: draft.postalCode,
            country: countryName,
            countryCode: draft.country,
          },
          lines: lines.map(toCartLinePayload),
        }),
      })
      const data = await res.json()
      if (!data.ok || !data.clientSecret) {
        setError(data.message ?? 'Could not initialise payment.')
        setLoading(false)
        return
      }
      setClientSecret(data.clientSecret)
      setTotals({
        subtotal: data.subtotalMinor ?? subtotal,
        tax: data.taxMinor ?? 0,
        total: data.totalMinor ?? subtotal,
      })
      setStep('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach payment service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div>
        {step === 'details' && (
          <DetailsForm
            draft={draft}
            setDraft={setDraft}
            countries={countries}
            onSubmit={handleContinue}
            loading={loading}
            error={error}
          />
        )}
        {step === 'payment' && clientSecret && (
          <PaymentStep
            clientSecret={clientSecret}
            payAmount={totals?.total ?? subtotal}
            currency={currency}
            onBack={() => setStep('details')}
          />
        )}

        {/* Order summary list */}
        <div className="mt-10">
          <p className="text-label uppercase tracking-[0.1em] text-bone/50">Order Summary</p>
          <ul className="mt-6 flex flex-col gap-6 border-t border-stone/20 pt-6">
            {lines.map((line: CartLine) => (
              <li key={line.variantId}>
                <CartLineItem line={line} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SummaryRail subtotal={subtotal} totals={totals} currency={currency} />
    </div>
  )
}

interface DetailsFormProps {
  draft: ShippingDraft
  setDraft: (d: ShippingDraft) => void
  countries: { code: string; name: string }[]
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string | null
}

function DetailsForm({ draft, setDraft, countries, onSubmit, loading, error }: DetailsFormProps) {
  function set<K extends keyof ShippingDraft>(key: K, value: ShippingDraft[K]) {
    setDraft({ ...draft, [key]: value })
  }

  return (
    <>
      <p className="text-label uppercase tracking-[0.1em] text-bone/50">Your Details</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={FORM_STYLES.label}>Full name *</label>
            <input id="name" type="text" autoComplete="name" required value={draft.name}
              onChange={(e) => set('name', e.target.value)} className={FORM_STYLES.input} placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="phone" className={FORM_STYLES.label}>Phone</label>
            <input id="phone" type="tel" autoComplete="tel" value={draft.phone}
              onChange={(e) => set('phone', e.target.value)} className={FORM_STYLES.input} placeholder="+1 416 000 0000" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className={FORM_STYLES.label}>Email *</label>
          <input id="email" type="email" autoComplete="email" required value={draft.email}
            onChange={(e) => set('email', e.target.value)} className={FORM_STYLES.input} placeholder="you@example.com" />
        </div>

        <div className="mt-4 border-t border-stone/20 pt-6">
          <p className="text-label uppercase tracking-[0.1em] text-bone/50">Delivery Address</p>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="address1" className={FORM_STYLES.label}>Street address *</label>
              <input id="address1" type="text" autoComplete="address-line1" required value={draft.address1}
                onChange={(e) => set('address1', e.target.value)} className={FORM_STYLES.input} placeholder="123 King St W" />
            </div>
            <div>
              <label htmlFor="address2" className={FORM_STYLES.label}>
                Apartment, suite, unit <span className="text-stone">(optional)</span>
              </label>
              <input id="address2" type="text" autoComplete="address-line2" value={draft.address2}
                onChange={(e) => set('address2', e.target.value)} className={FORM_STYLES.input} placeholder="Apt 4B" />
            </div>
            <div>
              <label htmlFor="country" className={FORM_STYLES.label}>Country *</label>
              <select id="country" required autoComplete="country" value={draft.country}
                onChange={(e) => set('country', e.target.value)} className={`${FORM_STYLES.input} cursor-pointer`}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className={FORM_STYLES.label}>City *</label>
                <input id="city" type="text" autoComplete="address-level2" required value={draft.city}
                  onChange={(e) => set('city', e.target.value)} className={FORM_STYLES.input} placeholder="Toronto" />
              </div>
              <div>
                <label htmlFor="state" className={FORM_STYLES.label}>State / Province *</label>
                <input id="state" type="text" autoComplete="address-level1" required value={draft.state}
                  onChange={(e) => set('state', e.target.value)} className={FORM_STYLES.input} placeholder="Ontario" />
              </div>
            </div>
            <div>
              <label htmlFor="postal" className={FORM_STYLES.label}>Postal / ZIP code *</label>
              <input id="postal" type="text" autoComplete="postal-code" required value={draft.postalCode}
                onChange={(e) => set('postalCode', e.target.value.toUpperCase())}
                className={FORM_STYLES.input} placeholder="M5H 1A1" maxLength={12} />
            </div>
          </div>
        </div>

        {error && <p className="text-small text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 self-start flex h-[52px] items-center justify-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Preparing…' : 'Continue to payment'}
        </button>
      </form>
    </>
  )
}

interface PaymentStepProps {
  clientSecret: string
  payAmount: number
  currency: string
  onBack: () => void
}

function PaymentStep({ clientSecret, payAmount, currency, onBack }: PaymentStepProps) {
  const stripe = useMemo(() => getStripe(), [])
  if (!stripe) return null

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
      <PaymentForm payAmount={payAmount} currency={currency} onBack={onBack} />
    </Elements>
  )
}

function PaymentForm({ payAmount, currency, onBack }: { payAmount: number; currency: string; onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError(null)
    setSubmitting(true)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/api/stripe/confirm`,
      },
    })

    if (submitError) {
      setError(submitError.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
    }
    // On success, Stripe redirects to return_url — no local navigation needed.
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-label uppercase tracking-[0.1em] text-bone/50">Payment</p>
        <button
          type="button"
          onClick={onBack}
          className="text-small text-stone hover:text-bone transition-colors underline-offset-2 hover:underline"
        >
          ← Edit details
        </button>
      </div>

      <form onSubmit={handlePay} className="mt-6 flex flex-col gap-6">
        <PaymentElement />

        {error && <p className="text-small text-error">{error}</p>}

        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex h-[52px] w-full items-center justify-center bg-accent text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed sm:w-fit sm:px-12"
        >
          {submitting ? 'Processing…' : `Pay ${formatPrice(payAmount, currency)}`}
        </button>

        <p className="text-small text-bone/40">
          Secured by Stripe. Your card details never touch our servers.
        </p>
      </form>
    </>
  )
}

function SummaryRail({
  subtotal,
  totals,
  currency,
}: {
  subtotal: number
  totals: { subtotal: number; tax: number; total: number } | null
  currency: string
}) {
  const hasTax = totals != null && totals.tax > 0
  return (
    <div className="flex flex-col gap-6">
      <div className="border border-stone/20 bg-white/5 p-6">
        {hasTax ? (
          <>
            <div className="flex items-center justify-between text-small text-bone/70">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(totals!.subtotal, currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-small text-bone/70">
              <span>Tax</span>
              <span className="tabular-nums">{formatPrice(totals!.tax, currency)}</span>
            </div>
            <div className="mt-3 border-t border-stone/20 pt-3">
              <p className="text-label uppercase tracking-[0.1em] text-bone/50">Total</p>
              <p className="mt-1 font-display text-h1 text-bone">{formatPrice(totals!.total, currency)}</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-label uppercase tracking-[0.1em] text-bone/50">Total</p>
            <p className="mt-2 font-display text-h1 text-bone">{formatPrice(totals?.total ?? subtotal, currency)}</p>
            <p className="mt-1 text-small text-bone/40">Tax calculated at payment step</p>
          </>
        )}
      </div>
      <Link
        href="/no-series"
        className="text-center text-small text-bone/40 underline-offset-2 hover:underline"
      >
        ← Continue shopping
      </Link>
    </div>
  )
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="py-12">{children}</div>
}
