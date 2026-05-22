import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { newsletterBodySchema, formatZodError } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'newsletter', { limit: 5, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  const parsed = newsletterBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const { email } = parsed.data

  // TODO: integrate with Mailchimp / Klaviyo / Brevo when ready.
  // Until then this is a deferred-signup placeholder — the storefront
  // form should NOT show a confirmed-subscribed state (audit L-3).
  console.log('[newsletter] signup deferred (provider not configured):', email)
  return NextResponse.json({
    ok: true,
    deferred: true,
    message: "Thanks. We'll be in touch when our newsletter launches.",
  })
}
