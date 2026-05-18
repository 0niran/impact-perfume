'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { formatNaira } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/config'
import { submitBespoke, type BespokeSubmitResult } from '@/app/bespoke/actions'
import BottlePreview, { type BottleShape } from './BottlePreview'

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

interface ShapeOption {
  id: BottleShape
  label: string
  surcharge: number
  description: string
}

interface ColorOption {
  hex: string
  name: string
}

interface VolumeOption {
  ml: number
  multiplier: number
  label: string
}

interface TimelineOption {
  id: string
  label: string
  description: string
}

const INSPIRATIONS = [
  { id: 'no-1', label: 'No. 1 · Fruity' },
  { id: 'no-5', label: 'No. 5 · Sweet Oud' },
  { id: 'no-14', label: 'No. 14 · Citrus' },
  { id: 'no-25', label: 'No. 25 · Vanilla' },
  { id: 'no-33', label: 'No. 33 · Woody' },
  { id: 'compose', label: 'Compose from scratch with our perfumer' },
] as const

const SHAPES: ShapeOption[] = [
  { id: 'classic', label: 'Classic Cylinder', surcharge: 0, description: 'A timeless silhouette.' },
  { id: 'rounded', label: 'Rounded Flask', surcharge: 1000000, description: 'Soft and sculptural.' },
  { id: 'square', label: 'Square Decanter', surcharge: 1500000, description: 'Bold and architectural.' },
]

const COLORS: ColorOption[] = [
  { hex: '#1E64A4', name: 'Cobalt' },
  { hex: '#A8137C', name: 'Magenta' },
  { hex: '#C18A1F', name: 'Saffron' },
  { hex: '#1FA84F', name: 'Verdant' },
  { hex: '#1A1612', name: 'Onyx' },
  { hex: '#C25719', name: 'Ember' },
  { hex: '#7414B0', name: 'Plum' },
  { hex: '#0E5F58', name: 'Teal' },
]

const VOLUMES: VolumeOption[] = [
  { ml: 50, multiplier: 0.6, label: '50ml' },
  { ml: 100, multiplier: 1, label: '100ml' },
  { ml: 200, multiplier: 1.8, label: '200ml' },
]

const QUANTITIES = [1, 5, 12, 50] as const

const TIMELINES: TimelineOption[] = [
  { id: 'asap', label: 'ASAP', description: 'Within 2 weeks if possible.' },
  { id: '2-weeks', label: '2 Weeks', description: 'A standard turnaround.' },
  { id: '1-month', label: '1 Month', description: 'Plenty of time to perfect.' },
  { id: 'flexible', label: 'Flexible', description: 'No firm deadline.' },
]

const BASE_PRICE_KOBO = 8000000 // ₦80,000 per 100ml
const ENGRAVING_SURCHARGE_KOBO = 1500000 // ₦15,000 per bottle

function calculatePrice(opts: {
  shape: BottleShape
  volume: number
  engraved: boolean
  quantity: number
}): { unit: number; total: number; discount: number; needsQuote: boolean } {
  const shapeCfg = SHAPES.find((s) => s.id === opts.shape) ?? SHAPES[0]
  const volumeCfg = VOLUMES.find((v) => v.ml === opts.volume) ?? VOLUMES[1]

  let unit = BASE_PRICE_KOBO * volumeCfg.multiplier + shapeCfg.surcharge
  if (opts.engraved) unit += ENGRAVING_SURCHARGE_KOBO

  let discount = 0
  if (opts.quantity >= 50) return { unit, total: 0, discount: 0, needsQuote: true }
  if (opts.quantity >= 12) discount = 0.1
  else if (opts.quantity >= 5) discount = 0.05

  const total = Math.round(unit * opts.quantity * (1 - discount))
  return { unit: Math.round(unit), total, discount, needsQuote: false }
}

