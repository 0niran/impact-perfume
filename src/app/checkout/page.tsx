'use client'

import dynamic from 'next/dynamic'
import { useCartStore } from '@/store/cartStore'
import { Container } from '@/components/layout'
import Link from 'next/link'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import { useRegion } from '@/lib/regionContext'
import { SITE_CONFIG } from '@/lib/config'

function countryName(code: string | null): string {
  if (!code) return 'your region'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

// Lazy-load the Stripe panel so the @stripe/* bundles don't ship to NG visitors.
const StripeCheckoutPanel = dynamic(
  () => import('@/components/checkout/StripeCheckoutPanel'),
  { ssr: false, loading: () => <p className="text-body text-stone">Loading secure checkout…</p> }
)

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines)
  const { region, setRegion, checkoutSupported, detectedCountry } = useRegion()

  // Visitor is physically in a country we don't ship to yet. Rather than drop
  // them into a Canadian checkout they can't complete, offer a waitlist /
  // WhatsApp path — and an escape hatch if our geo guess is wrong.
  if (!checkoutSupported) {
    return (
      <div className="bg-ink min-h-screen">
        <Container className="flex flex-col items-start gap-6 py-24 max-w-2xl">
          <p className="text-label uppercase tracking-[0.12em] text-accent">
            {countryName(detectedCountry)}
          </p>
          <h1 className="font-display text-display-l leading-none text-bone">
            We don&apos;t ship here yet.
          </h1>
          <p className="text-body text-stone">
            We currently deliver within Nigeria and Canada. Message us on WhatsApp
            and we&apos;ll arrange your order or let you know the moment we reach
            {' '}{countryName(detectedCountry)}.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={SITE_CONFIG.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
              style={{ height: 48 }}
            >
              Order via WhatsApp
            </Link>
            <button
              onClick={() => setRegion('CA')}
              className="inline-flex items-center border border-stone/40 px-8 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
              style={{ height: 48 }}
            >
              I have a Canada address
            </button>
            <button
              onClick={() => setRegion('NG')}
              className="inline-flex items-center border border-stone/40 px-8 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
              style={{ height: 48 }}
            >
              I have a Nigeria address
            </button>
          </div>
        </Container>
      </div>
    )
  }

  if (!region.checkoutEnabled) {
    return (
      <div className="bg-ink min-h-screen">
        <Container className="flex flex-col items-start gap-6 py-24 max-w-2xl">
          <p className="text-label uppercase tracking-[0.12em] text-accent">
            {region.name} · {region.currency}
          </p>
          <h1 className="font-display text-display-l leading-none text-bone">
            {region.name} shipping launches soon.
          </h1>
          <p className="text-body text-stone">
            We&apos;re finalising fulfilment and payment partners for {region.name}.
            Switch back to Nigeria to complete your order today, or chat with us
            on WhatsApp for early access.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setRegion('NG')}
              className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
              style={{ height: 48 }}
            >
              Switch to Nigeria
            </button>
            <Link
              href="/b2b"
              className="inline-flex items-center border border-stone/40 px-8 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
              style={{ height: 48 }}
            >
              Get in touch
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  if (!lines.length) {
    return (
      <div className="bg-ink min-h-screen">
        <Container className="flex flex-col items-center justify-center py-32 text-center">
          <p className="font-display text-h1 text-bone/50">Your cart is empty.</p>
          <Link
            href="/no-series"
            className="mt-6 inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 52 }}
          >
            Browse the collection
          </Link>
        </Container>
      </div>
    )
  }

  return (
    <div className="bg-ink min-h-screen">
      <Container className="py-12 md:py-20">
        <div className="mb-8">
          <p className="text-label uppercase tracking-[0.14em] text-bone/40">Secure Checkout</p>
          <h1 className="mt-2 font-display text-[32px] leading-none text-bone">Complete Your Order</h1>
        </div>
        {region.paymentProvider === 'stripe' ? <StripeCheckoutPanel /> : <CheckoutForm />}
      </Container>
    </div>
  )
}
