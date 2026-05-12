'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartSelectors, type CartLine } from '@/store/cartStore'
import { formatNaira } from '@/lib/format'
import { NIGERIAN_STATES } from '@/lib/constants'
import { FORM_STYLES } from '@/lib/shopUtils'
import { SITE_CONFIG } from '@/lib/config'
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
}

function generateRef(): string {
  return `impact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function CheckoutForm() {
  const router = useRouter()
  const lines = useCartStore((s) => s.lines)
  const subtotalKobo = useCartStore(cartSelectors.subtotalKobo)
  const clearCart = useCartStore((s) => s.clear)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scriptReady = useRef(false)

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

  async function handleVerify(reference: string) {
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        amountKobo: subtotalKobo,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: { address1, address2, city, state, country: 'Nigeria' },
        lines,
      }),
    })

    const data = await res.json()

    if (data.ok) {
      clearCart()
      // Only pass the order reference in the URL — no PII
      router.push(`/order-confirmed?ref=${reference}`)
    } else {
      setError(data.message ?? 'Payment verification failed. Please contact us.')
      setLoading(false)
    }
  }

  function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !phone.trim() || !address1.trim() || !city.trim() || !state) {
      setError('Please fill in all required fields.')
      return
    }

    if (!scriptReady.current || !window.PaystackPop) {
      setError('Payment provider not loaded. Please refresh and try again.')
      return
    }

    setLoading(true)

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: email.trim(),
      amount: subtotalKobo,
      ref: generateRef(),
      callback: (response) => { handleVerify(response.reference) },
      onClose: () => { setLoading(false) },
    })

    handler.openIframe()
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="text-label uppercase tracking-[0.1em] text-slate">Your Details</p>
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

          <div className="mt-4 border-t border-stone/20 pt-6">
            <p className="text-label uppercase tracking-[0.1em] text-slate">Delivery Address</p>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label htmlFor="address1" className={FORM_STYLES.label}>Street address *</label>
                <input
                  id="address1"
                  type="text"
                  autoComplete="address-line1"
                  required
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
                    required
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
                    required
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

              <div>
                <label className={FORM_STYLES.label}>Country</label>
                <p className="px-4 py-3 border border-stone/20 text-body text-stone bg-mist">Nigeria</p>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-10">
          <p className="text-label uppercase tracking-[0.1em] text-slate">Order Summary</p>
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
        <div className="border border-stone/20 p-6">
          <p className="text-label uppercase tracking-[0.1em] text-slate">Total</p>
          <p className="mt-2 font-display text-h1">{formatNaira(subtotalKobo)}</p>
          <p className="mt-1 text-small text-stone">Delivery fee calculated after order</p>

          {error && (
            <p className="mt-4 text-small text-red-600">{error}</p>
          )}

          <button
            type="submit"
            form="checkout-form"
            disabled={loading}
            className="mt-6 flex h-[52px] w-full items-center justify-center bg-ink text-label uppercase tracking-[0.1em] text-bone transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : 'Pay with Paystack'}
          </button>

          <p className="mt-3 text-center text-small text-stone">
            Secured by Paystack · 256-bit SSL
          </p>
        </div>

        <Link
          href="/shop"
          className="text-center text-small text-slate underline-offset-2 hover:underline"
        >
          ← Continue shopping
        </Link>
      </div>
    </div>
  )
}
