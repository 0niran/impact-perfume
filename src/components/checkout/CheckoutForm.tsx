'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartSelectors, type CartLine } from '@/store/cartStore'
import { toCartLinePayload } from '@/lib/cartPayload'
import { formatPrice } from '@/lib/format'
import { NIGERIAN_STATES } from '@/lib/constants'
import { FORM_STYLES } from '@/lib/shopUtils'
import { SITE_CONFIG, NG_PICKUP_LOCATIONS, getPickupLocation } from '@/lib/config'
import { cn } from '@/lib/cn'
import CartLineItem from '@/components/cart/CartLineItem'
import Link from 'next/link'

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: PaystackOptions) => { openIframe: () => void }
    }
  }
}

interface PaystackOptions {
  key: string
  email: string
  amount: number
  ref: string
  callback: (response: { reference: string }) => void
  onClose: () => void
  metadata?: Record<string, unknown>
}

type FulfillmentMethod = 'pickup' | 'shipping'

interface Fulfilment {
  shippingAddress: {
    address1: string
    address2?: string
    city: string
    state: string
    country: 'Nigeria'
  }
  fulfillmentMethod: FulfillmentMethod
  pickupLocationId?: string
}

interface DeliveryQuote {
  /** Fee actually charged in MINOR units (0 when free delivery applies). */
  chargedFeeMinor: number
  freeDelivery: boolean
  /** Signed token the server validates at payment time. */
  token: string
}

function generateRef(): string {
  // crypto.getRandomValues is widely supported in modern browsers; refs
  // need to be unpredictable so attackers can't pre-compute valid refs
  // and probe the verify endpoint (audit M-4).
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `impact-${Date.now()}-${hex}`
}

