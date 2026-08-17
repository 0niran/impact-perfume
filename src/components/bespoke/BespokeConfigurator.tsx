'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/config'
import { submitBespoke, type BespokeSubmitResult } from '@/app/bespoke/actions'
import {
  computeBespokeEstimate,
  type BespokeConfig,
} from '@/lib/bespokePricing'
import type { PaymentProvider, RegionId } from '@/lib/region'
import Stepper from './Stepper'
import BespokeSuccess from './BespokeSuccess'
import {
  INSPIRATIONS,
  COLORS,
  TIMELINES,
  STEPS,
  type ColorOption,
} from './bespokeOptions'

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

function generateRef(): string {
  return `bespoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Prefer the 100ml base as the default, otherwise the first available volume. */
function defaultVolumeKey(config: BespokeConfig | null): string {
  if (!config) return ''
  return config.volumes.find((v) => v.key === '100')?.key ?? config.volumes[0]?.key ?? ''
}

export default function BespokeConfigurator({
  config,
  currency,
  paymentProvider,
  regionId,
}: {
  config: BespokeConfig | null
  currency: 'NGN' | 'CAD'
  paymentProvider: PaymentProvider
  regionId: RegionId
}) {
  const [step, setStep] = useState(1)
  const [inspiration, setInspiration] = useState<string>('no-5')
  const [bottleTypeKey, setBottleTypeKey] = useState<string>(config?.bottleTypes[0]?.key ?? '')
  const [color, setColor] = useState<ColorOption>(COLORS[0])
  const [volumeKey, setVolumeKey] = useState<string>(defaultVolumeKey(config))
  const [inscriptionKey, setInscriptionKey] = useState<string>(config?.inscriptions[0]?.key ?? '')
  const [engravingLine1, setEngravingLine1] = useState('')
  const [engravingLine2, setEngravingLine2] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [timeline, setTimeline] = useState<string>('flexible')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<BespokeSubmitResult | null>(null)
  const [depositStatus, setDepositStatus] = useState<'idle' | 'loading' | 'paid'>('idle')
  const [depositReturn, setDepositReturn] = useState(false)
  const paystackReady = useRef(false)

  // Load Paystack only for the NG rail; CA uses Stripe via BespokeStripeDeposit.
  useEffect(() => {
    if (paymentProvider !== 'paystack') return
    if (document.getElementById(SITE_CONFIG.paystack.scriptId)) {
      paystackReady.current = true
      return
    }
    const script = document.createElement('script')
    script.id = SITE_CONFIG.paystack.scriptId
    script.src = SITE_CONFIG.paystack.scriptUrl
    script.async = true
    script.onload = () => { paystackReady.current = true }
    document.head.appendChild(script)
  }, [paymentProvider])

  // A 3DS card on the CA rail redirects back to /bespoke?deposit=success,
  // landing on a fresh page with no in-memory brief; surface a paid confirmation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('deposit') === 'success') setDepositReturn(true)
  }, [])

  const hasInscriptionText = Boolean(engravingLine1.trim() || engravingLine2.trim())

  // Quantity presets follow the Medusa-driven discount tiers so the buttons and
  // the pricing never drift apart.
  const quantityOptions = useMemo(() => {
    if (!config) return [1, 5, 12, 50]
    const set = new Set<number>([1])
    config.rates.discountTiers.forEach((t) => set.add(t.minQty))
    set.add(config.rates.quoteMinQty)
    return Array.from(set).sort((a, b) => a - b)
  }, [config])

  function quantityLabel(q: number): string {
    if (config && q >= config.rates.quoteMinQty) return 'Quote'
    if (q === 1) return 'Single bottle'
    if (config) {
      const pct = config.rates.discountTiers
        .filter((t) => q >= t.minQty)
        .reduce((m, t) => Math.max(m, t.pct), 0)
      if (pct > 0) return `${pct}% off`
    }
    return `${q} bottles`
  }

  const estimate = useMemo(() => {
    if (!config) return null
    return computeBespokeEstimate(config, {
      volumeKey,
      bottleTypeKey,
      inscriptionKey: hasInscriptionText ? inscriptionKey : null,
      quantity,
    })
  }, [config, volumeKey, bottleTypeKey, inscriptionKey, hasInscriptionText, quantity])

  const isFinalStep = step === STEPS.length

  function next() {
    if (step < STEPS.length) setStep(step + 1)
  }
  function back() {
    if (step > 1) setStep(step - 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setSubmitError('Name, email, and phone are required.')
      return
    }

    setSubmitStatus('loading')
    const inscriptionLabel = config?.inscriptions.find((i) => i.key === inscriptionKey)?.label ?? null
    const bottleTypeLabel = config?.bottleTypes.find((b) => b.key === bottleTypeKey)?.label ?? ''
    const result = await submitBespoke({
      inspiration,
      bottleTypeKey,
      bottleTypeLabel,
      color: color.hex,
      colorName: color.name,
      volumeKey,
      inscriptionKey: hasInscriptionText ? inscriptionKey : null,
      inscriptionLabel: hasInscriptionText ? inscriptionLabel : null,
      engravingLine1,
      engravingLine2,
      quantity,
      timeline,
      notes,
      name,
      email,
      phone,
      city,
      regionId,
    })

    if (result.ok) {
      setSubmitResult(result)
      setSubmitStatus('success')
    } else {
      setSubmitStatus('error')
      setSubmitError(result.error ?? 'Submission failed. Please try again.')
    }
  }

  function handlePayDeposit() {
    if (!submitResult?.depositMinor || !paystackReady.current || !window.PaystackPop) {
      setSubmitError('Payment provider not ready. Please refresh and try again.')
      return
    }

    setDepositStatus('loading')

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: email.trim(),
      amount: submitResult.depositMinor,
      ref: generateRef(),
      callback: () => { setDepositStatus('paid') },
      onClose: () => {
        setDepositStatus((s) => (s === 'paid' ? s : 'idle'))
      },
    })

    handler.openIframe()
  }

  // -------- Deposit return (CA 3DS redirect lands here on a fresh page) --------
  if (depositReturn && submitStatus !== 'success') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 py-12">
        <p className="text-label uppercase tracking-[0.1em] text-accent">Deposit Received</p>
        <h2 className="font-display text-display-s text-bone">Thank you, your deposit is in.</h2>
        <p className="max-w-xl text-body text-stone">
          Your bespoke deposit is confirmed. Our perfumer will be in touch within 24 hours to
          finalise your composition and the balance.
        </p>
        <div>
          <Link href="/" className="text-small text-stone hover:text-bone transition-colors">
            ← Back to the house
          </Link>
        </div>
      </div>
    )
  }

  // -------- Success state --------
  if (submitStatus === 'success' && submitResult) {
    return (
      <BespokeSuccess
        result={submitResult}
        currency={currency}
        paymentProvider={paymentProvider}
        depositStatus={depositStatus}
        selection={{
          volumeKey,
          bottleTypeKey,
          inscriptionKey: hasInscriptionText ? inscriptionKey : null,
          quantity,
        }}
        customerEmail={email.trim()}
        customerName={name.trim()}
        onPayDeposit={handlePayDeposit}
        onStripePaid={() => setDepositStatus('paid')}
      />
    )
  }

  // -------- Configurator --------
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Progress */}
      <Stepper steps={STEPS} current={step} onStepClick={setStep} />

      {/* Step 1. Inspiration */}
      {step === 1 && (
        <section className="flex flex-col gap-6">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Inspiration</p>
            <h2 className="mt-2 font-display text-display-s text-bone">Start with a scent</h2>
            <p className="mt-3 max-w-xl text-body text-stone">
              Pick a Number from our existing collection as a starting point, or
              ask our perfumer to compose something entirely new.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {INSPIRATIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInspiration(opt.id)}
                className={cn(
                  'flex items-center justify-between border px-4 py-4 text-left transition-colors',
                  inspiration === opt.id
                    ? 'border-accent bg-accent/5'
                    : 'border-stone/30 hover:border-stone'
                )}
              >
                <span className="text-body text-bone">{opt.label}</span>
                {inspiration === opt.id && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-accent">
                    <path d="M3 8.5l3 3 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2. Bottle */}
      {step === 2 && (
        <section className="flex flex-col gap-8">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">The Bottle</p>
            <h2 className="mt-2 font-display text-display-s text-bone">Choose your vessel</h2>
            <p className="mt-3 max-w-xl text-body text-stone">
              Pick the bottle type, your signature color, and the volume.
            </p>
          </div>

          {config && config.bottleTypes.length > 0 && (
            <div>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Bottle Type</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {config.bottleTypes.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBottleTypeKey(b.key)}
                    className={cn(
                      'flex flex-col items-start gap-1 border px-4 py-4 text-left transition-colors',
                      bottleTypeKey === b.key
                        ? 'border-accent bg-accent/5'
                        : 'border-stone/30 hover:border-stone'
                    )}
                  >
                    <span className="text-body text-bone">{b.label}</span>
                    {b.priceMinor > 0 && (
                      <span className="text-label text-accent">+{formatPrice(b.priceMinor, currency)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">
              Color · <span className="text-bone">{color.name}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c.name}
                  className={cn(
                    'h-12 w-12 border-2 transition-all',
                    color.hex === c.hex ? 'border-accent scale-110' : 'border-stone/30 hover:scale-105'
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {config && config.volumes.length > 0 && (
            <div>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Volume</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {config.volumes.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setVolumeKey(v.key)}
                    className={cn(
                      'flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors',
                      volumeKey === v.key
                        ? 'border-accent bg-accent/5 text-bone'
                        : 'border-stone/30 text-bone hover:border-stone'
                    )}
                  >
                    <span className="text-body text-bone">{v.label}</span>
                    <span className="text-label text-stone">{formatPrice(v.priceMinor, currency)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 3. Inscription */}
      {step === 3 && (
        <section className="flex flex-col gap-6">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Inscription</p>
            <h2 className="mt-2 font-display text-display-s text-bone">Make it personal</h2>
            <p className="mt-3 max-w-xl text-body text-stone">
              Add a name or short message, then choose how it&apos;s applied. Leave
              the text blank to skip inscription entirely.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="line1" className="text-label uppercase tracking-[0.08em] text-stone">
                Line 1 · Name or initials
              </label>
              <input
                id="line1"
                type="text"
                maxLength={20}
                value={engravingLine1}
                onChange={(e) => setEngravingLine1(e.target.value)}
                placeholder="e.g. Adaeze"
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
              <p className="mt-1 text-label text-stone">{engravingLine1.length}/20</p>
            </div>

            <div>
              <label htmlFor="line2" className="text-label uppercase tracking-[0.08em] text-stone">
                Line 2 · Optional date or note
              </label>
              <input
                id="line2"
                type="text"
                maxLength={30}
                value={engravingLine2}
                onChange={(e) => setEngravingLine2(e.target.value)}
                placeholder="e.g. 2026"
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
              <p className="mt-1 text-label text-stone">{engravingLine2.length}/30</p>
            </div>
          </div>

          {config && config.inscriptions.length > 0 && (
            <div className={cn('transition-opacity', hasInscriptionText ? 'opacity-100' : 'opacity-50')}>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Method</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {config.inscriptions.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!hasInscriptionText}
                    onClick={() => setInscriptionKey(m.key)}
                    className={cn(
                      'flex flex-col items-start gap-1 border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed',
                      inscriptionKey === m.key
                        ? 'border-accent bg-accent/5'
                        : 'border-stone/30 hover:border-stone'
                    )}
                  >
                    <span className="text-body text-bone">{m.label}</span>
                    {m.priceMinor > 0 && (
                      <span className="text-label text-accent">+{formatPrice(m.priceMinor, currency)}</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-small text-stone">
                {hasInscriptionText
                  ? 'Applied per bottle.'
                  : 'Enter inscription text above to choose a method.'}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Step 4. Quantity & timeline */}
      {step === 4 && (
        <section className="flex flex-col gap-8">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Order</p>
            <h2 className="mt-2 font-display text-display-s text-bone">How many, and by when</h2>
            <p className="mt-3 max-w-xl text-body text-stone">
              Volume discounts apply automatically. Larger orders get a tailored quote.
            </p>
          </div>

          <div>
            <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Quantity</p>
            <div className="grid gap-3 sm:grid-cols-4">
              {quantityOptions.map((q) => {
                const isQuote = Boolean(config && q >= config.rates.quoteMinQty)
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={cn(
                      'flex flex-col items-start gap-1 border px-4 py-4 transition-colors',
                      quantity === q
                        ? 'border-accent bg-accent/5'
                        : 'border-stone/30 hover:border-stone'
                    )}
                  >
                    <span className="text-h3 font-display text-bone">{isQuote ? `${q}+` : q}</span>
                    <span className="text-label text-stone">{quantityLabel(q)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Timeline</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TIMELINES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeline(t.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 border px-4 py-3 text-left transition-colors',
                    timeline === t.id
                      ? 'border-accent bg-accent/5'
                      : 'border-stone/30 hover:border-stone'
                  )}
                >
                  <span className="text-body text-bone">{t.label}</span>
                  <span className="text-small text-stone">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Step 5. Contact */}
      {step === 5 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Your Details</p>
            <h2 className="mt-2 font-display text-display-s text-bone">Almost there</h2>
            <p className="mt-3 max-w-xl text-body text-stone">
              Tell us how to reach you. Our perfumer will be in touch within 24 hours.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bespoke-name" className="text-label uppercase tracking-[0.08em] text-stone">
                Full name *
              </label>
              <input
                id="bespoke-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="bespoke-phone" className="text-label uppercase tracking-[0.08em] text-stone">
                Phone *
              </label>
              <input
                id="bespoke-phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bespoke-email" className="text-label uppercase tracking-[0.08em] text-stone">
                Email *
              </label>
              <input
                id="bespoke-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="bespoke-city" className="text-label uppercase tracking-[0.08em] text-stone">
                Delivery city
              </label>
              <input
                id="bespoke-city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bespoke-notes" className="text-label uppercase tracking-[0.08em] text-stone">
              Anything else we should know?
            </label>
            <textarea
              id="bespoke-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special occasion, packaging request, scent preferences…"
              className="mt-2 w-full resize-none border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {submitError && <p className="text-small text-error">{submitError}</p>}

          <button
            type="submit"
            disabled={submitStatus === 'loading'}
            className="self-start inline-flex items-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ height: 52 }}
          >
            {submitStatus === 'loading' ? 'Submitting…' : 'Submit brief'}
          </button>
        </form>
      )}

      {/* Running estimate */}
      <div className="border border-stone/20 bg-mist/30 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-label uppercase tracking-[0.08em] text-stone">Estimate</p>
          {!config ? (
            <p className="text-small text-stone">Confirmed after brief</p>
          ) : estimate?.needsQuote ? (
            <p className="font-display text-h3 text-bone">Custom quote</p>
          ) : (
            <p className="font-display text-h2 text-bone">{formatPrice(estimate?.totalMinor ?? 0, currency)}</p>
          )}
        </div>
        {config && estimate && !estimate.needsQuote && (
          <p className="mt-1 text-small text-stone">
            {formatPrice(estimate.unitMinor, currency)} × {quantity}
            {estimate.discountPct > 0 && ` · ${estimate.discountPct}% off`}
            {' · '}
            {config.rates.depositPct}% deposit to secure
          </p>
        )}
        {config && estimate?.needsQuote && (
          <p className="mt-1 text-small text-stone">
            We&apos;ll send pricing for large orders within 24 hours.
          </p>
        )}
      </div>

      {/* Step nav */}
      {!isFinalStep && (
        <div className="flex items-center justify-between border-t border-stone/20 pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="text-label uppercase tracking-[0.08em] text-stone hover:text-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 44 }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
