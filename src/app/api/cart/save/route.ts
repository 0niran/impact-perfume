import { NextRequest, NextResponse } from 'next/server'
import { savePendingCart } from '@/lib/pendingCart'
import { rateLimit } from '@/lib/rateLimit'
import { cartSaveBodySchema, formatZodError } from '@/lib/validation'


export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'cart-save', { limit: 5, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ ok: false, message: 'Invalid body.' }, { status: 400 })
  }

  const parsed = cartSaveBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const body = parsed.data

  const normalisedLines = body.lines.map((l) => ({
    variantId: l.variantId,
    productId: l.productId,
    handle: l.handle,
    name: l.name,
    variantLabel: l.variantLabel,
    qty: l.qty,
    unitPriceMinor: l.unitPriceMinor ?? l.unitPriceKobo ?? 0,
    thumbnail: l.thumbnail,
  }))

  // Saving a cart exists only to power the reminder email, so a failure here
  // must never surface to the customer mid-checkout. Report success either way
  // and say whether it actually stored, for the caller's logs.
  try {
    const saved = await savePendingCart({
      email: body.email,
      region: body.region,
      currency: body.currency,
      subtotalMinor: body.subtotalMinor,
      lines: normalisedLines,
    })
    return NextResponse.json({ ok: true, saved })
  } catch (err) {
    console.error('[cart.save] failed:', err)
    return NextResponse.json({ ok: true, saved: false })
  }
}