export default function CheckoutForm() {
  const router = useRouter()
  const lines = useCartStore((s) => s.lines)
  const subtotalKobo = useCartStore(cartSelectors.subtotalMinor)
  const currency = useCartStore(cartSelectors.currency)
  const clearCart = useCartStore((s) => s.clear)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Fulfilment: pick up in store, or ship to an address.
  const [method, setMethod] = useState<FulfillmentMethod>('pickup')
  const [pickupId, setPickupId] = useState('')

  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  // Live GIG delivery quote for the entered address (shipping only).
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scriptReady = useRef(false)

  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0)

  // Fetch a delivery quote once the address is complete. Debounced so we don't
  // hit GIG on every keystroke; aborts the in-flight request when inputs change.
  useEffect(() => {
    if (method !== 'shipping') {
      setQuote(null)
      setQuoteError(null)
      setQuoteLoading(false)
      return
    }
    const ready = address1.trim() && city.trim() && state
    if (!ready) {
      setQuote(null)
      setQuoteError(null)
      setQuoteLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()
    setQuote(null)
    setQuoteError(null)
    setQuoteLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/delivery/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingAddress: {
              address1: address1.trim(),
              address2: address2.trim() || undefined,
              city: city.trim(),
              state,
              country: 'Nigeria',
            },
            subtotalMinor: subtotalKobo,
            itemCount,
          }),
          signal: controller.signal,
        })
        const data = await res.json()
        if (!active) return
        if (data.ok) {
          setQuote({
            chargedFeeMinor: data.chargedFeeMinor,
            freeDelivery: data.freeDelivery,
            token: data.token,
          })
          setQuoteError(null)
        } else {
          setQuote(null)
          setQuoteError(data.message ?? 'Could not calculate delivery for this address.')
        }
      } catch (err) {
        if (active && (err as Error).name !== 'AbortError') {
          setQuoteError('Could not calculate delivery right now. Please try again.')
        }
      } finally {
        if (active) setQuoteLoading(false)
      }
    }, 700)

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [method, address1, address2, city, state, subtotalKobo, itemCount])

  const deliveryFeeMinor = method === 'shipping' ? quote?.chargedFeeMinor ?? 0 : 0
  const totalKobo = subtotalKobo + deliveryFeeMinor

  useEffect(() => {
    if (document.getElementById(SITE_CONFIG.paystack.scriptId)) {
      scriptReady.current = true
      return
    }
    const script = document.createElement('script')
    script.id = SITE_CONFIG.paystack.scriptId
    script.src = SITE_CONFIG.paystack.scriptUrl
    script.async = true
    script.onload = () => { scriptReady.current = true }
    document.head.appendChild(script)
  }, [])

  /** Resolve the current selection into an order-ready fulfilment, or null if incomplete. */
  function buildFulfilment(): Fulfilment | null {
    if (method === 'pickup') {
      const loc = getPickupLocation(pickupId)
      if (!loc) return null
      return {
        shippingAddress: { ...loc.address },
        fulfillmentMethod: 'pickup',
        pickupLocationId: loc.id,
      }
    }
    if (!address1.trim() || !city.trim() || !state) return null
    return {
      shippingAddress: {
        address1: address1.trim(),
        address2: address2.trim() || undefined,
        city: city.trim(),
        state,
        country: 'Nigeria',
      },
      fulfillmentMethod: 'shipping',
    }
  }

  async function handleVerify(reference: string, fulfilment: Fulfilment) {
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        amountKobo: totalKobo,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: fulfilment.shippingAddress,
        fulfillmentMethod: fulfilment.fulfillmentMethod,
        pickupLocationId: fulfilment.pickupLocationId,
        deliveryQuoteToken: fulfilment.fulfillmentMethod === 'shipping' ? quote?.token : undefined,
        lines,
      }),
    })

    const data = await res.json()

    if (data.ok) {
      clearCart()
      // Only pass the order reference in the URL, no PII
      router.push(`/order-confirmed?ref=${reference}`)
    } else {
      setError(data.message ?? 'Payment verification failed. Please contact us.')
      setLoading(false)
    }
  }

  function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email and phone.')
      return
    }
    if (method === 'pickup' && !pickupId) {
      setError('Please choose a pickup store.')
      return
    }
    const fulfilment = buildFulfilment()
    if (!fulfilment) {
      setError('Please complete your delivery address.')
      return
    }

    // Shipping orders need a live delivery quote before we can charge the fee.
    if (method === 'shipping') {
      if (quoteLoading) {
        setError('Calculating delivery… one moment.')
        return
      }
      if (!quote) {
        setError(quoteError ?? 'Please enter a delivery address to calculate delivery.')
        return
      }
    }

    if (!scriptReady.current || !window.PaystackPop) {
      setError('Payment provider not loaded. Please refresh and try again.')
      return
    }

    setLoading(true)

    // Stuff order details into Paystack metadata so the server-side webhook
    // can recover and fulfil the order even if the browser dies before the
    // verify call lands. Paystack passes metadata through verbatim.
    const metadata = {
      customerName: name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim(),
      shippingAddress: fulfilment.shippingAddress,
      fulfillmentMethod: fulfilment.fulfillmentMethod,
      pickupLocationId: fulfilment.pickupLocationId,
      // Server re-validates this token to trust the delivery fee + coordinates.
      deliveryQuoteToken: fulfilment.fulfillmentMethod === 'shipping' ? quote?.token : undefined,
      lines: lines.map(toCartLinePayload),
      amountKobo: totalKobo,
    }

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: email.trim(),
      amount: totalKobo,
      ref: generateRef(),
      callback: (response) => { handleVerify(response.reference, fulfilment) },
      onClose: () => { setLoading(false) },
      metadata,
    })

    handler.openIframe()
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="text-label uppercase tracking-[0.1em] text-bone/50">Your Details</p>
        <form id="checkout-form" onSubmit={handlePay} className="mt-6 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={FORM_STYLES.label}>Full name *</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FORM_STYLES.input}
                placeholder="Ada Okafor"
              />
            </div>
            <div>
              <label htmlFor="phone" className={FORM_STYLES.label}>Phone number *</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={FORM_STYLES.input}
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={FORM_STYLES.label}>Email address *</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FORM_STYLES.input}
              placeholder="ada@example.com"
            />
          </div>

          {/* Fulfilment method */}
          <div className="mt-4 border-t border-stone/20 pt-6">
            <p className="text-label uppercase tracking-[0.1em] text-bone/50">How would you like to receive your order?</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Fulfilment method">
              {([
                { id: 'pickup' as const, title: 'Pick up in store', sub: 'Collect from a Lagos store · free' },
                { id: 'shipping' as const, title: 'Ship to me', sub: 'Deliver to your address' },
              ]).map((opt) => {
                const active = method === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setMethod(opt.id); setError(null) }}
                    className={cn(
                      'flex flex-col items-start border px-4 py-3 text-left transition-colors',
                      active ? 'border-accent bg-accent/5' : 'border-stone/30 hover:border-stone'
                    )}
                  >
                    <span className="text-body text-bone">{opt.title}</span>
                    <span className="mt-0.5 text-small text-stone">{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pickup: choose a store */}
          {method === 'pickup' && (
            <div className="mt-2">
              <p className={FORM_STYLES.label}>Choose a pickup store *</p>
              <div className="mt-3 flex flex-col gap-3">
                {NG_PICKUP_LOCATIONS.map((loc) => {
                  const active = pickupId === loc.id
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setPickupId(loc.id); setError(null) }}
                      className={cn(
                        'flex items-start gap-3 border px-4 py-3 text-left transition-colors',
                        active ? 'border-accent bg-accent/5' : 'border-stone/30 hover:border-stone'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          active ? 'border-accent' : 'border-stone/50'
                        )}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                      </span>
                      <span>
                        <span className="block text-body text-bone">{loc.name}</span>
                        <span className="mt-0.5 block text-small text-stone">
                          {loc.displayLines.join(' · ')}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Shipping: enter an address */}
          {method === 'shipping' && (
            <div className="mt-2">
              <p className="text-label uppercase tracking-[0.1em] text-bone/50">Delivery Address</p>
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label htmlFor="address1" className={FORM_STYLES.label}>Street address *</label>
                  <input
                    id="address1"
                    type="text"
                    autoComplete="address-line1"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className={FORM_STYLES.input}
                    placeholder="12 Banana Island Road"
                  />
                </div>

                <div>
                  <label htmlFor="address2" className={FORM_STYLES.label}>
                    Apartment, estate, landmark <span className="text-stone">(optional)</span>
                  </label>
                  <input
                    id="address2"
                    type="text"
                    autoComplete="address-line2"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    className={FORM_STYLES.input}
                    placeholder="Flat 3B, Eko Atlantic"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className={FORM_STYLES.label}>City / LGA *</label>
                    <input
                      id="city"
                      type="text"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={FORM_STYLES.input}
                      placeholder="Ikoyi"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className={FORM_STYLES.label}>State *</label>
                    <select
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={`${FORM_STYLES.input} cursor-pointer`}
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

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

      <div className="flex flex-col gap-6">
        <div className="border border-stone/20 bg-white/5 p-6">
          {method === 'shipping' && (
            <div className="mb-4 flex flex-col gap-2 border-b border-stone/20 pb-4 text-small">
              <div className="flex items-center justify-between text-bone/60">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalKobo, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-bone/60">
                <span>Delivery</span>
                <span>
                  {quoteLoading
                    ? 'Calculating…'
                    : quote
                      ? quote.freeDelivery
                        ? 'Free'
                        : formatPrice(quote.chargedFeeMinor, currency)
                      : '—'}
                </span>
              </div>
            </div>
          )}

          <p className="text-label uppercase tracking-[0.1em] text-bone/50">Total</p>
          <p className="mt-2 font-display text-h1 text-bone">{formatPrice(totalKobo, currency)}</p>
          <p className="mt-1 text-small text-bone/40">
            {method === 'pickup'
              ? 'Free in-store pickup at your selected store'
              : quote?.freeDelivery
                ? 'Free home delivery by GIG'
                : quote
                  ? 'Home delivery by GIG, tracked to your door'
                  : 'Enter your address to calculate delivery'}
          </p>

          {method === 'shipping' && quoteError && (
            <p className="mt-3 text-small text-error">{quoteError}</p>
          )}

          {error && (
            <p className="mt-4 text-small text-error">{error}</p>
          )}

          <button
            type="submit"
            form="checkout-form"
            disabled={loading || (method === 'shipping' && (quoteLoading || !quote))}
            className="mt-6 flex h-[52px] w-full items-center justify-center bg-accent text-label uppercase tracking-[0.1em] text-ink transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : 'Pay with Paystack'}
          </button>

          <p className="mt-3 text-center text-small text-bone/40">
            Secured by Paystack · 256-bit SSL
          </p>
        </div>

        <Link
          href="/no-series"
          className="text-center text-small text-bone/40 underline-offset-2 hover:underline"
        >
          ← Continue shopping
        </Link>
      </div>
    </div>
  )
}