function generateRef(): string {
  return `bespoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const STEPS = [
  { id: 1, label: 'Inspiration' },
  { id: 2, label: 'Bottle' },
  { id: 3, label: 'Engraving' },
  { id: 4, label: 'Quantity' },
  { id: 5, label: 'Your Details' },
] as const

export default function BespokeConfigurator() {
  const [step, setStep] = useState(1)
  const [inspiration, setInspiration] = useState<string>('no-5')
  const [shape, setShape] = useState<BottleShape>('classic')
  const [color, setColor] = useState<ColorOption>(COLORS[0])
  const [volume, setVolume] = useState<number>(100)
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
  const paystackReady = useRef(false)

  useEffect(() => {
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
  }, [])

  const price = useMemo(
    () => calculatePrice({
      shape,
      volume,
      engraved: Boolean(engravingLine1.trim() || engravingLine2.trim()),
      quantity,
    }),
    [shape, volume, engravingLine1, engravingLine2, quantity]
  )

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
    const result = await submitBespoke({
      inspiration,
      shape,
      color: color.hex,
      colorName: color.name,
      volume,
      engravingLine1,
      engravingLine2,
      quantity,
      timeline,
      notes,
      name,
      email,
      phone,
      city,
      estimatePriceKobo: price.needsQuote ? 0 : price.total,
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
    if (!submitResult?.depositKobo || !paystackReady.current || !window.PaystackPop) {
      setSubmitError('Payment provider not ready. Please refresh and try again.')
      return
    }

    setDepositStatus('loading')

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: email.trim(),
      amount: submitResult.depositKobo,
      ref: generateRef(),
      callback: () => { setDepositStatus('paid') },
      onClose: () => {
        setDepositStatus((s) => (s === 'paid' ? s : 'idle'))
      },
    })

    handler.openIframe()
  }

  // -------- Success state --------
  if (submitStatus === 'success' && submitResult) {
    const depositNaira = submitResult.depositKobo
      ? formatNaira(submitResult.depositKobo)
      : null

    return (
      <div className="flex flex-col gap-8 py-12">
        <div>
          <p className="text-label uppercase tracking-[0.1em] text-accent">Step Complete</p>
          <h2 className="mt-3 font-display text-display-s text-bone">
            Your bespoke brief is in.
          </h2>
          <p className="mt-4 max-w-xl text-body text-stone">
            Reference: <span className="font-mono text-bone">{submitResult.inquiryId}</span>.
            Our perfumer will review your composition and reach out within 24 hours
            to confirm details, samples, and the final price.
          </p>
        </div>

        {!price.needsQuote && depositNaira && (
          <div className="max-w-xl border border-stone/30 bg-mist/40 p-6">
            <p className="text-label uppercase tracking-[0.1em] text-stone">Secure your slot</p>
            <p className="mt-2 font-display text-h1 text-bone">{depositNaira}</p>
            <p className="mt-1 text-small text-stone">
              50% deposit. Balance settled before delivery. Refundable up to 7 days.
            </p>
            <button
              onClick={handlePayDeposit}
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
        )}

        {price.needsQuote && (
          <div className="max-w-xl border border-stone/30 bg-mist/40 p-6">
            <p className="text-label uppercase tracking-[0.1em] text-stone">Volume Order</p>
            <p className="mt-2 font-display text-h2 text-bone">We&apos;ll send a quote</p>
            <p className="mt-2 text-small text-stone">
              For 50+ bottles we prepare a tailored quote with volume pricing and a
              delivery schedule.
            </p>
          </div>
        )}

        <div>
          <Link
            href="/"
            className="text-small text-stone hover:text-bone transition-colors"
          >
            ← Back to the house
          </Link>
        </div>
      </div>
    )
  }

  // -------- Configurator --------
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_460px]">
      {/* Configurator panel */}
      <div className="flex flex-col gap-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                'shrink-0 border px-4 py-1.5 text-label uppercase tracking-[0.08em] transition-colors',
                step === s.id
                  ? 'border-accent text-accent'
                  : step > s.id
                    ? 'border-stone/40 text-bone hover:border-accent hover:text-accent'
                    : 'border-stone/20 text-stone'
              )}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>

        {/* Step 1. Inspiration */}
        {step === 1 && (
          <section className="flex flex-col gap-6">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent">Step 1 of 5</p>
              <h2 className="mt-2 font-display text-display-s text-bone">
                Start with a scent
              </h2>
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
                    <span className="text-label text-accent">SELECTED</span>
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
              <p className="text-label uppercase tracking-[0.1em] text-accent">Step 2 of 5</p>
              <h2 className="mt-2 font-display text-display-s text-bone">Design the vessel</h2>
              <p className="mt-3 max-w-xl text-body text-stone">
                Choose the shape, signature color, and volume. Watch your bottle
                take form on the right.
              </p>
            </div>

            <div>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Shape</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={cn(
                      'flex flex-col items-start gap-1 border px-4 py-4 text-left transition-colors',
                      shape === s.id
                        ? 'border-accent bg-accent/5'
                        : 'border-stone/30 hover:border-stone'
                    )}
                  >
                    <span className="text-body text-bone">{s.label}</span>
                    <span className="text-small text-stone">{s.description}</span>
                    {s.surcharge > 0 && (
                      <span className="text-label text-accent">+{formatNaira(s.surcharge)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

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

            <div>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Volume</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {VOLUMES.map((v) => (
                  <button
                    key={v.ml}
                    type="button"
                    onClick={() => setVolume(v.ml)}
                    className={cn(
                      'border px-4 py-3 transition-colors',
                      volume === v.ml
                        ? 'border-accent bg-accent/5 text-bone'
                        : 'border-stone/30 text-bone hover:border-stone'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 3. Engraving */}
        {step === 3 && (
          <section className="flex flex-col gap-6">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent">Step 3 of 5</p>
              <h2 className="mt-2 font-display text-display-s text-bone">Make it personal</h2>
              <p className="mt-3 max-w-xl text-body text-stone">
                Engrave a name or initials on the label. Add a short second line for
                a date, monogram, or message. Leave blank to skip.
              </p>
              <p className="mt-2 text-small text-stone">
                Engraving adds {formatNaira(ENGRAVING_SURCHARGE_KOBO)} per bottle.
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
                  placeholder="e.g. Lagos 2026"
                  className="mt-2 w-full border border-stone/40 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-stone/60 focus:border-accent focus:outline-none transition-colors"
                />
                <p className="mt-1 text-label text-stone">{engravingLine2.length}/30</p>
              </div>
            </div>
          </section>
        )}

        {/* Step 4. Quantity & timeline */}
        {step === 4 && (
          <section className="flex flex-col gap-8">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent">Step 4 of 5</p>
              <h2 className="mt-2 font-display text-display-s text-bone">How many, and by when</h2>
              <p className="mt-3 max-w-xl text-body text-stone">
                Volume discounts apply automatically. For 50+ we prepare a custom quote.
              </p>
            </div>

            <div>
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">Quantity</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {QUANTITIES.map((q) => {
                  const isMax = q === 50
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
                      <span className="text-h3 font-display text-bone">{isMax ? '50+' : q}</span>
                      <span className="text-label text-stone">
                        {q === 1 ? 'Single bottle' : q === 5 ? '5% off' : q === 12 ? '10% off' : 'Quote'}
                      </span>
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
              <p className="text-label uppercase tracking-[0.1em] text-accent">Step 5 of 5</p>
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
                  placeholder="Lagos"
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

      {/* Live preview rail */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden border border-stone/20 bg-ink">
          <div className="relative aspect-[5/6]">
            <BottlePreview
              shape={shape}
              color={color.hex}
              engravingLine1={engravingLine1}
              engravingLine2={engravingLine2}
              volume={volume}
            />
          </div>
          <div className="border-t border-stone/20 p-5">
            <p className="text-label uppercase tracking-[0.08em] text-stone">Estimate</p>
            {price.needsQuote ? (
              <>
                <p className="mt-1 font-display text-h2 text-bone">Custom quote</p>
                <p className="mt-1 text-small text-stone">
                  We&apos;ll send pricing for 50+ bottles within 24 hours.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-display text-h1 text-bone">{formatNaira(price.total)}</p>
                <p className="mt-1 text-small text-stone">
                  {formatNaira(price.unit)} × {quantity}
                  {price.discount > 0 && ` · ${Math.round(price.discount * 100)}% off`}
                </p>
                <p className="mt-3 text-label text-stone">
                  50% deposit at confirmation. Balance before delivery.
                </p>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
