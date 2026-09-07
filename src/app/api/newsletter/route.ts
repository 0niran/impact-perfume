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
  // parsed.data is intentionally unused: the address is validated above, and
  // there is nowhere to send it until a provider is wired up.

  // TODO: integrate with Mailchimp / Klaviyo / Brevo when ready.
  // Until then this is a deferred-signup placeholder — the storefront
  // form should NOT show a confirmed-subscribed state (audit L-3).
  // The address is deliberately NOT logged. Function logs are retained and
  // widely readable, and a subscriber list is personal data — logging it makes
  // every log reader a recipient of it. The count is enough to tell that the
  // form is being used while a provider is still unconfigured.
  console.log('[newsletter] signup deferred (provider not configured)')
  return NextResponse.json({
    ok: true,
    deferred: true,
    message: "Thanks. We'll be in touch when our newsletter launches.",
  })
}
