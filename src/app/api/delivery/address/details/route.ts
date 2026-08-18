import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { placeDetails } from '@/lib/places'

/**
 * Resolves a selected placeId to a structured address for filling the checkout
 * fields. Coordinates are intentionally NOT returned to the client — the quote
 * route re-resolves the placeId server-side so the fee + GIG booking use
 * coordinates the client cannot tamper with.
 */

const bodySchema = z.object({
  placeId: z.string().min(1).max(300),
  sessionToken: z.string().min(1).max(64).optional(),
})

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'address-details', { limit: 30, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  const details = await placeDetails(parsed.data.placeId, { sessionToken: parsed.data.sessionToken })
  if (!details) {
    return NextResponse.json(
      { ok: false, message: 'Could not load that address. Please enter it manually.' },
      { status: 422 }
    )
  }

  // Coordinates stay server-side; only the fillable fields go back.
  return NextResponse.json({
    ok: true,
    address: {
      address1: details.address1,
      city: details.city,
      state: details.state,
      postalCode: details.postalCode,
      formattedAddress: details.formattedAddress,
    },
  })
}
