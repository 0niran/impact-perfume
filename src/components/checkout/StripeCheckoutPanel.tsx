'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { SITE_CONFIG, CA_PICKUP_LOCATIONS } from '@/lib/config'
import CartLineItem from '@/components/cart/CartLineItem'
import AddressAutocomplete from '@/components/checkout/AddressAutocomplete'
import { QUOTE_EMAIL_KEY } from '@/components/checkout/QuoteRequested'

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

/**
 * How the customer receives the order.
 *
 * 'pickup' is payable online in full right now — the goods price is the whole
 * price, so Stripe can take it at checkout.
 *
 * 'ship' cannot be: Canadian delivery is quoted per order, so the total is
 * unknown at checkout. Rather than charge for goods and chase shipping after
 * (which means charging before the customer knows their total), the ship path
 * takes NO card. It captures a quote request, and we reply with the cost and a
 * payment link.
 */
type Fulfilment = 'pickup' | 'ship'

interface DeliveryAddress {
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
}

function emptyDelivery(): DeliveryAddress {
  return { address1: '', address2: '', city: '', state: '', postalCode: '' }
}

export default function StripeCheckoutPanel() {
  const lines = useCartStore((s) => s.lines)
  const subtotal = useCartStore(cartSelectors.subtotalMinor)
  const currency = useCartStore(cartSelectors.currency)

  const router = useRouter()

  const [draft, setDraft] = useState<ShippingDraft>(emptyDraft)
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup')
  // Most people ship to the address they just typed, so default to yes and let
  // them say otherwise rather than making everyone fill a second address.
  const [deliverySame, setDeliverySame] = useState(true)
  const [delivery, setDelivery] = useState<DeliveryAddress>(emptyDelivery)
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

    // A separate delivery address is only required when they told us the
    // contact address is not where the parcel goes.
    if (fulfilment === 'ship' && !deliverySame) {
      const req: [keyof DeliveryAddress, string][] = [
        ['address1', 'Delivery street address'],
        ['city', 'Delivery city'],
        ['state', 'Delivery province'],
        ['postalCode', 'Delivery postal code'],
      ]
      for (const [key, label] of req) {
        if (!delivery[key].trim()) {
          setError(`${label} is required.`)
          return
        }
      }
    }

    // Persist the human-readable country name (matches the NG rail, which
    // sends 'Nigeria') so emails and the order record read cleanly.
    const countryName = countries.find((c) => c.code === draft.country)?.name ?? draft.country

    // Shipping is quoted per order, so this path takes no payment. Capture the
    // request, confirm it by email, and let the owner reply with the cost.
    if (fulfilment === 'ship') {
      setLoading(true)
      try {
        const res = await fetch('/api/shipping-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: draft.name,
            customerEmail: draft.email,
            customerPhone: draft.phone,
            currency,
            contactAddress: {
              address1: draft.address1,
              address2: draft.address2,
              city: draft.city,
              state: draft.state,
              postalCode: draft.postalCode,
              country: countryName,
              countryCode: draft.country,
            },
            deliverySameAsContact: deliverySame,
            deliveryAddress: deliverySame ? null : { ...delivery, country: countryName },
            lines: lines.map(toCartLinePayload),
          }),
        })
        const data = await res.json()
        if (!data.ok) {
          setError(data.message ?? 'Could not send your request. Please try again.')
          setLoading(false)
          return
        }
        // Hand the address to the confirmation page out of band. It must not go
        // in the URL — that is customer PII in browser history and any referrer.
        try {
          sessionStorage.setItem(QUOTE_EMAIL_KEY, draft.email)
        } catch {
          // Private mode: the confirmation copy reads fine without it.
        }
        // The confirmation lives on its own route and clears the cart there.
        // Clearing it here instead would trip the checkout page's empty-cart
        // guard and replace the confirmation with "Your cart is empty".
        router.push('/checkout/quote-requested')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reach the server.')
      } finally {
        setLoading(false)
      }
      return
    }

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
            fulfilment={fulfilment}
            setFulfilment={setFulfilment}
            deliverySame={deliverySame}
            setDeliverySame={setDeliverySame}
            delivery={delivery}
            setDelivery={setDelivery}
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

      <SummaryRail
        subtotal={subtotal}
        totals={totals}
        currency={currency}
        fulfilment={fulfilment}
      />
    </div>
  )
}

