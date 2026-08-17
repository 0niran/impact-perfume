import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { deliveryQuoteBodySchema, formatZodError } from '@/lib/validation'
import { geocodeAddress } from '@/lib/geocode'
import { placeDetails } from '@/lib/places'
import { quoteDelivery, isGigConfigured } from '@/lib/gig'
import { signDeliveryQuote } from '@/lib/deliveryQuote'
import { REGIONS } from '@/lib/region'

/**
 * Live GIG delivery quote for a Nigerian home delivery.
 *
 * Geocodes the typed address, prices it with GIG, applies the NG free-delivery
 * threshold for the preview, and returns a signed token the checkout hands back
 * at payment time so the server can trust the fee (see lib/deliveryQuote.ts).
 */
export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'delivery-quote', { limit: 20, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, reason: 'rate_limited', message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  if (!isGigConfigured()) {
    return NextResponse.json(
      { ok: false, reason: 'unavailable', message: 'Delivery quotes are temporarily unavailable.' },
      { status: 503 }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = deliveryQuoteBodySchema.safeParse(raw)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const { shippingAddress, subtotalMinor, itemCount, placeId, sessionToken } = parsed.data

  // Prefer coordinates from the autocomplete-selected place (authoritative,
  // resolved server-side so the client can't assert a cheaper location). Fall
  // back to geocoding the typed text for manually entered addresses.
  let geo: { lat: number; lng: number; formattedAddress: string } | null = null
  if (placeId) {
    const details = await placeDetails(placeId, { sessionToken })
    if (details) {
      geo = { lat: details.lat, lng: details.lng, formattedAddress: details.formattedAddress }
    }
  }
  if (!geo) {
    const addressString = [
      shippingAddress.address1,
      shippingAddress.address2,
      shippingAddress.city,
      shippingAddress.state,
      'Nigeria',
    ]
      .filter(Boolean)
      .join(', ')
    geo = await geocodeAddress(addressString)
  }
  if (!geo) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'address',
        message: "We couldn't locate that address. Please check it and try again.",
      },
      { status: 422 }
    )
  }

  const quote = await quoteDelivery({
    receiverLat: geo.lat,
    receiverLng: geo.lng,
    itemCount,
    declaredValueMajor: Math.round(subtotalMinor / 100),
  })
  if (!quote) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'quote',
        message: "We couldn't calculate delivery for that address right now. Please try again.",
      },
      { status: 502 }
    )
  }

  const token = signDeliveryQuote({
    rawFeeMinor: quote.feeMinor,
    lat: geo.lat,
    lng: geo.lng,
    addr: shippingAddress,
  })
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: 'unavailable', message: 'Delivery quotes are temporarily unavailable.' },
      { status: 503 }
    )
  }

  // Free delivery over the NG threshold — the business absorbs the GIG cost, so
  // the shipment is still booked at fulfilment. This preview uses the client
  // subtotal; the payment path re-checks the threshold against the repriced
  // subtotal, so it can't be gamed to underpay for the products themselves.
  const freeDelivery = subtotalMinor >= REGIONS.NG.freeDeliveryThresholdMinor
  const chargedFeeMinor = freeDelivery ? 0 : quote.feeMinor

  return NextResponse.json({
    ok: true,
    rawFeeMinor: quote.feeMinor,
    chargedFeeMinor,
    freeDelivery,
    token,
    formattedAddress: geo.formattedAddress,
  })
}