/**
 * Fulfilment picker. Two real choices, each stating its cost and its commitment
 * up front, because they behave very differently: one is paid in full now, the
 * other takes no money at all. Presenting them as equals with the consequence
 * written on the card is what stops "why was I not charged?" support mail.
 *
 * Real radios under the styling, so it is keyboard and screen-reader navigable
 * as one group rather than two clickable divs.
 */
function FulfilmentChoice({
  value,
  onChange,
}: {
  value: Fulfilment
  onChange: (f: Fulfilment) => void
}) {
  const pickup = CA_PICKUP_LOCATIONS[0]

  const base =
    'relative flex cursor-pointer flex-col border p-5 transition-colors duration-150 focus-within:ring-2 focus-within:ring-accent/60'
  const on = 'border-accent bg-accent/[0.06]'
  const off = 'border-stone/25 hover:border-stone/50'

  return (
    <fieldset>
      <legend className="text-label uppercase tracking-[0.1em] text-bone/50">
        How would you like to receive your order?
      </legend>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Collect */}
        <label className={`${base} ${value === 'pickup' ? on : off}`}>
          <input
            type="radio"
            name="fulfilment"
            value="pickup"
            checked={value === 'pickup'}
            onChange={() => onChange('pickup')}
            className="sr-only"
          />
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-body font-medium text-bone">Collect in person</span>
            <span className="shrink-0 text-label uppercase tracking-[0.08em] text-accent">Free</span>
          </span>
          <span className="mt-3 block text-small leading-relaxed text-stone">
            {pickup.displayLines.map((l) => (
              <span key={l} className="block text-bone/70">{l}</span>
            ))}
          </span>
          {pickup.collectionNote && (
            <span className="mt-3 block text-label leading-relaxed text-stone">
              {pickup.collectionNote}
            </span>
          )}
          <span className="mt-4 block text-label uppercase tracking-[0.08em] text-stone">
            Pay in full today
          </span>
        </label>

        {/* Ship */}
        <label className={`${base} ${value === 'ship' ? on : off}`}>
          <input
            type="radio"
            name="fulfilment"
            value="ship"
            checked={value === 'ship'}
            onChange={() => onChange('ship')}
            className="sr-only"
          />
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-body font-medium text-bone">Ship to my address</span>
            <span className="shrink-0 text-label uppercase tracking-[0.08em] text-accent">Quoted</span>
          </span>
          <span className="mt-3 block text-small leading-relaxed text-stone">
            Canadian delivery is priced per order, by weight and destination, so we quote it
            individually rather than guess.
          </span>
          <span className="mt-3 block text-label leading-relaxed text-stone">
            Tell us where it is going and we will email the cost within one business day.
          </span>
          <span className="mt-4 block text-label uppercase tracking-[0.08em] text-stone">
            No card charged now
          </span>
        </label>
      </div>
    </fieldset>
  )
}

interface DetailsFormProps {
  draft: ShippingDraft
  setDraft: (d: ShippingDraft) => void
  countries: { code: string; name: string }[]
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string | null
  fulfilment: Fulfilment
  setFulfilment: (f: Fulfilment) => void
  deliverySame: boolean
  setDeliverySame: (v: boolean) => void
  delivery: DeliveryAddress
  setDelivery: (d: DeliveryAddress) => void
}

function DetailsForm({
  draft, setDraft, countries, onSubmit, loading, error,
  fulfilment, setFulfilment, deliverySame, setDeliverySame, delivery, setDelivery,
}: DetailsFormProps) {
  function set<K extends keyof ShippingDraft>(key: K, value: ShippingDraft[K]) {
    setDraft({ ...draft, [key]: value })
  }
  function setDel<K extends keyof DeliveryAddress>(key: K, value: DeliveryAddress[K]) {
    setDelivery({ ...delivery, [key]: value })
  }

  const shipping = fulfilment === 'ship'

  return (
    <>
      <FulfilmentChoice value={fulfilment} onChange={setFulfilment} />

      <p className="mt-10 text-label uppercase tracking-[0.1em] text-bone/50">Your Details</p>
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
          {/* Naming it honestly matters: on the pickup path nothing is delivered,
              and this address exists for billing and Canadian tax. */}
          <p className="text-label uppercase tracking-[0.1em] text-bone/50">
            {shipping ? 'Your Address' : 'Billing Address'}
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="address1" className={FORM_STYLES.label}>Street address *</label>
              <AddressAutocomplete
                regionCode="ca"
                inputId="address1"
                inputClassName={FORM_STYLES.input}
                placeholder="123 King St W"
                value={draft.address1}
                onInputChange={(text) => set('address1', text)}
                onSelect={(a) =>
                  setDraft({
                    ...draft,
                    address1: a.address1,
                    city: a.city || draft.city,
                    state: a.state || draft.state,
                    postalCode: a.postalCode || draft.postalCode,
                  })
                }
              />
              <p className="mt-1.5 text-label text-stone">Pick your address from the list so it fills in accurately.</p>
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

        {/* Delivery confirmation. Asking "is this where it goes?" is cheaper
            than a parcel sent to a billing address. */}
        {shipping && (
          <div className="mt-4 border-t border-stone/20 pt-6">
            <p className="text-label uppercase tracking-[0.1em] text-bone/50">Delivery Address</p>

            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={deliverySame}
                onChange={(e) => setDeliverySame(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
              />
              <span className="text-small text-bone/80">
                Deliver to the address above
                <span className="mt-1 block text-label text-stone">
                  Untick if your parcel should go somewhere else.
                </span>
              </span>
            </label>

            {!deliverySame && (
              <div className="mt-6 flex flex-col gap-4 border-l border-accent/30 pl-5">
                <div>
                  <label htmlFor="d-address1" className={FORM_STYLES.label}>Street address *</label>
                  <AddressAutocomplete
                    regionCode="ca"
                    inputId="d-address1"
                    inputClassName={FORM_STYLES.input}
                    placeholder="123 King St W"
                    value={delivery.address1}
                    onInputChange={(text) => setDel('address1', text)}
                    onSelect={(a) =>
                      setDelivery({
                        ...delivery,
                        address1: a.address1,
                        city: a.city || delivery.city,
                        state: a.state || delivery.state,
                        postalCode: a.postalCode || delivery.postalCode,
                      })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="d-address2" className={FORM_STYLES.label}>
                    Apartment, suite, unit <span className="text-stone">(optional)</span>
                  </label>
                  <input id="d-address2" type="text" value={delivery.address2}
                    onChange={(e) => setDel('address2', e.target.value)}
                    className={FORM_STYLES.input} placeholder="Apt 4B" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="d-city" className={FORM_STYLES.label}>City *</label>
                    <input id="d-city" type="text" value={delivery.city}
                      onChange={(e) => setDel('city', e.target.value)}
                      className={FORM_STYLES.input} placeholder="Toronto" />
                  </div>
                  <div>
                    <label htmlFor="d-state" className={FORM_STYLES.label}>Province *</label>
                    <input id="d-state" type="text" value={delivery.state}
                      onChange={(e) => setDel('state', e.target.value)}
                      className={FORM_STYLES.input} placeholder="Ontario" />
                  </div>
                </div>
                <div>
                  <label htmlFor="d-postal" className={FORM_STYLES.label}>Postal code *</label>
                  <input id="d-postal" type="text" value={delivery.postalCode}
                    onChange={(e) => setDel('postalCode', e.target.value.toUpperCase())}
                    className={FORM_STYLES.input} placeholder="M5H 1A1" maxLength={12} />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-small text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 self-start flex h-[52px] items-center justify-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? shipping ? 'Sending…' : 'Preparing…'
            : shipping ? 'Request shipping quote' : 'Continue to payment'}
        </button>

        {shipping && (
          <p className="text-label text-stone">
            No card is charged now. We will email you the shipping cost and a payment link.
          </p>
        )}
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
  fulfilment,
}: {
  subtotal: number
  totals: { subtotal: number; tax: number; total: number } | null
  currency: string
  fulfilment: Fulfilment
}) {
  const hasTax = totals != null && totals.tax > 0
  const shipping = fulfilment === 'ship'
  return (
    <div className="flex flex-col gap-6">
      <div className="border border-stone/20 bg-white/5 p-6">
        {/* On the shipping path the figure below is goods only, so label it as
            such — showing a bare "Total" that later grows is how trust is lost. */}
        {shipping && (
          <div className="mb-4 flex items-center justify-between border-b border-stone/20 pb-3 text-small">
            <span className="text-bone/70">Shipping</span>
            <span className="text-accent">Quoted separately</span>
          </div>
        )}
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
            <p className="text-label uppercase tracking-[0.1em] text-bone/50">
              {shipping ? 'Items' : 'Total'}
            </p>
            <p className="mt-2 font-display text-h1 text-bone">{formatPrice(totals?.total ?? subtotal, currency)}</p>
            <p className="mt-1 text-small text-bone/40">
              {shipping
                ? 'Shipping and tax confirmed by email before you pay'
                : 'Tax calculated at payment step'}
            </p>
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
